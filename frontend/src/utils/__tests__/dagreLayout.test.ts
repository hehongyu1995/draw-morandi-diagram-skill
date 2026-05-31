import { describe, it, expect } from 'vitest';
import { computeAutoLayout } from '../dagreLayout';
import type { DiagramSpec } from '../../types';

// Helper to create a minimal DiagramSpec
function makeSpec(overrides?: Partial<DiagramSpec>): DiagramSpec {
  return {
    nodes: [],
    connections: [],
    ...overrides,
  } as DiagramSpec;
}

describe('computeAutoLayout', () => {
  it('skip sequence diagrams (return data unchanged when type=sequence)', () => {
    const data = makeSpec({ type: 'sequence', nodes: [{ id: 'A', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'A' }] });
    const result = computeAutoLayout(data);
    expect(result).toBe(data); // same reference
    expect(result.type).toBe('sequence');
  });

  it('2-node graph returns nodes with updated x,y (non-null, rounded)', () => {
    const data = makeSpec({
      nodes: [
        { id: 'A', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'A' },
        { id: 'B', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'B' },
      ],
      connections: [{ from: 'A', to: 'B' }],
    });
    const result = computeAutoLayout(data);
    expect(result.nodes).toHaveLength(2);
    result.nodes!.forEach((node) => {
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
      expect(Number.isInteger(node.x)).toBe(true);
      expect(Number.isInteger(node.y)).toBe(true);
    });
    // A and B should NOT both be at (0,0) after layout
    const a = result.nodes!.find((n) => n.id === 'A')!;
    const b = result.nodes!.find((n) => n.id === 'B')!;
    const bothAtOrigin = a.x === 0 && a.y === 0 && b.x === 0 && b.y === 0;
    expect(bothAtOrigin).toBe(false);
  });

  it('3-node chain: all nodes get positions, connections get points if routing=orthogonal', () => {
    const data = makeSpec({
      nodes: [
        { id: 'A', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'A' },
        { id: 'B', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'B' },
        { id: 'C', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'C' },
      ],
      connections: [
        { from: 'A', to: 'B', routing: 'orthogonal' },
        { from: 'B', to: 'C', routing: 'orthogonal' },
      ],
    });
    const result = computeAutoLayout(data);
    expect(result.nodes).toHaveLength(3);
    result.nodes!.forEach((node) => {
      expect(Number.isInteger(node.x)).toBe(true);
      expect(Number.isInteger(node.y)).toBe(true);
    });
    // Orthogonal connections should have points
    result.connections?.forEach((conn) => {
      expect(conn.points).toBeDefined();
      expect(conn.points!.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('non-orthogonal connections do not get points assigned', () => {
    const data = makeSpec({
      nodes: [
        { id: 'A', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'A' },
        { id: 'B', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'B' },
      ],
      connections: [{ from: 'A', to: 'B', routing: 'bezier' }],
    });
    const result = computeAutoLayout(data);
    expect(result.connections?.[0].points).toBeUndefined();
  });

  it('returns autoLayout: false in the result', () => {
    const data = makeSpec({
      autoLayout: true,
      nodes: [
        { id: 'A', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'A' },
        { id: 'B', type: 'capsule', theme: 'gray', x: 0, y: 0, label: 'B' },
      ],
      connections: [{ from: 'A', to: 'B' }],
    });
    const result = computeAutoLayout(data);
    expect(result.autoLayout).toBe(false);
  });
});
