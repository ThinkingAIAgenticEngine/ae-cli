import fs from 'fs';
import path from 'path';

// Computed directly to avoid circular dependency with config.ts
const LOG_DIR = path.join(process.env.HOME || '', '.ae-cli', 'log');

type LogLevel = 'info' | 'warning' | 'error';

class Logger {
  private logDir: string;
  private date: string;

  constructor() {
    this.logDir = LOG_DIR;
    this.date = this.today();
    this.ensureDir();
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  private timestamp(): string {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private filePath(level: LogLevel): string {
    // Rotate daily: automatically writes to a new file when the date changes
    const today = this.today();
    if (today !== this.date) {
      this.date = today;
    }
    return path.join(this.logDir, `${this.date}_${level}.log`);
  }

  /**
   * Write a log entry to file (not printed to the console; console output is handled by existing process.stderr.write calls)
   */
  private write(level: LogLevel, message: string): void {
    const ts = this.timestamp();
    const line = `[${ts}] ${message}\n`;
    try {
      fs.appendFileSync(this.filePath(level), line);
    } catch {
      // Log write failures must not affect the main flow
    }
  }

  /** Informational log */
  info(message: string): void {
    this.write('info', message);
  }

  /** Warning log */
  warn(message: string): void {
    this.write('warning', message);
  }

  /** Error log */
  error(message: string): void {
    this.write('error', message);
  }

  /** Log HTTP API request details */
  api(method: string, url: string, status: number, reqBody?: any, respBody?: any): void {
    const parts: string[] = [`API ${method} ${url} → HTTP ${status}`];
    if (reqBody !== undefined && reqBody !== null) {
      const s = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
      parts.push(`REQ: ${s.slice(0, 500)}`);
    }
    if (respBody !== undefined && respBody !== null) {
      const s = typeof respBody === 'string' ? respBody : JSON.stringify(respBody);
      parts.push(`RESP: ${s.slice(0, 500)}`);
    }
    this.info(parts.join(' | '));
  }

  /** Log command execution (sensitive flags redacted to ***) */
  command(name: string, args: Record<string, any>, sensitiveFlags: Iterable<string> = []): void {
    // Normalize separators so kebab-case declarations match Commander camelCase option keys.
    const normalizeFlagName = (name: string) => name.toLowerCase().replace(/[-_]/g, '');
    const explicitSensitive = new Set(Array.from(sensitiveFlags, normalizeFlagName));
    const SENSITIVE = ['token', 'apikey', 'secret', 'accesstoken', 'headers'];
    const isSensitive = (k: string) => {
      const normalized = normalizeFlagName(k);
      return explicitSensitive.has(normalized) || SENSITIVE.some((s) => normalized.includes(s));
    };
    const filtered = Object.entries(args)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `--${k}=${isSensitive(k) ? '***' : JSON.stringify(v)}`)
      .join(' ');
    this.info(`CMD ${name}${filtered ? ' ' + filtered : ''}`);
  }
}

export const logger = new Logger();
