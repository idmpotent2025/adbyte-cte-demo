export type UserRole = 'buyer' | 'publisher';

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  role?: UserRole;
  company?: string;
}

export interface PlanTask {
  taskId: string;
  agent: 'buyer-agent' | 'publisher-agent';
  description: string;
  api: 'audience' | 'proposal' | 'pricing';
  tool: string;
  scope: string;
  parameters: Record<string, unknown>;
  dependsOn: string[];
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: unknown;
}

export interface TokenExchangeRequest {
  grant_type: string;
  subject_token_label: string;
  audience: string;
  scope: string;
  acting_client_id: string;
}

export interface IssuedToken {
  id: string;
  label: string;
  issuedAt: string;
  grantType: 'authorization_code' | 'token_exchange';
  issuedBy: 'auth0' | 'demo-iam';
  rawToken: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  exchangeRequest?: TokenExchangeRequest;
  highlights: {
    preserved: string[];
    changed: string[];
  };
}

export interface AgentExecution {
  id: string;
  agentName: string;
  agentType: 'orchestrator' | 'iam-agent' | 'buyer-agent' | 'publisher-agent';
  taskId?: string;
  tokenLabel?: string;
  apiCalled?: string;
  toolCalled?: string;
  parameters?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  response?: unknown;
  notes?: string;
}

export interface WorkflowRun {
  id: string;
  promptHash: string;
  planId: string;
  prompt: string;
  reasoning: string;
  tasks: PlanTask[];
  executions: AgentExecution[];
  tokens: IssuedToken[];
  summary: string;
  status: 'planning' | 'executing' | 'complete' | 'error';
  startedAt: string;
  completedAt?: string;
  isDemoMode: boolean;
  userRole: UserRole;
  userId: string;
}

export interface OrchestratorPlan {
  reasoning: string;
  tasks: Array<{
    taskId: string;
    agent: 'buyer-agent' | 'publisher-agent';
    description: string;
    api: 'audience' | 'proposal' | 'pricing';
    tool: string;
    scope: string;
    parameters: Record<string, unknown>;
    dependsOn: string[];
  }>;
  summary: string;
}
