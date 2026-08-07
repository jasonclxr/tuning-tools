import type { HistogramFilter, ParsedLog, TimeRange } from './types'
import { findChannelByRole } from './channels'
import { indexNearTime } from './downsample'

export interface HistogramResult {
  bins: number[]
  counts: number[]
  min: number
  max: number
  sampleCount: number
}

export function buildHistogram(
  log: ParsedLog,
  channelId: string,
  binCount: number,
  range: TimeRange | null,
  filter: HistogramFilter,
): HistogramResult | null {
  const channel = log.channels.find((c) => c.id === channelId)
  if (!channel) return null

  const rpmId = findChannelByRole(log.channels, 'rpm')
  const loadId = findChannelByRole(log.channels, 'absoluteLoad')
  const tpsId =
    findChannelByRole(log.channels, 'throttle') ??
    findChannelByRole(log.channels, 'acceleratorPedal')
  const rpm = rpmId ? log.channels.find((c) => c.id === rpmId)?.data : undefined
  const load = loadId ? log.channels.find((c) => c.id === loadId)?.data : undefined
  const tps = tpsId ? log.channels.find((c) => c.id === tpsId)?.data : undefined

  let i0 = 0
  let i1 = log.time.length - 1
  if (range) {
    i0 = indexNearTime(log.time, range.start)
    i1 = indexNearTime(log.time, range.end)
    if (i1 < i0) [i0, i1] = [i1, i0]
  }

  const values: number[] = []
  for (let i = i0; i <= i1; i++) {
    const v = channel.data[i]
    if (!Number.isFinite(v)) continue
    if (rpm && filter.rpmMin != null && (!(Number.isFinite(rpm[i])) || rpm[i] < filter.rpmMin)) continue
    if (rpm && filter.rpmMax != null && (!(Number.isFinite(rpm[i])) || rpm[i] > filter.rpmMax)) continue
    if (load && filter.loadMin != null && (!(Number.isFinite(load[i])) || load[i] < filter.loadMin)) continue
    if (load && filter.loadMax != null && (!(Number.isFinite(load[i])) || load[i] > filter.loadMax)) continue
    if (tps && filter.tpsMin != null && (!(Number.isFinite(tps[i])) || tps[i] < filter.tpsMin)) continue
    if (tps && filter.tpsMax != null && (!(Number.isFinite(tps[i])) || tps[i] > filter.tpsMax)) continue
    values.push(v)
  }

  if (values.length === 0) {
    return { bins: [], counts: [], min: 0, max: 0, sampleCount: 0 }
  }

  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  if (min === max) {
    max = min + 1
  }

  const bins = binCount
  const counts = new Array(bins).fill(0) as number[]
  const edges: number[] = []
  const width = (max - min) / bins
  for (let b = 0; b < bins; b++) {
    edges.push(min + b * width)
  }

  for (const v of values) {
    let idx = Math.floor((v - min) / width)
    if (idx >= bins) idx = bins - 1
    if (idx < 0) idx = 0
    counts[idx]++
  }

  return { bins: edges, counts, min, max, sampleCount: values.length }
}
