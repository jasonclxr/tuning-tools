import type { ChannelRole, ParsedChannel } from './types'

export type ChannelCategory =
  | 'engine'
  | 'air'
  | 'fuel'
  | 'spark'
  | 'temp'
  | 'vehicle'
  | 'other'

export const CHANNEL_CATEGORY_ORDER: ChannelCategory[] = [
  'engine',
  'air',
  'fuel',
  'spark',
  'temp',
  'vehicle',
  'other',
]

export const CHANNEL_CATEGORY_LABELS: Record<ChannelCategory, string> = {
  engine: 'Engine',
  air: 'Air / Boost',
  fuel: 'Fuel',
  spark: 'Ignition',
  temp: 'Temperature',
  vehicle: 'Vehicle / Power',
  other: 'Other',
}

const ROLE_CATEGORY: Record<ChannelRole, ChannelCategory> = {
  time: 'other',
  rpm: 'engine',
  throttle: 'engine',
  acceleratorPedal: 'engine',
  absoluteLoad: 'engine',
  oilPressure: 'engine',
  intakeCamDesired: 'engine',
  intakeCamActual: 'engine',
  exhaustCamDesired: 'engine',
  exhaustCamActual: 'engine',
  mapKpa: 'air',
  baro: 'air',
  boost: 'air',
  targetBoost: 'air',
  wgdc: 'air',
  mafGps: 'air',
  afrGas: 'fuel',
  actualLambda: 'fuel',
  commandedLambda: 'fuel',
  shortTermFuelTrim: 'fuel',
  longTermFuelTrim: 'fuel',
  fuelVolume: 'fuel',
  fuelPressure: 'fuel',
  injectorPulseWidth: 'fuel',
  mass: 'other',
  timingAdvance: 'spark',
  knockRetard: 'spark',
  intakeAirTemp: 'temp',
  manifoldAirTemp: 'temp',
  coolantTemp: 'temp',
  ambientTemp: 'temp',
  oilTemp: 'temp',
  catalystTemp: 'temp',
  vehicleSpeed: 'vehicle',
  distance: 'vehicle',
  power: 'vehicle',
  torque: 'vehicle',
  gear: 'engine',
}

export interface ChannelGroup<T extends { name: string } = ParsedChannel> {
  id: ChannelCategory
  label: string
  channels: T[]
}

function categoryFromName(name: string, unit: string | null): ChannelCategory | null {
  const s = `${name} ${unit ?? ''}`.toLowerCase()
  if (/timing|spark|knock|ignition/.test(s)) return 'spark'
  if (/afr|lambda|fuel|injector|trim|stft|ltft|pulse width/.test(s)) return 'fuel'
  if (/boost|wastegate|wgdc|\bmap\b|baro|maf|airflow|air flow/.test(s)) return 'air'
  if (/rpm|throttle|pedal|\bload\b|camshaft|vvt|oil pressure|\bgear\b/.test(s)) return 'engine'
  if (/temp|iat|ect|coolant|catalyst/.test(s) || /[°º]/.test(s)) return 'temp'
  if (/speed|mph|kph|km\/h|power|torque|\bhp\b|distance|odometer/.test(s)) return 'vehicle'
  return null
}

export function categoryForChannel(ch: {
  role: ChannelRole | null
  name: string
  unit: string | null
}): ChannelCategory {
  const fromName = categoryFromName(ch.name, ch.unit)
  if (ch.role && ch.role !== 'mass' && ch.role !== 'time') {
    return ROLE_CATEGORY[ch.role]
  }
  return fromName ?? (ch.role ? ROLE_CATEGORY[ch.role] : 'other')
}

function compareChannelNames(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
}

/** Group channels by category; each group is sorted alphabetically. Empty groups are omitted. */
export function groupChannels<T extends { name: string; role: ChannelRole | null; unit: string | null }>(
  channels: T[],
): ChannelGroup<T>[] {
  const buckets = new Map<ChannelCategory, T[]>()
  for (const ch of channels) {
    const cat = categoryForChannel(ch)
    const list = buckets.get(cat)
    if (list) list.push(ch)
    else buckets.set(cat, [ch])
  }

  const groups: ChannelGroup<T>[] = []
  for (const id of CHANNEL_CATEGORY_ORDER) {
    const items = buckets.get(id)
    if (!items?.length) continue
    groups.push({
      id,
      label: CHANNEL_CATEGORY_LABELS[id],
      channels: [...items].sort(compareChannelNames),
    })
  }
  return groups
}
