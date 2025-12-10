"use client";

import { useEffect } from "react";
import { useRoomStore } from "@/store/useRoomStore";
import Canvas from "./Canvas";

export default function RoomClient({ roomId }: { roomId: string }) {
  const { setRoomId, userId, socketStatus } = useRoomStore();

  useEffect(() => {
    setRoomId(roomId);
  }, [roomId, setRoomId]);

  return (
  <>
    <Canvas />
  </>
);
}
