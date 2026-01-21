import type { CSSProperties } from "react";

export const canvasStyles = {
  wrapper: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    margin: 0,
    padding: 0,
    overflow: "hidden",
    background: "transparent",
    boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.04)",
  } as CSSProperties,

  background: {
    position: "absolute",
    inset: 0,
    background: `
      radial-gradient(1000px 600px at 18% 12%, rgba(109, 94, 252, 0.08), transparent 60%),
      radial-gradient(900px 600px at 88% 16%, rgba(255, 119, 200, 0.07), transparent 62%),
      radial-gradient(900px 600px at 62% 92%, rgba(102, 211, 199, 0.07), transparent 62%),
      radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.045) 1px, transparent 0) 0 0 / 28px 28px,
      linear-gradient(#ffffff, #ffffff)
    `,
    pointerEvents: "none",
  } as CSSProperties,

  layer: {
    position: "absolute",
    inset: 0,
    display: "block",
  } as CSSProperties,

  inkLayer: {
    position: "absolute",
    inset: 0,
    background: "transparent",
    display: "block",
  } as CSSProperties,

  badge: {
    position: "absolute",
    left: 16,
    bottom: 16,
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15,23,42,0.10)",
    boxShadow: "0 18px 55px rgba(15,23,42,0.12)",
    backdropFilter: "blur(12px)",
    fontWeight: 800,
    color: "#0f172a",
    fontSize: 13,
    zIndex: 40,
  } as CSSProperties,

  hud: {
    position: "absolute",
    right: 16,
    bottom: 16,
    display: "flex",
    gap: 8,
    zIndex: 60,
  } as CSSProperties,

  hudButton: {
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15,23,42,0.10)",
    boxShadow: "0 18px 55px rgba(15,23,42,0.12)",
    backdropFilter: "blur(12px)",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
    color: "#0f172a",
  } as CSSProperties,
};
