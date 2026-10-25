interface PendingApproval {
  resolve: () => void;
  reject: (err: Error) => void;
}

const pending = new Map<string, PendingApproval>();

export function waitForApproval(workflowId: string, timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(workflowId);
      reject(new Error('Approval timeout — workflow cancelled'));
    }, timeoutMs);

    pending.set(workflowId, {
      resolve: () => { clearTimeout(timer); pending.delete(workflowId); resolve(); },
      reject: (err) => { clearTimeout(timer); pending.delete(workflowId); reject(err); },
    });
  });
}

export function approveWorkflow(workflowId: string): boolean {
  const p = pending.get(workflowId);
  if (!p) return false;
  p.resolve();
  return true;
}

export function rejectWorkflow(workflowId: string): boolean {
  const p = pending.get(workflowId);
  if (!p) return false;
  p.reject(new Error('User cancelled workflow'));
  return true;
}
