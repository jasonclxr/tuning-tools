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
  /** Curb/test weight used for VSS-based wheel HP estimate (always stored as lb). */
  vehicleWeightLb: number
  /** Drivetrain loss percent for crank HP estimate from wheel HP (0–50). */
  drivetrainLossPercent: number
  /** When true, estimate wheel/crank HP from vehicle speed + weight. */
  estimatePowerFromSpeed: boolean
}

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
  vehicleWeightLb: 3200,
  drivetrainLossPercent: 15,
  estimatePowerFromSpeed: true,
}

const STORAGE_KEY = 'versa-log-viewer:settings'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      stoichAfr:
        typeof parsed.stoichAfr === 'number' && Number.isFinite(parsed.stoichAfr) && parsed.stoichAfr > 0
          ? parsed.stoichAfr
          : DEFAULT_SETTINGS.stoichAfr,
      vehicleWeightLb:
        typeof parsed.vehicleWeightLb === 'number' &&
        Number.isFinite(parsed.vehicleWeightLb) &&
        parsed.vehicleWeightLb > 0
          ? parsed.vehicleWeightLb
          : DEFAULT_SETTINGS.vehicleWeightLb,
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
