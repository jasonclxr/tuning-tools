import { useMemo, useState } from 'react'
import { groupChannels } from '../../lib/channelGroups'
import { unusedSeriesColor } from '../../lib/channels'
import { channelLabel } from '../../lib/presets'
import type { ChartPane, ParsedLog } from '../../lib/types'

interface Props {
  log: ParsedLog
  panes: ChartPane[]
  activePaneId: string
  onActivePaneId: (id: string) => void
  onChange: (panes: ChartPane[]) => void
}

export function ChannelPicker({
  log,
  panes,
  activePaneId,
  onActivePaneId,
  onChange,
}: Props) {
  const [query, setQuery] = useState('')
  const active = useMemo(() => {
    const map = new Map<string, { color: string; paneId: string }>()
    for (const pane of panes) {
      for (const s of pane.series) {
        map.set(s.channelId, { color: s.color, paneId: pane.id })
      }
    }
    return map
  }, [panes])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = log.channels.filter((c) => {
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.unit?.toLowerCase().includes(q) ?? false)
      )
    })
    return groupChannels(matches)
  }, [log.channels, query])

  function ensureActivePane(nextPanes: ChartPane[]): string {
    if (nextPanes.some((p) => p.id === activePaneId)) return activePaneId
    return nextPanes[0]?.id ?? 'pane-1'
  }

  function toggle(channelId: string) {
    const existing = active.get(channelId)
    if (existing) {
      const next = panes
        .map((p) => ({
          ...p,
          series: p.series.filter((s) => s.channelId !== channelId),
        }))
        .filter((p) => p.series.length > 0)
      const normalized = next.length > 0 ? next : [{ id: 'pane-1', series: [] }]
      onChange(normalized)
      onActivePaneId(ensureActivePane(normalized))
      return
    }

    const used = panes.flatMap((p) => p.series.map((s) => s.color))
    const color = unusedSeriesColor(used)
    let next: ChartPane[]
    if (panes.length === 0) {
      next = [{ id: 'pane-1', series: [{ channelId, color, visible: true }] }]
      onActivePaneId('pane-1')
    } else {
      const targetId = panes.some((p) => p.id === activePaneId) ? activePaneId : panes[0].id
      next = panes.map((p) =>
        p.id === targetId
          ? { ...p, series: [...p.series, { channelId, color, visible: true }] }
          : p,
      )
      onActivePaneId(targetId)
    }
    onChange(next)
  }

  function addPane() {
    const id = `pane-${Date.now()}`
    onChange([...panes, { id, series: [] }])
    onActivePaneId(id)
  }

  const paneOptions = panes.length > 0 ? panes : [{ id: 'pane-1', series: [] }]

  return (
    <div className="channel-picker">
      <div className="panel-header">Channels</div>
      <div className="pane-target">
        <label>
          Overlay onto
          <select
            value={paneOptions.some((p) => p.id === activePaneId) ? activePaneId : paneOptions[0].id}
            onChange={(e) => onActivePaneId(e.target.value)}
          >
            {paneOptions.map((p, i) => (
              <option key={p.id} value={p.id}>
                Chart {i + 1}
                {p.series.length ? ` (${p.series.length})` : ' (empty)'}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost" onClick={addPane}>
          + Chart
        </button>
      </div>
      <p className="pane-hint">Same units share a Y-scale; different units get independent scales.</p>
      <input
        className="search"
        placeholder="Search channels…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="channel-list">
        {groups.map((group) => (
          <div key={group.id} className="channel-group">
            <div className="channel-group-label">{group.label}</div>
            {group.channels.map((ch) => {
              const state = active.get(ch.id)
              return (
                <div key={ch.id} className={`channel-row ${state ? 'active' : ''}`}>
                  <label className="channel-check">
                    <input
                      type="checkbox"
                      checked={Boolean(state)}
                      onChange={() => toggle(ch.id)}
                    />
                    {state && (
                      <span className="channel-swatch" style={{ background: state.color }} />
                    )}
                    <span className="channel-name" title={ch.id}>
                      {channelLabel(ch)}
                    </span>
                  </label>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
