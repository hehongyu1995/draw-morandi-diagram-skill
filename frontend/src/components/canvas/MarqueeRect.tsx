interface MarqueeRectProps {
  marquee: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  };
}

export function MarqueeRect({ marquee }: MarqueeRectProps) {
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
}
