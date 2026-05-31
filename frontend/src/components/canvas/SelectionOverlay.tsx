interface SelectionOverlayProps {
  shape: 'circle' | 'rect';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rx?: number | string;
}

export function SelectionOverlay({ shape, x, y, width, height, rx }: SelectionOverlayProps) {
  if (shape === 'circle') {
    return (
      <circle
        cx={x}
        cy={y}
        r={25 + 4}
        fill="none"
        stroke="#5b8bba"
        strokeWidth="2"
        strokeDasharray="4 4"
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  if (width === undefined || height === undefined) return null;

  return (
    <rect
      x={x - width / 2 - 4}
      y={y - height / 2 - 4}
      width={width + 8}
      height={height + 8}
      rx={rx}
      fill="none"
      stroke="#5b8bba"
      strokeWidth="2"
      strokeDasharray="4 4"
      style={{ pointerEvents: 'none' }}
    />
  );
}
