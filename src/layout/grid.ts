import type { Layout, LayoutInput, LayoutPhoto, Placement } from '../types/layout.ts'
import { EPSILON } from './geometry.ts'

function containedArea(width: number, height: number, aspect: number): number {
  return aspect >= width / height ? width * width / aspect : height * height * aspect
}

function photoRotation(photo: LayoutPhoto, width: number, height: number, autoRotate: boolean): 0 | 90 {
  if (!autoRotate) return 0
  const aspect = photo.widthPx / photo.heightPx
  return containedArea(width, height, 1 / aspect) > containedArea(width, height, aspect) + EPSILON ? 90 : 0
}

export function gridLayouts(
  input: LayoutInput, paperWidth: number, paperHeight: number, margin: number, gap: number,
): Layout[] {
  if (input.mode.kind !== 'size' || !input.photos.length) return []
  const candidates: Layout[] = []
  const orientations = [[input.mode.width, input.mode.height], [input.mode.height, input.mode.width]]
  for (const [width, height] of orientations) {
    const columns = Math.min(input.photos.length, Math.floor((paperWidth - 2 * margin + gap + EPSILON) / (width + gap)))
    const maxRows = Math.floor((paperHeight - 2 * margin + gap + EPSILON) / (height + gap))
    if (columns < 1 || maxRows < 1) continue
    const rows = Math.min(maxRows, Math.ceil(input.photos.length / columns))
    const capacity = columns * rows
    const gridWidth = columns * width + (columns - 1) * gap
    const gridHeight = rows * height + (rows - 1) * gap
    const originX = (paperWidth - gridWidth) / 2
    const originY = (paperHeight - gridHeight) / 2
    const pages: Layout['pages'] = []
    for (let offset = 0; offset < input.photos.length; offset += capacity) {
      const placements: Placement[] = input.photos.slice(offset, offset + capacity).map((photo, index) => ({
        photoId: photo.id,
        x: originX + (index % columns) * (width + gap),
        y: originY + Math.floor(index / columns) * (height + gap),
        width, height,
        rotation: photoRotation(photo, width, height, input.autoRotate),
      }))
      pages.push({ placements })
    }
    candidates.push({
      width: paperWidth, height: paperHeight,
      orientation: paperWidth <= paperHeight ? 'portrait' : 'landscape',
      pages, longSide: null, grid: { columns, rows },
    })
  }
  return candidates
}

// When rotations are disabled, prefer slots that leave less blank paper inside the prints.
export function visiblePhotoArea(layout: Layout, photos: readonly LayoutPhoto[]): number {
  const sources = new Map(photos.map(photo => [photo.id, photo]))
  return layout.pages.reduce((total, page) => total + page.placements.reduce((sum, slot) => {
    const photo = sources.get(slot.photoId)!
    const aspect = slot.rotation === 90 ? photo.heightPx / photo.widthPx : photo.widthPx / photo.heightPx
    return sum + containedArea(slot.width, slot.height, aspect)
  }, 0), 0)
}
