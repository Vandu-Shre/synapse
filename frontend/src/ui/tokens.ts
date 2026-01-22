// Design tokens for consistent styling across the application

// Border Radius
export const RADIUS = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  full: 999,
} as const;

// Spacing
export const SPACING = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
} as const;

// Font Weights
export const FONT_WEIGHT = {
  regular: 400,
  medium: 600,
  semibold: 650,
  bold: 800,
  black: 900,
} as const;

// Font Sizes
export const FONT_SIZE = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 18,
} as const;

// Transitions
export const TRANSITION = {
  fast: "all 0.15s ease",
  medium: "all 0.18s ease",
  slow: "all 0.2s ease",
} as const;

// Blur values
export const BLUR = {
  sm: "blur(2px)",
  md: "blur(10px)",
  lg: "blur(12px)",
} as const;

// UI Colors (CSS variables)
export const ui = {
  glassBg: "var(--panel)",
  glassBgStrong: "rgba(255, 255, 255, 0.92)",
  border: "var(--border)",
  shadow: "var(--shadow)",
  shadowSoft: "var(--shadow-soft)",
  text: "var(--text)",
  muted: "var(--muted)",
  accentSoft: "rgba(109, 94, 252, 0.10)",
  accentBorder: "rgba(109, 94, 252, 0.28)",
} as const;

// Opacity levels
export const OPACITY = {
  transparent: 0,
  low: 0.35,
  medium: 0.6,
  high: 0.85,
  full: 1,
} as const;
