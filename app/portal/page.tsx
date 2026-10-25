export const instant = false;

import { redirect } from 'next/navigation';
import { isDemoMode } from '@/lib/auth0';
import { getDemoSession } from '@/lib/demo-session';
import PortalClient from './PortalClient';

export default async function PortalPage() {
  let userName = '';
  let userEmail = '';
  let userRole: 'buyer' | 'publisher' = 'buyer';
  let userCompany = '';
  let userSub = '';

  if (isDemoMode) {
    const session = await getDemoSession();
    if (!session) redirect('/');
    if (!session.role) redirect('/join');
    userName = session.name;
    userEmail = session.email;
    userRole = session.role;
    userCompany = session.company ?? '';
    userSub = session.sub;
  } else {
    const { auth0 } = await import('@/lib/auth0');
    const session = await auth0!.getSession();
    if (!session?.user) redirect('/auth/login');
    const u = session.user;
    userName = (u.name as string) ?? '';
    userEmail = (u.email as string) ?? '';
    userRole = (u['adbyte/role'] as 'buyer' | 'publisher') ?? 'buyer';
    userSub = u.sub as string;
  }

  return (
    <PortalClient
      user={{ name: userName, email: userEmail, role: userRole, company: userCompany, sub: userSub }}
    />
  );
}
