import type { LayoutPage } from '../types/layout'
import type { Photo } from '../types/photo'
import { getCutMarks } from '../layout/cutMarks'

interface SheetProps {
  width: number
  height: number
  page?: LayoutPage
  photos: ReadonlyMap<string, Photo>
  showCutMarks?: boolean
}

export function Sheet({ width, height, page, photos, showCutMarks = false }: SheetProps) {
  const marks = showCutMarks && page ? getCutMarks(page.placements, width, height) : []
  return (
    <div className="sheet" style={{ width: `${width}mm`, height: `${height}mm` }}>
      {page?.placements.map(placement => {
        const photo = photos.get(placement.photoId)
        if (!photo) return null
        const rotated = placement.rotation === 90
        return (
          <div key={placement.photoId} className="photo-slot" style={{
            left: `${placement.x}mm`, top: `${placement.y}mm`,
            width: `${placement.width}mm`, height: `${placement.height}mm`,
          }}>
            <img src={photo.url} alt={photo.name} draggable={false} decoding="async" style={{
              width: `${rotated ? placement.height : placement.width}mm`,
              height: `${rotated ? placement.width : placement.height}mm`,
              transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
            }} />
          </div>
        )
      })}
      {marks.length > 0 && <svg className="cut-marks" viewBox={`0 0 ${width} ${height}`} width={`${width}mm`} height={`${height}mm`} aria-hidden="true">
        <path d={marks.map(mark => `M${mark.x1} ${mark.y1}L${mark.x2} ${mark.y2}`).join(' ')} />
      </svg>}
    </div>
  )
}
