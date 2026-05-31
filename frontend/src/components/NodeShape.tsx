import React from 'react';
import { THEMES } from '../constants';
import { getNodeDimensions } from '../utils/nodeDimensions';

interface NodeShapeProps {
  id: string;
  type: 'rect' | 'circle' | 'capsule' | 'database' | 'file' | 'person' | 'cloud';
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
  const { w, h } = getNodeDimensions({ type, width, height });

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

  if (type === 'person') {
    const headRadius = Math.min(w * 0.18, h * 0.14);
    const headCy = y - h * 0.28;
    const neckY = headCy + headRadius;
    const hipY = y + h * 0.12;
    const footY = y + h * 0.42;
    const armY = y - h * 0.05;
    const armSpan = w * 0.38;
    const legSpan = w * 0.28;

    return (
      <g className="node-shape" data-id={id}>
        <rect
          x={x - w / 2}
          y={y - h / 2}
          width={w}
          height={h}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
        />
        <circle
          cx={x}
          cy={headCy}
          r={headRadius}
          fill={theme.bg}
          stroke={theme.border}
          strokeWidth="1.8"
        />
        <path
          d={`M ${x} ${neckY} L ${x} ${hipY}
              M ${x - armSpan} ${armY} L ${x + armSpan} ${armY}
              M ${x} ${hipY} L ${x - legSpan} ${footY}
              M ${x} ${hipY} L ${x + legSpan} ${footY}`}
          fill="none"
          stroke={theme.border}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (type === 'cloud') {
    const rx = w / 2;
    const ry = h / 2;
    const cloudPath = `M ${x - rx * 0.5} ${y + ry * 0.6}
      C ${x - rx * 0.7} ${y + ry * 0.6}, ${x - rx * 0.8} ${y + ry * 0.2}, ${x - rx * 0.55} ${y + ry * 0.1}
      C ${x - rx * 0.7} ${y - ry * 0.3}, ${x - rx * 0.3} ${y - ry * 0.7}, ${x} ${y - ry * 0.4}
      C ${x + rx * 0.1} ${y - ry * 0.8}, ${x + rx * 0.5} ${y - ry * 0.7}, ${x + rx * 0.5} ${y - ry * 0.3}
      C ${x + rx * 0.8} ${y - ry * 0.3}, ${x + rx * 0.8} ${y + ry * 0.2}, ${x + rx * 0.5} ${y + ry * 0.4}
      C ${x + rx * 0.7} ${y + ry * 0.5}, ${x + rx * 0.6} ${y + ry * 0.6}, ${x + rx * 0.3} ${y + ry * 0.6}
      Z`;

    return (
      <g className="node-shape" data-id={id}>
        <path
          d={cloudPath}
          fill={theme.bg}
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
