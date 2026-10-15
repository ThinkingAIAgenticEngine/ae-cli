import fs from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';

const PART_DATA_LENGTH = 15_000;
const MAX_PART_BYTES = 16 * 1024;
const MAX_PAYLOAD_BYTES = 64 * 1024 * 1024;
const INDEX_MARKER = /<!-- pskb_refresh_state_index\n([^\n]+)\n-->/;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function readLegacyRefreshState(content) {
  const match = String(content).match(/<!-- pskb_refresh_state_base64\n([A-Za-z0-9_=\-\s]+)\n-->/);
  if (!match) throw new Error('Refresh state payload is missing.');
  return JSON.parse(Buffer.from(match[1].replace(/\s+/g, ''), 'base64url').toString('utf8'));
}

export function readRefreshStateIndex(content) {
  const match = String(content).match(INDEX_MARKER);
  if (!match) return null;
  if (Buffer.byteLength(content) > MAX_PART_BYTES) throw new Error('Refresh state index exceeds 16 KiB.');
  const index = JSON.parse(match[1]);
  if (index.schema_version !== '2.0' || index.encoding !== 'brotli-base64url'
      || !/^[a-f0-9]{64}$/.test(index.payload_sha256)
      || !/^[a-f0-9]{64}$/.test(index.normalized_content_hash)
      || !Number.isInteger(index.payload_bytes) || index.payload_bytes < 1 || index.payload_bytes > MAX_PAYLOAD_BYTES
      || !Array.isArray(index.parts) || !index.parts.length) {
    throw new Error('Invalid refresh state index.');
  }
  const seen = new Set();
  for (const part of index.parts) {
    if (!/^[-a-z0-9]+-refresh-state-part-\d{3}\.md$/.test(part.file)
        || !/^[a-f0-9]{64}$/.test(part.sha256)
        || !Number.isInteger(part.bytes) || part.bytes < 1 || part.bytes > MAX_PART_BYTES
        || seen.has(part.file)) throw new Error('Invalid refresh state part metadata.');
    seen.add(part.file);
  }
  return index;
}

export function encodeRefreshState(content, statePath, normalizedContentHash, baseline = null) {
  if (!/^[a-f0-9]{64}$/.test(normalizedContentHash)) throw new Error('Invalid normalized refresh state hash.');
  const payload = readLegacyRefreshState(content);
  if (baseline) payload.source_tree_baseline = baseline;
  const raw = Buffer.from(JSON.stringify(payload));
  const encoded = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).toString('base64url');
  const stem = path.posix.basename(statePath, '.md');
  const parts = [];
  for (let offset = 0; offset < encoded.length; offset += PART_DATA_LENGTH) {
    const number = parts.length + 1;
    const file = `${stem}-part-${String(number).padStart(3, '0')}.md`;
    const data = encoded.slice(offset, offset + PART_DATA_LENGTH);
    const partContent = `# Refresh State Part ${number}\n\nMachine state only. Do not compile as business evidence.\n\n<!-- pskb_refresh_state_part\n${data}\n-->\n`;
    const bytes = Buffer.byteLength(partContent);
    if (bytes > MAX_PART_BYTES) throw new Error('Refresh state part exceeds 16 KiB.');
    parts.push({ file, path: path.posix.join(path.posix.dirname(statePath), file), content: partContent, sha256: sha256(partContent), bytes });
  }
  const index = {
    schema_version: '2.0', encoding: 'brotli-base64url', payload_sha256: sha256(raw),
    payload_bytes: raw.length, normalized_content_hash: normalizedContentHash,
    parts: parts.map(({ file, sha256: hash, bytes }) => ({ file, sha256: hash, bytes })),
  };
  const indexContent = `# Refresh State\n\nMachine state index. Do not compile as business evidence. Read parts only with the CLI refresh-state reader.\n\n<!-- pskb_refresh_state_index\n${JSON.stringify(index)}\n-->\n`;
  if (Buffer.byteLength(indexContent) > MAX_PART_BYTES) throw new Error('Refresh state index exceeds 16 KiB.');
  return { indexContent, parts };
}

export function decodeRefreshState(content, indexFile) {
  const index = readRefreshStateIndex(content);
  if (!index) return { payload: readLegacyRefreshState(content), index: null };
  const stem = path.basename(indexFile, '.md');
  const chunks = index.parts.map((part, position) => {
    if (part.file !== `${stem}-part-${String(position + 1).padStart(3, '0')}.md`) {
      throw new Error(`Unexpected refresh state part name: ${part.file}.`);
    }
    const file = path.join(path.dirname(indexFile), part.file);
    const data = fs.readFileSync(file);
    if (data.length !== part.bytes || data.length > MAX_PART_BYTES || sha256(data) !== part.sha256) {
      throw new Error(`Refresh state part checksum mismatch: ${part.file}.`);
    }
    const match = data.toString('utf8').match(/<!-- pskb_refresh_state_part\n([A-Za-z0-9_-]+)\n-->/);
    if (!match) throw new Error(`Invalid refresh state part: ${part.file}.`);
    return match[1];
  });
  const raw = brotliDecompressSync(Buffer.from(chunks.join(''), 'base64url'), { maxOutputLength: MAX_PAYLOAD_BYTES });
  if (raw.length !== index.payload_bytes || sha256(raw) !== index.payload_sha256) {
    throw new Error('Refresh state payload checksum mismatch.');
  }
  return { payload: JSON.parse(raw.toString('utf8')), index };
}
