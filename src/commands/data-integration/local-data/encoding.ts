import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { openSync, readSync, closeSync } from 'node:fs';
import type { Readable } from 'node:stream';

const require = createRequire(import.meta.url);
const jschardet = require('jschardet') as { detect(buffer: Buffer): { encoding: string | null } };
const iconv = require('iconv-lite') as {
  decode(buffer: Buffer, encoding: string): string;
  decodeStream(encoding: string): Readable;
  encodingExists(encoding: string): boolean;
};

export const ENCODING_FALLBACKS = ['utf-8', 'gbk', 'gb2312', 'latin1'];

const NODE_ENCODINGS = new Set(['utf-8', 'utf8', 'utf16le', 'ucs2', 'latin1', 'ascii', 'base64', 'hex']);
const NODE_UTF8 = new Set(['utf-8', 'utf8']);

const DETECT_SAMPLE_BYTES = 64 * 1024;

/** Detect the source file's text encoding (jschardet over a bounded sample). */
export function detectEncoding(filePath: string): string {
  const raw = readSample(filePath, DETECT_SAMPLE_BYTES);
  const detected = jschardet.detect(raw);
  const encoding = (detected.encoding || 'utf-8').toLowerCase();
  if (NODE_ENCODINGS.has(encoding) || iconv.encodingExists(encoding)) return encoding;
  return 'utf-8';
}

/** Decode a raw buffer with a named encoding (Node built-ins via toString, others via iconv-lite). */
export function decodeBuffer(raw: Buffer, encoding: string): string {
  const normalized = encoding.toLowerCase();
  if (NODE_ENCODINGS.has(normalized)) return raw.toString(normalized as BufferEncoding);
  return iconv.decode(raw, normalized);
}

/** Return a decoded text stream for a file. UTF-8 uses the native reader; others pipe raw bytes through iconv. */
export function decodeTextStream(filePath: string, encoding: string): Readable {
  const normalized = encoding.toLowerCase();
  if (NODE_UTF8.has(normalized)) return createReadStream(filePath, { encoding: 'utf8' });
  if (!iconv.encodingExists(normalized)) {
    throw new Error(`Unsupported source encoding: ${encoding}`);
  }
  return createReadStream(filePath).pipe(iconv.decodeStream(normalized));
}

/** Decode the first `maxBytes` of a file (used for delimiter/format sniffing). */
export function decodeFileSample(filePath: string, encoding: string, maxBytes = DETECT_SAMPLE_BYTES): string {
  return decodeBuffer(readSample(filePath, maxBytes), encoding);
}

function readSample(filePath: string, maxBytes: number): Buffer {
  const fd = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(maxBytes);
    const read = readSync(fd, buffer, 0, maxBytes, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}
