import { useState } from 'react'
import { DropZone } from './components/DropZone'
import { ConverterTool } from './components/converter/ConverterTool'
import { SettingsPage } from './components/settings/SettingsPage'
import { LogViewer, type ViewerPage } from './components/viewer/LogViewer'
import { logSourceLabel } from './lib/logFormat'
import { parseVersaCsvFile, parseVersaCsvText } from './lib/parseVersaCsv'
import type { ParsedLog } from './lib/types'

type AppTab = 'viewer' | 'converter' | 'settings'

export default function App() {
  const [tab, setTab] = useState<AppTab>('viewer')
  const [viewerPage, setViewerPage] = useState<ViewerPage>('charts')
  const [log, setLog] = useState<ParsedLog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const parsed = await parseVersaCsvFile(file)
      setLog(parsed)
      setViewerPage('charts')
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
      setViewerPage('charts')
      setTab('viewer')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function goViewer(page: ViewerPage) {
    setViewerPage(page)
    setTab('viewer')
  }

  function closeLog() {
    setLog(null)
    setError(null)
    setViewerPage('charts')
    setTab('viewer')
  }

  return (
    <div className="app">
      <header className={`app-header ${log ? 'has-log' : ''}`}>
        <div className="brand">
          <span className="brand-mark">VT</span>
          <div>
            <div className="brand-name">Versa Log Viewer</div>
            <div className="brand-sub">Local-first datalog toolkit</div>
          </div>
        </div>

        <nav className="header-nav" aria-label="Primary">
          {log ? (
            <div className="nav-group" role="tablist" aria-label="Log views">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'viewer' && viewerPage === 'charts'}
                className={tab === 'viewer' && viewerPage === 'charts' ? 'active' : ''}
                onClick={() => goViewer('charts')}
              >
                Charts
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'viewer' && viewerPage === 'map'}
                className={tab === 'viewer' && viewerPage === 'map' ? 'active' : ''}
                onClick={() => goViewer('map')}
              >
                Map table
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'viewer' && viewerPage === 'power'}
                className={tab === 'viewer' && viewerPage === 'power' ? 'active' : ''}
                onClick={() => goViewer('power')}
              >
                Power
              </button>
            </div>
          ) : (
            <div className="nav-group">
              <button
                type="button"
                className={tab === 'viewer' ? 'active' : ''}
                onClick={() => setTab('viewer')}
              >
                Log Viewer
              </button>
            </div>
          )}
          <div className="nav-group">
            <button
              type="button"
              className={tab === 'converter' ? 'active' : ''}
              onClick={() => setTab('converter')}
            >
              Converter
            </button>
            <button
              type="button"
              className={tab === 'settings' ? 'active' : ''}
              onClick={() => setTab('settings')}
            >
              Settings
            </button>
          </div>
        </nav>

        {log && (
          <div className="header-log">
            <div className="header-log-meta">
              <span className="header-log-name" title={log.meta.filename}>
                {log.meta.filename}
              </span>
              <span className="header-log-source">{logSourceLabel(log.meta.source)}</span>
            </div>
            <label className="file-button">
              Replace
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
            <button type="button" className="ghost" onClick={closeLog}>
              Close
            </button>
          </div>
        )}
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
                {error && <div className="error-banner">{error}</div>}
                <LogViewer log={log} page={viewerPage} onPageChange={goViewer} />
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
