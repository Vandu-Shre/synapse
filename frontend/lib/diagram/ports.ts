import type { DiagramNode, Port } from "@/types/diagram";

type NodeBounds = Pick<DiagramNode, "x" | "y" | "width" | "height">;

export function getPortPosition(
  node: NodeBounds,
  port: Port
): { x: number; y: number } {
  switch (port) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y };
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case "left":
      return { x: node.x, y: node.y + node.height / 2 };
  }
}

export function getNearestPort(node: NodeBounds, x: number, y: number): Port {
  const ports: Port[] = ["top", "right", "bottom", "left"];

  let best: Port = ports[0];
  let bestDist = Infinity;

  for (const p of ports) {
    const pos = getPortPosition(node, p);
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = dx * dx + dy * dy;

    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  return best;
}

export function isWithinSnapDistance(
  node: NodeBounds,
  x: number,
  y: number,
  threshold = 18
): boolean {
  const ports: Port[] = ["top", "right", "bottom", "left"];

  for (const p of ports) {
    const pos = getPortPosition(node, p);
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= threshold) return true;
  }

  return false;
}
