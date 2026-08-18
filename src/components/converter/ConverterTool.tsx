import { useState } from 'react'
import { convertVersaToHp, type ConversionReport } from '../../lib/converter/convert'
import { downloadText } from '../../lib/exportCsv'
import { logSourceLabel } from '../../lib/logFormat'
import { parseVersaCsvFile } from '../../lib/parseVersaCsv'
import { DropZone } from '../DropZone'

export function ConverterTool() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ConversionReport | null>(null)
  const [filename, setFilename] = useState<string | null>(null)

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    setReport(null)
    setFilename(file.name)
    try {
      const log = await parseVersaCsvFile(file)
      const result = await convertVersaToHp(log.rawRows, log.headers, file.name)
      downloadText(result.filename, result.csv)
      setReport(result.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="converter">
      <div className="converter-intro">
        <h2>VersaTuner / MazdaEdit → HPTuners</h2>
        <p>
          Converts a VersaTuner or MazdaEdit CSV into an HPTuners / VCM Scanner–style CSV using the
          same channel mappings and unit conversions as the <code>tuning-tools</code> /{' '}
          <code>versa-tools</code> converter. Runs entirely in your browser.
        </p>
      </div>

      <DropZone onFile={onFile} busy={busy}>
        <strong>{busy ? 'Converting…' : 'Drop VersaTuner or MazdaEdit CSV to convert'}</strong>
        <span>HPTuners-compatible CSV downloads automatically</span>
      </DropZone>

      {error && <div className="error-banner">{error}</div>}

      {report && (
        <div className="mapping-report">
          <h3>Mapping report{filename ? ` — ${filename}` : ''}</h3>
          <div className="meta-grid compact">
            <span>Source</span>
            <strong>{logSourceLabel(report.source)}</strong>
            <span>Rows</span>
            <strong>{report.rowCount.toLocaleString()}</strong>
            <span>Baro</span>
            <strong>{report.barometricPressureKpa.toFixed(3)} kPa</strong>
            <span>Mapped</span>
            <strong>{report.mappedColumns.length}</strong>
            <span>Missing logical</span>
            <strong>{report.missingLogical.length}</strong>
            <span>Unmapped source</span>
            <strong>{report.unmappedSourceHeaders.length}</strong>
          </div>

          <div className="report-columns">
            <div>
              <h4>Mapped columns</h4>
              <ul>
                {report.mappedColumns.map((m) => (
                  <li key={m.logical}>
                    <code>{m.logical}</code> ← {m.header}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Missing logical roles</h4>
              {report.missingLogical.length === 0 ? (
                <p className="muted">None</p>
              ) : (
                <ul>
                  {report.missingLogical.map((m) => (
                    <li key={m}>
                      <code>{m}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4>Unmapped source headers</h4>
              {report.unmappedSourceHeaders.length === 0 ? (
                <p className="muted">None</p>
              ) : (
                <ul>
                  {report.unmappedSourceHeaders.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
