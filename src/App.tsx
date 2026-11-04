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

const INITIAL_SETTINGS: Settings = { paperId: 'a4', mode: 'size', width: '100', height: '150', count: '4', autoRotate: true, arrangement: 'cut', cutMarks: true }
const PAGE_WORDS = { one: 'лист', two: 'листа', few: 'листа', many: 'листов', zero: 'листов', other: 'листа' }
const pluralRules = new Intl.PluralRules('ru')

function App() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS)
  const [requestedPage, setRequestedPage] = useState(0)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState('')
  const { entries, photos, loading, errors, addFiles, remove, clear, dismissError } = usePhotos()
  const inputRef = useRef<HTMLInputElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const printingRef = useRef(false)
  const paper = PAPERS.find(p => p.id === settings.paperId) ?? PAPERS[0]

  const result = useMemo(() => {
    const mode: LayoutMode = settings.mode === 'size'
      ? { kind: 'size', width: Number(settings.width), height: Number(settings.height), arrangement: settings.arrangement }
      : { kind: 'count', count: Number(settings.count) }
    return calculateLayout({ paper, photos, mode, autoRotate: settings.autoRotate, margin: MARGIN_MM, gap: GAP_MM })
  }, [settings, paper, photos])

  const layout: Layout = result.ok ? result.layout : { width: paper.width, height: paper.height, orientation: 'portrait', pages: [], longSide: null }
  const photoMap = useMemo(() => new Map(photos.map(photo => [photo.id, photo])), [photos])
  const pageIndex = Math.max(0, Math.min(requestedPage, layout.pages.length - 1))
  const canPrint = result.ok && layout.pages.length > 0 && loading === 0
  const showCutMarks = settings.mode === 'size' && settings.arrangement !== 'compact' && settings.cutMarks !== false

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
      <main className="workspace">
        <div className="workspace-heading"><div><div className="eyebrow">ОТ СНИМКА К ОТПЕЧАТКУ</div><h1>Хорошие моменты. <span>В хорошем формате.</span></h1><p>Ваши фотографии, идеальная раскладка и ничего лишнего.</p></div><span className="local-label">БЕЗ ОБЛАКА.<br />БЕЗ ЛИШНИХ ШАГОВ.</span></div>
        <div className="workspace-grid">
          <Preview layout={layout} photos={photoMap} paperName={paper.name} pageIndex={pageIndex} onPageChange={setRequestedPage} onAdd={() => inputRef.current?.click()} showCutMarks={showCutMarks} />
          <aside className="settings-panel" aria-label="Настройки печати">
            <section className="photos-section">
              <div className="section-heading"><h2><span className="step-label">01</span>Фотографии <span className="number-badge">{entries.length}</span></h2>{entries.length > 0 && <button className="text-button" onClick={() => { clear(); setPrintError(''); setRequestedPage(0) }} disabled={printing}>Очистить</button>}</div>
              <PhotoUploader ref={inputRef} onFiles={addFiles} disabled={printing} />
              <PhotoList entries={entries} onRemove={remove} disabled={printing} />
              {loading > 0 && <p className="loading-note" role="status">Читаем фотографии: осталось {loading}…</p>}
              {errors.length > 0 && <div className="file-errors" role="alert">{errors.map(error => <div className="file-error" key={error.id}><span>{error.message}</span><button className="icon-button" aria-label="Скрыть ошибку" onClick={() => dismissError(error.id)}><Icon name="close" size={14} /></button></div>)}</div>}
            </section>
            <SettingsPanel settings={{ ...INITIAL_SETTINGS, ...settings }} onChange={updateSettings} disabled={printing} orientation={layout.orientation === 'portrait' ? 'Портретная' : 'Альбомная'} longSide={layout.longSide} />
            <div className="print-controls">
              {(!result.ok || printError) && <div className="layout-error" role="alert"><Icon name="alert" size={17} /><span>{printError || (!result.ok ? result.error.message : '')}</span></div>}
              <div className="print-summary"><span>{photos.length} фото <span className="summary-dot">·</span> {layout.pages.length} {PAGE_WORDS[pluralRules.select(layout.pages.length)]}</span><span>{paper.name}<Icon name="arrow" size={14} />{settings.mode === 'size' ? `${settings.width || '—'} × ${settings.height || '—'} мм` : `${settings.count || '—'} на листе`}</span></div>
              <button className="button button-primary print-button" disabled={!canPrint || printing} onClick={() => void printPhotos()}>{printing ? <span className="spinner" /> : <Icon name="print" size={19} />}{printing ? 'Готовим к печати…' : 'Печатать фотографии'}{!printing && <span className="print-key">Print</span>}</button>
              <p className="print-note">В диалоге печати: бумага {paper.name}, масштаб 100%,<br />без колонтитулов. Проверьте поля принтера.</p>
            </div>
          </aside>
        </div>
      </main>
      <footer className="app-footer"><span>Меньше настроек. Больше воспоминаний.</span><span>Сделано для домашней печати <span className="footer-dot">✳</span></span></footer>
    </div>
    <PrintArea ref={printRef} layout={layout} photos={photoMap} ready={canPrint} showCutMarks={showCutMarks} />
  </>
}

export default App
