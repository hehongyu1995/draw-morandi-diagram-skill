import dagre from 'dagre';
import type { DiagramNode, DiagramSpec, LayoutConstraint } from '../types';
import { getNodeDimensions } from './nodeDimensions';

type Graph = dagre.graphlib.Graph;
type RelativeConstraintType = 'leftOf' | 'rightOf' | 'above' | 'below';

export interface RelativeConstraintPlan {
  type: RelativeConstraintType;
  nodeId: string;
  refNodeId: string;
}

export interface ConstraintPlan {
  graphOptions: {
    rankdir: 'LR' | 'TB';
    nodesep: number;
    ranksep: number;
    marginx: number;
    marginy: number;
  };
  relative: RelativeConstraintPlan[];
  warnings: string[];
  hasConstraints: boolean;
}

const DEFAULT_GRAPH_OPTIONS = {
  rankdir: 'LR' as const,
  nodesep: 60,
  ranksep: 80,
  marginx: 40,
  marginy: 40,
};

function warn(plan: ConstraintPlan, message: string) {
  plan.warnings.push(message);
  console.warn(message);
}

function readGraphOptions(graph: Graph): ConstraintPlan['graphOptions'] {
  const current = graph.graph() || {};
  return {
    rankdir: current.rankdir === 'TB' ? 'TB' : 'LR',
    nodesep: typeof current.nodesep === 'number' ? current.nodesep : DEFAULT_GRAPH_OPTIONS.nodesep,
    ranksep: typeof current.ranksep === 'number' ? current.ranksep : DEFAULT_GRAPH_OPTIONS.ranksep,
    marginx: typeof current.marginx === 'number' ? current.marginx : DEFAULT_GRAPH_OPTIONS.marginx,
    marginy: typeof current.marginy === 'number' ? current.marginy : DEFAULT_GRAPH_OPTIONS.marginy,
  };
}

function hasPath(graph: Graph, from: string, to: string): boolean {
  const visited = new Set<string>();
  const stack = [from];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === to) return true;
    if (visited.has(id)) continue;
    visited.add(id);

    const successors = graph.successors(id) || [];
    successors.forEach((successor) => {
      if (!visited.has(successor)) stack.push(successor);
    });
  }

  return false;
}

function tryAddOrderingEdge(graph: Graph, plan: ConstraintPlan, from: string, to: string): boolean {
  if (from === to) {
    warn(plan, `Ignored self-referencing layout constraint: ${from}`);
    return false;
  }

  if (hasPath(graph, to, from)) {
    warn(plan, `Dropped cyclic layout constraint: ${from} -> ${to}`);
    return false;
  }

  const existing = graph.edge(from, to);
  graph.setEdge(from, to, {
    ...(existing || {}),
    weight: Math.max(typeof existing?.weight === 'number' ? existing.weight : 1, 2),
    minlen: Math.max(typeof existing?.minlen === 'number' ? existing.minlen : 1, 1),
    constraint: true,
    invisible: !existing,
  });
  return true;
}

function validateRelativeConstraint(
  graph: Graph,
  plan: ConstraintPlan,
  constraint: Extract<LayoutConstraint, { nodeId: string; refNodeId: string }>
): boolean {
  if (constraint.nodeId === constraint.refNodeId) {
    warn(plan, `Ignored self-referencing layout constraint: ${constraint.type}(${constraint.nodeId})`);
    return false;
  }

  if (!graph.hasNode(constraint.nodeId)) {
    warn(plan, `Ignored layout constraint with missing node: ${constraint.nodeId}`);
    return false;
  }

  if (!graph.hasNode(constraint.refNodeId)) {
    warn(plan, `Ignored layout constraint with missing node: ${constraint.refNodeId}`);
    return false;
  }

  return true;
}

export function applyConstraintHints(spec: DiagramSpec, graph: Graph): ConstraintPlan {
  const plan: ConstraintPlan = {
    graphOptions: readGraphOptions(graph),
    relative: [],
    warnings: [],
    hasConstraints: Boolean(spec.layout?.constraints?.length),
  };

  const constraints = spec.layout?.constraints || [];

  constraints.forEach((constraint) => {
    if (constraint.type === 'inline') {
      const validChain = constraint.chain.filter((nodeId) => {
        if (graph.hasNode(nodeId)) return true;
        warn(plan, `Ignored missing node in inline layout constraint: ${nodeId}`);
        return false;
      });

      if (validChain.length < 2) return;

      for (let i = 0; i < validChain.length - 1; i += 1) {
        tryAddOrderingEdge(graph, plan, validChain[i], validChain[i + 1]);
      }
      return;
    }

    if (!validateRelativeConstraint(graph, plan, constraint)) return;

    plan.relative.push({
      type: constraint.type,
      nodeId: constraint.nodeId,
      refNodeId: constraint.refNodeId,
    });

    if (constraint.type === 'leftOf') {
      tryAddOrderingEdge(graph, plan, constraint.nodeId, constraint.refNodeId);
    } else if (constraint.type === 'rightOf') {
      tryAddOrderingEdge(graph, plan, constraint.refNodeId, constraint.nodeId);
    }
  });

  return plan;
}

function shiftIntoPositiveBounds(nodes: DiagramNode[], plan: ConstraintPlan): DiagramNode[] {
  if (nodes.length === 0) return nodes;

  const bounds = nodes.reduce(
    (acc, node) => {
      const { w, h } = getNodeDimensions(node);
      return {
        minX: Math.min(acc.minX, node.x - w / 2),
        minY: Math.min(acc.minY, node.y - h / 2),
      };
    },
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY }
  );

  const dx = Math.max(0, plan.graphOptions.marginx - bounds.minX);
  const dy = Math.max(0, plan.graphOptions.marginy - bounds.minY);

  if (dx === 0 && dy === 0) return nodes;
  return nodes.map((node) => ({
    ...node,
    x: Math.round(node.x + dx),
    y: Math.round(node.y + dy),
  }));
}

export function normalizeConstrainedPositions(nodes: DiagramNode[], plan: ConstraintPlan): DiagramNode[] {
  if (!plan.hasConstraints) return nodes;

  const byId = new Map(nodes.map((node) => [node.id, { ...node }]));
  const horizontalGap = plan.graphOptions.ranksep;
  const verticalGap = plan.graphOptions.ranksep;

  plan.relative.forEach((constraint) => {
    const node = byId.get(constraint.nodeId);
    const refNode = byId.get(constraint.refNodeId);
    if (!node || !refNode) return;

    if (constraint.type === 'above') {
      node.x = refNode.x;
      if (node.y >= refNode.y) node.y = refNode.y - verticalGap;
    } else if (constraint.type === 'below') {
      node.x = refNode.x;
      if (node.y <= refNode.y) node.y = refNode.y + verticalGap;
    } else if (constraint.type === 'leftOf') {
      node.y = refNode.y;
      if (node.x >= refNode.x) node.x = refNode.x - horizontalGap;
    } else if (constraint.type === 'rightOf') {
      node.y = refNode.y;
      if (node.x <= refNode.x) node.x = refNode.x + horizontalGap;
    }
  });

  const normalized = nodes.map((node) => {
    const updated = byId.get(node.id) || node;
    return {
      ...updated,
      x: Math.round(updated.x),
      y: Math.round(updated.y),
    };
  });

  return shiftIntoPositiveBounds(normalized, plan);
}
