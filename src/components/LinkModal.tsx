import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { Note } from '../types';
import dayjs from 'dayjs';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNotes: Note[];
  onSelect: (note: Note) => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, allNotes, onSelect }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredNotes = allNotes.filter(n => {
    const fallbackTitle = n.content.split('\n')[0].substring(0, 40);
    const title = (n.frontmatter.title || fallbackTitle).toLowerCase();
    return title.includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
  }).slice(0, 10);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Link Note</h3>
          <button className="btn-icon" onClick={onClose}><X size={16}/></button>
        </div>
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            autoFocus 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search note..." 
            style={{ width: '100%', paddingLeft: '2.25rem' }} 
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {filteredNotes.map(n => {
            const firstLine = n.content.split('\n')[0].replace(/^[#*-]\s+/, '').substring(0, 40) || 'Untitled note';
            const displayTitle = n.frontmatter.title || firstLine;
            return (
              <div 
                key={n.id} 
                onClick={() => { onSelect(n); onClose(); }} 
                style={{ 
                  padding: '0.75rem', 
                  border: '1px solid var(--border-soft)', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  background: 'var(--bg-base)',
                  transition: 'transform 0.1s ease'
                }}
                className="hover-scale"
              >
                <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayTitle}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {dayjs(n.frontmatter['updated-at'] || n.frontmatter['created-at']).format('DD MMM YYYY')} &middot; {n.content.length} chars
                </div>
              </div>
            );
          })}
          {filteredNotes.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              No notes found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
