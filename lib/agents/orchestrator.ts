import OpenAI from 'openai';
import type { OrchestratorPlan } from '../types';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Mock plans for demo mode without OPENAI_API_KEY
const MOCK_PLANS: Record<'buyer' | 'publisher', OrchestratorPlan> = {
  buyer: {
    reasoning: 'The buyer wants to find target audiences, build a proposal, and negotiate pricing. I will sequence: (1) search audiences, (2) analyze reach, (3) create a proposal, (4) get rates, (5) negotiate the deal.',
    summary: 'Found sports audiences 18-34, created a $300k Q4 proposal, and negotiated deal at $8.40 CPM.',
    tasks: [
      { taskId: 't1', agent: 'buyer-agent', description: 'Search for sports audiences aged 18-34', api: 'audience', tool: 'search_audiences', scope: 'audience:read', parameters: { query: 'sports', filters: { age: '18-34' } }, dependsOn: [] },
      { taskId: 't2', agent: 'buyer-agent', description: 'Analyze reach for found audience segment', api: 'audience', tool: 'analyze_reach', scope: 'audience:analyze', parameters: { segment_id: 'seg_sports_1834' }, dependsOn: ['t1'] },
      { taskId: 't3', agent: 'buyer-agent', description: 'Create proposal for Q4 campaign', api: 'proposal', tool: 'create_proposal', scope: 'proposals:write', parameters: { audience_id: 'seg_sports_1834', budget: 300000, flight_dates: 'Q4 2026' }, dependsOn: ['t2'] },
      { taskId: 't4', agent: 'buyer-agent', description: 'Get rate card for audience', api: 'pricing', tool: 'get_rates', scope: 'pricing:read', parameters: { audience_id: 'seg_sports_1834', format: 'video' }, dependsOn: ['t3'] },
      { taskId: 't5', agent: 'buyer-agent', description: 'Negotiate deal below $9 CPM', api: 'pricing', tool: 'negotiate_deal', scope: 'pricing:negotiate', parameters: { proposal_id: 'prop_001', target_cpm: 8.5 }, dependsOn: ['t4'] },
    ],
  },
  publisher: {
    reasoning: 'The publisher wants to package their audience inventory and approve the best incoming deal. I will: (1) segment the streaming audience, (2) analyze reach, (3) create a sponsorship package, (4) approve the best deal.',
    summary: 'Segmented streaming audience by genre, packaged premium sports sponsorship, and approved $9.20 CPM deal.',
    tasks: [
      { taskId: 't1', agent: 'publisher-agent', description: 'Segment streaming audience by genre', api: 'audience', tool: 'create_segment', scope: 'audience:segment', parameters: { name: 'Premium Sports Streamers', criteria: { genre: 'sports', tier: 'premium' } }, dependsOn: [] },
      { taskId: 't2', agent: 'publisher-agent', description: 'Analyze reach of sports segment', api: 'audience', tool: 'analyze_reach', scope: 'audience:analyze', parameters: { segment_id: 'seg_premium_sports' }, dependsOn: ['t1'] },
      { taskId: 't3', agent: 'publisher-agent', description: 'Get incoming proposal offers', api: 'proposal', tool: 'get_proposals', scope: 'proposals:read', parameters: { filter: 'incoming' }, dependsOn: ['t2'] },
      { taskId: 't4', agent: 'publisher-agent', description: 'Approve best CPM deal', api: 'pricing', tool: 'approve_deal', scope: 'pricing:approve', parameters: { deal_id: 'deal_premium_001' }, dependsOn: ['t3'] },
    ],
  },
};

const SYSTEM_PROMPT = `You are an Ad Manager orchestrator agent. You receive user prompts from ad buyers or publishers and create an execution plan.

Available agents and their capabilities:
- buyer-agent: handles audience targeting, proposals, and pricing for agency/buyer users
- publisher-agent: handles audience segments, inventory proposals, and pricing for publisher users

Available APIs and tools:
- audience API (scope: audience:read, audience:segment, audience:analyze)
  - search_audiences(query, filters) → audience segments
  - create_segment(name, criteria) → segment id
  - analyze_reach(segment_id) → reach metrics
- proposal API (scope: proposals:read, proposals:write, proposals:submit)
  - get_proposals(filter?) → proposal list
  - create_proposal(audience_id, budget, flight_dates) → proposal
  - submit_proposal(proposal_id) → confirmation
- pricing API (scope: pricing:read, pricing:negotiate, pricing:approve)
  - get_rates(audience_id, format) → rate card
  - negotiate_deal(proposal_id, target_cpm) → counter-offer
  - approve_deal(deal_id) → deal confirmation

Return a structured execution plan with clear task sequencing and dependencies.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: {
      type: 'string',
      description: 'Step-by-step reasoning for the plan',
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          agent: { type: 'string', enum: ['buyer-agent', 'publisher-agent'] },
          description: { type: 'string' },
          api: { type: 'string', enum: ['audience', 'proposal', 'pricing'] },
          tool: { type: 'string' },
          scope: { type: 'string' },
          parameters: { type: 'object' },
          dependsOn: { type: 'array', items: { type: 'string' } },
        },
        required: ['taskId', 'agent', 'description', 'api', 'tool', 'scope', 'parameters', 'dependsOn'],
      },
    },
    summary: {
      type: 'string',
      description: 'One-sentence summary of what will be accomplished',
    },
  },
  required: ['reasoning', 'tasks', 'summary'],
};

export async function runOrchestrator(
  prompt: string,
  userRole: 'buyer' | 'publisher',
  planId: string,
): Promise<OrchestratorPlan> {
  if (!process.env.OPENAI_API_KEY) {
    // No API key — return a canned demo plan so the full token chain demo works
    await new Promise((r) => setTimeout(r, 800)); // simulate latency
    return MOCK_PLANS[userRole];
  }

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `User role: ${userRole}\nPlan ID: ${planId}\nUser request: ${prompt}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'orchestrator_plan',
        schema: RESPONSE_SCHEMA,
        strict: true,
      },
    },
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from orchestrator');

  return JSON.parse(content) as OrchestratorPlan;
}
