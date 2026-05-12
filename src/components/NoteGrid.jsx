import React from 'react'
import { invoke } from '@tauri-apps/api/core'
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
    { id: 'enchanted', label: 'VAULT SECTOR', icon: '🕋', status: 'ACTIVE', color: 'var(--accent)', path: 'C:\\Users\\freem\\CursorAntiG\\Sovereign_Nexus\\Dashboard', repo: 'https://github.com/Mrswami/Enchanted-Obsidian', portfolioId: 'ironclad-pipeline' },
    { id: 'chesspulse', label: 'CHESSUP PRO', icon: '♟️', status: 'ACTIVE', color: 'var(--teal)', path: 'C:\\Users\\freem\\CursorAntiG\\Sovereign_Nexus\\Projects\\ChessupPro', repo: 'https://github.com/Mrswami/chessup-pro-mobile', portfolioId: 'chesspulse' },
    { id: 'atxletsplay', label: 'ATX LETS PLAY', icon: '🎮', status: 'LIVE', color: 'var(--emerald)', path: 'C:\\Users\\freem\\CursorAntiG\\Sovereign_Nexus\\Projects\\atxLetsPlay', repo: 'https://github.com/Mrswami/atxLetsPlay', portfolioId: 'atxletsplay' },
    { id: 'pixelninja', label: 'PIXELNINJA', icon: '🥷', status: 'OFFLINE', color: 'var(--text-dim)', path: 'C:\\Users\\freem\\CursorAntiG\\Sovereign_Nexus\\Projects\\MediaMGMT', portfolioId: 'pixelninja' },
    { id: 'node-nod', label: 'NODE NOD', icon: '📡', status: 'SYNCING', color: 'var(--accent)', path: 'C:\\Users\\freem\\CursorAntiG\\Sovereign_Nexus\\Projects\\NodeNod', repo: 'https://github.com/Mrswami/nodeNod', portfolioId: 'node-nod' },
    { id: 'sentinel', label: 'SENTINEL QA', icon: '🛡️', status: 'STANDBY', color: 'var(--indigo)', path: 'C:\\Users\\freem\\CursorAntiG\\Sovereign_Nexus\\Dashboard\\tests', portfolioId: 'sentinel-qa' }
  ]

  const [visibilityStates, setVisibilityStates] = React.useState({})

  const handleWarp = async (e, path) => {
    e.stopPropagation()
    try {
      await invoke('open_project_workspace', { path })
    } catch (err) {
      console.error('Warp failed:', err)
    }
  }

  const handleToggleVisibility = async (e, portfolioId) => {
    e.stopPropagation()
    const currentState = visibilityStates[portfolioId] !== false // Default to true
    const newState = !currentState
    
    try {
      await invoke('update_portfolio_visibility', { projectId: portfolioId, visible: newState })
      setVisibilityStates(prev => ({ ...prev, [portfolioId]: newState }))
    } catch (err) {
      console.error('Visibility toggle failed:', err)
    }
  }

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
              <div className="sector-actions">
                {s.portfolioId && (
                  <button 
                    className={`warp-btn veil-btn ${visibilityStates[s.portfolioId] === false ? 'veiled' : ''}`} 
                    onClick={(e) => handleToggleVisibility(e, s.portfolioId)}
                    title={visibilityStates[s.portfolioId] === false ? "Project is VEILED (Hidden from Portfolio)" : "Project is VISIBLE on Portfolio"}
                  >
                    {visibilityStates[s.portfolioId] === false ? '👁️‍🗨️' : '👁️'}
                  </button>
                )}
                {s.repo && (
                  <button 
                    className="warp-btn repo-btn" 
                    onClick={(e) => { e.stopPropagation(); window.open(s.repo, '_blank'); }}
                    title="Open GitHub Repository"
                  >
                    📦
                  </button>
                )}
                <button 
                  className="warp-btn" 
                  onClick={(e) => handleWarp(e, s.path)}
                  title="Warp to Antigravity Workspace"
                >
                  🚀
                </button>
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

