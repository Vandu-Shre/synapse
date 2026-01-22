"use client";

import { RefObject, useRef, useCallback, useMemo } from "react";
import { CanvasLayers, CanvasHud } from "@/components/canvas";
import {
  useCanvasResize,
  useCanvasSeed,
  useCanvasRenderer,
  useCanvasInteractions,
} from "@/hooks/canvas";
import { useBoardViewTransform } from "@/hooks/canvas/useBoardViewTransform";
import styles from "./room.module.css";

type CanvasProps = {
  wsRef: RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
  wsReady: boolean;
  hasRoomState: boolean;
};

export default function Canvas({
  wsRef,
  roomId,
  userId,
  wsReady,
  hasRoomState,
}: CanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<HTMLCanvasElement>(null);

  const canvasRefs = useMemo(() => [inkRef, strokesRef, nodesRef], []);

  const resizeTick = useCanvasResize(wrapperRef, canvasRefs);
  useBoardViewTransform(wrapperRef);
  useCanvasSeed(wsRef, roomId, userId, wsReady, hasRoomState);

  const inkStart = useCallback((x: number, y: number) => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const inkMove = useCallback((x: number, y: number) => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const inkHandlers = useMemo(() => ({ inkStart, inkMove }), [inkStart, inkMove]);

  const { edgeDraft, snapPreview, activeStroke, onDown, onMove, onUp } =
    useCanvasInteractions(wsRef, roomId, userId, inkHandlers);

  useCanvasRenderer(nodesRef, strokesRef, edgeDraft, snapPreview, activeStroke, resizeTick);

  return (
    <div
      ref={wrapperRef}
      className={styles.canvasWrapper}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      <CanvasLayers inkRef={inkRef} strokesRef={strokesRef} nodesRef={nodesRef} />
      <CanvasHud wsRef={wsRef} roomId={roomId} userId={userId} />
    </div>
  );
}
