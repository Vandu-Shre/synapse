import { create } from "zustand";

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

const NODE_TEMPLATES: Record<NodeType, { width: number; height: number; label: string }> = {
  react: { width: 120, height: 80, label: "React" },
  db: { width: 120, height: 80, label: "DB" },
  api: { width: 140, height: 80, label: "API" },
  service: { width: 150, height: 80, label: "Service" },
  queue: { width: 140, height: 80, label: "Queue" },
  cache: { width: 140, height: 80, label: "Cache" },
  cloud: { width: 150, height: 90, label: "Cloud" },
  text: { width: 180, height: 60, label: "Text" },
};

type DiagramState = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  strokes: DiagramStroke[];

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
  upsertEdgeRecord: (edge: DiagramEdge) => void;
  addEdgeRecord: (edge: DiagramEdge) => void;

  // stroke actions
  upsertStrokeRecord: (stroke: DiagramStroke) => void;
  addStrokeRecord: (stroke: DiagramStroke) => void;
  deleteStroke: (id: string) => void;
};

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  strokes: [],

  addNode: (type, x, y) => {
    const id = crypto.randomUUID();
    const tpl = NODE_TEMPLATES[type] ?? { width: 120, height: 80, label: type };

    const node: DiagramNode = {
      id,
      type,
      label: tpl.label,
      x,
      y,
      width: tpl.width,
      height: tpl.height,
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

  upsertEdgeRecord: (edge) => {
    set((s) => {
      const idx = s.edges.findIndex((e) => e.id === edge.id);
      if (idx === -1) return { edges: [...s.edges, edge] };
      const next = s.edges.slice();
      next[idx] = edge;
      return { edges: next };
    });
  },

  addEdgeRecord: (edge) => {
    const exists = get().edges.some((e) => e.id === edge.id);
    if (exists) return;

    set((s) => ({ edges: [...s.edges, edge] }));
  },

  upsertStrokeRecord: (stroke) => {
    set((s) => {
      const idx = s.strokes.findIndex((x) => x.id === stroke.id);
      if (idx === -1) return { strokes: [...s.strokes, stroke] };
      const next = s.strokes.slice();
      next[idx] = stroke;
      return { strokes: next };
    });
  },

  addStrokeRecord: (stroke) => {
    const exists = get().strokes.some((s) => s.id === stroke.id);
    if (exists) return;

    set((st) => ({ strokes: [...st.strokes, stroke] }));
  },

  deleteStroke: (id) => {
    set((st) => ({ strokes: st.strokes.filter((s) => s.id !== id) }));
  },
}));
