import React from 'react';
import { THEMES } from '../../../constants';
import type { DiagramNode, DiagramSpec } from '../../../types';
import { NodeShape } from '../../NodeShape';
import { MarqueeRect } from '../MarqueeRect';
import { SelectionOverlay } from '../SelectionOverlay';
import { SvgDefs } from '../SvgDefs';
import { SvgLabel } from '../SvgLabel';
import { getConnectionEndpoints, getEdgeSideOfPoint } from '../geometry/connections';
import { getNodeDimensions } from '../../../utils/nodeDimensions';
import { pathMidpoint } from '../../../utils/pathMidpoint';

type DraggedAnchor = {
  connIdx: number;
  type: 'from' | 'to';
  currentX: number;
  currentY: number;
} | null;

interface FlowchartCanvasProps {
  currentData: DiagramSpec;
  width: number;
  height: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  selectedNodeIds: Set<string>;
  marquee: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  animationsEnabled: boolean;
  animateDashed: boolean;
  animateSolid: boolean;
  hoveredConnIdx: number | null;
  setHoveredConnIdx: React.Dispatch<React.SetStateAction<number | null>>;
  draggedAnchor: DraggedAnchor;
  setDraggedAnchor: React.Dispatch<React.SetStateAction<DraggedAnchor>>;
  defaultCurvature: number;
  bypassMargin: number;
  exportTime: number | null;
  isStaticExport: boolean;
}

export function FlowchartCanvas({
  currentData,
  width,
  height,
  svgRef,
  onMouseDown,
  selectedNodeIds,
  marquee,
  animationsEnabled,
  animateDashed,
  animateSolid,
  hoveredConnIdx,
  setHoveredConnIdx,
  draggedAnchor,
  setDraggedAnchor,
  defaultCurvature,
  bypassMargin,
  exportTime,
  isStaticExport
}: FlowchartCanvasProps) {
  const staticExportTime = exportTime ?? 0;
  const nodes = currentData.nodes || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const getMarkerForStyle = (style?: string): string => {
    const styleMap: Record<string, string> = {
      filled: 'url(#arrow-solid)',
      open: 'url(#arrow-open)',
      triangle: 'url(#arrow-triangle)',
      diamond: 'url(#arrow-diamond)',
      circle: 'url(#arrow-circle)',
    };
    return styleMap[style || 'filled'] || 'url(#arrow-solid)';
  };

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper" style={{ width: `${width}px`, height: `${height}px` }}>
        <svg
          ref={svgRef}
          id="svg-render"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onMouseDown={onMouseDown}
        >
          <SvgDefs variant="flowchart" />

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
              const { w } = getNodeDimensions(node);
              return [node.x - w / 2, node.x + w / 2];
            }).flat();

            const yValues = groupNodes.map(node => {
              const { h } = getNodeDimensions(node);
              return [node.y - h / 2, node.y + h / 2];
            }).flat();

            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);

            const x = minX - 20;
            const y = minY - 35;
            const groupWidth = (maxX - minX) + 40;
            const groupHeight = (maxY - minY) + 55;

            const theme = group.theme && THEMES[group.theme] ? THEMES[group.theme] : null;
            const fillColor = theme ? theme.bg : '#efede8';
            const strokeColor = theme ? theme.border : '#d3cecf';
            const textColor = theme ? theme.text : '#6b645d';

            return (
              <g key={`flowchart-group-${group.id}`}>
                <rect
                  x={x}
                  y={y}
                  width={groupWidth}
                  height={groupHeight}
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
            const { w, h } = getNodeDimensions(node);
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
                <SvgLabel
                  label={node.label}
                  x={node.x}
                  y={node.type === 'person' || node.type === 'cloud' ? node.y + h / 2 + 14 : node.y}
                  color={theme.text}
                />
                {selectedNodeIds.has(node.id) && (
                  node.type === 'circle' ? (
                    <SelectionOverlay shape="circle" x={node.x} y={node.y} />
                  ) : (
                    <SelectionOverlay
                      shape="rect"
                      x={node.x}
                      y={node.y}
                      width={w}
                      height={h}
                      rx={node.type === 'capsule' ? (h + 8) / 2 : 7}
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

            const fromOff = conn.fromOffset || [0, 0];
            const toOff = conn.toOffset || [0, 0];
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

            let d: string;
            let mx: number;
            let my: number;

            // Orthogonal routing using pre-computed dagre points
            if (conn.routing === 'orthogonal' && conn.points && conn.points.length >= 2) {
              const pts = conn.points;
              d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

              // Label at the path-length midpoint (50% of total path length)
              const { mx: midX, my: midY } = pathMidpoint(pts);
              mx = midX;
              my = midY;
            } else if (conn.curve === 'bezier') {
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
                  // Skip the connection's own from/to nodes — they're the endpoints, not obstacles
                  if (n.id === nodeA.id || n.id === nodeB.id) return;

                  const { w: nw, h: nh } = getNodeDimensions(n);
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
                      markerEnd={getMarkerForStyle(conn.arrowStyle)}
                      strokeDashoffset={((staticExportTime % 1.5) / 1.5) * -24}
                    />
                  ) : (
                    <path
                      d={d}
                      className="connection-line"
                      strokeDasharray={strokeDash}
                      strokeLinecap={conn.lineType === 'dotted' ? 'round' : undefined}
                      markerEnd={getMarkerForStyle(conn.arrowStyle)}
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
                    markerEnd={getMarkerForStyle(conn.arrowStyle)}
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
                        fontSize: '11px',
                        fontWeight: 600,
                        userSelect: 'none'
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

            const { w, h } = getNodeDimensions(targetNode);

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

          {marquee && <MarqueeRect marquee={marquee} />}
        </svg>
      </div>
    </div>
  );
}
