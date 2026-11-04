import { PAPERS } from '../constants/paper'
import type { CutMarkStyle, ImageFit } from '../types/layout'
import { Icon } from './Icon'

export interface Settings {
  paperId: string
  mode: 'size' | 'count'
  width: string
  height: string
  count: string
  autoRotate: boolean
  arrangement: 'cut' | 'compact'
  cutMarks: boolean
  fit: ImageFit
  gap: string
  cutMarkStyle: CutMarkStyle
}

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  disabled: boolean
  orientation: string
  longSide: number | null
  samplePrint?: { width: number; height: number }
}

const formatMm = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })

export function SettingsPanel({ settings, onChange, disabled, orientation, longSide, samplePrint }: Props) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch })
  const natural = settings.fit === 'natural'
  return <fieldset className="settings-fieldset" disabled={disabled}>
    <legend className="visually-hidden">Параметры раскладки</legend>
    <section className="settings-section">
      <div className="section-heading"><h2><span className="step-label">02</span>Бумага</h2><span className="subtle-tag">{orientation}</span></div>
      <label className="visually-hidden" htmlFor="paper">Формат бумаги</label>
      <select id="paper" value={settings.paperId} onChange={event => update({ paperId: event.target.value })}>
        {PAPERS.map(paper => <option key={paper.id} value={paper.id}>{paper.name} — {paper.width} × {paper.height} мм</option>)}
      </select>
      <p className="control-note">Ориентацию листа подберём автоматически.</p>
    </section>
    <section className="settings-section layout-section">
      <div className="section-heading"><h2><span className="step-label">03</span>Раскладка</h2></div>
      <div className="segmented-control" role="group" aria-label="Режим компоновки">
        <button aria-pressed={settings.mode === 'size'} className={settings.mode === 'size' ? 'selected' : ''} onClick={() => update({ mode: 'size' })}>Размер фото</button>
        <button aria-pressed={settings.mode === 'count'} className={settings.mode === 'count' ? 'selected' : ''} onClick={() => update({ mode: 'count' })}>Фото на листе</button>
      </div>
      {settings.mode === 'size' ? <>
        <div className="size-fields">
          <label htmlFor="photo-width"><span>{natural ? 'Макс. ширина' : 'Ширина'}</span><div className="number-field"><input id="photo-width" type="number" min="0.1" step="0.1" value={settings.width} onChange={event => update({ width: event.target.value })} /><span>мм</span></div></label>
          <span className="times">×</span>
          <label htmlFor="photo-height"><span>{natural ? 'Макс. высота' : 'Высота'}</span><div className="number-field"><input id="photo-height" type="number" min="0.1" step="0.1" value={settings.height} onChange={event => update({ height: event.target.value })} /><span>мм</span></div></label>
        </div>
        <label className="control-label fit-label" htmlFor="image-fit">Как вписать изображение</label>
        <select id="image-fit" value={settings.fit} onChange={event => update({ fit: event.target.value as ImageFit })} aria-describedby="fit-note">
          <option value="contain">Весь кадр · с белыми полями</option>
          <option value="cover">Точный размер · обрезать края</option>
          <option value="natural">Весь кадр · без полей</option>
        </select>
        <p className="control-note" id="fit-note">{settings.fit === 'cover'
          ? 'Точный размер без полей. Не поместившиеся края кадра обрежутся.'
          : natural ? 'Размер подстроится под пропорции файла, в пределах заданных сторон.'
          : 'Точный размер. При разных пропорциях добавим белые поля.'}</p>
        {natural && samplePrint && <p className="actual-size" aria-live="polite">Первый отпечаток: {formatMm(samplePrint.width)} × {formatMm(samplePrint.height)} мм</p>}
        <div className="segmented-control arrangement-control" role="group" aria-label="Способ размещения">
          <button aria-pressed={settings.arrangement === 'cut'} className={settings.arrangement === 'cut' ? 'selected' : ''} onClick={() => update({ arrangement: 'cut' })}>Под резак</button>
          <button aria-pressed={settings.arrangement === 'compact'} className={settings.arrangement === 'compact' ? 'selected' : ''} onClick={() => update({ arrangement: 'compact' })}>Плотно</button>
        </div>
        <p className="control-note arrangement-note">{settings.arrangement === 'cut'
          ? natural ? 'Общий край и ровные ряды. При разных пропорциях размеры отпечатков различаются.' : 'Одна сетка на всех листах: ровные ряды и общие линии реза.'
          : 'Плотная упаковка с выравниванием изображений по краю ячеек.'}</p>
      </> : <>
        <label className="count-label" htmlFor="photo-count">Количество фотографий на листе</label>
        <div className="count-controls"><div className="number-field"><input id="photo-count" type="number" min="1" max="12" step="1" value={settings.count} onChange={event => update({ count: event.target.value })} /><span>шт.</span></div>
          <div className="count-presets">{[2, 4, 6, 9].map(count => <button key={count} aria-label={`${count} фото на листе`} aria-pressed={Number(settings.count) === count} className={Number(settings.count) === count ? 'active' : ''} onClick={() => update({ count: String(count) })}>{count}</button>)}</div>
        </div>
        <p className="control-note">{longSide ? `Длинная сторона фото — ${formatMm(longSide)} мм.` : 'От 1 до 12. Размер рассчитаем автоматически.'}</p>
      </>}
      <div className="rotate-control"><div><label htmlFor="auto-rotate"><Icon name="rotate" size={16} />Auto Rotate</label><p>{settings.mode === 'size' && settings.arrangement === 'cut'
        ? settings.autoRotate ? 'Поворачивать снимки под общую сетку' : 'Сохранять исходную ориентацию снимков'
        : 'Поворачивать фото для лучшей раскладки'}</p></div>
        <input className="switch" id="auto-rotate" type="checkbox" role="switch" checked={settings.autoRotate} onChange={event => update({ autoRotate: event.target.checked })} />
      </div>
    </section>
    <section className="settings-section finishing-section">
      <div className="section-heading"><h2><span className="step-label">04</span>Отступы и резка</h2></div>
      <label className="control-label" htmlFor="photo-gap">Зазор между отпечатками</label>
      <div className="gap-controls"><div className="number-field"><input id="photo-gap" type="number" min="0" step="0.5" value={settings.gap} onChange={event => update({ gap: event.target.value })} aria-describedby="gap-note" /><span>мм</span></div>
        <div className="count-presets">{[0, 5, 10].map(gap => <button key={gap} aria-label={`Зазор ${gap} мм`} aria-pressed={Number(settings.gap) === gap && settings.gap !== ''} className={Number(settings.gap) === gap && settings.gap !== '' ? 'active' : ''} onClick={() => update({ gap: String(gap) })}>{gap}</button>)}</div>
      </div>
      <p className="control-note" id="gap-note">0 мм — без полоски бумаги между отпечатками.</p>
      <label className="cut-marks-control"><input type="checkbox" checked={settings.cutMarks} onChange={event => update({ cutMarks: event.target.checked })} /><span>Метки реза</span></label>
      {settings.cutMarks && <>
        <label className="control-label mark-style-label" htmlFor="cut-mark-style">Вид метки реза</label>
        <select id="cut-mark-style" value={settings.cutMarkStyle} onChange={event => update({ cutMarkStyle: event.target.value as CutMarkStyle })}>
          <option value="corners">Уголки</option>
          <option value="dashed">Пунктирная линия</option>
        </select>
        <p className="control-note">{settings.mode === 'size' && settings.fit === 'contain'
          ? 'По границе заданного размера, вместе с добавленными полями.'
          : settings.mode === 'size' && settings.fit === 'cover'
            ? 'По границе заданного размера после обрезки кадра.'
            : 'По границе отпечатка. Белый фон внутри исходного файла сохраняется.'}</p>
      </>}
    </section>
  </fieldset>
}
