import { useState, useEffect } from 'react'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconFile = () => (
  <svg className="file-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 2h6l3 3v9H4V2z" />
    <path d="M10 2v3h3" />
  </svg>
)

const IconFolder = () => (
  <svg className="file-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4h4l2 2h6v7H2V4z" />
  </svg>
)

const IconPlus = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v12M2 8h12" />
  </svg>
)

const IconTrash = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9" />
  </svg>
)

const IconEdit = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 2l3 3-9 9-3 1 1-3 9-9z" />
  </svg>
)

// ── New Note Modal ────────────────────────────────────────────────────────────
function NewNoteModal({ onConfirm, onCancel }) {
  const [title, setTitle] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (title.trim()) {
      onConfirm(title.trim())
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">// NEW NOTE</div>
        <form onSubmit={handleSubmit}>
          <input
            className="modal-input"
            autoFocus
            placeholder="Note title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onCancel()}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn" disabled={!title.trim()}>Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ files, activeFile, currentSubPath, onOpenNote, onCreateNote, onDeleteNote, onRenameNote, onNavigateFolder, onOpenScanner }) {
  const [showModal, setShowModal] = useState(false)
  const [hoveredPath, setHoveredPath] = useState(null)
  const [editingPath, setEditingPath] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [confirmDeletePath, setConfirmDeletePath] = useState(null)

  const handleCreate = (title) => {
    onCreateNote(title)
    setShowModal(false)
  }

  const startRename = (file) => {
    setEditingPath(file.path)
    setEditingTitle(file.name)
  }

  const handleRenameSubmit = (file) => {
    if (editingTitle.trim() && editingTitle.trim() !== file.name) {
      onRenameNote(file, editingTitle.trim())
    }
    setEditingPath(null)
  }

  const handleFolderClick = (file) => {
    // Relative path to notes directory
    const parts = file.path.split(/[\\/]/)
    const folderName = parts[parts.length - 1]
    const nextSub = currentSubPath ? `${currentSubPath}/${folderName}` : folderName
    onNavigateFolder(nextSub)
  }

  const goBack = () => {
    if (!currentSubPath) return
    const parts = currentSubPath.split('/')
    parts.pop()
    onNavigateFolder(parts.length > 0 ? parts.join('/') : null)
  }

  // Handle Global Key Events (F2)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' && activeFile && !editingPath) {
        startRename(activeFile)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFile, editingPath])

  return (
    <>
      <aside className="sidebar">
        {/* Header */}
        <div className="sidebar-header-zen">
          <div className="command-strip-zen">
            <button
               className="command-btn command-btn-lime"
               title="Scan Image"
               onClick={onOpenScanner}
            >
              [ SCAN ]
            </button>
            <button
              id="btn-new-note"
              className="command-btn"
              title="New Note"
              onClick={() => setShowModal(true)}
            >
              <IconPlus />
            </button>
          </div>
        </div>

        {/* Back Button */}
        {currentSubPath && (
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" onClick={goBack} style={{ fontSize: '9px', width: '100%', justifyContent: 'flex-start' }}>
              [ BACK ]
            </button>
          </div>
        )}

        {/* File Tree */}
        <div className="file-tree">
          {files.length === 0 ? (
            <div className="sidebar-empty">
              No notes found.<br />
              Create your first note to begin.
            </div>
          ) : (
            files.map(file => (
              <div
                key={file.path}
                id={`file-${file.name.replace(/\s+/g, '-')}`}
                className={[
                  'file-item',
                  activeFile?.path === file.path ? 'active' : '',
                  file.is_dir ? 'is-dir' : '',
                ].join(' ')}
                onClick={() => file.is_dir ? handleFolderClick(file) : onOpenNote(file)}
                onDoubleClick={() => !file.is_dir && startRename(file)}
                onMouseEnter={() => setHoveredPath(file.path)}
                onMouseLeave={() => { setHoveredPath(null); setConfirmDeletePath(null); }}
                title={file.path}
              >
                {file.is_dir ? <IconFolder /> : <IconFile />}
                
                {editingPath === file.path ? (
                  <input
                    className="modal-input"
                    style={{ padding: '2px 4px', fontSize: '11px', height: '22px' }}
                    autoFocus
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => handleRenameSubmit(file)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit(file)
                      if (e.key === 'Escape') setEditingPath(null)
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate" style={{ flex: 1 }}>{file.name}</span>
                )}

                {hoveredPath === file.path && !file.is_dir && editingPath !== file.path && (
                  <div className="file-item-actions" style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ padding: '2px 4px', boxShadow: 'none' }}
                      title="Rename note"
                      onClick={e => { e.stopPropagation(); startRename(file) }}
                    >
                      <IconEdit />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ 
                        padding: '2px 4px', 
                        boxShadow: 'none', 
                        color: confirmDeletePath === file.path ? '#FF3030' : 'inherit' 
                      }}
                      title={confirmDeletePath === file.path ? "Click again to confirm" : "Delete note"}
                      onClick={e => { 
                        e.stopPropagation(); 
                        if (confirmDeletePath === file.path) {
                          onDeleteNote(file);
                        } else {
                          setConfirmDeletePath(file.path);
                        }
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {showModal && (
        <NewNoteModal
          onConfirm={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  )
}
