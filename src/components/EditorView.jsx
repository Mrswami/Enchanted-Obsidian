import { useState, useEffect, useRef, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView as CodeMirrorView } from '@codemirror/view'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconFlash = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 1L2 9h6l-1 6 7-8h-6l1-7z" />
  </svg>
)

// ── Custom cyber-noir CodeMirror theme ────────────────────────────────────────
const cyberNoir = CodeMirrorView.theme({
  '&': {
    color: '#E8E8E8',
    backgroundColor: 'transparent',
    fontSize: '16px',
    lineHeight: '1.75',
    fontFamily: "var(--font-sans)",
  },
  '.cm-content': {
    caretColor: 'var(--teal)',
    padding: '40px 0', 
  },
  '.cm-cursor': { 
    borderLeftColor: 'var(--teal)', 
    borderLeftWidth: '3px',
    animation: 'cm-blink 0.6s infinite' /* Faster, aggressive industrial blink */
  },
  '@keyframes cm-blink': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0 }
  },
  '.cm-selectionBackground, ::selection': { backgroundColor: '#1A2A1A !important' },
  '.cm-focused .cm-selectionBackground': { backgroundColor: '#1A2A1A' },
  '.cm-activeLine': {
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    borderLeft: '4px solid var(--accent)',
    paddingLeft: '12px',
    marginLeft: '-4px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-gutter': { backgroundColor: '#000000', borderRight: '1px solid #202020' },
  '.cm-gutterElement': { color: '#333333', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-line': { padding: '0 0 0 0' },

  // ── Hierarchy ──
  '.cm-header-1': { fontSize: '1.8em', fontWeight: '700', color: '#fff', display: 'block' },
  '.cm-header-2': { fontSize: '1.4em', fontWeight: '600', color: '#ccc', display: 'block' },
  '.cm-header-3': { fontSize: '1.2em', fontWeight: '500', color: '#999', display: 'block' },
  
  '.cm-strong': { color: '#FFFFFF', fontWeight: '600' },
  '.cm-em': { color: '#C0C0C0', fontStyle: 'italic' },
  '.cm-link': { color: '#BF5700' },
  '.cm-url': { color: '#5A5A5A', textDecoration: 'none' },
  '.cm-quote': { color: '#4A4A4A', borderLeft: '3px solid #303030', paddingLeft: '8px' },
  '.cm-monospace': { 
    color: '#00FF41', 
    fontFamily: "var(--font-mono)", 
    fontSize: '0.85em', 
    backgroundColor: 'rgba(0,255,65,0.05)',
    padding: '2px 4px',
    borderRadius: '3px'
  },
  '.cm-meta': { color: '#404040' },
}, { dark: true })

// ── Wikilink highlight extension ──────────────────────────────────────────────
import { Decoration, MatchDecorator, ViewPlugin, WidgetType } from '@codemirror/view'

class WikilinkWidget extends WidgetType {
  constructor(text) { super(); this.text = text }
  toDOM() {
    const el = document.createElement('span')
    el.className = 'cm-wikilink'
    el.textContent = `[[${this.text}]]`
    el.style.cssText = `
      color: var(--teal);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88em;
      background: rgba(34, 211, 238, 0.06);
      border: 1px solid rgba(34, 211, 238, 0.25);
      padding: 0 3px;
      border-radius: 2px;
      cursor: pointer;
      text-shadow: 0 0 5px var(--teal-glow);
    `
    return el
  }
}

const wikilinkDecorator = new MatchDecorator({
  regexp: /\[\[([^\[\]]+)\]\]/g,
  decoration: (match) =>
    Decoration.replace({ widget: new WikilinkWidget(match[1]) }),
})

const wikilinkPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) { this.decorations = wikilinkDecorator.createDeco(view) }
    update(update) {
      if (update.docChanged || update.viewportChanged)
        this.decorations = wikilinkDecorator.updateDeco(update, this.decorations)
    }
  },
  { decorations: v => v.decorations }
)

// ── EditorView Component ──────────────────────────────────────────────────────
export default function EditorView({ activeFile, content, onChange, onOpenScanner }) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)

  const handleUpdate = (update) => {
    if (update.docChanged) {
      const doc = update.state.doc.toString();
      const cursor = update.state.selection.main.head;
      const textBefore = doc.slice(0, cursor);
      
      if (textBefore.endsWith('/')) {
        setShowSlashMenu(true);
      } else {
        setShowSlashMenu(false);
      }
    }
  }

  // ── Adaptive Prose Purification ──────────────────────────────────
  const cleanContent = useMemo(() => {
    if (!content || !activeFile) return ''
    const lines = content.split('\n')
    if (lines[0].startsWith('# ') && lines[0].toLowerCase().includes(activeFile.name.toLowerCase())) {
       return lines.slice(1).join('\n').trimStart()
    }
    return content
  }, [content, activeFile])

  const slashOptions = [
    { label: 'SCAN: Image to Note', action: onOpenScanner, icon: <IconFlash /> },
    { label: 'LINK: Build Connection', action: () => {}, icon: '⬡' },
    { label: 'NEW: Atomic Note', action: () => {}, icon: '+' },
  ]

    if (!activeFile) {
      return (
        <main className="editor-panel">
          <div className="zen-initialization-screen">
            <div className="zen-init-logo">⬡</div>
            <div className="zen-init-text">// INITIALIZING ENCHANTED VIBRANIUM...</div>
            <div className="zen-init-hint">
              SELECT A SECTOR FROM THE SIDEBAR TO BEGIN EDITING
            </div>
            <div className="zen-init-sep"></div>
          </div>
        </main>
      )
    }

  return (
    <main className="editor-panel">
      {/* Prose-First Header */}
      <div className="editor-toolbar-refined">
        <div className="editor-filename-zen">
          {activeFile.name}
          <span className="editor-ext">.md</span>
        </div>
      </div>

      {/* CodeMirror */}
      <div className="codemirror-wrap" style={{ position: 'relative' }}>
        <CodeMirror
          value={cleanContent}
          onChange={onChange}
          onUpdate={handleUpdate}
          height="100%"
          autoFocus={true} /* Grab focus automatically */
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages }),
            cyberNoir,
            wikilinkPlugin,
            CodeMirrorView.lineWrapping,
          ]}
          basicSetup={{
            lineNumbers: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            autocompletion: false,
            bracketMatching: true,
            syntaxHighlighting: true,
            indentOnInput: true,
            closeBrackets: false,
            drawSelection: true,
            dropCursor: false,
            allowMultipleSelections: false,
            searchKeymap: true,
            foldGutter: false,
            history: true,
          }}
        />

        {/* Slash Menu */}
        {showSlashMenu && (
          <div ref={menuRef} className="slash-menu" style={{ top: '60px', left: '60px' }}>
            {slashOptions.map((opt, i) => (
              <div key={i} className="slash-menu-item" onClick={() => {
                opt.action();
                setShowSlashMenu(false);
              }}>
                <span className="slash-menu-icon" style={{ display: 'flex' }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <footer className="zen-telemetry-bar">
        <div className="zen-telemetry-stats">
          <span>{(content || '').split('\n').length} <span className="zen-stat-label">LN</span></span>
          <span>{content && content.trim() ? content.trim().split(/\s+/).length : 0} <span className="zen-stat-label">W</span></span>
          <span>{(content || '').length} <span className="zen-stat-label">CH</span></span>
        </div>
        <div className="zen-telemetry-status">
          <div className="status-dot saved"></div>
          <span className="zen-telemetry-label">SECURE LINK</span>
        </div>
      </footer>
    </main>
  )
}

