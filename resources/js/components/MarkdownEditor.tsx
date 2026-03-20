import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = 400 }: Props) {
  return (
    <div style={{
      position: 'relative',
      height: minHeight,
      overflow: 'auto',
      background: 'var(--bg-base)',
      border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      {!value && placeholder && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 18,
            color: 'var(--text-dim)',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.7,
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
            opacity: 0.5,
          }}
        >
          {placeholder}
        </div>
      )}
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={code => Prism.highlight(code, Prism.languages.markdown, 'markdown')}
        padding={14}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          lineHeight: 1.7,
          background: 'transparent',
          color: 'var(--text-primary)',
          minHeight: minHeight - 2,
          boxSizing: 'border-box',
          caretColor: 'var(--accent)',
        }}
        textareaClassName="mandate-editor-textarea"
      />
      <style>{`
        .mandate-editor-textarea {
          outline: none !important;
        }
        .mandate-editor-textarea::placeholder {
          color: var(--text-dim);
          opacity: 0.5;
        }
        /* Markdown syntax highlighting */
        .token.title { color: var(--accent); font-weight: 600; }
        .token.hr { color: var(--text-dim); }
        .token.list { color: var(--accent); }
        .token.bold { color: var(--text-primary); font-weight: 700; }
        .token.italic { color: var(--text-secondary); font-style: italic; }
        .token.url { color: var(--accent); text-decoration: underline; }
        .token.strike { color: var(--text-dim); text-decoration: line-through; }
        .token.code-snippet,
        .token.code { color: #a78bfa; background: rgba(167,139,250,0.08); border-radius: 3px; padding: 1px 4px; }
        .token.blockquote { color: var(--text-dim); border-left: 2px solid var(--border); padding-left: 8px; }
      `}</style>
    </div>
  );
}
