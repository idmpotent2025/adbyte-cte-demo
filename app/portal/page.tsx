export const instant = false;

import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';
import PortalClient from './PortalClient';

export default async function PortalPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect('/api/auth/login');

  const u = session.user;
  return (
    <PortalClient
      user={{
        name: (u.name as string) ?? '',
        email: (u.email as string) ?? '',
        role: (u['adbyte/role'] as 'buyer' | 'publisher') ?? 'buyer',
        company: '',
        sub: u.sub as string,
      }}
    />
  );
}
