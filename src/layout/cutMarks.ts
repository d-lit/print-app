import type { Placement } from '../types/layout.ts'
import type { Rect } from './geometry.ts'
import { EPSILON } from './geometry.ts'

export interface CutMark {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function getCutMarks(placements: readonly Placement[], width: number, height: number): CutMark[] {
  const marks: CutMark[] = []
  const seen = new Set<string>()
  const offset = 0.4
  const length = 3
  const halfStroke = 0.06

  function add(mark: CutMark) {
    const horizontal = mark.y1 === mark.y2
    const fixed = horizontal ? mark.y1 : mark.x1
    const start = horizontal ? mark.x1 : mark.y1
    const desiredEnd = horizontal ? mark.x2 : mark.y2
    const direction = Math.sign(desiredEnd - start)
    const limit = horizontal ? width : height
    const fixedLimit = horizontal ? height : width
    if (fixed < halfStroke || fixed > fixedLimit - halfStroke || start < halfStroke || start > limit - halfStroke) return
    let end = Math.max(halfStroke, Math.min(limit - halfStroke, desiredEnd))
    for (const photo of placements) {
      const near = (horizontal ? photo.y : photo.x) - halfStroke
      const far = (horizontal ? photo.y + photo.height : photo.x + photo.width) + halfStroke
      if (fixed <= near || fixed >= far) continue
      const low = (horizontal ? photo.x : photo.y) - halfStroke
      const high = (horizontal ? photo.x + photo.width : photo.y + photo.height) + halfStroke
      if (start >= low && start <= high) return
      if (direction > 0 && low > start) end = Math.min(end, low - EPSILON)
      if (direction < 0 && high < start) end = Math.max(end, high + EPSILON)
    }
    if ((end - start) * direction < 0.2) return
    mark = horizontal ? { ...mark, x2: end } : { ...mark, y2: end }
    const key = [mark.x1, mark.y1, mark.x2, mark.y2].map(n => n.toFixed(6)).join(',')
    if (seen.has(key)) return
    seen.add(key)
    marks.push(mark)
  }

  for (const slot of placements) {
    for (const [x, dx] of [[slot.x, -1], [slot.x + slot.width, 1]]) {
      for (const [y, dy] of [[slot.y, -1], [slot.y + slot.height, 1]]) {
        add({ x1: x + dx * offset, y1: y, x2: x + dx * (offset + length), y2: y })
        add({ x1: x, y1: y + dy * offset, x2: x, y2: y + dy * (offset + length) })
      }
    }
  }
  return marks
}

/** Exact finished-print edges. Merge shared edges so a zero gap does not double-print dashes. */
export function getDashedCutLines(rects: readonly Rect[]): CutMark[] {
  const groups = new Map<string, { horizontal: boolean; at: number; ranges: [number, number][] }>()
  function edge(horizontal: boolean, at: number, start: number, end: number) {
    const key = `${horizontal ? 'h' : 'v'}:${at.toFixed(6)}`
    const group = groups.get(key) ?? { horizontal, at, ranges: [] }
    group.ranges.push([start, end])
    groups.set(key, group)
  }
  for (const rect of rects) {
    edge(true, rect.y, rect.x, rect.x + rect.width)
    edge(true, rect.y + rect.height, rect.x, rect.x + rect.width)
    edge(false, rect.x, rect.y, rect.y + rect.height)
    edge(false, rect.x + rect.width, rect.y, rect.y + rect.height)
  }
  const lines: CutMark[] = []
  for (const { horizontal, at, ranges } of groups.values()) {
    const merged: [number, number][] = []
    for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
      const last = merged.at(-1)
      if (last && start <= last[1] + EPSILON) last[1] = Math.max(last[1], end)
      else merged.push([start, end])
    }
    for (const [start, end] of merged) lines.push(horizontal
      ? { x1: start, y1: at, x2: end, y2: at }
      : { x1: at, y1: start, x2: at, y2: end })
  }
  return lines
}
