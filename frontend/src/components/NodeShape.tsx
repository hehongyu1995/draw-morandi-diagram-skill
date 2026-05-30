import React from 'react';
import { THEMES } from '../constants';

interface NodeShapeProps {
  id: string;
  type: 'rect' | 'circle' | 'capsule' | 'database' | 'file';
  themeName: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export const NodeShape: React.FC<NodeShapeProps> = ({
  id,
  type,
  themeName,
  x,
  y,
  width,
  height
}) => {
  const theme = THEMES[themeName] || THEMES.gray;
  const w = type === 'circle' ? 50 : (width || 110);
  const h = type === 'circle' ? 50 : (height || 50);

  if (type === 'circle') {
    return (
      <circle
        cx={x}
        cy={y}
        r={25}
        fill={theme.bg}
        stroke={theme.border}
        className="node-shape"
        data-id={id}
        strokeWidth="1.5"
      />
    );
  }

  if (type === 'capsule') {
    const rx = h / 2;
    return (
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={rx}
        fill={theme.bg}
        stroke={theme.border}
        className="node-shape"
        data-id={id}
        strokeWidth="1.5"
      />
    );
  }

  if (type === 'database') {
    const rx = w / 2;
    const ry = Math.min(12, h / 4);
    const topY = y - h / 2;
    const bottomY = y + h / 2;
    
    return (
      <g className="node-shape" data-id={id}>
        {/* Cylinder Main Body (Base and Sides) */}
        <path
          d={`M ${x - rx} ${topY + ry} 
               L ${x - rx} ${bottomY - ry} 
               A ${rx} ${ry} 0 0 0 ${x + rx} ${bottomY - ry} 
               L ${x + rx} ${topY + ry} Z`}
          fill={theme.bg}
          stroke={theme.border}
          strokeWidth="1.5"
        />
        {/* Bottom Lip Contour */}
        <path
          d={`M ${x - rx} ${bottomY - ry} A ${rx} ${ry} 0 0 0 ${x + rx} ${bottomY - ry}`}
          fill="none"
          stroke={theme.border}
          strokeWidth="1.5"
        />
        {/* Cylinder Top Lid */}
        <ellipse
          cx={x}
          cy={topY + ry}
          rx={rx}
          ry={ry}
          fill={theme.bg}
          stroke={theme.border}
          strokeWidth="1.5"
        />
      </g>
    );
  }

  if (type === 'file') {
    const rx = w / 2;
    const ry = h / 2;
    const foldSize = Math.min(15, w / 4, h / 4);
    
    const pathD = `M ${x - rx} ${y - ry} 
                   L ${x + rx - foldSize} ${y - ry} 
                   L ${x + rx} ${y - ry + foldSize} 
                   L ${x + rx} ${y + ry} 
                   L ${x - rx} ${y + ry} Z`;
                   
    const foldD = `M ${x + rx - foldSize} ${y - ry} 
                   L ${x + rx - foldSize} ${y - ry + foldSize} 
                   L ${x + rx} ${y - ry + foldSize}`;
                   
    return (
      <g className="node-shape" data-id={id}>
        {/* Main Document Body */}
        <path
          d={pathD}
          fill={theme.bg}
          stroke={theme.border}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Folded Corner Hook */}
        <path
          d={foldD}
          fill="none"
          stroke={theme.border}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  // Default Standard rounded rectangle
  return (
    <rect
      x={x - w / 2}
      y={y - h / 2}
      width={w}
      height={h}
      rx="3"
      fill={theme.bg}
      stroke={theme.border}
      className="node-shape"
      data-id={id}
      strokeWidth="1.5"
    />
  );
};
