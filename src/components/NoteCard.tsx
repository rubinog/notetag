import React, { useState, useRef } from 'react';
import type { Note } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import markdownit from 'markdown-it';
// @ts-ignore
import taskLists from 'markdown-it-task-lists';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { MoreVertical, Trash2, Edit2, X, Check, Reply, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { stringifyMarkdown } from '../utils/markdown';
import { Toolbar, insertTextAtCursor, handleListContinuationOnEnter } from './Toolbar';
import { LinkModal } from './LinkModal';

dayjs.extend(relativeTime);

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '🤔'];

function hashtagPlugin(md: any) {
  md.inline.ruler.push('hashtag', (state: any, silent: boolean) => {
    const src = state.src;
    const pos = state.pos;
    if (src[pos] !== '#') return false;
    
    if (pos > 0 && !/\s/.test(src[pos - 1])) return false;

    const match = src.slice(pos).match(/^#([\w\u00C0-\u017F-]+)/);
    if (!match) return false;

    if (!silent) {
      const token = state.push('html_inline', '', 0);
      token.content = `<span class="hashtag">${match[0]}</span>`;
    }
    state.pos += match[0].length;
    return true;
  });
}

const md = markdownit({ 
  html: true, 
  linkify: true, 
  breaks: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; 
  }
}).use(taskLists, { enabled: true }).use(hashtagPlugin);

// Custom fence renderer to add language label
md.renderer.rules.fence = function(tokens, idx, options) {
  const token = tokens[idx];
  const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
  const langName = info.split(/\s+/g)[0];
  
  const highlighted = options.highlight ? options.highlight(token.content, langName, '') : md.utils.escapeHtml(token.content);
  
  return `<div class="code-block-wrapper">
    <pre class="hljs">${langName ? `<span class="code-lang-label">${langName}</span>` : ''}<code>${highlighted || md.utils.escapeHtml(token.content)}</code></pre>
  </div>`;
};

export const NoteCard: React.FC<{ 
  note: Note; 
  allNotes?: Note[]; 
  onUpdate: (n: Note) => void; 
  onDeleteNote: (id: string) => void;
  onCreateComment?: (parentId: string, content: string) => void;
  onTagClick?: (tag: string) => void;
  isComment?: boolean;
}> = ({ note, allNotes = [], onUpdate, onDeleteNote, onCreateComment, onTagClick, isComment = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<'edit' | 'reply'>('edit');
  const [isEditFocusMode, setIsEditFocusMode] = useState(false);
  const [orphanLinkNotice, setOrphanLinkNotice] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = (prefix: string, suffix?: string) => {
    insertTextAtCursor(textareaRef.current, prefix, suffix, setEditContent);
  };

  const handleSave = () => {
    const extractedTags = Array.from(editContent.matchAll(/(?:^|\s)#([\w\u00C0-\u017F-]+)/g)).map(m => m[1]);
    const existingTags = note.frontmatter.tags || [];
    const mergedTags = [...new Set([...existingTags, ...extractedTags])];

    const newFrontmatter = {
      ...note.frontmatter,
      'updated-at': new Date().toISOString(),
      tags: mergedTags
    };

    onUpdate({
      ...note,
      content: editContent,
      frontmatter: newFrontmatter,
      raw: stringifyMarkdown(newFrontmatter, editContent)
    });
    setIsEditFocusMode(false);
    setIsEditing(false);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    const anchorEl = target.closest('a') as HTMLAnchorElement | null;
    if (anchorEl) {
      const hrefAttr = (anchorEl.getAttribute('href') || '').trim();
      const hash = hrefAttr.startsWith('#') ? hrefAttr : (anchorEl.hash || '');

      if (hash.startsWith('#') && hash.length > 1) {
        const targetId = decodeURIComponent(hash.slice(1));
        const linkedNoteExists = allNotes.some(n => n.id === targetId);
        if (!linkedNoteExists) {
          e.preventDefault();
          e.stopPropagation();
          setOrphanLinkNotice('This linked note no longer exists.');
          setTimeout(() => setOrphanLinkNotice(null), 2800);
          return;
        }
      }
    }

    const hashtagEl = target.closest('.hashtag') as HTMLElement | null;
    if (hashtagEl && onTagClick) {
      const rawTag = (hashtagEl.textContent || '').trim();
      const normalizedTag = rawTag.startsWith('#') ? rawTag.slice(1) : rawTag;
      if (normalizedTag) {
        onTagClick(normalizedTag);
      }
      e.preventDefault();
      return;
    }

    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      const isChecked = (target as HTMLInputElement).checked;
      
      const container = e.currentTarget;
      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
      const index = checkboxes.indexOf(target as HTMLInputElement);
      
      if (index !== -1) {
        let count = -1;
        const newContent = note.content.replace(/- \[[ xX]\]/gi, (match) => {
          count++;
          if (count === index) {
            return isChecked ? '- [x]' : '- [ ]';
          }
          return match;
        });

        const existingTags = note.frontmatter.tags || [];
        const mergedTags = [...new Set([...existingTags])];

        const newFrontmatter = {
          ...note.frontmatter,
          'updated-at': new Date().toISOString(),
          tags: mergedTags
        };

        onUpdate({
          ...note,
          content: newContent,
          frontmatter: newFrontmatter,
          raw: stringifyMarkdown(newFrontmatter, newContent)
        });
      }
    }
  };

  const handleToggleReaction = (emoji: string) => {
    const currentReactions = { ...(note.frontmatter.reactions || {}) };
    const selected = new Set(note.frontmatter.userReactions || []);
    const alreadySelected = selected.has(emoji);

    if (alreadySelected) {
      // Toggle off the current reaction.
      selected.delete(emoji);
      const nextCount = Math.max(0, (currentReactions[emoji] || 1) - 1);
      if (nextCount === 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = nextCount;
      }
    } else {
      // Only one reaction at a time: remove previous selections first.
      for (const previous of selected) {
        const nextCount = Math.max(0, (currentReactions[previous] || 1) - 1);
        if (nextCount === 0) {
          delete currentReactions[previous];
        } else {
          currentReactions[previous] = nextCount;
        }
      }
      selected.clear();
      selected.add(emoji);
      currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
    }

    const newFrontmatter = {
      ...note.frontmatter,
      'updated-at': new Date().toISOString(),
      reactions: currentReactions,
      userReactions: Array.from(selected)
    };

    onUpdate({
      ...note,
      frontmatter: newFrontmatter,
      raw: stringifyMarkdown(newFrontmatter, note.content)
    });
  };

  return (
    <div 
      id={note.id} 
      className="note-card-container" 
      style={{ 
        background: isComment ? 'rgba(0,0,0,0.015)' : 'var(--bg-panel)', 
        padding: isComment ? '0.5rem 0.75rem' : '1.25rem', 
        borderRadius: isComment ? '8px' : '12px', 
        border: '1px solid var(--border-soft)', 
        borderLeft: isComment ? '3px solid var(--border-soft)' : '1px solid var(--border-soft)',
        boxShadow: isComment ? 'none' : 'var(--shadow-sm)', 
        position: 'relative',
        marginBottom: isComment ? '0.15rem' : '0'
      }}
    >
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {dayjs(note.frontmatter['updated-at']).fromNow()}
          </span>
          <button 
            className="btn-icon" 
            title="Reply"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setIsReplying(!isReplying)}
          >
            <Reply size={15} />
          </button>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={() => setShowMenu(!showMenu)} aria-label="Options menu"><MoreVertical size={18}/></button>
          {showMenu && (
            <>
              {/* Backdrop to close menu on mobile tap outside */}
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowMenu(false)} />
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-panel)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '0.4rem', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '140px' }}>
                <button 
                  className="btn-icon" 
                  style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-main)', padding: '0.6rem 0.75rem', gap: '0.5rem', borderRadius: '6px', fontSize: '0.9rem' }} 
                  onClick={() => { setIsReplying(!isReplying); setShowMenu(false); }}
                >
                  <Reply size={15} /> Reply
                </button>
                <button 
                  className="btn-icon" 
                  style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-main)', padding: '0.6rem 0.75rem', gap: '0.5rem', borderRadius: '6px', fontSize: '0.9rem' }} 
                  onClick={() => {
                    setIsEditing(true);
                    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
                      setIsEditFocusMode(true);
                    }
                    setShowMenu(false);
                  }}
                >
                  <Edit2 size={15} /> Edit
                </button>
                <button 
                  className="btn-icon" 
                  style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', padding: '0.6rem 0.75rem', gap: '0.5rem', borderRadius: '6px', fontSize: '0.9rem' }} 
                  onClick={() => { 
                    setShowDeleteConfirm(true);
                    setShowMenu(false); 
                  }}
                >
                  <Trash2 size={15} /> Delete
                </button>

                <div style={{ margin: '0.35rem 0.2rem', borderTop: '1px solid var(--border-soft)' }} />
                <div style={{ padding: '0.35rem 0.55rem 0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  React
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', padding: '0 0.45rem 0.35rem' }}>
                  {REACTION_EMOJIS.map(emoji => {
                    const isActive = (note.frontmatter.userReactions || []).includes(emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        className="btn-icon"
                        style={{
                          minWidth: '30px',
                          minHeight: '30px',
                          padding: '0.2rem',
                          border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-soft)',
                          borderRadius: '999px',
                          background: isActive ? 'var(--accent-glow)' : 'transparent'
                        }}
                        onClick={() => {
                          handleToggleReaction(emoji);
                          setShowMenu(false);
                        }}
                      >
                        <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <LinkModal 
        isOpen={showLinkModal} 
        onClose={() => setShowLinkModal(false)} 
        allNotes={allNotes}
        onSelect={(targetNote) => {
          const explicitTitle = (targetNote.frontmatter.title || '').trim();
          const firstLine = targetNote.content.split('\n')[0].replace(/^[#*-]\s+/, '').trim();
          const maxLen = 50;
          const fallbackTitle = firstLine.length > maxLen ? `${firstLine.substring(0, maxLen)}...` : firstLine;
          const title = explicitTitle || fallbackTitle;
          const link = `[${title}](#${targetNote.id})`;
          if (linkTarget === 'edit') {
            handleInsert(link);
          } else {
            insertTextAtCursor(replyRef.current, link, '', setReplyContent);
          }
        }}
      />

      {isEditing && isEditFocusMode && <div className="modal-backdrop" onClick={() => setIsEditFocusMode(false)} />}

      {isEditing ? (
        <div
          id={note.id + "-edit"}
          className={isEditFocusMode ? 'focus-composer' : ''}
          style={isEditFocusMode
            ? {
                position: 'fixed',
                top: '5%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '900px',
                height: '90%',
                zIndex: 100,
                background: 'var(--bg-panel)',
                padding: '2rem',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-glass)',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-soft)'
              }
            : { background: 'rgba(0,0,0,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-soft)' }}
        >
          <button
            className="btn-icon"
            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'var(--text-muted)' }}
            onClick={() => setIsEditFocusMode(!isEditFocusMode)}
            title={isEditFocusMode ? 'Exit focus mode' : 'Focus mode'}
          >
            {isEditFocusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <textarea 
            ref={textareaRef}
            style={{ width: '100%', minHeight: '100px', flex: isEditFocusMode ? 1 : 'none', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical' }}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              handleListContinuationOnEnter(e, textareaRef.current, setEditContent);
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-soft)', paddingTop: '0.5rem' }}>
            <Toolbar 
              onInsert={handleInsert} 
              onTagClick={() => handleInsert('#')}
              onLinkClick={() => { setLinkTarget('edit'); setShowLinkModal(true); }}
              onEmojiInsert={(emoji) => handleInsert(emoji)}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" onClick={() => { setIsEditFocusMode(false); setIsEditing(false); }}><X size={14}/> Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Check size={14}/> Save</button>
            </div>
          </div>
          
          {/* Quick Tags in Edit Mode */}
          {allNotes && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {Array.from(new Set(allNotes.flatMap(n => n.frontmatter.tags || []))).map(tag => (
                <div 
                  key={tag} 
                  className="hover-scale"
                  style={{ background: 'var(--bg-base)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border-soft)', cursor: 'pointer' }}
                  onClick={() => handleInsert(`#${tag} `)}
                >
                  #{tag}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="markdown-body" style={{ fontSize: isComment ? '0.9rem' : '1rem' }} onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: md.render(note.content) }} />

          {orphanLinkNotice && (
            <div
              style={{
                marginTop: '0.65rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            >
              {orphanLinkNotice}
            </div>
          )}

          {Object.entries(note.frontmatter.reactions || {}).some(([, count]) => count > 0) && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
              {Object.entries(note.frontmatter.reactions || {})
                .filter(([, count]) => count > 0)
                .map(([emoji]) => (
                  <button
                    key={emoji}
                    type="button"
                    className="btn"
                    onClick={() => handleToggleReaction(emoji)}
                    style={{
                      padding: '0.2rem 0.55rem',
                      minHeight: '30px',
                      borderRadius: '999px',
                      borderColor: (note.frontmatter.userReactions || []).includes(emoji) ? 'var(--accent-primary)' : 'var(--border-soft)',
                      background: (note.frontmatter.userReactions || []).includes(emoji) ? 'var(--accent-glow)' : 'var(--bg-base)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>{emoji}</span>
                  </button>
                ))}
            </div>
          )}

          {/* Reply Box (Now above comments for better visibility) */}
          {isReplying && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
              <textarea 
                ref={replyRef}
                placeholder="Leave a comment..."
                style={{ width: '100%', minHeight: '60px', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical' }}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={(e) => {
                  handleListContinuationOnEnter(e, replyRef.current, setReplyContent);
                }}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <Toolbar 
                  onInsert={(pre, suf) => insertTextAtCursor(replyRef.current, pre, suf, setReplyContent)} 
                  onTagClick={() => insertTextAtCursor(replyRef.current, '#', '', setReplyContent)}
                  onLinkClick={() => { setLinkTarget('reply'); setShowLinkModal(true); }}
                  onEmojiInsert={(emoji) => insertTextAtCursor(replyRef.current, emoji, '', setReplyContent)}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn" onClick={() => setIsReplying(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => { 
                    if(!replyContent.trim()) return;
                    if(onCreateComment){ 
                      onCreateComment(note.id, replyContent); 
                      setReplyContent(''); 
                      setIsReplying(false); 
                    } 
                  }}>Reply</button>
                </div>
              </div>

              {allNotes && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {Array.from(new Set(allNotes.flatMap(n => n.frontmatter.tags || []))).map(tag => (
                    <div 
                      key={tag} 
                      className="hover-scale"
                      style={{ background: 'var(--bg-base)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border-soft)', cursor: 'pointer' }}
                      onClick={() => insertTextAtCursor(replyRef.current, `#${tag} `, '', setReplyContent)}
                    >
                      #{tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Nested Comments (Recursive NoteCard) */}
          {allNotes.filter(n => n.frontmatter.parentId === note.id).length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem', borderLeft: '1px dashed var(--border-soft)' }}>
              {allNotes.filter(n => n.frontmatter.parentId === note.id).map(child => (
                <NoteCard 
                  key={child.id}
                  note={child}
                  allNotes={allNotes}
                  onUpdate={onUpdate}
                  onDeleteNote={onDeleteNote}
                  onCreateComment={onCreateComment}
                  onTagClick={onTagClick}
                  isComment={true}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          onClick={() => setShowDeleteConfirm(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '350px', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-lg)' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} /> Delete Note
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete this note and all of its comments? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--danger)', color: 'white', border: 'none' }} onClick={() => { onDeleteNote(note.id); setShowDeleteConfirm(false); }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
