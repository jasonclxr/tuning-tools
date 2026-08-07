import { loadBundledReference, buildHpCsvContent, type HpReference } from './hpReference'
import { inferBarometricPressure, mapTargetValue } from './rowMapper'
import {
  findUnmappedSourceHeaders,
  resolveConverterColumns,
  type ConverterColumnKey,
} from './sourceColumns'

export interface ConversionReport {
  mappedColumns: { logical: ConverterColumnKey; header: string }[]
  missingLogical: ConverterColumnKey[]
  unmappedSourceHeaders: string[]
  rowCount: number
  barometricPressureKpa: number
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
  'mapKpa',
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
]

export async function convertVersaToHp(
  sourceRows: Record<string, string>[],
  headers: string[],
  sourceFilename: string,
  reference?: HpReference,
): Promise<ConversionResult> {
  const ref = reference ?? (await loadBundledReference())
  const sourceColumns = resolveConverterColumns(headers)
  const barometricPressureKpa = inferBarometricPressure(sourceRows, sourceColumns)
  const unmappedSourceHeaders = findUnmappedSourceHeaders(headers, sourceColumns)

  const outputRows = sourceRows.map((row) =>
    ref.labels.map((label) => mapTargetValue(label, row, sourceColumns, barometricPressureKpa)),
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
    },
  }
}
