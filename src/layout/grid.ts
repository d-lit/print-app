import type { Layout, LayoutInput, LayoutPhoto, Placement } from '../types/layout.ts'
import { EPSILON } from './geometry.ts'
import { fittedSize, naturalPrintSize, photoRotation } from './imageFit.ts'

export function gridLayouts(
  input: LayoutInput, paperWidth: number, paperHeight: number, margin: number, gap: number,
): Layout[] {
  if (input.mode.kind !== 'size' || !input.photos.length) return []
  const candidates: Layout[] = []
  const orientations = [[input.mode.width, input.mode.height], [input.mode.height, input.mode.width]]
  for (const [width, height] of orientations) {
    const natural = input.mode.fit === 'natural'
    const prints = input.photos.map(photo => {
      const rotation = photoRotation(photo, width, height, input.autoRotate)
      const size = naturalPrintSize(photo, width, height)
      return { photo, rotation, ...(natural
        ? rotation === 90 ? { width: size.height, height: size.width } : size
        : { width, height }) }
    })
    const cellWidth = Math.max(...prints.map(print => print.width))
    const cellHeight = Math.max(...prints.map(print => print.height))
    const columns = Math.min(input.photos.length, Math.floor((paperWidth - 2 * margin + gap + EPSILON) / (cellWidth + gap)))
    const maxRows = Math.floor((paperHeight - 2 * margin + gap + EPSILON) / (cellHeight + gap))
    if (columns < 1 || maxRows < 1) continue
    const rows = Math.min(maxRows, Math.ceil(input.photos.length / columns))
    const capacity = columns * rows
    const gridWidth = columns * cellWidth + (columns - 1) * gap
    const gridHeight = rows * cellHeight + (rows - 1) * gap
    const originX = (paperWidth - gridWidth) / 2
    const originY = (paperHeight - gridHeight) / 2
    const pages: Layout['pages'] = []
    for (let offset = 0; offset < input.photos.length; offset += capacity) {
      const placements: Placement[] = prints.slice(offset, offset + capacity).map((print, index) => ({
        photoId: print.photo.id,
        x: originX + (index % columns) * (cellWidth + gap),
        y: originY + Math.floor(index / columns) * (cellHeight + gap),
        width: print.width, height: print.height, rotation: print.rotation,
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
    const size = fittedSize(photo, slot.width, slot.height, slot.rotation)
    return sum + size.width * size.height
  }, 0), 0)
}
