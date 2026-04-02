import { useState, useMemo } from 'react'

// ── LinkIndex Tab ─────────────────────────────────────────────────────────────
function LinkIndexTab({ linkIndex, activeFile, onNavigate }) {
  const entries = useMemo(() => Object.values(linkIndex), [linkIndex])
  const totalLinks = useMemo(
    () => entries.reduce((sum, e) => sum + e.links.length, 0),
    [entries]
  )

  if (entries.length === 0) {
    return (
      <div>
        <div className="link-index-header">// WIKILINK INDEX</div>
        <div className="link-index-empty">
          No notes indexed yet.<br />
          Create a note and add some<br />
          <span style={{ color: '#00FF41' }}>[[Wikilinks]]</span> to see the graph.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="link-index-header">
        // WIKILINK INDEX &nbsp;
        <span className="link-index-count">
          {entries.length} notes · {totalLinks} links
        </span>
      </div>

      {entries.map(note => (
        <div key={note.file_path} className="link-node-card">
          <div
            className="link-node-title"
            onClick={() => onNavigate(note.file_name)}
            title={note.file_path}
          >
            <span className="truncate">{note.file_name}</span>
            <span className="link-badge">{note.links.length}</span>
          </div>
          {note.links.length > 0 && (
            <div className="link-node-links">
              {note.links.map(link => (
                <span
                  key={link}
                  className="wikilink-tag"
                  title={`Navigate to [[${link}]]`}
                  onClick={() => onNavigate(link)}
                >
                  [[{link}]]
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Backlinks Tab ─────────────────────────────────────────────────────────────
function BacklinksTab({ linkIndex, activeFile, onNavigate }) {
  if (!activeFile) {
    return (
      <div className="link-index-empty">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          Open a note to see its backlinks.
        </span>
      </div>
    )
  }

  const backlinks = useMemo(() => {
    return Object.values(linkIndex).filter(note =>
      note.file_name !== activeFile.name &&
      note.links.some(l => l.toLowerCase() === activeFile.name.toLowerCase())
    )
  }, [linkIndex, activeFile])

  return (
    <div>
      <div className="link-index-header">
        // BACKLINKS TO &nbsp;
        <span className="link-index-count">{activeFile.name}</span>
      </div>
      {backlinks.length === 0 ? (
        <div className="link-index-empty">
          No notes link to <span style={{ color: '#00FF41' }}>[[{activeFile.name}]]</span> yet.
        </div>
      ) : (
        backlinks.map(note => (
          <div key={note.file_path} className="link-node-card">
            <div
              className="link-node-title"
              onClick={() => onNavigate(note.file_name)}
            >
              <span className="truncate">{note.file_name}</span>
              <span className="link-badge">→ source</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Context Panel ─────────────────────────────────────────────────────────────
export default function ContextPanel({ linkIndex, activeFile, onNavigate }) {
  const [activeTab, setActiveTab] = useState('index')

  const tabs = [
    { id: 'index', label: 'Index' },
    { id: 'backlinks', label: 'Links' },
  ]

  return (
    <aside className="context-panel">
      <div className="context-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`context-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="context-body">
        {activeTab === 'index' && (
          <LinkIndexTab
            linkIndex={linkIndex}
            activeFile={activeFile}
            onNavigate={onNavigate}
          />
        )}
        {activeTab === 'backlinks' && (
          <BacklinksTab
            linkIndex={linkIndex}
            activeFile={activeFile}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </aside>
  )
}
