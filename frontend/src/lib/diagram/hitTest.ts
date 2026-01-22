import type { DiagramNode, DiagramEdge, DiagramStroke } from "@/types/diagram";
import { getPortPosition } from "./ports";
import { HIT_THRESHOLD } from "@/ui/constants";

/**
 * Performs hit testing to find a node at the given coordinates
 * Searches from top to bottom (reverse order for z-index)
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param nodes - Array of nodes to test
 * @returns The topmost node at the coordinates, or null
 */
export function hitTestNode(
  x: number,
  y: number,
  nodes: DiagramNode[]
): DiagramNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const isInside =
      x >= node.x &&
      x <= node.x + node.width &&
      y >= node.y &&
      y <= node.y + node.height;

    if (isInside) return node;
  }
  return null;
}

/**
 * Performs hit testing to find a stroke at the given coordinates
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param strokes - Array of strokes to test
 * @param threshold - Hit detection radius (default: 10)
 * @returns The stroke if found, or null
 */
export function hitTestStroke(
  x: number,
  y: number,
  strokes: DiagramStroke[],
  threshold = HIT_THRESHOLD.default
): DiagramStroke | null {
  const thresholdSquared = threshold * threshold;

  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    for (const point of stroke.points) {
      const dx = point.x - x;
      const dy = point.y - y;
      if (dx * dx + dy * dy <= thresholdSquared) {
        return stroke;
      }
    }
  }
  return null;
}

/**
 * Performs hit testing to find an edge at the given coordinates
 * Uses distance to line segment algorithm
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param edges - Array of edges to test
 * @param nodes - Array of nodes (needed to compute edge positions)
 * @param threshold - Hit detection radius (default: 10)
 * @returns The edge if found, or null
 */
export function hitTestEdge(
  x: number,
  y: number,
  edges: DiagramEdge[],
  nodes: DiagramNode[],
  threshold = HIT_THRESHOLD.default
): DiagramEdge | null {
  for (let i = edges.length - 1; i >= 0; i--) {
    const edge = edges[i];
    const from = nodes.find((n) => n.id === edge.fromNodeId);
    const to = nodes.find((n) => n.id === edge.toNodeId);

    if (!from || !to) continue;

    const p1 = getPortPosition(from, edge.fromPort);
    const p2 = getPortPosition(to, edge.toPort);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) continue;

    // Project point onto line segment
    const t = Math.max(
      0,
      Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared)
    );

    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;

    const distX = x - closestX;
    const distY = y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist <= threshold) return edge;
  }
  return null;
}
