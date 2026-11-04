import type { LayoutPage } from '../types/layout'
import type { Photo } from '../types/photo'

interface SheetProps {
  width: number
  height: number
  page?: LayoutPage
  photos: ReadonlyMap<string, Photo>
}

export function Sheet({ width, height, page, photos }: SheetProps) {
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
    </div>
  )
}
