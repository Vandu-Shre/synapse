"use client";

import { RefObject } from "react";
import { sendAction } from "@/lib/ws/send";
import { useDiagramStore } from "@/store/useDiagramStore";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import styles from "@/app/room/[roomId]/room.module.css";

type CanvasHudProps = {
  wsRef: RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
};

// ✅ Helper: Create inverse action (copied from useDiagramHotkeys)
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
      return null;
  }
}

export function CanvasHud({ wsRef, roomId, userId }: CanvasHudProps) {
  const deleteSelected = useDiagramStore((s) => s.deleteSelectedAsAction);
  const apply = useDiagramStore((s) => s.applyAction);
  const selectedTextId = useDiagramStore((s) => s.selectedTextId);
  const setEditingTextId = useDiagramStore((s) => s.setEditingTextId);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const store = useDiagramStore.getState();
    const undoStack = store.undoStack;

    console.log("⏪ Undo (button) triggered, stack size:", undoStack.length);

    if (undoStack.length === 0) {
      console.log("  ↳ Nothing to undo");
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    console.log("  ↳ Undoing:", lastAction.type, lastAction.id);

    // ✅ Create inverse action
    const inverse = createInverseAction(lastAction, userId);
    if (!inverse) {
      console.error("  ❌ Cannot create inverse for:", lastAction.type);
      return;
    }

    console.log("  ↳ Inverse action:", inverse.type, inverse.id);

    // ✅ Pop from undo, push to redo
    useDiagramStore.setState((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, lastAction],
    }));

    // ✅ Apply inverse locally (skip undo stack since we manually managed it)
    apply(inverse, true);

    // ✅ Broadcast inverse
    sendAction(wsRef, roomId, inverse);
  };

  const handleRedo = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const store = useDiagramStore.getState();
    const redoStack = store.redoStack;

    console.log("⏩ Redo (button) triggered, stack size:", redoStack.length);

    if (redoStack.length === 0) {
      console.log("  ↳ Nothing to redo");
      return;
    }

    const nextAction = redoStack[redoStack.length - 1];
    console.log("  ↳ Redoing:", nextAction.type, nextAction.id);

    // ✅ Pop from redo, push to undo
    useDiagramStore.setState((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, nextAction],
    }));

    // ✅ Reapply action locally (skip undo stack since we manually managed it)
    apply(nextAction, true);

    // ✅ Broadcast reapplied action
    sendAction(wsRef, roomId, nextAction);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedTextId) return;
    setEditingTextId(selectedTextId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const action = deleteSelected(userId);
    if (!action) return;
    apply(action);
    sendAction(wsRef, roomId, action);
  };

  return (
    <>
      <div className={styles.themeToggleWrapper}>
        <ThemeToggle />
      </div>
      <div className={styles.badge} aria-label="Synapse">
        <span aria-hidden className={styles.badgeIcon}>🧠</span>
        <span className={styles.label}> Synapse</span>
      </div>

      <div
        className={styles.hud}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        onMouseMove={stopPropagation}
        onClick={stopPropagation}
      >
        <button
          onMouseDown={stopPropagation}
          onClick={handleUndo}
          className={styles.hudButton}
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo"
        >
          <span aria-hidden>↩️</span>
          <span className={styles.label}>Undo</span>
        </button>

        <button
          onMouseDown={stopPropagation}
          onClick={handleRedo}
          className={styles.hudButton}
          title="Redo (Ctrl/Cmd+Shift+Z)"
          aria-label="Redo"
        >
          <span aria-hidden>↪️</span>
          <span className={styles.label}>Redo</span>
        </button>

        <button
          onMouseDown={stopPropagation}
          onClick={handleEdit}
          className={styles.hudButton}
          title="Edit text (Enter)"
          aria-label="Edit text"
          disabled={!selectedTextId}
        >
          <span aria-hidden>✏️</span>
          <span className={styles.label}>Edit</span>
        </button>

        <button
          onMouseDown={stopPropagation}
          onClick={handleDelete}
          className={`${styles.hudButton} ${styles.hudButtonDanger}`}
          title="Delete (Backspace)"
          aria-label="Delete"
        >
          <span aria-hidden>🗑</span>
          <span className={styles.label}>Delete</span>
        </button>
      </div>
    </>
  );
}
