export const EPSILON = 1e-6

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width - EPSILON &&
    a.x + a.width > b.x + EPSILON &&
    a.y < b.y + b.height - EPSILON &&
    a.y + a.height > b.y + EPSILON
}

export function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x - EPSILON && inner.y >= outer.y - EPSILON &&
    inner.x + inner.width <= outer.x + outer.width + EPSILON &&
    inner.y + inner.height <= outer.y + outer.height + EPSILON
}
