"use client";

import { useEffect } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { sendAction } from "@/lib/ws/send";

type Params = {
  roomId: string;
  userId: string;
  wsRef: React.RefObject<WebSocket | null>;
};

export function useDiagramHotkeys({ roomId, userId, wsRef }: Params) {
  // Delete selected node or edge
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      // ✅ Only block if actively editing text (textarea consumes backspace)
      const editing = useDiagramStore.getState().editingTextId;
      if (editing) return;

      const makeDelete = useDiagramStore.getState().deleteSelectedAsAction;
      const apply = useDiagramStore.getState().applyAction;

      const action = makeDelete(userId);
      if (!action) return;

      e.preventDefault();
      apply(action);
      sendAction(wsRef, roomId, action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomId, userId, wsRef]);

  // Enter to edit selected text (when not already editing)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const store = useDiagramStore.getState();
      if (store.editingTextId) return;
      const selected = store.selectedTextId;
      if (!selected) return;

      e.preventDefault();
      store.setEditingTextId(selected);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Undo / Redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      // ✅ Undo: Ctrl/Cmd+Z
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();

        const store = useDiagramStore.getState();
        const undoStack = store.undoStack;

        console.log("⏪ Undo triggered, stack size:", undoStack.length);

        if (undoStack.length === 0) {
          console.log("  ↳ Nothing to undo");
          return;
        }

        const lastAction = undoStack[undoStack.length - 1];
        console.log("  ↳ Undoing:", lastAction.type, lastAction.id);

        // Create inverse action
        const inverse = createInverseAction(lastAction, userId);
        if (!inverse) {
          console.error("  ❌ Cannot create inverse for:", lastAction.type);
          return;
        }

        console.log("  ↳ Inverse action:", inverse.type, inverse.id);

        // Pop from undo, push to redo
        useDiagramStore.setState((s) => ({
          undoStack: s.undoStack.slice(0, -1),
          redoStack: [...s.redoStack, lastAction],
        }));

        // Apply inverse locally (skip undo stack since we manually managed it)
        store.applyAction(inverse, true);

        // Broadcast inverse
        sendAction(wsRef, roomId, inverse);
        return;
      }

      // ✅ Redo: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
      if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();

        const store = useDiagramStore.getState();
        const redoStack = store.redoStack;

        console.log("⏩ Redo triggered, stack size:", redoStack.length);

        if (redoStack.length === 0) {
          console.log("  ↳ Nothing to redo");
          return;
        }

        const nextAction = redoStack[redoStack.length - 1];
        console.log("  ↳ Redoing:", nextAction.type, nextAction.id);

        // Pop from redo, push to undo
        useDiagramStore.setState((s) => ({
          redoStack: s.redoStack.slice(0, -1),
          undoStack: [...s.undoStack, nextAction],
        }));

        // Reapply action locally (skip undo stack since we manually managed it)
        store.applyAction(nextAction, true);

        // Broadcast reapplied action
        sendAction(wsRef, roomId, nextAction);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomId, userId, wsRef]);
}

// ✅ Helper: Create inverse action
function createInverseAction(action: any, userId: string): any {
  const base = {
    id: crypto.randomUUID(),
    userId,
    ts: Date.now(),
  };

  switch (action.type) {
    case "ADD_NODE":
      return { ...base, type: "DELETE_NODE", payload: { node: action.payload.node, edges: [] } };

    case "MOVE_NODE":
      return {
        ...base,
        type: "MOVE_NODE",
        payload: {
          nodeId: action.payload.nodeId,
          from: action.payload.to,
          to: action.payload.from,
        },
      };

    case "DELETE_NODE":
      return {
        ...base,
        type: "RESTORE_NODE",
        payload: {
          node: action.payload.node,
          edges: action.payload.edges ?? [],
        },
      };

    case "RESTORE_NODE":
      return { ...base, type: "DELETE_NODE", payload: { node: action.payload.node, edges: [] } };

    case "ADD_EDGE":
      return { ...base, type: "DELETE_EDGE", payload: { edge: action.payload.edge } };

    case "DELETE_EDGE":
      return { ...base, type: "ADD_EDGE", payload: { edge: action.payload.edge } };

    case "ADD_STROKE":
      return { ...base, type: "DELETE_STROKE", payload: { stroke: action.payload.stroke } };

    case "DELETE_STROKE":
      return { ...base, type: "ADD_STROKE", payload: { stroke: action.payload.stroke } };

    case "ADD_TEXT":
      return { ...base, type: "DELETE_TEXT", payload: { text: action.payload.text } };

    case "MOVE_TEXT":
      return {
        ...base,
        type: "MOVE_TEXT",
        payload: {
          textId: action.payload.textId,
          from: action.payload.to,
          to: action.payload.from,
        },
      };

    case "UPDATE_TEXT":
      return {
        ...base,
        type: "UPDATE_TEXT",
        payload: {
          textId: action.payload.textId,
          from: action.payload.to,
          to: action.payload.from,
        },
      };

    case "DELETE_TEXT":
      return { ...base, type: "ADD_TEXT", payload: { text: action.payload.text } };

    default:
      console.error("⚠️ Unknown action type for inverse:", action.type);
      return null;
  }
}
