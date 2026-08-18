import { resolveSourceColumns } from './channels'
import type { ParsedChannel, ParsedLog } from './types'
import { convertPressureValue, detectPressureUnit, type SourcePressureUnit } from './units'

const STOICH_AFR_GAS = 14.7

function channelByRole(log: ParsedLog, role: ParsedChannel['role']): ParsedChannel | undefined {
  return log.channels.find((c) => c.role === role)
}

function inferBaroNative(map: Float64Array): number {
  // Use early MAP samples as baro proxy (key-on / idle ambient) — same idea as converter.
  const samples: number[] = []
  for (let i = 0; i < Math.min(map.length, 50); i++) {
    if (Number.isFinite(map[i])) samples.push(map[i])
  }
  if (samples.length === 0) return Number.NaN
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length * 0.1)] ?? samples[0]
}

function toPsi(value: number, unit: string | null, fallback: SourcePressureUnit): number {
  const from = detectPressureUnit(unit) ?? fallback
  return convertPressureValue(value, from, 'psi')
}

function pushDerived(log: ParsedLog, channel: ParsedChannel) {
  if (log.channels.some((c) => c.id === channel.id)) return
  log.channels.push(channel)
}

export function addDerivedChannels(log: ParsedLog): void {
  const n = log.time.length
  const roles = resolveSourceColumns(log.headers)
  const mapCh = channelByRole(log, 'mapKpa')
  const boostCh = channelByRole(log, 'boost')
  const baroCh = channelByRole(log, 'baro')
  const targetBoostCh = channelByRole(log, 'targetBoost')
  const afrCh = channelByRole(log, 'afrGas')
  const lambdaCh = channelByRole(log, 'actualLambda')
  const cmdLambdaCh = channelByRole(log, 'commandedLambda')
  const knockCh = channelByRole(log, 'knockRetard')

  let boostData: Float64Array | undefined = boostCh?.data

  if (!boostData && mapCh) {
    const mapFallback: SourcePressureUnit = detectPressureUnit(mapCh.unit) ?? 'kPa'
    const baroFallback: SourcePressureUnit =
      detectPressureUnit(baroCh?.unit ?? null) ?? mapFallback
    const inferredBaroNative = baroCh ? Number.NaN : inferBaroNative(mapCh.data)
    const inferredBaroPsi = Number.isFinite(inferredBaroNative)
      ? toPsi(inferredBaroNative, mapCh.unit, mapFallback)
      : Number.NaN
    const stdBaroPsi = convertPressureValue(101.325, 'kPa', 'psi')

    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const map = mapCh.data[i]
      if (!Number.isFinite(map)) {
        data[i] = Number.NaN
        continue
      }
      const mapPsi = toPsi(map, mapCh.unit, mapFallback)
      let boostPsi: number
      if (baroCh) {
        const baro = baroCh.data[i]
        boostPsi = Number.isFinite(baro)
          ? mapPsi - toPsi(baro, baroCh.unit, baroFallback)
          : Number.NaN
      } else {
        boostPsi = mapPsi - (Number.isFinite(inferredBaroPsi) ? inferredBaroPsi : stdBaroPsi)
      }
      // Gauge-style boost: only plot pressure above atmosphere.
      data[i] = Number.isFinite(boostPsi) && boostPsi > 0 ? boostPsi : Number.NaN
    }
    const derived: ParsedChannel = {
      id: '__derived_boost_psi',
      name: 'Boost (derived)',
      unit: 'psi',
      role: 'boost',
      data,
      derived: true,
    }
    pushDerived(log, derived)
    boostData = data
  }

  if (boostData && targetBoostCh) {
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const a = boostData[i]
      const b = targetBoostCh.data[i]
      data[i] = Number.isFinite(a) && Number.isFinite(b) ? a - b : NaN
    }
    pushDerived(log, {
      id: '__derived_boost_error',
      name: 'Boost Error',
      unit: 'psi',
      role: null,
      data,
      derived: true,
    })
  }

  // Normalize AFR ↔ Lambda for error calc
  let actualLambda: Float64Array | undefined = lambdaCh?.data
  if (!actualLambda && afrCh) {
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const afr = afrCh.data[i]
      data[i] = Number.isFinite(afr) ? afr / STOICH_AFR_GAS : NaN
    }
    pushDerived(log, {
      id: '__derived_lambda',
      name: 'Lambda (from AFR)',
      unit: 'λ',
      role: 'actualLambda',
      data,
      derived: true,
    })
    actualLambda = data
  }

  if (afrCh && !lambdaCh) {
    // keep AFR as primary fueling channel
  }

  if (actualLambda && cmdLambdaCh) {
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const a = actualLambda[i]
      const b = cmdLambdaCh.data[i]
      data[i] = Number.isFinite(a) && Number.isFinite(b) ? a - b : NaN
    }
    pushDerived(log, {
      id: '__derived_lambda_error',
      name: 'Lambda Error',
      unit: 'λ',
      role: null,
      data,
      derived: true,
    })
  } else if (afrCh && roles.commandedLambda) {
    // commanded might be lambda while actual is AFR — handled via derived lambda above
  }

  // If we only have AFR and commanded lambda, convert commanded to AFR error
  if (afrCh && cmdLambdaCh && !lambdaCh) {
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const afr = afrCh.data[i]
      const cmd = cmdLambdaCh.data[i]
      data[i] =
        Number.isFinite(afr) && Number.isFinite(cmd) ? afr - cmd * STOICH_AFR_GAS : NaN
    }
    pushDerived(log, {
      id: '__derived_afr_error',
      name: 'AFR Error',
      unit: 'AFR',
      role: null,
      data,
      derived: true,
    })
  }

  if (knockCh) {
    const activity = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const k = knockCh.data[i]
      activity[i] = Number.isFinite(k) ? Math.abs(k) : NaN
    }
    pushDerived(log, {
      id: '__derived_knock_activity',
      name: 'Knock Activity',
      unit: '°',
      role: null,
      data: activity,
      derived: true,
    })
  }

  void roles
}
