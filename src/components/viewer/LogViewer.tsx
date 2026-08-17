import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { indexNearTime } from '../../lib/downsample'
import { downloadText, exportLogRangeCsv } from '../../lib/exportCsv'
import {
  buildBuiltinPresets,
  deleteCustomLayout,
  loadCustomLayouts,
  saveCustomLayout,
} from '../../lib/presets'
import { adaptLogForDisplay } from '../../lib/units'
import { addPowerTorqueChannels } from '../../lib/powerTorque'
import type { ChartPane, LayoutPreset, ParsedLog, TimeRange } from '../../lib/types'
import { UPlotPane } from '../charts/UPlotPane'
import { ChannelPicker } from './ChannelPicker'
import { HistogramPanel } from './HistogramPanel'
import { MapTablePanel } from './MapTablePanel'
import { PowerPanel } from './PowerPanel'

type ViewerPage = 'charts' | 'map' | 'histogram' | 'power'

interface Props {
  log: ParsedLog
}

export function LogViewer({ log }: Props) {
  const { settings } = useSettings()
  const displayLog = useMemo(() => {
    const withPower = addPowerTorqueChannels(log, settings)
    return adaptLogForDisplay(withPower, settings)
  }, [log, settings])
  const builtins = useMemo(() => buildBuiltinPresets(displayLog), [displayLog])
  const [customs, setCustoms] = useState<LayoutPreset[]>(() => loadCustomLayouts())
  const [presetId, setPresetId] = useState(builtins[0]?.id ?? 'custom')
  const [panes, setPanes] = useState<ChartPane[]>(() => builtins[0]?.panes ?? [])
  const [activePaneId, setActivePaneId] = useState(
    () => builtins[0]?.panes[0]?.id ?? 'pane-1',
  )
  const [xRange, setXRange] = useState<TimeRange>({
    start: log.meta.tMin,
    end: log.meta.tMax,
  })
  const [analysisRange, setAnalysisRange] = useState<TimeRange | null>(null)
  const [cursorTime, setCursorTime] = useState<number | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [page, setPage] = useState<ViewerPage>('charts')
  const chartStackRef = useRef<HTMLDivElement>(null)
  const [paneHeight, setPaneHeight] = useState(280)

  useEffect(() => {
    const next = buildBuiltinPresets(displayLog)
    setPresetId(next[0]?.id ?? 'custom')
    setPanes(next[0]?.panes ?? [])
    setActivePaneId(next[0]?.panes[0]?.id ?? 'pane-1')
    setXRange({ start: log.meta.tMin, end: log.meta.tMax })
    setAnalysisRange(null)
    setCursorTime(null)
    setPage('charts')
    // Reset viewer state only when a new source log is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log])

  useEffect(() => {
    if (page !== 'charts' || !chartStackRef.current) return
    const el = chartStackRef.current
    const update = () => {
      const paneCount = Math.max(1, panes.length)
      const gap = 8 * Math.max(0, paneCount - 1)
      const available = el.clientHeight - gap
      if (available < 1) return
      const next = Math.max(160, Math.floor(available / paneCount))
      setPaneHeight((prev) => (prev === next ? prev : next))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [page, panes.length])

  const applyPreset = useCallback(
    (id: string) => {
      setPresetId(id)
      const all = [...builtins, ...customs]
      const hit = all.find((p) => p.id === id)
      if (hit) {
        const next = structuredClone(hit.panes)
        setPanes(next)
        setActivePaneId(next[0]?.id ?? 'pane-1')
      }
    },
    [builtins, customs],
  )

  const cursorIdx = cursorTime != null ? indexNearTime(displayLog.time, cursorTime) : null

  const readout = useMemo(() => {
    if (cursorIdx == null) return []
    const ids = panes.flatMap((p) => p.series.filter((s) => s.visible).map((s) => s.channelId))
    return ids.map((id) => {
      const ch = displayLog.channels.find((c) => c.id === id)
      const v = ch?.data[cursorIdx]
      return {
        id,
        label: ch?.name ?? id,
        unit: ch?.unit,
        color: panes.flatMap((p) => p.series).find((s) => s.channelId === id)?.color,
        value: v != null && Number.isFinite(v) ? v : null,
      }
    })
  }, [cursorIdx, panes, displayLog.channels])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (page !== 'charts') return
      const span = xRange.end - xRange.start
      if (e.key === 'r' || e.key === 'R') {
        setXRange({ start: log.meta.tMin, end: log.meta.tMax })
      } else if (e.key === '=' || e.key === '+') {
        const mid = (xRange.start + xRange.end) / 2
        const half = span / 4
        setXRange({ start: mid - half, end: mid + half })
      } else if (e.key === '-' || e.key === '_') {
        const mid = (xRange.start + xRange.end) / 2
        const half = Math.min((log.meta.tMax - log.meta.tMin) / 2, span)
        setXRange({
          start: Math.max(log.meta.tMin, mid - half),
          end: Math.min(log.meta.tMax, mid + half),
        })
      } else if (e.key === 'ArrowLeft') {
        const shift = span * 0.2
        setXRange({ start: xRange.start - shift, end: xRange.end - shift })
      } else if (e.key === 'ArrowRight') {
        const shift = span * 0.2
        setXRange({ start: xRange.start + shift, end: xRange.end + shift })
      } else if (e.key === 's' || e.key === 'S') {
        setSelectMode((v) => !v)
      } else if (e.key === 'f' || e.key === 'F') {
        if (analysisRange) setXRange({ ...analysisRange })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [xRange, log.meta, analysisRange, page])

  function exportVisible() {
    const ids = panes.flatMap((p) => p.series.filter((s) => s.visible).map((s) => s.channelId))
    const csv = exportLogRangeCsv(displayLog, analysisRange ?? xRange, ids)
    const name = log.meta.filename.replace(/\.csv$/i, '')
    downloadText(`${name}-export.csv`, csv)
  }

  function saveLayout() {
    const name = saveName.trim() || `Custom ${customs.length + 1}`
    const id = `custom-${Date.now()}`
    const next = saveCustomLayout({ id, name, panes: structuredClone(panes) })
    setCustoms(next)
    setPresetId(id)
    setSaveName('')
  }

  const pullLabel = analysisRange
    ? `Pull ${analysisRange.start.toFixed(2)}–${analysisRange.end.toFixed(2)}s`
    : 'Full log (no pull selected)'

  return (
    <div className={`viewer viewer-page-${page}`}>
      <div className="viewer-page-nav">
        <button
          type="button"
          className={page === 'charts' ? 'active' : ''}
          onClick={() => setPage('charts')}
        >
          Charts
        </button>
        <button
          type="button"
          className={page === 'map' ? 'active' : ''}
          onClick={() => setPage('map')}
        >
          Map table
        </button>
        <button
          type="button"
          className={page === 'power' ? 'active' : ''}
          onClick={() => setPage('power')}
        >
          Power
        </button>
        <button
          type="button"
          className={page === 'histogram' ? 'active' : ''}
          onClick={() => setPage('histogram')}
        >
          Histogram
        </button>
        <div className="viewer-page-pull">
          <span>{pullLabel}</span>
          {analysisRange && (
            <button type="button" className="ghost" onClick={() => setAnalysisRange(null)}>
              Clear pull
            </button>
          )}
          {page !== 'charts' && (
            <button type="button" className="ghost" onClick={() => setPage('charts')}>
              Select pull on Charts
            </button>
          )}
        </div>
      </div>

      {page === 'charts' && (
        <div className="viewer-body">
          <aside className="viewer-sidebar">
            <div className="meta-card">
              <div className="meta-title">{log.meta.filename}</div>
              <div className="meta-grid">
                <span>Rows</span>
                <strong>{log.meta.rowCount.toLocaleString()}</strong>
                <span>Duration</span>
                <strong>{log.meta.durationSec.toFixed(1)} s</strong>
                <span>Rate</span>
                <strong>~{log.meta.sampleRateHz.toFixed(1)} Hz</strong>
                <span>Channels</span>
                <strong>{displayLog.channels.length}</strong>
              </div>
            </div>

            <div className="preset-bar">
              <div className="panel-header">Layouts</div>
              <div className="preset-buttons">
                {[...builtins, ...customs].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={presetId === p.id ? 'active' : ''}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="save-layout">
                <input
                  placeholder="Save layout as…"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
                <button type="button" onClick={saveLayout}>
                  Save
                </button>
              </div>
              {customs.map((c) => (
                <button
                  key={`del-${c.id}`}
                  type="button"
                  className="ghost danger"
                  onClick={() => {
                    setCustoms(deleteCustomLayout(c.id))
                    if (presetId === c.id) applyPreset(builtins[0]?.id ?? 'boost')
                  }}
                >
                  Delete “{c.name}”
                </button>
              ))}
            </div>

            <ChannelPicker
              log={displayLog}
              panes={panes}
              activePaneId={activePaneId}
              onActivePaneId={setActivePaneId}
              onChange={(next) => {
                setPanes(next)
                setPresetId('custom')
              }}
            />
          </aside>

          <section className="viewer-main">
            <div className="toolbar">
              <button
                type="button"
                onClick={() => setXRange({ start: log.meta.tMin, end: log.meta.tMax })}
              >
                Reset zoom
              </button>
              <button
                type="button"
                className={selectMode ? 'active' : ''}
                onClick={() => setSelectMode((v) => !v)}
                title="Drag on chart to select analysis pull (S)"
              >
                {selectMode ? 'Selecting pull…' : 'Select pull'}
              </button>
              {analysisRange && (
                <button type="button" onClick={() => setXRange({ ...analysisRange })}>
                  Fit to pull
                </button>
              )}
              <button type="button" onClick={exportVisible}>
                Export CSV
              </button>
              <span className="toolbar-hint">
                Drag pan · wheel zoom · Shift+drag box zoom · R reset · S select pull · F fit pull
              </span>
            </div>

            <div className="cursor-readout">
              <strong>
                t=
                {cursorTime != null ? cursorTime.toFixed(3) : '—'}s
              </strong>
              {readout.map((r) => (
                <span key={r.id} style={{ color: r.color }}>
                  {r.label}: {r.value != null ? r.value.toFixed(3) : '—'}
                  {r.unit ? ` ${r.unit}` : ''}
                </span>
              ))}
            </div>

            <div className="chart-stack">
              <div className="chart-stack-viewport" ref={chartStackRef}>
                {panes.length === 0 && (
                  <div className="empty-charts">Pick channels or a preset layout to plot.</div>
                )}
                {panes.map((pane) => (
                  <UPlotPane
                    key={pane.id}
                    log={displayLog}
                    pane={pane}
                    xRange={xRange}
                    cursorTime={cursorTime}
                    selecting={selectMode}
                    height={paneHeight}
                    onXRangeChange={setXRange}
                    onCursorTime={setCursorTime}
                    onBoxSelect={(range) => {
                      setAnalysisRange(range)
                      setSelectMode(false)
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {page === 'map' && (
        <div className="viewer-page-content">
          <MapTablePanel log={displayLog} range={analysisRange} />
        </div>
      )}

      {page === 'power' && (
        <div className="viewer-page-content">
          <PowerPanel log={displayLog} range={analysisRange} />
        </div>
      )}

      {page === 'histogram' && (
        <div className="viewer-page-content">
          <HistogramPanel log={displayLog} range={analysisRange} />
        </div>
      )}
    </div>
  )
}
