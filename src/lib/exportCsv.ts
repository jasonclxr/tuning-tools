import type { ParsedLog, TimeRange } from './types'
import { indexNearTime } from './downsample'

export function exportLogRangeCsv(
  log: ParsedLog,
  range: TimeRange | null,
  channelIds: string[],
): string {
  const ids = channelIds.filter((id) => log.channels.some((c) => c.id === id))
  let i0 = 0
  let i1 = log.time.length - 1
  if (range) {
    i0 = indexNearTime(log.time, range.start)
    i1 = indexNearTime(log.time, range.end)
    if (i1 < i0) [i0, i1] = [i1, i0]
  }

  const header = ['Time (s)', ...ids.map((id) => log.channels.find((c) => c.id === id)!.id)]
  const lines = [header.join(',')]
  for (let i = i0; i <= i1; i++) {
    const cells = [String(log.time[i])]
    for (const id of ids) {
      const ch = log.channels.find((c) => c.id === id)!
      const v = ch.data[i]
      cells.push(Number.isFinite(v) ? String(v) : '')
    }
    lines.push(cells.join(','))
  }
  return lines.join('\n') + '\n'
}

export function downloadText(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
