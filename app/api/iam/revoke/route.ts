import { NextRequest } from 'next/server';
import { revokeToken } from '@/lib/token-registry';

export async function POST(req: NextRequest) {
  const { tokenId } = await req.json() as { tokenId: string };

  if (!tokenId) {
    return Response.json({ error: 'tokenId required' }, { status: 400 });
  }

  const ok = revokeToken(tokenId);
  if (!ok) {
    return Response.json({ error: 'Token not found' }, { status: 404 });
  }

  return Response.json({ ok: true, tokenId });
}
