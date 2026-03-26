export interface Note {
  id: string; // Typically the filename or a UUID
  content: string; // The raw markdown body without the frontmatter (or with it, depending on parse logic)
  frontmatter: NoteFrontmatter;
  raw: string; // The complete raw file string
}

export interface NoteFrontmatter {
  "created-at": string; // ISO string
  "updated-at": string; // ISO string
  tags: string[];
  title?: string; // Optional title extracted or stored in frontmatter
  parentId?: string; // Used for comments replying to other notes
}

export interface GitHubCredentials {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';
