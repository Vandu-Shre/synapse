import { create } from "zustand";
import type {
  DiagramAction,
  DiagramNode,
  DiagramEdge,
  DiagramStroke,
  DiagramText,
  NodeType,
  Port,
} from "@/types";

// NODE_TEMPLATES 
const NODE_TEMPLATES: Record<NodeType, { width: number; height: number; label: string }> = {
  react: { width: 120, height: 80, label: "React" },
  db: { width: 120, height: 80, label: "DB" },
  api: { width: 140, height: 80, label: "API" },
  service: { width: 150, height: 80, label: "Service" },
  queue: { width: 140, height: 80, label: "Queue" },
  cache: { width: 140, height: 80, label: "Cache" },
  cloud: { width: 150, height: 90, label: "Cloud" },
};

type DiagramState = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  strokes: DiagramStroke[];
  texts: DiagramText[];
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  
  // ✅ Undo/redo stacks
  undoStack: DiagramAction[];
  redoStack: DiagramAction[];
  
  // ✅ Track board snapshot for integrity check
  lastStateSig: string | null;
  
  setRoomState: (nodes: DiagramNode[], edges: DiagramEdge[], strokes: DiagramStroke[], texts: DiagramText[]) => void;
  clearHistory: () => void;
  deleteSelectedNodeAsAction: (userId: string) => DiagramAction | null;
  deleteSelectedEdgeAsAction: (userId: string) => DiagramAction | null;
  deleteSelectedTextAsAction: (userId: string) => DiagramAction | null;
  deleteSelectedAsAction: (userId: string) => DiagramAction | null;
  
  // ✅ Modified: now tracks action in undo stack
  applyAction: (action: DiagramAction, skipUndoStack?: boolean) => void;
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

  // text actions
  buildText: (x: number, y: number) => DiagramText;
  getText: (id: string) => DiagramText | undefined;
};

// ✅ Helper: Compute lightweight signature of board state
function computeStateSig(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  strokes: DiagramStroke[],
  texts: DiagramText[]
): string {
  const parts = [
    nodes.length,
    nodes.map((n) => n.id).join(","),
    edges.length,
    edges.map((e) => e.id).join(","),
    strokes.length,
    strokes.map((s) => s.id).join(","),
    texts.length,
    texts.map((t) => t.id).join(","),
  ];
  return parts.join("|");
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  strokes: [],
  texts: [],
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  selectedEdgeId: null,
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
  selectedTextId: null,
  setSelectedTextId: (id) => set({ selectedTextId: id }),
  editingTextId: null,
  setEditingTextId: (id) => set({ editingTextId: id }),
  
  // ✅ Initialize stacks
  undoStack: [],
  redoStack: [],
  lastStateSig: null,

  // ✅ setRoomState: ONLY updates canvas state, does NOT touch history
  setRoomState: (nodes, edges, strokes, texts) => {
    console.log("📦 setRoomState: updating canvas (preserving history)");
    
    const currentEditingId = get().editingTextId;
    const textStillExists = currentEditingId 
      ? texts.some(t => t.id === currentEditingId) 
      : false;

    const newSig = computeStateSig(nodes, edges, strokes, texts);

    set({
      nodes,
      edges,
      strokes,
      texts,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedTextId: null,
      editingTextId: textStillExists ? currentEditingId : null,
      // ✅ Update signature but DON'T clear history
      lastStateSig: newSig,
    });
  },

  // ✅ clearHistory: called only when joining a NEW room
  clearHistory: () => {
    console.log("🧹 clearHistory: only on room change");
    set({
      undoStack: [],
      redoStack: [],
    });
  },

  deleteSelectedNodeAsAction: (userId) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return null;

    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const edges = get().edges.filter(
      (e) => e.fromNodeId === nodeId || e.toNodeId === nodeId
    );

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
    if (!edgeId) return null;

    const edge = get().edges.find((e) => e.id === edgeId);
    if (!edge) return null;

    const action: DiagramAction = {
      id: crypto.randomUUID(),
      userId,
      ts: Date.now(),
      type: "DELETE_EDGE",
      payload: { edge },
    };

    return action;
  },

  deleteSelectedTextAsAction: (userId) => {
    const textId = get().selectedTextId;
    if (!textId) return null;

    const text = get().texts.find((t) => t.id === textId);
    if (!text) return null;

    const action: DiagramAction = {
      id: crypto.randomUUID(),
      userId,
      ts: Date.now(),
      type: "DELETE_TEXT",
      payload: { text },
    };

    return action;
  },

  deleteSelectedAsAction: (userId) => {
    return (
      get().deleteSelectedTextAsAction(userId) ??
      get().deleteSelectedNodeAsAction(userId) ??
      get().deleteSelectedEdgeAsAction(userId)
    );
  },

  applyAction: (action, skipUndoStack = false) => {
    console.log("🎬 applyAction:", {
      type: action.type,
      id: action.id,
      userId: action.userId,
      skipUndoStack,
      undoStackSize: get().undoStack.length,
      redoStackSize: get().redoStack.length,
    });
    
    set((state) => {
      const updates: Partial<DiagramState> = {};
      
      // ✅ Push to undo stack BEFORE mutation (unless told to skip)
      if (!skipUndoStack) {
        console.log("  ↳ Pushing to undo stack");
        updates.undoStack = [...state.undoStack, action];
        updates.redoStack = []; // Clear redo on new action
      }
      
      switch (action.type) {
        case "ADD_NODE": {
          console.log("  ✅ ADD_NODE:", action.payload.node.id);
          const node = action.payload.node;
          const idx = state.nodes.findIndex((n) => n.id === node.id);
          if (idx === -1) {
            updates.nodes = [...state.nodes, node];
          } else {
            const next = state.nodes.slice();
            next[idx] = node;
            updates.nodes = next;
          }
          break;
        }

        case "MOVE_NODE":
          console.log("  🔄 MOVE_NODE:", action.payload.nodeId, "→", action.payload.to);
          updates.nodes = state.nodes.map((n) =>
            n.id === action.payload.nodeId
              ? { ...n, x: action.payload.to.x, y: action.payload.to.y }
              : n
          );
          break;

        case "DELETE_NODE":
          console.log("  💣 DELETE_NODE:", action.payload.node.id);
          updates.nodes = state.nodes.filter((n) => n.id !== action.payload.node.id);
          updates.edges = state.edges.filter(
            (e) =>
              e.fromNodeId !== action.payload.node.id &&
              e.toNodeId !== action.payload.node.id
          );
          if (state.selectedNodeId === action.payload.node.id) {
            updates.selectedNodeId = null;
          }
          break;

        case "RESTORE_NODE": {
          console.log("  ✨ RESTORE_NODE:", action.payload.node.id);
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

          updates.nodes = nextNodes;
          updates.edges = nextEdges;
          break;
        }

        case "ADD_EDGE": {
          console.log("  🔗 ADD_EDGE:", action.payload.edge.id);
          const edge = action.payload.edge;
          const idx = state.edges.findIndex((e) => e.id === edge.id);
          if (idx === -1) {
            updates.edges = [...state.edges, edge];
          } else {
            const next = state.edges.slice();
            next[idx] = edge;
            updates.edges = next;
          }
          break;
        }

        case "DELETE_EDGE":
          console.log("  🚫 DELETE_EDGE:", action.payload.edge.id);
          updates.edges = state.edges.filter((e) => e.id !== action.payload.edge.id);
          if (state.selectedEdgeId === action.payload.edge.id) {
            updates.selectedEdgeId = null;
          }
          break;

        case "ADD_STROKE": {
          console.log("  🖍️ ADD_STROKE:", action.payload.stroke.id);
          const stroke = action.payload.stroke;
          const idx = state.strokes.findIndex((s) => s.id === stroke.id);
          if (idx === -1) {
            updates.strokes = [...state.strokes, stroke];
          } else {
            const next = state.strokes.slice();
            next[idx] = stroke;
            updates.strokes = next;
          }
          break;
        }

        case "DELETE_STROKE":
          console.log("  🧹 DELETE_STROKE:", action.payload.stroke.id);
          updates.strokes = state.strokes.filter(
            (s) => s.id !== action.payload.stroke.id
          );
          break;

        case "ADD_TEXT": {
          const text = action.payload.text;
          console.log("  📝 ADD_TEXT:", text.id);
          
          const idx = state.texts.findIndex((t) => t.id === text.id);
          if (idx === -1) {
            updates.texts = [...state.texts, text];
          } else {
            const next = state.texts.slice();
            next[idx] = text;
            updates.texts = next;
          }
          break;
        }

        case "MOVE_TEXT":
          console.log("  🔄 MOVE_TEXT:", action.payload.textId);
          updates.texts = state.texts.map((t) =>
            t.id === action.payload.textId
              ? { ...t, x: action.payload.to.x, y: action.payload.to.y }
              : t
          );
          break;

        case "UPDATE_TEXT":
          console.log("  ✏️ UPDATE_TEXT:", action.payload.textId);
          updates.texts = state.texts.map((t) =>
            t.id === action.payload.textId
              ? {
                  ...t,
                  value: action.payload.to.value,
                  width: action.payload.to.width,
                  height: action.payload.to.height,
                }
              : t
          );
          break;

        case "DELETE_TEXT":
          console.log("  🗑️ DELETE_TEXT:", action.payload.text.id);
          updates.texts = state.texts.filter((t) => t.id !== action.payload.text.id);
          if (state.selectedTextId === action.payload.text.id) {
            updates.selectedTextId = null;
          }
          if (state.editingTextId === action.payload.text.id) {
            updates.editingTextId = null;
          }
          break;

        default:
          console.warn("  ⚠️ Unknown action type:", (action as any).type);
      }
      
      console.log("  ↳ Final undo stack size:", updates.undoStack?.length ?? state.undoStack.length);
      return updates;
    });
  },

  applyInverse: (action) => {
    console.log("⏪ applyInverse:", action.type, action.id);
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
        case "ADD_TEXT":
          return {
            texts: state.texts.filter((t) => t.id !== action.payload.text.id),
          };

        case "MOVE_TEXT":
          return {
            texts: state.texts.map((t) =>
              t.id === action.payload.textId
                ? { ...t, x: action.payload.from.x, y: action.payload.from.y }
                : t
            ),
          };

        case "UPDATE_TEXT":
          return {
            texts: state.texts.map((t) =>
              t.id === action.payload.textId
                ? {
                    ...t,
                    value: action.payload.from.value,
                    width: action.payload.from.width,
                    height: action.payload.from.height,
                  }
                : t
            ),
          };

        case "DELETE_TEXT":
          return { texts: [...state.texts, action.payload.text] };

        default:
          return state;
      }
    });
  },

  buildNode: (type, x, y) => {
    const SAFE_LEFT = 340; // palette width + padding
    
    const id = crypto.randomUUID();
    const tpl = NODE_TEMPLATES[type] ?? { width: 120, height: 80, label: type };

    return {
      id,
      type,
      label: tpl.label,
      x: Math.max(x, SAFE_LEFT), // ✅ clamp to prevent spawning behind palette
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

  buildText: (x, y) => {
    const id = crypto.randomUUID();
    return {
      id,
      x,
      y,
      value: "",
      width: 220,
      height: 46,
    };
  },

  getText: (id) => get().texts.find((t) => t.id === id),
}));
