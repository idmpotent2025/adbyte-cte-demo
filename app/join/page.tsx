'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<'buyer' | 'publisher' | null>(null);

  async function handleRole(role: 'buyer' | 'publisher') {
    setLoading(role);
    const res = await fetch('/api/auth/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      router.push('/portal');
    } else {
      router.push('/');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0d1117' }}>

      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(31,111,235,0.15)', border: '1px solid rgba(31,111,235,0.3)' }}>
            🎯
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#e6edf3' }}>
          Join as…
        </h2>
        <p className="text-center text-sm mb-8" style={{ color: '#8b949e' }}>
          Select your role to enter the portal. This sets which agent chain you&apos;ll use.
        </p>

        <div className="space-y-3">
          {/* Buyer */}
          <button
            onClick={() => handleRole('buyer')}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all disabled:opacity-50"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f6feb'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#30363d'; }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(31,111,235,0.15)' }}>
              {loading === 'buyer'
                ? <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#1f6feb', borderTopColor: 'transparent' }} />
                : <span className="text-xl">🏢</span>}
            </div>
            <div>
              <div className="font-medium" style={{ color: '#e6edf3' }}>Agency Buyer</div>
              <div className="text-sm" style={{ color: '#8b949e' }}>
                buyer-agent · audience + proposals + pricing
              </div>
            </div>
            <div className="ml-auto" style={{ color: '#30363d' }}>→</div>
          </button>

          {/* Publisher */}
          <button
            onClick={() => handleRole('publisher')}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all disabled:opacity-50"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#8b5cf6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#30363d'; }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.15)' }}>
              {loading === 'publisher'
                ? <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
                : <span className="text-xl">📺</span>}
            </div>
            <div>
              <div className="font-medium" style={{ color: '#e6edf3' }}>Publisher</div>
              <div className="text-sm" style={{ color: '#8b949e' }}>
                publisher-agent · audience + proposals + pricing
              </div>
            </div>
            <div className="ml-auto" style={{ color: '#30363d' }}>→</div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => router.push('/')} className="text-sm" style={{ color: '#8b949e' }}>
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
