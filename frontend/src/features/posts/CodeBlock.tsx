import { useState } from 'react';

const TOKEN_PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|import|from|export|class|new|async|await|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;

const TOKEN_CLASS: Record<string, string> = {
  comment: 'code-token-comment',
  string: 'code-token-string',
  keyword: 'code-token-keyword',
  number: 'code-token-number',
};

function tokenType(token: string): keyof typeof TOKEN_CLASS | null {
  if (/^(\/\/|\/\*|#)/.test(token)) return 'comment';
  if (/^['"`]/.test(token)) return 'string';
  if (/^(const|let|var|function|return|if|else|for|while|import|from|export|class|new|async|await|true|false|null|undefined)$/.test(token)) return 'keyword';
  if (/^\d/.test(token)) return 'number';
  return null;
}

function highlightedCode(source: string) {
  return source.split(TOKEN_PATTERN).map((part, index) => {
    const type = tokenType(part);
    return type ? <span key={index} className={TOKEN_CLASS[type]}>{part}</span> : part;
  });
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <div className="code-window-controls" aria-hidden="true">
          <span className="code-window-dot close" />
          <span className="code-window-dot minimize" />
          <span className="code-window-dot maximize" />
        </div>
        <span className="code-language">{language || 'Code'}</span>
        <button type="button" className="code-copy" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void copy(); }}>
          <span aria-hidden="true">▣</span> {copied ? 'COPIED' : 'COPY CODE'}
        </button>
      </div>
      <pre className="code"><code>{highlightedCode(code)}</code></pre>
    </div>
  );
}
