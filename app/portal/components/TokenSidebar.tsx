'use client';

import { useState, useEffect, Fragment } from 'react';
import type { IssuedToken } from '@/lib/types';

function TokenCard({ token, index, now }: { token: IssuedToken; index: number; now: number }) {
  const exp = token.payload.exp as number | undefined;
  const expired = exp !== undefined && exp < now;

  const grantBadge =
    token.grantType === 'token_exchange'
      ? { label: 'CTE', bg: 'rgba(227,179,65,0.15)', color: '#e3b341', border: 'rgba(227,179,65,0.3)' }
      : { label: 'Auth Code', bg: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: 'rgba(31,111,235,0.3)' };

  const numColor =
    index === 0
      ? { bg: 'rgba(31,111,235,0.2)', color: '#58a6ff' }
      : { bg: 'rgba(35,134,54,0.2)', color: '#56d364' };

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: '#161b22',
        border: `1px solid ${expired ? '#21262d' : '#30363d'}`,
        opacity: expired ? 0.5 : 1,
        transition: 'opacity 0.5s',
      }}
    >
      {/* Card header */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
          style={{ background: numColor.bg, color: numColor.color }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-medium truncate"
            style={{ color: expired ? '#6e7681' : '#e6edf3' }}>
            {token.label}
          </div>
          <div className="text-xs" style={{ color: '#484f58' }}>
            {new Date(token.issuedAt).toLocaleTimeString()}
          </div>
        </div>
        {expired ? (
          <span
            className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.2)' }}>
            Expired
          </span>
        ) : (
          <span
            className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: grantBadge.bg, color: grantBadge.color, border: `1px solid ${grantBadge.border}` }}>
            {grantBadge.label}
          </span>
        )}
      </div>

      {/* Claims */}
      <div className="space-y-1 mb-2" style={{ fontFamily: 'monospace' }}>
        {(
          [
            ['sub', String(token.payload.sub ?? '—').slice(0, 26)],
            ['azp', String(token.payload.azp ?? '—')],
            ['scope', String(token.payload.scope ?? '—')],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="w-8 flex-shrink-0" style={{ color: '#6e7681' }}>{k}</span>
            <span className="truncate" style={{ color: '#c9d1d9' }}>{v}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

interface Props {
  tokens: IssuedToken[];
}

export default function TokenSidebar({ tokens }: Props) {
  // Check every 2 minutes whether tokens have expired
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 120_000);
    return () => clearInterval(id);
  }, []);

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#6e7681' }}>
        <div className="text-3xl mb-3">🔑</div>
        <p className="text-sm">Tokens appear here as the workflow runs</p>
        <p className="text-xs mt-1" style={{ color: '#484f58' }}>User token → agent CTE tokens</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tokens.map((token, i) => (
        <Fragment key={token.id}>
          <TokenCard token={token} index={i} now={now} />
          {i < tokens.length - 1 && (
            <div className="flex justify-center py-0.5">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-2" style={{ background: '#30363d' }} />
                {tokens[i + 1]?.grantType === 'token_exchange' && (
                  <span
                    className="rounded px-1.5 py-px"
                    style={{
                      background: 'rgba(227,179,65,0.1)',
                      color: '#e3b341',
                      border: '1px solid rgba(227,179,65,0.2)',
                      fontSize: '10px',
                      lineHeight: '1.4',
                    }}>
                    CTE
                  </span>
                )}
                <div className="w-px h-2" style={{ background: '#30363d' }} />
              </div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
