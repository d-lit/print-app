import assert from 'node:assert/strict'
import test from 'node:test'
import { getCutMarks } from './cutMarks.ts'
import { intersects } from './geometry.ts'
import type { Placement } from '../types/layout.ts'

const slots: Placement[] = [
  { photoId: 'a', x: 30, y: 47, width: 150, height: 100, rotation: 90 },
  { photoId: 'b', x: 30, y: 150, width: 150, height: 100, rotation: 0 },
]

test('cut marks identify every corner outside the actual print slots', () => {
  const marks = getCutMarks(slots, 210, 297)
  assert.equal(marks.length, 16)
  for (const mark of marks) {
    assert.ok(mark.x1 === mark.x2 || mark.y1 === mark.y2)
    const rect = {
      x: Math.min(mark.x1, mark.x2) - 0.06,
      y: Math.min(mark.y1, mark.y2) - 0.06,
      width: Math.abs(mark.x2 - mark.x1) + 0.12,
      height: Math.abs(mark.y2 - mark.y1) + 0.12,
    }
    assert.ok(slots.every(slot => !intersects(slot, rect)))
  }
})

test('marks never cross neighbouring photographs, even with no gap', () => {
  const touching = [slots[0], { ...slots[1], y: 147 }]
  for (const mark of getCutMarks(touching, 210, 297)) {
    const rect = {
      x: Math.min(mark.x1, mark.x2) - 0.06,
      y: Math.min(mark.y1, mark.y2) - 0.06,
      width: Math.abs(mark.x2 - mark.x1) + 0.12,
      height: Math.abs(mark.y2 - mark.y1) + 0.12,
    }
    assert.ok(touching.every(slot => !intersects(slot, rect)))
  }
})

test('marks are unique and stay inside the paper on edge-to-edge layouts', () => {
  const edge: Placement = { photoId: 'edge', x: 0, y: 0, width: 210, height: 297, rotation: 0 }
  assert.deepEqual(getCutMarks([edge], 210, 297), [])
  const marks = getCutMarks(slots, 210, 297)
  assert.equal(new Set(marks.map(mark => JSON.stringify(mark))).size, marks.length)
  assert.ok(marks.every(m => m.x1 >= 0 && m.x2 >= 0 && m.y1 >= 0 && m.y2 >= 0 && m.x1 <= 210 && m.x2 <= 210 && m.y1 <= 297 && m.y2 <= 297))
  assert.deepEqual(getCutMarks([], 210, 297), [])
})
