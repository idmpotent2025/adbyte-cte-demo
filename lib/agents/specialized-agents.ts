import type { PlanTask, IssuedToken, AgentExecution } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getToken, revokeToken } from '../token-registry';

export class ApiGatewayError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiGatewayError';
  }
}

const API_AUDIENCES: Record<string, string> = {
  audience: process.env.AUDIENCE_API_IDENTIFIER ?? 'https://admanager.demo/audience',
  proposal: process.env.PROPOSAL_API_IDENTIFIER ?? 'https://admanager.demo/proposal',
  pricing: process.env.PRICING_API_IDENTIFIER ?? 'https://admanager.demo/pricing',
};

function validateToken(token: IssuedToken, requiredScope: string, api: string): void {
  const entry = getToken(token.id);
  if (!entry) throw new ApiGatewayError('token_not_found', 401, `Token ${token.id.slice(0, 8)} not in registry`);

  // Expiry check
  const now = Math.floor(Date.now() / 1000);
  const exp = token.payload.exp as number | undefined;
  if (exp && now > exp) {
    revokeToken(token.id);
    throw new ApiGatewayError('token_expired', 401, `Token expired at ${new Date(exp * 1000).toISOString()}`);
  }

  // Revocation check
  if (entry.status === 'revoked') {
    throw new ApiGatewayError('token_revoked', 401, `Token "${token.label}" has been revoked`);
  }

  // Scope check
  const scopes = ((token.payload.scope as string) ?? '').split(' ');
  if (!scopes.includes(requiredScope)) {
    throw new ApiGatewayError('insufficient_scope', 403, `Required scope '${requiredScope}' not present`);
  }

  // Audience check
  const expectedAudience = API_AUDIENCES[api];
  const aud = token.payload.aud as string;
  if (aud !== expectedAudience) {
    throw new ApiGatewayError('invalid_audience', 401, `Token audience '${aud}' does not match API '${expectedAudience}'`);
  }
}

const MOCK_RESPONSES: Record<string, (params: Record<string, unknown>) => unknown> = {
  search_audiences: (p) => ({
    segments: [
      { id: 'seg-001', name: 'Sports Enthusiasts 18-34', size: 4200000, cpm: 8.5 },
      { id: 'seg-002', name: 'Auto Intenders', size: 2100000, cpm: 12.0 },
      { id: 'seg-003', name: `${p.query ?? 'Tech'} Lovers`, size: 3500000, cpm: 9.75 },
    ],
    total: 3,
  }),
  create_segment: (p) => ({
    segment_id: `seg-${uuidv4().slice(0, 8)}`,
    name: p.name ?? 'Custom Segment',
    status: 'active',
    estimated_size: 1800000,
  }),
  analyze_reach: (p) => ({
    segment_id: p.segment_id,
    weekly_reach: 890000,
    monthly_reach: 2400000,
    frequency_cap: 3,
    viewability_rate: 0.78,
  }),
  get_proposals: () => ({
    proposals: [
      { id: 'prop-101', status: 'draft', budget: 250000, cpm: 9.0 },
      { id: 'prop-102', status: 'pending', budget: 500000, cpm: 11.5 },
    ],
  }),
  create_proposal: (p) => ({
    proposal_id: `prop-${uuidv4().slice(0, 8)}`,
    audience_id: p.audience_id,
    budget: p.budget ?? 300000,
    flight_start: p.flight_dates ? (p.flight_dates as Record<string, string>).start : '2026-11-01',
    flight_end: p.flight_dates ? (p.flight_dates as Record<string, string>).end : '2026-11-30',
    status: 'draft',
  }),
  submit_proposal: (p) => ({
    proposal_id: p.proposal_id,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    estimated_review_time: '2 business days',
  }),
  get_rates: (p) => ({
    audience_id: p.audience_id,
    format: p.format ?? 'display',
    base_cpm: 9.5,
    premium_cpm: 14.0,
    guaranteed_cpm: 18.0,
    floor_cpm: 6.0,
  }),
  negotiate_deal: (p) => ({
    proposal_id: p.proposal_id,
    requested_cpm: p.target_cpm,
    counter_cpm: Number((Number(p.target_cpm ?? 10) * 1.08).toFixed(2)),
    status: 'counter_offered',
    valid_until: new Date(Date.now() + 86400000).toISOString(),
  }),
  approve_deal: (p) => ({
    deal_id: p.deal_id ?? `deal-${uuidv4().slice(0, 8)}`,
    status: 'approved',
    approved_at: new Date().toISOString(),
    contract_id: `contract-${uuidv4().slice(0, 6)}`,
  }),
};

export async function runSpecializedAgent(
  task: PlanTask,
  agentToken: IssuedToken,
): Promise<{ execution: AgentExecution; result: unknown }> {
  const startedAt = new Date().toISOString();

  // API gateway validation — throws ApiGatewayError on any violation
  validateToken(agentToken, task.scope, task.api);

  // Simulate API network latency
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 300));

  const handler = MOCK_RESPONSES[task.tool];
  const result = handler ? handler(task.parameters) : { status: 'ok', tool: task.tool };

  const completedAt = new Date().toISOString();

  return {
    execution: {
      id: uuidv4(),
      agentName: task.agent,
      agentType: task.agent === 'buyer-agent' ? 'buyer-agent' : 'publisher-agent',
      taskId: task.taskId,
      tokenLabel: agentToken.label,
      apiCalled: `${task.api} API`,
      toolCalled: task.tool,
      parameters: task.parameters,
      startedAt,
      completedAt,
      status: 'complete',
      response: result,
      notes: `Token: ${agentToken.id.slice(0, 8)}… | scope: ${task.scope}`,
    },
    result,
  };
}
