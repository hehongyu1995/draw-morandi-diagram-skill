import React from 'react';
import { THEMES } from '../../../constants';
import type { DiagramGroup, DiagramSpec } from '../../../types';
import { MarqueeRect } from '../MarqueeRect';
import { SelectionOverlay } from '../SelectionOverlay';
import { SvgDefs } from '../SvgDefs';
import { SvgLabel } from '../SvgLabel';

interface SequenceCanvasProps {
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
  exportTime: number | null;
  isStaticExport: boolean;
}

export function SequenceCanvas({
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
  exportTime,
  isStaticExport
}: SequenceCanvasProps) {
  const staticExportTime = exportTime ?? 0;
  const participants = currentData.participants || [];
  const participantMap = new Map(participants.map(p => [p.id, p]));
  const groups: DiagramGroup[] = currentData.groups || [];

  const messageGap = 55;
  const startY = 120;
  const calculatedMessages = (currentData.messages || []).map((msg, idx) => {
    const y = msg.y !== undefined && msg.y !== null ? msg.y : (startY + idx * messageGap);
    return { ...msg, y };
  });

  type MessageRef = typeof calculatedMessages[number] | { y: number };

  const findMsg = (ref: string | number | undefined) => {
    if (ref === undefined || ref === null) return null;
    if (typeof ref === 'number') {
      if (ref < 100) return calculatedMessages[ref] || null;
      return { y: ref } satisfies MessageRef;
    }
    const parsedIdx = parseInt(ref, 10);
    if (!isNaN(parsedIdx) && String(parsedIdx) === String(ref)) {
      if (parsedIdx < 100) return calculatedMessages[parsedIdx] || null;
      return { y: parsedIdx } satisfies MessageRef;
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
          onMouseDown={onMouseDown}
        >
          <SvgDefs variant="sequence" />

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
                        strokeDashoffset={((staticExportTime % 1.5) / 1.5) * -24}
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
                        strokeDashoffset={((staticExportTime % 1.5) / 1.5) * -24}
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
                <SvgLabel label={part.label} x={part.x ?? 0} y={part.y ?? 50} color={theme.text} />
                {selectedNodeIds.has(part.id) && (
                  <SelectionOverlay shape="rect" x={part.x ?? 0} y={part.y ?? 50} width={w} height={h} rx={rx + 4} />
                )}
              </g>
            );
          })}

          {marquee && <MarqueeRect marquee={marquee} />}
        </svg>
      </div>
    </div>
  );
}
