import { useEffect, useMemo, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { downsampleMinMax } from '../../lib/downsample'
import type { ChartPane, ParsedChannel, ParsedLog, TimeRange } from '../../lib/types'

interface Props {
  log: ParsedLog
  pane: ChartPane
  xRange: TimeRange
  cursorTime: number | null
  selecting: boolean
  onXRangeChange: (range: TimeRange) => void
  onCursorTime: (t: number | null) => void
  onBoxSelect?: (range: TimeRange) => void
  height?: number
}

function scaleKeyForChannel(ch: ParsedChannel | undefined, channelId: string): string {
  if (!ch) return `y_${sanitize(channelId)}`
  const unit = ch.unit?.trim()
  if (unit) return `y_${sanitize(unit)}`
  if (ch.role) return `y_${sanitize(ch.role)}`
  return `y_${sanitize(channelId)}`
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'value'
}

function scaleLabel(ch: ParsedChannel | undefined, channelId: string): string {
  if (!ch) return channelId
  if (ch.unit?.trim()) return ch.unit.trim()
  if (ch.role) return ch.role
  return ch.name
}

function paddedRange(
  _u: uPlot,
  dataMin: number | null,
  dataMax: number | null,
): [number, number] {
  if (dataMin == null || dataMax == null || !Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return [0, 1]
  }
  if (dataMin === dataMax) {
    const pad = Math.max(Math.abs(dataMin) * 0.05, 1)
    return [dataMin - pad, dataMax + pad]
  }
  const pad = (dataMax - dataMin) * 0.08
  return [dataMin - pad, dataMax + pad]
}

const AXIS_COLORS = ['#8b949e', '#58a6ff', '#3fb950', '#d29922', '#f85149', '#a371f7']

export function UPlotPane({
  log,
  pane,
  xRange,
  cursorTime,
  selecting,
  onXRangeChange,
  onCursorTime,
  onBoxSelect,
  height = 180,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)
  const rangeRef = useRef(xRange)
  const selectRef = useRef(selecting)
  rangeRef.current = xRange
  selectRef.current = selecting

  const visibleSeries = pane.series.filter((s) => s.visible)

  const scalePlan = useMemo(() => {
    const order: string[] = []
    const labels = new Map<string, string>()
    const seriesScale: string[] = []

    for (const s of visibleSeries) {
      const ch = log.channels.find((c) => c.id === s.channelId)
      const key = scaleKeyForChannel(ch, s.channelId)
      seriesScale.push(key)
      if (!labels.has(key)) {
        order.push(key)
        labels.set(key, scaleLabel(ch, s.channelId))
      }
    }
    return { order, labels, seriesScale }
  }, [log.channels, visibleSeries])

  useEffect(() => {
    if (!rootRef.current) return

    const series: uPlot.Series[] = [{ label: 'Time' }]
    for (let i = 0; i < visibleSeries.length; i++) {
      const s = visibleSeries[i]
      const ch = log.channels.find((c) => c.id === s.channelId)
      series.push({
        label: ch ? `${ch.name}${ch.unit ? ` (${ch.unit})` : ''}` : s.channelId,
        stroke: s.color,
        width: 1.5,
        points: { show: false },
        scale: scalePlan.seriesScale[i],
      })
    }

    const scales: uPlot.Scales = {
      x: { time: false, min: xRange.start, max: xRange.end },
    }
    for (const key of scalePlan.order) {
      scales[key] = { auto: true, range: paddedRange }
    }

    // X axis + up to two labeled Y axes (left/right). Extra unit groups still auto-scale independently.
    const axes: uPlot.Axis[] = [
      {
        stroke: '#8b949e',
        grid: { stroke: '#21262d', width: 1 },
        ticks: { stroke: '#30363d' },
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
      },
    ]

    scalePlan.order.forEach((key, i) => {
      const side: 1 | 3 = i % 2 === 0 ? 3 : 1
      const showSpine = i < 4
      axes.push({
        scale: key,
        side,
        stroke: AXIS_COLORS[i % AXIS_COLORS.length],
        grid: i === 0 ? { stroke: '#21262d', width: 1 } : { show: false },
        ticks: { stroke: '#30363d', show: showSpine },
        show: showSpine,
        size: showSpine ? 54 : 0,
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
        label: scalePlan.labels.get(key) ?? key,
        labelSize: 11,
        labelFont: '11px IBM Plex Sans, sans-serif',
        values: (_u, splits) =>
          splits.map((v) => {
            if (!Number.isFinite(v)) return ''
            const abs = Math.abs(v)
            if (abs >= 1000) return v.toFixed(0)
            if (abs >= 10) return v.toFixed(1)
            if (abs >= 1) return v.toFixed(2)
            return v.toFixed(3)
          }),
      })
    })

    const opts: uPlot.Options = {
      width: rootRef.current.clientWidth || 600,
      height,
      series,
      scales,
      axes,
      cursor: {
        lock: false,
        focus: { prox: 24 },
        // Select-pull mode uses uPlot drag-select; normal mode uses our pan handlers.
        drag: {
          x: selectRef.current,
          y: false,
          setScale: false,
        },
        bind: {
          dblclick: () => {
            onXRangeChange({ start: log.meta.tMin, end: log.meta.tMax })
            return null
          },
        },
      },
      legend: { show: false },
      hooks: {
        ready: [
          (u) => {
            const over = u.over
            over.style.cursor = selectRef.current ? 'crosshair' : 'grab'

            const onWheel = (e: WheelEvent) => {
              e.preventDefault()
              e.stopPropagation()
              if (selectRef.current) return

              const min = u.scales.x.min
              const max = u.scales.x.max
              if (min == null || max == null) return

              const rect = over.getBoundingClientRect()
              const xPos =
                u.cursor.left != null && u.cursor.left >= 0
                  ? u.cursor.left
                  : e.clientX - rect.left
              const cursorVal = u.posToVal(Math.max(0, Math.min(rect.width, xPos)), 'x')
              const span = max - min
              if (span <= 0) return

              const factor = e.deltaY < 0 ? 0.8 : 1.25
              const leftPct = Math.min(1, Math.max(0, (cursorVal - min) / span))
              let newSpan = span * factor
              const fullSpan = log.meta.tMax - log.meta.tMin
              const minSpan = Math.max(fullSpan * 0.0005, 0.05)
              newSpan = Math.min(fullSpan, Math.max(minSpan, newSpan))

              let newMin = cursorVal - leftPct * newSpan
              let newMax = newMin + newSpan
              if (newMin < log.meta.tMin) {
                newMin = log.meta.tMin
                newMax = newMin + newSpan
              }
              if (newMax > log.meta.tMax) {
                newMax = log.meta.tMax
                newMin = newMax - newSpan
              }
              newMin = Math.max(log.meta.tMin, newMin)
              newMax = Math.min(log.meta.tMax, newMax)
              if (newMax - newMin < minSpan) return

              onXRangeChange({ start: newMin, end: newMax })
            }

            // Click-drag pan (default). Shift+drag box-zooms. Select-pull mode uses uPlot select.
            let panning = false
            let panStartX = 0
            let panStartMin = 0
            let panStartMax = 0
            let boxZooming = false

            const onPointerDown = (e: PointerEvent) => {
              if (e.button !== 0) return
              if (selectRef.current) return

              const min = u.scales.x.min
              const max = u.scales.x.max
              if (min == null || max == null) return

              if (e.shiftKey) {
                // Let a simple box-zoom selection run via pointer move/up
                boxZooming = true
                panStartX = e.clientX
                const rect = over.getBoundingClientRect()
                const left = e.clientX - rect.left
                u.setSelect({ left, width: 0, top: 0, height: u.bbox.height / devicePixelRatio }, false)
                over.setPointerCapture(e.pointerId)
                e.preventDefault()
                return
              }

              panning = true
              panStartX = e.clientX
              panStartMin = min
              panStartMax = max
              over.style.cursor = 'grabbing'
              over.setPointerCapture(e.pointerId)
              e.preventDefault()
            }

            const onPointerMove = (e: PointerEvent) => {
              if (boxZooming) {
                const rect = over.getBoundingClientRect()
                const x0 = panStartX - rect.left
                const x1 = e.clientX - rect.left
                const left = Math.min(x0, x1)
                const width = Math.abs(x1 - x0)
                u.setSelect(
                  { left, width, top: 0, height: u.bbox.height / devicePixelRatio },
                  false,
                )
                return
              }
              if (!panning) return
              const dx = e.clientX - panStartX
              const span = panStartMax - panStartMin
              if (span <= 0 || u.bbox.width <= 0) return
              const plotWidth = u.bbox.width / devicePixelRatio
              const dVal = (-dx / plotWidth) * span
              let newMin = panStartMin + dVal
              let newMax = panStartMax + dVal
              if (newMin < log.meta.tMin) {
                newMin = log.meta.tMin
                newMax = newMin + span
              }
              if (newMax > log.meta.tMax) {
                newMax = log.meta.tMax
                newMin = newMax - span
              }
              onXRangeChange({ start: newMin, end: newMax })
            }

            const onPointerUp = (e: PointerEvent) => {
              if (boxZooming) {
                boxZooming = false
                const left = u.select.left
                const width = u.select.width
                u.setSelect({ left: 0, width: 0, top: 0, height: 0 }, false)
                if (width >= 4) {
                  const a = u.posToVal(left, 'x')
                  const b = u.posToVal(left + width, 'x')
                  onXRangeChange({
                    start: Math.max(log.meta.tMin, Math.min(a, b)),
                    end: Math.min(log.meta.tMax, Math.max(a, b)),
                  })
                }
                try {
                  over.releasePointerCapture(e.pointerId)
                } catch {
                  /* ignore */
                }
                return
              }
              if (!panning) return
              panning = false
              over.style.cursor = 'grab'
              try {
                over.releasePointerCapture(e.pointerId)
              } catch {
                /* ignore */
              }
            }

            over.addEventListener('wheel', onWheel, { passive: false })
            over.addEventListener('pointerdown', onPointerDown)
            over.addEventListener('pointermove', onPointerMove)
            over.addEventListener('pointerup', onPointerUp)
            over.addEventListener('pointercancel', onPointerUp)
          },
        ],
        setCursor: [
          (u) => {
            const idx = u.cursor.idx
            if (idx == null || idx < 0) {
              onCursorTime(null)
              return
            }
            const t = u.data[0][idx]
            if (typeof t === 'number') onCursorTime(t)
          },
        ],
        setSelect: [
          (u) => {
            if (!selectRef.current || !onBoxSelect) return
            const left = u.select.left
            const width = u.select.width
            if (width < 4) return
            const leftVal = u.posToVal(left, 'x')
            const rightVal = u.posToVal(left + width, 'x')
            onBoxSelect({
              start: Math.min(leftVal, rightVal),
              end: Math.max(leftVal, rightVal),
            })
            u.setSelect({ left: 0, width: 0, top: 0, height: 0 }, false)
          },
        ],
      },
    }

    const data = buildData(log, visibleSeries, xRange)
    const plot = new uPlot(opts, data, rootRef.current)
    plotRef.current = plot

    const ro = new ResizeObserver(() => {
      if (!rootRef.current || !plotRef.current) return
      plotRef.current.setSize({
        width: rootRef.current.clientWidth,
        height,
      })
    })
    ro.observe(rootRef.current)

    return () => {
      ro.disconnect()
      plot.destroy()
      plotRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    log,
    pane.id,
    visibleSeries.map((s) => `${s.channelId}:${s.color}`).join('|'),
    scalePlan.order.join('|'),
    height,
    selecting,
  ])

  useEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    const data = buildData(log, visibleSeries, xRange)
    plot.setData(data, false)
    plot.setScale('x', { min: xRange.start, max: xRange.end })
  }, [log, visibleSeries, xRange])

  useEffect(() => {
    const plot = plotRef.current
    if (!plot || cursorTime == null) return
    const xs = plot.data[0] as number[]
    if (!xs.length) return
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(xs[i] - cursorTime)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    const left = plot.valToPos(xs[best], 'x')
    if (Number.isFinite(left) && Math.abs((plot.cursor.left ?? -999) - left) > 0.5) {
      plot.setCursor({ left, top: plot.cursor.top ?? 0 })
    }
  }, [cursorTime])

  const unitLegend = scalePlan.order.map((key, i) => ({
    key,
    label: scalePlan.labels.get(key) ?? key,
    color: AXIS_COLORS[i % AXIS_COLORS.length],
  }))

  return (
    <div className="uplot-pane-wrap">
      {unitLegend.length > 1 && (
        <div className="scale-legend">
          {unitLegend.map((u) => (
            <span key={u.key} style={{ color: u.color }}>
              {u.label}
            </span>
          ))}
        </div>
      )}
      <div className="uplot-pane" ref={rootRef} />
    </div>
  )
}

function buildData(
  log: ParsedLog,
  visibleSeries: ChartPane['series'],
  xRange: TimeRange,
): uPlot.AlignedData {
  const span = xRange.end - xRange.start
  const maxPoints = span / (log.meta.tMax - log.meta.tMin) < 0.25 ? 8000 : 2500

  if (visibleSeries.length === 0) {
    return [[xRange.start, xRange.end]]
  }

  const prepared = visibleSeries.map((s) => {
    const ch = log.channels.find((c) => c.id === s.channelId)
    if (!ch) return { x: [] as number[], y: [] as (number | null)[] }
    return downsampleMinMax(log.time, ch.data, maxPoints, xRange.start, xRange.end)
  })

  const master = prepared.find((p) => p.x.length > 0) ?? prepared[0]
  const xs = master.x
  const cols: uPlot.AlignedData = [xs]

  for (let s = 0; s < prepared.length; s++) {
    const p = prepared[s]
    if (p.x === xs) {
      cols.push(p.y as number[])
      continue
    }
    const y: (number | null)[] = xs.map((t) => {
      if (!p.x.length) return null
      let lo = 0
      let hi = p.x.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (p.x[mid] < t) lo = mid + 1
        else hi = mid
      }
      const i = lo > 0 && Math.abs(p.x[lo - 1] - t) < Math.abs(p.x[lo] - t) ? lo - 1 : lo
      return p.y[i] ?? null
    })
    cols.push(y as number[])
  }

  return cols
}
