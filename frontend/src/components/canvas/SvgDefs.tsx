interface SvgDefsProps {
  variant: 'sequence' | 'flowchart';
}

function ArrowSolidMarker() {
  return (
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
  );
}

function DotGlowFilter() {
  return (
    <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

export function SvgDefs({ variant }: SvgDefsProps) {
  if (variant === 'sequence') {
    return (
      <>
        <defs>
          <ArrowSolidMarker />
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
          <DotGlowFilter />
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
      </>
    );
  }

  return (
    <defs>
      <ArrowSolidMarker />

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

      <DotGlowFilter />
    </defs>
  );
}
