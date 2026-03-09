import type { Tree, Node as SyntaxNode } from 'web-tree-sitter';

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

// Container node types — these get recursively expanded
const CONTAINER_TYPES = new Set([
  'function_definition',
  'function_declaration',
  'method_definition',
  'arrow_function',
  'class_definition',
  'class_declaration',
  'if_statement',
  'else_clause',
  'elif_clause',
  'for_statement',
  'for_in_statement',
  'while_statement',
  'try_statement',
  'except_clause',
  'catch_clause',
  'finally_clause',
  'with_statement',
  'switch_statement',
  'do_statement',
]);

// Flow node types — leaf-level nodes of interest
const FLOW_NODE_TYPES = new Set([
  'return_statement',
  'import_statement',
  'import_from_statement',
  'variable_declaration',
  'lexical_declaration',
  'expression_statement',
  'assignment',
  'augmented_assignment',
  'yield',
  'throw_statement',
  'raise_statement',
  'break_statement',
  'continue_statement',
  'pass_statement',
  'assert_statement',
  'delete_statement',
]);

let nodeCounter = 0;

function nextId(): string {
  return `node-${nodeCounter++}`;
}

function classifyType(nodeType: string): FlowNode['type'] {
  if (nodeType.includes('function') || nodeType === 'method_definition' || nodeType === 'arrow_function') {
    return 'function';
  }
  if (nodeType.includes('class')) {
    return 'class';
  }
  if (nodeType === 'if_statement' || nodeType === 'else_clause' || nodeType === 'elif_clause' || nodeType === 'switch_statement') {
    return 'conditional';
  }
  if (nodeType === 'for_statement' || nodeType === 'for_in_statement' || nodeType === 'while_statement' || nodeType === 'do_statement') {
    return 'loop';
  }
  if (nodeType === 'try_statement' || nodeType === 'except_clause' || nodeType === 'catch_clause' || nodeType === 'finally_clause') {
    return 'try';
  }
  if (nodeType === 'return_statement') {
    return 'return';
  }
  if (nodeType === 'import_statement' || nodeType === 'import_from_statement') {
    return 'import';
  }
  if (nodeType === 'with_statement') {
    return 'block';
  }
  return 'statement';
}

function extractLabel(node: SyntaxNode): string {
  // Try to find a name child (for functions, classes)
  const nameNode = node.childForFieldName('name');
  if (nameNode) {
    return nameNode.text;
  }

  // For conditionals, show the condition
  const conditionNode = node.childForFieldName('condition');
  if (conditionNode) {
    const condText = conditionNode.text;
    return condText.length > 40 ? condText.slice(0, 40) + '...' : condText;
  }

  // Fallback: first line of the node text
  const firstLine = node.text.split('\n')[0];
  return firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
}

function extractCode(node: SyntaxNode): string {
  const lines = node.text.split('\n');
  const preview = lines.slice(0, 10);
  if (lines.length > 10) {
    preview.push('// ...');
  }
  return preview.join('\n');
}

function extractChildren(node: SyntaxNode, parentId: string): FlowNode[] {
  const children: FlowNode[] = [];

  for (const child of node.namedChildren) {
    if (CONTAINER_TYPES.has(child.type)) {
      children.push(buildNode(child, parentId));
    } else if (FLOW_NODE_TYPES.has(child.type)) {
      children.push(buildNode(child, parentId));
    }
    // For block/body nodes, recurse into them to find the actual statements
    else if (child.type === 'block' || child.type === 'statement_block' || child.type === 'module') {
      children.push(...extractChildren(child, parentId));
    }
  }

  return children;
}

function buildNode(node: SyntaxNode, parentId: string | null): FlowNode {
  const id = nextId();
  const type = classifyType(node.type);
  const label = extractLabel(node);
  const code = extractCode(node);

  const isContainer = CONTAINER_TYPES.has(node.type);
  const children = isContainer ? extractChildren(node, id) : [];

  return {
    id,
    type,
    label,
    code,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    children,
    parentId,
  };
}

function flattenNodes(nodes: FlowNode[]): FlowNode[] {
  const result: FlowNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...flattenNodes(node.children));
    }
  }
  return result;
}

function buildEdges(nodes: FlowNode[]): FlowEdge[] {
  const edges: FlowEdge[] = [];
  let edgeCounter = 0;

  function addSequentialEdges(siblings: FlowNode[]) {
    for (let i = 0; i < siblings.length - 1; i++) {
      edges.push({
        id: `edge-${edgeCounter++}`,
        source: siblings[i].id,
        target: siblings[i + 1].id,
        type: 'sequential',
      });
    }

    // Add branch edges for conditionals
    for (const node of siblings) {
      if (node.type === 'conditional' || node.type === 'loop' || node.type === 'try') {
        if (node.children.length > 0) {
          // Edge from container to first child
          edges.push({
            id: `edge-${edgeCounter++}`,
            source: node.id,
            target: node.children[0].id,
            type: node.type === 'conditional' ? 'branch-true' : 'sequential',
          });
          // Sequential edges between children
          addSequentialEdges(node.children);
        }

        // Loop-back edge for loops
        if (node.type === 'loop' && node.children.length > 0) {
          edges.push({
            id: `edge-${edgeCounter++}`,
            source: node.children[node.children.length - 1].id,
            target: node.id,
            type: 'loop-back',
          });
        }
      } else if (node.type === 'function' || node.type === 'class' || node.type === 'block') {
        if (node.children.length > 0) {
          edges.push({
            id: `edge-${edgeCounter++}`,
            source: node.id,
            target: node.children[0].id,
            type: 'sequential',
          });
          addSequentialEdges(node.children);
        }
      }
    }
  }

  addSequentialEdges(nodes);
  return edges;
}

export function extractNodes(tree: Tree): FlowNode[] {
  const root = tree.rootNode;
  const topLevel: FlowNode[] = [];

  for (const child of root.namedChildren) {
    if (CONTAINER_TYPES.has(child.type) || FLOW_NODE_TYPES.has(child.type)) {
      topLevel.push(buildNode(child, null));
    }
  }

  return topLevel;
}

export function buildFlowGraph(tree: Tree): FlowGraph {
  // Reset counter for deterministic IDs
  nodeCounter = 0;

  const topLevelNodes = extractNodes(tree);
  const allNodes = flattenNodes(topLevelNodes);
  const edges = buildEdges(topLevelNodes);

  return {
    nodes: allNodes,
    edges,
  };
}
