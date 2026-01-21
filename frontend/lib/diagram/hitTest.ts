import type { DiagramNode, DiagramEdge, DiagramStroke } from "@/types/diagram";
import { getPortPosition } from "./ports";

export function hitTestNode(
  x: number,
  y: number,
  nodes: DiagramNode[]
): DiagramNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const inside =
      x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height;
    if (inside) return n;
  }
  return null;
}

export function hitTestStroke(
  x: number,
  y: number,
  strokes: DiagramStroke[],
  threshold = 10
): DiagramStroke | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    for (const p of s.points) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= threshold * threshold) return s;
    }
  }
  return null;
}

export function hitTestEdge(
  x: number,
  y: number,
  edges: DiagramEdge[],
  nodes: DiagramNode[],
  threshold = 10
): DiagramEdge | null {
  for (let i = edges.length - 1; i >= 0; i--) {
    const e = edges[i];
    const from = nodes.find((n) => n.id === e.fromNodeId);
    const to = nodes.find((n) => n.id === e.toNodeId);
    if (!from || !to) continue;

    const p1 = getPortPosition(from, e.fromPort);
    const p2 = getPortPosition(to, e.toPort);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const t = Math.max(
      0,
      Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / (len * len))
    );
    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;

    const distX = x - closestX;
    const distY = y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist <= threshold) return e;
  }
  return null;
}
