import { useState } from 'react'

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
export default function Sidebar({ files, activeFile, onOpenNote, onCreateNote, onDeleteNote }) {
  const [showModal, setShowModal] = useState(false)
  const [hoveredPath, setHoveredPath] = useState(null)

  const handleCreate = (title) => {
    onCreateNote(title)
    setShowModal(false)
  }

  return (
    <>
      <aside className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <span className="sidebar-title">// VAULT</span>
          <div className="sidebar-actions">
            <button
              id="btn-new-note"
              className="btn btn-icon btn-lime"
              title="New Note"
              onClick={() => setShowModal(true)}
            >
              <IconPlus />
            </button>
          </div>
        </div>

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
                onClick={() => onOpenNote(file)}
                onMouseEnter={() => setHoveredPath(file.path)}
                onMouseLeave={() => setHoveredPath(null)}
                title={file.path}
              >
                {file.is_dir ? <IconFolder /> : <IconFile />}
                <span className="truncate" style={{ flex: 1 }}>{file.name}</span>
                {!file.is_dir && hoveredPath === file.path && (
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: '2px 4px', boxShadow: 'none' }}
                    title="Delete note"
                    onClick={e => { e.stopPropagation(); onDeleteNote(file) }}
                  >
                    <IconTrash />
                  </button>
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
