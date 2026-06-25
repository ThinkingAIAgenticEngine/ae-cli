import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getPackageRoot } from '../paths.js';

const WIKI_ROOT = join(getPackageRoot(), 'wiki/te-docs');

export function readSynthesis(slug: string): string | null {
  const p = join(WIKI_ROOT, 'synthesis', `${slug}.md`);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

export interface IndexHit {
  name: string;
  rawPath: string;
  sourceUrl: string;
}

export function searchIndex(keyword: string): IndexHit[] {
  const indexPath = join(WIKI_ROOT, 'index.md');
  if (!existsSync(indexPath)) return [];
  const lines = readFileSync(indexPath, 'utf8').split('\n');
  const kw = keyword.toLowerCase();
  const hits: IndexHit[] = [];
  for (const line of lines) {
    const m = /^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|.*\|\s*\[docs\]\(([^)]+)\)\s*\|$/.exec(line);
    if (!m) continue;
    const [, name, rawPath, sourceUrl] = m;
    if (name.toLowerCase().includes(kw) || rawPath.toLowerCase().includes(kw)) {
      hits.push({ name, rawPath, sourceUrl });
    }
  }
  return hits;
}

export function readRaw(relPath: string): string {
  const p = join(WIKI_ROOT, relPath);
  return readFileSync(p, 'utf8');
}
