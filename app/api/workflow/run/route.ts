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
  const result = await auth0.getAccessToken();
  const rawToken: string = typeof result === 'string' ? result : (result as unknown as { token: string }).token;
  if (!rawToken) throw new Error('No access token in session — ensure AUTH0_AUDIENCE is set');

  const parts = rawToken.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

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
        run.tokens = [userToken];

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
