import assert from 'node:assert/strict'
import test from 'node:test'
import { fittedSize, imageBounds, naturalPrintSize, photoRotation } from './imageFit.ts'
import type { Placement } from '../types/layout.ts'

const photo = { id: 'portrait', widthPx: 600, heightPx: 800 }
const slot: Placement = { photoId: photo.id, x: 5, y: 5, width: 100, height: 150, rotation: 0 }
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} should equal ${b}`)

test('3:4 source fits 100 × 150 as 100 × 133.33 without stretching or cropping', () => {
  const size = fittedSize(photo, 100, 150)
  near(size.width, 100)
  near(size.height, 400 / 3)
})

test('compact contain aligns the actual source edges with the slot top and left', () => {
  const bounds = imageBounds(slot, photo, 'start')
  assert.equal(bounds.x, 5)
  assert.equal(bounds.y, 5)
  near(bounds.height, 400 / 3)
})

test('edge alignment works after an independent 90-degree image rotation', () => {
  const rotated: Placement = { ...slot, width: 150, height: 100, rotation: 90 }
  const bounds = imageBounds(rotated, photo, 'start')
  assert.equal(bounds.x, 5)
  assert.equal(bounds.y, 5)
  near(bounds.width, 400 / 3)
  near(bounds.height, 100)
})

test('contain in a cutting grid centers the full source canvas in the finished print', () => {
  const bounds = imageBounds(slot, photo)
  near(bounds.x, 5)
  near(bounds.y, 5 + (150 - 400 / 3) / 2)
})

test('natural size keeps physical scale independent of the candidate frame orientation', () => {
  assert.deepEqual(naturalPrintSize(photo, 100, 150), naturalPrintSize(photo, 150, 100))
  const landscape = { ...photo, widthPx: 800, heightPx: 600 }
  const size = naturalPrintSize(landscape, 100, 150)
  near(size.width, 400 / 3)
  near(size.height, 100)
})

test('rotation chooses more complete framing, and can be disabled', () => {
  assert.equal(photoRotation(photo, 150, 100, true), 90)
  assert.equal(photoRotation(photo, 150, 100, false), 0)
  assert.equal(photoRotation({ ...photo, widthPx: 800, heightPx: 800 }, 150, 100, true), 0)
})
