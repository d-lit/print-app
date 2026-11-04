import { PAPERS } from '../constants/paper'
import { Icon } from './Icon'

export interface Settings {
  paperId: string
  mode: 'size' | 'count'
  width: string
  height: string
  count: string
  autoRotate: boolean
}

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  disabled: boolean
  orientation: string
  longSide: number | null
}

export function SettingsPanel({ settings, onChange, disabled, orientation, longSide }: Props) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch })
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
          <label htmlFor="photo-width"><span>Ширина</span><div className="number-field"><input id="photo-width" type="number" min="0.1" step="0.1" value={settings.width} onChange={event => update({ width: event.target.value })} /><span>мм</span></div></label>
          <span className="times">×</span>
          <label htmlFor="photo-height"><span>Высота</span><div className="number-field"><input id="photo-height" type="number" min="0.1" step="0.1" value={settings.height} onChange={event => update({ height: event.target.value })} /><span>мм</span></div></label>
        </div>
        <p className="control-note">Размер отпечатка. Пропорции снимка сохраняются.</p>
      </> : <>
        <label className="count-label" htmlFor="photo-count">Количество фотографий на листе</label>
        <div className="count-controls"><div className="number-field"><input id="photo-count" type="number" min="1" max="12" step="1" value={settings.count} onChange={event => update({ count: event.target.value })} /><span>шт.</span></div>
          <div className="count-presets">{[2, 4, 6, 9].map(count => <button key={count} aria-label={`${count} фото на листе`} aria-pressed={Number(settings.count) === count} className={Number(settings.count) === count ? 'active' : ''} onClick={() => update({ count: String(count) })}>{count}</button>)}</div>
        </div>
        <p className="control-note">{longSide ? `Длинная сторона фото — ${longSide.toLocaleString('ru-RU')} мм.` : 'От 1 до 12. Размер рассчитаем автоматически.'}</p>
      </>}
      <div className="rotate-control"><div><label htmlFor="auto-rotate"><Icon name="rotate" size={16} />Auto Rotate</label><p>Поворачивать фото для лучшей раскладки</p></div>
        <input className="switch" id="auto-rotate" type="checkbox" role="switch" checked={settings.autoRotate} onChange={event => update({ autoRotate: event.target.checked })} />
      </div>
    </section>
  </fieldset>
}
