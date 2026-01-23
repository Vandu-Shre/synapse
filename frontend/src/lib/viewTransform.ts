export type ViewTransform = {
  vw: number;
  vh: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

let view: ViewTransform = { vw: 0, vh: 0, scale: 1, offsetX: 0, offsetY: 0 };

export function setViewTransform(next: ViewTransform) {
  view = next;
}

export function getViewTransform(): ViewTransform {
  return view;
}

// screen -> world
export function screenToWorld(x: number, y: number) {
  const { scale, offsetX, offsetY } = view;
  return { x: (x - offsetX) / scale, y: (y - offsetY) / scale };
}

// world -> screen
export function worldToScreen(x: number, y: number) {
  const { scale, offsetX, offsetY } = view;
  return { x: x * scale + offsetX, y: y * scale + offsetY };
}
