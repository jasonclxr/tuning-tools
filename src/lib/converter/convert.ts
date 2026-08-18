import { detectLogSource, inferTimeToSecondsFactor } from '../logFormat'
import { loadBundledReference, buildHpCsvContent, type HpReference } from './hpReference'
import { inferBarometricPressure, mapTargetValue } from './rowMapper'
import {
  findUnmappedSourceHeaders,
  resolveConverterColumns,
  type ConverterColumnKey,
} from './sourceColumns'
import type { LogSource } from '../types'

export interface ConversionReport {
  mappedColumns: { logical: ConverterColumnKey; header: string }[]
  missingLogical: ConverterColumnKey[]
  unmappedSourceHeaders: string[]
  rowCount: number
  barometricPressureKpa: number
  source: LogSource
}

export interface ConversionResult {
  csv: string
  report: ConversionReport
  filename: string
}

const ALL_LOGICAL: ConverterColumnKey[] = [
  'time',
  'absoluteLoad',
  'throttle',
  'acceleratorPedal',
  'afrGas',
  'actualLambda',
  'commandedLambda',
  'coolantTemp',
  'rpm',
  'timingAdvance',
  'intakeAirTemp',
  'ambientTemp',
  'mapKpa',
  'baro',
  'knockRetard',
  'longTermFuelTrim',
  'manifoldAirTemp',
  'mafGps',
  'shortTermFuelTrim',
  'vehicleSpeed',
  'catalystTemp',
  'intakeCamDesired',
  'intakeCamActual',
  'exhaustCamDesired',
  'exhaustCamActual',
  'injectorPulseWidth',
  'fuelPressure',
]

export async function convertVersaToHp(
  sourceRows: Record<string, string>[],
  headers: string[],
  sourceFilename: string,
  reference?: HpReference,
): Promise<ConversionResult> {
  const ref = reference ?? (await loadBundledReference())
  const source = detectLogSource(headers)
  const sourceColumns = resolveConverterColumns(headers)
  const barometricPressureKpa = inferBarometricPressure(sourceRows, sourceColumns)
  const unmappedSourceHeaders = findUnmappedSourceHeaders(headers, sourceColumns)
  const timeHeader = sourceColumns.time
  const rawTimes = timeHeader
    ? sourceRows.map((row) => Number.parseFloat(row[timeHeader] ?? ''))
    : []
  const timeToSeconds = timeHeader ? inferTimeToSecondsFactor(timeHeader, rawTimes) : 1

  const outputRows = sourceRows.map((row) =>
    ref.labels.map((label) =>
      mapTargetValue(label, row, sourceColumns, barometricPressureKpa, timeToSeconds),
    ),
  )

  const mappedColumns = (Object.entries(sourceColumns) as [ConverterColumnKey, string][])
    .filter(([, header]) => Boolean(header))
    .map(([logical, header]) => ({ logical, header }))

  const missingLogical = ALL_LOGICAL.filter((k) => !sourceColumns[k])

  const base = sourceFilename.replace(/\.csv$/i, '')
  return {
    csv: buildHpCsvContent(ref, outputRows),
    filename: `HP Format - ${base}.csv`,
    report: {
      mappedColumns,
      missingLogical,
      unmappedSourceHeaders,
      rowCount: sourceRows.length,
      barometricPressureKpa,
      source,
    },
  }
}
