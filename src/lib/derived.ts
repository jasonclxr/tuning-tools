import { resolveSourceColumns } from './channels'
import type { ParsedChannel, ParsedLog } from './types'

const STOICH_AFR_GAS = 14.7
const KPA_TO_PSI = 0.1450377377

function channelByRole(log: ParsedLog, role: ParsedChannel['role']): ParsedChannel | undefined {
  return log.channels.find((c) => c.role === role)
}

function inferBaroKpa(map: Float64Array): number {
  // Use early MAP samples as baro proxy (key-on / idle ambient) — same idea as converter.
  const samples: number[] = []
  for (let i = 0; i < Math.min(map.length, 50); i++) {
    if (Number.isFinite(map[i])) samples.push(map[i])
  }
  if (samples.length === 0) return 101.325
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length * 0.1)] ?? samples[0]
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
  const targetBoostCh = channelByRole(log, 'targetBoost')
  const afrCh = channelByRole(log, 'afrGas')
  const lambdaCh = channelByRole(log, 'actualLambda')
  const cmdLambdaCh = channelByRole(log, 'commandedLambda')
  const knockCh = channelByRole(log, 'knockRetard')

  let boostData: Float64Array | undefined = boostCh?.data

  if (!boostData && mapCh) {
    const baro = inferBaroKpa(mapCh.data)
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const map = mapCh.data[i]
      data[i] = Number.isFinite(map) ? (map - baro) * KPA_TO_PSI : NaN
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
