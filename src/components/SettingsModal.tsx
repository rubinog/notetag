import React, { useState } from 'react';
import type { GitHubCredentials, Note } from '../types';
import { pullNotes, pushNotes } from '../github';
import { Settings, RefreshCw, UploadCloud, DownloadCloud, Type, Palette, X, Info, Download, Sun, Moon, Monitor } from 'lucide-react';

interface SettingsModalProps {
  creds: GitHubCredentials | null;
  onSaveCreds: (creds: GitHubCredentials) => void;
  onClearCreds: () => void;
  onClose: () => void;
  localNotes: Note[];
  onSyncComplete: (notes: Note[]) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  installPrompt?: any; // BeforeInstallPromptEvent
  onInstallSuccess?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  creds, onSaveCreds, onClearCreds, onClose, localNotes, onSyncComplete, 
  accentColor, setAccentColor, fontFamily, setFontFamily, theme, setTheme,
  installPrompt, onInstallSuccess
}) => {
  const [token, setToken] = useState(creds?.token || '');
  const [owner, setOwner] = useState(creds?.owner || '');
  const [repo, setRepo] = useState(creds?.repo || '');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  const fontOptions = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Outfit', value: 'Outfit, sans-serif' },
    { label: 'Delius', value: 'Delius, cursive' },
    { label: 'The Girl Next Door', value: "'The Girl Next Door', cursive" },
    { label: 'Fira Code', value: '"Fira Code", monospace' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCreds({ token, owner, repo });
    setSyncMessage('Credentials saved.');
  };

  const handlePull = async () => {
    if (!creds) return;
    setIsSyncing(true);
    setSyncMessage('Pulling from GitHub...');
    try {
      const notes = await pullNotes(creds);
      onSyncComplete(notes);
      setSyncMessage(`Successfully pulled ${notes.length} notes.`);
    } catch (err: any) {
      setSyncMessage(`Error pulling: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePush = async () => {
    if (!creds) return;
    setIsSyncing(true);
    setSyncMessage('Pushing to GitHub...');
    try {
      await pushNotes(creds, localNotes);
      setSyncMessage(`Successfully pushed ${localNotes.length} notes.`);
    } catch (err: any) {
      setSyncMessage(`Error pushing: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the installation prompt
    installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      onInstallSuccess?.();
    } else {
      console.log('User dismissed the PWA install prompt');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.15rem' }}><Settings size={20} /> Settings</h2>
          <button className="btn-icon" onClick={onClose}><X size={20}/></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', marginBottom: '1.25rem' }}>
          <button 
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`} 
            onClick={() => setActiveTab('general')}
            style={{ flex: 1 }}
          >
            General
          </button>
          <button 
            className={`tab-button ${activeTab === 'sync' ? 'active' : ''}`} 
            onClick={() => setActiveTab('sync')}
            style={{ flex: 1 }}
          >
            GitHub Sync
          </button>
        </div>

        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>
                  <Type size={18} style={{ color: 'var(--accent-primary)' }}/> App Overview
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  <p><strong>NoteTag v1.03</strong></p>
                  <p>A Markdown notebook inspired by Memos that keeps your data in your browser or in your personal GitHub cloud, with full traceability.</p>
                </div>
              </div>
            </div>

            {/* PWA Install Section */}
            {installPrompt && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid var(--accent-primary)', animation: 'pulse-border 2s infinite' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>
                    <Download size={18} style={{ color: 'var(--accent-primary)' }}/> Install NoteTag
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                    <p>You can install NoteTag as a native app on your PC or smartphone for quick access and offline support.</p>
                  </div>
                  <button onClick={handleInstallClick} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Install Now
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>
                  <Palette size={18} style={{ color: 'var(--accent-primary)' }}/> Theme Mode
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  <p>Choose light, dark, or follow your device setting:</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setTheme('light')}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      borderColor: theme === 'light' ? 'var(--accent-primary)' : 'var(--border-strong)',
                      color: theme === 'light' ? 'var(--accent-primary)' : 'var(--text-main)',
                      background: theme === 'light' ? 'var(--accent-glow)' : 'transparent'
                    }}
                  >
                    <Sun size={16} /> Light
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setTheme('dark')}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      borderColor: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-strong)',
                      color: theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-main)',
                      background: theme === 'dark' ? 'var(--accent-glow)' : 'transparent'
                    }}
                  >
                    <Moon size={16} /> Dark
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setTheme('system')}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      borderColor: theme === 'system' ? 'var(--accent-primary)' : 'var(--border-strong)',
                      color: theme === 'system' ? 'var(--accent-primary)' : 'var(--text-main)',
                      background: theme === 'system' ? 'var(--accent-glow)' : 'transparent'
                    }}
                  >
                    <Monitor size={16} /> System
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>
                  <Palette size={18} style={{ color: 'var(--accent-primary)' }}/> Theme and Accent Color
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  <p>Choose your preferred accent color for the interface:</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f97316', '#64748b', '#14b8a6', '#eab308'].map(color => (
                    <div 
                      key={color} 
                      onClick={() => setAccentColor(color)}
                      style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', background: color, cursor: 'pointer', 
                        border: accentColor === color ? '3px solid var(--text-main)' : '3px solid transparent',
                        boxShadow: 'var(--shadow-sm)'
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>
                  <Type size={18} style={{ color: 'var(--accent-primary)' }}/> Typography
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  <p>Choose your preferred font for NoteTag:</p>
                </div>
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-strong)', 
                    cursor: 'pointer', 
                    fontFamily: 'inherit',
                    width: '100%',
                    marginTop: '1rem',
                    background: 'var(--bg-panel)',
                    color: 'var(--text-main)'
                  }}
                >
                  {fontOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'sync' && (
          <>
            <details style={{ padding: '0.75rem 1rem', background: 'var(--bg-base)', border: '1px solid var(--border-soft)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <summary style={{ color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', verticalAlign: 'middle' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={16} style={{ color: 'var(--accent-primary)' }}/> How to configure synchronization
                  </span>
                </span>
              </summary>
              <ul style={{ margin: 0, marginTop: '0.75rem', paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                <li style={{ marginBottom: '0.25rem' }}>Create a private repository on your GitHub account (e.g. <code>my-notes</code>).</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Owner:</strong> your GitHub username. <strong>Repository:</strong> your repository name.</li>
                <li><strong>PAT (Token):</strong> Go to GitHub at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Developer Settings &gt; Personal access tokens</a>. Generate a new "Classic" token by enabling the <strong>repo</strong> scope (or a fine-grained token with read/write access to <em>Contents</em>). Copy the <code>ghp_...</code> code and paste it here.</li>
              </ul>
            </details>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Personal Access Token (PAT)</label>
                <input 
                  type="password" 
                  required 
                  value={token} 
                  onChange={e => setToken(e.target.value)} 
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Owner (Username)</label>
                  <input required value={owner} onChange={e => setOwner(e.target.value)} placeholder="octocat" style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Repository</label>
                  <input required value={repo} onChange={e => setRepo(e.target.value)} placeholder="my-notes" style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Config</button>
                <button type="button" className="btn" onClick={onClearCreds} style={{ color: 'var(--danger)', borderColor: 'var(--border-strong)' }}>Clear</button>
              </div>
            </form>

            {creds ? (
              <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Manual Synchronization</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn" onClick={handlePull} disabled={isSyncing} style={{ flex: 1, justifyContent: 'center' }}>
                    <DownloadCloud size={18} /> Pull (Overwrite Local)
                  </button>
                  <button className="btn" onClick={handlePush} disabled={isSyncing} style={{ flex: 1, justifyContent: 'center' }}>
                    <UploadCloud size={18} /> Push (Overwrite Remote)
                  </button>
                </div>
                {syncMessage && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSyncing && <RefreshCw size={14} className="spin-animation" />}
                    {syncMessage}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Save your credentials to enable GitHub sync actions.
              </div>
            )}
          </>
        )}
        
      </div>
    </div>
  );
};
