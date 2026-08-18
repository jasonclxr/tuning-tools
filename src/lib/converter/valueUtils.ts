export function getSourceValue(
  row: Record<string, string>,
  sourceColumns: Partial<Record<string, string | undefined>>,
  logicalName: string,
): string | undefined {
  const header = sourceColumns[logicalName]
  if (!header) return undefined
  const value = row[header]
  return value === undefined ? undefined : String(value).trim()
}

export function readNumber(row: Record<string, string>, columnName: string | undefined): number {
  if (!columnName) return NaN
  const value = Number.parseFloat(row[columnName])
  return Number.isFinite(value) ? value : NaN
}

export function convert(value: number, factor: number, operator: '*' | '/' = '*'): number {
  if (!Number.isFinite(value)) return NaN
  return operator === '/' ? value / factor : value * factor
}

export function normalizeValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    return value.toFixed(10).replace(/(?:\.0+|(\.\d+?)0+)$/, '$1')
  }
  return String(value).trim()
}
