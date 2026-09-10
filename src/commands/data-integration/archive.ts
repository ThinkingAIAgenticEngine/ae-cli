import archiver from 'archiver';
import { createWriteStream, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Zip a handoff package directory into a single shareable archive. Files keep
 * their on-disk modes (scripts stay executable); `.DS_Store` is skipped. The
 * archive is written 0o600 like the package contents it wraps.
 */
export async function zipPackage(dir: string, zipPath: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const output = createWriteStream(zipPath, { mode: 0o600 });
    const zip = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolvePromise);
    output.on('error', rejectPromise);
    zip.on('error', rejectPromise);
    zip.on('warning', (error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') rejectPromise(error);
    });
    zip.pipe(output);

    const walk = (current: string): void => {
      for (const name of readdirSync(current)) {
        if (name === '.DS_Store') continue;
        const full = join(current, name);
        const stats = statSync(full);
        if (stats.isDirectory()) {
          walk(full);
        } else {
          const rel = relative(dir, full).split(sep).join('/');
          zip.file(full, { name: rel, mode: stats.mode & 0o777 });
        }
      }
    };
    walk(dir);

    void zip.finalize();
  });
}
