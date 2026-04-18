export type FlagType = 'string' | 'number' | 'boolean' | 'json';
export type RiskLevel = 'read' | 'write';
export type OutputFormat = 'json' | 'table';

export interface Flag {
  name: string;
  type: FlagType;
  required?: boolean;
  default?: any;
  desc: string;
  alias?: string;
}

export interface Command {
  service: string;
  command: string;
  description: string;
  flags: Flag[];
  risk: RiskLevel;
  validate?: (ctx: RuntimeContext) => void;
  dryRun?: (ctx: RuntimeContext) => DryRunResult;
  execute: (ctx: RuntimeContext) => Promise<any>;
}

export interface RuntimeContext {
  str(name: string): string;
  num(name: string): number;
  bool(name: string): boolean;
  json(name: string): any;

  api(method: string, path: string, params?: Record<string, any>, data?: any): Promise<any>;
  querySql(projectId: number, sql: string): Promise<any>;
  queryReportData(projectId: number, reportId: number, qp: any, eventModel: number, options?: Record<string, any>): Promise<any>;

  token(): Promise<string>;
  host(): string;
  mcpUrl(): string | undefined;
  service(): string;

  out(data: any): void;
}

export interface DryRunResult {
  method: string;
  url: string;
  params?: any;
  body?: any;
}

export interface GlobalOptions {
  host?: string;
  mcpUrl?: string;
  format: OutputFormat;
  jq?: string;
  dryRun: boolean;
  yes: boolean;
}

export interface OutputEnvelope {
  ok: boolean;
  data?: any;
  error?: {
    type: 'auth' | 'api' | 'validation' | 'config';
    code?: number;
    message: string;
    hint?: string;
  };
}