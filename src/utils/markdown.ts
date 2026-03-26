import yaml from 'js-yaml';
import type { NoteFrontmatter } from '../types';

export function parseMarkdownBase(raw: string): { frontmatter: NoteFrontmatter; content: string } {
  // Regex to match YAML frontmatter
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = raw.match(frontmatterRegex);

  if (match) {
    try {
      const frontmatter = yaml.load(match[1]) as NoteFrontmatter;
      // Ensure specific keys exist
      if (!frontmatter['created-at']) frontmatter['created-at'] = new Date().toISOString();
      if (!frontmatter['updated-at']) frontmatter['updated-at'] = new Date().toISOString();
      if (!frontmatter.tags) frontmatter.tags = [];

      return {
        frontmatter,
        content: match[2].trimStart()
      };
    } catch (e) {
      console.warn('Failed to parse frontmatter', e);
    }
  }

  // Fallback if no frontmatter found or parse failed
  return {
    frontmatter: {
      'created-at': new Date().toISOString(),
      'updated-at': new Date().toISOString(),
      tags: []
    },
    content: raw
  };
}

export function stringifyMarkdown(frontmatter: NoteFrontmatter, content: string): string {
  try {
    const yamlString = yaml.dump(frontmatter);
    return `---\n${yamlString}---\n${content}`;
  } catch (e) {
    console.error('Failed to stringify frontmatter', e);
    return content;
  }
}
