export type PressureUnit = 'kPa' | 'psi' | 'bar'
export type TemperatureUnit = 'F' | 'C'
export type MixtureUnit = 'afr' | 'lambda'
export type SpeedUnit = 'mph' | 'kmh'
export type DistanceUnit = 'mi' | 'km'
export type PowerUnit = 'hp' | 'kW' | 'PS'
export type TorqueUnit = 'lbft' | 'Nm'
export type AirflowUnit = 'g_s' | 'lb_min' | 'kg_h'
export type MassUnit = 'g' | 'kg' | 'lb'
export type FuelVolumeUnit = 'cc' | 'mm3' | 'uL'

export interface AppSettings {
  pressureUnit: PressureUnit
  temperatureUnit: TemperatureUnit
  mixtureUnit: MixtureUnit
  speedUnit: SpeedUnit
  distanceUnit: DistanceUnit
  powerUnit: PowerUnit
  torqueUnit: TorqueUnit
  airflowUnit: AirflowUnit
  massUnit: MassUnit
  fuelVolumeUnit: FuelVolumeUnit
  /** Stoich AFR used for λ ↔ AFR conversions (gasoline default 14.7). */
  stoichAfr: number
  /** Curb / vehicle-only weight (lb), excluding driver and fuel. */
  vehicleWeightLb: number
  /** Driver weight (lb). */
  driverWeightLb: number
  /** Fuel tank fill 0–100%. Tank is 11 gal gasoline. */
  tankFillPercent: number
  /** Drivetrain loss percent for crank HP estimate from wheel HP (0–50). */
  drivetrainLossPercent: number
  /** When true, estimate wheel/crank HP from vehicle speed + weight. */
  estimatePowerFromSpeed: boolean
}

/** 11 gal tank used for fuel mass. */
export const TANK_CAPACITY_GAL = 11
/** Gasoline density used for tank-fill weight (lb / US gal). */
export const GASOLINE_LB_PER_GAL = 6.3

export const DEFAULT_SETTINGS: AppSettings = {
  pressureUnit: 'psi',
  temperatureUnit: 'F',
  mixtureUnit: 'afr',
  speedUnit: 'mph',
  distanceUnit: 'mi',
  powerUnit: 'hp',
  torqueUnit: 'lbft',
  airflowUnit: 'g_s',
  massUnit: 'g',
  fuelVolumeUnit: 'cc',
  stoichAfr: 14.7,
  vehicleWeightLb: 2200,
  driverWeightLb: 230,
  tankFillPercent: 50,
  drivetrainLossPercent: 15,
  estimatePowerFromSpeed: true,
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function fuelWeightLb(settings: Pick<AppSettings, 'tankFillPercent'>): number {
  const fill = Math.min(100, Math.max(0, settings.tankFillPercent)) / 100
  return TANK_CAPACITY_GAL * GASOLINE_LB_PER_GAL * fill
}

/** Combined as-tested weight for VSS power estimates. */
export function testWeightLb(settings: AppSettings): number {
  return Math.max(0, settings.vehicleWeightLb) + Math.max(0, settings.driverWeightLb) + fuelWeightLb(settings)
}

const STORAGE_KEY = 'versa-log-viewer:settings'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const hasSplitWeight =
      typeof parsed.driverWeightLb === 'number' || typeof parsed.tankFillPercent === 'number'
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      stoichAfr:
        typeof parsed.stoichAfr === 'number' && Number.isFinite(parsed.stoichAfr) && parsed.stoichAfr > 0
          ? parsed.stoichAfr
          : DEFAULT_SETTINGS.stoichAfr,
      vehicleWeightLb:
        hasSplitWeight && isPositiveNumber(parsed.vehicleWeightLb)
          ? parsed.vehicleWeightLb
          : DEFAULT_SETTINGS.vehicleWeightLb,
      driverWeightLb:
        typeof parsed.driverWeightLb === 'number' &&
        Number.isFinite(parsed.driverWeightLb) &&
        parsed.driverWeightLb >= 0
          ? parsed.driverWeightLb
          : DEFAULT_SETTINGS.driverWeightLb,
      tankFillPercent:
        typeof parsed.tankFillPercent === 'number' && Number.isFinite(parsed.tankFillPercent)
          ? Math.min(100, Math.max(0, parsed.tankFillPercent))
          : DEFAULT_SETTINGS.tankFillPercent,
      drivetrainLossPercent:
        typeof parsed.drivetrainLossPercent === 'number' &&
        Number.isFinite(parsed.drivetrainLossPercent)
          ? Math.min(50, Math.max(0, parsed.drivetrainLossPercent))
          : DEFAULT_SETTINGS.drivetrainLossPercent,
      estimatePowerFromSpeed:
        typeof parsed.estimatePowerFromSpeed === 'boolean'
          ? parsed.estimatePowerFromSpeed
          : DEFAULT_SETTINGS.estimatePowerFromSpeed,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
