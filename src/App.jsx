import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Sidebar from './components/Sidebar'
import EditorView from './components/EditorView'
import ContextPanel from './components/ContextPanel'
import './index.css'
import './App.css'

function App() {
  const [notesDir, setNotesDir] = useState('')
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)   // { name, path }
  const [noteContent, setNoteContent] = useState('')
  const [linkIndex, setLinkIndex] = useState({})
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving'
  const saveTimer = useRef(null)

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
  const createNote = useCallback(async (title) => {
    try {
      const path = await invoke('create_note', { title })
      const newFile = { name: title, path, is_dir: false }
      await refreshFiles()
      await openNote(newFile)
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }, [refreshFiles, openNote])

  // ── Delete Active Note ────────────────────────────────────────────
  const deleteNote = useCallback(async (file) => {
    try {
      await invoke('delete_note', { path: file.path })
      if (activeFile?.path === file.path) {
        setActiveFile(null)
        setNoteContent('')
      }
      await refreshFiles()
      await refreshIndex()
    } catch (err) {
      console.error('Failed to delete note:', err)
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
        <span className="titlebar-logo">⬡ EnchantedObsidian</span>
        <span className="titlebar-sep">//</span>
        <span className="titlebar-path">{activeFile ? activeFile.path : notesDir}</span>
        <div className="titlebar-status">
          <span className="titlebar-path">
            {saveStatus === 'saving' ? 'saving...' : activeFile ? 'saved' : ''}
          </span>
          {activeFile && <div className={`status-dot ${saveStatus}`} />}
        </div>
      </header>

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
      />

      {/* Editor */}
      <EditorView
        activeFile={activeFile}
        content={noteContent}
        onChange={handleContentChange}
      />

      {/* Context Panel */}
      <ContextPanel
        linkIndex={linkIndex}
        activeFile={activeFile}
        onNavigate={navigateToLink}
      />
    </div>
  )
}

export default App
