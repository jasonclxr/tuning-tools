import Papa from 'papaparse'
import { parseHeader, resolveRoleForHeader, resolveSourceColumns } from './channels'
import { addDerivedChannels } from './derived'
import type { ParsedChannel, ParsedLog } from './types'

function isNumericHeader(header: string): boolean {
  return header.trim().toLowerCase() !== ''
}

export async function parseVersaCsvFile(file: File): Promise<ParsedLog> {
  const text = await file.text()
  return parseVersaCsvText(text, file.name)
}

export function parseVersaCsvText(text: string, filename: string): ParsedLog {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
  })

  if (parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
    throw new Error(parsed.errors[0]?.message ?? 'Failed to parse CSV')
  }

  const rows = parsed.data.filter((row) => Object.values(row).some((v) => String(v ?? '').trim() !== ''))
  if (rows.length === 0) {
    throw new Error('CSV contains no data rows')
  }

  const headers = (parsed.meta.fields ?? Object.keys(rows[0])).filter(isNumericHeader)
  const roles = resolveSourceColumns(headers)
  const timeHeader = roles.time ?? headers[0]
  if (!timeHeader) {
    throw new Error('Could not find a time column')
  }

  const n = rows.length
  const time = new Float64Array(n)
  const channels: ParsedChannel[] = []

  for (const header of headers) {
    if (header === timeHeader) continue
    const { name, unit } = parseHeader(header)
    const data = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const raw = rows[i][header]
      const v = raw === undefined || raw === '' ? NaN : Number.parseFloat(raw)
      data[i] = Number.isFinite(v) ? v : NaN
    }
    channels.push({
      id: header,
      name,
      unit,
      role: resolveRoleForHeader(header),
      data,
    })
  }

  for (let i = 0; i < n; i++) {
    const v = Number.parseFloat(rows[i][timeHeader] ?? '')
    time[i] = Number.isFinite(v) ? v : NaN
  }

  // Drop leading/trailing fully-invalid time if any; keep indices aligned by not dropping mid-gaps
  let tMin = Infinity
  let tMax = -Infinity
  let validPairs = 0
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(time[i])) {
      tMin = Math.min(tMin, time[i])
      tMax = Math.max(tMax, time[i])
      validPairs++
    }
  }
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) {
    throw new Error('Time column has no valid numeric samples')
  }

  const durationSec = Math.max(0, tMax - tMin)
  const sampleRateHz = durationSec > 0 ? validPairs / durationSec : 0

  const log: ParsedLog = {
    meta: {
      filename,
      rowCount: n,
      durationSec,
      sampleRateHz,
      tMin,
      tMax,
    },
    time,
    channels,
    headers,
    rawRows: rows,
  }

  addDerivedChannels(log)
  return log
}
