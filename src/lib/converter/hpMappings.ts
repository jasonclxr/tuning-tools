import type { ConverterColumnKey } from './sourceColumns'
import { getSourceValue } from './valueUtils'

type Ctx = {
  row: Record<string, string>
  sourceColumns: Partial<Record<ConverterColumnKey, string>>
  getSourceValue: typeof getSourceValue
  timeToSeconds: number
  readSpeedMph: () => number | undefined
  readFuelPressurePsi: () => number | undefined
}

export const STATIC_VALUES = new Map<string, string | number>([
  ['Fuel System #1 Status (SAE)', '---'],
  ['Fuel Pressure', 0],
  ['Fuel Rail Pressure (SAE)', 0],
  ['Actual Engine Torque (SAE)', 0],
  ['Mass Airflow Sensor', 0],
  ['Engine Fuel Rate (SAE)', 0],
  ['Control Module Voltage', 0],
  ['Fuel Level Input (SAE)', 0],
])

export const DIRECT_VALUE_SOURCES = new Map<string, (ctx: Ctx) => string | number | undefined>([
  ['Offset', ({ row, sourceColumns, timeToSeconds }) => {
    const raw = getSourceValue(row, sourceColumns, 'time')
    if (raw === undefined || raw === '') return undefined
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n)) return raw
    if (timeToSeconds === 1) return raw
    return n * timeToSeconds
  }],
  ['Knock Retard', ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'knockRetard')],
  [
    'Short Term Fuel Trim Bank 1',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'shortTermFuelTrim'),
  ],
  [
    'Long Term Fuel Trim Bank 1',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'longTermFuelTrim'),
  ],
  [
    'Timing Advance',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'timingAdvance'),
  ],
  [
    'Timing Advance (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'timingAdvance'),
  ],
  ['Engine RPM', ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'rpm')],
  ['Engine RPM (SAE)', ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'rpm')],
  [
    'Accelerator Position D (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'acceleratorPedal'),
  ],
  [
    'Commanded Throttle Actuator (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'throttle'),
  ],
  [
    'Relative Throttle Position (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'throttle'),
  ],
  [
    'Accelerator Pedal Position',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'acceleratorPedal'),
  ],
  [
    'Throttle Position (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'throttle'),
  ],
  [
    'Long Term Fuel Trim Bank 1 (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'longTermFuelTrim'),
  ],
  [
    'Short Term Fuel Trim Bank 1 (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'shortTermFuelTrim'),
  ],
  ['Vehicle Speed', ({ readSpeedMph }) => readSpeedMph()],
  [
    'Fuel Pressure',
    ({ readFuelPressurePsi }) => readFuelPressurePsi(),
  ],
  [
    'Fuel Rail Pressure (SAE)',
    ({ readFuelPressurePsi }) => readFuelPressurePsi(),
  ],
  [
    'Catalyst Temp B1S1 (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'catalystTemp'),
  ],
  [
    'Intake Air Temp (SAE)',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'intakeAirTemp'),
  ],
  [
    'Intake Air Temp',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'manifoldAirTemp'),
  ],
  [
    'Engine Coolant Temp',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'coolantTemp'),
  ],
  [
    'Ambient Air Temp',
    ({ row, sourceColumns }) =>
      getSourceValue(row, sourceColumns, 'ambientTemp') ??
      getSourceValue(row, sourceColumns, 'intakeAirTemp'),
  ],
  [
    'Intake Cam Des Angle',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'intakeCamDesired'),
  ],
  [
    'Intake Cam Angle',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'intakeCamActual'),
  ],
  [
    'Exhaust Cam Des Angle',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'exhaustCamDesired'),
  ],
  [
    'Exhaust Cam Angle',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'exhaustCamActual'),
  ],
  [
    'Injector Pulse Width',
    ({ row, sourceColumns }) => getSourceValue(row, sourceColumns, 'injectorPulseWidth'),
  ],
])

export function getComputedLabelValue(
  label: string,
  computed: {
    lambda: number
    commandedLambda: number
    mapPsi: number
    mafLbMin: number
    loadPercent: number
    barometricPressureKpa: number
  },
): number {
  switch (label) {
    case 'WB EQ Ratio Bank 1':
    case 'WB EQ Ratio 1 (SAE) (2)':
      return computed.lambda
    case 'Equivalence Ratio Commanded (SAE)':
      return computed.commandedLambda
    case 'Manifold Absolute Pressure':
    case 'Intake Manifold Absolute Pressure (SAE)':
      return computed.mapPsi
    case 'Mass Airflow':
    case 'Mass Airflow (SAE)':
      return computed.mafLbMin
    case 'Calculated Engine Load (SAE)':
    case 'Absolute Load (SAE)':
      return computed.loadPercent
    case 'Barometric Pressure':
      return computed.barometricPressureKpa
    default:
      return 0
  }
}
