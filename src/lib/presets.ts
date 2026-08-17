import { colorForIndex, findChannelByRole } from './channels'
import type { ChartPane, LayoutPreset, ParsedChannel, ParsedLog } from './types'

function pick(
  log: ParsedLog,
  roles: Parameters<typeof findChannelByRole>[1][],
  fallbackNames: string[] = [],
): string | undefined {
  for (const role of roles) {
    const id = findChannelByRole(log.channels, role)
    if (id) return id
  }
  for (const name of fallbackNames) {
    const hit = log.channels.find(
      (c) =>
        c.id.toLowerCase() === name.toLowerCase() ||
        c.name.toLowerCase() === name.toLowerCase() ||
        c.id.toLowerCase().includes(name.toLowerCase()),
    )
    if (hit) return hit.id
  }
  return undefined
}

function pane(id: string, channelIds: (string | undefined)[], startColor = 0): ChartPane {
  const series = channelIds
    .filter((id): id is string => Boolean(id))
    .map((channelId, i) => ({
      channelId,
      color: colorForIndex(startColor + i),
      visible: true,
    }))
  return { id, series }
}

function singlePane(id: string, channelIds: (string | undefined)[]): ChartPane[] {
  const p = pane(id, channelIds, 0)
  return p.series.length > 0 ? [p] : []
}

export function buildBuiltinPresets(log: ParsedLog): LayoutPreset[] {
  const boost = pick(log, ['boost'], ['Boost'])
  const targetBoost = pick(log, ['targetBoost'], ['Target Boost', 'Desired Boost'])
  const wgdc = pick(log, ['wgdc'], ['WGDC', 'Wastegate'])
  const rpm = pick(log, ['rpm'])
  const throttle = pick(log, ['throttle', 'acceleratorPedal'])
  const map = pick(log, ['mapKpa'])
  const load = pick(log, ['absoluteLoad'])
  const timing = pick(log, ['timingAdvance'])
  const knock = pick(log, ['knockRetard'])
  const knockAct = log.channels.find((c) => c.id === '__derived_knock_activity')?.id
  const afr = pick(log, ['afrGas'])
  const lambda = pick(log, ['actualLambda'])
  const cmdLambda = pick(log, ['commandedLambda'])
  const stft = pick(log, ['shortTermFuelTrim'])
  const ltft = pick(log, ['longTermFuelTrim'])
  const fuelPrimary = afr ?? lambda
  const speed = pick(log, ['vehicleSpeed'])
  const wheelHp = log.channels.find((c) => c.id === '__derived_wheel_hp')?.id
  const crankHp = log.channels.find((c) => c.id === '__derived_crank_hp')?.id
  const crankTq = log.channels.find((c) => c.id === '__derived_crank_torque')?.id
  const hpFromTq = log.channels.find((c) => c.id === '__derived_hp_from_torque')?.id
  const tqFromHp = log.channels.find((c) => c.id === '__derived_torque_from_hp')?.id
  const nativeHp = pick(log, ['power'])
  const nativeTq = pick(log, ['torque'])

  return [
    {
      id: 'boost',
      name: 'Boost',
      builtin: true,
      panes: singlePane('boost', [boost, targetBoost, map, wgdc, throttle, rpm]),
    },
    {
      id: 'ignition',
      name: 'Ignition',
      builtin: true,
      panes: singlePane('ignition', [timing, knock ?? knockAct, load, map, rpm]),
    },
    {
      id: 'fueling',
      name: 'Fueling',
      builtin: true,
      panes: singlePane('fueling', [fuelPrimary, cmdLambda, stft, ltft, load, rpm]),
    },
    {
      id: 'power',
      name: 'Power',
      builtin: true,
      panes: singlePane('power', [
        wheelHp,
        crankHp ?? hpFromTq ?? nativeHp,
        crankTq ?? tqFromHp ?? nativeTq,
        speed,
        rpm,
      ]),
    },
  ]
}

const STORAGE_KEY = 'versa-log-viewer:layouts'

export function loadCustomLayouts(): LayoutPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LayoutPreset[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomLayout(layout: LayoutPreset): LayoutPreset[] {
  const existing = loadCustomLayouts().filter((l) => l.id !== layout.id)
  const next = [...existing, { ...layout, builtin: false }]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function deleteCustomLayout(id: string): LayoutPreset[] {
  const next = loadCustomLayouts().filter((l) => l.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function channelLabel(ch: ParsedChannel): string {
  const unit = ch.unit ? ` (${ch.unit})` : ''
  const derived = ch.derived ? ' · derived' : ''
  return `${ch.name}${unit}${derived}`
}
