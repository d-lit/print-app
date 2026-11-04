import type { Layout, LayoutInput, LayoutPage, LayoutPhoto, LayoutResult } from '../types/layout.ts'
import { EPSILON } from './geometry.ts'
import { packPage, rotationCount } from './pack.ts'
import type { Slot } from './pack.ts'
import { gridLayouts, visiblePhotoArea } from './grid.ts'
import { naturalPrintSize } from './imageFit.ts'

const positive = (n: number) => Number.isFinite(n) && n > 0

function sizeSlots(photos: readonly LayoutPhoto[], width: number, height: number, natural: boolean): Slot[] {
  return photos.map((photo, order) => {
    const swap = photo.widthPx !== photo.heightPx &&
      (photo.widthPx > photo.heightPx) !== (width > height)
    const frame = { width: swap ? height : width, height: swap ? width : height }
    return { photoId: photo.id, ...(natural ? naturalPrintSize(photo, width, height) : frame), order }
  })
}

function countSlots(photos: readonly LayoutPhoto[], longSide: number): Slot[] {
  return photos.map((photo, order) => {
    const ratio = photo.widthPx / photo.heightPx
    return {
      photoId: photo.id, order,
      width: ratio >= 1 ? longSide : longSide * ratio,
      height: ratio >= 1 ? longSide / ratio : longSide,
    }
  })
}

function layoutAtOrientation(
  input: LayoutInput, width: number, height: number, margin: number, gap: number,
): Layout | null {
  const base = { width, height, orientation: width <= height ? 'portrait' as const : 'landscape' as const }
  if (input.mode.kind === 'size') {
    let slots = sizeSlots(input.photos, input.mode.width, input.mode.height, input.mode.fit === 'natural')
    const printableWidth = width - 2 * margin
    const printableHeight = height - 2 * margin
    if (slots.some(s => !(
      (s.width <= printableWidth + EPSILON && s.height <= printableHeight + EPSILON) ||
      (input.autoRotate && s.height <= printableWidth + EPSILON && s.width <= printableHeight + EPSILON)
    ))) return null
    const pages: LayoutPage[] = []
    while (slots.length) {
      const { placements, remaining } = packPage(slots, width, height, margin, gap, input.autoRotate, input.preserveOrder)
      if (!placements.length) return null
      pages.push({ placements })
      slots = remaining
    }
    return { ...base, pages, longSide: null }
  }

  const count = input.mode.count
  function trySize(longSide: number): LayoutPage[] | null {
    const pages: LayoutPage[] = []
    for (let i = 0; i < input.photos.length; i += count) {
      const slots = countSlots(input.photos.slice(i, i + count), longSide)
      const result = packPage(slots, width, height, margin, gap, input.autoRotate, input.preserveOrder)
      if (result.remaining.length) return null
      pages.push({ placements: result.placements })
    }
    return pages
  }

  // Search in tenths of a millimetre. Keep only layouts actually accepted by the packer.
  // The predicate is heuristic: this is a practical result, not an optimality proof.
  let low = 1
  let high = Math.floor(Math.max(width - 2 * margin, height - 2 * margin) * 10)
  let best: Layout | null = null
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const pages = trySize(mid / 10)
    if (pages) {
      best = { ...base, pages, longSide: mid / 10 }
      low = mid + 1
    } else high = mid - 1
  }
  return best
}

function rotations(layout: Layout): number {
  return layout.pages.reduce((sum, page) => sum + rotationCount(page.placements), 0)
}

export function calculateLayout(input: LayoutInput): LayoutResult {
  const margin = input.margin ?? 5
  const gap = input.gap ?? 3
  const invalid = !positive(input.paper.width) || !positive(input.paper.height) ||
    !Number.isFinite(margin) || margin < 0 || !Number.isFinite(gap) || gap < 0 ||
    input.paper.width <= 2 * margin || input.paper.height <= 2 * margin ||
    input.photos.some(p => !positive(p.widthPx) || !positive(p.heightPx) || !positive(p.widthPx / p.heightPx)) ||
    new Set(input.photos.map(p => p.id)).size !== input.photos.length ||
    (input.mode.kind === 'size'
      ? !positive(input.mode.width) || !positive(input.mode.height)
      : !Number.isInteger(input.mode.count) || input.mode.count < 1 || input.mode.count > 12)
  if (invalid) return { ok: false, error: { code: 'invalid-input', message: 'Проверьте параметры: размеры — больше нуля, зазор — число от 0 мм, количество — целое от 1 до 12.' } }

  const portraitWidth = Math.min(input.paper.width, input.paper.height)
  const portraitHeight = Math.max(input.paper.width, input.paper.height)
  if (!input.photos.length) return { ok: true, layout: { width: portraitWidth, height: portraitHeight, orientation: 'portrait', pages: [], longSide: null } }

  const cutGrid = input.mode.kind === 'size' && input.mode.arrangement !== 'compact'
  const candidates = cutGrid ? [
    ...gridLayouts(input, portraitWidth, portraitHeight, margin, gap),
    ...gridLayouts(input, portraitHeight, portraitWidth, margin, gap),
  ] : [
    layoutAtOrientation(input, portraitWidth, portraitHeight, margin, gap),
    layoutAtOrientation(input, portraitHeight, portraitWidth, margin, gap),
  ].filter((layout): layout is Layout => layout !== null)
  const visibleAreas = new Map(cutGrid ? candidates.map(layout => [layout, visiblePhotoArea(layout, input.photos)]) : [])
  candidates.sort((a, b) => {
    const primary = input.mode.kind === 'size'
      ? a.pages.length - b.pages.length
      : (b.longSide ?? 0) - (a.longSide ?? 0)
    const areaDifference = (visibleAreas.get(b) ?? 0) - (visibleAreas.get(a) ?? 0)
    const areaScore = Math.abs(areaDifference) > EPSILON ? areaDifference : 0
    return primary || areaScore || rotations(a) - rotations(b) || Number(a.orientation === 'landscape') - Number(b.orientation === 'landscape')
  })
  if (!candidates.length) return { ok: false, error: {
    code: 'does-not-fit',
    message: input.mode.kind === 'size'
      ? 'Фото такого размера не помещаются с полями 5 мм. Уменьшите размер отпечатка или выберите бумагу больше.'
      : 'Не удалось разместить фотографии. Уменьшите количество на листе или выберите бумагу больше.',
  } }
  return { ok: true, layout: {
    ...candidates[0],
    fit: input.mode.kind === 'size' ? input.mode.fit ?? 'contain' : 'contain',
    imageAlignment: input.mode.kind === 'size' && input.mode.arrangement === 'compact' ? 'start' : 'center',
  } }
}
