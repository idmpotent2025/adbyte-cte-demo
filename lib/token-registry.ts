import type { TokenRegistryEntry, TokenStatus } from './types';

const registry = new Map<string, TokenRegistryEntry>();

export function resolveStatus(entry: TokenRegistryEntry): TokenStatus {
  if (entry.status === 'revoked') return 'revoked';
  const now = Math.floor(Date.now() / 1000);
  const exp = entry.payload.exp as number | undefined;
  if (exp && now > exp) return 'expired';
  return 'active';
}

export function registerToken(entry: TokenRegistryEntry): void {
  registry.set(entry.id, entry);
}

export function revokeToken(id: string): boolean {
  const entry = registry.get(id);
  if (!entry) return false;
  registry.set(id, { ...entry, status: 'revoked', revokedAt: new Date().toISOString() });
  return true;
}

export function getToken(id: string): TokenRegistryEntry | undefined {
  const entry = registry.get(id);
  if (!entry) return undefined;
  // Auto-update status for expiry
  const live = resolveStatus(entry);
  if (live !== entry.status) {
    const updated = { ...entry, status: live };
    registry.set(id, updated);
    return updated;
  }
  return entry;
}

export function listTokens(workflowId?: string): TokenRegistryEntry[] {
  const all = [...registry.values()];
  const filtered = workflowId ? all.filter((e) => e.workflowId === workflowId) : all;
  // Resolve live status before returning
  return filtered.map((e) => {
    const live = resolveStatus(e);
    if (live !== e.status) {
      const updated = { ...e, status: live };
      registry.set(e.id, updated);
      return updated;
    }
    return e;
  });
}
