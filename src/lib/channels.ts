import type { ChannelRole } from './types'

/** Ordered candidates for each logical role (exact VersaTuner header match first). */
export const ROLE_ALIASES: Record<ChannelRole, string[]> = {
  time: ['Time (s)', 'Time', 'time'],
  rpm: ['Engine RPM', 'RPM', 'Engine Speed', 'Engine speed (RPM)'],
  throttle: [
    'Absolute throttle position 1 (%)',
    'Absolute throttle position (%)',
    'Throttle position (%)',
    'Throttle Position (%)',
    'Absolute Throttle Position (OBD) (%)',
    'Throttle position 1 (%)',
  ],
  acceleratorPedal: [
    'Accelerator pedal position (%)',
    'Accelerator Pedal Position (%)',
    'APP (%)',
    'Accel Pedal Position Sensor 1 (%)',
  ],
  absoluteLoad: [
    'Absolute load',
    'Absolute Load',
    'Calculated load',
    'Calculated Engine Load (OBD) (%)',
    'Engine Load (%)',
    'Engine load',
  ],
  mapKpa: [
    'Intake manifold absolute pressure (kPa)',
    'Manifold Absolute Pressure (kPa)',
    'MAP (kPa)',
    'Manifold absolute pressure (PSI)',
    'Manifold Absolute Pressure (PSI)',
  ],
  baro: [
    'Barometric pressure (kPa)',
    'Barometric Pressure (kPa)',
    'Baro (kPa)',
    'Barometric pressure (PSI)',
    'Barometric Pressure (PSI)',
  ],
  boost: [
    'Boost (psi)',
    'Boost pressure (psi)',
    'Boost Pressure (psi)',
    'Manifold boost (psi)',
    'Boost',
  ],
  targetBoost: [
    'Target Boost (psi)',
    'Desired Boost (psi)',
    'Boost Target (psi)',
    'Target boost',
    'Desired boost',
  ],
  wgdc: [
    'Wastegate duty cycle (%)',
    'Wastegate Duty Cycle (%)',
    'WGDC (%)',
    'WGDC',
    'Wastegate DC (%)',
  ],
  afrGas: [
    'Actual equivalence/air to fuel ratio (AFR gas)',
    'AFR',
    'Wideband AFR',
    'Air Fuel Ratio',
    'Actual AFR (AFR)',
    'Air fuel ratio (AFR)',
  ],
  actualLambda: [
    'Actual equivalence/air to fuel ratio (λ)',
    'Actual equivalence/air to fuel ratio (lambda)',
    'Lambda',
    'Wideband Lambda',
  ],
  commandedLambda: [
    'Desired equivalence/air to fuel ratio (λ)',
    'Desired equivalence/air to fuel ratio (lambda)',
    'Commanded Lambda',
    'Target Lambda',
    'Desired AFR',
  ],
  timingAdvance: [
    'Ignition timing advance (°)',
    'Ignition Timing (°)',
    'Timing Advance (°)',
    'Spark Advance (°)',
    'Ignition timing (deg)',
    'Ignition Timing (deg)',
  ],
  knockRetard: [
    'Knock retard (°)',
    'Knock Retard (°)',
    'KR (°)',
    'Knock Retard',
    'Knock retard (deg)',
    'Knock Retard (deg)',
  ],
  shortTermFuelTrim: [
    'Short term fuel trim (primary sensor) (%)',
    'Short Term Fuel Trim (%)',
    'STFT (%)',
    'Short fuel trim 1 (%)',
  ],
  longTermFuelTrim: [
    'Long term fuel trim (%)',
    'Long Term Fuel Trim (%)',
    'LTFT (%)',
    'Long fuel trim 1 (%)',
  ],
  intakeAirTemp: [
    'Intake air temperature (°F)',
    'IAT (°F)',
    'Intake Air Temp (°F)',
    'Intake Air Temperature (F)',
    'Intake air temperature (F)',
  ],
  manifoldAirTemp: [
    'Manifold air temperature (°F)',
    'Intake air temperature (°F)',
    'MAT (°F)',
  ],
  coolantTemp: [
    'Engine coolant temperature (°F)',
    'ECT (°F)',
    'Coolant Temp (°F)',
    'Engine coolant temperature (F)',
    'Engine Coolant Temperature S1 (F)',
  ],
  ambientTemp: [
    'Ambient air temperature (°F)',
    'Ambient Temp (°F)',
    'Ambient Air Temperature (F)',
  ],
  oilTemp: ['Oil Temperature (F)', 'Oil temperature (°F)', 'Oil Temp (°F)', 'EOT (°F)'],
  mafGps: [
    'Mass airflow (g/s)',
    'MAF (g/s)',
    'Mass Airflow (g/s)',
    'Mass Air Flow (g/s)',
    'Mass air flow (g/s)',
  ],
  vehicleSpeed: [
    'Vehicle speed (mph)',
    'Vehicle Speed (mph)',
    'VSS (mph)',
    'Speed (mph)',
    'Vehicle speed (kph)',
    'Vehicle Speed (kph)',
    'Vehicle speed (km/h)',
  ],
  distance: [
    'Distance (mi)',
    'Distance (miles)',
    'Odometer (mi)',
    'Trip distance (mi)',
    'Distance (km)',
  ],
  power: [
    'Engine Power (hp)',
    'Power (hp)',
    'Wheel Power (hp)',
    'Engine Power (kW)',
    'Power (kW)',
  ],
  torque: [
    'Engine Torque (lb·ft)',
    'Engine Torque (lb-ft)',
    'Torque (lb·ft)',
    'Torque (lb-ft)',
    'Engine Torque (Nm)',
    'Torque (Nm)',
  ],
  mass: ['Mass (g)', 'Fuel Mass (g)', 'Air Mass (g)', 'Mass (kg)', 'Mass (lb)'],
  fuelVolume: [
    'Fuel injection volume (cc)',
    'Injector volume (cc)',
    'Injection volume (cc)',
    'Fuel volume (cc)',
    'Fuel injection volume (mm³)',
    'Injection volume (mm3)',
  ],
  fuelPressure: [
    'Fuel Pressure (mPa)',
    'Fuel pressure (mPa)',
    'Fuel Pressure (MPa)',
    'Fuel Rail Pressure (psi)',
    'Fuel pressure (psi)',
  ],
  oilPressure: ['Engine Oil Pressure (PSI)', 'Engine oil pressure (psi)', 'Oil Pressure (psi)'],
  catalystTemp: ['Catalyst Temperature (%)', 'Catalyst Temperature (°F)', 'Catalyst Temp'],
  intakeCamDesired: [
    'Desired intake camshaft advance from max retard position (°)',
    'VVT Intake Desired (deg)',
  ],
  intakeCamActual: [
    'Actual intake camshaft advance from max retard position (°)',
    'VVT Intake Actual Position (deg)',
  ],
  exhaustCamDesired: [
    'Desired exhaust camshaft retard from max advance position (°)',
    'VVT Exhaust Desired (deg)',
  ],
  exhaustCamActual: [
    'Actual exhaust camshaft retard from max advance position (°)',
    'VVT Exhaust Actual Position (deg)',
  ],
  injectorPulseWidth: [
    'Fuel injection pulse width (ms)',
    'Injector Pulse Width (ms)',
    'Fuel pulse width (ms)',
  ],
}

const HEADER_UNIT_RE = /^(.*?)\s*\(([^)]+)\)\s*$/

export function parseHeader(header: string): { name: string; unit: string | null } {
  const trimmed = header.trim()
  const match = HEADER_UNIT_RE.exec(trimmed)
  if (!match) {
    return { name: trimmed, unit: null }
  }
  return { name: match[1].trim(), unit: match[2].trim() }
}

export function resolveRoleForHeader(header: string): ChannelRole | null {
  for (const [role, aliases] of Object.entries(ROLE_ALIASES) as [ChannelRole, string[]][]) {
    if (aliases.some((alias) => alias.toLowerCase() === header.toLowerCase())) {
      return role
    }
  }
  return null
}

export function resolveSourceColumns(
  headers: string[],
): Partial<Record<ChannelRole, string>> {
  const lowerMap = new Map<string, string>()
  for (const header of headers) {
    const key = header.toLowerCase()
    if (!lowerMap.has(key)) lowerMap.set(key, header)
  }
  const result: Partial<Record<ChannelRole, string>> = {}

  for (const [role, aliases] of Object.entries(ROLE_ALIASES) as [ChannelRole, string[]][]) {
    for (const alias of aliases) {
      const hit = lowerMap.get(alias.toLowerCase())
      if (hit) {
        result[role] = hit
        break
      }
    }
  }

  return result
}

export function findChannelByRole(
  channels: { id: string; role: ChannelRole | null; name: string }[],
  role: ChannelRole,
): string | undefined {
  return channels.find((c) => c.role === role)?.id
}

/** Palette for chart series — high-contrast on dark UI */
export const SERIES_COLORS = [
  '#5ec8ff',
  '#ff7a59',
  '#7dffa0',
  '#ffd166',
  '#c792ea',
  '#82aaff',
  '#f78c6c',
  '#89ddff',
  '#c3e88d',
  '#ffcb6b',
  '#f07178',
  '#b2ccd6',
]

export function colorForIndex(index: number): string {
  if (index < SERIES_COLORS.length) return SERIES_COLORS[index]
  const hue = (index * 137.508) % 360
  return `hsl(${hue.toFixed(1)} 72% 62%)`
}

/** First palette/generated color not already used by plotted series. */
export function unusedSeriesColor(used: Iterable<string>): string {
  const taken = new Set([...used].map((c) => c.toLowerCase()))
  for (let i = 0; i < SERIES_COLORS.length + 64; i++) {
    const color = colorForIndex(i)
    if (!taken.has(color.toLowerCase())) return color
  }
  return colorForIndex(taken.size)
}
