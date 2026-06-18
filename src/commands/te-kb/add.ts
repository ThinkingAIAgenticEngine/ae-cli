import { promises as fs } from 'fs';
import * as path from 'path';
import TurndownService from 'turndown';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbUpload } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/sources/upload';
const SUPPORTED_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.csv',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
]);

interface SourceFile {
  filename: string;
  content: BlobPart;
  mimeType: string;
  origin: 'file' | 'dir' | 'url';
  source: string;
}

function normalizeFilesInput(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new Error('--files must be a JSON array of strings, e.g. \'["./a.md","./docs","https://example.com/page"]\'');
  }
  const items: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') {
      throw new Error(`--files entries must be strings (got: ${JSON.stringify(v)})`);
    }
    const trimmed = v.trim();
    if (trimmed) items.push(trimmed);
  }
  return items;
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function classifyInput(item: string): 'url' | 'path' {
  return isUrl(item) ? 'url' : 'path';
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'document';
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.md':
    case '.markdown':
      return 'text/markdown';
    case '.txt':
      return 'text/plain';
    case '.csv':
      return 'text/csv';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.ppt':
      return 'application/vnd.ms-powerpoint';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.bmp':
      return 'image/bmp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

async function readLocalFile(filePath: string): Promise<SourceFile> {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file extension (${ext || 'none'}): ${filePath}`);
  }
  const content = await fs.readFile(filePath);
  const filename = path.basename(filePath);
  return { filename, content, mimeType: getMimeType(filename), origin: 'file', source: filePath };
}

async function readDirectory(dir: string): Promise<SourceFile[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: SourceFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
    const full = path.join(dir, entry.name);
    const content = await fs.readFile(full);
    files.push({ filename: entry.name, content, mimeType: getMimeType(entry.name), origin: 'dir', source: full });
  }
  if (files.length === 0) {
    throw new Error(`No supported files found in directory: ${dir}`);
  }
  return files;
}

function deriveFilenameFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const lastSeg = u.pathname.split('/').filter(Boolean).pop();
    const base = lastSeg ? lastSeg.replace(/\.[^.]+$/, '') : u.hostname;
    return `${sanitizeFilename(base)}.md`;
  } catch {
    return `${sanitizeFilename(rawUrl)}.md`;
  }
}

async function fetchAsMarkdown(rawUrl: string): Promise<SourceFile> {
  const resp = await fetch(rawUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${rawUrl}: HTTP ${resp.status}`);
  }
  const html = await resp.text();
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const markdown = turndown.turndown(html);
  return {
    filename: deriveFilenameFromUrl(rawUrl),
    content: markdown,
    mimeType: 'text/markdown',
    origin: 'url',
    source: rawUrl,
  };
}

async function resolveLocalPath(p: string): Promise<SourceFile[]> {
  const abs = path.resolve(p);
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    throw new Error(`Path not found: ${p}`);
  }
  if (stat.isDirectory()) {
    return readDirectory(abs);
  }
  if (stat.isFile()) {
    return [await readLocalFile(abs)];
  }
  throw new Error(`Unsupported path (not file or directory): ${p}`);
}

async function collectFiles(ctx: RuntimeContext): Promise<SourceFile[]> {
  const items = normalizeFilesInput(ctx.json('files'));
  if (items.length === 0) {
    throw new Error('--files must contain at least one entry');
  }

  const collected: SourceFile[] = [];
  for (const item of items) {
    if (classifyInput(item) === 'url') {
      collected.push(await fetchAsMarkdown(item));
    } else {
      collected.push(...(await resolveLocalPath(item)));
    }
  }

  if (collected.length === 0) {
    throw new Error('No supported files collected from the given inputs');
  }

  return dedupeByFilename(collected);
}

function dedupeByFilename(files: SourceFile[]): SourceFile[] {
  const used = new Map<string, number>();
  return files.map((f) => {
    const count = used.get(f.filename) ?? 0;
    used.set(f.filename, count + 1);
    if (count === 0) return f;
    const ext = path.extname(f.filename);
    const stem = f.filename.slice(0, f.filename.length - ext.length);
    return { ...f, filename: `${stem}-${count}${ext}` };
  });
}

function buildForm(name: string, files: SourceFile[]): FormData {
  const form = new FormData();
  form.append('name', name);
  for (const f of files) {
    form.append('files', new Blob([f.content], { type: f.mimeType }), f.filename);
  }
  return form;
}

export const add: Command = {
  service: 'kb',
  command: '+add',
  description:
    'Upload sources to a knowledge. ' +
    '--files accepts a JSON array; each entry can be a supported file path, a directory path (supported files inside, non-recursive), or an http(s) URL (HTML auto-converted to markdown).',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name' },
    {
      name: 'files',
      type: 'json',
      required: true,
      desc: 'JSON array of strings. Each entry can be a supported file path, a directory path, or an http(s) URL. Example: \'["./a.md","./docs","https://example.com/page"]\'',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    normalizeFilesInput(ctx.json('files'));
  },
  dryRun: (ctx) => {
    const items = normalizeFilesInput(ctx.json('files'));
    return {
      method: 'POST',
      url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
      body: {
        name: ctx.str('name'),
        files: items.map((item) => ({ value: item, type: classifyInput(item) })),
        contentType: 'multipart/form-data',
      },
    };
  },
  execute: async (ctx) => {
    const name = ctx.str('name');
    const files = await collectFiles(ctx);
    const form = buildForm(name, files);
    const result = await kbUpload(ctx, API_PATH, form);
    return {
      uploaded: files.map((f) => ({ filename: f.filename, origin: f.origin, source: f.source })),
      result,
    };
  },
};
