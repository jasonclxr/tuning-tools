import { DEFAULT_SETTINGS, type AppSettings } from '../../lib/settings'
import { useSettings } from '../../context/SettingsContext'

type UnitKey = Exclude<
  keyof AppSettings,
  'stoichAfr' | 'vehicleWeightLb' | 'drivetrainLossPercent' | 'estimatePowerFromSpeed'
>

interface UnitRow {
  key: UnitKey
  label: string
  options: { value: string; label: string }[]
}

const UNIT_ROWS: UnitRow[] = [
  {
    key: 'pressureUnit',
    label: 'Pressure',
    options: [
      { value: 'psi', label: 'psi' },
      { value: 'kPa', label: 'kPa' },
      { value: 'bar', label: 'bar' },
    ],
  },
  {
    key: 'temperatureUnit',
    label: 'Temperature',
    options: [
      { value: 'F', label: '°F' },
      { value: 'C', label: '°C' },
    ],
  },
  {
    key: 'mixtureUnit',
    label: 'Mixture',
    options: [
      { value: 'afr', label: 'AFR' },
      { value: 'lambda', label: 'Lambda (λ)' },
    ],
  },
  {
    key: 'speedUnit',
    label: 'Vehicle speed',
    options: [
      { value: 'mph', label: 'mph' },
      { value: 'kmh', label: 'km/h' },
    ],
  },
  {
    key: 'distanceUnit',
    label: 'Distance',
    options: [
      { value: 'mi', label: 'mi' },
      { value: 'km', label: 'km' },
    ],
  },
  {
    key: 'powerUnit',
    label: 'Power',
    options: [
      { value: 'hp', label: 'hp' },
      { value: 'kW', label: 'kW' },
      { value: 'PS', label: 'PS' },
    ],
  },
  {
    key: 'torqueUnit',
    label: 'Torque',
    options: [
      { value: 'lbft', label: 'lb·ft' },
      { value: 'Nm', label: 'N·m' },
    ],
  },
  {
    key: 'airflowUnit',
    label: 'Airflow',
    options: [
      { value: 'g_s', label: 'g/s' },
      { value: 'lb_min', label: 'lb/min' },
      { value: 'kg_h', label: 'kg/h' },
    ],
  },
  {
    key: 'massUnit',
    label: 'Mass',
    options: [
      { value: 'g', label: 'g' },
      { value: 'kg', label: 'kg' },
      { value: 'lb', label: 'lb' },
    ],
  },
  {
    key: 'fuelVolumeUnit',
    label: 'Fuel injection volume',
    options: [
      { value: 'cc', label: 'cc' },
      { value: 'mm3', label: 'mm³' },
      { value: 'uL', label: 'µL' },
    ],
  },
]

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings()

  return (
    <div className="settings-page">
      <div className="settings-intro">
        <h2>Settings</h2>
        <p>
          Preferences are stored in this browser only (localStorage). Unit choices apply to the log
          viewer display — raw CSV import and the HPTuners converter still use source values.
        </p>
      </div>

      <section className="settings-card">
        <h3>Preferred units</h3>
        <table className="units-table">
          <thead>
            <tr>
              <th>Quantity</th>
              <th>Preferred unit</th>
            </tr>
          </thead>
          <tbody>
            {UNIT_ROWS.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>
                  <select
                    value={String(settings[row.key])}
                    onChange={(e) =>
                      updateSettings({ [row.key]: e.target.value } as Partial<AppSettings>)
                    }
                  >
                    {row.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <label className="settings-field stoich-field">
          <span>Stoich AFR (λ ↔ AFR)</span>
          <input
            type="number"
            min={10}
            max={20}
            step={0.01}
            value={settings.stoichAfr}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v > 0) updateSettings({ stoichAfr: v })
            }}
          />
          <span className="settings-hint">Default {DEFAULT_SETTINGS.stoichAfr} (gasoline)</span>
        </label>
      </section>

      <section className="settings-card">
        <h3>Power / torque estimate</h3>
        <p className="settings-card-note">
          When vehicle speed is logged, wheel HP is estimated from weight × speed × accel (level
          ground, no aero). Crank HP applies drivetrain loss. Logged torque/HP still convert via
          HP = TQ × RPM / 5252 when present.
        </p>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={settings.estimatePowerFromSpeed}
            onChange={(e) => updateSettings({ estimatePowerFromSpeed: e.target.checked })}
          />
          Estimate HP/torque from vehicle speed
        </label>
        <label className="settings-field">
          <span>Vehicle weight (lb)</span>
          <input
            type="number"
            min={500}
            max={20000}
            step={10}
            value={settings.vehicleWeightLb}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v > 0) updateSettings({ vehicleWeightLb: v })
            }}
          />
          <span className="settings-hint">
            Include driver/fuel as tested · default {DEFAULT_SETTINGS.vehicleWeightLb} lb
          </span>
        </label>
        <label className="settings-field">
          <span>Drivetrain loss (%)</span>
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            value={settings.drivetrainLossPercent}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v)) {
                updateSettings({ drivetrainLossPercent: Math.min(50, Math.max(0, v)) })
              }
            }}
          />
          <span className="settings-hint">
            Used for crank HP from wheel HP · default {DEFAULT_SETTINGS.drivetrainLossPercent}%
          </span>
        </label>
      </section>

      <div className="settings-actions">
        <button type="button" className="ghost" onClick={resetSettings}>
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
