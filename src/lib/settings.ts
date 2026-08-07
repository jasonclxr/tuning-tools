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
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
