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
    padding: '24px 48px',
    maxWidth: '760px',
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
        <div className="editor-no-file">
          <div className="editor-no-file-logo">⬡</div>
          <div className="editor-no-file-hint">// SELECT A NOTE TO BEGIN</div>
          <div className="editor-no-file-hint" style={{ color: '#333', fontSize: '10px' }}>
            or create a new note from the vault panel
          </div>
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
            closeBrackets: false, // Disabling global to use custom or none for [
            drawSelection: true,
            dropCursor: false,
            allowMultipleSelections: false,
            searchKeymap: true,
            foldGutter: false,
            history: true,
          }}
        />
      </div>
    </main>
  )
}

