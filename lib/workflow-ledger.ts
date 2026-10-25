interface LedgerTask {
  taskId: string;
  agent: string;
  api: string;
  scope: string;
}

interface LedgerEntry {
  workflowId: string;
  status: 'active' | 'complete' | 'error';
  tasks: LedgerTask[];
  userId: string;
  startedAt: string;
}

const ledger = new Map<string, LedgerEntry>();

export function openWorkflow(workflowId: string, userId: string, tasks: LedgerTask[]): void {
  ledger.set(workflowId, {
    workflowId,
    status: 'active',
    tasks,
    userId,
    startedAt: new Date().toISOString(),
  });
}

export function closeWorkflow(workflowId: string, status: 'complete' | 'error'): void {
  const entry = ledger.get(workflowId);
  if (entry) {
    ledger.set(workflowId, { ...entry, status });
  }
}

export function isAgentAuthorized(
  workflowId: string,
  agentName: string,
  api: string,
): boolean {
  const entry = ledger.get(workflowId);
  if (!entry || entry.status !== 'active') return false;
  return entry.tasks.some(
    (t) => t.agent === agentName && t.api === api,
  );
}

export function getLedgerEntry(workflowId: string): LedgerEntry | undefined {
  return ledger.get(workflowId);
}
