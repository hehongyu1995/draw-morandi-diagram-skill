import { describe, expect, it } from 'vitest';
import type { DiagramSpec, LayoutOverrides } from './types';

describe('diagram types', () => {
  it('allows auto-layout source nodes without coordinates', () => {
    const spec: DiagramSpec = {
      autoLayout: true,
      nodes: [
        { id: 'A', type: 'capsule', theme: 'gray', label: 'A' },
        { id: 'B', type: 'capsule', theme: 'gray', label: 'B' },
      ],
      connections: [{ from: 'A', to: 'B' }],
    };

    expect(spec.nodes?.[0].x).toBeUndefined();
    expect(spec.nodes?.[0].y).toBeUndefined();
  });

  it('allows layout node overrides on the source spec', () => {
    const spec: DiagramSpec = {
      autoLayout: true,
      layout: {
        overrides: {
          nodes: {
            B: { x: 320, y: 180 },
          },
        },
      },
      nodes: [{ id: 'B', type: 'capsule', theme: 'gray', label: 'B' }],
    };

    expect(spec.layout?.overrides?.nodes?.B).toEqual({ x: 320, y: 180 });
  });

  it('accepts partial layout override maps', () => {
    const overrides: LayoutOverrides = {
      nodes: {
        A: { x: 10, y: 20 },
      },
    };

    expect(overrides.nodes?.A.x).toBe(10);
  });
});
