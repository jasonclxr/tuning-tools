import type {
  AirflowUnit,
  AppSettings,
  DistanceUnit,
  FuelVolumeUnit,
  MassUnit,
  PowerUnit,
  PressureUnit,
  SpeedUnit,
  TemperatureUnit,
  TorqueUnit,
} from './settings'
import type { ParsedChannel, ParsedLog } from './types'

const KPA_PER_PSI = 6.8947572932
const BAR_PER_KPA = 0.01
const KMH_PER_MPH = 1.609344
const KM_PER_MI = 1.609344
const KW_PER_HP = 0.745699872
const KW_PER_PS = 0.73549875
const NM_PER_LBFT = 1.3558179483
const LB_PER_G = 0.0022046226218
const KG_PER_G = 0.001
const LB_MIN_PER_G_S = 0.13227735731
const KG_H_PER_G_S = 3.6
const MM3_PER_CC = 1000
const UL_PER_CC = 1000

function scaleArray(data: Float64Array, factor: number): Float64Array {
  if (factor === 1) return data
  const out = new Float64Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const v = data[i]
    out[i] = Number.isFinite(v) ? v * factor : NaN
  }
  return out
}

function convertTempArray(
  data: Float64Array,
  from: TemperatureUnit,
  to: TemperatureUnit,
): Float64Array {
  if (from === to) return data
  const out = new Float64Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const v = data[i]
    if (!Number.isFinite(v)) {
      out[i] = NaN
      continue
    }
    out[i] = from === 'F' && to === 'C' ? ((v - 32) * 5) / 9 : (v * 9) / 5 + 32
  }
  return out
}

function pressureToKpa(from: PressureUnit): number {
  if (from === 'kPa') return 1
  if (from === 'psi') return KPA_PER_PSI
  return 1 / BAR_PER_KPA
}

function pressureFromKpa(to: PressureUnit): number {
  if (to === 'kPa') return 1
  if (to === 'psi') return 1 / KPA_PER_PSI
  return BAR_PER_KPA
}

function normalizePressureUnit(unit: string | null | undefined): PressureUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase()
  if (u.includes('kpa')) return 'kPa'
  if (u.includes('psi')) return 'psi'
  if (u.includes('bar')) return 'bar'
  return null
}

function detectTempUnit(unit: string | null): TemperatureUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase()
  if (u.includes('°f') || u === 'f' || u.includes('fahrenheit')) return 'F'
  if (u.includes('°c') || u === 'c' || u.includes('celsius')) return 'C'
  return null
}

function detectSpeedUnit(unit: string | null): SpeedUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase()
  if (u.includes('mph')) return 'mph'
  if (u.includes('km')) return 'kmh'
  return null
}

function detectDistanceUnit(unit: string | null): DistanceUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase()
  if (u === 'mi' || u.includes('mile')) return 'mi'
  if (u === 'km' || u.includes('kilomet')) return 'km'
  return null
}

function detectPowerUnit(unit: string | null): PowerUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase().replace(/\s/g, '')
  if (u === 'kw' || u.includes('kilowatt')) return 'kW'
  if (u === 'ps' || u === 'cv' || u.includes('metric')) return 'PS'
  if (u === 'hp' || u.includes('horse') || u === 'bhp') return 'hp'
  return null
}

function detectTorqueUnit(unit: string | null): TorqueUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase().replace(/\s/g, '')
  if (u.includes('nm') || u.includes('n·m') || u.includes('n.m')) return 'Nm'
  if (u.includes('lb') || u.includes('ft-lb') || u.includes('ftlb')) return 'lbft'
  return null
}

function detectAirflowUnit(unit: string | null): AirflowUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase().replace(/\s/g, '')
  if (u.includes('lb/min') || u.includes('lb/mn') || u === 'lb/min') return 'lb_min'
  if (u.includes('kg/h') || u.includes('kg/hr')) return 'kg_h'
  if (u.includes('g/s') || u === 'g/s') return 'g_s'
  return null
}

function detectMassUnit(unit: string | null): MassUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase().replace(/\s/g, '')
  if (u === 'kg' || u.includes('kilogram')) return 'kg'
  if (u === 'lb' || u === 'lbs' || u.includes('pound')) return 'lb'
  if (u === 'g' || u.includes('gram')) return 'g'
  return null
}

function detectFuelVolumeUnit(unit: string | null): FuelVolumeUnit | null {
  if (!unit) return null
  const u = unit.toLowerCase().replace(/\s/g, '')
  if (u.includes('mm3') || u.includes('mm³') || u.includes('mm^3')) return 'mm3'
  if (u.includes('µl') || u.includes('ul') || u.includes('μl')) return 'uL'
  if (u === 'cc' || u.includes('cm3') || u.includes('cm³') || u === 'ml') return 'cc'
  return null
}

function powerToKw(from: PowerUnit): number {
  if (from === 'kW') return 1
  if (from === 'hp') return KW_PER_HP
  return KW_PER_PS
}

function powerFromKw(to: PowerUnit): number {
  if (to === 'kW') return 1
  if (to === 'hp') return 1 / KW_PER_HP
  return 1 / KW_PER_PS
}

function torqueToNm(from: TorqueUnit): number {
  return from === 'Nm' ? 1 : NM_PER_LBFT
}

function torqueFromNm(to: TorqueUnit): number {
  return to === 'Nm' ? 1 : 1 / NM_PER_LBFT
}

function airflowToGps(from: AirflowUnit): number {
  if (from === 'g_s') return 1
  if (from === 'lb_min') return 1 / LB_MIN_PER_G_S
  return 1 / KG_H_PER_G_S
}

function airflowFromGps(to: AirflowUnit): number {
  if (to === 'g_s') return 1
  if (to === 'lb_min') return LB_MIN_PER_G_S
  return KG_H_PER_G_S
}

function massToG(from: MassUnit): number {
  if (from === 'g') return 1
  if (from === 'kg') return 1 / KG_PER_G
  return 1 / LB_PER_G
}

function massFromG(to: MassUnit): number {
  if (to === 'g') return 1
  if (to === 'kg') return KG_PER_G
  return LB_PER_G
}

function fuelVolToCc(from: FuelVolumeUnit): number {
  if (from === 'cc') return 1
  if (from === 'mm3') return 1 / MM3_PER_CC
  return 1 / UL_PER_CC
}

function fuelVolFromCc(to: FuelVolumeUnit): number {
  if (to === 'cc') return 1
  if (to === 'mm3') return MM3_PER_CC
  return UL_PER_CC
}

export function pressureUnitLabel(unit: PressureUnit): string {
  return unit
}

export function temperatureUnitLabel(unit: TemperatureUnit): string {
  return unit === 'F' ? '°F' : '°C'
}

export function mixtureUnitLabel(unit: AppSettings['mixtureUnit']): string {
  return unit === 'afr' ? 'AFR' : 'Lambda (λ)'
}

export function speedUnitLabel(unit: SpeedUnit): string {
  return unit === 'mph' ? 'mph' : 'km/h'
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === 'mi' ? 'mi' : 'km'
}

export function powerUnitLabel(unit: PowerUnit): string {
  return unit
}

export function torqueUnitLabel(unit: TorqueUnit): string {
  return unit === 'lbft' ? 'lb·ft' : 'N·m'
}

export function airflowUnitLabel(unit: AirflowUnit): string {
  if (unit === 'g_s') return 'g/s'
  if (unit === 'lb_min') return 'lb/min'
  return 'kg/h'
}

export function massUnitLabel(unit: MassUnit): string {
  return unit
}

export function fuelVolumeUnitLabel(unit: FuelVolumeUnit): string {
  if (unit === 'mm3') return 'mm³'
  if (unit === 'uL') return 'µL'
  return 'cc'
}

function adaptChannel(ch: ParsedChannel, settings: AppSettings): ParsedChannel {
  const stoich = settings.stoichAfr

  if (ch.role === 'mapKpa' || ch.role === 'boost' || ch.role === 'targetBoost' || ch.id === '__derived_boost_error') {
    const from =
      normalizePressureUnit(ch.unit) ?? (ch.role === 'mapKpa' ? 'kPa' : 'psi')
    const factor = pressureToKpa(from) * pressureFromKpa(settings.pressureUnit)
    return {
      ...ch,
      unit: pressureUnitLabel(settings.pressureUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (
    ch.role === 'intakeAirTemp' ||
    ch.role === 'manifoldAirTemp' ||
    ch.role === 'coolantTemp' ||
    ch.role === 'ambientTemp'
  ) {
    const from = detectTempUnit(ch.unit) ?? 'F'
    return {
      ...ch,
      unit: temperatureUnitLabel(settings.temperatureUnit),
      data: convertTempArray(ch.data, from, settings.temperatureUnit),
    }
  }

  if (ch.role === 'vehicleSpeed') {
    const from = detectSpeedUnit(ch.unit) ?? 'mph'
    const factor =
      from === settings.speedUnit ? 1 : from === 'mph' ? KMH_PER_MPH : 1 / KMH_PER_MPH
    return {
      ...ch,
      unit: speedUnitLabel(settings.speedUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (ch.role === 'distance') {
    const from = detectDistanceUnit(ch.unit) ?? 'mi'
    const factor =
      from === settings.distanceUnit ? 1 : from === 'mi' ? KM_PER_MI : 1 / KM_PER_MI
    return {
      ...ch,
      unit: distanceUnitLabel(settings.distanceUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (ch.role === 'power') {
    const from = detectPowerUnit(ch.unit) ?? 'hp'
    const factor = powerToKw(from) * powerFromKw(settings.powerUnit)
    return {
      ...ch,
      unit: powerUnitLabel(settings.powerUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (ch.role === 'torque') {
    const from = detectTorqueUnit(ch.unit) ?? 'lbft'
    const factor = torqueToNm(from) * torqueFromNm(settings.torqueUnit)
    return {
      ...ch,
      unit: torqueUnitLabel(settings.torqueUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (ch.role === 'mafGps') {
    const from = detectAirflowUnit(ch.unit) ?? 'g_s'
    const factor = airflowToGps(from) * airflowFromGps(settings.airflowUnit)
    return {
      ...ch,
      unit: airflowUnitLabel(settings.airflowUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (ch.role === 'mass') {
    const from = detectMassUnit(ch.unit) ?? 'g'
    const factor = massToG(from) * massFromG(settings.massUnit)
    return {
      ...ch,
      unit: massUnitLabel(settings.massUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (ch.role === 'fuelVolume') {
    const from = detectFuelVolumeUnit(ch.unit) ?? 'cc'
    const factor = fuelVolToCc(from) * fuelVolFromCc(settings.fuelVolumeUnit)
    return {
      ...ch,
      unit: fuelVolumeUnitLabel(settings.fuelVolumeUnit),
      data: scaleArray(ch.data, factor),
    }
  }

  if (ch.role === 'afrGas' || ch.id === '__derived_afr_error') {
    if (settings.mixtureUnit === 'lambda') {
      return {
        ...ch,
        name: ch.role === 'afrGas' ? 'Lambda (from AFR)' : 'Lambda Error',
        unit: 'λ',
        data: scaleArray(ch.data, 1 / stoich),
      }
    }
    return { ...ch, unit: ch.unit ?? 'AFR' }
  }

  if (
    ch.role === 'actualLambda' ||
    ch.role === 'commandedLambda' ||
    ch.id === '__derived_lambda' ||
    ch.id === '__derived_lambda_error'
  ) {
    if (settings.mixtureUnit === 'afr') {
      const isError = ch.id.includes('error')
      return {
        ...ch,
        name: isError
          ? 'AFR Error'
          : ch.role === 'commandedLambda'
            ? 'Target AFR (from λ)'
            : 'AFR (from λ)',
        unit: 'AFR',
        data: scaleArray(ch.data, stoich),
      }
    }
    return { ...ch, unit: 'λ' }
  }

  return ch
}

/** Return a display-oriented copy of the log with preferred units applied. */
export function adaptLogForDisplay(log: ParsedLog, settings: AppSettings): ParsedLog {
  return {
    ...log,
    channels: log.channels.map((ch) => adaptChannel(ch, settings)),
  }
}
