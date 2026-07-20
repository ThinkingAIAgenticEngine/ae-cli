export type FlagType = 'string' | 'number' | 'boolean' | 'json';
export type RiskLevel = 'read' | 'write' | 'high-risk-write';
export type OutputFormat = 'json' | 'table';

export interface Flag {
  name: string;
  type: FlagType;
  required?: boolean;
  default?: any;
  desc: string;
  /** Shown in validation errors when this required flag is missing. */
  hint?: string;
  alias?: string;
  min?: number;
  max?: number;
}

export interface Command {
  service: string;
  /** Optional space-separated resource path before the command. */
  resource?: string;
  command: string;
  /** Canonical gateway capability ID for machine-readable registry verification. */
  capabilityId?: string;
  description: string;
  flags: Flag[];
  risk: RiskLevel;
  /** Local flag / pre-flight checks before validateInput / dryRun / execute. */
  validate?: (ctx: RuntimeContext) => void;
  /**
   * Force early input parsing (e.g. JSON flags) before the high-risk-write confirmation gate,
   * so invalid parameters surface as validation errors instead of being hidden behind the prompt.
   * Only invoked on the execute path; pure/local — must not perform network calls.
   */
  preflight?: (ctx: RuntimeContext) => void;
  /**
   * Parameter-focused server check (capability gateway `/validate`).
   * Use to iterate complex input; prefer this over dryRun while still shaping qp/payload.
   */
  validateInput?: (ctx: RuntimeContext) => Promise<any>;
  /** Local request preview (`DryRunResult`) or server dry-run payload (capability gateway `/dry-run`). */
  dryRun?: (ctx: RuntimeContext) => DryRunResult | Promise<DryRunResult | any>;
  execute: (ctx: RuntimeContext) => Promise<any>;
}

export interface RuntimeContext {
  str(name: string): string;
  num(name: string): number;
  optionalNum(name: string): number | undefined;
  bool(name: string): boolean;
  json(name: string): any;

  api(method: string, path: string, params?: Record<string, any>, data?: any): Promise<any>;
  querySql(projectId: number, sql: string): Promise<any>;
  queryReportData(projectId: number, reportId: number, qp: any, eventModel: number, options?: Record<string, any>): Promise<any>;

  token(): Promise<string>;
  host(): string;
  mcpUrl(): string | undefined;
  service(): string;

  out(data: any): Promise<void>;
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
  /** Capability gateway `/validate` (fix params). Mutually exclusive with dryRun. */
  validate: boolean;
  /** Capability gateway `/dry-run` or local transport preview. Mutually exclusive with validate. */
  dryRun: boolean;
  yes: boolean;
}

export interface OutputEnvelope {
  ok: boolean;
  data?: any;
  meta?: Record<string, unknown>;
  error?: {
    type: 'auth' | 'permission' | 'api' | 'validation' | 'config';
    code?: string | number;
    message: string;
    hint?: string;
  };
}
