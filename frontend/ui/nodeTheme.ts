import type { NodeType } from "@/store/useDiagramStore";

export const NODE_THEME: Record<
  NodeType,
  { fill: string; stroke: string; text: string }
> = {
  react: {
    fill: "rgba(109, 94, 252, 0.10)",
    stroke: "rgba(109, 94, 252, 0.55)",
    text: "#0f172a",
  },
  db: {
    fill: "rgba(102, 211, 199, 0.12)",
    stroke: "rgba(102, 211, 199, 0.60)",
    text: "#0f172a",
  },
  api: {
    fill: "rgba(255, 119, 200, 0.10)",
    stroke: "rgba(255, 119, 200, 0.55)",
    text: "#0f172a",
  },
  service: {
    fill: "rgba(255, 190, 92, 0.12)",
    stroke: "rgba(255, 190, 92, 0.60)",
    text: "#0f172a",
  },
  queue: {
    fill: "rgba(120, 205, 255, 0.11)",
    stroke: "rgba(120, 205, 255, 0.58)",
    text: "#0f172a",
  },
  cache: {
    fill: "rgba(140, 255, 190, 0.10)",
    stroke: "rgba(140, 255, 190, 0.55)",
    text: "#0f172a",
  },
  cloud: {
    fill: "rgba(180, 190, 255, 0.10)",
    stroke: "rgba(180, 190, 255, 0.55)",
    text: "#0f172a",
  },
  text: {
    fill: "rgba(15, 23, 42, 0.03)",
    stroke: "rgba(15, 23, 42, 0.18)",
    text: "#0f172a",
  },
};
