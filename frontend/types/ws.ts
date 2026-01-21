import type { DiagramAction } from "@/store/diagramActions";

export type WSMessage =
  | { type: "join-room"; roomId: string; userId: string }
  | { type: "diagram:action"; roomId: string; action: DiagramAction }
  | { type: "node:add"; roomId: string; userId: string; node: any }
  | { type: "node:move"; roomId: string; userId: string; nodeId: string; x: number; y: number }
  | { type: "edge:add"; roomId: string; userId: string; edge: any }
  | { type: "stroke:add"; roomId: string; userId: string; stroke: any }
  | { type: "stroke:delete"; roomId: string; userId: string; strokeId: string }
  | { type: "room:state"; nodes: any[]; edges: any[]; strokes: any[] };
