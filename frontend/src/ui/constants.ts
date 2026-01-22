/**
 * Layout and interaction constants used across the application
 */

// Hit detection thresholds
export const HIT_THRESHOLD = {
  default: 10,
  snap: 18,
} as const;

// Stroke dimensions
export const STROKE = {
  penWidth: 3,
  highlighterWidth: 14,
  penOpacity: 1,
  highlighterOpacity: 0.35,
} as const;

// Throttle intervals (ms)
export const THROTTLE = {
  mouseMoveMs: 30,
} as const;

// Viewport breakpoints
export const BREAKPOINT = {
  mobile: 800,
} as const;

// Node dimensions
export const NODE = {
  defaultWidth: 120,
  defaultHeight: 80,
} as const;

// Layout safe zones
export const SAFE_ZONE = {
  paletteWidth: 320,
  palettePadding: 16,
  margin: 16,
  toolbarHeight: 60,
} as const;

// Computed safe zones
export const SAFE_LEFT = SAFE_ZONE.palettePadding + SAFE_ZONE.paletteWidth + SAFE_ZONE.margin;
export const SAFE_TOP = SAFE_ZONE.margin + SAFE_ZONE.toolbarHeight;

// Mobile responsive
export const MOBILE = {
  padding: 24,
  minDimension: 1,
} as const;

// All port positions
export const ALL_PORTS = ["top", "right", "bottom", "left"] as const;
