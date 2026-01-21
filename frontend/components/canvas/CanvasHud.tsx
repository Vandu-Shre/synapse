"use client";

import { RefObject } from "react";
import { canvasStyles } from "@/ui/canvasStyles";
import { sendUndo, sendRedo } from "@/lib/ws/send";

type CanvasHudProps = {
  wsRef: RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
};

export function CanvasHud({ wsRef, roomId, userId }: CanvasHudProps) {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendUndo(wsRef, roomId, userId);
  };

  const handleRedo = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendRedo(wsRef, roomId, userId);
  };

  return (
    <>
      {/* Synapse badge */}
      <div style={canvasStyles.badge}>🧠 Synapse</div>

      {/* Undo/Redo buttons */}
      <div
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        onMouseMove={stopPropagation}
        onClick={stopPropagation}
        style={canvasStyles.hud}
      >
        <button
          onMouseDown={stopPropagation}
          onClick={handleUndo}
          style={canvasStyles.hudButton}
          title="Undo (Ctrl/Cmd+Z)"
        >
          ↩️ Undo
        </button>

        <button
          onMouseDown={stopPropagation}
          onClick={handleRedo}
          style={canvasStyles.hudButton}
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          ↪️ Redo
        </button>
      </div>
    </>
  );
}
