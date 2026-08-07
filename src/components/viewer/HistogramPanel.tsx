import { useMemo, useState } from 'react'
import { buildHistogram } from '../../lib/histogram'
import type { HistogramFilter, ParsedLog, TimeRange } from '../../lib/types'

interface Props {
  log: ParsedLog
  range: TimeRange | null
}

export function HistogramPanel({ log, range }: Props) {
  const defaultChannel =
    log.channels.find((c) => c.role === 'afrGas')?.id ??
    log.channels.find((c) => c.role === 'actualLambda')?.id ??
    log.channels.find((c) => c.id === '__derived_knock_activity')?.id ??
    log.channels.find((c) => c.role === 'knockRetard')?.id ??
    log.channels[0]?.id ??
    ''

  const [channelId, setChannelId] = useState(defaultChannel)
  const [bins, setBins] = useState(40)
  const [filter, setFilter] = useState<HistogramFilter>({})

  const result = useMemo(
    () => (channelId ? buildHistogram(log, channelId, bins, range, filter) : null),
    [log, channelId, bins, range, filter],
  )

  const maxCount = result ? Math.max(1, ...result.counts) : 1

  return (
    <div className="histogram-panel">
      <div className="panel-header">Histogram</div>
      <div className="hist-controls">
        <label>
          Channel
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            {log.channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.unit ? ` (${c.unit})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bins
          <input
            type="number"
            min={5}
            max={120}
            value={bins}
            onChange={(e) => setBins(Number(e.target.value) || 40)}
          />
        </label>
      </div>
      <div className="hist-filters">
        <span>Filters</span>
        <Num label="RPM ≥" value={filter.rpmMin} onChange={(v) => setFilter({ ...filter, rpmMin: v })} />
        <Num label="RPM ≤" value={filter.rpmMax} onChange={(v) => setFilter({ ...filter, rpmMax: v })} />
        <Num label="Load ≥" value={filter.loadMin} onChange={(v) => setFilter({ ...filter, loadMin: v })} />
        <Num label="Load ≤" value={filter.loadMax} onChange={(v) => setFilter({ ...filter, loadMax: v })} />
        <Num label="TPS ≥" value={filter.tpsMin} onChange={(v) => setFilter({ ...filter, tpsMin: v })} />
        <Num label="TPS ≤" value={filter.tpsMax} onChange={(v) => setFilter({ ...filter, tpsMax: v })} />
        <button type="button" className="ghost" onClick={() => setFilter({})}>
          Clear
        </button>
      </div>
      {result && (
        <>
          <div className="hist-meta">
            n={result.sampleCount}
            {range ? ` · range ${range.start.toFixed(2)}–${range.end.toFixed(2)}s` : ' · full log'}
            {result.sampleCount > 0 &&
              ` · ${result.min.toFixed(3)} … ${result.max.toFixed(3)}`}
          </div>
          <div className="hist-bars">
            {result.counts.map((count, i) => (
              <div
                key={i}
                className="hist-bar"
                style={{ height: `${(count / maxCount) * 100}%` }}
                title={`${result.bins[i]?.toFixed(3)} → ${count}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string
  value?: number
  onChange: (v: number | undefined) => void
}) {
  return (
    <label className="num-filter">
      {label}
      <input
        type="number"
        value={value ?? ''}
        placeholder="—"
        onChange={(e) => {
          const t = e.target.value
          onChange(t === '' ? undefined : Number(t))
        }}
      />
    </label>
  )
}
