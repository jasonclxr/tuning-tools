import { findChannelByRole } from './channels'
import { indexNearTime } from './downsample'
import type { ParsedChannel, ParsedLog, TimeRange } from './types'

/** Wideband readings at/above this AFR are treated as decel fuel cut and excluded from mixture maps. */
const DECEL_FUEL_CUT_AFR = 27
/** Gasoline stoich used only to express the fuel-cut threshold in λ when the Z channel is lambda. */
const FUEL_CUT_STOICH_AFR = 14.7
const DECEL_FUEL_CUT_LAMBDA = DECEL_FUEL_CUT_AFR / FUEL_CUT_STOICH_AFR

/** True when this sample is a lean peg from decel fuel cut (not useful for mixture mapping). */
function isDecelFuelCutSample(zCh: ParsedChannel, zv: number): boolean {
  const isMixture =
    zCh.role === 'afrGas' ||
    zCh.role === 'actualLambda' ||
    zCh.id === '__derived_lambda'
  if (!isMixture) return false
  const unit = (zCh.unit ?? '').toLowerCase()
  if (unit === 'λ' || unit === 'lambda' || unit.includes('λ')) {
    return zv >= DECEL_FUEL_CUT_LAMBDA
  }
  // AFR (native or converted from λ)
  return zv >= DECEL_FUEL_CUT_AFR
}

export type MapAgg = 'avg' | 'max' | 'min' | 'count'

export interface MapTableOptions {
  xChannelId: string
  yChannelId: string
  zChannelId: string
  xEdges: number[]
  yEdges: number[]
  agg: MapAgg
  range: TimeRange | null
}

export interface MapTableCell {
  sum: number
  min: number
  max: number
  count: number
}

export interface MapTableResult {
  xEdges: number[]
  yEdges: number[]
  /** cells[y][x] */
  cells: MapTableCell[][]
  values: (number | null)[][]
  globalMin: number
  globalMax: number
  hitCount: number
}

export function defaultRpmEdges(): number[] {
  const edges: number[] = []
  for (let rpm = 500; rpm <= 7500; rpm += 250) edges.push(rpm)
  return edges
}

/** Absolute load as 1/16–2 in 1/16 steps (no 0 site). */
export function defaultLoadEdges(): number[] {
  const edges: number[] = []
  for (let i = 1; i <= 32; i++) {
    edges.push(i / 16)
  }
  return edges
}

/** Format edges for the editable edge-list inputs. */
export function formatEdgesForInput(edges: number[]): string {
  return edges
    .map((n) => {
      if (Number.isInteger(n)) return String(n)
      const s = (Math.round(n * 1e6) / 1e6).toString()
      return s
    })
    .join(', ')
}

export function defaultMapPsiEdges(): number[] {
  const edges: number[] = []
  for (let p = -10; p <= 25; p += 2.5) edges.push(p)
  return edges
}

export function suggestAxisChannels(log: ParsedLog): {
  xId: string
  yId: string
  zId: string
} {
  const rpm = findChannelByRole(log.channels, 'rpm')
  const load = findChannelByRole(log.channels, 'absoluteLoad')
  const map = findChannelByRole(log.channels, 'mapKpa')
  const boost = findChannelByRole(log.channels, 'boost')
  const knock =
    log.channels.find((c) => c.id === '__derived_knock_activity')?.id ??
    findChannelByRole(log.channels, 'knockRetard')
  const afrErr = log.channels.find((c) => c.id === '__derived_afr_error')?.id
  const lambdaErr = log.channels.find((c) => c.id === '__derived_lambda_error')?.id
  const afr = findChannelByRole(log.channels, 'afrGas')
  const lambda = findChannelByRole(log.channels, 'actualLambda')

  return {
    xId: rpm ?? log.channels[0]?.id ?? '',
    yId: load ?? boost ?? map ?? log.channels[1]?.id ?? '',
    zId: knock ?? afrErr ?? lambdaErr ?? afr ?? lambda ?? log.channels[2]?.id ?? '',
  }
}

function siteIndex(value: number, sites: number[]): number {
  if (!Number.isFinite(value) || sites.length === 0) return -1
  const lo = sites[0]
  const hi = sites[sites.length - 1]
  // Allow a half-step past the ends so endpoint sites still collect hits
  const stepLo = sites.length > 1 ? sites[1] - sites[0] : 0
  const stepHi = sites.length > 1 ? sites[sites.length - 1] - sites[sites.length - 2] : 0
  if (value < lo - stepLo / 2 || value > hi + stepHi / 2) return -1

  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < sites.length; i++) {
    const d = Math.abs(sites[i] - value)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

function emptyCell(): MapTableCell {
  return { sum: 0, min: Infinity, max: -Infinity, count: 0 }
}

export function buildMapTable(log: ParsedLog, options: MapTableOptions): MapTableResult | null {
  const xCh = log.channels.find((c) => c.id === options.xChannelId)
  const yCh = log.channels.find((c) => c.id === options.yChannelId)
  const zCh = log.channels.find((c) => c.id === options.zChannelId)
  if (!xCh || !yCh || !zCh) return null
  if (options.xEdges.length < 1 || options.yEdges.length < 1) return null

  // Axis lists are map *sites* (including endpoints like load=2 and RPM=7500).
  const nx = options.xEdges.length
  const ny = options.yEdges.length
  const cells: MapTableCell[][] = Array.from({ length: ny }, () =>
    Array.from({ length: nx }, () => emptyCell()),
  )

  let i0 = 0
  let i1 = log.time.length - 1
  if (options.range) {
    i0 = indexNearTime(log.time, options.range.start)
    i1 = indexNearTime(log.time, options.range.end)
    if (i1 < i0) [i0, i1] = [i1, i0]
  }

  let hitCount = 0
  for (let i = i0; i <= i1; i++) {
    const xv = xCh.data[i]
    const yv = yCh.data[i]
    const zv = zCh.data[i]
    if (!Number.isFinite(xv) || !Number.isFinite(yv) || !Number.isFinite(zv)) continue
    if (isDecelFuelCutSample(zCh, zv)) continue
    const xi = siteIndex(xv, options.xEdges)
    const yi = siteIndex(yv, options.yEdges)
    if (xi < 0 || yi < 0) continue
    const cell = cells[yi][xi]
    cell.sum += zv
    cell.count += 1
    cell.min = Math.min(cell.min, zv)
    cell.max = Math.max(cell.max, zv)
    hitCount++
  }

  let globalMin = Infinity
  let globalMax = -Infinity
  const values: (number | null)[][] = cells.map((row) =>
    row.map((cell) => {
      if (cell.count === 0) return null
      let v: number
      switch (options.agg) {
        case 'max':
          v = cell.max
          break
        case 'min':
          v = cell.min
          break
        case 'count':
          v = cell.count
          break
        case 'avg':
        default:
          v = cell.sum / cell.count
          break
      }
      globalMin = Math.min(globalMin, v)
      globalMax = Math.max(globalMax, v)
      return v
    }),
  )

  if (!Number.isFinite(globalMin)) {
    globalMin = 0
    globalMax = 0
  }

  return {
    xEdges: options.xEdges,
    yEdges: options.yEdges,
    cells,
    values,
    globalMin,
    globalMax,
    hitCount,
  }
}

/** Diverging color for signed channels (error / knock); warm for magnitude. */
export function cellColor(
  value: number | null,
  min: number,
  max: number,
  mode: 'diverging' | 'heat',
): string {
  if (value == null || !Number.isFinite(value)) return 'transparent'
  if (mode === 'diverging') {
    const lim = Math.max(Math.abs(min), Math.abs(max), 1e-9)
    const t = Math.max(-1, Math.min(1, value / lim))
    if (t >= 0) {
      const a = t
      return `rgba(248, 81, 73, ${0.15 + a * 0.75})`
    }
    const a = -t
    return `rgba(63, 185, 80, ${0.15 + a * 0.75})`
  }
  const span = max - min || 1
  const t = Math.max(0, Math.min(1, (value - min) / span))
  // dark → amber → red
  const r = Math.round(40 + t * 200)
  const g = Math.round(50 + (1 - t) * 120)
  const b = Math.round(60 - t * 40)
  return `rgb(${r},${g},${b})`
}

export function parseEdgeList(text: string): number[] | null {
  const parts = text
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(Number)
  if (parts.length < 1 || parts.some((n) => !Number.isFinite(n))) return null
  const sorted = [...parts].sort((a, b) => a - b)
  return sorted
}
