import type { ImageAlignment, LayoutPhoto, Placement } from '../types/layout.ts'
import type { Rect } from './geometry.ts'
import { EPSILON } from './geometry.ts'

export function fittedSize(photo: LayoutPhoto, width: number, height: number, rotation: 0 | 90 = 0) {
  const aspect = rotation === 90 ? photo.heightPx / photo.widthPx : photo.widthPx / photo.heightPx
  return { width: Math.min(width, height * aspect), height: Math.min(height, width / aspect) }
}

export function naturalPrintSize(photo: LayoutPhoto, width: number, height: number) {
  const swap = photo.widthPx !== photo.heightPx && (photo.widthPx > photo.heightPx) !== (width > height)
  return fittedSize(photo, swap ? height : width, swap ? width : height)
}

export function photoRotation(photo: LayoutPhoto, width: number, height: number, autoRotate: boolean): 0 | 90 {
  if (!autoRotate) return 0
  const native = fittedSize(photo, width, height)
  const rotated = fittedSize(photo, width, height, 90)
  return rotated.width * rotated.height > native.width * native.height + EPSILON ? 90 : 0
}

/** Full source canvas, including white or transparent pixels; no content detection. */
export function imageBounds(slot: Placement, photo: LayoutPhoto, alignment: ImageAlignment = 'center'): Rect {
  const size = fittedSize(photo, slot.width, slot.height, slot.rotation)
  return {
    x: slot.x + (alignment === 'start' ? 0 : (slot.width - size.width) / 2),
    y: slot.y + (alignment === 'start' ? 0 : (slot.height - size.height) / 2),
    ...size,
  }
}
