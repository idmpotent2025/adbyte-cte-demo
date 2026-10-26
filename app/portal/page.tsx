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
  const rawToken = (session as Record<string, unknown>).tokenSet
    ? ((session as Record<string, unknown>).tokenSet as Record<string, unknown>).accessToken as string | undefined
    : undefined;

  if (rawToken) {
    try {
      const [rawHeader, rawPayload] = rawToken.split('.');
      const header = JSON.parse(Buffer.from(rawHeader, 'base64url').toString());
      const payload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString());
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
