import type { Note, GitHubCredentials } from './types';
import { parseMarkdownBase, stringifyMarkdown } from './utils/markdown';

const GITHUB_API = 'https://api.github.com';

async function fetchFromGitHub(endpoint: string, creds: GitHubCredentials, options: RequestInit = {}) {
  const url = `${GITHUB_API}/repos/${creds.owner}/${creds.repo}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `token ${creds.token}`,
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers,
    }
  });
  
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`GitHub API Error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`);
    (error as any).status = response.status;
    throw error;
  }
  
  // if 204 No Content, don't parse json
  if (response.status === 204) return null;
  
  return response.json();
}

function encodeUtf8ToBase64(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}

async function getFileSha(creds: GitHubCredentials, fullPath: string): Promise<string | undefined> {
  try {
    const fileData = await fetchFromGitHub(`/contents/${fullPath}`, creds);
    return fileData?.sha;
  } catch (err: any) {
    if (err.status === 404) return undefined;
    throw err;
  }
}

async function upsertFileWithRetry(
  creds: GitHubCredentials,
  fullPath: string,
  message: string,
  rawContent: string,
  initialSha?: string
): Promise<void> {
  const base64Content = encodeUtf8ToBase64(rawContent);
  let sha = initialSha;

  // First try with the provided SHA (if any), then retry once with a fresh SHA on conflict.
  for (let attempt = 0; attempt < 2; attempt++) {
    const body: any = {
      message,
      content: base64Content
    };
    if (sha) body.sha = sha;

    try {
      await fetchFromGitHub(`/contents/${fullPath}`, creds, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      return;
    } catch (err: any) {
      if (err.status === 409 && attempt === 0) {
        sha = await getFileSha(creds, fullPath);
        continue;
      }
      throw err;
    }
  }
}

async function deleteFileWithRetry(creds: GitHubCredentials, fullPath: string, message: string): Promise<void> {
  let sha = await getFileSha(creds, fullPath);
  if (!sha) return;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await fetchFromGitHub(`/contents/${fullPath}`, creds, {
        method: 'DELETE',
        body: JSON.stringify({
          message,
          sha
        })
      });
      return;
    } catch (err: any) {
      if (err.status === 409 && attempt === 0) {
        sha = await getFileSha(creds, fullPath);
        if (!sha) return;
        continue;
      }
      if (err.status === 404) return;
      throw err;
    }
  }
}

/**
 * Pull all notes from the "notes" folder in the target repo.
 */
export async function pullNotes(creds: GitHubCredentials): Promise<Note[]> {
  try {
    const path = 'notes';
    let dirContents: any;
    try {
      dirContents = await fetchFromGitHub(`/contents/${path}`, creds);
    } catch (err: any) {
      if (err.message.includes('404')) {
        return []; // Directory doesn't exist yet, return empty list
      }
      throw err;
    }

    if (!Array.isArray(dirContents)) {
      throw new Error('/notes is not a directory');
    }

    const mdFiles = dirContents.filter(f => f.name.endsWith('.md'));
    const pulledNotes: Note[] = [];

    for (const file of mdFiles) {
      const fileData = await fetchFromGitHub(`/contents/${file.path}`, creds);
      
      // Content is base64 encoded, decode it properly handling unicode
      const contentStr = decodeURIComponent(escape(atob(fileData.content)));
      const { frontmatter, content } = parseMarkdownBase(contentStr);
      
      pulledNotes.push({
        id: file.name.replace('.md', ''),
        raw: contentStr,
        content,
        frontmatter
      });
    }

    return pulledNotes;
  } catch (error) {
    console.error('Error in pullNotes:', error);
    throw error;
  }
}

/**
 * Push local notes to GitHub "notes" folder.
 */
export async function pushNotes(creds: GitHubCredentials, localNotes: Note[]): Promise<void> {
  const path = 'notes';
  
  // 1. Get current files to know SHAs for updates
  let currentFiles: Record<string, string> = {}; // filename -> sha
  try {
    const dirContents = await fetchFromGitHub(`/contents/${path}`, creds);
    if (Array.isArray(dirContents)) {
      dirContents.forEach(f => {
        if (f.name.endsWith('.md')) {
          currentFiles[f.name] = f.sha;
        }
      });
    }
  } catch (err: any) {
    // 404 is fine, means folder is empty or doesn't exist
  }

  // 2. Add or update files
  for (const note of localNotes) {
    // Use an id slug if title missing, fallback to uuid id
    const filename = `${note.id}.md`;
    const fullPath = `notes/${filename}`;
    
    // Always regenerate the raw file text before push to ensure it matches current frontmatter mapping
    const rawContent = stringifyMarkdown(note.frontmatter, note.content);
    
    await upsertFileWithRetry(
      creds,
      fullPath,
      `Update ${filename} via NoteTag`,
      rawContent,
      currentFiles[filename]
    );
  }
}

/**
 * Pushes a single note to GitHub natively for auto-sync.
 */
export async function pushSingleNote(creds: GitHubCredentials, note: Note): Promise<void> {
  const filename = `${note.id}.md`;
  const fullPath = `notes/${filename}`;

  const rawContent = stringifyMarkdown(note.frontmatter, note.content);
  
  // Get the current SHA before pushing (needed for PUT requests)
  const sha = await getFileSha(creds, fullPath);

  await upsertFileWithRetry(
    creds,
    fullPath,
    `Auto-sync ${filename} via NoteTag`,
    rawContent,
    sha
  );
}

/**
 * Deletes a single note from GitHub natively for auto-sync.
 */
export async function deleteSingleNote(creds: GitHubCredentials, noteId: string): Promise<void> {
  const fullPath = `notes/${noteId}.md`;
  await deleteFileWithRetry(creds, fullPath, `Delete ${noteId}.md via NoteTag`);
}
