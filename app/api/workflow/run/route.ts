import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth0 } from '@/lib/auth0';
import { hashPrompt, generatePlanId, generateWorkflowId } from '@/lib/crypto';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import { runSpecializedAgent } from '@/lib/agents/specialized-agents';
import { openWorkflow, closeWorkflow } from '@/lib/workflow-ledger';
import { registerToken } from '@/lib/token-registry';
import type { WorkflowRun, IssuedToken, AgentExecution } from '@/lib/types';

async function mintUserToken(): Promise<IssuedToken> {
  const id = uuidv4();
  console.log(`[mintUserToken] calling getAccessToken — AUTH0_AUDIENCE in Auth0Client config=${process.env.AUTH0_AUDIENCE ?? 'NOT SET'}`);
  const result = await auth0.getAccessToken();
  console.log(`[mintUserToken] getAccessToken returned — type=${typeof result} keys=${result && typeof result === 'object' ? Object.keys(result).join(',') : 'n/a'}`);
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    console.log(`[mintUserToken] token value present=${!!obj.token} token length=${typeof obj.token === 'string' ? obj.token.length : 'n/a'} token_type=${obj.token_type} audience=${obj.audience}`);
  }
  const rawToken: string = typeof result === 'string' ? result : (result as unknown as { token: string }).token;
  if (!rawToken) throw new Error('No access token in session — ensure AUTH0_AUDIENCE is set in Vercel env vars');
  const tokenParts = rawToken.split('.');
  console.log(`[workflow/run] rawToken length=${rawToken.length} parts=${tokenParts.length}`);
  if (tokenParts.length === 1) {
    throw new Error('Access token is opaque (not a JWT) — set AUTH0_AUDIENCE in Vercel env vars to receive a signed JWT');
  }

  // 3 parts = plain JWT; 5 parts = JWE (encrypted JWT, Auth0 tenant setting)
  const isJwe = tokenParts.length === 5;
  const header = isJwe ? { alg: 'JWE', enc: 'encrypted' } : JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
  const payload = isJwe ? { sub: '(encrypted)', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 } : JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
  console.log(`[workflow/run] token format=${isJwe ? 'JWE' : 'JWT'} sub=${payload.sub}`);

  const issuedAt = new Date().toISOString();

  const token: IssuedToken = {
    id,
    label: 'User Portal Token',
    issuedAt,
    grantType: 'authorization_code',
    issuedBy: 'auth0',
    rawToken,
    header,
    payload,
    highlights: {
      preserved: [],
      changed: ['sub', 'aud', 'azp', 'scope'],
    },
  };

  registerToken({
    id,
    label: 'User Portal Token',
    issuedAt,
    expiresAt: new Date((payload.exp as number) * 1000).toISOString(),
    status: 'active',
    agentName: 'portal',
    workflowId: '',
    grantType: 'authorization_code',
    scope: (payload.scope as string) ?? '',
    audience: Array.isArray(payload.aud) ? payload.aud[0] : (payload.aud as string) ?? '',
    payload,
  });

  return token;
}

export async function POST(req: NextRequest) {
  console.log(`[workflow/run] POST hit — AUTH0_AUDIENCE=${process.env.AUTH0_AUDIENCE ?? 'NOT SET'} AUTH0_DOMAIN=${process.env.AUTH0_DOMAIN ?? 'NOT SET'}`);
  const { prompt } = await req.json() as { prompt: string };

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'Prompt required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await auth0.getSession();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.sub as string;
  const userRole = (session.user['adbyte/role'] as 'buyer' | 'publisher') ?? 'buyer';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(run: WorkflowRun) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(run)}\n\n`));
      }

      const promptHash = hashPrompt(prompt);
      const planId = generatePlanId(promptHash);
      const workflowId = generateWorkflowId();

      const run: WorkflowRun = {
        id: workflowId,
        promptHash,
        planId,
        prompt,
        reasoning: '',
        tasks: [],
        executions: [],
        tokens: [],
        summary: '',
        status: 'planning',
        startedAt: new Date().toISOString(),
        userRole,
        userId,
      };

      try {
        // Step 1: Retrieve the user's Auth0 access token (subject_token for downstream CTE)
        const userToken = await mintUserToken();
        // userToken is shown in the UI via the portal page prop — don't add it here
        // to avoid the token appearing twice in the token chain.

        const orchExec: AgentExecution = {
          id: uuidv4(),
          agentName: 'Orchestrator',
          agentType: 'orchestrator',
          startedAt: new Date().toISOString(),
          status: 'running',
          notes: `Planning for planId: ${planId}`,
        };
        run.executions = [orchExec];
        emit(run);

        // Step 2: Orchestrator plans the workflow
        const plan = await runOrchestrator(prompt, userRole, planId);
        orchExec.status = 'complete';
        orchExec.completedAt = new Date().toISOString();
        orchExec.response = { tasksPlanned: plan.tasks.length, summary: plan.summary };

        run.reasoning = plan.reasoning;
        run.summary = plan.summary;
        run.tasks = plan.tasks.map((t) => ({ ...t, status: 'pending' as const }));
        run.status = 'executing';
        emit(run);

        openWorkflow(workflowId, userId, plan.tasks.map((t) => ({
          taskId: t.taskId, agent: t.agent, api: t.api, scope: t.scope,
        })));

        // Step 3: Execute tasks sequentially (respecting dependsOn)
        const completed = new Set<string>();

        for (const task of run.tasks) {
          for (const dep of task.dependsOn) {
            if (!completed.has(dep)) {
              // In real impl would wait; here we proceed (mock APIs are synchronous)
            }
          }

          task.status = 'running';

          // Orchestrator delegates this task to the specialized agent.
          // The agent requests its own token from IAM — it never receives the user
          // token and never knows Auth0 client IDs, client secrets, or audience URLs.
          const agentDisplayName = task.agent === 'buyer-agent' ? 'Buyer Agent' : 'Publisher Agent';
          const agentRunExec: AgentExecution = {
            id: uuidv4(),
            agentName: agentDisplayName,
            agentType: task.agent,
            taskId: task.taskId,
            startedAt: new Date().toISOString(),
            status: 'running',
            notes: task.description,
          };
          run.executions.push(agentRunExec);
          emit(run);

          const { agentExecution, result } = await runSpecializedAgent(
            task,
            { workflowId, planId, userToken },
            (event) => {
              // IAM issued a token — stream it to the UI immediately
              if (event.type === 'iam_complete') {
                run.executions.push(event.iamExecution);
                run.tokens.push(event.token);
                emit(run);
              }
            },
          );

          // Swap the "running" placeholder for the completed execution record
          run.executions = run.executions.filter((e) => e.id !== agentRunExec.id);
          run.executions.push(agentExecution);
          task.status = 'complete';
          task.result = result;
          completed.add(task.taskId);
          emit(run);
        }

        run.status = 'complete';
        run.completedAt = new Date().toISOString();
        emit(run);
      } catch (err) {
        run.status = 'error';
        run.completedAt = new Date().toISOString();
        run.summary = err instanceof Error ? err.message : 'Unknown error';
        emit(run);
      } finally {
        closeWorkflow(workflowId, run.status === 'complete' ? 'complete' : 'error');
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
