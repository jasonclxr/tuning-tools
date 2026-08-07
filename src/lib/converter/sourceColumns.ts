import type { ChannelRole } from '../types'
import { ROLE_ALIASES, resolveSourceColumns } from '../channels'

/** Converter uses the shared role aliases; keys match the Node converter's logical names. */
export type ConverterColumnKey =
  | 'time'
  | 'absoluteLoad'
  | 'throttle'
  | 'acceleratorPedal'
  | 'afrGas'
  | 'actualLambda'
  | 'commandedLambda'
  | 'coolantTemp'
  | 'rpm'
  | 'timingAdvance'
  | 'intakeAirTemp'
  | 'mapKpa'
  | 'knockRetard'
  | 'longTermFuelTrim'
  | 'manifoldAirTemp'
  | 'mafGps'
  | 'shortTermFuelTrim'
  | 'vehicleSpeed'
  | 'catalystTemp'
  | 'intakeCamDesired'
  | 'intakeCamActual'
  | 'exhaustCamDesired'
  | 'exhaustCamActual'
  | 'injectorPulseWidth'

const CONVERTER_ROLES: ConverterColumnKey[] = [
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

export function resolveConverterColumns(
  headers: string[],
): Partial<Record<ConverterColumnKey, string>> {
  const all = resolveSourceColumns(headers)
  const result: Partial<Record<ConverterColumnKey, string>> = {}
  for (const key of CONVERTER_ROLES) {
    const header = all[key as ChannelRole]
    if (header) result[key] = header
  }
  return result
}

export function findUnmappedSourceHeaders(
  headers: string[],
  sourceColumns: Partial<Record<ConverterColumnKey, string>>,
): string[] {
  const mapped = new Set(Object.values(sourceColumns).filter(Boolean))
  return headers.filter((h) => h !== sourceColumns.time && !mapped.has(h))
}

export { ROLE_ALIASES }
