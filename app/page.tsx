'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<'buyer' | 'publisher' | null>(null);
  const [error, setError] = useState('');

  async function handleDemoLogin(persona: 'buyer' | 'publisher') {
    setLoading(persona);
    setError('');
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });
      if (!res.ok) throw new Error('Login failed');
      router.push('/join');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)' }}>

      {/* Header badge */}
      <div className="mb-8 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(31,111,235,0.15)', border: '1px solid rgba(31,111,235,0.3)', color: '#58a6ff' }}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.625 2.655A9 9 0 0119 11a1 1 0 11-2 0 7 7 0 00-9.625-6.492 1 1 0 11-.75-1.853zM4.662 4.959A1 1 0 014.75 6.37 6.97 6.97 0 003 11a1 1 0 11-2 0 8.97 8.97 0 012.25-5.953 1 1 0 011.412-.088z" clipRule="evenodd" />
        </svg>
        Auth0 Custom Token Exchange Demo
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold mb-3 text-center tracking-tight"
        style={{ color: '#e6edf3' }}>
        Ad Manager Portal
      </h1>
      <p className="text-center mb-2 max-w-md" style={{ color: '#8b949e' }}>
        Agentic ad management with identity-preserving token delegation
      </p>
      <p className="text-center mb-12 text-sm max-w-sm" style={{ color: '#6e7681' }}>
        Watch Auth0 CTE mint scoped tokens — preserving <code className="px-1 rounded text-xs"
          style={{ background: '#21262d', color: '#e3b341' }}>sub</code> while changing{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#21262d', color: '#e3b341' }}>azp</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#21262d', color: '#e3b341' }}>aud</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#21262d', color: '#e3b341' }}>scope</code>
      </p>

      {/* Login cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Buyer / Agency */}
        <button
          onClick={() => handleDemoLogin('buyer')}
          disabled={loading !== null}
          className="group relative p-6 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
            boxShadow: '0 0 0 0 rgba(31,111,235,0)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f6feb';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(31,111,235,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#30363d';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(31,111,235,0)';
          }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ background: 'rgba(31,111,235,0.15)' }}>
              🏢
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: '#e6edf3' }}>Agency / Buyer</div>
              <div className="text-sm mb-3" style={{ color: '#8b949e' }}>
                Login as a media agency or brand advertiser. Create campaigns, target audiences, negotiate deals.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['audience:segment', 'proposals:write', 'pricing:negotiate'].map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(31,111,235,0.1)', color: '#58a6ff', border: '1px solid rgba(31,111,235,0.2)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {loading === 'buyer' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(13,17,23,0.8)' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#1f6feb', borderTopColor: 'transparent' }} />
            </div>
          )}
        </button>

        {/* Publisher */}
        <button
          onClick={() => handleDemoLogin('publisher')}
          disabled={loading !== null}
          className="group relative p-6 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#8b5cf6';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(139,92,246,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#30363d';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
          }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ background: 'rgba(139,92,246,0.15)' }}>
              📺
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: '#e6edf3' }}>Publisher (Enterprise)</div>
              <div className="text-sm mb-3" style={{ color: '#8b949e' }}>
                Login as a media publisher or broadcaster. Manage inventory, create audience segments.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['audience:analyze', 'proposals:submit', 'pricing:approve'].map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {loading === 'publisher' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(13,17,23,0.8)' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
            </div>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      {/* Footer */}
      <div className="mt-16 flex items-center gap-2 text-xs" style={{ color: '#6e7681' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        Demo mode — no Auth0 tenant required
      </div>
    </div>
  );
}
