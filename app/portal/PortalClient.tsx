'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import TokenSidebar from './components/TokenSidebar';
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
  const [prompt, setPrompt] = useState('');
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('');
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
                update.status === 'executing'
                  ? `Executing ${update.tasks.filter((t) => t.status === 'complete').length}/${update.tasks.length} tasks…`
                : update.status === 'complete' ? 'Complete'
                : update.status === 'error' ? `Error: ${update.summary}` : '',
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

  const roleBadge =
    user.role === 'publisher'
      ? { label: 'Publisher', bg: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: 'rgba(139,92,246,0.3)' }
      : { label: 'Agency Buyer', bg: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: 'rgba(31,111,235,0.3)' };

  const tokenCount = run?.tokens.length ?? 0;

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0d1117' }}>

      {/* Header */}
      <header
        className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #21262d', background: '#161b22' }}>
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold" style={{ color: '#e6edf3' }}>Ad Manager Portal</div>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#21262d', color: '#6e7681' }}>
            Auth0 CTE Demo
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(31,111,235,0.3)', color: '#58a6ff' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm leading-tight" style={{ color: '#e6edf3' }}>{user.name}</div>
              {user.company && <div className="text-xs" style={{ color: '#6e7681' }}>{user.company}</div>}
            </div>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: roleBadge.bg, color: roleBadge.color, border: `1px solid ${roleBadge.border}` }}>
            {roleBadge.label}
          </span>
          <a
            href="/api/auth/logout"
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
            Logout
          </a>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: workflow area ── */}
        <div className="flex-1 flex flex-col gap-5 px-6 py-6 overflow-y-auto min-w-0">

          {/* Prompt card */}
          <div className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
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

            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  disabled={isRunning}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
                  {ex.slice(0, 60)}…
                </button>
              ))}
            </div>

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
                <span
                  className="text-xs"
                  style={{ color: isRunning ? '#e3b341' : run?.status === 'error' ? '#f85149' : '#56d364' }}>
                  {statusText}
                </span>
              )}

              <span className="ml-auto text-xs" style={{ color: '#6e7681' }}>⌘ + Enter</span>
            </div>
          </div>

          {/* Summary */}
          {run?.summary && run.status !== 'error' && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(35,134,54,0.1)', border: '1px solid rgba(35,134,54,0.3)', color: '#56d364' }}>
              ✓ {run.summary}
            </div>
          )}

          {/* Agent Graph */}
          {run && (
            <div
              className="flex-1 rounded-xl overflow-hidden"
              style={{ background: '#161b22', border: '1px solid #30363d', minHeight: '300px' }}>
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{ borderBottom: '1px solid #21262d' }}>
                <span className="text-sm font-medium" style={{ color: '#e6edf3' }}>Agent Graph</span>
                {run.executions.length > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: '#30363d', color: '#8b949e' }}>
                    {run.executions.length}
                  </span>
                )}
              </div>
              <AgentGraphView run={run} />
            </div>
          )}
        </div>

        {/* ── Right: token sidebar ── */}
        <div
          className="w-80 flex-shrink-0 flex flex-col"
          style={{ borderLeft: '1px solid #21262d' }}>

          {/* Sidebar header */}
          <div
            className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
            style={{ borderBottom: '1px solid #21262d', background: '#161b22' }}>
            <span className="text-sm font-medium" style={{ color: '#e6edf3' }}>Token Chain</span>
            {tokenCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: '#30363d', color: '#8b949e' }}>
                {tokenCount}
              </span>
            )}
            {tokenCount > 0 && (
              <span
                className="ml-auto text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(35,134,54,0.1)', color: '#56d364', border: '1px solid rgba(35,134,54,0.25)' }}>
                live
              </span>
            )}
          </div>

          {/* Sidebar body — independently scrollable */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <TokenSidebar tokens={run?.tokens ?? []} />
          </div>
        </div>

      </div>
    </div>
  );
}
