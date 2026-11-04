import { useEffect, useRef, useState } from 'react'
import type { CutMarkStyle, Layout } from '../types/layout'
import type { Photo } from '../types/photo'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

interface PreviewProps {
  layout: Layout
  photos: ReadonlyMap<string, Photo>
  paperName: string
  pageIndex: number
  onPageChange: (index: number) => void
  onAdd: () => void
  showCutMarks: boolean
  cutMarkStyle: CutMarkStyle
  gap: number
}

const PX_PER_MM = 96 / 25.4

export function Preview({ layout, photos, paperName, pageIndex, onPageChange, onAdd, showCutMarks, cutMarkStyle, gap }: PreviewProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState({ width: 640, height: 640 })
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const scale = Math.max(0.05, Math.min(
    (available.width - 100) / (layout.width * PX_PER_MM),
    (available.height - 80) / (layout.height * PX_PER_MM), 1.25,
  ))
  const pageCount = layout.pages.length
  return (
    <section className="preview-panel" aria-label="Предпросмотр печати">
      <div className="preview-toolbar">
        <div className="preview-title"><span className="live-dot" />Предпросмотр <span className="toolbar-divider" /><span className="paper-label">{paperName}</span></div>
        <span className="zoom-label">{Math.round(scale * 100)}%</span>
      </div>
      <div className="paper-viewport" ref={viewport}>
        <div className="paper-stage" style={{ width: layout.width * PX_PER_MM * scale, height: layout.height * PX_PER_MM * scale }}>
          <span className="dimension dimension-top">{layout.width} мм</span>
          <span className="dimension dimension-side">{layout.height} мм</span>
          <div className="sheet-scaled" style={{ transform: `scale(${scale})` }}>
            <Sheet width={layout.width} height={layout.height} page={layout.pages[pageIndex]} photos={photos} showCutMarks={showCutMarks} cutMarkStyle={cutMarkStyle} fit={layout.fit} imageAlignment={layout.imageAlignment} />
            {!pageCount && <div className="empty-sheet" style={{ width: `${layout.width}mm`, height: `${layout.height}mm` }}>
              <div className="empty-sheet-content">
                <div className="empty-photo-icon"><Icon name="image" size={36} /></div>
                <h2>Ваши фотографии.<br />На настоящей бумаге.</h2>
                <p>Добавьте снимки — мы найдём<br />для них место на листе.</p>
                <button className="button button-primary empty-add" onClick={onAdd}><Icon name="plus" size={18} />Добавить фотографии</button>
                <span className="empty-formats">JPEG · PNG · WEBP</span>
              </div>
            </div>}
          </div>
        </div>
      </div>
      <div className="preview-footer">
        <span className="preview-hint"><Icon name="check" size={15} />{pageCount ? layout.grid ? `Сетка ${layout.grid.columns} × ${layout.grid.rows} · Под резак` : 'Размеры готовы к печати' : 'Автоматическая раскладка'}</span>
        <nav className="page-navigation" aria-label="Страницы предпросмотра">
          <button className="icon-button" onClick={() => onPageChange(pageIndex - 1)} disabled={pageIndex <= 0 || !pageCount} aria-label="Предыдущая страница"><Icon name="left" size={17} /></button>
          <span aria-live="polite">{pageCount ? pageIndex + 1 : 0}<span className="muted"> / {pageCount}</span></span>
          <button className="icon-button" onClick={() => onPageChange(pageIndex + 1)} disabled={pageIndex >= pageCount - 1} aria-label="Следующая страница"><Icon name="right" size={17} /></button>
        </nav>
        <span className="preview-margin">Поля 5 мм <span>·</span> Зазор {Number.isFinite(gap) && gap >= 0 ? gap.toLocaleString('ru-RU') : '—'} мм</span>
      </div>
    </section>
  )
}
