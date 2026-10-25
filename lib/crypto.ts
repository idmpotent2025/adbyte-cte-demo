import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt.trim()).digest('hex');
}

export function generatePlanId(promptHash: string): string {
  const shortHash = promptHash.slice(0, 8);
  const ts = Math.floor(Date.now() / 1000);
  return `plan-${shortHash}-${ts}`;
}

export function generateWorkflowId(): string {
  return `wf-${uuidv4()}`;
}

export function generateRunId(): string {
  return uuidv4();
}
