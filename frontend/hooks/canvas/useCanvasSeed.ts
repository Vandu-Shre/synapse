import { useEffect, RefObject } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { sendAction } from "@/lib/ws/send";

export function useCanvasSeed(
  wsRef: RefObject<WebSocket | null>,
  roomId: string,
  userId: string,
  wsReady: boolean,
  hasRoomState: boolean
): void {
  const nodes = useDiagramStore((s) => s.nodes);
  const buildNode = useDiagramStore((s) => s.buildNode);
  const applyAction = useDiagramStore((s) => s.applyAction);

  useEffect(() => {
    if (!roomId || !userId) return;
    if (!wsReady || !hasRoomState) return;
    if (nodes.length !== 0) return;

    const seedKey = `synapse:seeded:${roomId}`;
    if (localStorage.getItem(seedKey) === "1") return;

    console.log("🌱 Seeding initial nodes...");
    const n1 = buildNode("react", 200, 200);
    const n2 = buildNode("db", 500, 320);

    for (const node of [n1, n2]) {
      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "ADD_NODE" as const,
        payload: { node },
      };
      applyAction(action);
      sendAction(wsRef, roomId, action);
    }

    localStorage.setItem(seedKey, "1");
    console.log("✅ Seeded initial nodes");
  }, [wsReady, hasRoomState, roomId, userId, nodes.length, buildNode, applyAction, wsRef]);
}
