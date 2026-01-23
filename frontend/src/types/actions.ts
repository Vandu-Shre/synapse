import type { DiagramNode, DiagramEdge, DiagramStroke, DiagramText } from "./diagram";

type BaseAction = {
  id: string;
  userId: string;
  ts: number;
};

export type AddNodeAction = BaseAction & {
  type: "ADD_NODE";
  payload: { node: DiagramNode };
};

export type MoveNodeAction = BaseAction & {
  type: "MOVE_NODE";
  payload: {
    nodeId: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
  };
};

export type DeleteNodeAction = BaseAction & {
  type: "DELETE_NODE";
  payload: { node: DiagramNode; edges: DiagramEdge[] };
};

export type RestoreNodeAction = BaseAction & {
  type: "RESTORE_NODE";
  payload: { node: DiagramNode; edges: DiagramEdge[] };
};

export type AddEdgeAction = BaseAction & {
  type: "ADD_EDGE";
  payload: { edge: DiagramEdge };
};

export type DeleteEdgeAction = BaseAction & {
  type: "DELETE_EDGE";
  payload: { edge: DiagramEdge };
};

export type AddStrokeAction = BaseAction & {
  type: "ADD_STROKE";
  payload: { stroke: DiagramStroke };
};

export type DeleteStrokeAction = BaseAction & {
  type: "DELETE_STROKE";
  payload: { stroke: DiagramStroke };
};

export type AddTextAction = BaseAction & {
  type: "ADD_TEXT";
  payload: { text: DiagramText };
};

export type MoveTextAction = BaseAction & {
  type: "MOVE_TEXT";
  payload: {
    textId: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
  };
};

export type UpdateTextAction = BaseAction & {
  type: "UPDATE_TEXT";
  payload: {
    textId: string;
    from: { value: string; width: number; height: number };
    to: { value: string; width: number; height: number };
  };
};

export type DeleteTextAction = BaseAction & {
  type: "DELETE_TEXT";
  payload: { text: DiagramText };
};

export type DiagramAction =
  | AddNodeAction
  | MoveNodeAction
  | DeleteNodeAction
  | RestoreNodeAction
  | AddEdgeAction
  | DeleteEdgeAction
  | AddStrokeAction
  | DeleteStrokeAction
  | AddTextAction
  | MoveTextAction
  | UpdateTextAction
  | DeleteTextAction;
