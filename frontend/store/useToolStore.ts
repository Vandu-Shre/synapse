import { create } from "zustand";

export type ToolMode = "select" | "connect" | "pen" | "highlighter" | "eraser";

type ToolState = {
  tool: ToolMode;
  setTool: (t: ToolMode) => void;

  // optional: last mouse position for "add at cursor"
  lastPointer: { x: number; y: number } | null;
  setLastPointer: (p: { x: number; y: number }) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  tool: "select",
  setTool: (tool) => set({ tool }),

  lastPointer: null,
  setLastPointer: (p) => set({ lastPointer: p }),
}));
