import type { Placement } from '../types/layout.ts'

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
  const length = 1
  const halfStroke = 0.06

  function add(mark: CutMark) {
    const left = Math.min(mark.x1, mark.x2) - halfStroke
    const right = Math.max(mark.x1, mark.x2) + halfStroke
    const top = Math.min(mark.y1, mark.y2) - halfStroke
    const bottom = Math.max(mark.y1, mark.y2) + halfStroke
    if (left < 0 || top < 0 || right > width || bottom > height) return
    if (placements.some(p => left < p.x + p.width && right > p.x && top < p.y + p.height && bottom > p.y)) return
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
