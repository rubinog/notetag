import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Feed } from './components/Feed';
import { SettingsModal } from './components/SettingsModal';
import { useNotes, useGitHubCredentials, useFont } from './store';
import { pushSingleNote, deleteSingleNote } from './github';
import { Menu } from 'lucide-react';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type { Note } from './types';

// Custom type for the PWA install event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function App() {
  const { notes, saveNote, deleteNote, setAllNotes } = useNotes();
  const { creds, saveCreds, clearCreds } = useGitHubCredentials();
  const { fontFamily, setFontFamily } = useFont();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('notetag-accent') || '#3b82f6');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    localStorage.setItem('notetag-accent', accentColor);
    document.documentElement.style.setProperty('--accent-primary', accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-main', fontFamily);
  }, [fontFamily]);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Wrappers for Auto-Sync
  const handleSaveNote = async (note: Note) => {
    saveNote(note);
    if (creds) {
      setSyncStatus('syncing');
      try {
        await pushSingleNote(creds, note);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err) {
        console.error('Auto-sync push failed:', err);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 5000);
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const notesToDelete: Note[] = [];

    const findDescendants = (currentNoteId: string) => {
      const children = notes.filter(n => n.frontmatter.parentId === currentNoteId);
      children.forEach(child => {
        notesToDelete.push(child);
        findDescendants(child.id);
      });
    };

    const mainNote = notes.find(n => n.id === noteId);
    if (mainNote) {
      notesToDelete.push(mainNote);
      findDescendants(noteId);
    }

    notesToDelete.forEach(note => deleteNote(note.id));

    if (creds) {
      setSyncStatus('syncing');
      try {
        for (const note of notesToDelete) {
          await deleteSingleNote(creds, note.id);
        }
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err) {
        console.error('Auto-sync delete failed:', err);
        setSyncStatus('error');
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 5000);
      }
    }
  };

  const handleCreateNew = (content: string, parentId?: string) => {
    const now = dayjs().toISOString();
    const extractedTags = Array.from(content.matchAll(/(?:^|\s)#([\w\u00C0-\u017F-]+)/g)).map(m => m[1]);
    const uniqueTags = [...new Set(extractedTags)];

    const frontmatterObj: any = {
      'created-at': now,
      'updated-at': now,
      tags: uniqueTags
    };
    if (parentId) frontmatterObj.parentId = parentId;

    let rawFrontmatter = `---\ncreated-at: ${now}\nupdated-at: ${now}\ntags: [${uniqueTags.map(t => `"${t}"`).join(', ')}]\n`;
    if (parentId) rawFrontmatter += `parentId: "${parentId}"\n`;
    rawFrontmatter += `---\n${content}`;

    const newNote = {
      id: uuidv4(),
      content,
      frontmatter: frontmatterObj,
      raw: rawFrontmatter
    };
    handleSaveNote(newNote);
  };

  const filteredNotes = notes
    .filter(n => {
      let matchesDate = true;
      let matchesSearch = true;
      
      if (filterDate) {
        matchesDate = dayjs(n.frontmatter['updated-at']).isSame(filterDate, 'day');
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchesSearch = n.content.toLowerCase().includes(query) || (n.frontmatter.tags && n.frontmatter.tags.some(t => t.toLowerCase().includes(query)));
      }
      
      return matchesDate && matchesSearch;
    })
    .sort((a,b) => dayjs(b.frontmatter['updated-at']).valueOf() - dayjs(a.frontmatter['updated-at']).valueOf());

  return (
    <div className="app-container">
      <div className="mobile-header">
        <button className="btn-icon" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
          <Menu size={24} style={{ color: 'var(--text-main)' }} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" width={24} height={24} alt="NoteTag" style={{ borderRadius: '6px' }} onError={(e) => e.currentTarget.style.display = 'none'} />
          <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>NoteTag</h1>
        </div>
        {/* Right spacer to keep title centered */}
        <div style={{ width: 44 }} />
      </div>

      <div className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <Sidebar 
          notes={notes} 
          onOpenSettings={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
          filterDate={filterDate}
          setFilterDate={setFilterDate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          syncStatus={syncStatus}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        {isMobileMenuOpen && <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />}
      </div>
      
      <div className="feed-container">
        <Feed 
          notes={filteredNotes}
          allNotes={notes}
          onCreateNote={(c) => handleCreateNew(c)}
          onCreateComment={(parentId, c) => handleCreateNew(c, parentId)}
          onUpdateNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          searchQuery={searchQuery}
          filterDate={filterDate}
        />
      </div>

      {isSettingsOpen && (
        <SettingsModal 
          creds={creds}
          onSaveCreds={saveCreds}
          onClearCreds={clearCreds}
          onClose={() => setIsSettingsOpen(false)}
          localNotes={notes}
          onSyncComplete={setAllNotes}
          accentColor={accentColor}
          setAccentColor={setAccentColor}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          installPrompt={installPrompt}
          onInstallSuccess={() => setInstallPrompt(null)}
        />
      )}
    </div>
  );
}

export default App;
