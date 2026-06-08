import React from 'react';

export function parseMarkdown(text: string): React.ReactNode {
  if (!text) return '';

  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const before = text.substring(lastIndex, match.index);
    if (before) {
      parts.push(...parseInlineMarkdown(before));
    }
    const lang = match[1];
    const code = match[2];
    parts.push(
      <div key={`code-block-${match.index}`} className="relative my-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto select-text group/code">
        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-semibold transition-all"
          >
            Copy
          </button>
        </div>
        {lang && <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-2">{lang}</div>}
        <pre className="m-0 leading-relaxed font-mono whitespace-pre">{code.trim()}</pre>
      </div>
    );
    lastIndex = codeBlockRegex.lastIndex;
  }

  const after = text.substring(lastIndex);
  if (after) {
    parts.push(...parseInlineMarkdown(after));
  }

  return parts.length === 1 ? parts[0] : <>{parts.map((p, i) => <React.Fragment key={i}>{p}</React.Fragment>)}</>;
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong class="font-bold text-zinc-150">$1</strong>');
  // Underline: __
  html = html.replace(/__([\s\S]*?)__/g, '<span style="text-decoration: underline">$1</span>');
  // Italic: * or _
  html = html.replace(/\*([\s\S]*?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_([\s\S]*?)_/g, '<em class="italic">$1</em>');
  // Strikethrough: ~~
  html = html.replace(/~~([\s\S]*?)__/g, '<del class="line-through text-zinc-500">$1</del>');
  html = html.replace(/~~([\s\S]*?)~~/g, '<del class="line-through text-zinc-500">$1</del>');
  // Inline code: `
  html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-950/60 border border-zinc-850/50 px-1.5 py-0.5 rounded font-mono text-[12px] text-accent font-semibold select-text">$1</code>');
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline font-semibold transition-all">$1</a>');

  return [<span key={text} dangerouslySetInnerHTML={{ __html: html }} />];
}
