import type { Placement } from '../types/layout.ts'
import { contains, EPSILON, intersects } from './geometry.ts'
import type { Rect } from './geometry.ts'

export interface Slot {
  photoId: string
  width: number
  height: number
  order: number
}

interface PackedPage {
  placements: Placement[]
  remaining: Slot[]
}

function splitFreeRectangles(free: Rect[], used: Rect): Rect[] {
  const next: Rect[] = []
  for (const rect of free) {
    if (!intersects(rect, used)) {
      next.push(rect)
      continue
    }
    if (used.x > rect.x + EPSILON) {
      next.push({ ...rect, width: used.x - rect.x })
    }
    if (used.x + used.width < rect.x + rect.width - EPSILON) {
      next.push({ ...rect, x: used.x + used.width, width: rect.x + rect.width - used.x - used.width })
    }
    if (used.y > rect.y + EPSILON) {
      next.push({ ...rect, height: used.y - rect.y })
    }
    if (used.y + used.height < rect.y + rect.height - EPSILON) {
      next.push({ ...rect, y: used.y + used.height, height: rect.y + rect.height - used.y - used.height })
    }
  }
  return next.filter((rect, i) => !next.some((other, j) =>
    i !== j && contains(other, rect) && (!contains(rect, other) || j < i),
  ))
}

function compareScore(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > EPSILON) return a[i] - b[i]
  }
  return 0
}

function packOrdered(
  slots: readonly Slot[], width: number, height: number,
  margin: number, gap: number, autoRotate: boolean,
): PackedPage {
  // Inflating both the bin and slots adds internal gaps without charging a gap at the sheet edge.
  let free: Rect[] = [{ x: margin, y: margin, width: width - 2 * margin + gap, height: height - 2 * margin + gap }]
  const placements: Placement[] = []
  const remaining: Slot[] = []
  for (const slot of slots) {
    let best: { rect: Rect; rotation: 0 | 90; score: number[] } | undefined
    for (const rect of free) {
      for (const rotation of (autoRotate ? [0, 90] : [0]) as (0 | 90)[]) {
        const w = (rotation === 90 ? slot.height : slot.width) + gap
        const h = (rotation === 90 ? slot.width : slot.height) + gap
        if (w > rect.width + EPSILON || h > rect.height + EPSILON) continue
        const dw = rect.width - w
        const dh = rect.height - h
        const score = [Math.min(dw, dh), Math.max(dw, dh), rect.y, rect.x, rotation]
        if (!best || compareScore(score, best.score) < 0) {
          best = { rect: { x: rect.x, y: rect.y, width: w, height: h }, rotation, score }
        }
      }
    }
    if (!best) {
      remaining.push(slot)
      continue
    }
    placements.push({
      photoId: slot.photoId, x: best.rect.x, y: best.rect.y,
      width: best.rotation === 90 ? slot.height : slot.width,
      height: best.rotation === 90 ? slot.width : slot.height,
      rotation: best.rotation,
    })
    free = splitFreeRectangles(free, best.rect)
  }
  return { placements, remaining }
}

export function rotationCount(placements: readonly Placement[]): number {
  return placements.filter(p => p.rotation === 90).length
}

function footprint(placements: readonly Placement[]): number {
  if (!placements.length) return 0
  return Math.max(...placements.map(p => p.x + p.width)) * Math.max(...placements.map(p => p.y + p.height))
}

export function packPage(
  slots: readonly Slot[], width: number, height: number,
  margin: number, gap: number, autoRotate: boolean,
): PackedPage {
  const strategies = [
    [...slots].sort((a, b) => a.order - b.order),
    [...slots].sort((a, b) => b.width * b.height - a.width * a.height || a.order - b.order),
    [...slots].sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height) || a.order - b.order),
  ]
  let best: PackedPage | undefined
  for (const ordered of strategies) {
    for (const allowRotation of autoRotate ? [false, true] : [false]) {
      const result = packOrdered(ordered, width, height, margin, gap, allowRotation)
      if (!best || compareScore(
        [-result.placements.length, rotationCount(result.placements), footprint(result.placements)],
        [-best.placements.length, rotationCount(best.placements), footprint(best.placements)],
      ) < 0) best = result
    }
  }
  return best!
}
