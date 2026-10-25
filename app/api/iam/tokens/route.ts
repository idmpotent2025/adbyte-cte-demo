import { NextRequest } from 'next/server';
import { listTokens } from '@/lib/token-registry';

export async function GET(req: NextRequest) {
  const workflowId = req.nextUrl.searchParams.get('workflowId') ?? undefined;
  const tokens = listTokens(workflowId);
  return Response.json(tokens);
}
