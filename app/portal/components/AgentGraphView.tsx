'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WorkflowRun, AgentExecution } from '@/lib/types';

const NODE_STYLES: Record<string, { bg: string; border: string; color: string; emoji: string }> = {
  user: { bg: '#0d1117', border: '#30363d', color: '#8b949e', emoji: '👤' },
  orchestrator: { bg: 'rgba(31,111,235,0.15)', border: '#1f6feb', color: '#58a6ff', emoji: '🎯' },
  'iam-agent': { bg: 'rgba(227,179,65,0.12)', border: '#e3b341', color: '#e3b341', emoji: '🔑' },
  'buyer-agent': { bg: 'rgba(35,134,54,0.15)', border: '#238636', color: '#56d364', emoji: '🏢' },
  'publisher-agent': { bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', color: '#c4b5fd', emoji: '📺' },
  api: { bg: '#161b22', border: '#30363d', color: '#6e7681', emoji: '⚡' },
};

function AgentNode({ data }: { data: { label: string; type: string; status?: string; note?: string } }) {
  const style = NODE_STYLES[data.type] ?? NODE_STYLES.api;
  const statusColor = data.status === 'complete' ? '#56d364' :
    data.status === 'running' ? '#e3b341' :
    data.status === 'error' ? '#f85149' : '#6e7681';

  return (
    <div className="px-4 py-3 rounded-xl text-sm min-w-[140px]"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        fontFamily: 'var(--font-geist-sans), system-ui',
      }}>
      <div className="flex items-center gap-2">
        <span className="text-base">{style.emoji}</span>
        <div>
          <div className="font-medium leading-tight">{data.label}</div>
          {data.note && <div className="text-xs opacity-70 mt-0.5">{data.note}</div>}
        </div>
        {data.status && (
          <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
        )}
      </div>
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

function buildGraph(run: WorkflowRun): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let y = 0;

  // User node
  nodes.push({
    id: 'user',
    type: 'agentNode',
    position: { x: 250, y },
    data: { label: 'User', type: 'user', note: run.userRole },
  });
  y += 100;

  // Orchestrator
  const orchExec = run.executions.find((e) => e.agentType === 'orchestrator');
  nodes.push({
    id: 'orchestrator',
    type: 'agentNode',
    position: { x: 250, y },
    data: {
      label: 'Orchestrator',
      type: 'orchestrator',
      status: orchExec?.status,
      note: run.tasks.length ? `${run.tasks.length} tasks planned` : undefined,
    },
  });
  edges.push({
    id: 'user-orch',
    source: 'user',
    target: 'orchestrator',
    label: 'prompt',
    style: { stroke: '#30363d' },
    labelStyle: { fill: '#8b949e', fontSize: 11 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#30363d' },
  });
  y += 100;

  // IAM Agent
  const iamExecs = run.executions.filter((e) => e.agentType === 'iam-agent');
  const iamStatus = iamExecs.length > 0
    ? (iamExecs.every((e) => e.status === 'complete') ? 'complete' : 'running')
    : undefined;

  nodes.push({
    id: 'iam-agent',
    type: 'agentNode',
    position: { x: 250, y },
    data: {
      label: 'IAM Agent',
      type: 'iam-agent',
      status: iamStatus,
      note: iamExecs.length > 0 ? `${iamExecs.length} CTE(s) performed` : 'awaiting tasks',
    },
  });
  edges.push({
    id: 'orch-iam',
    source: 'orchestrator',
    target: 'iam-agent',
    label: 'delegate',
    style: { stroke: '#30363d' },
    labelStyle: { fill: '#8b949e', fontSize: 11 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#30363d' },
  });
  y += 100;

  // Specialized agents (unique by agent type)
  const agentTypes = [...new Set(run.tasks.map((t) => t.agent))];
  const agentX: Record<string, number> = {};
  const startX = 250 - ((agentTypes.length - 1) * 200) / 2;
  agentTypes.forEach((ag, i) => {
    agentX[ag] = startX + i * 200;
  });

  agentTypes.forEach((agent) => {
    const agExecs = run.executions.filter((e) => e.agentType === agent);
    const agStatus = agExecs.length > 0
      ? (agExecs.every((e) => e.status === 'complete') ? 'complete' :
        agExecs.some((e) => e.status === 'running') ? 'running' : 'pending')
      : undefined;
    const tasks = run.tasks.filter((t) => t.agent === agent);

    nodes.push({
      id: agent,
      type: 'agentNode',
      position: { x: agentX[agent], y },
      data: {
        label: agent === 'buyer-agent' ? 'Buyer Agent' : 'Publisher Agent',
        type: agent,
        status: agStatus,
        note: tasks.length > 0 ? `${tasks.length} task(s)` : undefined,
      },
    });
    edges.push({
      id: `iam-${agent}`,
      source: 'iam-agent',
      target: agent,
      label: 'scoped token',
      style: { stroke: '#e3b341', strokeDasharray: '5,3' },
      labelStyle: { fill: '#e3b341', fontSize: 10 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e3b341' },
    });
  });
  y += 100;

  // API nodes
  const apis = [...new Set(run.tasks.map((t) => t.api))];
  const apiX: Record<string, number> = {};
  const apiStartX = 250 - ((apis.length - 1) * 180) / 2;
  apis.forEach((api, i) => { apiX[api] = apiStartX + i * 180; });

  apis.forEach((api) => {
    const apiTasks = run.tasks.filter((t) => t.api === api);
    const complete = apiTasks.filter((t) => t.status === 'complete').length;
    nodes.push({
      id: `api-${api}`,
      type: 'agentNode',
      position: { x: apiX[api], y },
      data: {
        label: `${api.charAt(0).toUpperCase() + api.slice(1)} API`,
        type: 'api',
        note: complete > 0 ? `${complete}/${apiTasks.length} calls` : undefined,
      },
    });
  });

  // Agent → API edges
  run.tasks.forEach((task) => {
    const agent = task.agent;
    const apiId = `api-${task.api}`;
    const edgeId = `${agent}-${apiId}-${task.taskId}`;
    if (!edges.find((e) => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: agent,
        target: apiId,
        label: task.scope,
        style: { stroke: task.status === 'complete' ? '#56d364' : '#30363d', strokeOpacity: 0.7 },
        labelStyle: { fill: '#6e7681', fontSize: 9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: task.status === 'complete' ? '#56d364' : '#30363d' },
      });
    }
  });

  return { nodes, edges };
}

export default function AgentGraphView({ run }: { run: WorkflowRun | null }) {
  const { nodes, edges } = useMemo(() => {
    if (!run) return { nodes: [], edges: [] };
    return buildGraph(run);
  }, [run]);

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: '#6e7681' }}>
        <div className="text-4xl mb-3">🕸️</div>
        <p className="text-sm">Run a workflow to see the agent graph</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Narrative banner */}
      <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(227,179,65,0.08)', border: '1px solid rgba(227,179,65,0.2)', color: '#8b949e' }}>
        <span style={{ color: '#e3b341' }}>⚠ Note:</span>{' '}
        Agent orchestration and handoff is handled in <strong style={{ color: '#c9d1d9' }}>application code</strong> — not Auth0.
        {' '}Auth0 CTE only handles token delegation. OBO is not used — it is not a standard grant type.
      </div>

      {/* Plan info */}
      <div className="flex gap-4 text-xs font-mono" style={{ color: '#6e7681' }}>
        <span>planId: <span style={{ color: '#58a6ff' }}>{run.planId}</span></span>
        <span>·</span>
        <span>hash: <span style={{ color: '#c9d1d9' }}>{run.promptHash.slice(0, 12)}…</span></span>
      </div>

      {/* React Flow */}
      <div className="rounded-xl overflow-hidden" style={{ height: 480, border: '1px solid #30363d', background: '#161b22' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}>
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#21262d" />
          <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
        </ReactFlow>
      </div>

      {/* Execution log */}
      {run.executions.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: '#8b949e' }}>Execution Log</div>
          <div className="space-y-1">
            {run.executions.map((exec) => (
              <div key={exec.id} className="flex items-start gap-3 text-xs p-2 rounded"
                style={{ background: '#161b22', border: '1px solid #21262d' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{
                    background: exec.status === 'complete' ? '#56d364' :
                      exec.status === 'running' ? '#e3b341' :
                      exec.status === 'error' ? '#f85149' : '#6e7681',
                  }} />
                <div className="flex-1">
                  <span style={{ color: '#c9d1d9' }}>{exec.agentName}</span>
                  {exec.toolCalled && <span style={{ color: '#6e7681' }}> → {exec.toolCalled}</span>}
                  {exec.apiCalled && <span style={{ color: '#6e7681' }}> [{exec.apiCalled}]</span>}
                  {exec.notes && <div style={{ color: '#6e7681' }}>{exec.notes}</div>}
                </div>
                <div style={{ color: '#6e7681' }}>
                  {new Date(exec.startedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
