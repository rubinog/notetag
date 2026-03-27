import { useState } from 'react';
import { Bold, Italic, Underline, List, ListTodo, Tag, Code, Link, Smile } from 'lucide-react';

interface ToolbarProps {
  onInsert: (prefix: string, suffix?: string) => void;
  onTagClick?: () => void;
  onLinkClick?: () => void;
  onEmojiInsert?: (emoji: string) => void;
}

const EMOJI_OPTIONS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🤔', '🥳', '🤩',
  '👍', '👏', '🙌', '💪', '🙏', '❤️', '🔥', '✨', '🎉', '🚀',
  '💡', '✅', '❗', '🎯'
];

export const Toolbar: React.FC<ToolbarProps> = ({ onInsert, onTagClick, onLinkClick, onEmojiInsert }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div style={{ display: 'flex', gap: '0.1rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
      <button type="button" className="btn-icon toolbar-btn" title="Bold" onClick={() => onInsert('**', '**')}><Bold size={16} /></button>
      <button type="button" className="btn-icon toolbar-btn" title="Italic" onClick={() => onInsert('*', '*')}><Italic size={16} /></button>
      <button type="button" className="btn-icon toolbar-btn" title="Underline" onClick={() => onInsert('<u>', '</u>')}><Underline size={16} /></button>
      <button type="button" className="btn-icon toolbar-btn" title="Bulleted list" onClick={() => onInsert('- ')}><List size={16} /></button>
      <button type="button" className="btn-icon toolbar-btn" title="Checklist" onClick={() => onInsert('- [ ] ')}><ListTodo size={16} /></button>
      <button type="button" className="btn-icon toolbar-btn" title="Code" onClick={() => onInsert('\n```javascript\n', '\n```\n')}><Code size={16} /></button>
      {onTagClick && (
        <button type="button" className="btn-icon toolbar-btn" title="Add tag" onClick={onTagClick}><Tag size={16} /></button>
      )}
      {onLinkClick && (
        <button type="button" className="btn-icon toolbar-btn" title="Link note" onClick={onLinkClick}><Link size={16} /></button>
      )}
      {onEmojiInsert && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn-icon toolbar-btn"
            title="Insert emoji"
            onClick={() => setShowEmojiPicker(v => !v)}
          >
            <Smile size={16} />
          </button>
          {showEmojiPicker && (
            <div
              style={{
                position: 'absolute',
                bottom: '110%',
                left: 0,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: '10px',
                padding: '0.35rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '0.25rem',
                boxShadow: 'var(--shadow-md)',
                zIndex: 20
              }}
            >
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className="btn-icon"
                  style={{ minWidth: '32px', minHeight: '32px', padding: '0.25rem' }}
                  onClick={() => {
                    onEmojiInsert(emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const insertTextAtCursor = (
  el: HTMLTextAreaElement | null,
  prefix: string,
  suffix: string = '',
  setContent: (val: string) => void
) => {
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  const before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end, text.length);

  // If it's a list prefix and we are not at the start of a line, we can prepend a newline
  let finalPrefix = prefix;
  if (prefix.startsWith('-') && before.length > 0 && !before.endsWith('\n')) {
    finalPrefix = '\n' + prefix;
  }

  const newText = before + finalPrefix + selected + suffix + after;
  setContent(newText);
  
  // Set cursor position after React re-renders
  setTimeout(() => {
    el.focus();
    if (selected.length === 0) {
      el.setSelectionRange(start + finalPrefix.length, start + finalPrefix.length);
    } else {
      el.setSelectionRange(start + finalPrefix.length, start + finalPrefix.length + selected.length);
    }
  }, 0);
};

export const handleListContinuationOnEnter = (
  e: {
    key: string;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    nativeEvent?: { isComposing?: boolean };
    preventDefault: () => void;
  },
  el: HTMLTextAreaElement | null,
  setContent: (val: string) => void
): boolean => {
  if (!el) return false;
  if (e.key !== 'Enter') return false;
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.nativeEvent?.isComposing) return false;

  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start !== end) return false;

  const text = el.value;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', start);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const line = text.slice(lineStart, lineEnd);

  const match = line.match(/^(\s*)(-\s\[(?: |x|X)\]\s|-\s)(.*)$/);
  if (!match) return false;

  const indent = match[1] || '';
  const marker = match[2] || '- ';
  const content = (match[3] || '').trim();

  e.preventDefault();

  if (content.length === 0) {
    // Exit list mode when Enter is pressed on an empty list item.
    // Insert a blank separator line so the next text is parsed outside the list.
    const updatedText = text.slice(0, lineStart) + '\n' + text.slice(lineEnd);
    setContent(updatedText);
    setTimeout(() => {
      el.focus();
      const cursor = lineStart + 1;
      el.setSelectionRange(cursor, cursor);
    }, 0);
    return true;
  }

  const insert = `\n${indent}${marker}`;
  const updatedText = text.slice(0, start) + insert + text.slice(end);
  setContent(updatedText);
  setTimeout(() => {
    el.focus();
    const cursor = start + insert.length;
    el.setSelectionRange(cursor, cursor);
  }, 0);
  return true;
};
