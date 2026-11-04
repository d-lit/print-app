import type { CutMarkStyle, ImageAlignment, ImageFit, LayoutPage } from '../types/layout'
import type { Photo } from '../types/photo'
import { getCutMarks, getDashedCutLines } from '../layout/cutMarks'
import { imageBounds } from '../layout/imageFit'

interface SheetProps {
  width: number
  height: number
  page?: LayoutPage
  photos: ReadonlyMap<string, Photo>
  showCutMarks?: boolean
  cutMarkStyle?: CutMarkStyle
  fit?: ImageFit
  imageAlignment?: ImageAlignment
}

export function Sheet({ width, height, page, photos, showCutMarks = false, cutMarkStyle = 'corners', fit = 'contain', imageAlignment = 'center' }: SheetProps) {
  const marks = !showCutMarks || !page ? [] : cutMarkStyle === 'dashed'
    ? getDashedCutLines(page.placements)
    : getCutMarks(page.placements, width, height)
  return (
    <div className="sheet" style={{ width: `${width}mm`, height: `${height}mm` }}>
      {page?.placements.map(placement => {
        const photo = photos.get(placement.photoId)
        if (!photo) return null
        const rotated = placement.rotation === 90
        const image = fit === 'cover' ? placement : imageBounds(placement, photo, imageAlignment)
        return (
          <div key={placement.photoId} className="photo-slot" data-photo-id={placement.photoId} data-fit={fit} style={{
            left: `${placement.x}mm`, top: `${placement.y}mm`,
            width: `${placement.width}mm`, height: `${placement.height}mm`,
          }}>
            <img src={photo.url} alt={photo.name} draggable={false} decoding="async" style={{
              left: `${image.x - placement.x + image.width / 2}mm`,
              top: `${image.y - placement.y + image.height / 2}mm`,
              width: `${rotated ? image.height : image.width}mm`,
              height: `${rotated ? image.width : image.height}mm`,
              objectFit: fit === 'cover' ? 'cover' : 'contain',
              transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
            }} />
          </div>
        )
      })}
      {marks.length > 0 && <svg className={`cut-marks cut-marks-${cutMarkStyle}`} viewBox={`0 0 ${width} ${height}`} width={`${width}mm`} height={`${height}mm`} aria-hidden="true">
        <path d={marks.map(mark => `M${mark.x1} ${mark.y1}L${mark.x2} ${mark.y2}`).join(' ')} strokeDasharray={cutMarkStyle === 'dashed' ? '1.5 1' : undefined} />
      </svg>}
    </div>
  )
}
