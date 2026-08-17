import { useMemo } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { computePowerStats, type PowerPeak } from '../../lib/powerTorque'
import { powerUnitLabel, torqueUnitLabel } from '../../lib/units'
import type { ParsedLog, TimeRange } from '../../lib/types'

interface Props {
  log: ParsedLog
  range: TimeRange | null
}

function fmtPeak(peak: PowerPeak | null, unit: string, digits = 0): string {
  if (!peak) return '—'
  const rpm = peak.rpm != null ? ` @ ${Math.round(peak.rpm)} rpm` : ''
  return `${peak.value.toFixed(digits)} ${unit}${rpm}`
}

export function PowerPanel({ log, range }: Props) {
  const { settings } = useSettings()
  const stats = useMemo(() => computePowerStats(log, range), [log, range])
  const powerUnit = powerUnitLabel(settings.powerUnit)
  const torqueUnit = torqueUnitLabel(settings.torqueUnit)

  const hasSpeed = log.channels.some((c) => c.role === 'vehicleSpeed')
  const hasEstChannels = log.channels.some((c) => c.id === '__derived_wheel_hp')

  return (
    <div className="power-panel">
      <div className="panel-header">Power / torque</div>

      {!settings.estimatePowerFromSpeed && !stats && (
        <p className="muted">
          Enable “Estimate HP/torque from vehicle speed” in Settings, or load a log that already
          includes torque/HP channels.
        </p>
      )}

      {settings.estimatePowerFromSpeed && !hasSpeed && (
        <p className="muted">
          This log has no vehicle speed channel, so a VSS-based estimate isn’t available. Logged
          torque/HP (if present) still convert with HP = TQ × RPM / 5252.
        </p>
      )}

      {settings.estimatePowerFromSpeed && hasSpeed && !hasEstChannels && (
        <p className="muted">
          Set a vehicle weight in Settings (currently {settings.vehicleWeightLb} lb) to generate
          wheel/crank HP channels.
        </p>
      )}

      {stats && (
        <>
          <div className="power-meta">
            Method: {stats.method}
            {range
              ? ` · pull ${range.start.toFixed(2)}–${range.end.toFixed(2)}s`
              : ' · full log'}
            {settings.estimatePowerFromSpeed && hasEstChannels && (
              <>
                {' '}
                · weight {settings.vehicleWeightLb} lb · loss {settings.drivetrainLossPercent}%
              </>
            )}
          </div>
          <div className="power-stats-grid">
            <div className="power-stat">
              <span className="power-stat-label">Peak wheel power</span>
              <strong>{fmtPeak(stats.wheelHpPeak, powerUnit, 0)}</strong>
            </div>
            <div className="power-stat">
              <span className="power-stat-label">Peak crank power</span>
              <strong>{fmtPeak(stats.crankHpPeak, powerUnit, 0)}</strong>
            </div>
            <div className="power-stat">
              <span className="power-stat-label">Peak crank torque</span>
              <strong>{fmtPeak(stats.crankTorquePeak, torqueUnit, 0)}</strong>
            </div>
            <div className="power-stat">
              <span className="power-stat-label">Positive-accel samples</span>
              <strong>{stats.sampleCount.toLocaleString()}</strong>
            </div>
          </div>
          <p className="power-footnote">
            Estimate ignores aero, grade, and tire slip. Use the Power chart layout or Map table
            (cell = Wheel/Crank HP) over a selected pull for detail.
          </p>
        </>
      )}
    </div>
  )
}
