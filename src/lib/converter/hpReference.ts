import Papa from 'papaparse'
import { normalizeValue } from './valueUtils'

export interface HpReference {
  headerLines: string[]
  labels: string[]
}

function formatHpDate(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()
  const hours24 = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const amPm = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  return `${month}/${day}/${year} ${hours12}:${minutes}:${seconds} ${amPm}`
}

export function parseReferenceTemplate(content: string): HpReference {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const channelDataIndex = lines.findIndex((line) => line.trim() === '[Channel Data]')
  if (channelDataIndex === -1) {
    throw new Error('Reference file does not contain a [Channel Data] section')
  }

  const labelsLine = lines.find(
    (line, index) => index < channelDataIndex && line.startsWith('Offset,'),
  )
  if (!labelsLine) {
    throw new Error('Reference file does not contain the expected label row')
  }

  const headerLines = lines.slice(0, channelDataIndex + 1)
  const creationTimeIndex = headerLines.findIndex((line) => line.startsWith('Creation Time:'))
  if (creationTimeIndex !== -1) {
    headerLines[creationTimeIndex] = `Creation Time: ${formatHpDate(new Date())}`
  }

  const labels =
    Papa.parse<string[]>(labelsLine, {
      header: false,
      skipEmptyLines: true,
    }).data[0] ?? []

  return { headerLines, labels }
}

export function buildHpCsvContent(
  reference: HpReference,
  outputRows: (string | number | undefined)[][],
): string {
  const normalized = outputRows.map((row) => row.map(normalizeValue))
  const body = Papa.unparse(normalized, { newline: '\n' })
  return `${reference.headerLines.join('\n')}\n${body.trimEnd()}\n`
}

export async function loadBundledReference(baseUrl = import.meta.env.BASE_URL): Promise<HpReference> {
  const url = `${baseUrl}HPFormat.csv`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load HPTuners reference template (${res.status})`)
  }
  return parseReferenceTemplate(await res.text())
}
