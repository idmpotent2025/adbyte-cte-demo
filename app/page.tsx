import LandingCards from './LandingCards';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f4f8 50%, #f8f9fa 100%)' }}>

      {/* Header badge */}
      <div className="mb-8 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{ background: '#dbeafe', border: '1px solid #93c5fd', color: '#1d4ed8' }}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.625 2.655A9 9 0 0119 11a1 1 0 11-2 0 7 7 0 00-9.625-6.492 1 1 0 11-.75-1.853zM4.662 4.959A1 1 0 014.75 6.37 6.97 6.97 0 003 11a1 1 0 11-2 0 8.97 8.97 0 012.25-5.953 1 1 0 011.412-.088z" clipRule="evenodd" />
        </svg>
        Auth0 Custom Token Exchange Demo
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold mb-3 text-center tracking-tight"
        style={{ color: '#111827' }}>
        Ad Manager Portal
      </h1>
      <p className="text-center mb-2 max-w-md" style={{ color: '#374151' }}>
        Agentic ad management with identity-preserving token delegation
      </p>
      <p className="text-center mb-12 text-sm max-w-sm" style={{ color: '#6b7280' }}>
        Watch Auth0 CTE mint scoped tokens — preserving <code className="px-1 rounded text-xs"
          style={{ background: '#fef3c7', color: '#92400e' }}>sub</code> while changing{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#fef3c7', color: '#92400e' }}>azp</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#fef3c7', color: '#92400e' }}>aud</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#fef3c7', color: '#92400e' }}>scope</code>
      </p>

      <LandingCards
        buyerHref="/api/auth/login?returnTo=/portal"
        publisherHref="/api/auth/login?connection=oktaidp&returnTo=/portal"
      />

      {/* Footer */}
      <div className="mt-16 flex items-center gap-2 text-xs" style={{ color: '#9ca3af' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        Auth0 powered — select your role to log in
      </div>
    </div>
  );
}
