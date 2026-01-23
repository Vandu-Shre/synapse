import type { NodeType } from "@/types";

// Color opacity constants
const FILL_OPACITY_LOW = 0.1;
const FILL_OPACITY_MEDIUM = 0.12;
const STROKE_OPACITY_STANDARD = 0.55;
const STROKE_OPACITY_HIGH = 0.6;
const STROKE_OPACITY_MEDIUM = 0.58;

const TEXT_COLOR = "#0f172a";

interface NodeTheme {
  fill: string;
  stroke: string;
  text: string;
}

/**
 * Theme configuration for different node types
 * Defines fill, stroke, and text colors for visual consistency
 */
export const NODE_THEME: Record<NodeType, NodeTheme> = {
  react: {
    fill: `rgba(109, 94, 252, ${FILL_OPACITY_LOW})`,
    stroke: `rgba(109, 94, 252, ${STROKE_OPACITY_STANDARD})`,
    text: TEXT_COLOR,
  },
  db: {
    fill: `rgba(102, 211, 199, ${FILL_OPACITY_MEDIUM})`,
    stroke: `rgba(102, 211, 199, ${STROKE_OPACITY_HIGH})`,
    text: TEXT_COLOR,
  },
  api: {
    fill: `rgba(255, 119, 200, ${FILL_OPACITY_LOW})`,
    stroke: `rgba(255, 119, 200, ${STROKE_OPACITY_STANDARD})`,
    text: TEXT_COLOR,
  },
  service: {
    fill: `rgba(255, 190, 92, ${FILL_OPACITY_MEDIUM})`,
    stroke: `rgba(255, 190, 92, ${STROKE_OPACITY_HIGH})`,
    text: TEXT_COLOR,
  },
  queue: {
    fill: `rgba(120, 205, 255, 0.11)`,
    stroke: `rgba(120, 205, 255, ${STROKE_OPACITY_MEDIUM})`,
    text: TEXT_COLOR,
  },
  cache: {
    fill: `rgba(140, 255, 190, ${FILL_OPACITY_LOW})`,
    stroke: `rgba(140, 255, 190, ${STROKE_OPACITY_STANDARD})`,
    text: TEXT_COLOR,
  },
  cloud: {
    fill: `rgba(180, 190, 255, ${FILL_OPACITY_LOW})`,
    stroke: `rgba(180, 190, 255, ${STROKE_OPACITY_STANDARD})`,
    text: TEXT_COLOR,
  }
};
