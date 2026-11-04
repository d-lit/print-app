import type { PhotoEntry } from '../types/photo'
import { Icon } from './Icon'

export function PhotoList({ entries, onRemove, disabled }: { entries: PhotoEntry[]; onRemove: (id: string) => void; disabled: boolean }) {
  if (!entries.length) return null
  return <ul className="photo-list" aria-label="Выбранные фотографии">{entries.map((photo, index) => (
    <li key={photo.id} className="photo-item">
      <div className="thumbnail">
        {photo.status === 'ready' ? <img src={photo.url} alt="" loading="lazy" /> : <span className="spinner" />}
      </div>
      <div className="photo-info"><span title={photo.name}>{photo.name}</span><small>{photo.status === 'ready' ? `${photo.widthPx} × ${photo.heightPx} px` : 'Читаем файл…'}</small></div>
      <span className="photo-number">{String(index + 1).padStart(2, '0')}</span>
      <button className="icon-button remove-photo" disabled={disabled} aria-label={`Удалить ${photo.name}`} onClick={() => onRemove(photo.id)}><Icon name="close" size={15} /></button>
    </li>
  ))}</ul>
}
