import type { DiagramNode } from '../../../types';
import { getNodeDimensions } from '../../../utils/nodeDimensions';

export function getNodeEdge(node: DiagramNode, direction: string) {
  const { w, h } = getNodeDimensions(node);

  if (direction === 'right') return { x: node.x + w / 2, y: node.y };
  if (direction === 'left') return { x: node.x - w / 2, y: node.y };
  if (direction === 'top') return { x: node.x, y: node.y - h / 2 };
  if (direction === 'bottom') return { x: node.x, y: node.y + h / 2 };
  return { x: node.x, y: node.y };
}

export function getEdgeSideOfPoint(x: number, y: number, node: DiagramNode): 'top' | 'bottom' | 'left' | 'right' {
  const { w, h } = getNodeDimensions(node);

  const distTop = Math.abs(y - (node.y - h / 2));
  const distBottom = Math.abs(y - (node.y + h / 2));
  const distLeft = Math.abs(x - (node.x - w / 2));
  const distRight = Math.abs(x - (node.x + w / 2));

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);
  if (minDist === distTop) return 'top';
  if (minDist === distBottom) return 'bottom';
  if (minDist === distLeft) return 'left';
  return 'right';
}

export function getConnectionEndpoints(
  nodeA: DiagramNode,
  nodeB: DiagramNode,
  fromOffset: [number, number] = [0, 0],
  toOffset: [number, number] = [0, 0]
) {
  const hasFromOffset = fromOffset[0] !== 0 || fromOffset[1] !== 0;
  const hasToOffset = toOffset[0] !== 0 || toOffset[1] !== 0;

  function getOffsetAnchor(node: DiagramNode, offset: [number, number]) {
    const { w, h } = getNodeDimensions(node);
    let x = node.x;
    let y = node.y;
    if (Math.abs(offset[0]) > Math.abs(offset[1])) {
      x = offset[0] > 0 ? node.x + w / 2 : node.x - w / 2;
    } else if (Math.abs(offset[1]) > Math.abs(offset[0])) {
      y = offset[1] > 0 ? node.y + h / 2 : node.y - h / 2;
    }
    return { x, y };
  }

  let start, end;

  if (hasFromOffset) {
    start = getOffsetAnchor(nodeA, fromOffset);
  } else {
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      start = dx > 0 ? getNodeEdge(nodeA, 'right') : getNodeEdge(nodeA, 'left');
    } else {
      start = dy > 0 ? getNodeEdge(nodeA, 'bottom') : getNodeEdge(nodeA, 'top');
    }
  }

  if (hasToOffset) {
    end = getOffsetAnchor(nodeB, toOffset);
  } else {
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      end = dx > 0 ? getNodeEdge(nodeB, 'left') : getNodeEdge(nodeB, 'right');
    } else {
      end = dy > 0 ? getNodeEdge(nodeB, 'top') : getNodeEdge(nodeB, 'bottom');
    }
  }

  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y
  };
}

export function getNodeSnapPort(
  mouseX: number,
  mouseY: number,
  node: DiagramNode,
  snapDistance: number = 30
) {
  const { w, h } = getNodeDimensions(node);

  const ports: Array<{
    portName: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    x: number;
    y: number;
    offset: [number, number];
  }> = [
    { portName: 'top', x: node.x, y: node.y - h / 2, offset: [0, -20] },
    { portName: 'bottom', x: node.x, y: node.y + h / 2, offset: [0, 20] },
    { portName: 'left', x: node.x - w / 2, y: node.y, offset: [-20, 0] },
    { portName: 'right', x: node.x + w / 2, y: node.y, offset: [20, 0] },
    { portName: 'auto', x: node.x, y: node.y, offset: [0, 0] }
  ];

  let closestPort = ports[4]; // Default to Auto
  let minDistance = Infinity;

  ports.forEach(port => {
    const dist = Math.hypot(mouseX - port.x, mouseY - port.y);
    if (dist < minDistance) {
      minDistance = dist;
      closestPort = port;
    }
  });

  if (minDistance < snapDistance) {
    return closestPort;
  }
  return null;
}
