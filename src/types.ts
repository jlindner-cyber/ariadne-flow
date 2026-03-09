export interface FlowNode {
  id: string;
  type: 'function' | 'class' | 'conditional' | 'loop' | 'try' | 'return' | 'import' | 'statement' | 'block';
  label: string;
  code: string;
  startLine: number;
  endLine: number;
  children: FlowNode[];
  parentId: string | null;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: 'sequential' | 'branch-true' | 'branch-false' | 'loop-back';
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface LintIssue {
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  rule: string;
}
