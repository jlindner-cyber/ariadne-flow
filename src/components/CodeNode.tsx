import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { LintIssue } from '../types';

const TYPE_COLORS: Record<string, string> = {
  function: '#3b82f6',
  class: '#8b5cf6',
  conditional: '#f59e0b',
  loop: '#10b981',
  try: '#ef4444',
  return: '#6366f1',
  import: '#6b7280',
  statement: '#94a3b8',
  block: '#475569',
};

export interface CodeNodeData {
  label: string;
  code: string;
  nodeType: string;
  startLine: number;
  endLine: number;
  hasChildren: boolean;
  expanded: boolean;
  lintIssues: LintIssue[];
  onToggleExpand: (nodeId: string) => void;
  [key: string]: unknown;
}

interface CodeNodeProps {
  id: string;
  data: CodeNodeData;
}

const CodeNode = React.memo(function CodeNode({ id, data }: CodeNodeProps) {
  const {
    label,
    code,
    nodeType,
    startLine,
    endLine,
    hasChildren,
    expanded,
    lintIssues,
    onToggleExpand,
  } = data;

  const color = TYPE_COLORS[nodeType] ?? '#94a3b8';
  const errorCount = lintIssues.filter((i) => i.severity === 'error').length;
  const warningCount = lintIssues.filter((i) => i.severity === 'warning').length;

  return (
    <div
      style={{
        background: '#1e1e2e',
        border: `1px solid ${color}44`,
        borderRadius: 8,
        padding: 10,
        minWidth: 220,
        maxWidth: 360,
        color: '#cdd6f4',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            background: color,
            color: '#fff',
            borderRadius: 4,
            padding: '1px 6px',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {nodeType}
        </span>
        <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ color: '#7f849c', fontSize: 10 }}>
          L{startLine}-{endLine}
        </span>
        {errorCount > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {errorCount}
          </span>
        )}
        {warningCount > 0 && (
          <span
            style={{
              background: '#f97316',
              color: '#fff',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {warningCount}
          </span>
        )}
      </div>

      {/* Code preview */}
      <pre
        style={{
          background: '#11111b',
          borderRadius: 4,
          padding: 6,
          margin: 0,
          maxHeight: 120,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontSize: 11,
          lineHeight: 1.4,
          color: '#a6adc8',
        }}
      >
        {code}
      </pre>

      {/* Expand/Collapse */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(id);
          }}
          style={{
            marginTop: 6,
            background: '#313244',
            border: 'none',
            borderRadius: 4,
            color: '#cdd6f4',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          {expanded ? '▾ Collapse' : '▸ Expand'}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
});

export default CodeNode;
