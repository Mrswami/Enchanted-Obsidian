import React from 'react'

const NoteGrid = ({ files, onOpenNote, onCreateNote, refreshFiles }) => {
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

  return (
    <div className="home-view">
      <div className="link-index-header">
        <div className="header-intel">
          <span className="bracket">[</span>
          <span className="intel-text">TACTICAL VAULT RADAR // {notes.length} NODES</span>
          <span className="bracket">]</span>
        </div>
        
        <div className="header-actions">
           <button className="sync-btn" onClick={refreshFiles} title="Sync Intelligence Archive">
              <span className="sync-icon">☢️</span>
              <span className="btn-text">SYNC INTEL</span>
           </button>
           <button 
              className="manifest-btn" 
              onClick={() => onCreateNote(`NEW_NODE_${Date.now()}`)}
            >
              <span className="btn-glow"></span>
              <span className="btn-text">+ MANIFEST NEW NODE</span>
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
    </div>
  )
}

export default NoteGrid
