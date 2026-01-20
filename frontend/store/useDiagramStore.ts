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

export type DiagramEdge = {
  id: string;
  fromNodeId: string;
  fromPort: "top" | "right" | "bottom" | "left";
  toNodeId: string;
  toPort: "top" | "right" | "bottom" | "left";
};

type DiagramState = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];

  addNode: (type: NodeType, x: number, y: number) => void;
  moveNode: (id: string, x: number, y: number) => void;
  getNode: (id: string) => DiagramNode | undefined;
  addEdge: (
    fromNodeId: string,
    toNodeId: string,
    fromPort: "top" | "right" | "bottom" | "left",
    toPort: "top" | "right" | "bottom" | "left"
    ) => void;
};

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],

  addNode: (type, x, y) => {
    const id = crypto.randomUUID();
    set((state) => ({
      nodes: [
        ...state.nodes,
        {
          id,
          type,
          x,
          y,
          width: 120,
          height: 80,
        },
      ],
    }));
  },

  moveNode: (id, x, y) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }));
  },

  getNode: (id) => get().nodes.find((n) => n.id === id),

  addEdge: (fromNodeId, toNodeId, fromPort, toPort) => {
    const id = crypto.randomUUID();
    set((state) => ({
        edges: [
        ...state.edges,
        {
            id,
            fromNodeId,
            fromPort,
            toNodeId,
            toPort,
        },
        ],
    }));
  },

}));
