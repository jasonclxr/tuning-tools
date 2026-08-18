import { parseHeader } from './channels'
import type { LogSource } from './types'

const MAZDAEDIT_MARKERS = [
  'engine speed (rpm)',
  'vvt intake desired (deg)',
  'kcs learning value (deg)',
  'calculated engine load (obd) (%)',
  'manifold absolute pressure (psi)',
  'fuel injection amoung (mg/cyl)',
  'vvt exhaust actual position (deg)',
]

export function detectLogSource(headers: string[]): LogSource {
  const lower = new Set(headers.map((h) => h.trim().toLowerCase()))
  let mazdaHits = 0
  for (const marker of MAZDAEDIT_MARKERS) {
    if (lower.has(marker)) mazdaHits++
  }
  if (mazdaHits >= 2) return 'mazdaedit'
  if (
    lower.has('time (s)') ||
    lower.has('engine rpm') ||
    lower.has('absolute load') ||
    lower.has('intake manifold absolute pressure (kpa)')
  ) {
    return 'versa'
  }
  return 'unknown'
}

/** Factor that converts a time column's raw values into seconds. */
export function inferTimeToSecondsFactor(
  timeHeader: string,
  timeValues: ArrayLike<number>,
): number {
  const { unit } = parseHeader(timeHeader)
  if (unit) {
    const u = unit.toLowerCase()
    if (u === 'ms' || u === 'msec' || u.includes('millis')) return 0.001
    if (u === 's' || u === 'sec' || u === 'seconds') return 1
  }

  const dts: number[] = []
  let tMax = -Infinity
  let prev = Number.NaN
  const limit = Math.min(timeValues.length, 400)
  for (let i = 0; i < limit; i++) {
    const t = timeValues[i]
    if (!Number.isFinite(t)) continue
    tMax = Math.max(tMax, t)
    if (Number.isFinite(prev)) {
      const d = t - prev
      if (d > 0) dts.push(d)
    }
    prev = t
  }
  dts.sort((a, b) => a - b)
  const medianDt = dts.length > 0 ? dts[Math.floor(dts.length / 2)] : 0
  // MazdaEdit exports unitless Time in milliseconds (~200–400 ms steps).
  if (medianDt > 5 || tMax > 10_000) return 0.001
  return 1
}

export function logSourceLabel(source: LogSource): string {
  if (source === 'mazdaedit') return 'MazdaEdit'
  if (source === 'versa') return 'VersaTuner'
  return 'CSV'
}
