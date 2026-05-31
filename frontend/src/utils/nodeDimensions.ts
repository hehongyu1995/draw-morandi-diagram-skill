import type { DiagramNode } from '../types';

type NodeLike = {
  type?: DiagramNode['type'] | string;
  width?: number;
  height?: number;
};

export function getNodeDimensions(node: NodeLike) {
  if (node.type === 'circle') {
    return { w: 50, h: 50 };
  }

  if (node.type === 'person') {
    return { w: node.width || 70, h: node.height || 90 };
  }

  if (node.type === 'cloud') {
    return { w: node.width || 120, h: node.height || 80 };
  }

  return {
    w: node.width || 110,
    h: node.height || 50
  };
}
