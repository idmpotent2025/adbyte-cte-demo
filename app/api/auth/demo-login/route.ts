import { NextRequest, NextResponse } from 'next/server';
import { createDemoSession, DEMO_COOKIE } from '@/lib/demo-session';

export async function POST(req: NextRequest) {
  const { persona } = await req.json() as { persona: 'buyer' | 'publisher' };
  if (persona !== 'buyer' && persona !== 'publisher') {
    return NextResponse.json({ error: 'Invalid persona' }, { status: 400 });
  }

  const token = await createDemoSession(persona);
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
