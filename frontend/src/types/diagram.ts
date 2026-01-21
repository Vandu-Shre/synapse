export type NodeType = "react" | "db" | "api" | "service" | "queue" | "cache" | "cloud" | "text";

export type DiagramNode = {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Port = "top" | "right" | "bottom" | "left";

export type DiagramEdge = {
  id: string;
  fromNodeId: string;
  fromPort: Port;
  toNodeId: string;
  toPort: Port;
};

export type StrokeTool = "pen" | "highlighter";

export type StrokePoint = { x: number; y: number };

export type DiagramStroke = {
  id: string;
  tool: StrokeTool;
  points: StrokePoint[];
  width: number;
  opacity: number;
};
