import dagre from 'dagre';
import type { DiagramSpec } from '../types';
import { applyConstraintHints, normalizeConstrainedPositions } from './applyLayoutConstraints';
import { getNodeDimensions } from './nodeDimensions';

export function computeAutoLayout(data: DiagramSpec): DiagramSpec {
  // Skip for sequence diagrams or if no nodes/connections
  if (data.type === 'sequence' || !data.nodes || data.nodes.length === 0) {
    return data;
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: data.layout?.direction || 'LR',
    nodesep: data.layout?.nodesep ?? 60,
    ranksep: data.layout?.ranksep ?? 80,
    marginx: data.layout?.marginx ?? 40,
    marginy: data.layout?.marginy ?? 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes with dimensions so dagre can space them properly
  data.nodes.forEach((node) => {
    const { w, h } = getNodeDimensions(node);
    g.setNode(node.id, { width: w, height: h, label: node.label });
  });

  // Add edges
  data.connections?.forEach((conn) => {
    g.setEdge(conn.from, conn.to, { label: conn.label || '' });
  });

  const constraintPlan = applyConstraintHints(data, g);

  // Run layout
  dagre.layout(g);

  // Read back computed positions
  const dagreNodes = data.nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (dagreNode) {
      return {
        ...node,
        x: Math.round(dagreNode.x),
        y: Math.round(dagreNode.y),
      };
    }
    return node;
  });
  const updatedNodes = normalizeConstrainedPositions(dagreNodes, constraintPlan);

  // Read back edge routing points for orthogonal connections
  const updatedConnections = data.connections?.map((conn) => {
    if (constraintPlan.hasConstraints && conn.routing === 'orthogonal') {
      const { points: _points, ...rest } = conn;
      return rest;
    }

    if (conn.routing === 'orthogonal') {
      const edge = g.edge(conn.from, conn.to);
      if (edge && edge.points && edge.points.length >= 2) {
        return {
          ...conn,
          points: edge.points.map((p: { x: number; y: number }) => ({
            x: Math.round(p.x),
            y: Math.round(p.y),
          })),
        };
      }
    }
    return conn;
  });

  // Auto-size canvas
  const graphLabel = g.graph();
  const nodeBounds = updatedNodes.reduce(
    (acc, node) => {
      const { w, h } = getNodeDimensions(node);
      return {
        maxX: Math.max(acc.maxX, node.x + w / 2),
        maxY: Math.max(acc.maxY, node.y + h / 2),
      };
    },
    { maxX: 0, maxY: 0 }
  );
  const canvasWidth = constraintPlan.hasConstraints
    ? Math.max(Math.ceil(nodeBounds.maxX) + 60, 600)
    : Math.max(Math.ceil(graphLabel.width || 0) + 60, 600);
  const canvasHeight = constraintPlan.hasConstraints
    ? Math.max(Math.ceil(nodeBounds.maxY) + 60, 300)
    : Math.max(Math.ceil(graphLabel.height || 0) + 60, 300);

  return {
    ...data,
    nodes: updatedNodes,
    connections: updatedConnections,
    width: canvasWidth,
    height: canvasHeight,
    autoLayout: false, // Strip the flag after layout so drags don't re-trigger
  };
}
