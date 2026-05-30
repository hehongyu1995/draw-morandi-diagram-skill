// TypeScript definitions for FlowCraft Diagram DSL

export interface DiagramNode {
  id: string;
  type: 'rect' | 'circle' | 'capsule' | 'database' | 'file';
  theme: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
}

export interface Connection {
  from: string;
  to: string;
  lineType?: 'solid' | 'dashed' | 'dotted';
  curve?: 'straight' | 'bezier';
  fromOffset?: [number, number];
  toOffset?: [number, number];
  animate?: boolean;
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
  y: number;
  height: number;
}

export interface Message {
  from: string;
  to: string;
  y: number;
  label: string;
  lineType?: 'solid' | 'dashed';
  animate?: boolean;
}

export interface Note {
  participant: string;
  y: number;
  label: string;
  align?: 'left' | 'right';
  width?: number;
  height?: number;
}

export interface DiagramSpec {
  type?: 'sequence';
  width?: number;
  height?: number;
  nodes?: DiagramNode[];
  connections?: Connection[];
  participants?: Participant[];
  activations?: Activation[];
  messages?: Message[];
  notes?: Note[];
}

export interface ThemeColors {
  bg: string;
  border: string;
  text: string;
}

export interface ThemeMap {
  [key: string]: ThemeColors;
}
