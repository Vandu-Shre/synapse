import type { DiagramAction } from "./actions";
import type { DiagramNode, DiagramEdge, DiagramStroke, DiagramText } from "./diagram";

export type JoinRoomMessage = { type: "join-room"; roomId: string; userId: string };

export type DiagramActionMessage = {
  type: "diagram:action";
  roomId: string;
  action: DiagramAction;
};

export type DiagramUndoMessage = { type: "diagram:undo"; roomId: string; userId: string };
export type DiagramRedoMessage = { type: "diagram:redo"; roomId: string; userId: string };

export type RoomStateMessage = {
  type: "room:state";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  strokes: DiagramStroke[];
  texts: DiagramText[];
};

// Legacy messages (keep if server still sends them)
export type LegacyNodeAdd = { type: "node:add"; roomId: string; userId: string; node: DiagramNode };
export type LegacyNodeMove = { type: "node:move"; roomId: string; userId: string; nodeId: string; x: number; y: number };
export type LegacyEdgeAdd = { type: "edge:add"; roomId: string; userId: string; edge: DiagramEdge };
export type LegacyStrokeAdd = { type: "stroke:add"; roomId: string; userId: string; stroke: DiagramStroke };
export type LegacyStrokeDelete = { type: "stroke:delete"; roomId: string; userId: string; strokeId: string };

export type WSMessage =
  | JoinRoomMessage
  | DiagramActionMessage
  | DiagramUndoMessage
  | DiagramRedoMessage
  | RoomStateMessage
  | LegacyNodeAdd
  | LegacyNodeMove
  | LegacyEdgeAdd
  | LegacyStrokeAdd
  | LegacyStrokeDelete;
