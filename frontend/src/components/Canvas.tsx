import React, { useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { NodeShape } from './NodeShape';
import { THEMES } from '../constants';
import type { DiagramNode, DiagramGroup } from '../types';

interface CanvasProps {
  exportTime?: number | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

// Compute boundaries & offsets for connector lines
function getNodeEdge(node: DiagramNode, direction: string) {
  const radius = node.type === 'circle' ? 25 : 0;
  const w = node.type === 'circle' ? radius * 2 : (node.width || 110);
  const h = node.type === 'circle' ? radius * 2 : (node.height || 50);

  if (direction === 'right') return { x: node.x + w / 2, y: node.y };
  if (direction === 'left') return { x: node.x - w / 2, y: node.y };
  if (direction === 'top') return { x: node.x, y: node.y - h / 2 };
  if (direction === 'bottom') return { x: node.x, y: node.y + h / 2 };
  return { x: node.x, y: node.y };
}

function getEdgeSideOfPoint(x: number, y: number, node: DiagramNode): 'top' | 'bottom' | 'left' | 'right' {
  const w = node.type === 'circle' ? 50 : (node.width || 110);
  const h = node.type === 'circle' ? 50 : (node.height || 50);

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

function getConnectionEndpoints(
  nodeA: DiagramNode,
  nodeB: DiagramNode,
  fromOffset: [number, number] = [0, 0],
  toOffset: [number, number] = [0, 0]
) {
  const hasFromOffset = fromOffset[0] !== 0 || fromOffset[1] !== 0;
  const hasToOffset = toOffset[0] !== 0 || toOffset[1] !== 0;

  function getOffsetAnchor(node: DiagramNode, offset: [number, number]) {
    const w = node.type === 'circle' ? 50 : (node.width || 110);
    const h = node.type === 'circle' ? 50 : (node.height || 50);
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

export function updateStaticDots(svg: SVGSVGElement, t: number, isSequence: boolean) {
  const dots = svg.querySelectorAll('.flow-dot[data-path-id]');
  dots.forEach(dot => {
    const pathId = dot.getAttribute('data-path-id');
    if (!pathId) return;
    const begin = dot.getAttribute('data-begin') || '0s';
    const path = svg.getElementById(pathId) as SVGPathElement | null;
    if (path) {
      try {
        const len = path.getTotalLength();
        if (isSequence) {
          const dur = 1.5;
          const frac = (t % dur) / dur;
          const pt = path.getPointAtLength(len * frac);
          dot.setAttribute('cx', String(pt.x));
          dot.setAttribute('cy', String(pt.y));
        } else {
          const startOffset = begin.startsWith('-1.25') ? 1.25 : 0;
          const dur = 2.5;
          const frac = ((t + startOffset) % dur) / dur;
          const pt = path.getPointAtLength(len * frac);
          dot.setAttribute('cx', String(pt.x));
          dot.setAttribute('cy', String(pt.y));
        }
      } catch (e) {
        console.error(e);
      }
    }
  });
}

function getNodeSnapPort(
  mouseX: number,
  mouseY: number,
  node: DiagramNode,
  snapDistance: number = 30
) {
  const w = node.type === 'circle' ? 50 : (node.width || 110);
  const h = node.type === 'circle' ? 50 : (node.height || 50);

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

export const Canvas: React.FC<CanvasProps> = ({ exportTime = null, svgRef }) => {
  const {
    currentData,
    animationsEnabled,
    bypassMargin,
    animateDashed,
    animateSolid,
    dragNode,
    dragNodes,
    updateConnectionOffset,
    defaultCurvature
  } = useAppStore();

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [hoveredConnIdx, setHoveredConnIdx] = useState<number | null>(null);
  const [draggedAnchor, setDraggedAnchor] = useState<{
    connIdx: number;
    type: 'from' | 'to';
    currentX: number;
    currentY: number;
  } | null>(null);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const baseSelection = useRef<Set<string>>(new Set());
  const dragStartNodes = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragStartMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMarqueeActive = useRef(false);
  const marqueeStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  React.useLayoutEffect(() => {
    if (exportTime !== null && svgRef.current) {
      updateStaticDots(svgRef.current, exportTime, currentData?.type === 'sequence');
    }
  }, [exportTime, currentData]);

  React.useEffect(() => {
    const hasMarquee = marquee !== null;
    if (!draggedId && !draggedAnchor && !hasMarquee) return;

    const isNodeInMarquee = (node: any, minX: number, maxX: number, minY: number, maxY: number, isSequence: boolean) => {
      const x = node.x ?? 0;
      const y = isSequence ? (node.y ?? 50) : (node.y ?? 0);
      let w = 120;
      let h = 45;
      if (!isSequence) {
        w = node.type === 'circle' ? 50 : (node.width || 110);
        h = node.type === 'circle' ? 50 : (node.height || 50);
      } else {
        w = node.width || 120;
        h = node.height || 45;
      }
      const left = x - w / 2;
      const right = x + w / 2;
      const top = y - h / 2;
      const bottom = y + h / 2;
      return left >= minX && right <= maxX && top >= minY && bottom <= maxY;
    };

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
          let newX = Math.round(startPos.x + dx);
          let newY = Math.round(startPos.y + dy);

          if (currentData.type === 'sequence') {
            newY = 50; // Lock vertical coordinate for sequence participants
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
            // Snaps to the closest port overall on release
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
  }, [draggedId, draggedAnchor, marquee !== null, dragNode, dragNodes, updateConnectionOffset, currentData, svgRef]);

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
      // Clicked on background
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

  if (!currentData) {
    return (
      <div className="canvas-container">
        <div className="canvas-wrapper" style={{ width: '800px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No Diagram Data Loaded</p>
        </div>
      </div>
    );
  }

  const width = currentData.width || 800;
  const height = currentData.height || (currentData.type === 'sequence' ? 500 : 400);

  const isStaticExport = exportTime !== null;

  const renderLabel = (label: string, x: number, y: number, color: string) => {
    const lines = label.split(/\r?\n|\\n/);
    if (lines.length > 1) {
      const startDy = -(lines.length - 1) * 9 + 4;
      return (
        <text x={x} y={y} textAnchor="middle" fill={color} className="node-text-multiline">
          {lines.map((line, idx) => (
            <tspan key={idx} x={x} dy={idx === 0 ? startDy : 18} textAnchor="middle">
              {line}
            </tspan>
          ))}
        </text>
      );
    } else {
      return (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          className="node-text"
        >
          {label}
        </text>
      );
    }
  };

  if (currentData.type === 'sequence') {
    const participants = currentData.participants || [];
    const participantMap = new Map(participants.map(p => [p.id, p]));
    const groups: DiagramGroup[] = currentData.groups || [];

    const messageGap = 55;
    const startY = 120;
    const calculatedMessages = (currentData.messages || []).map((msg, idx) => {
      const y = msg.y !== undefined && msg.y !== null ? msg.y : (startY + idx * messageGap);
      return { ...msg, y };
    });

    const findMsg = (ref: string | number | undefined) => {
      if (ref === undefined || ref === null) return null;
      if (typeof ref === 'number') {
        if (ref < 100) return calculatedMessages[ref] || null;
        return { y: ref } as any;
      }
      const parsedIdx = parseInt(ref, 10);
      if (!isNaN(parsedIdx) && String(parsedIdx) === String(ref)) {
        if (parsedIdx < 100) return calculatedMessages[parsedIdx] || null;
        return { y: parsedIdx } as any;
      }
      return calculatedMessages.find(m => m.id === ref) || null;
    };

    let calculatedHeight = height;
    if (calculatedMessages.length > 0) {
      const lastMsgY = calculatedMessages[calculatedMessages.length - 1].y;
      calculatedHeight = Math.max(height, lastMsgY + 80);
    }

    return (
      <div className="canvas-container">
        <div className="canvas-wrapper" style={{ width: `${width}px`, height: `${calculatedHeight}px` }}>
          <svg
            ref={svgRef}
            id="svg-render"
            width={width}
            height={calculatedHeight}
            viewBox={`0 0 ${width} ${calculatedHeight}`}
            onMouseDown={handleMouseDown}
          >
            <defs>
              <marker
                id="arrow-solid"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 1 2.5 L 7 5 L 1 7.5 Z"
                  fill="#6e6a5f"
                  stroke="#6e6a5f"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </marker>
              <marker
                id="arrow-thin"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 1 2.5 L 7 5 L 1 7.5"
                  fill="none"
                  stroke="#8e8a7e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </marker>
              <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <style>{`
              .lifeline {
                stroke: #e2dfd5;
                stroke-width: 1.5;
                stroke-dasharray: 4 4;
              }
              .node-text {
                font-family: 'Newsreader', Georgia, serif;
                font-size: 14px;
                font-weight: 600;
                text-anchor: middle;
                dominant-baseline: central;
                user-select: none;
              }
              .node-text-multiline {
                font-family: 'Newsreader', Georgia, serif;
                font-size: 13px;
                font-weight: 600;
                text-anchor: middle;
                user-select: none;
              }
              .node-shape {
                stroke-width: 1.5;
                cursor: grab;
                filter: drop-shadow(0px 2px 4px rgba(25, 24, 22, 0.02));
                transition: transform 0.1s ease;
              }
              .node-shape:active {
                cursor: grabbing;
              }
              .message-line {
                fill: none;
                stroke-width: 1.5;
              }
              .flow-dot {
                pointer-events: none;
              }
              .message-text {
                font-family: 'Newsreader', Georgia, serif;
                font-size: 13px;
                font-style: italic;
                fill: #6e6a5f;
                user-select: none;
              }
            `}</style>

            {/* Canvas Background */}
            <rect width="100%" height="100%" fill="#faf8f5" />

            {/* Sequence Groups Background (drawn first to sit behind lifelines/messages) */}
            {groups.map((group) => {
              if (!group.participants || group.participants.length === 0) return null;
              const xs = group.participants
                .map(pId => participantMap.get(pId)?.x)
                .filter((x): x is number => x !== undefined);
              if (xs.length === 0) return null;
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const startX = minX - 40;
              const width = (maxX - minX) + 80;

              const msgStart = findMsg(group.messageFrom);
              const msgEnd = findMsg(group.messageTo);
              if (!msgStart || !msgEnd) return null;

              const yStart = msgStart.y;
              const yEnd = msgEnd.y;

              const theme = group.theme && THEMES[group.theme] ? THEMES[group.theme] : THEMES.gray;

              return (
                <rect
                  key={`seq-group-bg-${group.id}`}
                  x={startX}
                  y={yStart - 35}
                  width={width}
                  height={(yEnd - yStart) + 50}
                  fill={theme.bg}
                  fillOpacity={0.25}
                  stroke={theme.border}
                  strokeWidth="1.5"
                  rx="4"
                />
              );
            })}

            {/* 1. Draw Lifelines */}
            {participants.map(part => (
              <line
                key={`lifeline-${part.id}`}
                x1={part.x}
                y1={part.y ?? 50}
                x2={part.x}
                y2={calculatedHeight - 50}
                className="lifeline"
              />
            ))}

            {/* 2. Draw Activations */}
            {currentData.activations?.map((act, idx) => {
              const part = participantMap.get(act.participant);
              if (!part) return null;
              const theme = THEMES[part.theme] || THEMES.gray;
              const x = (part.x ?? 0) - 6;
              const yStart = findMsg(act.start ?? act.y)?.y ?? 100;
              let heightVal = 50;
              if (act.end !== undefined) {
                const yEnd = findMsg(act.end)?.y ?? yStart;
                heightVal = yEnd - yStart;
              } else if (act.height !== undefined) {
                heightVal = act.height;
              }
              return (
                <rect
                  key={`act-${idx}`}
                  x={x}
                  y={yStart}
                  width={12}
                  height={heightVal}
                  fill={theme.bg}
                  stroke={theme.border}
                  strokeWidth="1.5"
                  rx="2"
                />
              );
            })}

            {/* 3. Draw Notes */}
            {currentData.notes?.map((note, idx) => {
              const part = participantMap.get(note.participant);
              if (!part) return null;
              const w = note.width || 120;
              const h = note.height || 45;
              const x = (part.x ?? 0) + (note.align === 'left' ? -(w + 20) : 20);
              const resolvedNoteMsg = findMsg(note.y);
              const noteY = resolvedNoteMsg ? resolvedNoteMsg.y : (typeof note.y === 'number' ? note.y : 100);

              const lines = note.label.split(/\r?\n|\\n/);

              return (
                <g key={`note-${idx}`} className="note-group">
                  <rect x={x} y={noteY} width={w} height={h} rx={2} fill="#eeece8" stroke="#dad6d0" strokeWidth="1" />
                  {lines.length > 1 ? (
                    <text x={x + w / 2} y={noteY + h / 2} textAnchor="middle" fill="#6e6a64" className="message-text" style={{ fontSize: '11px' }}>
                      {lines.map((line, lidx) => (
                        <tspan key={lidx} x={x + w / 2} dy={lidx === 0 ? -(lines.length - 1) * 8 + 3 : 15} textAnchor="middle">
                          {line}
                        </tspan>
                      ))}
                    </text>
                  ) : (
                    <text x={x + w / 2} y={noteY + h / 2} textAnchor="middle" dominantBaseline="central" fill="#6e6a64" className="message-text" style={{ fontSize: '11px' }}>
                      {note.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 4. Draw Messages */}
            {calculatedMessages.map((msg, msgIdx) => {
              const partA = participantMap.get(msg.from);
              const partB = participantMap.get(msg.to);
              if (!partA || !partB) return null;

              const isSelf = msg.from === msg.to;
              const stroke = msg.lineType === 'dashed' ? '#8e8a7e' : '#6e6a5f';
              const isDashed = msg.lineType === 'dashed';
              const marker = msg.lineType === 'dashed' ? 'url(#arrow-thin)' : 'url(#arrow-solid)';

              const animateMsg = msg.animate !== false && animationsEnabled;
              const animateDashedMsg = animateMsg && isDashed && animateDashed;
              const animateSolidMsg = animateMsg && !isDashed && animateSolid;

              const msgPathId = `msg-path-${msgIdx}`;

              if (isSelf) {
                const x = (partA.x ?? 0) + 6;
                const y1 = msg.y;
                const y2 = msg.y + 25;
                const d = `M ${x} ${y1} C ${x + 40} ${y1}, ${x + 40} ${y2}, ${x} ${y2}`;

                return (
                  <g key={`msg-${msgIdx}`}>
                    {animateDashedMsg ? (
                      isStaticExport ? (
                        <path
                          d={d}
                          className="message-line"
                          stroke={stroke}
                          strokeDasharray="4 4"
                          markerEnd={marker}
                          strokeDashoffset={((exportTime % 1.5) / 1.5) * -24}
                        />
                      ) : (
                        <path d={d} className="message-line" stroke={stroke} strokeDasharray="4 4" markerEnd={marker}>
                          <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
                        </path>
                      )
                    ) : (
                      <path
                        d={d}
                        className="message-line"
                        stroke={stroke}
                        strokeDasharray={isDashed ? '4 4' : undefined}
                        markerEnd={marker}
                        id={animateSolidMsg ? msgPathId : undefined}
                      />
                    )}

                    {animateSolidMsg && (
                      isStaticExport ? (
                        <circle
                          r="3"
                          fill="#6e6a5f"
                          opacity="0.7"
                          filter="url(#dot-glow)"
                          className="flow-dot"
                          data-path-id={msgPathId}
                          data-begin="0s"
                        />
                      ) : (
                        <circle r="3" fill="#6e6a5f" opacity="0.7" filter="url(#dot-glow)" className="flow-dot">
                          <animateMotion dur="1.5s" repeatCount="indefinite">
                            <mpath href={`#${msgPathId}`} />
                          </animateMotion>
                        </circle>
                      )
                    )}

                    <text x={x + 45} y={y1 + 14} className="message-text" textAnchor="start" dominantBaseline="central">
                      {msg.label}
                    </text>
                  </g>
                );
              } else {
                const dx = (partB.x ?? 0) - (partA.x ?? 0);
                const startX = dx > 0 ? (partA.x ?? 0) + 6 : (partA.x ?? 0) - 6;
                const endX = dx > 0 ? (partB.x ?? 0) - 6 : (partB.x ?? 0) + 6;
                const d = `M ${startX} ${msg.y} L ${endX} ${msg.y}`;

                return (
                  <g key={`msg-${msgIdx}`}>
                    {animateDashedMsg ? (
                      isStaticExport ? (
                        <path
                          d={d}
                          className="message-line"
                          stroke={stroke}
                          strokeDasharray="4 4"
                          markerEnd={marker}
                          strokeDashoffset={((exportTime % 1.5) / 1.5) * -24}
                        />
                      ) : (
                        <path d={d} className="message-line" stroke={stroke} strokeDasharray="4 4" markerEnd={marker}>
                          <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
                        </path>
                      )
                    ) : (
                      <path
                        d={d}
                        className="message-line"
                        stroke={stroke}
                        strokeDasharray={isDashed ? '4 4' : undefined}
                        markerEnd={marker}
                        id={animateSolidMsg ? msgPathId : undefined}
                      />
                    )}

                    {animateSolidMsg && (
                      isStaticExport ? (
                        <circle
                          r="3"
                          fill="#6e6a5f"
                          opacity="0.7"
                          filter="url(#dot-glow)"
                          className="flow-dot"
                          data-path-id={msgPathId}
                          data-begin="0s"
                        />
                      ) : (
                        <circle r="3" fill="#6e6a5f" opacity="0.7" filter="url(#dot-glow)" className="flow-dot">
                          <animateMotion dur="1.5s" repeatCount="indefinite">
                            <mpath href={`#${msgPathId}`} />
                          </animateMotion>
                        </circle>
                      )
                    )}

                    <text x={(startX + endX) / 2} y={msg.y - 7} className="message-text" textAnchor="middle" dominantBaseline="auto">
                      {msg.label}
                    </text>
                  </g>
                );
              }
            })}

            {/* Sequence Group Labels/Tabs (Foreground layer to sit on top of activations/lifelines) */}
            {groups.map((group) => {
              if (!group.participants || group.participants.length === 0) return null;
              const xs = group.participants
                .map(pId => participantMap.get(pId)?.x)
                .filter((x): x is number => x !== undefined);
              if (xs.length === 0) return null;
              const minX = Math.min(...xs);
              const startX = minX - 40;

              const msgStart = findMsg(group.messageFrom);
              const msgEnd = findMsg(group.messageTo);
              if (!msgStart || !msgEnd) return null;

              const yStart = msgStart.y;
              const theme = group.theme && THEMES[group.theme] ? THEMES[group.theme] : THEMES.gray;

              const tabHeight = 18;
              const tabText = group.label;
              const charWidth = 6.2;
              const tabWidth = Math.max(45, tabText.length * charWidth + 14);

              return (
                <g key={`seq-group-tab-${group.id}`}>
                  {/* Small solid tab background to mask lines behind */}
                  <rect
                    x={startX}
                    y={yStart - 35}
                    width={tabWidth}
                    height={tabHeight}
                    fill={theme.bg}
                    stroke={theme.border}
                    strokeWidth="1.5"
                    rx="3"
                  />
                  <text
                    x={startX + 7}
                    y={yStart - 35 + tabHeight / 2}
                    fill={theme.text}
                    fontSize="10.5px"
                    fontWeight="bold"
                    dominantBaseline="central"
                    style={{ fontFamily: "'Newsreader', Georgia, serif" }}
                  >
                    {tabText}
                  </text>
                </g>
              );
            })}

            {/* 5. Draw Participant Headers */}
            {participants.map(part => {
              const theme = THEMES[part.theme] || THEMES.gray;
              const w = part.width || 120;
              const h = part.height || 45;
              const rx = h / 2;

              return (
                <g key={`header-${part.id}`} className="node-group" id={`node-g-${part.id}`}>
                  <rect
                    x={(part.x ?? 0) - w / 2}
                    y={(part.y ?? 50) - h / 2}
                    width={w}
                    height={h}
                    rx={rx}
                    fill={theme.bg}
                    stroke={theme.border}
                    className="node-shape"
                    data-id={part.id}
                  />
                  {renderLabel(part.label, part.x ?? 0, part.y ?? 50, theme.text)}
                  {selectedNodeIds.has(part.id) && (
                    <rect
                      x={(part.x ?? 0) - w / 2 - 4}
                      y={(part.y ?? 50) - h / 2 - 4}
                      width={w + 8}
                      height={h + 8}
                      rx={rx + 4}
                      fill="none"
                      stroke="#5b8bba"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </g>
              );
            })}

            {marquee && (() => {
              const x = Math.min(marquee.startX, marquee.currentX);
              const y = Math.min(marquee.startY, marquee.currentY);
              const w = Math.abs(marquee.startX - marquee.currentX);
              const h = Math.abs(marquee.startY - marquee.currentY);
              return (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="rgba(91, 139, 186, 0.15)"
                  stroke="#5b8bba"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })()}
          </svg>
        </div>
      </div>
    );
  }

  // FLOWCHART RENDERING ENGINE
  const nodes = currentData.nodes || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper" style={{ width: `${width}px`, height: `${height}px` }}>
        <svg
          ref={svgRef}
          id="svg-render"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onMouseDown={handleMouseDown}
        >
          <defs>
            <marker
              id="arrow-solid"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 1 2.5 L 7 5 L 1 7.5 Z"
                fill="#6e6a5f"
                stroke="#6e6a5f"
                strokeWidth="1"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </marker>

            <style>{`
              .node-text {
                font-family: 'Newsreader', Georgia, serif;
                font-size: 14px;
                font-weight: 600;
                text-anchor: middle;
                dominant-baseline: central;
                user-select: none;
              }
              .node-text-multiline {
                font-family: 'Newsreader', Georgia, serif;
                font-size: 13px;
                font-weight: 600;
                text-anchor: middle;
                user-select: none;
              }
              .node-shape {
                stroke-width: 1.5;
                cursor: grab;
                filter: drop-shadow(0px 2px 4px rgba(25, 24, 22, 0.02));
                transition: transform 0.1s ease;
              }
              .node-shape:active {
                cursor: grabbing;
              }
              .connection-line {
                fill: none;
                stroke: #6e6a5f;
                stroke-width: 1.5;
              }
              .flow-dot {
                pointer-events: none;
              }
            `}</style>

            <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Canvas Background */}
          <rect width="100%" height="100%" fill="#faf8f5" />

          {/* Flowchart Groups */}
          {(currentData.groups || []).map(group => {
            if (!group.nodeIds || group.nodeIds.length === 0) return null;
            
            const groupNodes = group.nodeIds
              .map(id => nodeMap.get(id))
              .filter((n): n is DiagramNode => n !== undefined);
            if (groupNodes.length === 0) return null;

            const xValues = groupNodes.map(node => {
              const w = node.type === 'circle' ? 50 : (node.width || 110);
              return [node.x - w / 2, node.x + w / 2];
            }).flat();

            const yValues = groupNodes.map(node => {
              const h = node.type === 'circle' ? 50 : (node.height || 50);
              return [node.y - h / 2, node.y + h / 2];
            }).flat();

            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);

            const x = minX - 20;
            const y = minY - 35;
            const width = (maxX - minX) + 40;
            const height = (maxY - minY) + 55;

            const theme = group.theme && THEMES[group.theme] ? THEMES[group.theme] : null;
            const fillColor = theme ? theme.bg : "#efede8";
            const strokeColor = theme ? theme.border : "#d3cecf";
            const textColor = theme ? theme.text : "#6b645d";

            return (
              <g key={`flowchart-group-${group.id}`}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fillColor}
                  fillOpacity={0.25}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  rx="6"
                />
                <text
                  x={minX - 10}
                  y={minY - 22}
                  fill={textColor}
                  fontSize="11px"
                  fontWeight="600"
                  style={{ fontFamily: "'Newsreader', Georgia, serif" }}
                >
                  {group.label}
                </text>
              </g>
            );
          })}

          {/* 1. Draw Nodes */}
          {nodes.map(node => {
            const theme = THEMES[node.theme] || THEMES.gray;
            const w = node.type === 'circle' ? 50 : (node.width || 110);
            const h = node.type === 'circle' ? 50 : (node.height || 50);
            return (
              <g key={`node-${node.id}`} className="node-group" id={`node-g-${node.id}`}>
                <NodeShape
                  id={node.id}
                  type={node.type}
                  themeName={node.theme}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                />
                {renderLabel(node.label, node.x, node.y, theme.text)}
                {selectedNodeIds.has(node.id) && (
                  node.type === 'circle' ? (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={25 + 4}
                      fill="none"
                      stroke="#5b8bba"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : (
                    <rect
                      x={node.x - w / 2 - 4}
                      y={node.y - h / 2 - 4}
                      width={w + 8}
                      height={h + 8}
                      rx={node.type === 'capsule' ? (h + 8) / 2 : 7}
                      fill="none"
                      stroke="#5b8bba"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      style={{ pointerEvents: 'none' }}
                    />
                  )
                )}
              </g>
            );
          })}

          {/* 2. Draw Connections */}
          {currentData.connections?.map((conn, connIdx) => {
            const nodeA = nodeMap.get(conn.from);
            const nodeB = nodeMap.get(conn.to);
            if (!nodeA || !nodeB) return null;

            let fromOff = conn.fromOffset || [0, 0];
            let toOff = conn.toOffset || [0, 0];
            let { x1, y1, x2, y2 } = getConnectionEndpoints(nodeA, nodeB, fromOff, toOff);

            // Override endpoints dynamically if this connection anchor is being dragged
            const isDraggingThisFrom = draggedAnchor?.connIdx === connIdx && draggedAnchor.type === 'from';
            const isDraggingThisTo = draggedAnchor?.connIdx === connIdx && draggedAnchor.type === 'to';

            if (isDraggingThisFrom && draggedAnchor) {
              x1 = draggedAnchor.currentX;
              y1 = draggedAnchor.currentY;
            }
            if (isDraggingThisTo && draggedAnchor) {
              x2 = draggedAnchor.currentX;
              y2 = draggedAnchor.currentY;
            }

            let d = '';
            let mx = 0;
            let my = 0;
            if (conn.curve === 'bezier') {
              const dx = x2 - x1;
              const dy = y2 - y1;
              const hasOffset = fromOff[0] !== 0 || fromOff[1] !== 0 || toOff[0] !== 0 || toOff[1] !== 0;

              let hasObstacles = false;
              let maxClearanceX = Math.max(Math.abs(x1 - nodeA.x), Math.abs(x2 - nodeB.x));

              if (hasOffset && Math.abs(dy) > Math.abs(dx)) {
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                const side = x1 < nodeA.x ? 'left' : 'right';

                nodes.forEach(n => {
                  const nw = n.type === 'circle' ? 50 : (n.width || 110);
                  const nh = n.type === 'circle' ? 50 : (n.height || 50);
                  const nTop = n.y - nh / 2;
                  const nBot = n.y + nh / 2;

                  if (nBot > minY && nTop < maxY) {
                    const nodeMinX = n.x - nw / 2;
                    const nodeMaxX = n.x + nw / 2;

                    const pathMinX = Math.min(nodeA.x, nodeB.x, x1, x2);
                    const pathMaxX = Math.max(nodeA.x, nodeB.x, x1, x2);
                    if (nodeMaxX < pathMinX || nodeMinX > pathMaxX) {
                      return;
                    }

                    hasObstacles = true;
                    const nodeEdgeX = side === 'left' ? nodeMinX : nodeMaxX;
                    const dist = Math.abs(nodeEdgeX - nodeA.x) + bypassMargin;
                    if (dist > maxClearanceX) maxClearanceX = dist;
                  }
                });
              }

              if (hasOffset && Math.abs(dy) > Math.abs(dx) && hasObstacles) {
                const side = x1 < nodeA.x ? 'left' : 'right';
                const bowX = side === 'left' ? nodeA.x - maxClearanceX : nodeA.x + maxClearanceX;
                d = `M ${x1} ${y1} C ${bowX} ${y1}, ${bowX} ${y2}, ${x2} ${y2}`;

                mx = 0.125 * x1 + 0.375 * bowX + 0.375 * bowX + 0.125 * x2;
                my = 0.125 * y1 + 0.375 * y1 + 0.375 * y2 + 0.125 * y2;
              } else {
                const sideA = getEdgeSideOfPoint(x1, y1, nodeA);
                const sideB = getEdgeSideOfPoint(x2, y2, nodeB);
                const fromCurv = conn.fromCurvature ?? conn.curvature ?? defaultCurvature;
                const toCurv = conn.toCurvature ?? conn.curvature ?? defaultCurvature;
                const ctrlOffsetA = Math.max(20, Math.hypot(dx, dy) * fromCurv);
                const ctrlOffsetB = Math.max(20, Math.hypot(dx, dy) * toCurv);

                let cx1 = x1;
                let cy1 = y1;
                if (sideA === 'left') cx1 = x1 - ctrlOffsetA;
                else if (sideA === 'right') cx1 = x1 + ctrlOffsetA;
                else if (sideA === 'top') cy1 = y1 - ctrlOffsetA;
                else if (sideA === 'bottom') cy1 = y1 + ctrlOffsetA;

                let cx2 = x2;
                let cy2 = y2;
                if (sideB === 'left') cx2 = x2 - ctrlOffsetB;
                else if (sideB === 'right') cx2 = x2 + ctrlOffsetB;
                else if (sideB === 'top') cy2 = y2 - ctrlOffsetB;
                else if (sideB === 'bottom') cy2 = y2 + ctrlOffsetB;

                d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

                mx = 0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2;
                my = 0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2;
              }
            } else {
              d = `M ${x1} ${y1} L ${x2} ${y2}`;
              mx = (x1 + x2) / 2;
              my = (y1 + y2) / 2;
            }

            let strokeDash = '';
            let isDashedOrDotted = false;
            if (conn.lineType === 'dashed') {
              strokeDash = '4 4';
              isDashedOrDotted = true;
            } else if (conn.lineType === 'dotted') {
              strokeDash = '2 3';
              isDashedOrDotted = true;
            }

            const animateConn = conn.animate !== false && animationsEnabled;
            const animateDashedConn = animateConn && isDashedOrDotted && animateDashed;
            const animateSolidConn = animateConn && !isDashedOrDotted && animateSolid;

            const pathId = `flow-path-${conn.from}-${conn.to}`;
            const isHovered = hoveredConnIdx === connIdx || draggedAnchor?.connIdx === connIdx;

            return (
              <g
                key={`conn-${connIdx}`}
                onMouseEnter={() => setHoveredConnIdx(connIdx)}
                onMouseLeave={() => {
                  if (draggedAnchor?.connIdx !== connIdx) {
                    setHoveredConnIdx(null);
                  }
                }}
              >
                {animateDashedConn ? (
                  isStaticExport ? (
                    <path
                      d={d}
                      className="connection-line"
                      strokeDasharray={strokeDash}
                      strokeLinecap={conn.lineType === 'dotted' ? 'round' : undefined}
                      markerEnd="url(#arrow-solid)"
                      strokeDashoffset={((exportTime % 1.5) / 1.5) * -24}
                    />
                  ) : (
                    <path
                      d={d}
                      className="connection-line"
                      strokeDasharray={strokeDash}
                      strokeLinecap={conn.lineType === 'dotted' ? 'round' : undefined}
                      markerEnd="url(#arrow-solid)"
                    >
                      <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
                    </path>
                  )
                ) : (
                  <path
                    d={d}
                    className="connection-line"
                    strokeDasharray={strokeDash || undefined}
                    strokeLinecap={conn.lineType === 'dotted' ? 'round' : undefined}
                    markerEnd="url(#arrow-solid)"
                    id={animateSolidConn ? pathId : undefined}
                  />
                )}

                {animateSolidConn && (
                  isStaticExport ? (
                    <>
                      <circle
                        r="3"
                        fill="#6e6a5f"
                        opacity="0.7"
                        filter="url(#dot-glow)"
                        className="flow-dot"
                        data-path-id={pathId}
                        data-begin="0s"
                      />
                      <circle
                        r="2.5"
                        fill="#8e8a7e"
                        opacity="0.5"
                        filter="url(#dot-glow)"
                        className="flow-dot"
                        data-path-id={pathId}
                        data-begin="-1.25s"
                      />
                    </>
                  ) : (
                    <>
                      <circle r="3" fill="#6e6a5f" opacity="0.7" filter="url(#dot-glow)" className="flow-dot">
                        <animateMotion dur="2.5s" repeatCount="indefinite" begin="0s">
                          <mpath href={`#${pathId}`} />
                        </animateMotion>
                      </circle>
                      <circle r="2.5" fill="#8e8a7e" opacity="0.5" filter="url(#dot-glow)" className="flow-dot">
                        <animateMotion dur="2.5s" repeatCount="indefinite" begin="-1.25s">
                          <mpath href={`#${pathId}`} />
                        </animateMotion>
                      </circle>
                    </>
                  )
                )}

                {/* Invisible thick path helper for easy hovering over fine lines */}
                {!isStaticExport && (
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    style={{ cursor: 'pointer' }}
                  />
                )}

                {conn.label && (
                  <g className="connection-label-group" style={{ pointerEvents: 'none' }}>
                    <rect
                      x={mx - (conn.label.length * 6.5 + 12) / 2}
                      y={my - 9}
                      width={conn.label.length * 6.5 + 12}
                      height={18}
                      rx={3}
                      fill="#faf8f5"
                      stroke="#dad6d0"
                      strokeWidth="1"
                    />
                    <text
                      x={mx}
                      y={my}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#6e6a5f"
                      style={{
                        fontFamily: "'Newsreader', Georgia, serif",
                        fontSize: "11px",
                        fontWeight: 600,
                        userSelect: "none"
                      }}
                    >
                      {conn.label}
                    </text>
                  </g>
                )}

                {/* Endpoint Interactive Drag Handles */}
                {isHovered && !isStaticExport && (
                  <>
                    <circle
                      cx={x1}
                      cy={y1}
                      r="5"
                      fill="var(--bg-secondary)"
                      stroke="var(--text-secondary)"
                      strokeWidth="2"
                      style={{ cursor: 'crosshair' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedAnchor({
                          connIdx,
                          type: 'from',
                          currentX: x1,
                          currentY: y1
                        });
                      }}
                    />
                    <circle
                      cx={x2}
                      cy={y2}
                      r="5"
                      fill="var(--bg-secondary)"
                      stroke="var(--text-secondary)"
                      strokeWidth="2"
                      style={{ cursor: 'crosshair' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedAnchor({
                          connIdx,
                          type: 'to',
                          currentX: x2,
                          currentY: y2
                        });
                      }}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Snap Ports (Top/Bottom/Left/Right) preview for the dragged connection node */}
          {draggedAnchor && !isStaticExport && (() => {
            const conn = currentData.connections?.[draggedAnchor.connIdx];
            if (!conn) return null;
            const targetNodeId = draggedAnchor.type === 'from' ? conn.from : conn.to;
            const targetNode = nodeMap.get(targetNodeId);
            if (!targetNode) return null;

            const w = targetNode.type === 'circle' ? 50 : (targetNode.width || 110);
            const h = targetNode.type === 'circle' ? 50 : (targetNode.height || 50);

            const ports = [
              { x: targetNode.x, y: targetNode.y - h / 2 },
              { x: targetNode.x, y: targetNode.y + h / 2 },
              { x: targetNode.x - w / 2, y: targetNode.y },
              { x: targetNode.x + w / 2, y: targetNode.y }
            ];

            return (
              <g className="snap-ports-group">
                {ports.map((port, idx) => (
                  <circle
                    key={idx}
                    cx={port.x}
                    cy={port.y}
                    r="4"
                    fill="var(--success-color)"
                    stroke="var(--bg-secondary)"
                    strokeWidth="1.5"
                    style={{ opacity: 0.8, pointerEvents: 'none' }}
                  />
                ))}
              </g>
            );
          })()}

          {marquee && (() => {
            const x = Math.min(marquee.startX, marquee.currentX);
            const y = Math.min(marquee.startY, marquee.currentY);
            const w = Math.abs(marquee.startX - marquee.currentX);
            const h = Math.abs(marquee.startY - marquee.currentY);
            return (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="rgba(91, 139, 186, 0.15)"
                stroke="#5b8bba"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                style={{ pointerEvents: 'none' }}
              />
            );
          })()}
        </svg>
      </div>
    </div>
  );
};
