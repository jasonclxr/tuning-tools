import { useState } from 'react'
import { DropZone } from './components/DropZone'
import { ConverterTool } from './components/converter/ConverterTool'
import { SettingsPage } from './components/settings/SettingsPage'
import { LogViewer } from './components/viewer/LogViewer'
import { parseVersaCsvFile, parseVersaCsvText } from './lib/parseVersaCsv'
import type { ParsedLog } from './lib/types'

type Tab = 'viewer' | 'converter' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('viewer')
  const [log, setLog] = useState<ParsedLog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const parsed = await parseVersaCsvFile(file)
      setLog(parsed)
      setTab('viewer')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function loadSample(path: string, name: string) {
    setBusy(true)
    setError(null)
    try {
      const url = `${import.meta.env.BASE_URL}${path}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to load sample (${res.status})`)
      const text = await res.text()
      setLog(parseVersaCsvText(text, name))
      setTab('viewer')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">VT</span>
          <div>
            <div className="brand-name">Versa Log Viewer</div>
            <div className="brand-sub">Local-first datalog toolkit</div>
          </div>
        </div>
        <nav className="tabs">
          <button
            type="button"
            className={tab === 'viewer' ? 'active' : ''}
            onClick={() => setTab('viewer')}
          >
            Log Viewer
          </button>
          <button
            type="button"
            className={tab === 'converter' ? 'active' : ''}
            onClick={() => setTab('converter')}
          >
            HPTuners Converter
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'viewer' && (
          <>
            {!log ? (
              <div className="welcome">
                <DropZone onFile={loadFile} busy={busy}>
                  <strong>{busy ? 'Parsing…' : 'Open a VersaTuner or MazdaEdit CSV log'}</strong>
                  <span>Drag & drop or click — parsing stays in your browser</span>
                </DropZone>
                <div className="sample-links">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      loadSample('samples/sample-versa-log.csv', 'sample-versa-log.csv')
                    }
                  >
                    Load sample (AFR)
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      loadSample(
                        'samples/sample-versa-log-lambda.csv',
                        'sample-versa-log-lambda.csv',
                      )
                    }
                  >
                    Load sample (λ)
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      loadSample('samples/sample-mazdaedit-log.csv', 'sample-mazdaedit-log.csv')
                    }
                  >
                    Load sample (MazdaEdit)
                  </button>
                </div>
                {error && <div className="error-banner">{error}</div>}
              </div>
            ) : (
              <div className="viewer-shell">
                <div className="viewer-topbar">
                  <button type="button" className="ghost" onClick={() => setLog(null)}>
                    ← Open another log
                  </button>
                  <label className="file-button">
                    Replace log…
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void loadFile(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {error && <div className="error-banner">{error}</div>}
                <LogViewer log={log} />
              </div>
            )}
          </>
        )}

        {tab === 'converter' && <ConverterTool />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
