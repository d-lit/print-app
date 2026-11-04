import { forwardRef, useRef, useState } from 'react'
import { Icon } from './Icon'

interface Props {
  onFiles: (files: File[]) => void
  disabled: boolean
}

export const PhotoUploader = forwardRef<HTMLInputElement, Props>(function PhotoUploader({ onFiles, disabled }, ref) {
  const localRef = useRef<HTMLInputElement | null>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  return (
    <div className={`upload-zone${dragging && !disabled ? ' is-dragging' : ''}`}
      onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy' }}
      onDragLeave={event => { event.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) setDragging(false) }}
      onDrop={event => {
        event.preventDefault(); dragDepth.current = 0; setDragging(false)
        if (!disabled) onFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <input ref={element => {
        localRef.current = element
        if (typeof ref === 'function') ref(element)
        else if (ref) ref.current = element
      }} type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="visually-hidden" tabIndex={-1} disabled={disabled}
        onChange={event => { onFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} aria-label="Выбрать фотографии" />
      <button className="upload-button" disabled={disabled} onClick={() => localRef.current?.click()}>
        <span className="upload-icon"><Icon name="upload" size={21} /></span>
        <strong>Добавить фотографии</strong>
        <span>или перетащите их сюда</span>
        <small>JPEG, PNG, WebP</small>
      </button>
    </div>
  )
})
