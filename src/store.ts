import { useState, useEffect } from 'react';
import type { Note, GitHubCredentials } from './types';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const STORAGE_KEY = 'notetag_notes';
const GITHUB_CREDS_KEY = 'notetag_github_creds';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const saveNote = (note: Note) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === note.id);
      if (idx !== -1) {
        const newNotes = [...prev];
        newNotes[idx] = note;
        return newNotes;
      }
      return [note, ...prev];
    });
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const createNote = (): Note => {
    const now = dayjs().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      raw: '',
      content: '',
      frontmatter: {
        'created-at': now,
        'updated-at': now,
        tags: []
      }
    };
    saveNote(newNote);
    return newNote;
  };

  // Bulk update (e.g., from github sync)
  const setAllNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
  };

  return { notes, saveNote, deleteNote, createNote, setAllNotes };
}

export function useGitHubCredentials() {
  const [creds, setCreds] = useState<GitHubCredentials | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(GITHUB_CREDS_KEY);
    if (saved) {
      try {
        setCreds(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const saveCreds = (newCreds: GitHubCredentials) => {
    setCreds(newCreds);
    localStorage.setItem(GITHUB_CREDS_KEY, JSON.stringify(newCreds));
  };

  const clearCreds = () => {
    setCreds(null);
    localStorage.removeItem(GITHUB_CREDS_KEY);
  };

  return { creds, saveCreds, clearCreds };
}

export function useFont() {
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('notetag-font') || "'Inter', sans-serif";
  });

  useEffect(() => {
    localStorage.setItem('notetag-font', fontFamily);
  }, [fontFamily]);

  return { fontFamily, setFontFamily };
}
