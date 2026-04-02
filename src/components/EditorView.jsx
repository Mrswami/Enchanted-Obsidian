import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView as CodeMirrorView } from '@codemirror/view'

// ── Custom cyber-noir CodeMirror theme ────────────────────────────────────────
const cyberNoir = CodeMirrorView.theme({
  '&': {
    color: '#E8E8E8',
    backgroundColor: '#000000',
    fontSize: '15px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  '.cm-content': {
    caretColor: '#00FF41',
    padding: '24px 32px', /* Tightened internal padding */
  },
  '.cm-cursor': { borderLeftColor: '#00FF41', borderLeftWidth: '2px' },
  '.cm-selectionBackground, ::selection': { backgroundColor: '#1A2A1A !important' },
  '.cm-focused .cm-selectionBackground': { backgroundColor: '#1A2A1A' },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
    borderLeft: '3px solid #00FF41',
    paddingLeft: '8px',
    marginLeft: '-3px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-gutter': { backgroundColor: '#000000', borderRight: '1px solid #202020' },
  '.cm-gutterElement': { color: '#333333', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-line': { padding: '0 0 0 0' },

  // Markdown-specific token colors
  '.cm-header': { color: '#E8E8E8', fontWeight: '600' },
  '.cm-strong': { color: '#FFFFFF', fontWeight: '600' },
  '.cm-em': { color: '#C0C0C0', fontStyle: 'italic' },
  '.cm-link': { color: '#BF5700' },
  '.cm-url': { color: '#5A5A5A', textDecoration: 'none' },
  '.cm-quote': { color: '#4A4A4A', borderLeft: '3px solid #303030', paddingLeft: '8px' },
  '.cm-monospace': { color: '#00FF41', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', backgroundColor: '#021002' },
  '.cm-meta': { color: '#404040' },     // markdown punctuation (**, __, etc.)
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
      color: #00FF41;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88em;
      background: rgba(0,255,65,0.06);
      border: 1px solid rgba(0,255,65,0.25);
      padding: 0 3px;
      border-radius: 0;
      cursor: pointer;
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
export default function EditorView({ activeFile, content, onChange }) {
  if (!activeFile) {
    return (
      <main className="editor-panel">
        <div className="editor-no-file" style={{ border: '1px solid var(--border)', margin: '40px', padding: '40px', background: 'var(--bg-panel)' }}>
          <div className="editor-no-file-logo" style={{ color: 'var(--accent)', fontSize: '48px', marginBottom: '24px' }}>⬡</div>
          <div className="editor-no-file-hint" style={{ color: 'var(--text-main)', letterSpacing: '0.2em' }}>// INITIALIZING ENCHANTED_VAULT...</div>
          <div className="editor-no-file-hint" style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '16px' }}>
            SELECT A SECTOR FROM THE SIDEBAR TO BEGIN EDITING
          </div>
          <div style={{ marginTop: '40px', height: '1px', width: '60px', background: 'var(--border)' }}></div>
        </div>
      </main>
    )
  }

  return (
    <main className="editor-panel">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-filename">
          {activeFile.name}
          <span>.md</span>
        </div>
      </div>

      {/* CodeMirror */}
      <div className="codemirror-wrap">
        <CodeMirror
          value={content}
          onChange={onChange}
          height="100%"
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
      </div>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-item">
          L_COUNT: {content.split('\n').length} // W_COUNT: {content.trim() ? content.trim().split(/\s+/).length : 0} // CH_COUNT: {content.length}
        </div>
        <div className="status-item" style={{ marginLeft: 'auto' }}>
          <span className="status-indicator" />
          SYNC: SECURE
        </div>
      </footer>
    </main>
  )
}

