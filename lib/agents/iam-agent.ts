import { v4 as uuidv4 } from 'uuid';
import type { IssuedToken } from '../types';
import { registerToken } from '../token-registry';
import { isAgentAuthorized } from '../workflow-ledger';
import { getCteProfile, getTokenLabel } from '../cte-profiles';

export async function performTokenExchange(opts: {
  userToken: IssuedToken;
  agentName: 'buyer-agent' | 'publisher-agent';
  api: 'audience' | 'proposal' | 'pricing';
  scope: string;
  planId: string;
  workflowId: string;
  taskId?: string;
}): Promise<IssuedToken> {
  const { userToken, agentName, api, scope, workflowId, taskId } = opts;

  if (!isAgentAuthorized(workflowId, agentName, api, scope)) {
    throw new Error(`IAM: "${agentName}" not authorized for ${api}:${scope} — request not in orchestration plan`);
  }

  const profile = getCteProfile(agentName);
  const tokenLabel = getTokenLabel(agentName, api);

  const requestedScopes = scope.split(' ').filter(Boolean);
  const disallowed = requestedScopes.filter((s) => !profile.allowedScopes.includes(s));
  if (disallowed.length > 0) {
    throw new Error(`IAM: scope(s) "${disallowed.join(', ')}" not permitted by profile "${profile.name}"`);
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: userToken.rawToken,
    subject_token_type: profile.subjectTokenType,
    requested_token_type: profile.requestedSubTokenType,
    audience: profile.audience,
    scope,
    client_id: profile.clientId,
    client_secret: profile.clientSecret,
  });

  const resp = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Auth0 CTE failed for "${tokenLabel}": ${err}`);
  }

  const data = await resp.json() as { access_token: string };
  const rawToken = data.access_token;

  const [rawHeader, rawPayload] = rawToken.split('.');
  const decodedHeader = JSON.parse(Buffer.from(rawHeader, 'base64url').toString());
  const decodedPayload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString());

  const issuedToken: IssuedToken = {
    id,
    label: tokenLabel,
    issuedAt: now,
    grantType: 'token_exchange',
    issuedBy: 'auth0',
    rawToken,
    header: decodedHeader,
    payload: decodedPayload,
    exchangeRequest: {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_label: userToken.label,
      requested_sub_token_type: profile.requestedSubTokenType,
      audience: profile.audience,
      scope,
      acting_client_id: profile.clientId,
      cte_profile_name: profile.name,
    },
    highlights: {
      preserved: ['sub'],
      changed: ['azp', 'aud', 'scope', 'act'],
    },
  };

  registerToken({
    id,
    label: tokenLabel,
    issuedAt: now,
    expiresAt: new Date((decodedPayload.exp as number) * 1000).toISOString(),
    status: 'active',
    agentName,
    workflowId,
    taskId,
    grantType: 'token_exchange',
    scope,
    audience: profile.audience,
    payload: decodedPayload,
  });

  return issuedToken;
}
