export interface LayoutPhoto {
  id: string
  widthPx: number
  heightPx: number
}

export type LayoutMode =
  | { kind: 'size'; width: number; height: number; arrangement?: 'cut' | 'compact' }
  | { kind: 'count'; count: number }

export interface LayoutInput {
  paper: { width: number; height: number }
  photos: readonly LayoutPhoto[]
  mode: LayoutMode
  autoRotate: boolean
  margin?: number
  gap?: number
}

export interface Placement {
  photoId: string
  x: number
  y: number
  width: number
  height: number
  rotation: 0 | 90
}

export interface LayoutPage {
  placements: Placement[]
}

export interface Layout {
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
  pages: LayoutPage[]
  longSide: number | null
  grid?: { columns: number; rows: number }
}

export type LayoutResult =
  | { ok: true; layout: Layout }
  | { ok: false; error: { code: 'invalid-input' | 'does-not-fit'; message: string } }
