import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { CliValidationError } from '../../core/errors.js';
import { getCliToken } from '../../core/cli-token.js';
import {
  downloadAnalysisArtifact,
  type AsyncRunDescriptor,
} from '../../core/analysis-async-artifact.js';
import type { Flag, RuntimeContext } from '../../framework/types.js';

export const queriesFlag: Flag = {
  name: 'queries',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of 1 to 20 keyword filters. Results match any keyword.',
};

export const catalogExportOutputFlag: Flag = {
  name: 'output',
  type: 'string',
  required: true,
  desc: 'JSONL output file path. Full rows stay in this file; completeness and identity metadata is written to the adjacent .meta.json file.',
};

export function validateCatalogListFlags(ctx: RuntimeContext): void {
  validateQueriesFlag(ctx);
}

export function validateCatalogExportFlags(ctx: RuntimeContext): void {
  validateQueriesFlag(ctx);
  const output = ctx.str('output');
  if (!output) {
    throw new CliValidationError('--output is required');
  }
  if (extname(output).toLowerCase() !== '.jsonl') {
    throw new CliValidationError('--output must use the .jsonl extension');
  }
}

export function catalogArtifactMaterializer(resourceType: string) {
  return async ({
    ctx,
    runId,
    artifactId,
    output,
    force,
    signal,
    finalDescriptor,
  }: {
    ctx: RuntimeContext;
    runId: string;
    artifactId: string;
    output: string;
    force: boolean;
    signal: AbortSignal;
    finalDescriptor: AsyncRunDescriptor;
  }): Promise<unknown> => {
    const outputPath = resolve(output);
    const metaPath = join(
      dirname(outputPath),
      `${basename(outputPath, extname(outputPath))}.meta.json`,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await assertRegularFileOrMissing(outputPath, force);
    await assertRegularFileOrMissing(metaPath, force);
    const suffix = `${process.pid}.${randomBytes(8).toString('hex')}`;
    const partPath = `${outputPath}.part.${suffix}`;
    const metaPartPath = `${metaPath}.part.${suffix}`;
    let handle: FileHandle | undefined;
    try {
      const download = await downloadAnalysisArtifact(
        ctx.host(),
        runId,
        artifactId,
        partPath,
        { force: true, signal, ensureReady: false },
      );
      const hash = createHash('sha256');
      let bytes = 0;
      let rows = 0;
      for await (const chunk of createReadStream(partPath)) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        hash.update(buffer);
        bytes += buffer.length;
        for (const value of buffer) {
          if (value === 0x0a) rows++;
        }
      }
      const contentSha256 = hash.digest('hex');
      const token = await getCliToken(ctx.host());
      const metadata = {
        schema_version: 1,
        resource_type: resourceType,
        host: ctx.host(),
        project_id: ctx.num('project-id'),
        principal_fingerprint: `sha256:${createHash('sha256').update(token).digest('hex')}`,
        generated_at: new Date().toISOString(),
        row_count: rows,
        complete: true,
        content_sha256: contentSha256,
        run_id: runId,
        artifact_id: artifactId,
      };
      handle = await open(metaPartPath, 'w', 0o600);
      await handle.write(`${JSON.stringify(metadata)}\n`, undefined, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await publishCatalogPair(partPath, outputPath, metaPartPath, metaPath, suffix);
      return {
        ...finalDescriptor,
        ...download,
        output_path: outputPath,
        metadata_path: metaPath,
        format: 'jsonl',
        row_count: rows,
        bytes,
        content_sha256: contentSha256,
        complete: true,
      };
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await rm(partPath, { force: true }).catch(() => undefined);
      await rm(metaPartPath, { force: true }).catch(() => undefined);
      throw error;
    }
  };
}

export async function preflightCatalogArtifactOutput({
  output,
  force,
}: {
  ctx: RuntimeContext;
  output: string;
  force: boolean;
}): Promise<void> {
  const outputPath = resolve(output);
  const metaPath = join(
    dirname(outputPath),
    `${basename(outputPath, extname(outputPath))}.meta.json`,
  );
  await assertRegularFileOrMissing(outputPath, force);
  await assertRegularFileOrMissing(metaPath, force);
}

export function validateQueriesFlag(ctx: RuntimeContext): void {
  const queries = ctx.json('queries');
  if (queries === undefined || queries === null) return;
  if (!Array.isArray(queries)
    || queries.length < 1
    || queries.length > 20
    || queries.some((query) => typeof query !== 'string' || query.trim().length === 0)) {
    throw new CliValidationError('--queries must be a JSON array containing 1 to 20 non-empty strings');
  }
}

export function optionalQueries(ctx: RuntimeContext): string[] | undefined {
  const value = ctx.json('queries');
  return value === undefined || value === null ? undefined : value;
}

export function catalogExportPostProcess(resourceType: string, arrayField: string) {
  return async (
    result: unknown,
    input: Record<string, unknown>,
    ctx: RuntimeContext,
  ): Promise<unknown> => {
    if (typeof result !== 'object' || result === null) {
      throw new Error(`Full ${resourceType} catalog returned an invalid response`);
    }
    const data = result as Record<string, unknown>;
    const rows = data[arrayField];
    if (!Array.isArray(rows)) {
      throw new Error(`Full ${resourceType} catalog response is missing ${arrayField}`);
    }
    if (data.complete !== true
      || typeof data.total !== 'number'
      || data.total !== rows.length) {
      throw new Error(
        `Full ${resourceType} catalog is incomplete: total=${String(data.total)}, rows=${rows.length}, complete=${String(data.complete)}`,
      );
    }

    const outputPath = resolve(ctx.str('output'));
    const metaPath = join(
      dirname(outputPath),
      `${basename(outputPath, extname(outputPath))}.meta.json`,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await assertRegularFileOrMissing(outputPath);
    await assertRegularFileOrMissing(metaPath);
    const suffix = `${process.pid}.${randomBytes(8).toString('hex')}`;
    const partPath = `${outputPath}.part.${suffix}`;
    const metaPartPath = `${metaPath}.part.${suffix}`;
    const hash = createHash('sha256');
    let bytes = 0;
    let handle: FileHandle | undefined;
    try {
      handle = await open(partPath, 'w', 0o600);
      for (const row of rows) {
        const line = `${JSON.stringify(row)}\n`;
        const buffer = Buffer.from(line, 'utf8');
        hash.update(buffer);
        bytes += buffer.length;
        await handle.write(buffer);
      }
      await handle.sync();
      await handle.close();
      handle = undefined;
      const contentSha256 = hash.digest('hex');
      const token = await getCliToken(ctx.host());
      const metadata = {
        schema_version: 1,
        resource_type: resourceType,
        host: ctx.host(),
        project_id: input.project_id,
        principal_fingerprint: `sha256:${createHash('sha256').update(token).digest('hex')}`,
        generated_at: new Date().toISOString(),
        row_count: rows.length,
        complete: true,
        content_sha256: contentSha256,
      };
      handle = await open(metaPartPath, 'w', 0o600);
      await handle.write(`${JSON.stringify(metadata)}\n`, undefined, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await publishCatalogPair(partPath, outputPath, metaPartPath, metaPath, suffix);

      return {
        resource_type: resourceType,
        output_path: outputPath,
        metadata_path: metaPath,
        format: 'jsonl',
        row_count: rows.length,
        bytes,
        content_sha256: contentSha256,
        complete: true,
      };
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await rm(partPath, { force: true }).catch(() => undefined);
      await rm(metaPartPath, { force: true }).catch(() => undefined);
      throw error;
    }
  };
}

async function assertRegularFileOrMissing(filePath: string, allowReplace = true): Promise<void> {
  try {
    const value = await lstat(filePath);
    if (!value.isFile()) {
      throw new Error(`Catalog output path must be a regular file: ${filePath}`);
    }
    if (!allowReplace) {
      throw new Error(`Catalog output path already exists: ${filePath}. Use --force to replace it.`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

async function publishCatalogPair(
  dataPartPath: string,
  dataPath: string,
  metaPartPath: string,
  metaPath: string,
  suffix: string,
): Promise<void> {
  const dataBackupPath = `${dataPath}.backup.${suffix}`;
  const metaBackupPath = `${metaPath}.backup.${suffix}`;
  let dataBackedUp = false;
  let metaBackedUp = false;
  let dataPublished = false;
  let metaPublished = false;
  try {
    dataBackedUp = await moveIfExists(dataPath, dataBackupPath);
    metaBackedUp = await moveIfExists(metaPath, metaBackupPath);
    await rename(dataPartPath, dataPath);
    dataPublished = true;
    await chmod(dataPath, 0o600);
    await rename(metaPartPath, metaPath);
    metaPublished = true;
    await chmod(metaPath, 0o600);
    await rm(dataBackupPath, { force: true });
    await rm(metaBackupPath, { force: true });
  } catch (error) {
    if (metaPublished) {
      await rm(metaPath, { force: true }).catch(() => undefined);
    }
    if (dataPublished) {
      await rm(dataPath, { force: true }).catch(() => undefined);
    }
    if (metaBackedUp) {
      await rename(metaBackupPath, metaPath).catch(() => undefined);
    }
    if (dataBackedUp) {
      await rename(dataBackupPath, dataPath).catch(() => undefined);
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
