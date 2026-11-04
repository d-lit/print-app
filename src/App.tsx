import { useMemo, useRef, useState } from 'react'
import { PAPERS, GAP_MM, MARGIN_MM } from './constants/paper'
import { calculateLayout } from './layout/calculateLayout'
import { usePhotos } from './hooks/usePhotos'
import { Icon } from './components/Icon'
import { PhotoUploader } from './components/PhotoUploader'
import { PhotoList } from './components/PhotoList'
import { SettingsPanel } from './components/SettingsPanel'
import type { Settings } from './components/SettingsPanel'
import { Preview } from './components/Preview'
import { PrintArea } from './components/PrintArea'
import type { Layout, LayoutMode } from './types/layout'
import './App.css'
import './styles/print.css'

const INITIAL_SETTINGS: Settings = { paperId: 'a4', mode: 'size', width: '100', height: '150', count: '4', autoRotate: true, arrangement: 'cut', cutMarks: true, fit: 'contain', gap: String(GAP_MM), cutMarkStyle: 'corners' }
const PAGE_WORDS = { one: 'лист', two: 'листа', few: 'листа', many: 'листов', zero: 'листов', other: 'листа' }
const pluralRules = new Intl.PluralRules('ru')

function App() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS)
  const [requestedPage, setRequestedPage] = useState(0)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState('')
  const { entries, photos, loading, errors, addFiles, remove, move, manuallyOrdered, clear, dismissError } = usePhotos()
  const inputRef = useRef<HTMLInputElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const printingRef = useRef(false)
  const paper = PAPERS.find(p => p.id === settings.paperId) ?? PAPERS[0]
  const gapInput = settings.gap ?? INITIAL_SETTINGS.gap
  const gap = gapInput.trim() === '' ? NaN : Number(gapInput)
  const cutMarkStyle = settings.cutMarkStyle ?? INITIAL_SETTINGS.cutMarkStyle

  const result = useMemo(() => {
    const mode: LayoutMode = settings.mode === 'size'
      ? { kind: 'size', width: Number(settings.width), height: Number(settings.height), arrangement: settings.arrangement, fit: settings.fit ?? INITIAL_SETTINGS.fit }
      : { kind: 'count', count: Number(settings.count) }
    return calculateLayout({ paper, photos, mode, autoRotate: settings.autoRotate, margin: MARGIN_MM, gap, preserveOrder: manuallyOrdered })
  }, [settings, paper, photos, gap, manuallyOrdered])

  const layout: Layout = result.ok ? result.layout : { width: paper.width, height: paper.height, orientation: 'portrait', pages: [], longSide: null }
  const photoMap = useMemo(() => new Map(photos.map(photo => [photo.id, photo])), [photos])
  const pageIndex = Math.max(0, Math.min(requestedPage, layout.pages.length - 1))
  const canPrint = result.ok && layout.pages.length > 0 && loading === 0
  const showCutMarks = settings.cutMarks !== false

  const updateSettings = (next: Settings) => { setSettings(next); setRequestedPage(0); setPrintError('') }

  async function printPhotos() {
    if (!canPrint || printingRef.current) return
    printingRef.current = true
    setPrinting(true)
    setPrintError('')
    try {
      const images = Array.from(printRef.current?.querySelectorAll('img') ?? [])
      if (images.length !== photos.length) throw new Error('Missing images')
      await Promise.all(images.map(image => image.decode()))
      // Let controls and the final image state reach the browser before opening its dialog.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      window.print()
    } catch {
      setPrintError('Не удалось подготовить фотографии к печати. Попробуйте добавить проблемный файл заново.')
    } finally {
      setPrinting(false)
      printingRef.current = false
    }
  }

  return <>
    <style>{`@page { size: ${layout.width}mm ${layout.height}mm; margin: 0; }`}</style>
    <div className="app-shell" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault() }}>
      <header className="app-header">
        <a className="brand" href="./" aria-label="Photo Layout — главная"><span className="brand-mark"><Icon name="logo" size={22} /></span><span>photo<span className="brand-light">layout</span><span className="brand-period">.</span></span></a>
        <span className="header-description">Снимки заслуживают бумаги</span>
        <span className="privacy-badge"><span className="live-dot" />Всё остаётся на вашем устройстве</span>
      </header>
      <main className="workspace workspace-grid">
        <aside className="files-panel" aria-label="Файлы фотографий">
          <div className="panel-heading"><h2>Фотографии <span className="number-badge">{entries.length}</span></h2>{entries.length > 0 && <button className="text-button" onClick={() => { clear(); setPrintError(''); setRequestedPage(0) }} disabled={printing}>Очистить</button>}</div>
          <div className="files-upload"><PhotoUploader ref={inputRef} onFiles={addFiles} disabled={printing} /></div>
          <div className="files-scroll">
            <PhotoList entries={entries} onRemove={remove} onMove={move} disabled={printing} />
            {entries.length === 0 && <div className="files-empty"><Icon name="image" size={28} /><p>Здесь будут ваши снимки</p><span>Добавляйте файлы и меняйте их порядок стрелками.</span></div>}
            {loading > 0 && <p className="loading-note" role="status">Читаем фотографии: осталось {loading}…</p>}
            {errors.length > 0 && <div className="file-errors" role="alert">{errors.map(error => <div className="file-error" key={error.id}><span>{error.message}</span><button className="icon-button" aria-label="Скрыть ошибку" onClick={() => dismissError(error.id)}><Icon name="close" size={14} /></button></div>)}</div>}
          </div>
          <div className="files-footer"><span>{entries.length} фото</span><span>{manuallyOrdered ? 'Ручной порядок' : '↑ ↓ Меняйте порядок'}</span></div>
        </aside>
        <Preview layout={layout} photos={photoMap} paperName={paper.name} pageIndex={pageIndex} onPageChange={setRequestedPage} onAdd={() => inputRef.current?.click()} showCutMarks={showCutMarks} cutMarkStyle={cutMarkStyle} gap={gap} />
        <aside className="settings-panel" aria-label="Настройки печати">
          <div className="panel-heading"><h2>Параметры печати</h2><Icon name="print" size={17} /></div>
          <div className="settings-scroll">
            <SettingsPanel settings={{ ...INITIAL_SETTINGS, ...settings }} onChange={updateSettings} disabled={printing} orientation={layout.orientation === 'portrait' ? 'Портретная' : 'Альбомная'} longSide={layout.longSide} samplePrint={layout.pages[0]?.placements[0]} />
          </div>
          <div className="print-controls">
            {(!result.ok || printError) && <div className="layout-error" role="alert"><Icon name="alert" size={17} /><span>{printError || (!result.ok ? result.error.message : '')}</span></div>}
            <div className="print-summary"><span>{photos.length} фото <span className="summary-dot">·</span> {layout.pages.length} {PAGE_WORDS[pluralRules.select(layout.pages.length)]}</span><span>{paper.name}<Icon name="arrow" size={14} />{settings.mode === 'size' ? `${settings.fit === 'natural' ? 'до ' : ''}${settings.width || '—'} × ${settings.height || '—'} мм` : `${settings.count || '—'} на листе`}</span></div>
            <button className="button button-primary print-button" disabled={!canPrint || printing} onClick={() => void printPhotos()}>{printing ? <span className="spinner" /> : <Icon name="print" size={19} />}{printing ? 'Готовим к печати…' : 'Печатать фотографии'}{!printing && <span className="print-key">Print</span>}</button>
            <p className="print-note">В диалоге печати: бумага {paper.name}, масштаб 100%,<br />без колонтитулов. Проверьте поля принтера.</p>
          </div>
        </aside>
      </main>
    </div>
    <PrintArea ref={printRef} layout={layout} photos={photoMap} ready={canPrint} showCutMarks={showCutMarks} cutMarkStyle={cutMarkStyle} />
  </>
}

export default App
