import fs from 'fs';
import path from 'path';

// 直接计算，避免与 config.ts 循环依赖
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
    // 按天切割：日期变化时自动写入新文件
    const today = this.today();
    if (today !== this.date) {
      this.date = today;
    }
    return path.join(this.logDir, `${this.date}_${level}.log`);
  }

  /**
   * 写入日志到文件（不输出到控制台，控制台由现有 process.stderr.write 负责）
   */
  private write(level: LogLevel, message: string): void {
    const ts = this.timestamp();
    const line = `[${ts}] ${message}\n`;
    try {
      fs.appendFileSync(this.filePath(level), line);
    } catch {
      // 日志写入失败不应影响主流程
    }
  }

  /** 常规操作日志 */
  info(message: string): void {
    this.write('info', message);
  }

  /** 警告日志 */
  warn(message: string): void {
    this.write('warning', message);
  }

  /** 错误日志 */
  error(message: string): void {
    this.write('error', message);
  }

  /** 记录 HTTP API 请求详情 */
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

  /** 记录命令执行 */
  command(name: string, args: Record<string, any>): void {
    const filtered = Object.entries(args)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `--${k}=${JSON.stringify(v)}`)
      .join(' ');
    this.info(`CMD ${name}${filtered ? ' ' + filtered : ''}`);
  }
}

export const logger = new Logger();
