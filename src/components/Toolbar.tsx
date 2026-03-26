import { Bold, Italic, Underline, List, ListTodo, Tag, Code, Link } from 'lucide-react';

interface ToolbarProps {
  onInsert: (prefix: string, suffix?: string) => void;
  onTagClick?: () => void;
  onLinkClick?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onInsert, onTagClick, onLinkClick }) => {
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
