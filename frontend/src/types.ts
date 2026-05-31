// TypeScript definitions for FlowCraft Diagram DSL

export interface DiagramNode {
  id: string;
  type: 'rect' | 'circle' | 'capsule' | 'database' | 'file' | 'person' | 'cloud';
  theme: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  label: string;
}

export type LayoutDirection = 'LR' | 'TB';

export type ConstraintType = 'inline' | 'leftOf' | 'rightOf' | 'above' | 'below';

export type LayoutConstraint =
  | {
      type: 'inline';
      chain: string[];
    }
  | {
      type: Exclude<ConstraintType, 'inline'>;
      nodeId: string;
      refNodeId: string;
    };

export interface LayoutOverrides {
  nodes?: Record<string, { x: number; y: number }>;
}

export interface LayoutConfig {
  direction?: LayoutDirection;
  constraints?: LayoutConstraint[];
  overrides?: LayoutOverrides;
  nodesep?: number;
  ranksep?: number;
  marginx?: number;
  marginy?: number;
}

export interface Connection {
  from: string;
  to: string;
  label?: string;
  lineType?: 'solid' | 'dashed' | 'dotted';
  curve?: 'straight' | 'bezier';
  routing?: 'bezier' | 'orthogonal';
  arrowStyle?: 'filled' | 'open' | 'triangle' | 'diamond' | 'circle';
  fromOffset?: [number, number];
  toOffset?: [number, number];
  animate?: boolean;
  curvature?: number;
  fromCurvature?: number;
  toCurvature?: number;
  points?: Array<{ x: number; y: number }>;
}

export interface Participant {
  id: string;
  theme: string;
  label: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface Activation {
  participant: string;
  y?: number;
  height?: number;
  start?: string | number;
  end?: string | number;
}

export interface Message {
  id?: string;
  from: string;
  to: string;
  y?: number;
  label: string;
  lineType?: 'solid' | 'dashed';
  animate?: boolean;
}

export interface Note {
  participant: string;
  y: number | string;
  label: string;
  align?: 'left' | 'right';
  width?: number;
  height?: number;
}

export interface DiagramGroup {
  id: string;
  label: string;
  theme?: string;
  nodeIds?: string[];
  participants?: string[];
  messageFrom?: string | number;
  messageTo?: string | number;
}

export interface DiagramSpec {
  type?: 'sequence';
  autoLayout?: boolean;
  layout?: LayoutConfig;
  width?: number;
  height?: number;
  nodes?: DiagramNode[];
  connections?: Connection[];
  participants?: Participant[];
  activations?: Activation[];
  messages?: Message[];
  notes?: Note[];
  groups?: DiagramGroup[];
}

export interface ThemeColors {
  bg: string;
  border: string;
  text: string;
}

export interface ThemeMap {
  [key: string]: ThemeColors;
}
