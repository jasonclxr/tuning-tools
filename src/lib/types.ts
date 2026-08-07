export type ChannelRole =
  | 'time'
  | 'rpm'
  | 'throttle'
  | 'acceleratorPedal'
  | 'absoluteLoad'
  | 'mapKpa'
  | 'boost'
  | 'targetBoost'
  | 'wgdc'
  | 'afrGas'
  | 'actualLambda'
  | 'commandedLambda'
  | 'timingAdvance'
  | 'knockRetard'
  | 'shortTermFuelTrim'
  | 'longTermFuelTrim'
  | 'intakeAirTemp'
  | 'manifoldAirTemp'
  | 'coolantTemp'
  | 'ambientTemp'
  | 'mafGps'
  | 'vehicleSpeed'
  | 'distance'
  | 'power'
  | 'torque'
  | 'mass'
  | 'fuelVolume'
  | 'catalystTemp'
  | 'intakeCamDesired'
  | 'intakeCamActual'
  | 'exhaustCamDesired'
  | 'exhaustCamActual'
  | 'injectorPulseWidth'

export interface ParsedChannel {
  id: string
  name: string
  unit: string | null
  role: ChannelRole | null
  data: Float64Array
  derived?: boolean
}

export interface LogMeta {
  filename: string
  rowCount: number
  durationSec: number
  sampleRateHz: number
  tMin: number
  tMax: number
}

export interface ParsedLog {
  meta: LogMeta
  time: Float64Array
  channels: ParsedChannel[]
  headers: string[]
  /** Original string rows keyed by header — used by converter */
  rawRows: Record<string, string>[]
}

export interface TimeRange {
  start: number
  end: number
}

export interface PaneSeries {
  channelId: string
  color: string
  visible: boolean
}

export interface ChartPane {
  id: string
  series: PaneSeries[]
}

export interface LayoutPreset {
  id: string
  name: string
  builtin?: boolean
  panes: ChartPane[]
}

export interface HistogramFilter {
  rpmMin?: number
  rpmMax?: number
  loadMin?: number
  loadMax?: number
  tpsMin?: number
  tpsMax?: number
}
