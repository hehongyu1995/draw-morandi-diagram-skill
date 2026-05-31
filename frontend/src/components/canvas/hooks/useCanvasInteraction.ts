import React, { useRef, useState } from 'react';
import type { DiagramSpec } from '../../../types';
import { getNodeSnapPort } from '../geometry/connections';

export type MarqueeState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export type DraggedAnchor = {
  connIdx: number;
  type: 'from' | 'to';
  currentX: number;
  currentY: number;
};

interface UseCanvasInteractionParams {
  currentData: DiagramSpec | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  dragNodes: (updates: { id: string; x: number; y: number }[]) => void;
  updateConnectionOffset: (connIdx: number, type: 'from' | 'to', offset: [number, number]) => void;
}

type SelectableNode = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  type?: string;
};

function isNodeInMarquee(
  node: SelectableNode,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  isSequence: boolean
) {
  const x = node.x ?? 0;
  const y = isSequence ? (node.y ?? 50) : (node.y ?? 0);
  const w = isSequence ? (node.width || 120) : (node.type === 'circle' ? 50 : (node.width || 110));
  const h = isSequence ? (node.height || 45) : (node.type === 'circle' ? 50 : (node.height || 50));
  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h / 2;
  const bottom = y + h / 2;
  return left >= minX && right <= maxX && top >= minY && bottom <= maxY;
}

export function useCanvasInteraction({
  currentData,
  svgRef,
  dragNodes,
  updateConnectionOffset
}: UseCanvasInteractionParams) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoveredConnIdx, setHoveredConnIdx] = useState<number | null>(null);
  const [draggedAnchor, setDraggedAnchor] = useState<DraggedAnchor | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);

  const baseSelection = useRef<Set<string>>(new Set());
  const dragStartNodes = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragStartMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMarqueeActive = useRef(false);
  const marqueeStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMarquee = marquee !== null;

  React.useEffect(() => {
    if (!draggedId && !draggedAnchor && !hasMarquee) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg || !currentData) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (draggedId) {
        const dx = mouseX - dragStartMouse.current.x;
        const dy = mouseY - dragStartMouse.current.y;

        const updates: { id: string; x: number; y: number }[] = [];
        dragStartNodes.current.forEach((startPos, id) => {
          const newX = Math.round(startPos.x + dx);
          let newY = Math.round(startPos.y + dy);

          if (currentData.type === 'sequence') {
            newY = 50;
          }
          updates.push({ id, x: newX, y: newY });
        });

        if (updates.length > 0) {
          dragNodes(updates);
        }
      } else if (draggedAnchor) {
        const conn = currentData.connections?.[draggedAnchor.connIdx];
        if (!conn) return;

        const nodes = currentData.nodes || [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const targetNodeId = draggedAnchor.type === 'from' ? conn.from : conn.to;
        const targetNode = nodeMap.get(targetNodeId);

        let currentX = mouseX;
        let currentY = mouseY;

        if (targetNode) {
          const snapped = getNodeSnapPort(mouseX, mouseY, targetNode, 30);
          if (snapped) {
            currentX = snapped.x;
            currentY = snapped.y;
          }
        }

        setDraggedAnchor(prev => prev ? {
          ...prev,
          currentX,
          currentY
        } : null);
      } else if (isMarqueeActive.current) {
        setMarquee({
          startX: marqueeStart.current.x,
          startY: marqueeStart.current.y,
          currentX: mouseX,
          currentY: mouseY
        });

        const minX = Math.min(marqueeStart.current.x, mouseX);
        const maxX = Math.max(marqueeStart.current.x, mouseX);
        const minY = Math.min(marqueeStart.current.y, mouseY);
        const maxY = Math.max(marqueeStart.current.y, mouseY);

        const isSequence = currentData.type === 'sequence';
        const allNodes = isSequence ? (currentData.participants || []) : (currentData.nodes || []);

        const newlySelected = new Set<string>();
        allNodes.forEach(node => {
          if (isNodeInMarquee(node, minX, maxX, minY, maxY, isSequence)) {
            newlySelected.add(node.id);
          }
        });

        const nextSelected = new Set(baseSelection.current);
        newlySelected.forEach(id => nextSelected.add(id));
        setSelectedNodeIds(nextSelected);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggedId) {
        setDraggedId(null);
        dragStartNodes.current.clear();
      }

      if (draggedAnchor) {
        const svg = svgRef.current;
        const conn = currentData?.connections?.[draggedAnchor.connIdx];

        if (svg && currentData && conn) {
          const rect = svg.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const nodes = currentData.nodes || [];
          const nodeMap = new Map(nodes.map(n => [n.id, n]));
          const targetNodeId = draggedAnchor.type === 'from' ? conn.from : conn.to;
          const targetNode = nodeMap.get(targetNodeId);

          let finalOffset: [number, number] = [0, 0];

          if (targetNode) {
            const snapped = getNodeSnapPort(mouseX, mouseY, targetNode, Infinity);
            if (snapped) {
              finalOffset = snapped.offset;
            }
          }

          updateConnectionOffset(draggedAnchor.connIdx, draggedAnchor.type, finalOffset);
        }

        setDraggedAnchor(null);
        setHoveredConnIdx(null);
      }

      if (isMarqueeActive.current) {
        isMarqueeActive.current = false;
        setMarquee(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedId, draggedAnchor, hasMarquee, dragNodes, updateConnectionOffset, currentData, svgRef]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentData) return;
    const target = e.target as SVGElement;
    const shape = target.closest('.node-shape');

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let clickedNodeId: string | null = null;
    let node: { x?: number; y?: number } | undefined;

    if (shape) {
      const id = shape.getAttribute('data-id');
      if (id) {
        clickedNodeId = id;
        if (currentData?.type === 'sequence') {
          node = currentData.participants?.find(p => p.id === id);
        } else {
          node = currentData?.nodes?.find(n => n.id === id);
        }
      }
    }

    if (clickedNodeId && node) {
      let nextSelected = new Set(selectedNodeIds);
      if (e.shiftKey) {
        if (nextSelected.has(clickedNodeId)) {
          nextSelected.delete(clickedNodeId);
        } else {
          nextSelected.add(clickedNodeId);
        }
      } else {
        if (!nextSelected.has(clickedNodeId)) {
          nextSelected = new Set([clickedNodeId]);
        }
      }
      setSelectedNodeIds(nextSelected);

      dragStartMouse.current = { x: mouseX, y: mouseY };

      const startNodes = new Map<string, { x: number; y: number }>();
      const isSequence = currentData.type === 'sequence';
      const allNodes = isSequence ? (currentData.participants || []) : (currentData.nodes || []);

      allNodes.forEach(n => {
        if (nextSelected.has(n.id)) {
          startNodes.set(n.id, {
            x: n.x ?? 0,
            y: isSequence ? 50 : (n.y ?? 0)
          });
        }
      });
      dragStartNodes.current = startNodes;
      setDraggedId(clickedNodeId);
    } else {
      const nextSelected = e.shiftKey ? new Set(selectedNodeIds) : new Set<string>();
      setSelectedNodeIds(nextSelected);
      baseSelection.current = nextSelected;

      isMarqueeActive.current = true;
      marqueeStart.current = { x: mouseX, y: mouseY };
      setMarquee({
        startX: mouseX,
        startY: mouseY,
        currentX: mouseX,
        currentY: mouseY
      });
    }
    e.preventDefault();
  };

  return {
    selectedNodeIds,
    marquee,
    hoveredConnIdx,
    setHoveredConnIdx,
    draggedAnchor,
    setDraggedAnchor,
    handleMouseDown
  };
}
