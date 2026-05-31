interface SvgLabelProps {
  label: string;
  x: number;
  y: number;
  color: string;
}

export function SvgLabel({ label, x, y, color }: SvgLabelProps) {
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
  }

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
