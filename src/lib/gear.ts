import type { AppSettings, GearRpmPerMph } from './settings'
import type { ParsedChannel, ParsedLog } from './types'
import { detectSpeedUnit } from './units'

export const GEAR_DERIVED_ID = '__derived_gear'
export const GEAR_REVERSE = -1
export const GEAR_NEUTRAL = 0

const MIN_SPEED_MPH = 1.5
const MIN_RPM = 400
const MATCH_REL = 0.1
const HOLD_REL = 0.14
const REVERSE_MAX_MPH = 25
const KMH_PER_MPH = 1.609344

export type GearSpec = Pick<AppSettings, 'gearRpmPerMph' | 'reverseRpmPerMph'>

interface Candidate {
  gear: number
  rpmPerMph: number
}

function candidates(spec: GearSpec, speedMph: number): Candidate[] {
  const list: Candidate[] = spec.gearRpmPerMph.map((rpmPerMph, i) => ({
    gear: i + 1,
    rpmPerMph,
  }))
  if (speedMph <= REVERSE_MAX_MPH && spec.reverseRpmPerMph > 0) {
    list.push({ gear: GEAR_REVERSE, rpmPerMph: spec.reverseRpmPerMph })
  }
  return list.filter((c) => Number.isFinite(c.rpmPerMph) && c.rpmPerMph > 0)
}

function relativeError(ratio: number, expected: number): number {
  return Math.abs(ratio - expected) / expected
}

/** Infer engaged gear from RPM/mph. 1–6, R (−1), or N/clutch-in (0). */
export function inferGearAt(
  rpm: number,
  speedMph: number,
  spec: GearSpec,
  prevGear: number | null,
): number {
  if (!Number.isFinite(rpm) || !Number.isFinite(speedMph) || rpm < MIN_RPM) {
    return GEAR_NEUTRAL
  }
  if (speedMph < MIN_SPEED_MPH) return GEAR_NEUTRAL

  const ratio = rpm / speedMph
  const cands = candidates(spec, speedMph)
  if (cands.length === 0) return GEAR_NEUTRAL

  if (prevGear != null && prevGear !== GEAR_NEUTRAL) {
    const prev = cands.find((c) => c.gear === prevGear)
    if (prev && relativeError(ratio, prev.rpmPerMph) <= HOLD_REL) return prevGear
  }

  let best = cands[0]
  let bestRel = Infinity
  for (const c of cands) {
    const rel = relativeError(ratio, c.rpmPerMph)
    if (rel < bestRel) {
      bestRel = rel
      best = c
    }
  }
  return bestRel > MATCH_REL ? GEAR_NEUTRAL : best.gear
}

export function inferGearSeries(
  rpm: Float64Array,
  speedMph: Float64Array,
  spec: GearSpec,
): Float64Array {
  const n = Math.min(rpm.length, speedMph.length)
  const out = new Float64Array(n)
  let prev: number | null = null
  for (let i = 0; i < n; i++) {
    const gear = inferGearAt(rpm[i], speedMph[i], spec, prev)
    out[i] = gear
    prev = gear
  }
  return out
}

export function formatGear(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const g = Math.round(value)
  if (g === GEAR_REVERSE) return 'R'
  if (g === GEAR_NEUTRAL) return 'N'
  return String(g)
}

export function isGearChannel(ch: { role?: string | null; id?: string } | undefined): boolean {
  return ch?.role === 'gear' || ch?.id === GEAR_DERIVED_ID
}

export function addGearChannel(log: ParsedLog, settings: AppSettings): ParsedLog {
  const existing = log.channels.filter((c) => c.id !== GEAR_DERIVED_ID)
  const working: ParsedLog = { ...log, channels: existing }
  if (working.channels.some((c) => c.role === 'gear')) return working

  const rpm = working.channels.find((c) => c.role === 'rpm')
  const speed = working.channels.find((c) => c.role === 'vehicleSpeed')
  if (!rpm || !speed) return working

  const speedIsKmh = detectSpeedUnit(speed.unit) === 'kmh'
  const speedMph = new Float64Array(speed.data.length)
  for (let i = 0; i < speed.data.length; i++) {
    const v = speed.data[i]
    speedMph[i] = Number.isFinite(v) ? (speedIsKmh ? v / KMH_PER_MPH : v) : Number.NaN
  }

  const spec: GearSpec = {
    gearRpmPerMph: [...settings.gearRpmPerMph] as GearRpmPerMph,
    reverseRpmPerMph: settings.reverseRpmPerMph,
  }

  const data = inferGearSeries(rpm.data, speedMph, spec)
  const derived: ParsedChannel = {
    id: GEAR_DERIVED_ID,
    name: 'Gear',
    unit: null,
    role: 'gear',
    data,
    derived: true,
  }
  return { ...working, channels: [...working.channels, derived] }
}
