import { describe, it, expect } from 'vitest';
import { getNodeEdge, getEdgeSideOfPoint, getConnectionEndpoints, getNodeSnapPort } from '../../components/canvas/geometry/connections';
import type { DiagramNode } from '../../types';

type PositionedNode = DiagramNode & { x: number; y: number };

function makeNode(overrides?: Partial<DiagramNode>): PositionedNode {
  return {
    id: 'test',
    type: 'capsule',
    theme: 'gray',
    x: 100,
    y: 100,
    label: 'Test',
    ...overrides,
  };
}

describe('getNodeEdge', () => {
  const node = makeNode();

  it('returns right edge coordinates', () => {
    const { w } = { w: 110 }; // capsule default
    const result = getNodeEdge(node, 'right');
    expect(result.x).toBe(node.x + w / 2); // 155
    expect(result.y).toBe(node.y);          // 100
  });

  it('returns left edge coordinates', () => {
    const { w } = { w: 110 };
    const result = getNodeEdge(node, 'left');
    expect(result.x).toBe(node.x - w / 2); // 45
    expect(result.y).toBe(node.y);          // 100
  });

  it('returns top edge coordinates', () => {
    const { h } = { h: 50 };
    const result = getNodeEdge(node, 'top');
    expect(result.x).toBe(node.x);          // 100
    expect(result.y).toBe(node.y - h / 2);  // 75
  });

  it('returns bottom edge coordinates', () => {
    const { h } = { h: 50 };
    const result = getNodeEdge(node, 'bottom');
    expect(result.x).toBe(node.x);          // 100
    expect(result.y).toBe(node.y + h / 2);  // 125
  });
});

describe('getEdgeSideOfPoint', () => {
  const node = makeNode();

  it('point near top edge returns top', () => {
    const side = getEdgeSideOfPoint(100, 76, node); // top edge is at y=75
    expect(side).toBe('top');
  });

  it('point near right edge returns right', () => {
    const side = getEdgeSideOfPoint(154, 100, node); // right edge at x=155
    expect(side).toBe('right');
  });

  it('point near bottom edge returns bottom', () => {
    const side = getEdgeSideOfPoint(100, 124, node); // bottom edge at y=125
    expect(side).toBe('bottom');
  });

  it('point near left edge returns left', () => {
    const side = getEdgeSideOfPoint(46, 100, node); // left edge at x=45
    expect(side).toBe('left');
  });
});

describe('getConnectionEndpoints', () => {
  it('nodes side by side (B is right of A) => A right edge, B left edge', () => {
    const nodeA = makeNode({ id: 'A', x: 0, y: 0, type: 'capsule' });
    const nodeB = makeNode({ id: 'B', x: 200, y: 0, type: 'capsule' });
    // capsule default: w=110, h=50
    // A right edge: x = 0 + 55 = 55
    // B left edge: x = 200 - 55 = 145
    const { x1, y1, x2, y2 } = getConnectionEndpoints(nodeA, nodeB);
    expect(x1).toBeCloseTo(55);
    expect(x2).toBeCloseTo(145);
    expect(y1).toBeCloseTo(0);
    expect(y2).toBeCloseTo(0);
  });

  it('nodes stacked (B is below A) => A bottom edge, B top edge', () => {
    const nodeA = makeNode({ id: 'A', x: 0, y: 0, type: 'capsule' });
    const nodeB = makeNode({ id: 'B', x: 0, y: 200, type: 'capsule' });
    // A bottom edge: y = 0 + 25 = 25
    // B top edge: y = 200 - 25 = 175
    const { x1, y1, x2, y2 } = getConnectionEndpoints(nodeA, nodeB);
    expect(y1).toBeCloseTo(25);
    expect(y2).toBeCloseTo(175);
    expect(x1).toBeCloseTo(0);
    expect(x2).toBeCloseTo(0);
  });

  it('with explicit fromOffset [20, 0] => snaps to right edge', () => {
    const nodeA = makeNode({ id: 'A', x: 0, y: 0, type: 'capsule' });
    const nodeB = makeNode({ id: 'B', x: 200, y: 0, type: 'capsule' });
    // fromOffset [20,0]: |20| > |0|, 20 > 0 => right edge: x = 0 + 55 = 55
    const { x1, y1 } = getConnectionEndpoints(nodeA, nodeB, [20, 0]);
    expect(x1).toBeCloseTo(55);
    expect(y1).toBeCloseTo(0);
  });
});

describe('getNodeSnapPort', () => {
  const node = makeNode({ x: 100, y: 100 });

  it('point near top snap port returns top port', () => {
    // top port at (100, 100 - 25) = (100, 75)
    const port = getNodeSnapPort(100, 78, node, 30);
    expect(port).not.toBeNull();
    expect(port!.portName).toBe('top');
  });

  it('point far from all ports returns null', () => {
    // 200, 200 is ~141px away from center → too far for 30px snap distance
    const port = getNodeSnapPort(200, 200, node, 30);
    expect(port).toBeNull();
  });
});
