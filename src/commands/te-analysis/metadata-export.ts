import { createHash, randomBytes } from 'node:crypto';
import { chmod, lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { CliValidationError } from '../../core/errors.js';
import type { Flag, RuntimeContext } from '../../framework/types.js';
import { validateQueriesFlag } from './catalog-list.js';

export const metadataExportOutputFlag: Flag = {
  name: 'output',
  type: 'string',
  required: true,
  desc: 'Local .json output file for the complete matching metadata rows.',
};

export function validateMetadataExportFlags(ctx: RuntimeContext): void {
  validateQueriesFlag(ctx);
  const output = ctx.str('output').trim();
  if (output && extname(output).toLowerCase() !== '.json') {
    throw new CliValidationError('--output must use the .json extension');
  }
}

export function metadataExportPostProcess(resourceType: string, arrayField: string) {
  return async (
    result: unknown,
    _input: Record<string, unknown>,
    ctx: RuntimeContext,
  ): Promise<unknown> => {
    if (typeof result !== 'object' || result === null) {
      throw new Error(`Metadata ${resourceType} export returned an invalid response`);
    }
    const data = result as Record<string, unknown>;
    const rows = data[arrayField];
    if (!Array.isArray(rows)) {
      throw new Error(`Metadata ${resourceType} export response is missing ${arrayField}`);
    }
    if (data.complete !== true
      || typeof data.total !== 'number'
      || data.total !== rows.length) {
      throw new Error(
        `Metadata ${resourceType} export is incomplete: total=${String(data.total)}, rows=${rows.length}, complete=${String(data.complete)}`,
      );
    }

    const outputPath = resolve(ctx.str('output').trim());
    await mkdir(dirname(outputPath), { recursive: true });
    await assertRegularFileOrMissing(outputPath);
    const suffix = `${process.pid}.${randomBytes(8).toString('hex')}`;
    const partPath = `${outputPath}.part.${suffix}`;
    const content = `${JSON.stringify(rows, null, 2)}\n`;
    const bytes = Buffer.byteLength(content, 'utf8');
    let handle: FileHandle | undefined;
    try {
      handle = await open(partPath, 'w', 0o600);
      await handle.write(content, undefined, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await publishExport(partPath, outputPath, suffix);
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await rm(partPath, { force: true }).catch(() => undefined);
      throw error;
    }

    return {
      resource_type: resourceType,
      output_path: outputPath,
      format: 'json',
      row_count: rows.length,
      bytes,
      content_sha256: createHash('sha256').update(content).digest('hex'),
      complete: true,
    };
  };
}

async function publishExport(partPath: string, outputPath: string, suffix: string): Promise<void> {
  const backupPath = `${outputPath}.backup.${suffix}`;
  let backedUp = false;
  let published = false;
  try {
    backedUp = await moveIfExists(outputPath, backupPath);
    await rename(partPath, outputPath);
    published = true;
    await chmod(outputPath, 0o600);
    await rm(backupPath, { force: true });
  } catch (error) {
    if (published) {
      await rm(outputPath, { force: true }).catch(() => undefined);
    }
    if (backedUp) {
      await rename(backupPath, outputPath).catch(() => undefined);
    }
    throw error;
  }
}

async function moveIfExists(source: string, target: string): Promise<boolean> {
  try {
    await rename(source, target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function assertRegularFileOrMissing(filePath: string): Promise<void> {
  try {
    const value = await lstat(filePath);
    if (!value.isFile()) {
      throw new Error(`Metadata export output path must be a regular file: ${filePath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
