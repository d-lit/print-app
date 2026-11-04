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
      if (value.mode.kind === 'size' && value.mode.fit !== 'natural') {
        assert.deepEqual([placement.width, placement.height].sort((a, b) => a - b).map(n => Math.round(n * 1e6)),
          [value.mode.width, value.mode.height].sort((a, b) => a - b).map(n => Math.round(n * 1e6)))
      } else {
        const source = value.photos.find(p => p.id === placement.photoId)!
        const ratio = placement.rotation === 90 ? placement.height / placement.width : placement.width / placement.height
        assert.ok(Math.abs(ratio - source.widthPx / source.heightPx) < EPSILON)
        if (value.mode.kind === 'count') {
          assert.ok(Math.abs(Math.max(placement.width, placement.height) - layout.longSide!) < EPSILON)
        } else {
          const [small, large] = [placement.width, placement.height].sort((a, b) => a - b)
          const [maxSmall, maxLarge] = [value.mode.width, value.mode.height].sort((a, b) => a - b)
          assert.ok(small <= maxSmall + EPSILON && large <= maxLarge + EPSILON)
          assert.ok(Math.abs(small - maxSmall) < EPSILON || Math.abs(large - maxLarge) < EPSILON, 'Natural prints must not shrink to pack more photos')
        }
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

test('compact mode keeps mixed native slot orientations', () => {
  const layout = successful(input({ photos: photos(3), mode: { kind: 'size', width: 60, height: 90, arrangement: 'compact' }, autoRotate: false }))
  assert.equal(layout.pages.length, 1)
  assert.ok(layout.pages[0].placements.some(p => p.width > p.height))
  assert.ok(layout.pages[0].placements.some(p => p.width < p.height))
})

test('individual auto rotation saves a page in compact mode', () => {
  const value = input({ photos: photos(11), mode: { kind: 'size', width: 40, height: 80, arrangement: 'compact' }, autoRotate: false })
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
      successful(input({ photos: set, autoRotate, mode: { kind: 'size', width: 30 + random() * 60, height: 40 + random() * 70, arrangement: 'compact' } }))
      for (const arrangement of ['cut', 'compact'] as const) {
        successful(input({ photos: set, autoRotate, gap: [0, 5, 10][sample % 3], mode: { kind: 'size', width: 60, height: 90, arrangement, fit: 'natural' } }))
      }
      successful(input({ photos: set, autoRotate, mode: { kind: 'count', count: 1 + Math.floor(random() * 12) } }))
    }
  }
})

test('size mode defaults to a grid with common cut lines for mixed photos', () => {
  const layout = successful(input({ photos: photos(17) }))
  assert.ok(layout.grid)
  assert.equal(layout.pages.length, 9)
  const first = layout.pages[0].placements[0]
  for (const page of layout.pages) {
    for (const slot of page.placements) {
      assert.equal(slot.width, first.width)
      assert.equal(slot.height, first.height)
    }
  }
})

test('17 portrait photos use two upright 100 × 150 slots on landscape A4', () => {
  const layout = successful(input({ photos: photos(17).map(p => ({ ...p, widthPx: 1712, heightPx: 2288 })) }))
  assert.equal(layout.orientation, 'landscape')
  assert.deepEqual(layout.grid, { columns: 2, rows: 1 })
  const [a, b] = layout.pages[0].placements
  assert.equal(a.width, 100)
  assert.equal(a.height, 150)
  assert.equal(a.rotation, 0)
  assert.equal(b.rotation, 0)
  assert.equal(a.y, b.y)
  assert.equal(b.x - a.x, 103)
})

test('cut positions stay identical on all pages, including the incomplete last page', () => {
  const layout = successful(input({ photos: photos(17) }))
  const template = layout.pages[0].placements.map(({ photoId: _id, rotation: _rotation, ...rect }) => rect)
  for (const page of layout.pages) {
    assert.deepEqual(page.placements.map(({ photoId: _id, rotation: _rotation, ...rect }) => rect), template.slice(0, page.placements.length))
  }
})

test('grid is centered and separates all rows and columns by the exact gap', () => {
  const layout = successful(input({ photos: photos(30), mode: { kind: 'size', width: 40, height: 60, arrangement: 'cut' } }))
  const page = layout.pages[0]
  const left = Math.min(...page.placements.map(p => p.x))
  const top = Math.min(...page.placements.map(p => p.y))
  const right = Math.max(...page.placements.map(p => p.x + p.width))
  const bottom = Math.max(...page.placements.map(p => p.y + p.height))
  assert.ok(Math.abs(left - (layout.width - right)) < EPSILON)
  assert.ok(Math.abs(top - (layout.height - bottom)) < EPSILON)
  assert.equal(new Set(page.placements.map(p => p.x)).size, layout.grid!.columns)
  assert.equal(new Set(page.placements.map(p => p.y)).size, layout.grid!.rows)
})

test('Auto Rotate off keeps images unrotated inside the common grid', () => {
  const layout = successful(input({ photos: photos(7), autoRotate: false }))
  const slots = layout.pages.flatMap(p => p.placements)
  assert.equal(new Set(slots.map(p => `${p.width}x${p.height}`)).size, 1)
  assert.ok(slots.every(p => p.rotation === 0))
})

test('grid preserves input photo order across pages', () => {
  const value = input({ photos: photos(17) })
  const layout = successful(value)
  assert.deepEqual(layout.pages.flatMap(p => p.placements.map(slot => slot.photoId)), value.photos.map(photo => photo.id))
})

test('compact mode remains available without the grid constraint', () => {
  const layout = successful(input({ mode: { kind: 'size', width: 100, height: 150, arrangement: 'compact' } }))
  assert.equal(layout.grid, undefined)
})

for (const arrangement of ['cut', 'compact'] as const) {
  test(`${arrangement}: crop and white-padding policies preserve exact requested print dimensions`, () => {
    for (const fit of ['contain', 'cover'] as const) {
      const layout = successful(input({ photos: photos(7).map(p => ({ ...p, widthPx: 1712, heightPx: 2288 })), mode: { kind: 'size', width: 100, height: 150, arrangement, fit } }))
      assert.equal(layout.fit, fit)
    }
  })

  test(`${arrangement}: natural prints use source bounds instead of padded 100 × 150 frames`, () => {
    for (const autoRotate of [false, true]) {
      const layout = successful(input({ photos: photos(17).map(p => ({ ...p, widthPx: 600, heightPx: 800 })), autoRotate, mode: { kind: 'size', width: 100, height: 150, arrangement, fit: 'natural' } }))
      for (const p of layout.pages.flatMap(page => page.placements)) {
        assert.ok(Math.abs(Math.min(p.width, p.height) - 100) < EPSILON)
        assert.ok(Math.abs(Math.max(p.width, p.height) - 400 / 3) < EPSILON)
      }
    }
  })
}

test('zero gap allows four natural 3:4 prints on A4 without padded cells', () => {
  const layout = successful(input({ photos: photos(4).map(p => ({ ...p, widthPx: 600, heightPx: 800 })), gap: 0, mode: { kind: 'size', width: 100, height: 150, fit: 'natural' } }))
  assert.equal(layout.pages.length, 1)
  assert.deepEqual(layout.grid, { columns: 2, rows: 2 })
})

test('adjustable 10 mm gaps separate finished prints and keep their physical size', () => {
  const layout = successful(input({ photos: photos(17).map(p => ({ ...p, widthPx: 600, heightPx: 800 })), gap: 10 }))
  const [a, b] = layout.pages[0].placements
  assert.ok(Math.abs(b.x - a.x - a.width - 10) < EPSILON || Math.abs(b.y - a.y - a.height - 10) < EPSILON)
})

test('large gaps create more pages instead of shrinking or overlapping prints', () => {
  const layout = successful(input({ photos: photos(5), gap: 100 }))
  assert.equal(layout.pages.length, 5)
})

test('non-numeric and negative gaps fail validation', () => {
  for (const gap of [NaN, Infinity, -1]) assert.equal(calculateLayout(input({ gap })).ok, false)
})

for (const kind of ['size', 'count'] as const) {
  test(`manual order is respected through all ${kind} pages with mixed source shapes`, () => {
    const ordered = Array.from({ length: 23 }, (_, i) => ({ id: `ordered-${(i * 7) % 23}`, widthPx: 200 + i % 7 * 300, heightPx: 200 + i % 5 * 500 }))
    const mode = kind === 'size'
      ? { kind: 'size' as const, width: 60, height: 90, fit: 'natural' as const, arrangement: 'compact' as const }
      : { kind: 'count' as const, count: 5 }
    for (const autoRotate of [false, true]) {
      const layout = successful(input({ photos: ordered, paper: { width: 148, height: 210 }, mode, autoRotate, preserveOrder: true }))
      assert.deepEqual(layout.pages.flatMap(page => page.placements.map(p => p.photoId)), ordered.map(p => p.id))
    }
  })
}
