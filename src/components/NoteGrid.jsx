import React from 'react'

const NoteGrid = ({ files, onOpenNote, onCreateNote }) => {
  // Filter for only markdown files for the grid
  const notes = files.filter(f => !f.is_dir)

  return (
    <div className="home-view">
      <div className="link-index-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>TACTICAL VAULT EXPLORER // {notes.length} NODES</span>
        <button 
          className="command-btn" 
          onClick={() => onCreateNote(`NEW_NOTE_${Date.now()}`)}
          style={{ padding: '6px 12px', fontSize: '10px' }}
        >
          + MANIFEST NEW NODE
        </button>
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
              className={`note-card ${note.name.startsWith('GEMINI_') ? 'gemini-source' : ''}`}
              onClick={() => onOpenNote(note)}
            >
              <div className="note-card-title">
                <span className="truncate">{note.name}</span>
                {note.name.startsWith('GEMINI_') && (
                   <span className="note-card-badge">GEMINI</span>
                )}
              </div>
              
              <div className="note-card-snippet">
                {/* Future: We could fetch snippets here, but for now we show name variation */}
                // INCOMING DATA STREAM: {note.name}...
                // SOURCE: LOCAL_VAULT
                // STATUS: SECURE
              </div>

              <div className="note-card-meta">
                <span>.MD</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default NoteGrid
