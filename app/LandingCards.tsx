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
        style={{ background: '#eef6ff', border: '2px solid #bfdbfe', textDecoration: 'none' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3b82f6';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 24px rgba(59,130,246,0.18)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#bfdbfe';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
        }}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ background: '#dbeafe' }}>
            🏢
          </div>
          <div>
            <div className="font-semibold mb-1" style={{ color: '#1e3a5f' }}>Agency / Buyer</div>
            <div className="text-sm mb-3" style={{ color: '#4b6a8a' }}>
              Login as a media agency or brand advertiser. Create campaigns, target audiences, negotiate deals.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['audience:segment', 'proposals:write', 'pricing:negotiate'].map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' }}>
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
        style={{ background: '#f5f3ff', border: '2px solid #ddd6fe', textDecoration: 'none' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#7c3aed';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 24px rgba(124,58,237,0.18)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#ddd6fe';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
        }}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ background: '#ede9fe' }}>
            📺
          </div>
          <div>
            <div className="font-semibold mb-1" style={{ color: '#3b0764' }}>Publisher (Enterprise)</div>
            <div className="text-sm mb-3" style={{ color: '#6b4a8a' }}>
              Login as a media publisher or broadcaster. Manage inventory, create audience segments.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['audience:analyze', 'proposals:submit', 'pricing:approve'].map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd' }}>
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-2 text-xs" style={{ color: '#7c5a9a' }}>Via Okta IDP</div>
          </div>
        </div>
      </a>
    </div>
  );
}
