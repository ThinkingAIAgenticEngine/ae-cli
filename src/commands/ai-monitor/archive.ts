import { createHash } from 'node:crypto';
import { lstat, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliApiError, CliValidationError } from '../../core/errors.js';

/** Fail before dispatch when the requested destination already exists, including symlinks. */
export async function ensureNewArchivePath(file: string): Promise<void> {
  try {
    await lstat(resolve(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw new CliValidationError('Cannot inspect --output destination.', { code: 'EXPORT_OUTPUT_UNAVAILABLE' });
  }
  throw new CliValidationError('--output already exists; choose a new file.', { code: 'EXPORT_OUTPUT_EXISTS' });
}

/** Decode only verified archives and never return their base64 contents to stdout. */
export async function saveArchive(result: unknown, file: string) {
  const payload = result as Record<string, any> | null;
  const archive = payload?.archive;
  const invalid = () => new CliApiError('The export archive failed integrity validation.', { code: 'INVALID_EXPORT_ARCHIVE' });
  if (!archive || archive.encoding !== 'base64' || archive.media_type !== 'application/zip'
    || typeof archive.content_base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(archive.content_base64)
    || !Number.isSafeInteger(archive.byte_length) || archive.byte_length < 0
    || typeof archive.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(archive.sha256)) throw invalid();
  const bytes = Buffer.from(archive.content_base64, 'base64');
  if (bytes.toString('base64') !== archive.content_base64 || bytes.length !== archive.byte_length
    || createHash('sha256').update(bytes).digest('hex') !== archive.sha256.toLowerCase()) throw invalid();
  const output = resolve(file);
  let handle;
  try {
    handle = await open(output, 'wx', 0o600);
  } catch (error) {
    throw new CliValidationError((error as NodeJS.ErrnoException).code === 'EEXIST'
      ? '--output already exists; choose a new file.' : 'Cannot create --output file.',
    { code: (error as NodeJS.ErrnoException).code === 'EEXIST' ? 'EXPORT_OUTPUT_EXISTS' : 'EXPORT_OUTPUT_UNAVAILABLE' });
  }
  try {
    await handle.writeFile(bytes);
    await handle.close();
  } catch {
    await handle.close().catch(() => undefined);
    await unlink(output).catch(() => undefined);
    throw new CliValidationError('Could not finish writing the export file.', { code: 'EXPORT_WRITE_FAILED' });
  }
  const { content_base64: _contents, ...metadata } = archive;
  const { archive: _archive, ...rest } = payload!;
  return { ...rest, archive: metadata, output_file: output };
}
