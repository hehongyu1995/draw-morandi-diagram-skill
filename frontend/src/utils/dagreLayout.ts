import dagre from 'dagre';
import type { DiagramSpec } from '../types';
import { getNodeDimensions } from './nodeDimensions';

export function computeAutoLayout(data: DiagramSpec): DiagramSpec {
  // Skip for sequence diagrams or if no nodes/connections
  if (data.type === 'sequence' || !data.nodes || data.nodes.length === 0) {
    return data;
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
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

  // Run layout
  dagre.layout(g);

  // Read back computed positions
  const updatedNodes = data.nodes.map((node) => {
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

  // Read back edge routing points for orthogonal connections
  const updatedConnections = data.connections?.map((conn) => {
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
  const canvasWidth = Math.max(Math.ceil(graphLabel.width || 0) + 60, 600);
  const canvasHeight = Math.max(Math.ceil(graphLabel.height || 0) + 60, 300);

  return {
    ...data,
    nodes: updatedNodes,
    connections: updatedConnections,
    width: canvasWidth,
    height: canvasHeight,
    autoLayout: false, // Strip the flag after layout so drags don't re-trigger
  };
}
