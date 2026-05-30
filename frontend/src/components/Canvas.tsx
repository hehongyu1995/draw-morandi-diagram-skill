import React, { useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { NodeShape } from './NodeShape';
import { THEMES } from '../constants';
import type { DiagramNode } from '../types';

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

export const Canvas: React.FC<CanvasProps> = ({ exportTime = null, svgRef }) => {
  const {
    currentData,
    animationsEnabled,
    bypassMargin,
    animateDashed,
    animateSolid,
    dragNode
  } = useAppStore();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  React.useLayoutEffect(() => {
    if (exportTime !== null && svgRef.current) {
      updateStaticDots(svgRef.current, exportTime, currentData?.type === 'sequence');
    }
  }, [exportTime, currentData]);

  React.useEffect(() => {
    if (!draggedId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg || !currentData) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = Math.round(mouseX - dragOffset.current.x);
      let newY = Math.round(mouseY - dragOffset.current.y);

      if (currentData.type === 'sequence') {
        newY = 50; // Lock vertical coordinate for sequence participants
      }

      dragNode(draggedId, newX, newY);
    };

    const handleMouseUp = () => {
      setDraggedId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedId, dragNode, currentData, svgRef]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const shape = target.closest('.node-shape');
    if (!shape) return;
    const id = shape.getAttribute('data-id');
    if (!id) return;

    // Find node/participant
    let node: { x?: number; y?: number } | undefined;
    if (currentData?.type === 'sequence') {
      node = currentData.participants?.find(p => p.id === id);
    } else {
      node = currentData?.nodes?.find(n => n.id === id);
    }

    if (node) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const nodeY = currentData?.type === 'sequence' ? 50 : (node.y ?? 0);
      const nodeX = node.x ?? 0;

      dragOffset.current = {
        x: mouseX - nodeX,
        y: mouseY - nodeY
      };
      setDraggedId(id);
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

            {/* 1. Draw Lifelines */}
            {participants.map(part => (
              <line
                key={`lifeline-${part.id}`}
                x1={part.x}
                y1={part.y ?? 50}
                x2={part.x}
                y2={height - 50}
                className="lifeline"
              />
            ))}

            {/* 2. Draw Activations */}
            {currentData.activations?.map((act, idx) => {
              const part = participantMap.get(act.participant);
              if (!part) return null;
              const theme = THEMES[part.theme] || THEMES.gray;
              const x = (part.x ?? 0) - 6;
              return (
                <rect
                  key={`act-${idx}`}
                  x={x}
                  y={act.y}
                  width={12}
                  height={act.height}
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
              const y = note.y;

              const lines = note.label.split(/\r?\n|\\n/);

              return (
                <g key={`note-${idx}`} className="note-group">
                  <rect x={x} y={y} width={w} height={h} rx={2} fill="#eeece8" stroke="#dad6d0" strokeWidth="1" />
                  {lines.length > 1 ? (
                    <text x={x + w / 2} y={y + h / 2} textAnchor="middle" fill="#6e6a64" className="message-text" style={{ fontSize: '11px' }}>
                      {lines.map((line, lidx) => (
                        <tspan key={lidx} x={x + w / 2} dy={lidx === 0 ? -(lines.length - 1) * 8 + 3 : 15} textAnchor="middle">
                          {line}
                        </tspan>
                      ))}
                    </text>
                  ) : (
                    <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fill="#6e6a64" className="message-text" style={{ fontSize: '11px' }}>
                      {note.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 4. Draw Messages */}
            {currentData.messages?.map((msg, msgIdx) => {
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
                </g>
              );
            })}
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

          {/* 1. Draw Connections */}
          {currentData.connections?.map((conn, connIdx) => {
            const nodeA = nodeMap.get(conn.from);
            const nodeB = nodeMap.get(conn.to);
            if (!nodeA || !nodeB) return null;

            const fromOff = conn.fromOffset || [0, 0];
            const toOff = conn.toOffset || [0, 0];
            const { x1, y1, x2, y2 } = getConnectionEndpoints(nodeA, nodeB, fromOff, toOff);

            let d = '';
            if (conn.curve === 'bezier') {
              const dx = x2 - x1;
              const dy = y2 - y1;
              const hasOffset = fromOff[0] !== 0 || fromOff[1] !== 0 || toOff[0] !== 0 || toOff[1] !== 0;

              if (hasOffset && Math.abs(dy) > Math.abs(dx)) {
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                const side = x1 < nodeA.x ? 'left' : 'right';

                let maxClearanceX = Math.max(Math.abs(x1 - nodeA.x), Math.abs(x2 - nodeB.x));
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

                    const nodeEdgeX = side === 'left' ? nodeMinX : nodeMaxX;
                    const dist = Math.abs(nodeEdgeX - nodeA.x) + bypassMargin;
                    if (dist > maxClearanceX) maxClearanceX = dist;
                  }
                });

                const bowX = side === 'left' ? nodeA.x - maxClearanceX : nodeA.x + maxClearanceX;
                d = `M ${x1} ${y1} C ${bowX} ${y1}, ${bowX} ${y2}, ${x2} ${y2}`;
              } else if (Math.abs(dx) >= Math.abs(dy)) {
                const ctrlOffset = Math.max(40, Math.abs(dx) * 0.45);
                d = `M ${x1} ${y1} C ${x1 + (dx > 0 ? ctrlOffset : -ctrlOffset)} ${y1}, ${x2 - (dx > 0 ? ctrlOffset : -ctrlOffset)} ${y2}, ${x2} ${y2}`;
              } else {
                const ctrlOffset = Math.max(40, Math.abs(dy) * 0.45);
                d = `M ${x1} ${y1} C ${x1} ${y1 + (dy > 0 ? ctrlOffset : -ctrlOffset)}, ${x2} ${y2 - (dy > 0 ? ctrlOffset : -ctrlOffset)}, ${x2} ${y2}`;
              }
            } else {
              d = `M ${x1} ${y1} L ${x2} ${y2}`;
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

            return (
              <g key={`conn-${connIdx}`}>
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
              </g>
            );
          })}

          {/* 2. Draw Nodes */}
          {nodes.map(node => {
            const theme = THEMES[node.theme] || THEMES.gray;
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
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
