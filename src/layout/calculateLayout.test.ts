import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateLayout } from './calculateLayout.ts'
import { EPSILON } from './geometry.ts'
import type { Layout, LayoutInput, LayoutPhoto } from '../types/layout.ts'

const photos = (n: number): LayoutPhoto[] => Array.from({ length: n }, (_, i) => ({
  id: `photo-${i}`, widthPx: i % 3 === 0 ? 1500 : 1000, heightPx: i % 3 === 0 ? 1000 : 1500,
}))

function input(overrides: Partial<LayoutInput> = {}): LayoutInput {
  return { paper: { width: 210, height: 297 }, photos: photos(10), mode: { kind: 'size', width: 100, height: 150 }, autoRotate: true, ...overrides }
}

function successful(value: LayoutInput): Layout {
  const result = calculateLayout(value)
  if (!result.ok) assert.fail(result.error.message)
  checkInvariants(value, result.layout)
  return result.layout
}

function checkInvariants(value: LayoutInput, layout: Layout) {
  const margin = value.margin ?? 5
  const gap = value.gap ?? 3
  const all = layout.pages.flatMap(page => page.placements)
  assert.deepEqual(all.map(p => p.photoId).sort(), value.photos.map(p => p.id).sort())
  assert.equal(new Set(all.map(p => p.photoId)).size, value.photos.length)
  for (const page of layout.pages) {
    assert.ok(page.placements.length)
    if (value.mode.kind === 'count') assert.ok(page.placements.length <= value.mode.count)
    for (const placement of page.placements) {
      for (const number of [placement.x, placement.y, placement.width, placement.height]) assert.ok(Number.isFinite(number))
      assert.ok(placement.width > 0 && placement.height > 0)
      assert.ok(placement.x >= margin - EPSILON && placement.y >= margin - EPSILON)
      assert.ok(placement.x + placement.width <= layout.width - margin + EPSILON)
      assert.ok(placement.y + placement.height <= layout.height - margin + EPSILON)
      assert.ok(placement.rotation === 0 || placement.rotation === 90)
      if (!value.autoRotate) assert.equal(placement.rotation, 0)
      if (value.mode.kind === 'size') {
        assert.deepEqual([placement.width, placement.height].sort((a, b) => a - b).map(n => Math.round(n * 1e6)),
          [value.mode.width, value.mode.height].sort((a, b) => a - b).map(n => Math.round(n * 1e6)))
      } else {
        const source = value.photos.find(p => p.id === placement.photoId)!
        const ratio = placement.rotation === 90 ? placement.height / placement.width : placement.width / placement.height
        assert.ok(Math.abs(ratio - source.widthPx / source.heightPx) < EPSILON)
        assert.ok(Math.abs(Math.max(placement.width, placement.height) - layout.longSide!) < EPSILON)
      }
    }
    for (let i = 0; i < page.placements.length; i++) {
      for (let j = i + 1; j < page.placements.length; j++) {
        const a = page.placements[i]
        const b = page.placements[j]
        assert.ok(
          a.x + a.width + gap <= b.x + EPSILON || b.x + b.width + gap <= a.x + EPSILON ||
          a.y + a.height + gap <= b.y + EPSILON || b.y + b.height + gap <= a.y + EPSILON,
          `Intersecting or insufficiently separated slots: ${a.photoId}, ${b.photoId}`,
        )
      }
    }
  }
}

test('empty input creates no pages', () => {
  assert.equal(successful(input({ photos: [] })).pages.length, 0)
})

test('two 100 × 150 mm prints fit A4 on a single page', () => {
  assert.equal(successful(input({ photos: photos(2) })).pages.length, 1)
})

test('mixed native orientations coexist without forcing a common direction', () => {
  const layout = successful(input({ photos: photos(3), mode: { kind: 'size', width: 60, height: 90 }, autoRotate: false }))
  assert.equal(layout.pages.length, 1)
  assert.ok(layout.pages[0].placements.some(p => p.width > p.height))
  assert.ok(layout.pages[0].placements.some(p => p.width < p.height))
})

test('individual auto rotation saves a page on a known mixed set', () => {
  const value = input({ photos: photos(11), mode: { kind: 'size', width: 40, height: 80 }, autoRotate: false })
  const off = successful(value)
  const on = successful({ ...value, autoRotate: true })
  assert.equal(off.pages.length, 2)
  assert.equal(on.pages.length, 1)
  assert.ok(on.pages[0].placements.some(p => p.rotation === 90))
  assert.ok(on.pages[0].placements.some(p => p.rotation === 0))
})

test('multiple pages contain each photo once', () => {
  assert.equal(successful(input()).pages.length, 5)
})

test('exact printable boundary fits without reserving an extra outside gap', () => {
  const layout = successful(input({ photos: [{ id: 'edge', widthPx: 200, heightPx: 287 }], mode: { kind: 'size', width: 200, height: 287 }, autoRotate: false }))
  assert.equal(layout.pages.length, 1)
  assert.equal(layout.pages[0].placements[0].x, 5)
  assert.equal(layout.pages[0].placements[0].y, 5)
})

test('oversized print fails without resizing or silently dropping photos', () => {
  const result = calculateLayout(input({ paper: { width: 100, height: 150 } }))
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'does-not-fit')
})

for (const count of [1, 4, 12]) {
  test(`count mode enforces ${count} photos per full sheet`, () => {
    const layout = successful(input({ photos: photos(25), mode: { kind: 'count', count } }))
    assert.deepEqual(layout.pages.map(p => p.placements.length), Array.from({ length: Math.ceil(25 / count) }, (_, i) => Math.min(count, 25 - i * count)))
  })
}

test('count mode has 4, 4, 2 slots and equal long sides', () => {
  const layout = successful(input({ mode: { kind: 'count', count: 4 } }))
  assert.deepEqual(layout.pages.map(p => p.placements.length), [4, 4, 2])
  assert.ok(layout.longSide! > 0)
})

test('fewer than N photos are not duplicated', () => {
  const layout = successful(input({ photos: photos(2), mode: { kind: 'count', count: 12 } }))
  assert.equal(layout.pages.length, 1)
  assert.equal(layout.pages[0].placements.length, 2)
})

test('four square photos reach the known A4 maximum of 98.5 mm', () => {
  const layout = successful(input({ photos: photos(4).map(p => ({ ...p, widthPx: 1000, heightPx: 1000 })), mode: { kind: 'count', count: 4 } }))
  assert.equal(layout.longSide, 98.5)
})

test('count mode with rotation off keeps native aspect and orientation', () => {
  successful(input({ photos: photos(13), autoRotate: false, mode: { kind: 'count', count: 6 } }))
})

for (const paper of [{ width: 297, height: 420 }, { width: 148, height: 210 }, { width: 216, height: 279 }, { width: 100, height: 150 }]) {
  test(`paper ${paper.width} × ${paper.height} preserves dimensions and boundaries`, () => {
    const layout = successful(input({ paper, mode: { kind: 'count', count: 4 } }))
    assert.deepEqual([layout.width, layout.height].sort((a, b) => a - b), [paper.width, paper.height])
  })
}

test('invalid settings are rejected', () => {
  for (const width of [0, -1, NaN, Infinity]) {
    assert.equal(calculateLayout(input({ mode: { kind: 'size', width, height: 150 } })).ok, false)
    assert.equal(calculateLayout(input({ paper: { width, height: 297 } })).ok, false)
  }
  for (const count of [0, -1, 1.5, 13, NaN, Infinity]) {
    assert.equal(calculateLayout(input({ mode: { kind: 'count', count } })).ok, false)
  }
  for (const margin of [-1, NaN, Infinity, 200]) assert.equal(calculateLayout(input({ margin })).ok, false)
  assert.equal(calculateLayout(input({ gap: -1 })).ok, false)
  assert.equal(calculateLayout(input({ photos: [{ id: 'bad', widthPx: 0, heightPx: 10 }] })).ok, false)
  assert.equal(calculateLayout(input({ photos: [photos(1)[0], photos(1)[0]] })).ok, false)
})

test('zero margins and gaps are valid', () => {
  successful(input({ margin: 0, gap: 0 }))
})

test('results are deterministic and inputs are not mutated', () => {
  const value = input({ mode: { kind: 'count', count: 6 } })
  const before = structuredClone(value)
  const first = successful(value)
  for (let i = 0; i < 5; i++) assert.deepEqual(successful(value), first)
  assert.deepEqual(value, before)
})

test('seeded mixed sets satisfy all invariants in both modes and rotation states', () => {
  let seed = 314159
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32 }
  for (let sample = 0; sample < 20; sample++) {
    const set = Array.from({ length: 1 + Math.floor(random() * 50) }, (_, i) => ({ id: `seed-${i}`, widthPx: 200 + Math.floor(random() * 6000), heightPx: 200 + Math.floor(random() * 6000) }))
    for (const autoRotate of [false, true]) {
      successful(input({ photos: set, autoRotate, mode: { kind: 'size', width: 30 + random() * 60, height: 40 + random() * 70 } }))
      successful(input({ photos: set, autoRotate, mode: { kind: 'count', count: 1 + Math.floor(random() * 12) } }))
    }
  }
})
