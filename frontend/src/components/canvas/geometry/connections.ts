import type { DiagramNode } from '../../../types';
import { getNodeDimensions } from '../../../utils/nodeDimensions';

function nodeX(node: DiagramNode) {
  return node.x ?? 0;
}

function nodeY(node: DiagramNode) {
  return node.y ?? 0;
}

export function getNodeEdge(node: DiagramNode, direction: string) {
  const { w, h } = getNodeDimensions(node);
  const x = nodeX(node);
  const y = nodeY(node);

  if (direction === 'right') return { x: x + w / 2, y };
  if (direction === 'left') return { x: x - w / 2, y };
  if (direction === 'top') return { x, y: y - h / 2 };
  if (direction === 'bottom') return { x, y: y + h / 2 };
  return { x, y };
}

export function getEdgeSideOfPoint(x: number, y: number, node: DiagramNode): 'top' | 'bottom' | 'left' | 'right' {
  const { w, h } = getNodeDimensions(node);
  const nodeCenterX = nodeX(node);
  const nodeCenterY = nodeY(node);

  const distTop = Math.abs(y - (nodeCenterY - h / 2));
  const distBottom = Math.abs(y - (nodeCenterY + h / 2));
  const distLeft = Math.abs(x - (nodeCenterX - w / 2));
  const distRight = Math.abs(x - (nodeCenterX + w / 2));

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
    let x = nodeX(node);
    let y = nodeY(node);
    if (Math.abs(offset[0]) > Math.abs(offset[1])) {
      x = offset[0] > 0 ? nodeX(node) + w / 2 : nodeX(node) - w / 2;
    } else if (Math.abs(offset[1]) > Math.abs(offset[0])) {
      y = offset[1] > 0 ? nodeY(node) + h / 2 : nodeY(node) - h / 2;
    }
    return { x, y };
  }

  let start, end;

  if (hasFromOffset) {
    start = getOffsetAnchor(nodeA, fromOffset);
  } else {
    const dx = nodeX(nodeB) - nodeX(nodeA);
    const dy = nodeY(nodeB) - nodeY(nodeA);
    if (Math.abs(dx) >= Math.abs(dy)) {
      start = dx > 0 ? getNodeEdge(nodeA, 'right') : getNodeEdge(nodeA, 'left');
    } else {
      start = dy > 0 ? getNodeEdge(nodeA, 'bottom') : getNodeEdge(nodeA, 'top');
    }
  }

  if (hasToOffset) {
    end = getOffsetAnchor(nodeB, toOffset);
  } else {
    const dx = nodeX(nodeB) - nodeX(nodeA);
    const dy = nodeY(nodeB) - nodeY(nodeA);
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
  const x = nodeX(node);
  const y = nodeY(node);

  const ports: Array<{
    portName: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    x: number;
    y: number;
    offset: [number, number];
  }> = [
    { portName: 'top', x, y: y - h / 2, offset: [0, -20] },
    { portName: 'bottom', x, y: y + h / 2, offset: [0, 20] },
    { portName: 'left', x: x - w / 2, y, offset: [-20, 0] },
    { portName: 'right', x: x + w / 2, y, offset: [20, 0] },
    { portName: 'auto', x, y, offset: [0, 0] }
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
