import dagre from 'dagre';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { DiagramNode, DiagramSpec } from '../../types';
import { applyConstraintHints, normalizeConstrainedPositions } from '../applyLayoutConstraints';
import { computeAutoLayout } from '../dagreLayout';

function makeGraph(nodes: string[], edges: Array<[string, string]> = []) {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((id) => graph.setNode(id, { width: 80, height: 40, label: id }));
  edges.forEach(([from, to]) => graph.setEdge(from, to, { label: '' }));

  return graph;
}

function makeNode(id: string, x: number, y: number): DiagramNode {
  return { id, type: 'rect', theme: 'gray', x, y, label: id };
}

function byId(nodes: DiagramNode[], id: string) {
  return nodes.find((node) => node.id === id)!;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('applyLayoutConstraints', () => {
  it('keeps dagre default behavior when no constraints are present', () => {
    const base: DiagramSpec = {
      nodes: [makeNode('A', 0, 0), makeNode('B', 0, 0)],
      connections: [{ from: 'A', to: 'B' }],
    };
    const withEmptyLayout: DiagramSpec = {
      ...base,
      layout: { constraints: [] },
    };

    const baseResult = computeAutoLayout(base);
    const layoutResult = computeAutoLayout(withEmptyLayout);

    expect(layoutResult.nodes).toEqual(baseResult.nodes);
    expect(layoutResult.connections).toEqual(baseResult.connections);
    expect(layoutResult.width).toBe(baseResult.width);
    expect(layoutResult.height).toBe(baseResult.height);
  });

  it('adds invisible ordering edges for an inline chain', () => {
    const graph = makeGraph(['A', 'B', 'C']);
    const plan = applyConstraintHints(
      { nodes: [], layout: { constraints: [{ type: 'inline', chain: ['A', 'B', 'C'] }] } },
      graph
    );

    expect(plan.warnings).toEqual([]);
    expect(graph.hasEdge('A', 'B')).toBe(true);
    expect(graph.hasEdge('B', 'C')).toBe(true);
    expect(graph.edge('A', 'B').invisible).toBe(true);
  });

  it('applies rightOf as B -> A ordering and row normalization', () => {
    const graph = makeGraph(['A', 'B']);
    const plan = applyConstraintHints(
      { nodes: [], layout: { constraints: [{ type: 'rightOf', nodeId: 'A', refNodeId: 'B' }] } },
      graph
    );

    expect(graph.hasEdge('B', 'A')).toBe(true);

    const nodes = normalizeConstrainedPositions([makeNode('A', 10, 10), makeNode('B', 100, 80)], plan);
    expect(byId(nodes, 'A').x).toBeGreaterThan(byId(nodes, 'B').x);
    expect(byId(nodes, 'A').y).toBe(byId(nodes, 'B').y);
  });

  it('normalizes above and below constraints on the y axis', () => {
    const graph = makeGraph(['A', 'B', 'C']);
    const plan = applyConstraintHints(
      {
        nodes: [],
        layout: {
          constraints: [
            { type: 'above', nodeId: 'A', refNodeId: 'B' },
            { type: 'below', nodeId: 'C', refNodeId: 'B' },
          ],
        },
      },
      graph
    );

    const nodes = normalizeConstrainedPositions(
      [makeNode('A', 120, 100), makeNode('B', 200, 100), makeNode('C', 80, 100)],
      plan
    );

    expect(byId(nodes, 'A').y).toBeLessThan(byId(nodes, 'B').y);
    expect(byId(nodes, 'C').y).toBeGreaterThan(byId(nodes, 'B').y);
    expect(byId(nodes, 'A').x).toBe(byId(nodes, 'B').x);
    expect(byId(nodes, 'C').x).toBe(byId(nodes, 'B').x);
  });

  it('warns and skips constraints that reference missing node ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const graph = makeGraph(['A']);
    const plan = applyConstraintHints(
      { nodes: [], layout: { constraints: [{ type: 'leftOf', nodeId: 'A', refNodeId: 'missing' }] } },
      graph
    );

    expect(plan.warnings).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing'));
    expect(graph.edgeCount()).toBe(0);
  });

  it('warns and drops ordering constraints that would create a cycle', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const graph = makeGraph(['A', 'B'], [['A', 'B']]);
    const plan = applyConstraintHints(
      { nodes: [], layout: { constraints: [{ type: 'leftOf', nodeId: 'B', refNodeId: 'A' }] } },
      graph
    );

    expect(plan.warnings).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cyclic'));
    expect(graph.hasEdge('B', 'A')).toBe(false);
  });
});
