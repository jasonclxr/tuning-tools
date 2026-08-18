import { parseHeader } from '../channels'
import {
  convertPressureValue,
  convertSpeedValue,
  detectPressureUnit,
  detectSpeedUnit,
  type SourcePressureUnit,
} from '../units'
import { GRAMS_PER_SECOND_TO_LB_PER_MIN, STOICH_AFR_GAS } from './constants'
import { DIRECT_VALUE_SOURCES, STATIC_VALUES, getComputedLabelValue } from './hpMappings'
import type { ConverterColumnKey } from './sourceColumns'
import { convert, getSourceValue, readNumber } from './valueUtils'

type SourceCols = Partial<Record<ConverterColumnKey, string>>

function headerUnit(sourceColumns: SourceCols, key: ConverterColumnKey): string | null {
  const header = sourceColumns[key]
  return header ? parseHeader(header).unit : null
}

function mapFallbackUnit(sourceColumns: SourceCols): SourcePressureUnit {
  return detectPressureUnit(headerUnit(sourceColumns, 'mapKpa')) ?? 'kPa'
}

function toKpa(value: number, unit: string | null, fallback: SourcePressureUnit): number {
  const from = detectPressureUnit(unit) ?? fallback
  return convertPressureValue(value, from, 'kPa')
}

function toPsi(value: number, unit: string | null, fallback: SourcePressureUnit): number {
  const from = detectPressureUnit(unit) ?? fallback
  return convertPressureValue(value, from, 'psi')
}

export function inferBarometricPressure(
  sourceRows: Record<string, string>[],
  sourceColumns: SourceCols,
): number {
  const row = sourceRows[0] ?? {}
  if (sourceColumns.baro) {
    const baro = readNumber(row, sourceColumns.baro)
    if (Number.isFinite(baro)) {
      return toKpa(
        baro,
        headerUnit(sourceColumns, 'baro'),
        detectPressureUnit(headerUnit(sourceColumns, 'baro')) ?? mapFallbackUnit(sourceColumns),
      )
    }
  }
  const firstMap = readNumber(row, sourceColumns.mapKpa)
  if (Number.isFinite(firstMap)) {
    return toKpa(firstMap, headerUnit(sourceColumns, 'mapKpa'), 'kPa')
  }
  return 101.325
}

function readActualLambda(row: Record<string, string>, sourceColumns: SourceCols): number {
  const actualLambda = readNumber(row, sourceColumns.actualLambda)
  if (Number.isFinite(actualLambda)) return actualLambda
  return convert(readNumber(row, sourceColumns.afrGas), STOICH_AFR_GAS, '/')
}

function readCommandedLambda(row: Record<string, string>, sourceColumns: SourceCols): number {
  const commandedLambda = readNumber(row, sourceColumns.commandedLambda)
  if (Number.isFinite(commandedLambda)) return commandedLambda
  return readActualLambda(row, sourceColumns)
}

function readMapPsi(row: Record<string, string>, sourceColumns: SourceCols): number {
  const map = readNumber(row, sourceColumns.mapKpa)
  if (!Number.isFinite(map)) return Number.NaN
  return toPsi(map, headerUnit(sourceColumns, 'mapKpa'), 'kPa')
}

function readLoadPercent(row: Record<string, string>, sourceColumns: SourceCols): number {
  const load = readNumber(row, sourceColumns.absoluteLoad)
  if (!Number.isFinite(load)) return Number.NaN
  const unit = (headerUnit(sourceColumns, 'absoluteLoad') ?? '').toLowerCase()
  if (unit.includes('%') || unit.includes('percent')) return load
  return convert(load, 100)
}

function readSpeedMph(row: Record<string, string>, sourceColumns: SourceCols): number | undefined {
  const raw = getSourceValue(row, sourceColumns, 'vehicleSpeed')
  if (raw === undefined || raw === '') return undefined
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n)) return undefined
  const from = detectSpeedUnit(headerUnit(sourceColumns, 'vehicleSpeed')) ?? 'mph'
  return convertSpeedValue(n, from, 'mph')
}

function readFuelPressurePsi(
  row: Record<string, string>,
  sourceColumns: SourceCols,
): number | undefined {
  const n = readNumber(row, sourceColumns.fuelPressure)
  if (!Number.isFinite(n)) return undefined
  const from = detectPressureUnit(headerUnit(sourceColumns, 'fuelPressure')) ?? 'MPa'
  return convertPressureValue(n, from, 'psi')
}

export function mapTargetValue(
  label: string,
  row: Record<string, string>,
  sourceColumns: SourceCols,
  barometricPressureKpa: number,
  timeToSeconds = 1,
): string | number | undefined {
  const computed = {
    lambda: readActualLambda(row, sourceColumns),
    commandedLambda: readCommandedLambda(row, sourceColumns),
    mapPsi: readMapPsi(row, sourceColumns),
    mafLbMin: convert(readNumber(row, sourceColumns.mafGps), GRAMS_PER_SECOND_TO_LB_PER_MIN),
    loadPercent: readLoadPercent(row, sourceColumns),
    barometricPressureKpa,
  }

  const direct = DIRECT_VALUE_SOURCES.get(label)
  if (direct) {
    const value = direct({
      row,
      sourceColumns,
      getSourceValue,
      timeToSeconds,
      readSpeedMph: () => readSpeedMph(row, sourceColumns),
      readFuelPressurePsi: () => readFuelPressurePsi(row, sourceColumns),
    })
    if (value !== undefined && value !== '') {
      return value
    }
  }

  if (STATIC_VALUES.has(label)) {
    return STATIC_VALUES.get(label)
  }

  return getComputedLabelValue(label, computed)
}
