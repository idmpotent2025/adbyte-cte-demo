'use client';

interface Props {
  buyerHref: string;
  publisherHref: string;
}

export default function LandingCards({ buyerHref, publisherHref }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
      {/* Buyer / Agency */}
      <a
        href={buyerHref}
        className="group relative p-6 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] block"
        style={{ background: '#161b22', border: '1px solid #30363d', textDecoration: 'none' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#1f6feb';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px rgba(31,111,235,0.15)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#30363d';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
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
      </a>

      {/* Publisher */}
      <a
        href={publisherHref}
        className="group relative p-6 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] block"
        style={{ background: '#161b22', border: '1px solid #30363d', textDecoration: 'none' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#8b5cf6';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px rgba(139,92,246,0.15)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#30363d';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
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
            <div className="mt-2 text-xs" style={{ color: '#6e7681' }}>Via Okta IDP</div>
          </div>
        </div>
      </a>
    </div>
  );
}
