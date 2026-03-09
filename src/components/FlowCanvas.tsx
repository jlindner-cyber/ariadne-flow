import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import type { Node, Edge, NodeMouseHandler } from '@xyflow/react';
import CodeNode from './CodeNode';
import type { CodeNodeData } from './CodeNode';
import type { FlowGraph, FlowNode, LintIssue } from '../types';

const nodeTypes = { codeNode: CodeNode };

interface FlowCanvasProps {
  graph: FlowGraph | null;
  lintIssues: LintIssue[];
  onNodeSelect: (node: FlowNode) => void;
}

function getVisibleNodes(
  allNodes: FlowNode[],
  expandedIds: Set<string>,
): FlowNode[] {
  const visible: FlowNode[] = [];
  function walk(nodes: FlowNode[]) {
    for (const node of nodes) {
      visible.push(node);
      if (expandedIds.has(node.id) && node.children.length > 0) {
        walk(node.children);
      }
    }
  }
  // Start from top-level nodes
  const topLevel = allNodes.filter((n) => n.parentId === null);
  walk(topLevel);
  return visible;
}

function layoutNodes(
  visibleNodes: FlowNode[],
  expandedIds: Set<string>,
  lintIssues: LintIssue[],
  onToggleExpand: (id: string) => void,
): Node[] {
  const result: Node[] = [];
  let yOffset = 0;

  function place(nodes: FlowNode[], xBase: number) {
    for (const node of nodes) {
      const nodeLintIssues = lintIssues.filter(
        (i) => i.line >= node.startLine && i.line <= node.endLine,
      );

      const rfNode: Node = {
        id: node.id,
        type: 'codeNode',
        position: { x: xBase, y: yOffset },
        data: {
          label: node.label,
          code: node.code,
          nodeType: node.type,
          startLine: node.startLine,
          endLine: node.endLine,
          hasChildren: node.children.length > 0,
          expanded: expandedIds.has(node.id),
          lintIssues: nodeLintIssues,
          onToggleExpand,
        } satisfies CodeNodeData,
      };
      result.push(rfNode);
      yOffset += 200;

      if (expandedIds.has(node.id) && node.children.length > 0) {
        place(node.children, xBase + 300);
      }
    }
  }

  const topLevel = visibleNodes.filter((n) => n.parentId === null);
  place(topLevel, 0);
  return result;
}

export default function FlowCanvas({ graph, lintIssues, onNodeSelect }: FlowCanvasProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Build a lookup of all nodes (flat) for click handling
  const nodeMap = useMemo(() => {
    if (!graph) return new Map<string, FlowNode>();
    const map = new Map<string, FlowNode>();
    function walk(nodes: FlowNode[]) {
      for (const n of nodes) {
        map.set(n.id, n);
        if (n.children.length > 0) walk(n.children);
      }
    }
    walk(graph.nodes);
    return map;
  }, [graph]);

  useEffect(() => {
    if (!graph) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const visibleNodes = getVisibleNodes(graph.nodes, expandedIds);
    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    const rfNodes = layoutNodes(visibleNodes, expandedIds, lintIssues, onToggleExpand);

    const rfEdges: Edge[] = graph.edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.type === 'loop-back',
        style: { stroke: '#585b70' },
      }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [graph, expandedIds, lintIssues, onToggleExpand, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const flowNode = nodeMap.get(node.id);
      if (flowNode) onNodeSelect(flowNode);
    },
    [nodeMap, onNodeSelect],
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#11111b' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        colorMode="dark"
      >
        <Controls />
        <MiniMap
          style={{ background: '#1e1e2e' }}
          nodeColor="#585b70"
        />
        <Background variant={BackgroundVariant.Dots} color="#313244" gap={20} />
      </ReactFlow>
    </div>
  );
}
