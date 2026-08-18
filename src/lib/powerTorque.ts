import { testWeightLb, type AppSettings } from './settings'
import type { ParsedChannel, ParsedLog, TimeRange } from './types'
import { indexNearTime } from './downsample'
import { detectSpeedUnit } from './units'

/** HP = TQ(lb·ft) × RPM / 5252 */
export const HP_TQ_RPM_FACTOR = 5252

/**
 * Wheel HP from weight, speed, and accel (level ground, no drag):
 * HP ≈ Weight(lb) × MPH × (MPH/s) / 8226
 */
export const WHP_WEIGHT_FACTOR = 8226

export const POWER_DERIVED_IDS = new Set([
  '__derived_hp_from_torque',
  '__derived_torque_from_hp',
  '__derived_wheel_hp',
  '__derived_crank_hp',
  '__derived_crank_torque',
  '__derived_accel_mph_s',
])

function channelByRole(log: ParsedLog, role: ParsedChannel['role']): ParsedChannel | undefined {
  return log.channels.find((c) => c.role === role && !POWER_DERIVED_IDS.has(c.id))
}

function smoothSeries(data: Float64Array, window: number): Float64Array {
  const n = data.length
  const out = new Float64Array(n)
  const half = Math.max(0, Math.floor(window / 2))
  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0
    for (let j = i - half; j <= i + half; j++) {
      if (j < 0 || j >= n) continue
      const v = data[j]
      if (!Number.isFinite(v)) continue
      sum += v
      count++
    }
    out[i] = count > 0 ? sum / count : NaN
  }
  return out
}

/** Acceleration in MPH/s from speed (mph) and time (s). */
export function accelMphPerSec(time: Float64Array, speedMph: Float64Array): Float64Array {
  const n = time.length
  const raw = new Float64Array(n)
  raw[0] = NaN
  raw[n - 1] = n > 1 ? NaN : NaN
  for (let i = 1; i < n - 1; i++) {
    const dt = time[i + 1] - time[i - 1]
    const dv = speedMph[i + 1] - speedMph[i - 1]
    raw[i] = dt > 1e-6 && Number.isFinite(dv) ? dv / dt : NaN
  }
  // ~0.4s smoothing based on median dt
  let dtSum = 0
  let dtCount = 0
  for (let i = 1; i < Math.min(n, 200); i++) {
    const dt = time[i] - time[i - 1]
    if (dt > 0) {
      dtSum += dt
      dtCount++
    }
  }
  const medianDt = dtCount > 0 ? dtSum / dtCount : 0.1
  const window = Math.max(3, Math.round(0.4 / Math.max(medianDt, 0.01)))
  return smoothSeries(raw, window | 1)
}

export function addPowerTorqueChannels(log: ParsedLog, settings: AppSettings): ParsedLog {
  const baseChannels = log.channels.filter((c) => !POWER_DERIVED_IDS.has(c.id))
  const working: ParsedLog = { ...log, channels: [...baseChannels] }
  const n = log.time.length
  const rpm = channelByRole(working, 'rpm')
  const torque = channelByRole(working, 'torque')
  const power = channelByRole(working, 'power')
  const speed = channelByRole(working, 'vehicleSpeed')

  const extras: ParsedChannel[] = []

  // Native torque → HP
  if (torque && rpm && !power) {
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const tq = torque.data[i]
      const r = rpm.data[i]
      data[i] =
        Number.isFinite(tq) && Number.isFinite(r) && r > 0 ? (tq * r) / HP_TQ_RPM_FACTOR : NaN
    }
    extras.push({
      id: '__derived_hp_from_torque',
      name: 'HP (from torque)',
      unit: 'hp',
      role: 'power',
      data,
      derived: true,
    })
  }

  // Native HP → torque
  if (power && rpm && !torque) {
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const hp = power.data[i]
      const r = rpm.data[i]
      data[i] =
        Number.isFinite(hp) && Number.isFinite(r) && r > 0 ? (hp * HP_TQ_RPM_FACTOR) / r : NaN
    }
    extras.push({
      id: '__derived_torque_from_hp',
      name: 'Torque (from HP)',
      unit: 'lb·ft',
      role: 'torque',
      data,
      derived: true,
    })
  }

  // VSS + weight → wheel HP estimate
  if (settings.estimatePowerFromSpeed && speed && testWeightLb(settings) > 0) {
    // Speed channel may already be in preferred units on display path — callers should
    // pass source log (mph) before unit adapt, or we detect unit.
    const speedIsKmh = detectSpeedUnit(speed.unit) === 'kmh'
    const speedMph = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const v = speed.data[i]
      speedMph[i] = Number.isFinite(v) ? (speedIsKmh ? v / 1.609344 : v) : NaN
    }

    const accel = accelMphPerSec(log.time, speedMph)
    extras.push({
      id: '__derived_accel_mph_s',
      name: 'Accel (derived)',
      unit: 'mph/s',
      role: null,
      data: accel,
      derived: true,
    })

    const weight = testWeightLb(settings)
    const wheelHp = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const v = speedMph[i]
      const a = accel[i]
      // Only count positive accel pulls
      wheelHp[i] =
        Number.isFinite(v) && Number.isFinite(a) && v > 5 && a > 0
          ? (weight * v * a) / WHP_WEIGHT_FACTOR
          : NaN
    }
    extras.push({
      id: '__derived_wheel_hp',
      name: 'Wheel HP (est.)',
      unit: 'hp',
      role: 'power',
      data: wheelHp,
      derived: true,
    })

    const loss = Math.min(0.5, Math.max(0, settings.drivetrainLossPercent / 100))
    const denom = Math.max(1e-6, 1 - loss)
    const crankHp = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const whp = wheelHp[i]
      crankHp[i] = Number.isFinite(whp) ? whp / denom : NaN
    }
    extras.push({
      id: '__derived_crank_hp',
      name: 'Crank HP (est.)',
      unit: 'hp',
      role: 'power',
      data: crankHp,
      derived: true,
    })

    if (rpm) {
      const crankTq = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        const hp = crankHp[i]
        const r = rpm.data[i]
        crankTq[i] =
          Number.isFinite(hp) && Number.isFinite(r) && r > 500
            ? (hp * HP_TQ_RPM_FACTOR) / r
            : NaN
      }
      extras.push({
        id: '__derived_crank_torque',
        name: 'Crank Torque (est.)',
        unit: 'lb·ft',
        role: 'torque',
        data: crankTq,
        derived: true,
      })
    }
  }

  if (extras.length === 0) return working
  return { ...working, channels: [...working.channels, ...extras] }
}

export interface PowerPeak {
  value: number
  time: number
  rpm: number | null
}

export interface PowerStats {
  method: string
  wheelHpPeak: PowerPeak | null
  crankHpPeak: PowerPeak | null
  crankTorquePeak: PowerPeak | null
  sampleCount: number
}

function peakOf(
  log: ParsedLog,
  channelId: string,
  range: TimeRange | null,
  rpmData?: Float64Array,
): PowerPeak | null {
  const ch = log.channels.find((c) => c.id === channelId)
  if (!ch) return null
  let i0 = 0
  let i1 = log.time.length - 1
  if (range) {
    i0 = indexNearTime(log.time, range.start)
    i1 = indexNearTime(log.time, range.end)
    if (i1 < i0) [i0, i1] = [i1, i0]
  }
  let best = -Infinity
  let bestI = -1
  for (let i = i0; i <= i1; i++) {
    const v = ch.data[i]
    if (!Number.isFinite(v) || v <= 0) continue
    if (v > best) {
      best = v
      bestI = i
    }
  }
  if (bestI < 0) return null
  const rpm = rpmData && Number.isFinite(rpmData[bestI]) ? rpmData[bestI] : null
  return { value: best, time: log.time[bestI], rpm }
}

export function computePowerStats(log: ParsedLog, range: TimeRange | null): PowerStats | null {
  const rpm = log.channels.find((c) => c.role === 'rpm' && !POWER_DERIVED_IDS.has(c.id))?.data
  const hasEst = log.channels.some((c) => c.id === '__derived_wheel_hp')
  const hasFromTq = log.channels.some((c) => c.id === '__derived_hp_from_torque')
  const hasNative = log.channels.some((c) => c.role === 'power' && !c.derived)

  if (!hasEst && !hasFromTq && !hasNative && !log.channels.some((c) => c.role === 'torque')) {
    return null
  }

  const method = hasEst
    ? 'VSS × weight estimate'
    : hasFromTq
      ? 'From logged torque'
      : hasNative
        ? 'Logged power'
        : 'From logged channels'

  const wheelHpPeak = peakOf(log, '__derived_wheel_hp', range, rpm)
  const crankHpPeak =
    peakOf(log, '__derived_crank_hp', range, rpm) ??
    peakOf(log, '__derived_hp_from_torque', range, rpm) ??
    peakOf(
      log,
      log.channels.find((c) => c.role === 'power' && !POWER_DERIVED_IDS.has(c.id))?.id ?? '',
      range,
      rpm,
    )

  const crankTorquePeak =
    peakOf(log, '__derived_crank_torque', range, rpm) ??
    peakOf(log, '__derived_torque_from_hp', range, rpm) ??
    peakOf(
      log,
      log.channels.find((c) => c.role === 'torque' && !POWER_DERIVED_IDS.has(c.id))?.id ?? '',
      range,
      rpm,
    )

  let sampleCount = 0
  const whp = log.channels.find((c) => c.id === '__derived_wheel_hp')
  if (whp) {
    let i0 = 0
    let i1 = log.time.length - 1
    if (range) {
      i0 = indexNearTime(log.time, range.start)
      i1 = indexNearTime(log.time, range.end)
    }
    for (let i = i0; i <= i1; i++) {
      if (Number.isFinite(whp.data[i]) && whp.data[i] > 0) sampleCount++
    }
  }

  return {
    method,
    wheelHpPeak,
    crankHpPeak,
    crankTorquePeak,
    sampleCount,
  }
}
