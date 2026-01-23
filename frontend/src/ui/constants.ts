/**
 * UI Constants - centralized magic numbers and thresholds
 */

export const BREAKPOINT = {
  mobile: 800,
} as const;

export const SAFE_ZONE = {
  left: 340,
  top: 76,
} as const;

export const SAFE_LEFT = SAFE_ZONE.left;
export const SAFE_TOP = SAFE_ZONE.top;

export const HIT_THRESHOLD = {
  default: 10,
  snap: 18,
} as const;

export const ALL_PORTS = ["top", "right", "bottom", "left"] as const;

export const NODE = {
  defaultWidth: 120,
  defaultHeight: 80,
  cornerRadius: 18,
} as const;

export const TEXT = {
  defaultWidth: 220,
  defaultHeight: 46,
  cornerRadius: 14,
  padding: 10,
  lineHeight: 18,
} as const;

export const THROTTLE = {
  mouseMoveMs: 30,
} as const;

export const STROKE = {
  penWidth: 3,
  penOpacity: 1,
  highlighterWidth: 14,
  highlighterOpacity: 0.35,
} as const;

export const MOBILE = {
  padding: 24,
  minDimension: 1,
} as const;
