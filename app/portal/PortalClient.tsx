'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import TokenChain from './components/TokenChain';
import type { WorkflowRun, SessionUser } from '@/lib/types';

const AgentGraphView = dynamic(() => import('./components/AgentGraphView'), { ssr: false });

const EXAMPLE_PROMPTS = {
  buyer: [
    'Find sports audiences aged 18-34, create a $300k Q4 proposal, and negotiate a deal below $9 CPM',
    'Research premium auto intender segments and submit a connected TV proposal for the holiday season',
  ],
  publisher: [
    'Analyze our sports audience reach and create a premium sponsorship package for agency buyers',
    'Segment our streaming audience by genre, then approve the best incoming CPM deal',
  ],
};

interface Props {
  user: Pick<SessionUser, 'name' | 'email' | 'role' | 'company' | 'sub'>;
}

export default function PortalClient({ user }: Props) {
  const [tab, setTab] = useState<'tokens' | 'graph'>('tokens');
  const [prompt, setPrompt] = useState('');
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const examples = EXAMPLE_PROMPTS[user.role ?? 'buyer'];

  async function handleRun() {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);
    setRun(null);
    setStatusText('Initializing…');

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/workflow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || 'Workflow failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const update = JSON.parse(line.slice(6)) as WorkflowRun;
              setRun({ ...update });
              setStatusText(
                update.status === 'planning' ? 'Orchestrator planning…' :
                update.status === 'executing' ? `Executing ${update.tasks.filter((t) => t.status === 'complete').length}/${update.tasks.length} tasks…` :
                update.status === 'awaiting_approval' ? 'Waiting for approval…' :
                update.status === 'complete' ? 'Complete' :
                update.status === 'error' ? `Error: ${update.summary}` : '',
              );
            } catch { /* ignore malformed lines */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStatusText(`Error: ${(err as Error).message}`);
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function handleApprove() {
    if (!run?.id) return;
    setApprovalBusy(true);
    try {
      await fetch('/api/iam/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: run.id }),
      });
    } finally {
      setApprovalBusy(false);
    }
  }

  async function handleReject() {
    if (!run?.id) return;
    setApprovalBusy(true);
    try {
      await fetch('/api/iam/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: run.id }),
      });
    } finally {
      setApprovalBusy(false);
    }
  }

  const roleBadge = user.role === 'publisher'
    ? { label: 'Publisher', bg: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: 'rgba(139,92,246,0.3)' }
    : { label: 'Agency Buyer', bg: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: 'rgba(31,111,235,0.3)' };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #21262d', background: '#161b22' }}>
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold" style={{ color: '#e6edf3' }}>Ad Manager Portal</div>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#21262d', color: '#6e7681' }}>
            Auth0 CTE Demo
          </span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(31,111,235,0.3)', color: '#58a6ff' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm leading-tight" style={{ color: '#e6edf3' }}>{user.name}</div>
              {user.company && (
                <div className="text-xs" style={{ color: '#6e7681' }}>{user.company}</div>
              )}
            </div>
          </div>

          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: roleBadge.bg, color: roleBadge.color, border: `1px solid ${roleBadge.border}` }}>
            {roleBadge.label}
          </span>

          <a href="/api/auth/logout"
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
            Logout
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 py-6 gap-5">
        {/* Prompt area */}
        <div className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'rgba(31,111,235,0.15)' }}>
              🤖
            </div>
            <div>
              <div className="font-medium text-sm" style={{ color: '#e6edf3' }}>Orchestrator Agent</div>
              <div className="text-xs" style={{ color: '#6e7681' }}>GPT-4o · structured planning · CTE token delegation</div>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun(); }}
            placeholder="Describe your ad campaign goal…"
            rows={3}
            disabled={isRunning}
            className="w-full rounded-lg p-3 text-sm resize-none outline-none transition-colors"
            style={{
              background: '#0d1117',
              border: '1px solid #30363d',
              color: '#e6edf3',
              fontFamily: 'var(--font-geist-sans), system-ui',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#1f6feb'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
          />

          {/* Example prompts */}
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            {examples.map((ex, i) => (
              <button key={i}
                onClick={() => setPrompt(ex)}
                disabled={isRunning}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
                {ex.slice(0, 60)}…
              </button>
            ))}
          </div>

          {run?.status === 'awaiting_approval' && run.pendingApproval ? (
            <div className="mt-3 p-4 rounded-xl"
              style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.3)' }}>
              <div className="flex items-start gap-3">
                <div className="text-lg flex-shrink-0">🔒</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1" style={{ color: '#f85149' }}>
                    IAM Agent: Authorization Required
                  </div>
                  <div className="text-xs mb-3" style={{ color: '#8b949e' }}>
                    Token <span className="font-mono" style={{ color: '#c9d1d9' }}>
                      &quot;{run.pendingApproval.revokedTokenLabel}&quot;
                    </span> used by <span style={{ color: '#c9d1d9' }}>{run.pendingApproval.agentName}</span> was
                    revoked. Approve re-issuance to continue the workflow.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={approvalBusy}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{ background: '#238636', color: '#fff' }}>
                      {approvalBusy ? '…' : 'Approve Re-issuance'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={approvalBusy}
                      className="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50"
                      style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRun}
                disabled={!prompt.trim() || isRunning}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: '#238636', color: '#fff' }}>
                {isRunning ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                    Running…
                  </span>
                ) : '▶ Run Workflow'}
              </button>

              {statusText && (
                <span className="text-xs" style={{ color: isRunning ? '#e3b341' : run?.status === 'error' ? '#f85149' : '#56d364' }}>
                  {statusText}
                </span>
              )}

              <span className="ml-auto text-xs" style={{ color: '#6e7681' }}>⌘ + Enter</span>
            </div>
          )}
        </div>

        {/* Summary if complete */}
        {run?.summary && run.status !== 'error' && (
          <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(35,134,54,0.1)', border: '1px solid rgba(35,134,54,0.3)', color: '#56d364' }}>
            ✓ {run.summary}
          </div>
        )}

        {/* Tabs */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-1 mb-4">
            {([
              { id: 'tokens', label: '🔑 Token Chain', count: run?.tokens.length },
              { id: 'graph', label: '🕸️ Agent Graph', count: run?.executions.length },
            ] as const).map(({ id, label, count }) => (
              <button key={id}
                onClick={() => setTab(id)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: tab === id ? '#21262d' : 'transparent',
                  color: tab === id ? '#e6edf3' : '#6e7681',
                  border: tab === id ? '1px solid #30363d' : '1px solid transparent',
                }}>
                {label}
                {count !== undefined && count > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: '#30363d', color: '#8b949e' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {tab === 'tokens' && (
              <TokenChain tokens={run?.tokens ?? []} workflowId={run?.id} />
            )}
            {tab === 'graph' && (
              <AgentGraphView run={run} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
