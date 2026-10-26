export interface CteProfile {
  name: string;
  /** subject_token_type sent to Auth0 — lets each agent route to its own token-exchange Action */
  subjectTokenType: string;
  requestedSubTokenType: 'urn:ietf:params:oauth:token-type:access_token';
  clientId: string;
  clientSecret: string;
  audience: string;
  allowedScopes: string[];
}

const PROFILES: Record<'buyer-agent' | 'publisher-agent' | 'pricing-agent', CteProfile> = {
  'buyer-agent': {
    name: 'Buyer Agent',
    subjectTokenType: process.env.BUYER_AGENT_SUBJECT_TOKEN_TYPE ?? 'urn:ietf:params:oauth:token-type:access_token',
    requestedSubTokenType: 'urn:ietf:params:oauth:token-type:access_token',
    clientId: process.env.BUYER_AGENT_CLIENT_ID ?? '',
    clientSecret: process.env.BUYER_AGENT_CLIENT_SECRET ?? '',
    audience: process.env.BUYER_AGENT_AUDIENCE ?? 'https://admanager.demo/buyer',
    allowedScopes: (
      process.env.BUYER_AGENT_SCOPES ??
      'audience:segment audience:read audience:analyze proposals:write proposals:read proposals:submit'
    ).split(/[\s,]+/).filter(Boolean),
  },
  'pricing-agent': {
    name: 'Pricing Agent',
    subjectTokenType: process.env.PRICING_AGENT_SUBJECT_TOKEN_TYPE ?? 'urn:ietf:params:oauth:token-type:access_token',
    requestedSubTokenType: 'urn:ietf:params:oauth:token-type:access_token',
    clientId: process.env.PRICING_AGENT_CLIENT_ID ?? '',
    clientSecret: process.env.PRICING_AGENT_CLIENT_SECRET ?? '',
    audience: process.env.PRICING_AGENT_AUDIENCE ?? 'https://admanager.demo/buyer',
    allowedScopes: (
      process.env.PRICING_AGENT_SCOPES ??
      'pricing:read pricing:negotiate pricing:approve'
    ).split(/[\s,]+/).filter(Boolean),
  },
  'publisher-agent': {
    name: 'Publisher Agent',
    subjectTokenType: process.env.PUBLISHER_AGENT_SUBJECT_TOKEN_TYPE ?? 'urn:ietf:params:oauth:token-type:access_token',
    requestedSubTokenType: 'urn:ietf:params:oauth:token-type:access_token',
    clientId: process.env.PUBLISHER_AGENT_CLIENT_ID ?? '',
    clientSecret: process.env.PUBLISHER_AGENT_CLIENT_SECRET ?? '',
    audience: process.env.PUBLISHER_AGENT_AUDIENCE ?? 'https://admanager.demo/publisher',
    allowedScopes: (
      process.env.PUBLISHER_AGENT_SCOPES ??
      'audience:analyze audience:segment audience:read proposals:submit proposals:read pricing:approve pricing:read'
    ).split(/[\s,]+/).filter(Boolean),
  },
};

const TOKEN_LABELS: Record<string, string> = {
  'buyer-agent:audience':      'Buyer Audience Segmentation Token',
  'buyer-agent:proposal':      'Buyer Proposal Token',
  'pricing-agent:pricing':     'Pricing Agent Negotiation Token',
  'publisher-agent:audience':  'Publisher Audience Analytics Token',
  'publisher-agent:proposal':  'Publisher Proposal Management Token',
  'publisher-agent:pricing':   'Publisher Deal Approval Token',
};

export type AgentName = 'buyer-agent' | 'pricing-agent' | 'publisher-agent';

export function getCteProfile(agentName: AgentName): CteProfile {
  const profile = PROFILES[agentName];
  if (!profile) throw new Error(`No CTE profile defined for agent "${agentName}"`);
  return profile;
}

export function getTokenLabel(agentName: AgentName, api: 'audience' | 'proposal' | 'pricing'): string {
  return TOKEN_LABELS[`${agentName}:${api}`] ?? `${agentName} — ${api} token`;
}
