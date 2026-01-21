import { create } from "zustand";
import type { DiagramAction } from "@/types/actions";
import type {
  DiagramNode,
  DiagramEdge,
  DiagramStroke,
  NodeType,
  Port,
} from "@/types/diagram";

// Re-export types for backwards compatibility
export type { NodeType, DiagramNode, DiagramEdge, DiagramStroke, Port };
export type { StrokeTool, StrokePoint } from "@/types/diagram";

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
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  setRoomState: (nodes: DiagramNode[], edges: DiagramEdge[], strokes: DiagramStroke[]) => void;
  deleteSelectedNodeAsAction: (userId: string) => DiagramAction | null;
  deleteSelectedEdgeAsAction: (userId: string) => DiagramAction | null;
  applyAction: (action: DiagramAction) => void;
  applyInverse: (action: DiagramAction) => void;

  // local actions
  buildNode: (type: NodeType, x: number, y: number) => DiagramNode;
  moveNode: (id: string, x: number, y: number) => void;
  getNode: (id: string) => DiagramNode | undefined;
  addEdge: (
    fromNodeId: string,
    toNodeId: string,
    fromPort: Port,
    toPort: Port
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
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  selectedEdgeId: null,
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),

  setRoomState: (nodes, edges, strokes) =>
    set({ nodes, edges, strokes, selectedNodeId: null, selectedEdgeId: null }),

  deleteSelectedNodeAsAction: (userId) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) {
      console.warn("❌ No selectedNodeId in store");
      return null;
    }

    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.warn("❌ Selected node not found in nodes array");
      return null;
    }

    const edges = get().edges.filter(
      (e) => e.fromNodeId === nodeId || e.toNodeId === nodeId
    );

    console.log(`📋 Building DELETE_NODE action for ${nodeId}, removing ${edges.length} edges`);

    const action: DiagramAction = {
      id: crypto.randomUUID(),
      userId,
      ts: Date.now(),
      type: "DELETE_NODE",
      payload: { node, edges },
    };

    return action;
  },

  deleteSelectedEdgeAsAction: (userId) => {
    const edgeId = get().selectedEdgeId;
    if (!edgeId) {
      console.warn("❌ No selectedEdgeId in store");
      return null;
    }

    const edge = get().edges.find((e) => e.id === edgeId);
    if (!edge) {
      console.warn("❌ Selected edge not found in edges array");
      return null;
    }

    console.log(`📋 Building DELETE_EDGE action for ${edgeId}`);

    const action: DiagramAction = {
      id: crypto.randomUUID(),
      userId,
      ts: Date.now(),
      type: "DELETE_EDGE",
      payload: { edge },
    };

    return action;
  },

  applyAction: (action) => {
    console.log("🎬 applyAction called with type:", action.type);
    
    set((state) => {
      switch (action.type) {
        case "ADD_NODE": {
          console.log("➕ APPLY ADD_NODE:", action.payload.node.id);
          const node = action.payload.node;
          const idx = state.nodes.findIndex((n) => n.id === node.id);
          if (idx === -1) return { nodes: [...state.nodes, node] };
          const next = state.nodes.slice();
          next[idx] = node;
          return { nodes: next };
        }

        case "MOVE_NODE":
          console.log("🔄 APPLY MOVE_NODE:", action.payload.nodeId);
          return {
            nodes: state.nodes.map((n) =>
              n.id === action.payload.nodeId
                ? { ...n, x: action.payload.to.x, y: action.payload.to.y }
                : n
            ),
          };

        case "DELETE_NODE":
          console.log("💣 APPLY DELETE_NODE:", action.payload.node.id, "removing", action.payload.edges.length, "edges");
          return {
            nodes: state.nodes.filter((n) => n.id !== action.payload.node.id),
            edges: state.edges.filter(
              (e) =>
                e.fromNodeId !== action.payload.node.id &&
                e.toNodeId !== action.payload.node.id
            ),
            selectedNodeId:
              state.selectedNodeId === action.payload.node.id
                ? null
                : state.selectedNodeId,
          };

        case "RESTORE_NODE": {
          console.log("✨ APPLY RESTORE_NODE:", action.payload.node.id, "restoring", action.payload.edges.length, "edges");
          const node = action.payload.node;
          const edges = action.payload.edges ?? [];

          const nodesIdx = state.nodes.findIndex((n) => n.id === node.id);
          const nextNodes =
            nodesIdx === -1
              ? [...state.nodes, node]
              : state.nodes.map((n) => (n.id === node.id ? node : n));

          const nextEdges = state.edges.slice();
          for (const e of edges) {
            const idx = nextEdges.findIndex((x) => x.id === e.id);
            if (idx === -1) nextEdges.push(e);
            else nextEdges[idx] = e;
          }

          return { nodes: nextNodes, edges: nextEdges };
        }

        case "ADD_EDGE": {
          console.log("🔗 APPLY ADD_EDGE:", action.payload.edge.id);
          const edge = action.payload.edge;
          const idx = state.edges.findIndex((e) => e.id === edge.id);
          if (idx === -1) return { edges: [...state.edges, edge] };
          const next = state.edges.slice();
          next[idx] = edge;
          return { edges: next };
        }

        case "DELETE_EDGE":
          console.log("🚫 APPLY DELETE_EDGE:", action.payload.edge.id);
          return {
            edges: state.edges.filter((e) => e.id !== action.payload.edge.id),
            selectedEdgeId:
              state.selectedEdgeId === action.payload.edge.id
                ? null
                : state.selectedEdgeId,
          };

        case "ADD_STROKE": {
          console.log("🖍️ APPLY ADD_STROKE:", action.payload.stroke.id);
          const stroke = action.payload.stroke;
          const idx = state.strokes.findIndex((s) => s.id === stroke.id);
          if (idx === -1) return { strokes: [...state.strokes, stroke] };
          const next = state.strokes.slice();
          next[idx] = stroke;
          return { strokes: next };
        }

        case "DELETE_STROKE":
          console.log("🧹 APPLY DELETE_STROKE:", action.payload.stroke.id);
          return {
            strokes: state.strokes.filter(
              (s) => s.id !== action.payload.stroke.id
            ),
          };

        default:
          console.warn("⚠️ Unknown action type:", (action as any).type);
          return state;
      }
    });
  },

  applyInverse: (action) => {
    set((state) => {
      switch (action.type) {
        case "ADD_NODE":
          return {
            nodes: state.nodes.filter((n) => n.id !== action.payload.node.id),
          };

        case "MOVE_NODE":
          return {
            nodes: state.nodes.map((n) =>
              n.id === action.payload.nodeId
                ? { ...n, x: action.payload.from.x, y: action.payload.from.y }
                : n
            ),
          };

        case "DELETE_NODE":
          return {
            nodes: [...state.nodes, action.payload.node],
            edges: [...state.edges, ...action.payload.edges],
          };

        case "RESTORE_NODE":
          return {
            nodes: state.nodes.filter((n) => n.id !== action.payload.node.id),
          };

        case "ADD_EDGE":
          return {
            edges: state.edges.filter((e) => e.id !== action.payload.edge.id),
          };
        case "DELETE_EDGE":
          return { edges: [...state.edges, action.payload.edge] };
        case "ADD_STROKE":
          return {
            strokes: state.strokes.filter(
              (s) => s.id !== action.payload.stroke.id
            ),
          };
        case "DELETE_STROKE":
          return { strokes: [...state.strokes, action.payload.stroke] };
        default:
          return state;
      }
    });
  },

  buildNode: (type, x, y) => {
    const id = crypto.randomUUID();
    const tpl = NODE_TEMPLATES[type] ?? { width: 120, height: 80, label: type };

    return {
      id,
      type,
      label: tpl.label,
      x,
      y,
      width: tpl.width,
      height: tpl.height,
    };
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
