import type { PhotoEntry } from '../types/photo'
import { Icon } from './Icon'

interface Props {
  entries: PhotoEntry[]
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  disabled: boolean
}

export function PhotoList({ entries, onRemove, onMove, disabled }: Props) {
  if (!entries.length) return null
  return <ul className="photo-list" aria-label="Выбранные фотографии">{entries.map((photo, index) => (
    <li key={photo.id} className="photo-item" data-photo-id={photo.id}>
      <div className="thumbnail">
        {photo.status === 'ready' ? <img src={photo.url} alt="" loading="lazy" /> : <span className="spinner" />}
      </div>
      <div className="photo-info"><span title={photo.name}>{photo.name}</span><small>{photo.status === 'ready' ? `${photo.widthPx} × ${photo.heightPx} px` : 'Читаем файл…'}</small></div>
      <span className="photo-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="photo-order-controls">
        <button className="icon-button move-photo-up" disabled={disabled || index === 0} aria-label={`Поднять ${photo.name}`} title="Переместить выше" onClick={() => onMove(photo.id, -1)}><Icon name="up" size={15} /></button>
        <button className="icon-button move-photo-down" disabled={disabled || index === entries.length - 1} aria-label={`Опустить ${photo.name}`} title="Переместить ниже" onClick={() => onMove(photo.id, 1)}><Icon name="down" size={15} /></button>
      </div>
      <button className="icon-button remove-photo" disabled={disabled} aria-label={`Удалить ${photo.name}`} onClick={() => onRemove(photo.id)}><Icon name="close" size={15} /></button>
    </li>
  ))}</ul>
}
