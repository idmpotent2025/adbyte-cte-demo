import { NextRequest } from 'next/server';
import { rejectWorkflow } from '@/lib/approval-registry';

export async function POST(req: NextRequest) {
  const { workflowId } = await req.json() as { workflowId: string };

  if (!workflowId) {
    return Response.json({ error: 'workflowId required' }, { status: 400 });
  }

  const ok = rejectWorkflow(workflowId);
  if (!ok) {
    return Response.json({ error: 'No pending approval for this workflow' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
