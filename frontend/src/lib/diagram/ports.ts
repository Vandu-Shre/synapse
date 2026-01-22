import type { DiagramNode, Port } from "@/types/diagram";
import { HIT_THRESHOLD, ALL_PORTS } from "@/ui/constants";

type NodeBounds = Pick<DiagramNode, "x" | "y" | "width" | "height">;

/**
 * Calculates the absolute position of a port on a node
 */
export function getPortPosition(
  node: NodeBounds,
  port: Port
): { x: number; y: number } {
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;

  switch (port) {
    case "top":
      return { x: centerX, y: node.y };
    case "right":
      return { x: node.x + node.width, y: centerY };
    case "bottom":
      return { x: centerX, y: node.y + node.height };
    case "left":
      return { x: node.x, y: centerY };
  }
}

/**
 * Finds the nearest port on a node to a given point
 */
export function getNearestPort(node: NodeBounds, x: number, y: number): Port {
  let best: Port = ALL_PORTS[0];
  let bestDist = Infinity;

  for (const port of ALL_PORTS) {
    const pos = getPortPosition(node, port);
    const dx = pos.x - x;
    const dy = pos.y - y;
    const distSquared = dx * dx + dy * dy;

    if (distSquared < bestDist) {
      bestDist = distSquared;
      best = port;
    }
  }

  return best;
}

/**
 * Checks if a point is within snap distance of any port on a node
 */
export function isWithinSnapDistance(
  node: NodeBounds,
  x: number,
  y: number,
  threshold = HIT_THRESHOLD.snap
): boolean {
  return ALL_PORTS.some((port) => {
    const pos = getPortPosition(node, port);
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= threshold;
  });
}
