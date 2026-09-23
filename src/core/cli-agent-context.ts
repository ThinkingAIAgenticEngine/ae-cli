import { readFileSync, statSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';

type ContextField = {
  key: string;
  env: string;
  header?: string;
  maxLength: number;
};

const MAX_CONTEXT_FILE_BYTES = 64 * 1024;
const CONTEXT_FILE_ENV = 'TA_CLI_CONTEXT_FILE';
const CONTEXT_ARG = '--agent-context';
const CONTEXT_ENCODING_HEADER = 'X-TA-CLI-Context-Encoding';
const CONTEXT_HEADER_ENCODING = 'base64url';
const WELL_KNOWN_CONTEXT_FILES = [
  '.ta/cli-agent-context.json',
  '.ae/cli-agent-context.json',
];

const FIELDS: ContextField[] = [
  { key: 'agent_client', env: 'TA_CLI_AGENT_CLIENT', header: 'X-TA-CLI-Agent-Client', maxLength: 64 },
  { key: 'agent_model', env: 'TA_CLI_AGENT_MODEL', header: 'X-TA-CLI-Agent-Model', maxLength: 128 },
  { key: 'agent_session_id', env: 'TA_CLI_AGENT_SESSION_ID', header: 'X-TA-CLI-Agent-Session-Id', maxLength: 191 },
  { key: 'agent_turn_id', env: 'TA_CLI_AGENT_TURN_ID', header: 'X-TA-CLI-Agent-Turn-Id', maxLength: 191 },
  { key: 'parent_turn_id', env: 'TA_CLI_PARENT_TURN_ID', header: 'X-TA-CLI-Parent-Turn-Id', maxLength: 191 },
  { key: 'intent_relation', env: 'TA_CLI_INTENT_RELATION', header: 'X-TA-CLI-Intent-Relation', maxLength: 64 },
  { key: 'intent_revision', env: 'TA_CLI_INTENT_REVISION', header: 'X-TA-CLI-Intent-Revision', maxLength: 64 },
  { key: 'runtime', env: 'TA_CLI_RUNTIME', header: 'X-TA-CLI-Runtime', maxLength: 64 },
  { key: 'intent_source', env: 'TA_CLI_INTENT_SOURCE', header: 'X-TA-CLI-Intent-Source', maxLength: 64 },
  { key: 'session_initial_intent', env: 'TA_CLI_SESSION_INITIAL_INTENT', header: 'X-TA-CLI-Session-Initial-Intent', maxLength: 2048 },
  { key: 'user_intent', env: 'TA_CLI_USER_INTENT', header: 'X-TA-CLI-User-Intent', maxLength: 2048 },
  { key: 'user_intent_hash', env: 'TA_CLI_USER_INTENT_HASH', header: 'X-TA-CLI-User-Intent-Hash', maxLength: 128 },
  { key: 'session_goal', env: 'TA_CLI_SESSION_GOAL', header: 'X-TA-CLI-Session-Goal', maxLength: 2048 },
  { key: 'context_capture_status', env: 'TA_CLI_CONTEXT_CAPTURE_STATUS', header: 'X-TA-CLI-Context-Capture-Status', maxLength: 32 },
];

export type CliAgentContext = Record<string, string>;

export function readCliAgentContext(): CliAgentContext {
  const context = {
    ...inferRuntimeContext(),
    ...readEnvContext(),
    ...readArgumentContext(),
    ...readFileContext(),
  };
  return withCaptureStatus(context);
}

export function cliAgentContextHeaders(context: CliAgentContext = readCliAgentContext()): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const field of FIELDS) {
    if (!field.header) continue;
    const value = context[field.key];
    if (value) headers[field.header] = Buffer.from(value, 'utf8').toString('base64url');
  }
  if (Object.keys(headers).length > 0) {
    headers[CONTEXT_ENCODING_HEADER] = CONTEXT_HEADER_ENCODING;
  }
  return headers;
}

export function withCliAgentContextBody<T>(body: T, context: CliAgentContext = readCliAgentContext()): T {
  if (!hasContext(context) || !isPlainRecord(body)) {
    return body;
  }
  return {
    ...body,
    client_context: context,
  } as T;
}

function readEnvContext(): CliAgentContext {
  const context: CliAgentContext = {};
  for (const field of FIELDS) {
    const value = cleanValue(process.env[field.env], field.maxLength);
    if (value) context[field.key] = value;
  }
  return context;
}

function inferRuntimeContext(): CliAgentContext {
  return (
    inferCodexContext()
    ?? inferClaudeCodeContext()
    ?? inferWorkBuddyContext()
    ?? {}
  );
}

function inferCodexContext(): CliAgentContext | undefined {
  if (!process.env.CODEX_SESSION_ID && !process.env.CODEX_THREAD_ID && !process.env.CODEX_VERSION && !process.env.CODEX_SHELL) {
    return undefined;
  }
  return compactContext({
    agent_client: 'codex',
    agent_model: firstEnv('CODEX_MODEL', 'OPENAI_MODEL'),
    agent_session_id: firstEnv('CODEX_THREAD_ID', 'CODEX_SESSION_ID'),
    runtime: process.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE ? 'codex_desktop' : 'codex_cli',
    intent_source: 'runtime_env',
  });
}

function inferClaudeCodeContext(): CliAgentContext | undefined {
  if (!firstEnv('CLAUDE_CODE_SESSION_ID', 'CLAUDE_SESSION_ID', 'CLAUDECODE', 'CLAUDE_CODE')) {
    return undefined;
  }
  return compactContext({
    agent_client: 'claude_code',
    agent_model: firstEnv('CLAUDE_CODE_MODEL', 'CLAUDE_MODEL', 'ANTHROPIC_MODEL'),
    agent_session_id: firstEnv('CLAUDE_CODE_SESSION_ID', 'CLAUDE_SESSION_ID'),
    runtime: 'claude_code',
    intent_source: 'runtime_env',
  });
}

function inferWorkBuddyContext(): CliAgentContext | undefined {
  if (!firstEnv('WORKBUDDY_SESSION_ID', 'WORKBUDDY_AGENT_ID', 'WORKBUDDY_RUNTIME')) {
    return undefined;
  }
  return compactContext({
    agent_client: 'workbuddy',
    agent_model: firstEnv('WORKBUDDY_MODEL', 'WORKBUDDY_AGENT_MODEL'),
    agent_session_id: firstEnv('WORKBUDDY_SESSION_ID', 'WORKBUDDY_CONVERSATION_ID'),
    runtime: firstEnv('WORKBUDDY_RUNTIME') ?? 'workbuddy',
    intent_source: 'runtime_env',
  });
}

function compactContext(values: Record<string, unknown>): CliAgentContext {
  const context: CliAgentContext = {};
  for (const field of FIELDS) {
    const value = cleanValue(values[field.key], field.maxLength);
    if (value) context[field.key] = value;
  }
  return context;
}

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function readFileContext(): CliAgentContext {
  const filePath = resolveContextFilePath();
  if (!filePath) return {};
  try {
    const stat = statSync(filePath);
    if (!stat.isFile() || stat.size > MAX_CONTEXT_FILE_BYTES) return {};
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    const record = normalizeContextFileRecord(parsed);
    if (!record) return {};
    const context: CliAgentContext = {};
    for (const field of FIELDS) {
      const value = cleanValue(record[field.key], field.maxLength);
      if (value) context[field.key] = value;
    }
    return context;
  } catch {
    return {};
  }
}

function readArgumentContext(): CliAgentContext {
  const raw = readContextArgument(process.argv.slice(2));
  if (!raw) return {};
  const parsed = parseContextArgument(raw);
  if (!parsed) return {};
  const context = contextFromRecord(parsed);
  if (!hasContext(context)) return {};
  return {
    intent_source: 'agent_argument',
    ...context,
  };
}

function readContextArgument(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--') return undefined;
    if (token === CONTEXT_ARG) return args[i + 1];
    if (token.startsWith(`${CONTEXT_ARG}=`)) return token.slice(CONTEXT_ARG.length + 1);
  }
  return undefined;
}

function parseContextArgument(raw: string): Record<string, unknown> | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  const decoded = text.startsWith('{') ? text : decodeBase64Url(text);
  if (!decoded) return undefined;
  try {
    const parsed = JSON.parse(decoded);
    return normalizeContextFileRecord(parsed);
  } catch {
    return undefined;
  }
}

function decodeBase64Url(value: string): string | undefined {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return undefined;
  }
}

function resolveContextFilePath(): string | undefined {
  const configured = process.env[CONTEXT_FILE_ENV]?.trim();
  if (configured) return configured;
  return findWellKnownContextFile(process.cwd());
}

function findWellKnownContextFile(startDir: string): string | undefined {
  let current = resolve(startDir);
  const root = parse(current).root;
  while (true) {
    for (const fileName of WELL_KNOWN_CONTEXT_FILES) {
      const candidate = join(current, fileName);
      try {
        const stat = statSync(candidate);
        if (stat.isFile() && stat.size <= MAX_CONTEXT_FILE_BYTES) return candidate;
      } catch {
        // Keep walking ancestors.
      }
    }
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function normalizeContextFileRecord(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainRecord(value)) return undefined;
  if (isPlainRecord(value.client_context)) return value.client_context;
  return value;
}

function contextFromRecord(record: Record<string, unknown>): CliAgentContext {
  const context: CliAgentContext = {};
  for (const field of FIELDS) {
    const value = cleanValue(record[field.key], field.maxLength);
    if (value) context[field.key] = value;
  }
  return context;
}

function withCaptureStatus(context: CliAgentContext): CliAgentContext {
  if (!hasContext(context)) return {};
  if (context.context_capture_status) return context;
  const required = ['agent_client', 'agent_session_id', 'agent_turn_id', 'user_intent'];
  const complete = required.every((key) => Boolean(context[key]));
  return {
    ...context,
    context_capture_status: complete ? 'full' : 'partial',
  };
}

function hasContext(context: CliAgentContext): boolean {
  return Object.keys(context).some((key) => key !== 'context_capture_status' && Boolean(context[key]));
}

function cleanValue(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return undefined;
  }
  const text = String(value).replace(/[\r\n\t]+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
