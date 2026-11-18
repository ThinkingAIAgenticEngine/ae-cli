import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getConfigDir } from '../config.js';
import { UUID_PATTERN, type LocalSession } from './contracts.js';

/** Private local continuation data. Never use this store for platform credentials. */
export class OnboardingStore {
  constructor(readonly directory = path.join(getConfigDir(), 'plg')) {}

  private ensureDirectory(directory = this.directory): void {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (fs.lstatSync(directory).isSymbolicLink()) throw new Error('Onboarding storage cannot be a symbolic link.');
    if (process.platform !== 'win32') fs.chmodSync(directory, 0o700);
  }

  private file(name: string): string {
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(name)) throw new Error('Invalid local onboarding reference.');
    return path.join(this.directory, name);
  }

  read<T>(name: string): T | undefined {
    const file = this.file(name);
    try {
      const info = fs.lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 65_536) throw new Error('Unsafe onboarding record.');
      if (process.platform !== 'win32' && (info.mode & 0o077)) throw new Error('Onboarding record permissions must be private.');
      return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch (error: any) {
      if (error.code === 'ENOENT') return undefined;
      throw new Error('The local onboarding record is unreadable. Preserve it and use a new continuation.');
    }
  }

  write(name: string, value: unknown): void {
    this.ensureDirectory();
    const file = this.file(name);
    if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error('Unsafe onboarding record.');
    const temp = this.file(`tmp-${crypto.randomUUID()}.json`);
    try {
      fs.writeFileSync(temp, JSON.stringify(value), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      fs.renameSync(temp, file);
      if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }

  remove(name: string): void {
    const file = this.file(name);
    if (fs.existsSync(file) && !fs.lstatSync(file).isSymbolicLink()) fs.unlinkSync(file);
  }

  session(id?: string, host?: string): LocalSession | undefined {
    if (id) {
      if (!UUID_PATTERN.test(id)) throw new Error('Invalid local onboarding session identifier.');
      const value = this.read<LocalSession>(`session-${id}.json`);
      if (!value || value.schema_version !== 1 || value.id !== id) throw new Error('Local onboarding session was not found.');
      if (host && value.host && value.host !== host) throw new Error('The continuation belongs to another AE host.');
      return value;
    }
    if (!fs.existsSync(this.directory)) return undefined;
    const values = fs.readdirSync(this.directory).filter(name => /^session-[0-9a-f-]+\.json$/i.test(name))
      .flatMap(name => {
        try { const value = this.read<LocalSession>(name); return value?.schema_version === 1 ? [value] : []; }
        catch { return []; } // Preserve damaged unrelated records; an explicitly selected record still fails closed.
      });
    const matching = values.filter(value => host ? value.host === host : !value.host);
    return matching.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  }

  save(session: LocalSession): void {
    session.updated_at = new Date().toISOString();
    this.write(`session-${session.id}.json`, session);
  }

  async locked<T>(key: string, action: () => Promise<T>): Promise<T> {
    this.ensureDirectory();
    const directory = path.join(this.directory, `lock-${crypto.createHash('sha256').update(key).digest('hex')}`);
    try {
      fs.mkdirSync(directory, { mode: 0o700 });
    } catch (error: any) {
      if (error.code !== 'EEXIST') throw error;
      let stale = false;
      try {
        const owner = JSON.parse(fs.readFileSync(path.join(directory, 'owner.json'), 'utf8'));
        if (Number.isInteger(owner.pid) && owner.pid > 0) {
          try { process.kill(owner.pid, 0); }
          catch (failure: any) { stale = failure.code === 'ESRCH'; }
        }
      } catch {
        // An interrupted mkdir can leave an empty directory. rmdir cannot remove a newly written owner record.
        try {
          if (Date.now() - fs.statSync(directory).mtimeMs > 60_000 && fs.readdirSync(directory).length === 0) {
            fs.rmdirSync(directory);
            return this.locked(key, action);
          }
        } catch { /* Preserve malformed or concurrently acquired locks. */ }
      }
      if (!stale) throw new Error('Another local onboarding operation is active. Retry after it returns.');
      fs.rmSync(directory, { recursive: true });
      return this.locked(key, action);
    }
    const ownerId = crypto.randomUUID();
    try {
      fs.writeFileSync(path.join(directory, 'owner.json'), JSON.stringify({ pid: process.pid, id: ownerId }), { mode: 0o600, flag: 'wx' });
      return await action();
    } finally {
      try {
        if (JSON.parse(fs.readFileSync(path.join(directory, 'owner.json'), 'utf8')).id === ownerId) fs.rmSync(directory, { recursive: true });
      } catch { /* Never delete a lock owned by another invocation. */ }
    }
  }
}
