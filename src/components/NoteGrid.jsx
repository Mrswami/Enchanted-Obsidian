import React from 'react'
import ChessPulseDashboard from './ChessPulseDashboard'
import MissionControlDashboard from './MissionControlDashboard'

const NoteGrid = ({ files, activeSector, setActiveSector, manifest, onOpenNote, onCreateNote, refreshFiles }) => {
  // Sort notes by the Triage Score (Tactical Radar Logic)
  const notes = files
    .filter(f => !f.is_dir)
    .sort((a, b) => (b.triage_score || 0) - (a.triage_score || 0))

  const timeAgo = (timestamp) => {
    if (!timestamp) return ''
    const seconds = Math.floor(Date.now() / 1000 - timestamp)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Define static project sectors for quick navigation/status
  const sectors = [
    { id: 'enchanted', label: 'VAULT SECTOR', icon: '🕋', status: 'ACTIVE', color: 'var(--accent)' },
    { id: 'missioncontrol', label: 'MISSION CTRL', icon: '🚀', status: 'ACTIVE', color: 'var(--teal)' },
    { id: 'chesspulse', label: 'CHESSPULSE', icon: '♟️', status: 'INGESTING', color: 'var(--teal)' },
    { id: 'pixelninja', label: 'PIXELNINJA', icon: '🥷', status: 'OFFLINE', color: 'var(--text-muted)' },
    { id: 'gaming', label: 'LORE FORGE', icon: '🏰', status: 'SYNCING', color: 'var(--lime)' }
  ]

  // SIM Logic: Detect failures
  const failedIngestions = Object.values(manifest || {}).filter(v => v.status === 'FAILED')
  const failedCount = failedIngestions.length

  return (
    <div className="home-view">
      {/* ── Sovereign Command Header ── */}
      <div className="command-header-sector">
        <div className="sector-grid">
          <div 
            className={`sector-card ${activeSector === 'ALL' ? 'active' : ''}`} 
            onClick={() => setActiveSector('ALL')}
            style={{ '--accent-color': 'var(--text-main)' }}
          >
            <div className="sector-icon">🌌</div>
            <div className="sector-info">
              <div className="sector-label">ALL SECTORS</div>
              <div className="sector-status">DECENTRALIZED</div>
            </div>
          </div>
          {sectors.map(s => (
            <div 
              key={s.id} 
              className={`sector-card ${activeSector === s.id ? 'active' : ''}`}
              onClick={() => setActiveSector(s.id)}
              style={{ '--accent-color': s.color }}
            >
              <div className="sector-icon">{s.icon}</div>
              <div className="sector-info">
                <div className="sector-label">{s.label}</div>
                <div className="sector-status">{s.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeSector === 'missioncontrol' ? (
        <MissionControlDashboard />
      ) : activeSector === 'chesspulse' ? (
        <ChessPulseDashboard />
      ) : (
        <>
          {failedCount > 0 && (
            <div className="sim-alert">
              <div className="alert-content">
                <span className="alert-icon">⚠️</span>
                <div className="alert-text">
                  <span className="alert-title">INTEL FALLOUT DETECTED // {failedCount} NODES LOST</span>
                </div>
              </div>
            </div>
          )}

          <div className="link-index-header">
            <div className="header-intel">
              <span className="bracket">[</span>
              <span className="intel-text">PROVIDENCE RADAR // {notes.length} SECURED NODES</span>
              <span className="bracket">]</span>
            </div>
            
            <div className="header-actions">
              <button className="sync-btn" onClick={refreshFiles} title="Sync Intelligence Archive">
                  <span className="sync-icon">☢️</span>
                  <span className="btn-text mobile-hide">SYNC INTEL</span>
              </button>
              <button 
                  className="manifest-btn" 
                  onClick={() => onCreateNote(`NEW_NODE_${Date.now()}`)}
                >
                  <span className="btn-glow"></span>
                  <span className="btn-text">+ MANIFEST NODE</span>
                </button>
            </div>
          </div>

          <div className="note-grid">
            {notes.length === 0 ? (
              <div className="sidebar-empty" style={{ gridColumn: '1 / -1', padding: '100px' }}>
                // NO NODES DETECTED IN LOCAL SECTOR. <br/>
                INITIATE MANIFESTATION PROTOCOL.
              </div>
            ) : (
              notes.map((note) => (
                <div 
                  key={note.path} 
                  className="note-card"
                  onClick={() => onOpenNote(note)}
                >
                  <div className="note-card-header">
                    <div className="note-card-title">
                      {note.title || note.name.replace(/_/g, ' ')}
                    </div>
                    {note.todo_count > 0 && (
                      <div className="todo-badge">
                          <span className="todo-icon">!</span>
                          <span className="todo-count">{note.todo_count} TASKS</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="note-card-body">
                    <div className="note-card-preview">
                        {note.preview || 'No Intel preview available.'}
                    </div>
                  </div>

                  <div className="note-card-footer">
                    <span className="file-type">.MD</span>
                    <span className="timestamp">{timeAgo(note.modified_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NoteGrid

