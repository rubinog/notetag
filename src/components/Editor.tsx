import React, { useState, useEffect } from 'react';
import type { Note } from '../types';
import { Eye, Edit2, Trash2, Calendar, Tag } from 'lucide-react';
import markdownit from 'markdown-it';
import dayjs from 'dayjs';
import { parseMarkdownBase } from '../utils/markdown';

const md = markdownit({ html: true, linkify: true, breaks: true });

interface EditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ note, onUpdate, onDelete }) => {
  const [isPreview, setIsPreview] = useState(false);
  const [rawText, setRawText] = useState('');

  // Sync internal rawText when note changes externally
  useEffect(() => {
    if (note.raw) {
      setRawText(note.raw);
    } else {
      // Boilerplate for new note
      const initRaw = `---\ntitle: New Note\ncreated-at: ${note.frontmatter['created-at']}\nupdated-at: ${note.frontmatter['updated-at']}\ntags: []\n---\n\n`;
      setRawText(initRaw);
      const parsed = parseMarkdownBase(initRaw);
      onUpdate({ ...note, raw: initRaw, ...parsed });
    }
  }, [note.id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    
    // Parse and update note object
    const { frontmatter, content } = parseMarkdownBase(val);
    frontmatter['updated-at'] = new Date().toISOString();
    
    onUpdate({
      ...note,
      raw: val,
      content,
      frontmatter
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14}/> {dayjs(note.frontmatter['updated-at']).format('MMMM D, YYYY h:mm A')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Tag size={14}/> {note.frontmatter.tags?.length ? note.frontmatter.tags.join(', ') : 'no tags'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={() => setIsPreview(!isPreview)}>
            {isPreview ? <><Edit2 size={16}/> Edit</> : <><Eye size={16}/> Preview</>}
          </button>
          <button className="btn" style={{ color: 'var(--danger)', borderColor: 'rgba(255, 64, 129, 0.3)' }} onClick={() => onDelete(note.id)}>
            <Trash2 size={16}/>
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', padding: isPreview ? '0' : '1rem' }}>
        {isPreview ? (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '3rem 2rem' }}>
            <div className="markdown-body" style={{ maxWidth: '800px', margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: md.render(note.content) }} />
          </div>
        ) : (
          <textarea 
            style={{ 
              flex: 1, 
              resize: 'none', 
              border: 'none', 
              background: 'transparent', 
              width: '100%', 
              outline: 'none', 
              fontSize: '1rem', 
              lineHeight: 1.6, 
              padding: '1rem 2rem',
              fontFamily: 'var(--font-mono)'
            }}
            value={rawText}
            onChange={handleChange}
            placeholder="Write your markdown here... Avoid removing the YAML frontmatter blocks bounded by ---."
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
};
