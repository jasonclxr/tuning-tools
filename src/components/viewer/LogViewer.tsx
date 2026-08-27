import { useEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { indexNearTime } from '../../lib/downsample'
import { downloadText, exportLogRangeCsv } from '../../lib/exportCsv'
import { logSourceLabel } from '../../lib/logFormat'
import { defaultChartPanes } from '../../lib/presets'
import { adaptLogForDisplay } from '../../lib/units'
import { addGearChannel, formatGear, isGearChannel } from '../../lib/gear'
import { addPowerTorqueChannels } from '../../lib/powerTorque'
import type { ChartPane, ParsedLog, TimeRange } from '../../lib/types'
import { UPlotPane } from '../charts/UPlotPane'
import { ChannelPicker } from './ChannelPicker'
import { MapTablePanel } from './MapTablePanel'
import { PowerPanel } from './PowerPanel'

export type ViewerPage = 'charts' | 'map' | 'power'

interface Props {
  log: ParsedLog
  page: ViewerPage
  onPageChange: (page: ViewerPage) => void
}

export function LogViewer({ log, page, onPageChange }: Props) {
  const { settings } = useSettings()
  const displayLog = useMemo(() => {
    const withPower = addPowerTorqueChannels(log, settings)
    return adaptLogForDisplay(addGearChannel(withPower, settings), settings)
  }, [log, settings])
  const [panes, setPanes] = useState<ChartPane[]>(() => defaultChartPanes(displayLog))
  const [activePaneId, setActivePaneId] = useState('pane-1')
  const [xRange, setXRange] = useState<TimeRange>({
    start: log.meta.tMin,
    end: log.meta.tMax,
  })
  const [analysisRange, setAnalysisRange] = useState<TimeRange | null>(null)
  const [cursorTime, setCursorTime] = useState<number | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const chartStackRef = useRef<HTMLDivElement>(null)
  const [paneHeight, setPaneHeight] = useState(280)

  useEffect(() => {
    const next = defaultChartPanes(displayLog)
    setPanes(next)
    setActivePaneId(next[0]?.id ?? 'pane-1')
    setXRange({ start: log.meta.tMin, end: log.meta.tMax })
    setAnalysisRange(null)
    setCursorTime(null)
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

  const cursorIdx = cursorTime != null ? indexNearTime(displayLog.time, cursorTime) : null

  const readout = useMemo(() => {
    const ids = panes.flatMap((p) => p.series.filter((s) => s.visible).map((s) => s.channelId))
    return ids.map((id) => {
      const ch = displayLog.channels.find((c) => c.id === id)
      const v = cursorIdx != null ? ch?.data[cursorIdx] : null
      return {
        id,
        label: ch?.name ?? id,
        unit: ch?.unit,
        color: panes.flatMap((p) => p.series).find((s) => s.channelId === id)?.color,
        value: v != null && Number.isFinite(v) ? v : null,
        gear: isGearChannel(ch),
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

  const pullLabel = analysisRange
    ? `Pull ${analysisRange.start.toFixed(2)}–${analysisRange.end.toFixed(2)}s`
    : 'Full log (no pull selected)'

  return (
    <div className={`viewer viewer-page-${page}`}>
      {page !== 'charts' && (
        <div className="viewer-context">
          <span>{pullLabel}</span>
          {analysisRange && (
            <button type="button" className="ghost" onClick={() => setAnalysisRange(null)}>
              Clear pull
            </button>
          )}
          <button type="button" className="ghost" onClick={() => onPageChange('charts')}>
            Select pull on Charts
          </button>
        </div>
      )}

      {page === 'charts' && (
        <div className="viewer-body">
          <aside className="viewer-sidebar">
            <div className="meta-card">
              <div className="meta-title">{log.meta.filename}</div>
              <div className="meta-grid">
                <span>Source</span>
                <strong>{logSourceLabel(log.meta.source)}</strong>
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

            <ChannelPicker
              log={displayLog}
              panes={panes}
              activePaneId={activePaneId}
              onActivePaneId={setActivePaneId}
              onChange={setPanes}
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
                <>
                  <button type="button" onClick={() => setXRange({ ...analysisRange })}>
                    Fit to pull
                  </button>
                  <button type="button" className="ghost" onClick={() => setAnalysisRange(null)}>
                    Clear pull
                  </button>
                </>
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
                  {r.label}:{' '}
                  {r.value != null ? (r.gear ? formatGear(r.value) : r.value.toFixed(3)) : '—'}
                  {r.unit && !r.gear ? ` ${r.unit}` : ''}
                </span>
              ))}
            </div>

            <div className="chart-stack">
              <div className="chart-stack-viewport" ref={chartStackRef}>
                {panes.length === 0 && (
                  <div className="empty-charts">Pick channels to plot.</div>
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
                    onCursorTime={(t) => {
                      setCursorTime((prev) => (prev === t ? prev : t))
                    }}
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
    </div>
  )
}
