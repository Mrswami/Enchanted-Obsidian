import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Sidebar from './components/Sidebar'
import EditorView from './components/EditorView'
import ContextPanel from './components/ContextPanel'
import Scanner from './components/Scanner'
import NoteGrid from './components/NoteGrid'
import './index.css'
import './App.css'

function App() {
  const [notesDir, setNotesDir] = useState('')
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)   // { name, path }
  const [noteContent, setNoteContent] = useState('')
  const [linkIndex, setLinkIndex] = useState({})
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving'
  const [showScanner, setShowScanner] = useState(false)
  const [view, setView] = useState('grid') // 'grid' | 'editor'
  const saveTimer = useRef(null)

  const handleGoHome = useCallback(() => {
    setActiveFile(null)
    setNoteContent('')
    setView('grid')
  }, [])

  // ── Bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const dir = await invoke('get_notes_dir')
        setNotesDir(dir)
        await refreshFiles()
        await refreshIndex()
      } catch (err) {
        console.error('Init error:', err)
      }
    }
    init()
  }, [])

  // ── File Watcher Listener ─────────────────────────────────────────
  useEffect(() => {
    const unlisten = listen('file-changed', () => {
      refreshFiles()
      refreshIndex()
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  // ── Refresh Helpers ───────────────────────────────────────────────
  const [currentSubPath, setCurrentSubPath] = useState(null)

  const refreshFiles = useCallback(async (subPath = currentSubPath) => {
    try {
      const entries = await invoke('read_notes_directory', { subPath })
      setFiles(entries)
    } catch (err) {
      console.error('Failed to read directory:', err)
    }
  }, [currentSubPath])

  useEffect(() => {
    refreshFiles(currentSubPath)
  }, [currentSubPath, refreshFiles])

  const refreshIndex = useCallback(async () => {
    try {
      const idx = await invoke('get_full_link_index')
      setLinkIndex(idx)
    } catch (err) {
      console.error('Failed to build link index:', err)
    }
  }, [])

  // ── Open a Note ───────────────────────────────────────────────────
  const openNote = useCallback(async (file) => {
    if (file.is_dir) return
    try {
      const content = await invoke('read_note', { path: file.path })
      setActiveFile(file)
      setNoteContent(content)
      setSaveStatus('saved')
      setView('editor')
    } catch (err) {
      console.error('Failed to open note:', err)
    }
  }, [])

  // ── Auto-Save (debounced 1.5s) ────────────────────────────────────
  const handleContentChange = useCallback((value) => {
    setNoteContent(value)
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!activeFile) return
      try {
        await invoke('save_note', { path: activeFile.path, content: value })
        setSaveStatus('saved')
        refreshIndex()
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, 1500)
  }, [activeFile, refreshIndex])

  // ── Create New Note ───────────────────────────────────────────────
  const createNote = useCallback(async (title, initialContent = null) => {
    try {
      const path = await invoke('create_note', { 
        title, 
        content: initialContent 
      })
      await refreshFiles()
      const newFile = { name: title, path, is_dir: false }
      openNote(newFile)
      return path
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }, [refreshFiles, openNote])

  // ── Delete Active Note (Sovereign Trash Protocol) ─────────────────
  const deleteNote = useCallback(async (file) => {
    try {
      await invoke('move_to_trash', { path: file.path })
      if (activeFile?.path === file.path) {
        setActiveFile(null)
        setNoteContent('')
        setView('grid')
      }
      await refreshFiles()
      await refreshIndex()
    } catch (err) {
      console.error('Failed to move note to trash:', err)
    }
  }, [activeFile, refreshFiles, refreshIndex])

  // ── Rename Note ──────────────────────────────────────────────────
  const renameNote = useCallback(async (file, newName) => {
    try {
      const newPath = await invoke('rename_note', { path: file.path, newName })
      if (activeFile?.path === file.path) {
        setActiveFile({ ...file, name: newName, path: newPath })
      }
      await refreshFiles()
      await refreshIndex()
    } catch (err) {
      console.error('Failed to rename note:', err)
    }
  }, [activeFile, refreshFiles, refreshIndex])

  // ── Split Note (Cellular Division) ────────────────────────────────
  const splitNote = useCallback(async (newTitle, originalContent, newContent) => {
    if (!activeFile) return
    try {
      setSaveStatus('saving')
      const newPath = await invoke('split_note', {
        path: activeFile.path,
        originalContent,
        newTitle,
        newContent
      })
      await refreshFiles()
      await refreshIndex()
      setSaveStatus('saved')
      
      // Open the new child note instantly
      const newFile = { name: newTitle, path: newPath, is_dir: false }
      openNote(newFile)
    } catch (err) {
      console.error('Failed to split note:', err)
    }
  }, [activeFile, refreshFiles, refreshIndex, openNote])

  // ── Merge Notes (Absorption Protocol) ──────────────────────────
  const mergeNote = useCallback(async (sourceFile) => {
    if (!activeFile) return
    try {
      setSaveStatus('saving')
      await invoke('merge_notes', {
        targetPath: activeFile.path,
        sourcePath: sourceFile.path
      })
      
      // Reload current note with new content
      const updatedContent = await invoke('read_note', { path: activeFile.path })
      setNoteContent(updatedContent)
      
      await refreshFiles()
      await refreshIndex()
      setSaveStatus('saved')
    } catch (err) {
      console.error('Failed to merge notes:', err)
    }
  }, [activeFile, refreshFiles, refreshIndex])

  // ── AI Command Handler ───────────────────────────────────────────
  const handleAiQuery = useCallback(async (query, temporalContext = '') => {
    // Collect context (current note content + link graph + historical context)
    const context = `
      Temporal Discussion History:
      ${temporalContext}

      Active focal note: ${activeFile?.name || 'None'}
      Active focal content: ${noteContent.substring(0, 500)}
      Link Index keys: ${Object.keys(linkIndex).join(', ')}
    `
    try {
      const response = await invoke('ask_ai', { query, context })
      
      // Execute actions returned by the AI
      for (const action of response.actions) {
        if (action.type === 'CreateNote') {
          await createNote(action.payload.title)
          // You might want to update the content too, but for now we just create
        } else if (action.type === 'SearchNotes') {
          // Future: trigger a search UI
        } else if (action.type === 'ReadNote') {
          const found = files.find(f => f.path === action.payload.path)
          if (found) await openNote(found)
        }
      }
      return response
    } catch (err) {
      console.error('AI Query failed:', err)
      throw err
    }
  }, [activeFile, noteContent, linkIndex, createNote, openNote, files])

  // ── Wikilink navigation ───────────────────────────────────────────
  const navigateToLink = useCallback((linkName) => {
    const found = files.find(
      f => !f.is_dir && f.name.toLowerCase() === linkName.toLowerCase()
    )
    if (found) openNote(found)
  }, [files, openNote])

  return (
    <div className="app-shell">
      {/* Title Bar */}
      <header className="titlebar">
        <div className="titlebar-logo" style={{ cursor: 'pointer' }} onClick={handleGoHome}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L2 5L8 15L14 5L8 1Z" fill="url(#prism-logo-gradient)" />
            <defs>
              <linearGradient id="prism-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--teal)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="logo-text-glam">ENCHANTED OBSIDIAN</span>
        </div>
        <div className="titlebar-path">
          {activeFile ? activeFile.path : 'VAULT SECTOR'}
        </div>
        <div className="titlebar-status">
          <span className="titlebar-path" style={{ fontSize: '9px', opacity: 0.5 }}>
            {saveStatus === 'saving' ? 'SYNCING...' : activeFile ? 'SECURE' : ''}
          </span>
          {activeFile && <div className={`status-dot ${saveStatus}`} />}
        </div>
      </header>

      <div className="app-main">
        {/* Sidebar */}
        <Sidebar
          files={files}
          activeFile={activeFile}
          currentSubPath={currentSubPath}
          onOpenNote={openNote}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
          onRenameNote={renameNote}
          onNavigateFolder={setCurrentSubPath}
          onOpenScanner={() => setShowScanner(true)}
        />

        {/* Main Interface Switching Logic */}
        {view === 'grid' ? (
          <NoteGrid
            files={files}
            onOpenNote={openNote}
            onCreateNote={createNote}
            refreshFiles={refreshFiles}
          />
        ) : (
          <EditorView
            activeFile={activeFile}
            content={noteContent}
            files={files}
            onChange={handleContentChange}
            onOpenScanner={() => setShowScanner(true)}
            onSplitNote={splitNote}
            onMergeNote={mergeNote}
          />
        )}

        {/* Context Panel */}
        <ContextPanel
          linkIndex={linkIndex}
          activeFile={activeFile}
          onNavigate={navigateToLink}
          onAiQuery={handleAiQuery}
        />
      </div>

      {showScanner && (
        <Scanner 
          onScanComplete={(ocrText) => {
            const title = `SCAN-${new Date().getTime()}.md`
            createNote(title, ocrText)
            setShowScanner(false)
          }}
          onCancel={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

export default App
