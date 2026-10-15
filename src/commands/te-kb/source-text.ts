import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { kbApi } from '../../core/mcp-access.js';

const API = '/agent/api/external/knowledge-bases';
export const textApiOptions = { preserveErrorMetadata: true, retryUnauthorized: false, redactErrorDetails: true };
const maxBytes = 50 * 1024 * 1024;
const targetFlags: Flag[] = [
  { name: 'name', type: 'string', required: true, desc: 'Exact knowledge base name from kb +list' },
  { name: 'scope', type: 'string', required: true, desc: 'Exact knowledge base scope: personal or company' },
];
export const textInputFlags: Flag[] = [
  { name: 'text', type: 'string', sensitive: true, desc: 'Complete text body; mutually exclusive with --file and --stdin' },
  { name: 'file', type: 'string', desc: 'One UTF-8 .md, .markdown or .txt file, at most 50 MiB; creates a Markdown source' },
  { name: 'stdin', type: 'boolean', desc: 'Explicitly read the complete UTF-8 body from stdin; mutually exclusive with --text and --file' },
];

export function hasTextFlag(ctx: RuntimeContext): boolean {
  return ctx.has ? ctx.has('text') : Boolean(ctx.str('text'));
}

export function validateTextInput(ctx: RuntimeContext): void {
  const hasFile = ctx.has ? ctx.has('file') : Boolean(ctx.str('file'));
  const count = Number(hasTextFlag(ctx)) + Number(hasFile) + Number(ctx.bool('stdin'));
  if (count !== 1) throw new CliValidationError('Provide exactly one of --text, --file or --stdin.');
  if (hasFile && !ctx.str('file').trim()) throw new CliValidationError('--file must name a regular file.');
}

function validateTarget(ctx: RuntimeContext): void {
  const name = ctx.str('name');
  if (!name.trim() || name.length > 200 || /[\x00-\x1f\x7f]/.test(name)) {
    throw new CliValidationError('--name must contain 1 to 200 characters without control characters.');
  }
  if (!['personal', 'company'].includes(ctx.str('scope'))) throw new CliValidationError('--scope must be personal or company.');
}

function tooLarge(): CliValidationError {
  return new CliValidationError('Text content exceeds 50 MiB (52428800 UTF-8 bytes).', { code: 'SOURCE_FILE_TOO_LARGE' });
}

async function boundedBytes(stream: AsyncIterable<Buffer | string>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maxBytes) throw tooLarge();
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, size);
}

/** Decode without stripping a BOM or normalizing line endings. */
export async function readTextInput(ctx: RuntimeContext): Promise<{ content: string; sizeBytes: number }> {
  validateTextInput(ctx);
  let content: string;
  if (hasTextFlag(ctx)) {
    content = ctx.str('text');
    if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(content)) {
      throw new CliValidationError('Text content must contain valid Unicode.', { code: 'SOURCE_TEXT_ENCODING_UNSUPPORTED' });
    }
  } else {
    let bytes: Buffer;
    if (ctx.bool('stdin')) {
      if (process.stdin.isTTY) throw new CliValidationError('--stdin requires piped UTF-8 input; interactive input is not supported.');
      bytes = await boundedBytes(process.stdin);
    } else {
      const filename = path.resolve(ctx.str('file'));
      if (!['.md', '.markdown', '.txt'].includes(path.extname(filename).toLowerCase())) {
        throw new CliValidationError('--file must be a UTF-8 .md, .markdown or .txt file.');
      }
      const handle = await fs.open(filename, 'r');
      try {
        const stat = await handle.stat();
        if (!stat.isFile()) throw new CliValidationError('--file must be a regular file.');
        if (stat.size > maxBytes) throw tooLarge();
        bytes = await boundedBytes(handle.createReadStream({ autoClose: false }));
      } finally {
        await handle.close();
      }
    }
    try {
      content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new CliValidationError('Text input must be valid UTF-8; no encoding conversion is performed.', { code: 'SOURCE_TEXT_ENCODING_UNSUPPORTED' });
    }
  }
  const sizeBytes = Buffer.byteLength(content, 'utf8');
  if (sizeBytes > maxBytes) throw tooLarge();
  if (!content.trim()) throw new CliValidationError('Text content must not be empty or whitespace-only.', { code: 'SOURCE_TEXT_EMPTY' });
  return { content, sizeBytes };
}

function target(ctx: RuntimeContext): Record<string, string> {
  return { name: ctx.str('name').trim(), scope: ctx.str('scope') };
}

export const sourceCreateText: Command = {
  service: 'kb', resource: 'source', command: 'create-text', risk: 'write',
  description: 'Create one ordinary Markdown source from text, a UTF-8 file or stdin. Saves only; does not compile or publish.',
  flags: [...targetFlags,
    { name: 'title', type: 'string', desc: 'Optional display title (1-200 Unicode characters); the server derives it from content when omitted' },
    ...textInputFlags],
  validate: (ctx) => {
    validateTarget(ctx);
    validateTextInput(ctx);
    if (ctx.has?.('title') || ctx.str('title')) {
      const title = ctx.str('title').trim();
      if (!title || [...title].length > 200 || /[\p{Cc}/\\]/u.test(title) || ['.', '..'].includes(title)) {
        throw new CliValidationError('--title must contain 1 to 200 Unicode characters without control characters or path separators.');
      }
    }
  },
  dryRun: async (ctx) => {
    const { sizeBytes } = await readTextInput(ctx);
    return { method: 'POST', url: `${ctx.host().replace(/\/$/, '')}${API}/sources/text`,
      body: { ...target(ctx), ...(ctx.str('title') ? { title: ctx.str('title').trim() } : {}), inputMethod: 'text_input', content: '<redacted>' }, sizeBytes };
  },
  execute: async (ctx) => kbApi(ctx, 'POST', `${API}/sources/text`, {}, {
    ...target(ctx), ...(ctx.str('title') ? { title: ctx.str('title').trim() } : {}),
    content: (await readTextInput(ctx)).content, inputMethod: 'text_input',
  }, textApiOptions),
};

async function outputPath(ctx: RuntimeContext): Promise<string | undefined> {
  if (!ctx.str('out')) return undefined;
  const output = path.resolve(ctx.str('out'));
  try {
    await fs.lstat(output);
  } catch (error: any) {
    if (error.code === 'ENOENT') return output;
    throw error;
  }
  throw new CliValidationError('--out must name a new file; existing files are never overwritten.');
}

export const sourceReadText: Command = {
  service: 'kb', resource: 'source', command: 'read-text', risk: 'read',
  sensitiveOutput: true,
  description: 'Read complete ordinary UTF-8 text with its matching revision and format. Optionally save original bytes to a new local file.',
  flags: [...targetFlags,
    { name: 'id', type: 'string', required: true, desc: 'Current stable source ID from kb +list-sources' },
    { name: 'out', type: 'string', desc: 'Write the complete original UTF-8 bytes to a new file; output metadata only and never overwrite' }],
  validate: (ctx) => {
    validateTarget(ctx);
    const id = ctx.str('id');
    if (!id.trim() || id.length > 191 || /[\x00-\x1f\x7f]/.test(id)) throw new CliValidationError('--id must contain 1 to 191 characters without control characters.');
    if (ctx.has?.('out') && !ctx.str('out').trim()) throw new CliValidationError('--out must name a new file.');
  },
  dryRun: async (ctx) => ({ method: 'GET', url: `${ctx.host().replace(/\/$/, '')}${API}/sources/${encodeURIComponent(ctx.str('id').trim())}/text`,
    params: target(ctx), ...(ctx.str('out') ? { out: await outputPath(ctx) } : {}) }),
  execute: async (ctx) => {
    const output = await outputPath(ctx);
    const result = await kbApi(ctx, 'GET', `${API}/sources/${encodeURIComponent(ctx.str('id').trim())}/text`, target(ctx), undefined, textApiOptions);
    if (!result || typeof result.content !== 'string' || !['markdown', 'text'].includes(result.contentFormat)
      || !Number.isSafeInteger(result.item?.contentRevision) || result.item.contentRevision < 1) {
      throw new Error('KB text protocol error: expected complete content, format and a positive contentRevision.');
    }
    if (!output) return result;
    await fs.writeFile(output, result.content, { encoding: 'utf8', flag: 'wx' });
    return { item: result.item, contentFormat: result.contentFormat, out: output };
  },
};
