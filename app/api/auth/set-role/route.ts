import { NextRequest, NextResponse } from 'next/server';
import { setDemoRole, DEMO_COOKIE } from '@/lib/demo-session';
import type { UserRole } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { role } = await req.json() as { role: UserRole };
  if (role !== 'buyer' && role !== 'publisher') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const token = await setDemoRole(role);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return res;
}
