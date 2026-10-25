import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { isDemoMode } from '@/lib/auth0';
import { getDemoSession } from '@/lib/demo-session';
import { hashPrompt, generatePlanId, generateWorkflowId } from '@/lib/crypto';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import { performTokenExchange } from '@/lib/agents/iam-agent';
import { runSpecializedAgent, ApiGatewayError } from '@/lib/agents/specialized-agents';
import { waitForApproval } from '@/lib/approval-registry';
import { registerToken } from '@/lib/token-registry';
import type { WorkflowRun, IssuedToken, AgentExecution, PlanTask } from '@/lib/types';

const DEMO_SECRET = new TextEncoder().encode(
  (process.env.DEMO_JWT_SECRET ?? 'adbyte-demo-secret-key-minimum-32-chars!!').padEnd(32, '!'),
);

async function mintUserToken(userId: string, email: string, isDemoModeFlag: boolean): Promise<IssuedToken> {
  const id = uuidv4();
  const audience = process.env.AUTH0_AUDIENCE ?? 'https://admanager.demo/api';
  let rawToken: string;

  if (isDemoModeFlag) {
    rawToken = await new SignJWT({
      sub: userId,
      email,
      aud: audience,
      azp: 'adbyte-portal',
      scope: 'openid profile email',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setJti(id)
      .sign(DEMO_SECRET);
  } else {
    rawToken = '';
  }

  const [rawHeader, rawPayload] = rawToken.split('.');
  const header = JSON.parse(Buffer.from(rawHeader, 'base64url').toString());
  const payload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString());

  const issuedAt = new Date().toISOString();
  const token: IssuedToken = {
    id,
    label: 'User Portal Token',
    issuedAt,
    grantType: 'authorization_code',
    issuedBy: isDemoModeFlag ? 'demo-iam' : 'auth0',
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
    audience: (payload.aud as string) ?? '',
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

  // Get session
  let userId: string;
  let userEmail: string;
  let userRole: 'buyer' | 'publisher';

  if (isDemoMode) {
    const session = await getDemoSession();
    if (!session?.role) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    userId = session.sub;
    userEmail = session.email;
    userRole = session.role;
  } else {
    const { auth0 } = await import('@/lib/auth0');
    const session = await auth0!.getSession();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    userId = session.user.sub as string;
    userEmail = session.user.email as string;
    userRole = (session.user['adbyte/role'] as 'buyer' | 'publisher') ?? 'buyer';
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(run: WorkflowRun) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(run)}\n\n`));
      }

      const promptHash = hashPrompt(prompt);
      const planId = generatePlanId(promptHash);
      const workflowId = generateWorkflowId();
      const agentIp = '10.0.1.' + Math.floor(Math.random() * 254 + 1);

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
        isDemoMode,
        userRole,
        userId,
      };

      try {
        // Step 1: Mint user portal token
        const userToken = await mintUserToken(userId, userEmail, isDemoMode);
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

        // Step 2: Run orchestrator (OpenAI)
        const plan = await runOrchestrator(prompt, userRole, planId);
        orchExec.status = 'complete';
        orchExec.completedAt = new Date().toISOString();
        orchExec.response = { tasksPlanned: plan.tasks.length, summary: plan.summary };

        run.reasoning = plan.reasoning;
        run.summary = plan.summary;
        run.tasks = plan.tasks.map((t) => ({ ...t, status: 'pending' as const }));
        run.status = 'executing';
        emit(run);

        // Step 3: Execute tasks sequentially (respecting dependsOn)
        const completed = new Set<string>();
        const taskTokens = new Map<string, IssuedToken>();

        for (const task of run.tasks) {
          // Wait for dependencies
          for (const dep of task.dependsOn) {
            if (!completed.has(dep)) {
              // In real impl would wait; here we just proceed (mock is fast)
            }
          }

          task.status = 'running';
          emit(run);

          // IAM Agent: perform token exchange for this task
          const iamExec: AgentExecution = {
            id: uuidv4(),
            agentName: 'IAM Agent',
            agentType: 'iam-agent',
            taskId: task.taskId,
            startedAt: new Date().toISOString(),
            status: 'running',
            notes: `Exchanging token for ${task.agent} → ${task.api} API (scope: ${task.scope})`,
          };
          run.executions.push(iamExec);
          emit(run);

          const agentToken = await performTokenExchange({
            userToken,
            agentName: task.agent,
            api: task.api,
            scope: task.scope,
            planId,
            workflowId,
            agentIp,
            isDemoMode,
          });

          iamExec.status = 'complete';
          iamExec.completedAt = new Date().toISOString();
          iamExec.tokenLabel = agentToken.label;
          run.tokens.push(agentToken);
          taskTokens.set(task.taskId, agentToken);
          emit(run);

          // Specialized agent: call mock API (with revocation pause/resume)
          let currentToken = agentToken;
          for (;;) {
            try {
              const { execution: agentExec, result } = await runSpecializedAgent(task, currentToken);
              run.executions.push(agentExec);
              task.status = 'complete';
              task.result = result;
              completed.add(task.taskId);
              emit(run);
              break;
            } catch (err) {
              if (err instanceof ApiGatewayError && err.code === 'token_revoked') {
                run.status = 'awaiting_approval';
                run.pendingApproval = {
                  taskId: task.taskId,
                  revokedTokenId: currentToken.id,
                  revokedTokenLabel: currentToken.label,
                  agentName: task.agent,
                };
                emit(run);

                await waitForApproval(workflowId);

                const newToken = await performTokenExchange({
                  userToken,
                  agentName: task.agent,
                  api: task.api,
                  scope: task.scope,
                  planId,
                  workflowId,
                  agentIp,
                  isDemoMode,
                  taskId: task.taskId,
                });

                run.tokens.push(newToken);
                taskTokens.set(task.taskId, newToken);
                run.executions.push({
                  id: uuidv4(),
                  agentName: 'IAM Agent',
                  agentType: 'iam-agent',
                  taskId: task.taskId,
                  startedAt: new Date().toISOString(),
                  completedAt: new Date().toISOString(),
                  status: 'complete',
                  tokenLabel: newToken.label,
                  notes: 'Re-issued token after user approved re-authorization',
                });
                run.status = 'executing';
                run.pendingApproval = undefined;
                currentToken = newToken;
                emit(run);
                // loop continues — retry with new token
              } else {
                throw err;
              }
            }
          }
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
