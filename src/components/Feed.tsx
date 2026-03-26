import React, { useState, useRef } from 'react';
import type { Note } from '../types';
import { NoteCard } from './NoteCard';
import { Send, Maximize2, Minimize2, Plus } from 'lucide-react';
import { Toolbar, insertTextAtCursor } from './Toolbar';
import { LinkModal } from './LinkModal';

interface FeedProps {
  notes: Note[];
  allNotes: Note[]; // Add this to pass all notes for linking
  onCreateNote: (content: string) => void;
  onCreateComment: (parentId: string, content: string) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  searchQuery?: string;
  filterDate?: any; // dayjs group
}

export const Feed: React.FC<FeedProps> = ({ 
  notes, allNotes, onCreateNote, onCreateComment, onUpdateNote, onDeleteNote,
  searchQuery, filterDate
}) => {
  const [newContent, setNewContent] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCreate = () => {
    if (!newContent.trim()) return;
    onCreateNote(newContent);
    setNewContent('');
    setIsFocusMode(false);
  };

  const handleInsert = (prefix: string, suffix?: string) => {
    insertTextAtCursor(textareaRef.current, prefix, suffix, setNewContent);
  };

  const allTags = Array.from(new Set(allNotes.flatMap(n => n.frontmatter.tags || [])));

  const composerStyle: React.CSSProperties = isFocusMode 
    ? { position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '900px', height: '90%', zIndex: 100, background: 'var(--bg-panel)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-glass)', display: 'flex', flexDirection: 'column' }
    : { background: 'var(--bg-panel)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem', position: 'relative' };

  return (
    <div className="feed-main-wrapper" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)', padding: '2rem', scrollBehavior: 'smooth' }}>
      
      {isFocusMode && <div className="modal-backdrop" onClick={() => setIsFocusMode(false)} />}
      
      <LinkModal 
        isOpen={showLinkModal} 
        onClose={() => setShowLinkModal(false)} 
        allNotes={allNotes}
        onSelect={(targetNote) => {
          const fallbackTitle = targetNote.content.split('\n')[0].replace(/^[#*-]\s+/, '').substring(0, 30);
          const title = targetNote.frontmatter.title || fallbackTitle;
          handleInsert(`[${title}](#${targetNote.id})`);
        }}
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', position: isFocusMode ? 'static' : 'relative' }}>
        {/* Composer */}
        <div className={isFocusMode ? 'focus-composer' : ''} style={composerStyle}>
          <button className="btn-icon" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'var(--text-muted)' }} onClick={() => setIsFocusMode(!isFocusMode)}>
            {isFocusMode ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
          </button>
          
          <textarea
            ref={textareaRef}
            placeholder="Any thought... (use #tags for categories)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleCreate();
              }
            }}
            style={{ flex: isFocusMode ? 1 : 'none', width: '100%', minHeight: isFocusMode ? 'auto' : '80px', border: 'none', resize: 'vertical', background: 'transparent', boxShadow: 'none', fontSize: isFocusMode ? '1.1rem' : '1rem' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-soft)', paddingTop: '0.75rem' }}>
            <Toolbar 
              onInsert={handleInsert} 
              onTagClick={() => handleInsert('#')} 
              onLinkClick={() => setShowLinkModal(true)}
            />
            <button className="btn btn-primary" onClick={handleCreate} style={{ padding: '0.5rem 1.25rem', flexShrink: 0, marginLeft: 'auto' }}>
              Save <Send size={16} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {allTags.map(tag => (
              <div 
                key={tag} 
                style={{ background: 'var(--bg-panel)', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid var(--border-soft)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setNewContent(prev => prev + (prev.endsWith(' ') || prev === '' ? `#${tag} ` : ` #${tag} `))}
              >
                #{tag}
              </div>
            ))}
          </div>
        )}

        {/* Feed List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {notes.filter(n => (filterDate || searchQuery) ? true : !n.frontmatter.parentId).map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              allNotes={allNotes}
              onUpdate={onUpdateNote} 
              onDeleteNote={onDeleteNote} 
              onCreateComment={onCreateComment}
            />
          ))}
          {notes.filter(n => (filterDate || searchQuery) ? true : !n.frontmatter.parentId).length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              No notes yet. Write your first thought above!
            </div>
          )}
        </div>
      </div>

      {/* FAB — visible only on mobile via CSS */}
      <button
        className="fab-btn"
        aria-label="New note"
        onClick={() => {
          setIsFocusMode(true);
          setTimeout(() => textareaRef.current?.focus(), 50);
        }}
      >
        <Plus size={26} />
      </button>
    </div>
  );
};
