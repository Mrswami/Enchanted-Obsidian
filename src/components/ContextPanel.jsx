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
        <div className="link-index-header">OBSIDIAN INDEX</div>
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
        INDEXED &nbsp;
        <span className="link-index-count">
          {entries.length} notes · {totalLinks} connections
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
          
          {/* Active Links */}
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

          {/* Potential Connections (Unlinked Mentions) */}
          {note.mentions && note.mentions.length > 0 && (
            <div className="potential-links" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
              <div style={{ fontSize: '8px', color: 'var(--teal)', letterSpacing: '0.1em', marginBottom: '4px' }}>POTENTIAL CONNECTIONS</div>
              {note.mentions.map(ment => (
                <div key={ment} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="wikilink-tag"
                    style={{ opacity: 0.6, borderColor: 'var(--teal)', borderStyle: 'dashed' }}
                    onClick={() => onNavigate(ment)}
                  >
                    {ment}
                  </span>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>found in text</span>
                </div>
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
        LINKED TO &nbsp;
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

// ── Gemini AI Tab ─────────────────────────────────────────────────────────────
function AiTab({ activeFile, linkIndex, onAiQuery }) {
  const [query, setQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [prevResponse, setPrevResponse] = useState(null)
  const [history, setHistory] = useState([])

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!query.trim() || isTyping) return
    
    setIsTyping(true)
    const currentQuery = query
    setQuery('')
    
    // Build temporal context from history
    const temporalContext = history.map(h => `User: ${h.q}\nGemini: ${h.a}`).join('\n\n')

    try {
      const res = await onAiQuery(currentQuery, temporalContext)
      setPrevResponse(res)
      setHistory(prev => [...prev, { q: currentQuery, a: res.message }].slice(-5)) // Keep last 5 interactions
    } catch (err) {
      setPrevResponse({ message: `// ERROR: ${err}`, actions: [] })
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div>
      <div className="link-index-header">
        GEMINI INSIGHTS
      </div>
      
      <div className="ai-chat-history">
        {prevResponse ? (
          <div className="ai-message">
            <div className="ai-message-sender">⬡ GEMINI</div>
            <div className="ai-message-text">{prevResponse.message}</div>
            {prevResponse.actions.length > 0 && (
              <div className="ai-message-actions">
                {prevResponse.actions.map((a, i) => (
                  <div key={i} className="ai-action-tag">
                    // EXECUTED: {a.type}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="link-index-empty" style={{ padding: '20px' }}>
            System ready.<br />
            Ask Gemini to summarize, organize,<br />
            or create new notes for you.
          </div>
        )}
      </div>

      <form className="ai-input-wrap" onSubmit={handleAsk}>
        <input 
          className={`modal-input ${isTyping ? 'loading' : ''}`}
          placeholder={isTyping ? "Thinking..." : "Command Gemini..."}
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={isTyping}
          autoFocus
        />
        <div className="ai-input-hint">COMMANDS: /manifest, /save // V1.5 PRO</div>
      </form>
    </div>
  )
}

// ── Context Panel ─────────────────────────────────────────────────────────────
export default function ContextPanel({ linkIndex, activeFile, onNavigate, onAiQuery }) {
  const [activeTab, setActiveTab] = useState('index')

  const tabs = [
    { id: 'index', label: 'Index' },
    { id: 'backlinks', label: 'Links' },
    { id: 'ai', label: 'Gemini' },
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
        {activeTab === 'ai' && (
          <AiTab
            linkIndex={linkIndex}
            activeFile={activeFile}
            onAiQuery={onAiQuery}
          />
        )}
      </div>
    </aside>
  )
}
