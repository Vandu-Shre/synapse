import { create } from "zustand";

export type NodeType = "react" | "db";

export type DiagramNode = {
  id: string;
  type: NodeType;
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

type DiagramState = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];

  // local actions
  addNode: (type: NodeType, x: number, y: number) => DiagramNode;
  moveNode: (id: string, x: number, y: number) => void;
  getNode: (id: string) => DiagramNode | undefined;
  addEdge: (
    fromNodeId: string,
    toNodeId: string,
    fromPort: "top" | "right" | "bottom" | "left",
    toPort: "top" | "right" | "bottom" | "left"
    ) => DiagramEdge;

  // remote-safe actions
  upsertNode: (node: DiagramNode) => void;
  addEdgeRecord: (edge: DiagramEdge) => void;
};

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],

  addNode: (type, x, y) => {
    const id = crypto.randomUUID();
    const node: DiagramNode = {
      id,
      type,
      x,
      y,
      width: 120,
      height: 80,
    };
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
    return node;
  },

  moveNode: (id, x, y) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }));
  },

  getNode: (id) => get().nodes.find((n) => n.id === id),

  addEdge: (fromNodeId, toNodeId, fromPort, toPort) => {
    const edge: DiagramEdge = {
        id: crypto.randomUUID(),
        fromNodeId,
        fromPort,
        toNodeId,
        toPort,
    };

    set((s) => ({ edges: [...s.edges, edge] }));
    return edge;
  },

  upsertNode: (node) => {
    const existing = get().nodes.find((n) => n.id === node.id);
    if (existing) {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === node.id ? { ...n, ...node } : n)),
      }));
    } else {
      set((s) => ({ nodes: [...s.nodes, node] }));
    }
  },

  addEdgeRecord: (edge) => {
    const exists = get().edges.some((e) => e.id === edge.id);
    if (exists) return;

    set((s) => ({ edges: [...s.edges, edge] }));
  },

}));
