import { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function GET(req: NextRequest) {
  console.log('[auth0] route hit:', req.nextUrl.pathname + req.nextUrl.search);
  console.log('[auth0] env check — DOMAIN:', process.env.AUTH0_DOMAIN, 'CLIENT_ID:', process.env.AUTH0_CLIENT_ID?.slice(0, 8), 'SECRET set:', !!process.env.AUTH0_SECRET, 'APP_BASE_URL:', process.env.APP_BASE_URL);
  try {
    return await auth0.middleware(req);
  } catch (err) {
    console.error('[auth0] middleware error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
