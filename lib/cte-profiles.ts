export interface CteProfile {
  name: string;
  requestedSubTokenType: 'urn:ietf:params:oauth:token-type:access_token';
  clientId: string;
  clientSecret: string;
  audience: string;
  allowedScopes: string[];
}

const PROFILES: Record<'buyer-agent' | 'publisher-agent', CteProfile> = {
  'buyer-agent': {
    name: 'Buyer Agent',
    requestedSubTokenType: 'urn:ietf:params:oauth:token-type:access_token',
    clientId: process.env.BUYER_AGENT_CLIENT_ID ?? '',
    clientSecret: process.env.BUYER_AGENT_CLIENT_SECRET ?? '',
    audience: process.env.BUYER_AGENT_AUDIENCE ?? 'https://admanager.demo/buyer',
    allowedScopes: (
      process.env.BUYER_AGENT_SCOPES ??
      'audience:segment audience:read audience:analyze proposals:write proposals:read proposals:submit pricing:negotiate pricing:read'
    ).split(/[\s,]+/).filter(Boolean),
  },
  'publisher-agent': {
    name: 'Publisher Agent',
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
  'buyer-agent:audience':     'Buyer Audience Segmentation Token',
  'buyer-agent:proposal':     'Buyer Proposal Token',
  'buyer-agent:pricing':      'Buyer Pricing Negotiation Token',
  'publisher-agent:audience': 'Publisher Audience Analytics Token',
  'publisher-agent:proposal': 'Publisher Proposal Management Token',
  'publisher-agent:pricing':  'Publisher Deal Approval Token',
};

export function getCteProfile(agentName: 'buyer-agent' | 'publisher-agent'): CteProfile {
  const profile = PROFILES[agentName];
  if (!profile) throw new Error(`No CTE profile defined for agent "${agentName}"`);
  return profile;
}

export function getTokenLabel(
  agentName: 'buyer-agent' | 'publisher-agent',
  api: 'audience' | 'proposal' | 'pricing',
): string {
  return TOKEN_LABELS[`${agentName}:${api}`] ?? `${agentName} — ${api} token`;
}
