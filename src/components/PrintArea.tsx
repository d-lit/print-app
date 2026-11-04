import { forwardRef } from 'react'
import type { Layout } from '../types/layout'
import type { Photo } from '../types/photo'
import { Sheet } from './Sheet'

export const PrintArea = forwardRef<HTMLDivElement, { layout: Layout; photos: ReadonlyMap<string, Photo>; ready: boolean; showCutMarks: boolean }>(function PrintArea({ layout, photos, ready, showCutMarks }, ref) {
  return <div ref={ref} className="print-area" aria-hidden="true" data-ready={ready}>
    {ready && layout.pages.map((page, index) => <Sheet key={index} width={layout.width} height={layout.height} page={page} photos={photos} showCutMarks={showCutMarks} />)}
  </div>
})
