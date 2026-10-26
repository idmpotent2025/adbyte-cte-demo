import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import type { IssuedToken } from '../types';
import { registerToken } from '../token-registry';
import { isAgentAuthorized } from '../workflow-ledger';
import { getCteProfile, getTokenLabel } from '../cte-profiles';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

interface IamScopeDecision {
  grantedScopes: string[];
  reasoning: string;
  denied: string[];
}

async function decideScopesWithLLM(
  agentName: string,
  api: string,
  taskDescription: string,
  allowedScopes: string[],
): Promise<IamScopeDecision> {
  if (!process.env.OPENAI_API_KEY) {
    console.log(`[IAM] No OPENAI_API_KEY — demo fallback for ${agentName}/${api}`);
    const granted = allowedScopes.filter((s) => s.startsWith(`${api}:`));
    return {
      grantedScopes: granted,
      reasoning: `Demo mode (no OPENAI_API_KEY): granted all ${api} scopes from the agent profile.`,
      denied: allowedScopes.filter((s) => !s.startsWith(`${api}:`)),
    };
  }

  console.log(`[IAM] LLM scope reasoning — agent=${agentName} api=${api} available=[${allowedScopes.join(',')}]`);
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `You are an IAM policy agent for a zero-trust ad tech platform.
Your job: given a task description and the full list of scopes this agent profile allows,
decide the MINIMUM scopes strictly needed to complete the task. Never over-provision.
Only grant scopes the task explicitly requires. Deny everything else.`,
      },
      {
        role: 'user',
        content: `Agent: ${agentName}
API: ${api}
Task: ${taskDescription}
Available scopes: ${allowedScopes.join(', ')}

Return only the scopes from the available list that are strictly necessary for this task.`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'iam_scope_decision',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            grantedScopes: { type: 'array', items: { type: 'string' } },
            reasoning: { type: 'string' },
            denied: { type: 'array', items: { type: 'string' } },
          },
          required: ['grantedScopes', 'reasoning', 'denied'],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = completion.choices[0].message.content ?? '{}';
  console.log(`[IAM] LLM raw response: ${raw}`);
  const decision = JSON.parse(raw) as IamScopeDecision;

  // Safety: only ever grant scopes that are actually in the profile's allowedScopes
  const safe = decision.grantedScopes.filter((s) => allowedScopes.includes(s));
  const denied = allowedScopes.filter((s) => !safe.includes(s));
  console.log(`[IAM] Granted scopes: [${safe.join(',')}] Denied: [${denied.join(',')}]`);
  return { grantedScopes: safe, reasoning: decision.reasoning, denied };
}

export async function performTokenExchange(opts: {
  userToken: IssuedToken;
  agentName: 'buyer-agent' | 'publisher-agent';
  api: 'audience' | 'proposal' | 'pricing';
  taskDescription: string;
  planId: string;
  workflowId: string;
  taskId?: string;
}): Promise<IssuedToken> {
  const { userToken, agentName, api, taskDescription, workflowId, taskId } = opts;

  console.log(`[IAM] performTokenExchange — agent=${agentName} api=${api} workflowId=${workflowId} taskId=${taskId}`);

  if (!isAgentAuthorized(workflowId, agentName, api)) {
    console.error(`[IAM] Authorization DENIED — agent=${agentName} api=${api} workflowId=${workflowId}`);
    throw new Error(`IAM: "${agentName}" not authorized for ${api} — request not in orchestration plan`);
  }

  console.log(`[IAM] Authorization OK`);
  const profile = getCteProfile(agentName);
  const tokenLabel = getTokenLabel(agentName, api);

  // IAM uses LLM reasoning to decide the minimal scopes for this task
  const { grantedScopes, reasoning } = await decideScopesWithLLM(
    agentName,
    api,
    taskDescription,
    profile.allowedScopes,
  );

  if (grantedScopes.length === 0) {
    throw new Error(`IAM: LLM denied all scopes for "${agentName}" → ${api} (task: "${taskDescription}")`);
  }

  const scope = grantedScopes.join(' ');

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

  console.log(`[IAM] Auth0 CTE request — domain=${process.env.AUTH0_DOMAIN} audience=${profile.audience} scope=${scope} client_id=${profile.clientId}`);
  const resp = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error(`[IAM] Auth0 CTE FAILED — status=${resp.status} body=${err}`);
    throw new Error(`Auth0 CTE failed for "${tokenLabel}": ${err}`);
  }
  console.log(`[IAM] Auth0 CTE success — status=${resp.status}`);

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
    iamReasoning: reasoning,
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
