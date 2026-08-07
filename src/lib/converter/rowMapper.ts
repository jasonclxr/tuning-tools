import {
  GRAMS_PER_SECOND_TO_LB_PER_MIN,
  KPA_TO_PSI,
  STOICH_AFR_GAS,
} from './constants'
import { DIRECT_VALUE_SOURCES, STATIC_VALUES, getComputedLabelValue } from './hpMappings'
import type { ConverterColumnKey } from './sourceColumns'
import { convert, getSourceValue, readNumber } from './valueUtils'

export function inferBarometricPressure(
  sourceRows: Record<string, string>[],
  sourceColumns: Partial<Record<ConverterColumnKey, string>>,
): number {
  const firstMap = readNumber(sourceRows[0] ?? {}, sourceColumns.mapKpa)
  return Number.isFinite(firstMap) ? firstMap : 101.325
}

function readActualLambda(
  row: Record<string, string>,
  sourceColumns: Partial<Record<ConverterColumnKey, string>>,
): number {
  const actualLambda = readNumber(row, sourceColumns.actualLambda)
  if (Number.isFinite(actualLambda)) return actualLambda
  return convert(readNumber(row, sourceColumns.afrGas), STOICH_AFR_GAS, '/')
}

function readCommandedLambda(
  row: Record<string, string>,
  sourceColumns: Partial<Record<ConverterColumnKey, string>>,
): number {
  const commandedLambda = readNumber(row, sourceColumns.commandedLambda)
  if (Number.isFinite(commandedLambda)) return commandedLambda
  return readActualLambda(row, sourceColumns)
}

export function mapTargetValue(
  label: string,
  row: Record<string, string>,
  sourceColumns: Partial<Record<ConverterColumnKey, string>>,
  barometricPressureKpa: number,
): string | number | undefined {
  const computed = {
    lambda: readActualLambda(row, sourceColumns),
    commandedLambda: readCommandedLambda(row, sourceColumns),
    mapPsi: convert(readNumber(row, sourceColumns.mapKpa), KPA_TO_PSI),
    mafLbMin: convert(readNumber(row, sourceColumns.mafGps), GRAMS_PER_SECOND_TO_LB_PER_MIN),
    loadPercent: convert(readNumber(row, sourceColumns.absoluteLoad), 100),
    barometricPressureKpa,
  }

  const direct = DIRECT_VALUE_SOURCES.get(label)
  if (direct) {
    const value = direct({ row, sourceColumns, getSourceValue })
    if (value !== undefined && value !== '') {
      return value
    }
  }

  if (STATIC_VALUES.has(label)) {
    return STATIC_VALUES.get(label)
  }

  return getComputedLabelValue(label, computed)
}
