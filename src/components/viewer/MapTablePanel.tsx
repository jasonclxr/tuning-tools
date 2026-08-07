import { useMemo, useState } from 'react'
import {
  buildMapTable,
  cellColor,
  defaultLoadEdges,
  defaultMapPsiEdges,
  defaultRpmEdges,
  formatEdgesForInput,
  parseEdgeList,
  suggestAxisChannels,
  type MapAgg,
} from '../../lib/mapTable'
import type { ParsedLog, TimeRange } from '../../lib/types'

interface Props {
  log: ParsedLog
  range: TimeRange | null
}

function formatEdge(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(0)
  if (Math.abs(n) >= 10) return n.toFixed(1)
  // Load-style 1/16 bins → clean decimals (0.0625, 0.125, …)
  const rounded = Math.round(n * 10000) / 10000
  const s = rounded.toFixed(4).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

function formatCell(v: number | null, agg: MapAgg): string {
  if (v == null) return ''
  if (agg === 'count') return String(Math.round(v))
  if (Math.abs(v) >= 100) return v.toFixed(0)
  if (Math.abs(v) >= 10) return v.toFixed(1)
  return v.toFixed(2)
}

export function MapTablePanel({ log, range }: Props) {
  const suggested = useMemo(() => suggestAxisChannels(log), [log])
  const [xChannelId, setXChannelId] = useState(suggested.xId)
  const [yChannelId, setYChannelId] = useState(suggested.yId)
  const [zChannelId, setZChannelId] = useState(suggested.zId)
  const [agg, setAgg] = useState<MapAgg>('avg')
  const [xEdgesText, setXEdgesText] = useState(() => formatEdgesForInput(defaultRpmEdges()))
  const [yEdgesText, setYEdgesText] = useState(() => {
    const yCh = log.channels.find((c) => c.id === suggested.yId)
    if (yCh?.role === 'absoluteLoad') return formatEdgesForInput(defaultLoadEdges())
    if (yCh?.role === 'boost' || yCh?.name.toLowerCase().includes('boost')) {
      return formatEdgesForInput(defaultMapPsiEdges())
    }
    return formatEdgesForInput(defaultLoadEdges())
  })
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)

  const xEdges = useMemo(() => parseEdgeList(xEdgesText) ?? defaultRpmEdges(), [xEdgesText])
  const yEdges = useMemo(() => parseEdgeList(yEdgesText) ?? defaultLoadEdges(), [yEdgesText])

  const result = useMemo(
    () =>
      buildMapTable(log, {
        xChannelId,
        yChannelId,
        zChannelId,
        xEdges,
        yEdges,
        agg,
        range,
      }),
    [log, xChannelId, yChannelId, zChannelId, xEdges, yEdges, agg, range],
  )

  const zCh = log.channels.find((c) => c.id === zChannelId)
  const colorMode =
    zCh?.id.includes('error') ||
    zCh?.role === 'knockRetard' ||
    zCh?.id === '__derived_knock_activity'
      ? 'diverging'
      : 'heat'

  const hoverInfo =
    hover && result
      ? {
          x: result.xEdges[hover.x],
          y: result.yEdges[hover.y],
          value: result.values[hover.y][hover.x],
          count: result.cells[hover.y][hover.x].count,
        }
      : null

  return (
    <div className="map-table-panel">
      <div className="panel-header">Map table (Y × X)</div>
      <div className="hist-controls map-controls">
        <label>
          X (columns)
          <select value={xChannelId} onChange={(e) => setXChannelId(e.target.value)}>
            {log.channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.unit ? ` (${c.unit})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Y (rows)
          <select value={yChannelId} onChange={(e) => setYChannelId(e.target.value)}>
            {log.channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.unit ? ` (${c.unit})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cell value
          <select value={zChannelId} onChange={(e) => setZChannelId(e.target.value)}>
            {log.channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.unit ? ` (${c.unit})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Aggregate
          <select value={agg} onChange={(e) => setAgg(e.target.value as MapAgg)}>
            <option value="avg">Average</option>
            <option value="max">Max</option>
            <option value="min">Min</option>
            <option value="count">Hit count</option>
          </select>
        </label>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const s = suggestAxisChannels(log)
            setXChannelId(s.xId)
            setYChannelId(s.yId)
            setZChannelId(s.zId)
            setXEdgesText(formatEdgesForInput(defaultRpmEdges()))
            const yCh = log.channels.find((c) => c.id === s.yId)
            setYEdgesText(
              formatEdgesForInput(
                yCh?.role === 'absoluteLoad' ? defaultLoadEdges() : defaultMapPsiEdges(),
              ),
            )
            setAgg('avg')
          }}
        >
          Reset axes
        </button>
      </div>
      <div className="map-edge-editors">
        <label>
          X sites
          <input value={xEdgesText} onChange={(e) => setXEdgesText(e.target.value)} />
        </label>
        <label>
          Y sites
          <input value={yEdgesText} onChange={(e) => setYEdgesText(e.target.value)} />
        </label>
      </div>
      <div className="hist-meta">
        hits={result?.hitCount ?? 0}
        {range ? ` · pull ${range.start.toFixed(2)}–${range.end.toFixed(2)}s` : ' · full log'}
        {hoverInfo && (
          <>
            {' '}
            · cell X={formatEdge(hoverInfo.x)}, Y={formatEdge(hoverInfo.y)}:{" "}
            {formatCell(hoverInfo.value, agg)}
            {agg !== 'count' ? ` (n=${hoverInfo.count})` : ''}
          </>
        )}
      </div>
      {result && (
        <div className="map-scroll">
          <table className="map-table">
            <thead>
              <tr>
                <th className="map-corner">
                  {log.channels.find((c) => c.id === yChannelId)?.name ?? 'Y'}＼
                  {log.channels.find((c) => c.id === xChannelId)?.name ?? 'X'}
                </th>
                {result.xEdges.map((site, i) => (
                  <th key={i}>{formatEdge(site)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Load: 1/16 at top → 2 at bottom */}
              {result.values.map((row, yi) => (
                <tr key={yi}>
                  <th>{formatEdge(result.yEdges[yi])}</th>
                  {row.map((value, xi) => (
                    <td
                      key={xi}
                      style={{
                        background: cellColor(
                          value,
                          result.globalMin,
                          result.globalMax,
                          colorMode,
                        ),
                      }}
                      className={value == null ? 'empty' : ''}
                      onMouseEnter={() => setHover({ x: xi, y: yi })}
                      onMouseLeave={() => setHover(null)}
                    >
                      {formatCell(value, agg)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
