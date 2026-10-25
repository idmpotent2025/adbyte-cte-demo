'use client';

import { useState, useEffect, Fragment } from 'react';
import type { IssuedToken } from '@/lib/types';

function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function TtlBar({ token }: { token: IssuedToken }) {
  const now = Date.now() / 1000;
  const exp = token.payload.exp as number;
  const iat = token.payload.iat as number;
  const remaining = exp - now;
  const total = exp - iat;
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const color = pct > 50 ? '#56d364' : pct > 25 ? '#e3b341' : '#f85149';

  const label =
    remaining <= 0 ? 'Expired'
    : remaining < 60 ? `${Math.ceil(remaining)}s`
    : `${Math.floor(remaining / 60)}m ${Math.floor(remaining % 60)}s`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: '#8b949e' }}>TTL</span>
        <span className="text-xs font-mono font-medium" style={{ color }}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#21262d' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TokenCard({ token, index }: { token: IssuedToken; index: number }) {
  const act = (token.payload.act as { sub?: string } | undefined)?.sub;

  const grantBadge =
    token.grantType === 'token_exchange'
      ? { label: 'CTE', bg: 'rgba(227,179,65,0.15)', color: '#e3b341', border: 'rgba(227,179,65,0.3)' }
      : { label: 'Auth Code', bg: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: 'rgba(31,111,235,0.3)' };

  const numColor =
    index === 0
      ? { bg: 'rgba(31,111,235,0.2)', color: '#58a6ff' }
      : { bg: 'rgba(35,134,54,0.2)', color: '#56d364' };

  const rows: [string, string][] = [
    ['sub', String(token.payload.sub ?? '—').slice(0, 40)],
    ['azp', String(token.payload.azp ?? '—')],
    ['act', act ?? '—'],
    ['scope', String(token.payload.scope ?? '—')],
  ];

  return (
    <div className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: numColor.bg, color: numColor.color }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" style={{ color: '#e6edf3' }}>{token.label}</div>
          <div className="text-xs" style={{ color: '#6e7681' }}>
            {new Date(token.issuedAt).toLocaleTimeString()} · {token.issuedBy === 'auth0' ? 'Auth0' : 'Demo IAM'}
          </div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: grantBadge.bg, color: grantBadge.color, border: `1px solid ${grantBadge.border}` }}>
          {grantBadge.label}
        </span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <span className="font-mono w-12 flex-shrink-0" style={{ color: '#6e7681' }}>{k}</span>
            <span className="font-mono truncate" style={{ color: '#c9d1d9' }}>{v}</span>
          </div>
        ))}
      </div>

      <TtlBar token={token} />
    </div>
  );
}

interface Props {
  tokens: IssuedToken[];
}

export default function TokenChain({ tokens }: Props) {
  useTick();

  const now = Date.now() / 1000;
  const active = tokens.filter((t) => {
    const exp = t.payload.exp as number | undefined;
    return !exp || exp > now;
  });

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: '#6e7681' }}>
        <div className="text-4xl mb-3">🔑</div>
        <p className="text-sm">Run a workflow to see active tokens</p>
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: '#6e7681' }}>
        <div className="text-4xl mb-3">⏱</div>
        <p className="text-sm">All tokens expired</p>
        <p className="text-xs mt-1" style={{ color: '#484f58' }}>Run a new workflow to get fresh tokens</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-medium" style={{ color: '#8b949e' }}>
          {active.length} active token{active.length !== 1 ? 's' : ''}
        </div>
        <div className="flex-1 h-px" style={{ background: '#21262d' }} />
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(35,134,54,0.12)', color: '#56d364', border: '1px solid rgba(35,134,54,0.3)' }}>
          live countdown
        </span>
      </div>

      {active.map((token, i) => (
        <Fragment key={token.id}>
          <TokenCard token={token} index={i} />
          {i < active.length - 1 && (
            <div className="flex justify-center my-1">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-3" style={{ background: '#30363d' }} />
                <svg className="w-3 h-3" style={{ color: '#e3b341' }} fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <div
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'rgba(227,179,65,0.1)', color: '#e3b341', border: '1px solid rgba(227,179,65,0.2)' }}>
                  CTE
                </div>
              </div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
