import { colorForIndex, findChannelByRole } from './channels'
import type { ChartPane, ParsedChannel, ParsedLog } from './types'

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

/** Initial chart series when a log is opened (boost / load / RPM overlay). */
export function defaultChartPanes(log: ParsedLog): ChartPane[] {
  const boost = pick(log, ['boost'], ['Boost'])
  const targetBoost = pick(log, ['targetBoost'], ['Target Boost', 'Desired Boost'])
  const wgdc = pick(log, ['wgdc'], ['WGDC', 'Wastegate'])
  const rpm = pick(log, ['rpm'])
  const throttle = pick(log, ['throttle', 'acceleratorPedal'])
  const map = pick(log, ['mapKpa'])
  const channelIds = [boost, targetBoost, map, wgdc, throttle, rpm].filter(
    (id): id is string => Boolean(id),
  )
  if (channelIds.length === 0) return []
  return [
    {
      id: 'pane-1',
      series: channelIds.map((channelId, i) => ({
        channelId,
        color: colorForIndex(i),
        visible: true,
      })),
    },
  ]
}

export function channelLabel(ch: ParsedChannel): string {
  const unit = ch.unit ? ` (${ch.unit})` : ''
  const derived = ch.derived ? ' · derived' : ''
  return `${ch.name}${unit}${derived}`
}
