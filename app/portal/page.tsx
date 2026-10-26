export const instant = false;

import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { auth0 } from '@/lib/auth0';
import PortalClient from './PortalClient';
import type { IssuedToken } from '@/lib/types';

export default async function PortalPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect('/api/auth/login');

  const u = session.user;

  // Build the user's login token for display in TokenSidebar
  let userToken: IssuedToken | null = null;
  let rawToken: string | undefined;
  try {
    const tokenResult = await auth0.getAccessToken();
    rawToken = typeof tokenResult === 'string' ? tokenResult : (tokenResult as unknown as { token: string }).token;
  } catch { /* not fatal — token sidebar just won't show user token */ }

  if (rawToken && rawToken.split('.').length >= 3) {
    try {
      const parts = rawToken.split('.');
      const isJwe = parts.length === 5;
      const header = isJwe ? { alg: 'JWE', enc: 'encrypted' } : JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = isJwe ? { sub: '(encrypted)', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 } : JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      userToken = {
        id: uuidv4(),
        label: `${u.name ?? u.email} (login)`,
        issuedAt: new Date((payload.iat as number) * 1000).toISOString(),
        grantType: 'authorization_code',
        issuedBy: 'auth0',
        rawToken,
        header,
        payload,
        highlights: { preserved: [], changed: [] },
      };
    } catch { /* ignore decode errors */ }
  }

  return (
    <PortalClient
      user={{
        name: (u.name as string) ?? '',
        email: (u.email as string) ?? '',
        role: (u['adbyte/role'] as 'buyer' | 'publisher') ?? 'buyer',
        company: '',
        sub: u.sub as string,
      }}
      userToken={userToken}
    />
  );
}
