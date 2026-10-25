import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import type { IssuedToken, UserRole } from '../types';

const DEMO_SECRET = new TextEncoder().encode(
  (process.env.DEMO_JWT_SECRET ?? 'adbyte-demo-secret-key-minimum-32-chars!!').padEnd(32, '!'),
);

const API_AUDIENCES: Record<string, string> = {
  audience: process.env.AUDIENCE_API_IDENTIFIER ?? 'https://admanager.demo/audience',
  proposal: process.env.PROPOSAL_API_IDENTIFIER ?? 'https://admanager.demo/proposal',
  pricing: process.env.PRICING_API_IDENTIFIER ?? 'https://admanager.demo/pricing',
};

export async function performTokenExchange(opts: {
  userToken: IssuedToken;
  agentName: 'buyer-agent' | 'publisher-agent';
  api: 'audience' | 'proposal' | 'pricing';
  scope: string;
  planId: string;
  workflowId: string;
  agentIp: string;
  isDemoMode: boolean;
}): Promise<IssuedToken> {
  const { userToken, agentName, api, scope, planId, workflowId, agentIp, isDemoMode } = opts;
  const audience = API_AUDIENCES[api];
  const actingClientId = `demo-${agentName}`;
  const now = new Date().toISOString();
  const id = uuidv4();

  if (!isDemoMode) {
    return await performAuth0CTE(opts, audience, actingClientId, id, now);
  }

  // Demo mode: mint a realistic CTE-simulated token using jose
  const subFromUser = userToken.payload.sub as string;
  const payload = await new SignJWT({
    iss: `https://demo.admanager.auth0.com/`,
    aud: audience,
    sub: subFromUser, // preserved from user token (key CTE property)
    azp: actingClientId, // changed to the acting agent client
    scope,
    act: { sub: actingClientId }, // RFC 8693 actor claim
    // Custom claims demonstrating CTE enrichment
    'adbyte/plan_id': planId,
    'adbyte/workflow_id': workflowId,
    'adbyte/agent_ip': agentIp,
    'adbyte/delegated_by': 'iam-agent',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setJti(id)
    .sign(DEMO_SECRET);

  const [rawHeader, rawPayload] = payload.split('.');
  const decodedHeader = JSON.parse(Buffer.from(rawHeader, 'base64url').toString());
  const decodedPayload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString());

  return {
    id,
    label: `${agentName} → ${api} API token`,
    issuedAt: now,
    grantType: 'token_exchange',
    issuedBy: 'demo-iam',
    rawToken: payload,
    header: decodedHeader,
    payload: decodedPayload,
    exchangeRequest: {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_label: userToken.label,
      audience,
      scope,
      acting_client_id: actingClientId,
    },
    highlights: {
      preserved: ['sub'],
      changed: ['azp', 'aud', 'scope', 'act', 'adbyte/plan_id', 'adbyte/agent_ip'],
    },
  };
}

async function performAuth0CTE(
  opts: Parameters<typeof performTokenExchange>[0],
  audience: string,
  actingClientId: string,
  id: string,
  now: string,
): Promise<IssuedToken> {
  const { userToken, scope } = opts;

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: userToken.rawToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    audience,
    scope,
    client_id: process.env.IAM_AGENT_CLIENT_ID!,
    client_secret: process.env.IAM_AGENT_CLIENT_SECRET!,
  });

  const resp = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Auth0 CTE failed: ${err}`);
  }

  const data = await resp.json() as { access_token: string };
  const rawToken = data.access_token;

  const [rawHeader, rawPayload] = rawToken.split('.');
  const decodedHeader = JSON.parse(Buffer.from(rawHeader, 'base64url').toString());
  const decodedPayload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString());

  return {
    id,
    label: `${opts.agentName} → ${opts.api} API token (Auth0 CTE)`,
    issuedAt: now,
    grantType: 'token_exchange',
    issuedBy: 'auth0',
    rawToken,
    header: decodedHeader,
    payload: decodedPayload,
    exchangeRequest: {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_label: userToken.label,
      audience,
      scope,
      acting_client_id: actingClientId,
    },
    highlights: {
      preserved: ['sub'],
      changed: ['azp', 'aud', 'scope', 'act'],
    },
  };
}
