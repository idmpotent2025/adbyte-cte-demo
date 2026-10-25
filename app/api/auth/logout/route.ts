import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/auth0';
import { DEMO_COOKIE } from '@/lib/demo-session';

export async function GET() {
  if (!isDemoMode) {
    return NextResponse.redirect(
      new URL('/auth/logout', process.env.APP_BASE_URL ?? 'http://localhost:3000'),
    );
  }

  const res = NextResponse.redirect(
    new URL('/', process.env.APP_BASE_URL ?? 'http://localhost:3000'),
  );
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
