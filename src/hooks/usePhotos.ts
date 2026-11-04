import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Photo, PhotoEntry } from '../types/photo'

interface FileError { id: string; message: string }

export function usePhotos() {
  const [entries, setEntries] = useState<PhotoEntry[]>([])
  const [errors, setErrors] = useState<FileError[]>([])
  const sources = useRef(new Map<string, string>())
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    const urls = sources.current
    return () => {
      alive.current = false
      for (const url of urls.values()) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [])

  const remove = useCallback((id: string) => {
    const url = sources.current.get(id)
    if (url) URL.revokeObjectURL(url)
    sources.current.delete(id)
    setEntries(current => current.filter(photo => photo.id !== id))
  }, [])

  const clear = useCallback(() => {
    for (const url of sources.current.values()) URL.revokeObjectURL(url)
    sources.current.clear()
    setEntries([])
    setErrors([])
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const pending: PhotoEntry[] = []
    const rejected: FileError[] = []
    for (const file of files) {
      const id = crypto.randomUUID()
      const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name))
      if (!supported) {
        rejected.push({ id, message: `${file.name}: выберите JPEG, PNG или WebP.` })
        continue
      }
      const url = URL.createObjectURL(file)
      sources.current.set(id, url)
      pending.push({ id, name: file.name, file, url, status: 'loading' })
    }
    setEntries(current => [...current, ...pending])
    setErrors(current => [...current, ...rejected])

    // Bound concurrent decodes; list order is established before any asynchronous work.
    const queue = [...pending]
    const worker = async () => {
      while (queue.length) {
        const entry = queue.shift()!
        if (!sources.current.has(entry.id)) continue
        const image = new Image()
        try {
          image.src = entry.url
          await image.decode()
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image')
          const ready: Photo = { ...entry, status: 'ready', widthPx: image.naturalWidth, heightPx: image.naturalHeight }
          if (alive.current && sources.current.has(entry.id)) {
            setEntries(current => current.map(photo => photo.id === entry.id ? ready : photo))
          }
        } catch {
          if (alive.current && sources.current.has(entry.id)) {
            remove(entry.id)
            setErrors(current => [...current, { id: entry.id, message: `${entry.name}: не удалось прочитать изображение. Возможно, файл повреждён.` }])
          }
        } finally {
          image.src = ''
        }
      }
    }
    for (let i = 0; i < Math.min(4, pending.length); i++) void worker()
  }, [remove])

  const photos = useMemo(() => entries.filter((entry): entry is Photo => entry.status === 'ready'), [entries])
  const dismissError = (id: string) => setErrors(current => current.filter(error => error.id !== id))
  return { entries, photos, loading: entries.length - photos.length, errors, addFiles, remove, clear, dismissError }
}
