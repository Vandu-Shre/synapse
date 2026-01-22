"use client";

import Canvas from "./Canvas";
import { Toolbar } from "@/components/Toolbar";
import { NodePalette } from "@/components/NodePalette";
import { useRoomWebSocket } from "@/hooks/ws/useRoomWebSocket";
import { useDiagramHotkeys } from "@/hooks/canvas/useDiagramHotkeys";

export default function RoomClient({ roomId }: { roomId: string }) {
  const { wsRef, wsReady, hasRoomState, userId } = useRoomWebSocket({ roomId });

  useDiagramHotkeys({ roomId, userId, wsRef });

  return (
    <div className="room-container">
      <Toolbar />
      <NodePalette wsRef={wsRef} roomId={roomId} userId={userId} />
      <Canvas wsRef={wsRef} roomId={roomId} userId={userId} wsReady={wsReady} hasRoomState={hasRoomState} />
    </div>
  );
}
