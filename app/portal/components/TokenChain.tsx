'use client';

import { useState, useEffect, useCallback } from 'react';
import type { IssuedToken, TokenRegistryEntry, TokenStatus } from '@/lib/types';

function ClaimRow({ k, v, highlight }: { k: string; v: unknown; highlight?: 'preserved' | 'changed' }) {
  const valStr = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
  const bg = highlight === 'preserved' ? 'rgba(35,134,54,0.12)' :
    highlight === 'changed' ? 'rgba(227,179,65,0.12)' : 'transparent';
  const color = highlight === 'preserved' ? '#56d364' :
    highlight === 'changed' ? '#e3b341' : '#8b949e';

  return (
    <div className="flex gap-3 items-start py-1.5 px-2 rounded text-xs font-mono"
      style={{ background: bg }}>
      <span className="flex-shrink-0 w-32 truncate" style={{ color }}>
        {highlight === 'preserved' && <span className="mr-1">↓</span>}
        {highlight === 'changed' && <span className="mr-1">⟳</span>}
        {k}
      </span>
      <span className="break-all" style={{ color: '#c9d1d9' }}>{valStr}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: TokenStatus }) {
  const cfg = {
    active:  { label: 'Active',  bg: 'rgba(35,134,54,0.15)',  color: '#56d364', border: 'rgba(35,134,54,0.3)' },
    expired: { label: 'Expired', bg: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: 'rgba(139,92,246,0.3)' },
    revoked: { label: 'Revoked', bg: 'rgba(248,81,73,0.15)',  color: '#f85149', border: 'rgba(248,81,73,0.3)' },
  }[status];

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function ExpiryLabel({ expiresAt }: { expiresAt: string }) {
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = exp - now;
  const absDiffMin = Math.round(Math.abs(diffMs) / 60000);

  const label = diffMs > 0
    ? absDiffMin < 60
      ? `expires in ${absDiffMin}m`
      : `expires in ${Math.round(absDiffMin / 60)}h`
    : absDiffMin < 60
      ? `expired ${absDiffMin}m ago`
      : `expired ${Math.round(absDiffMin / 60)}h ago`;

  return (
    <span className="text-xs" style={{ color: diffMs > 0 ? '#6e7681' : '#f85149' }}>
      {label}
    </span>
  );
}

interface TokenCardProps {
  token: IssuedToken;
  index: number;
  registryEntry?: TokenRegistryEntry;
  onRevoke: (tokenId: string) => Promise<void>;
}

function TokenCard({ token, index, registryEntry, onRevoke }: TokenCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [showRaw, setShowRaw] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const status = registryEntry?.status ?? 'active';

  const grantBadge = token.grantType === 'token_exchange'
    ? { label: 'CTE', bg: 'rgba(227,179,65,0.15)', color: '#e3b341', border: 'rgba(227,179,65,0.3)' }
    : { label: 'Auth Code', bg: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: 'rgba(31,111,235,0.3)' };

  const issuedByBadge = token.issuedBy === 'auth0'
    ? { label: 'Auth0', color: '#58a6ff' }
    : { label: 'Demo', color: '#8b949e' };

  const borderColor = status === 'revoked' ? 'rgba(248,81,73,0.4)' :
    status === 'expired' ? 'rgba(139,92,246,0.3)' : '#30363d';

  async function handleRevoke(e: React.MouseEvent) {
    e.stopPropagation();
    setRevoking(true);
    try {
      await onRevoke(token.id);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${borderColor}`, background: '#161b22' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            background: index === 0 ? 'rgba(31,111,235,0.2)' : 'rgba(35,134,54,0.2)',
            color: index === 0 ? '#58a6ff' : '#56d364',
          }}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" style={{ color: '#e6edf3' }}>{token.label}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: '#6e7681' }}>
              {new Date(token.issuedAt).toLocaleTimeString()}
              {' · '}sub: <span className="font-mono" style={{ color: '#c9d1d9' }}>
                {String(token.payload.sub ?? '').slice(0, 24)}…
              </span>
            </span>
            {registryEntry && <ExpiryLabel expiresAt={registryEntry.expiresAt} />}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {registryEntry && <StatusBadge status={status} />}
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: grantBadge.bg, color: grantBadge.color, border: `1px solid ${grantBadge.border}` }}>
            {grantBadge.label}
          </span>
          <span className="text-xs" style={{ color: '#6e7681' }}>{issuedByBadge.label}</span>
          {status === 'active' && registryEntry && (
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50"
              style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)' }}>
              {revoking ? '…' : 'Revoke'}
            </button>
          )}
          <svg className="w-4 h-4 transition-transform" style={{ color: '#6e7681', transform: expanded ? 'rotate(180deg)' : '' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: '#21262d' }}>
          {registryEntry?.revokedAt && (
            <div className="mt-4 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', color: '#f85149' }}>
              Revoked at {new Date(registryEntry.revokedAt).toLocaleTimeString()}
            </div>
          )}

          {token.exchangeRequest && (
            <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
              <div className="font-medium mb-2" style={{ color: '#8b949e' }}>Token Exchange Request (RFC 8693)</div>
              <div className="space-y-1 font-mono">
                {Object.entries(token.exchangeRequest).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="w-36 flex-shrink-0" style={{ color: '#6e7681' }}>{k}:</span>
                    <span style={{ color: '#c9d1d9' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-medium" style={{ color: '#8b949e' }}>JWT Claims</span>
              <div className="flex gap-3 text-xs">
                <span style={{ color: '#56d364' }}>↓ preserved</span>
                <span style={{ color: '#e3b341' }}>⟳ changed</span>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #21262d' }}>
              {Object.entries(token.payload).map(([k, v]) => {
                const hl = token.highlights.preserved.includes(k) ? 'preserved' :
                  token.highlights.changed.includes(k) ? 'changed' : undefined;
                return <ClaimRow key={k} k={k} v={v} highlight={hl} />;
              })}
            </div>
          </div>

          <button onClick={() => setShowRaw(!showRaw)}
            className="text-xs" style={{ color: '#8b949e' }}>
            {showRaw ? '▲ Hide' : '▼ Show'} raw JWT
          </button>
          {showRaw && (
            <div className="rounded-lg p-3 text-xs font-mono break-all"
              style={{ background: '#0d1117', color: '#6e7681', border: '1px solid #21262d', wordBreak: 'break-all' }}>
              {token.rawToken}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  tokens: IssuedToken[];
  workflowId?: string;
}

export default function TokenChain({ tokens, workflowId }: Props) {
  const [registry, setRegistry] = useState<Map<string, TokenRegistryEntry>>(new Map());

  const fetchRegistry = useCallback(async () => {
    try {
      const url = workflowId
        ? `/api/iam/tokens?workflowId=${workflowId}`
        : '/api/iam/tokens';
      const res = await fetch(url);
      if (!res.ok) return;
      const entries = await res.json() as TokenRegistryEntry[];
      setRegistry(new Map(entries.map((e) => [e.id, e])));
    } catch { /* ignore */ }
  }, [workflowId]);

  useEffect(() => {
    fetchRegistry();
    // Poll while tab is visible so status stays live
    const id = setInterval(fetchRegistry, 5000);
    return () => clearInterval(id);
  }, [fetchRegistry]);

  async function handleRevoke(tokenId: string) {
    const res = await fetch('/api/iam/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId }),
    });
    if (res.ok) {
      await fetchRegistry();
    }
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: '#6e7681' }}>
        <div className="text-4xl mb-3">🔑</div>
        <p className="text-sm">Run a workflow to see the token chain</p>
      </div>
    );
  }

  const activeCount = tokens.filter((t) => (registry.get(t.id)?.status ?? 'active') === 'active').length;
  const revokedCount = tokens.filter((t) => registry.get(t.id)?.status === 'revoked').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-medium" style={{ color: '#8b949e' }}>
          {tokens.length} token{tokens.length !== 1 ? 's' : ''} issued
        </div>
        {revokedCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)' }}>
            {revokedCount} revoked
          </span>
        )}
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(35,134,54,0.12)', color: '#56d364', border: '1px solid rgba(35,134,54,0.3)' }}>
          {activeCount} active
        </span>
        <div className="flex-1 h-px" style={{ background: '#21262d' }} />
        <button onClick={fetchRegistry}
          className="text-xs px-2 py-0.5 rounded transition-colors"
          style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
          ↻ Refresh
        </button>
      </div>

      {tokens.map((token, i) => (
        <div key={token.id}>
          <TokenCard
            token={token}
            index={i}
            registryEntry={registry.get(token.id)}
            onRevoke={handleRevoke}
          />
          {i < tokens.length - 1 && (
            <div className="flex justify-center my-1">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-3" style={{ background: '#30363d' }} />
                <svg className="w-3 h-3" style={{ color: '#e3b341' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(227,179,65,0.1)', color: '#e3b341', border: '1px solid rgba(227,179,65,0.2)' }}>
                  CTE
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
