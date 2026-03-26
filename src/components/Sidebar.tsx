import React, { useState, useMemo } from 'react';
import type { Note } from '../types';
import { Search, Settings, Tag as TagIcon, Hash, RefreshCw, CheckCircle, AlertTriangle, Cloud, X } from 'lucide-react';
import dayjs from 'dayjs';
import { Calendar } from './Calendar';

interface SidebarProps {
  notes: Note[];
  onOpenSettings: () => void;
  filterDate: dayjs.Dayjs | null;
  setFilterDate: (val: dayjs.Dayjs | null) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  notes, onOpenSettings: onSettingsClick, filterDate, setFilterDate, searchQuery, setSearchQuery, syncStatus = 'idle', onCloseMobile
}) => {
  const [currentCalDate, setCurrentCalDate] = useState(dayjs());
  
  // Collect active dates for the calendar
  const activeDates = useMemo(() => {
    return notes.map(n => dayjs(n.frontmatter['updated-at']).format('YYYY-MM-DD'));
  }, [notes]);

  // Aggregate tags
  const tagsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(n => {
      n.frontmatter.tags?.forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]);
  }, [notes]);

  return (
    <div className="glass-panel sidebar-panel" style={{ width: '280px', display: 'flex', flexDirection: 'column', zIndex: 10, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0, paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" width={28} height={28} alt="NoteTag" style={{ borderRadius: '8px', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />
          <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>NoteTag</h1>
        </div>
        
        {onCloseMobile && (
          <button className="btn-icon mobile-close-btn" onClick={onCloseMobile} title="Close menu">
            <X size={22} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {syncStatus === 'syncing' && <span title="Syncing..."><RefreshCw size={16} className="spin-animation" style={{ color: 'var(--text-muted)' }} /></span>}
          {syncStatus === 'success' && <span title="Saved to GitHub"><CheckCircle size={16} style={{ color: 'var(--accent-primary)' }} /></span>}
          {syncStatus === 'error' && <span title="Sync error"><AlertTriangle size={16} style={{ color: 'var(--danger)' }} /></span>}
          {syncStatus === 'idle' && <span title="Saved locally"><Cloud size={16} style={{ color: 'var(--text-muted)', opacity: 0.4 }} /></span>}
          
          <button className="btn-icon" onClick={onSettingsClick} title="Settings"><Settings size={18} /></button>
        </div>
      </div>
      
      {/* Search */}
      <div style={{ padding: '0.5rem 1.5rem 1rem 1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '8px', border: '1px solid var(--border-soft)' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Calendar */}
        <div style={{ padding: '0.5rem 1.5rem' }}>
          <div style={{ background: 'var(--bg-panel)', borderRadius: '12px', padding: '0.5rem', border: '1px solid var(--border-soft)' }}>
            <Calendar 
              currentDate={currentCalDate} 
              onDateChange={(d) => {
                setCurrentCalDate(d);
                if (filterDate && filterDate.isSame(d, 'day')) {
                  setFilterDate(null); // toggle off
                } else {
                  setFilterDate(d);
                }
              }} 
              activeDates={activeDates}
            />
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TagIcon size={14}/> Tags
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tagsCount.map(([tag, count]) => (
              <div 
                key={tag} 
                onClick={() => setSearchQuery(tag === searchQuery ? '' : tag)}
                className="hover-scale"
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  color: tag === searchQuery ? 'var(--accent-primary)' : 'var(--text-main)', 
                  fontWeight: tag === searchQuery ? 700 : 400,
                  fontSize: '0.9rem', 
                  cursor: 'pointer', 
                  padding: '0.4rem 0.75rem',
                  margin: '0 -0.75rem',
                  borderRadius: '6px',
                  background: tag === searchQuery ? 'var(--accent-glow)' : 'transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Hash size={14} color={tag === searchQuery ? 'var(--accent-primary)' : 'var(--text-muted)'}/> 
                  {tag}
                </span>
                <span style={{ color: tag === searchQuery ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '0.8rem' }}>{count}</span>
              </div>
            ))}
            {tagsCount.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags yet.</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
