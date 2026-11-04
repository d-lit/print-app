import type { LayoutPhoto } from './layout'

export interface PhotoSource {
  id: string
  name: string
  url: string
  file: File
}

export interface Photo extends PhotoSource, LayoutPhoto {
  status: 'ready'
}

export type PhotoEntry = Photo | (PhotoSource & { status: 'loading' })
