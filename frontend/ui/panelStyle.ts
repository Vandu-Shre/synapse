import type { CSSProperties } from "react";
import { ui } from "./tokens";

export const panelBase: CSSProperties = {
  background: ui.glassBg,
  border: `1px solid ${ui.border}`,
  boxShadow: ui.shadow,
  backdropFilter: "blur(12px)",
  borderRadius: 16,
};

export const panelCard = (radius = 18): CSSProperties => ({
  ...panelBase,
  borderRadius: radius,
});

export const buttonBase: CSSProperties = {
  borderRadius: 12,
  border: "1px solid transparent",
  background: "transparent",
  color: ui.text,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 650,
  transition: "all 0.15s ease",
  fontFamily: "inherit",
};

export const toolButton = (active: boolean): CSSProperties => ({
  ...buttonBase,
  padding: "8px 14px",
  border: active ? `1px solid rgba(109, 94, 252, 0.28)` : "1px solid transparent",
  background: active ? ui.accentSoft : "transparent",
});

export const paletteButton: CSSProperties = {
  ...buttonBase,
  padding: "10px 12px",
  height: 42,
  display: "flex",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
  width: "100%",
  border: `1px solid ${ui.border}`,
  background: ui.glassBgStrong,
};

export const panelStyle = {
  panel: {
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    boxShadow: "0 18px 48px rgba(15,23,42,0.10)",
    backdropFilter: "blur(10px)",
  } as const,

  title: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
  } as const,

  button: {
    base: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.92)",
      color: "#0f172a",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.15s ease",
    } as const,
    active: {
      border: "1px solid rgba(109,94,252,0.35)",
      background: "rgba(109,94,252,0.10)",
    } as const,
  },
};
