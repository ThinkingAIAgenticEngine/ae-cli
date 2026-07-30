import fs from 'node:fs/promises';
import path from 'node:path';
import type { Command, RuntimeContext } from '../../framework/types.js';
import {
  buildMemoryCliUrl,
  deleteMemoryCli,
  getMemoryCli,
  MEMORY_BASE_PATH,
  MEMORY_DEFAULTS_PATH,
  patchMemoryCli,
  postMemoryCli,
  putMemoryCli,
} from './cli-client.js';

const SERVICE = 'memory';
const BASE_PATH = MEMORY_BASE_PATH;
const DEFAULTS_PATH = MEMORY_DEFAULTS_PATH;
const DEFAULT_AGENT_ID = 'system-default-agent';
const MANAGED_START = '<!-- ae-cli:user-memory:start -->';
const MANAGED_END = '<!-- ae-cli:user-memory:end -->';
const RUNTIME_MANAGED_START_PREFIX = '<!-- ae:user-memory:start';
const RUNTIME_MANAGED_END = '<!-- ae:user-memory:end -->';

type MemoryScope = 'global' | 'agent';
type MemoryType = 'preference' | 'profile' | 'workflow' | 'fact' | 'temporary';
type SubmittedMemoryType = Exclude<MemoryType, 'temporary'>;
type CandidateSourceType = 'local_conversation' | 'memory_file';

const scopes = ['global', 'agent'];
const types = ['preference', 'profile', 'workflow', 'fact', 'temporary'];
const submittedTypes: SubmittedMemoryType[] = ['preference', 'profile', 'workflow', 'fact'];
const candidateSourceTypes: CandidateSourceType[] = ['local_conversation', 'memory_file'];
const statuses = ['pending', 'active', 'rejected', 'expired'];
const MAX_MARK_USED_IDS = 200;
const MAX_MEMORY_ID_LENGTH = 191;
const MEMORY_JOB_POLL_INTERVAL_MS = 1_500;
const MEMORY_JOB_POLL_TIMEOUT_MS = 15 * 60 * 1_000;

type MemoryJobResponse = {
  item?: {
    id: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed';
  } | null;
  items?: unknown[];
};

type MemoryContextItem = {
  id: string;
  type?: string;
  content: string;
};

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name).trim();
  return value ? value : undefined;
}

function assertValidExpiresAt(value: string | undefined): void {
  if (!value) return;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error('--expires-at must be an ISO datetime with an explicit UTC offset');
  }
}

function assertAllowed(name: string, value: string | undefined, allowed: string[]): void {
  if (value && !allowed.includes(value)) {
    throw new Error(`--${name} must be one of: ${allowed.join(', ')}`);
  }
}

function buildQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const text = qs.toString();
  return text ? `?${text}` : '';
}

function envOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function defaultAgentId(ctx: RuntimeContext): string {
  return optionalString(ctx, 'agentId') ?? envOptional('TE_AGENT_CURRENT_AGENT_ID') ?? DEFAULT_AGENT_ID;
}

function currentAgentId(ctx: RuntimeContext): string {
  const agentId = optionalString(ctx, 'agentId') ?? envOptional('TE_AGENT_CURRENT_AGENT_ID');
  if (!agentId) {
    throw new Error('--agent-id is required outside a Web Agent session');
  }
  return agentId;
}

function markUsedIds(ctx: RuntimeContext): string[] {
  const value: unknown = ctx.json('ids');
  if (!Array.isArray(value)) {
    throw new Error('--ids must be a JSON array');
  }
  if (value.length < 1 || value.length > MAX_MARK_USED_IDS) {
    throw new Error(`--ids must contain between 1 and ${MAX_MARK_USED_IDS} items`);
  }

  const ids = value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new Error(`--ids item ${index + 1} must be a string`);
    }
    const id = item.trim();
    if (!id) {
      throw new Error(`--ids item ${index + 1} must not be empty`);
    }
    if (id.length > MAX_MEMORY_ID_LENGTH) {
      throw new Error(`--ids item ${index + 1} must be at most ${MAX_MEMORY_ID_LENGTH} characters`);
    }
    return id;
  });
  return [...new Set(ids)];
}

function markUsedBody(ctx: RuntimeContext): { agentId: string; ids: string[] } {
  return {
    agentId: currentAgentId(ctx),
    ids: markUsedIds(ctx),
  };
}

function writeContextInput(ctx: RuntimeContext): {
  file: string;
  agentId: string;
  limit?: number;
} {
  const file = optionalString(ctx, 'file');
  if (!file) throw new Error('--file is required');
  const resolvedFile = path.resolve(file);
  if (
    path.basename(resolvedFile).toLowerCase() === 'user-memories.md' &&
    path.basename(path.dirname(resolvedFile)).toLowerCase() === '.claude'
  ) {
    throw new Error('--file must not target .claude/user-memories.md');
  }
  const limit = ctx.optionalNum('limit');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50)) {
    throw new Error('--limit must be an integer between 1 and 50');
  }
  return {
    file,
    agentId: defaultAgentId(ctx),
    limit,
  };
}

function defaultPath(ctx: RuntimeContext): string {
  return `${DEFAULTS_PATH}${buildQuery({ agentId: defaultAgentId(ctx) })}`;
}

function dryRunUrl(ctx: RuntimeContext, path: string): string {
  return buildMemoryCliUrl(ctx, path);
}

function parseSelectionJson(raw: string | undefined): Record<string, unknown> {
  if (!raw) {
    throw new Error('Provide --selection-json or run inside a te-agent conversation with current session selection');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('--selection-json must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('--selection-json must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function defaultSaveBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    selection: parseSelectionJson(
      optionalString(ctx, 'selectionJson') ?? envOptional('TE_AGENT_CURRENT_SESSION_SELECTION_JSON'),
    ),
  };
}

function memoryBody(ctx: RuntimeContext): Record<string, unknown> {
  const scope = (optionalString(ctx, 'scope') ?? 'agent') as MemoryScope;
  const agentId = defaultAgentId(ctx);
  return {
    content: optionalString(ctx, 'content'),
    type: optionalString(ctx, 'type') ?? 'preference',
    scopeType: scope,
    agentId: scope === 'agent' ? agentId : null,
    pinned: ctx.bool('pinned') || undefined,
    expiresAt: optionalString(ctx, 'expiresAt') ?? null,
    source: { sourceType: 'manual', createdBy: 'cli' },
  };
}

function updateBody(ctx: RuntimeContext): Record<string, unknown> {
  const scope = optionalString(ctx, 'scope') as MemoryScope | undefined;
  return {
    content: optionalString(ctx, 'content'),
    type: optionalString(ctx, 'type'),
    scopeType: scope,
    agentId: scope === 'global' ? null : scope === 'agent' ? defaultAgentId(ctx) : undefined,
    pinned: optionalString(ctx, 'pinned') === undefined ? undefined : ctx.bool('pinned'),
    expiresAt: optionalString(ctx, 'expiresAt') ?? undefined,
  };
}

function compactObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

type CandidatePayload = {
  candidates: Array<{
    content: string;
    type: SubmittedMemoryType;
    evidence?: string;
  }>;
};

function parseCandidatePayload(raw: string): CandidatePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('candidate input must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('candidate input must be a JSON object');
  }
  const root = parsed as Record<string, unknown>;
  if (Object.keys(root).some((key) => key !== 'candidates') || !Array.isArray(root.candidates)) {
    throw new Error('candidate input must contain only a candidates array');
  }
  if (root.candidates.length < 1 || root.candidates.length > 10) {
    throw new Error('candidates must contain between 1 and 10 items');
  }

  const candidates = root.candidates.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`candidate ${index + 1} must be an object`);
    }
    const item = value as Record<string, unknown>;
    if (Object.keys(item).some((key) => !['content', 'type', 'evidence'].includes(key))) {
      throw new Error(`candidate ${index + 1} contains unsupported fields`);
    }
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    const type = typeof item.type === 'string' ? item.type : '';
    const evidence = typeof item.evidence === 'string' && item.evidence.trim() ? item.evidence.trim() : undefined;
    if (content.length < 6 || content.length > 1000) {
      throw new Error(`candidate ${index + 1} content must be between 6 and 1000 characters`);
    }
    if (!submittedTypes.includes(type as SubmittedMemoryType)) {
      throw new Error(`candidate ${index + 1} type must be one of: ${submittedTypes.join(', ')}`);
    }
    if (evidence && evidence.length > 300) {
      throw new Error(`candidate ${index + 1} evidence must be at most 300 characters`);
    }
    return { content, type: type as SubmittedMemoryType, evidence };
  });
  return { candidates };
}

function candidateTarget(ctx: RuntimeContext): {
  scopeType: MemoryScope;
  agentId: string | null;
} {
  const scope = optionalString(ctx, 'scope') as MemoryScope | undefined;
  const currentAgentId = envOptional('TE_AGENT_CURRENT_AGENT_ID');
  if (!scope) {
    if (!currentAgentId) {
      throw new Error('Outside a Web Agent session, provide --scope global or --scope agent --agent-id <id>');
    }
    return {
      scopeType: 'agent',
      agentId: optionalString(ctx, 'agentId') ?? currentAgentId,
    };
  }
  if (scope === 'global') return { scopeType: 'global', agentId: null };
  const agentId = optionalString(ctx, 'agentId') ?? currentAgentId;
  if (!agentId) {
    throw new Error('--scope agent requires --agent-id outside a Web Agent session');
  }
  return { scopeType: 'agent', agentId };
}

function validateCandidateSource(ctx: RuntimeContext): void {
  const sourceType = optionalString(ctx, 'sourceType');
  assertAllowed('source-type', sourceType, candidateSourceTypes);
  if (!sourceType) throw new Error('--source-type is required');
  const sourceName = optionalString(ctx, 'sourceName');
  if (sourceName && (sourceName.includes('/') || sourceName.includes('\\') || sourceName === '.' || sourceName === '..')) {
    throw new Error('--source-name must be a file name without a path');
  }
  if (sourceName && sourceName.length > 255) {
    throw new Error('--source-name must be at most 255 characters');
  }
  const sourceAgent = optionalString(ctx, 'sourceAgent');
  if (sourceAgent && sourceAgent.length > 64) {
    throw new Error('--source-agent must be at most 64 characters');
  }
  const sourceSessionId = optionalString(ctx, 'sourceSessionId');
  if (sourceSessionId && sourceSessionId.length > 191) {
    throw new Error('--source-session-id must be at most 191 characters');
  }
  const hasJson = Boolean(optionalString(ctx, 'candidatesJson'));
  const hasStdin = ctx.bool('stdin');
  if (hasJson === hasStdin) {
    throw new Error('Provide exactly one of --candidates-json or --stdin');
  }
  candidateTarget(ctx);
  if (hasJson) parseCandidatePayload(optionalString(ctx, 'candidatesJson')!);
}

function submitCandidatesBody(ctx: RuntimeContext, payload: CandidatePayload | { candidates: string }): Record<string, unknown> {
  const target = candidateTarget(ctx);
  return compactObject({
    ...payload,
    sourceType: optionalString(ctx, 'sourceType'),
    sourceName: optionalString(ctx, 'sourceName'),
    sourceAgent: optionalString(ctx, 'sourceAgent'),
    sourceSessionId: optionalString(ctx, 'sourceSessionId'),
    scopeType: target.scopeType,
    agentId: target.agentId,
    autoApprove: ctx.bool('autoApprove'),
  });
}

async function readExtractText(ctx: RuntimeContext): Promise<string | undefined> {
  if (ctx.bool('stdin')) return readStdin();
  return optionalString(ctx, 'text');
}

function extractBody(ctx: RuntimeContext, autoApprove?: boolean): Record<string, unknown> {
  const scope = (optionalString(ctx, 'scope') ?? 'agent') as MemoryScope;
  return {
    agentId: defaultAgentId(ctx),
    conversationId: optionalString(ctx, 'sessionId'),
    scopeType: scope,
    autoApprove: autoApprove ?? (ctx.bool('autoApprove') || undefined),
    model: optionalString(ctx, 'model'),
  };
}

function extractJobBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    kind: 'extract',
    ...extractBody(ctx),
    mode: 'incremental',
  };
}

function organizeBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    kind: 'organize',
    agentId: defaultAgentId(ctx),
    scopeType: (optionalString(ctx, 'scope') ?? 'agent') as MemoryScope,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollMemoryJob(
  ctx: RuntimeContext,
  initial: MemoryJobResponse,
): Promise<MemoryJobResponse & { timedOut?: boolean; jobId?: string; status?: string }> {
  let payload = initial;
  const jobId = payload.item?.id;
  if (!jobId) return payload;
  const deadline = Date.now() + MEMORY_JOB_POLL_TIMEOUT_MS;

  while (payload.item?.status === 'queued' || payload.item?.status === 'running') {
    if (Date.now() >= deadline) {
      return {
        ...payload,
        timedOut: true,
        jobId,
        status: payload.item.status,
      };
    }
    await wait(MEMORY_JOB_POLL_INTERVAL_MS);
    payload = await getMemoryCli<MemoryJobResponse>(
      ctx,
      `${BASE_PATH}/jobs/${encodeURIComponent(jobId)}`,
    );
  }
  return payload;
}

function normalizeMemoryContextItems(items: MemoryContextItem[]): MemoryContextItem[] {
  return items.map((item, index) => {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    if (!id || id.length > MAX_MEMORY_ID_LENGTH) {
      throw new Error(
        `Memory context item ${index + 1} ID must be a non-empty string of at most ${MAX_MEMORY_ID_LENGTH} characters`,
      );
    }
    if (typeof item.content !== 'string') {
      throw new Error(`Memory context item ${index + 1} content must be a string`);
    }
    if (
      item.content.includes(MANAGED_START) ||
      item.content.includes(MANAGED_END) ||
      item.content.includes('<!-- ae:user-memory-id=') ||
      item.content.includes(RUNTIME_MANAGED_START_PREFIX) ||
      item.content.includes(RUNTIME_MANAGED_END)
    ) {
      throw new Error(`Memory context item ${index + 1} content contains a reserved memory marker`);
    }
    return { ...item, id };
  });
}

export function renderManagedBlock(items: MemoryContextItem[]): string {
  const normalizedItems = normalizeMemoryContextItems(items);
  const lines = [
    MANAGED_START,
    '## User Memory',
    '',
    ...normalizedItems.flatMap((item) => [
      `<!-- ae:user-memory-id="${item.id}" -->`,
      `- ${item.type ? `[${item.type}] ` : ''}${item.content}`,
    ]),
    MANAGED_END,
  ];
  return lines.join('\n');
}

function countOccurrences(source: string, marker: string): number {
  return source.split(marker).length - 1;
}

function replaceManagedBlock(source: string, block: string): string {
  if (source.includes(RUNTIME_MANAGED_START_PREFIX) || source.includes(RUNTIME_MANAGED_END)) {
    throw new Error('Target file contains a te-claude runtime memory block');
  }
  const startCount = countOccurrences(source, MANAGED_START);
  const endCount = countOccurrences(source, MANAGED_END);
  if (startCount !== endCount || startCount > 1) {
    throw new Error('Target file contains an incomplete or duplicate ae-cli user-memory block');
  }

  const start = source.indexOf(MANAGED_START);
  const end = source.indexOf(MANAGED_END);
  if (startCount === 1) {
    if (end <= start) {
      throw new Error('Target file contains an incomplete or duplicate ae-cli user-memory block');
    }
    return `${source.slice(0, start)}${block}${source.slice(end + MANAGED_END.length)}`;
  }
  const separator =
    source.length === 0
      ? ''
      : /(?:\r?\n){2}$/.test(source)
        ? ''
        : /\r?\n$/.test(source)
          ? '\n'
          : '\n\n';
  return `${source}${separator}${block}\n`;
}

async function readMemoryTarget(target: string): Promise<string> {
  try {
    const stats = await fs.stat(target);
    if (!stats.isFile()) {
      throw new Error('Target path must be a regular file');
    }
    return await fs.readFile(target, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') return '';
    throw error;
  }
}

export async function writeMemoryContextFile(
  target: string,
  items: MemoryContextItem[],
): Promise<{ file: string; count: number; markers: string[] }> {
  const block = renderManagedBlock(items);
  const current = await readMemoryTarget(target);
  const next = replaceManagedBlock(current, block);
  await fs.writeFile(target, next, 'utf8');
  return { file: target, count: items.length, markers: [MANAGED_START, MANAGED_END] };
}

export const listMemories: Command = {
  service: SERVICE,
  command: '+list',
  description: 'List user memories from te-claude',
  flags: [
    { name: 'status', type: 'string', required: false, desc: 'Filter by status: pending | active | rejected | expired' },
    { name: 'scope', type: 'string', required: false, desc: 'Filter by scope: global | agent' },
    { name: 'agent-id', type: 'string', required: false, desc: 'Filter by Agent ID' },
    { name: 'query', type: 'string', required: false, desc: 'Search text contained in memory content' },
  ],
  risk: 'read',
  validate: (ctx) => {
    assertAllowed('status', optionalString(ctx, 'status'), statuses);
    assertAllowed('scope', optionalString(ctx, 'scope'), scopes);
  },
  dryRun: (ctx) => ({
    method: 'GET',
    url: dryRunUrl(ctx, `${BASE_PATH}${buildQuery({
      status: optionalString(ctx, 'status'),
      scopeType: optionalString(ctx, 'scope'),
      agentId: optionalString(ctx, 'agentId'),
      query: optionalString(ctx, 'query'),
    })}`),
  }),
  execute: (ctx) =>
    getMemoryCli(ctx, `${BASE_PATH}${buildQuery({
      status: optionalString(ctx, 'status'),
      scopeType: optionalString(ctx, 'scope'),
      agentId: optionalString(ctx, 'agentId'),
      query: optionalString(ctx, 'query'),
    })}`),
};

export const getMemory: Command = {
  service: SERVICE,
  command: '+get',
  description: 'Get one user memory by ID',
  flags: [{ name: 'id', type: 'string', required: true, desc: 'Memory ID' }],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: dryRunUrl(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`),
  }),
  execute: (ctx) => getMemoryCli(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`),
};

export const createMemory: Command = {
  service: SERVICE,
  command: '+create',
  description: 'Create a user memory',
  flags: [
    { name: 'content', type: 'string', required: true, desc: 'Memory content' },
    { name: 'type', type: 'string', required: false, desc: 'Memory type: preference | profile | workflow | fact | temporary' },
    { name: 'scope', type: 'string', required: false, desc: 'Memory scope: global | agent' },
    { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID for agent-scoped memory' },
    { name: 'pinned', type: 'boolean', required: false, desc: 'Pin the memory' },
    { name: 'expires-at', type: 'string', required: false, desc: 'ISO datetime when the memory expires' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const type = optionalString(ctx, 'type');
    assertAllowed('type', type, types);
    assertAllowed('scope', optionalString(ctx, 'scope'), scopes);
    const expiresAt = optionalString(ctx, 'expiresAt');
    if (type === 'temporary' && !expiresAt) {
      throw new Error('--expires-at is required when --type is temporary');
    }
    assertValidExpiresAt(expiresAt);
  },
  dryRun: (ctx) => ({ method: 'POST', url: dryRunUrl(ctx, BASE_PATH), body: compactObject(memoryBody(ctx)) }),
  execute: (ctx) => postMemoryCli(ctx, BASE_PATH, compactObject(memoryBody(ctx))),
};

export const updateMemory: Command = {
  service: SERVICE,
  command: '+update',
  description: 'Update a user memory',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Memory ID' },
    { name: 'content', type: 'string', required: false, desc: 'Replacement memory content' },
    { name: 'type', type: 'string', required: false, desc: 'Memory type: preference | profile | workflow | fact | temporary' },
    { name: 'scope', type: 'string', required: false, desc: 'Memory scope: global | agent' },
    { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID for agent-scoped memory' },
    { name: 'pinned', type: 'boolean', required: false, desc: 'Pin or unpin the memory' },
    { name: 'expires-at', type: 'string', required: false, desc: 'ISO datetime when the memory expires' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const type = optionalString(ctx, 'type');
    assertAllowed('type', type, types);
    assertAllowed('scope', optionalString(ctx, 'scope'), scopes);
    const expiresAt = optionalString(ctx, 'expiresAt');
    if (type === 'temporary' && !expiresAt) {
      throw new Error('--expires-at is required when --type is temporary');
    }
    assertValidExpiresAt(expiresAt);
  },
  dryRun: (ctx) => ({
    method: 'PATCH',
    url: dryRunUrl(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`),
    body: compactObject(updateBody(ctx)),
  }),
  execute: (ctx) =>
    patchMemoryCli(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`, compactObject(updateBody(ctx))),
};

export const deleteMemory: Command = {
  service: SERVICE,
  command: '+delete',
  description: 'Delete a user memory',
  flags: [{ name: 'id', type: 'string', required: true, desc: 'Memory ID' }],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: dryRunUrl(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`),
  }),
  execute: (ctx) => deleteMemoryCli(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`),
};

export const extractMemory: Command = {
  service: SERVICE,
  command: '+extract',
  description: 'Extract memories from text, stdin, or a Web session',
  flags: [
    { name: 'text', type: 'string', required: false, desc: 'Source text to extract from' },
    { name: 'stdin', type: 'boolean', required: false, desc: 'Read source text from stdin' },
    { name: 'session-id', type: 'string', required: false, desc: 'Web conversation ID to extract from' },
    { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID used for agent-scoped memory' },
    { name: 'scope', type: 'string', required: false, desc: 'Memory scope: global | agent' },
    { name: 'model', type: 'string', required: false, desc: 'Model id/key used by server-side extraction' },
    { name: 'auto-approve', type: 'boolean', required: false, desc: 'Create active memories instead of pending suggestions' },
  ],
  risk: 'write',
  validate: (ctx) => {
    assertAllowed('scope', optionalString(ctx, 'scope'), scopes);
    if (!ctx.bool('stdin') && !optionalString(ctx, 'text') && !optionalString(ctx, 'sessionId')) {
      throw new Error('Provide --text, --stdin, or --session-id');
    }
  },
  dryRun: (ctx) =>
    optionalString(ctx, 'sessionId')
      ? { method: 'POST', url: dryRunUrl(ctx, `${BASE_PATH}/jobs`), body: extractJobBody(ctx) }
      : { method: 'POST', url: dryRunUrl(ctx, `${BASE_PATH}/extract`), body: extractBody(ctx) },
  execute: async (ctx) => {
    if (optionalString(ctx, 'sessionId')) {
      const payload = await postMemoryCli<MemoryJobResponse>(
        ctx,
        `${BASE_PATH}/jobs`,
        compactObject(extractJobBody(ctx)),
      );
      return pollMemoryJob(ctx, payload);
    }
    const text = await readExtractText(ctx);
    return postMemoryCli(ctx, `${BASE_PATH}/extract`, compactObject({ ...extractBody(ctx), text }));
  },
};

export const submitCandidatesMemory: Command = {
  service: SERVICE,
  command: '+submit-candidates',
  description: 'Submit locally extracted structured memory candidates for platform review',
  flags: [
    {
      name: 'candidates-json',
      type: 'string',
      required: false,
      desc: 'JSON object containing a candidates array',
    },
    {
      name: 'stdin',
      type: 'boolean',
      required: false,
      desc: 'Read candidate JSON from stdin',
    },
    {
      name: 'source-type',
      type: 'string',
      required: true,
      desc: 'Source type: local_conversation | memory_file',
    },
    {
      name: 'source-name',
      type: 'string',
      required: false,
      desc: 'Source file name only, without a path',
    },
    {
      name: 'source-agent',
      type: 'string',
      required: false,
      desc: 'Local agent name, for example codex or claude',
    },
    {
      name: 'source-session-id',
      type: 'string',
      required: false,
      desc: 'Optional local source session identifier',
    },
    {
      name: 'scope',
      type: 'string',
      required: false,
      desc: 'Target scope: global | agent',
    },
    {
      name: 'agent-id',
      type: 'string',
      required: false,
      desc: 'Target Agent ID for agent scope',
    },
    {
      name: 'auto-approve',
      type: 'boolean',
      required: false,
      desc: 'Activate non-conflicting candidates immediately',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    assertAllowed('scope', optionalString(ctx, 'scope'), scopes);
    validateCandidateSource(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: dryRunUrl(ctx, `${BASE_PATH}/candidates`),
    body: submitCandidatesBody(ctx, ctx.bool('stdin') ? { candidates: '(candidate JSON from stdin)' } : parseCandidatePayload(optionalString(ctx, 'candidatesJson')!)),
  }),
  execute: async (ctx) => {
    validateCandidateSource(ctx);
    const raw = ctx.bool('stdin') ? await readStdin() : optionalString(ctx, 'candidatesJson')!;
    const payload = parseCandidatePayload(raw);
    return postMemoryCli(ctx, `${BASE_PATH}/candidates`, submitCandidatesBody(ctx, payload));
  },
};

export const pendingList: Command = {
  service: SERVICE,
  command: '+pending-list',
  description: 'List pending user memories',
  flags: [],
  risk: 'read',
  dryRun: (ctx) => ({ method: 'GET', url: dryRunUrl(ctx, `${BASE_PATH}/pending`) }),
  execute: (ctx) => getMemoryCli(ctx, `${BASE_PATH}/pending`),
};

export const pendingApprove: Command = {
  service: SERVICE,
  command: '+pending-approve',
  description: 'Approve one pending memory',
  flags: [{ name: 'id', type: 'string', required: true, desc: 'Pending memory ID' }],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: dryRunUrl(ctx, `${BASE_PATH}/pending/${encodeURIComponent(ctx.str('id'))}/approve`),
    body: {},
  }),
  execute: (ctx) => postMemoryCli(ctx, `${BASE_PATH}/pending/${encodeURIComponent(ctx.str('id'))}/approve`, {}),
};

export const pendingReject: Command = {
  service: SERVICE,
  command: '+pending-reject',
  description: 'Reject one pending memory',
  flags: [{ name: 'id', type: 'string', required: true, desc: 'Pending memory ID' }],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: dryRunUrl(ctx, `${BASE_PATH}/pending/${encodeURIComponent(ctx.str('id'))}/reject`),
    body: {},
  }),
  execute: (ctx) => postMemoryCli(ctx, `${BASE_PATH}/pending/${encodeURIComponent(ctx.str('id'))}/reject`, {}),
};

export const organizeMemory: Command = {
  service: SERVICE,
  command: '+organize',
  description: 'Organize active memories in a target scope and wait for pending suggestions',
  flags: [
    { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID used for agent-scoped memory' },
    { name: 'scope', type: 'string', required: false, desc: 'Memory scope: global | agent' },
  ],
  risk: 'write',
  validate: (ctx) => {
    assertAllowed('scope', optionalString(ctx, 'scope'), scopes);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: dryRunUrl(ctx, `${BASE_PATH}/jobs`),
    body: organizeBody(ctx),
  }),
  execute: async (ctx) => {
    const payload = await postMemoryCli<MemoryJobResponse>(
      ctx,
      `${BASE_PATH}/jobs`,
      organizeBody(ctx),
    );
    return pollMemoryJob(ctx, payload);
  },
};

export const defaultGetMemory: Command = {
  service: SERVICE,
  command: '+default-get',
  description: 'Get the current Agent session defaults',
  flags: [{ name: 'agent-id', type: 'string', required: false, desc: 'Agent ID, defaults to current conversation Agent' }],
  risk: 'read',
  dryRun: (ctx) => ({ method: 'GET', url: dryRunUrl(ctx, defaultPath(ctx)) }),
  execute: (ctx) => getMemoryCli(ctx, defaultPath(ctx)),
};

export const defaultSaveMemory: Command = {
  service: SERVICE,
  command: '+default-save',
  description: 'Save current session selection as the Agent default',
  flags: [
    { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID, defaults to current conversation Agent' },
    { name: 'selection-json', type: 'string', required: false, desc: 'Session selection JSON, defaults to TE_AGENT_CURRENT_SESSION_SELECTION_JSON' },
  ],
  risk: 'write',
  validate: (ctx) => {
    defaultSaveBody(ctx);
  },
  dryRun: (ctx) => ({ method: 'PUT', url: dryRunUrl(ctx, defaultPath(ctx)), body: defaultSaveBody(ctx) }),
  execute: (ctx) => putMemoryCli(ctx, defaultPath(ctx), defaultSaveBody(ctx)),
};

export const defaultClearMemory: Command = {
  service: SERVICE,
  command: '+default-clear',
  description: 'Clear the current Agent session defaults',
  flags: [{ name: 'agent-id', type: 'string', required: false, desc: 'Agent ID, defaults to current conversation Agent' }],
  risk: 'write',
  dryRun: (ctx) => ({ method: 'DELETE', url: dryRunUrl(ctx, defaultPath(ctx)) }),
  execute: (ctx) => deleteMemoryCli(ctx, defaultPath(ctx)),
};

export const contextMemory: Command = {
  service: SERVICE,
  command: '+context',
  description: 'Preview the Top-K memory context for one Agent',
  flags: [
    { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID used for context resolution' },
    { name: 'limit', type: 'number', required: false, desc: 'Maximum number of memories, up to 50' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const limit = ctx.num('limit');
    if (limit && (limit < 1 || limit > 50)) throw new Error('--limit must be between 1 and 50');
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: dryRunUrl(ctx, `${BASE_PATH}/context`),
    body: { agentId: defaultAgentId(ctx), limit: ctx.num('limit') || undefined },
  }),
  execute: (ctx) =>
    postMemoryCli(ctx, `${BASE_PATH}/context`, compactObject({
      agentId: defaultAgentId(ctx),
      limit: ctx.num('limit') || undefined,
    })),
};

export const markUsedMemory: Command = {
  service: SERVICE,
  command: '+mark-used',
  description: 'Submit actual-use accounting for memories used in the current answer',
  flags: [
    { name: 'ids', type: 'json', required: true, desc: 'JSON array of 1 to 200 memory IDs actually used' },
    { name: 'agent-id', type: 'string', required: false, desc: 'Current Agent ID, defaults to TE_AGENT_CURRENT_AGENT_ID' },
  ],
  risk: 'write',
  validate: (ctx) => {
    markUsedBody(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: dryRunUrl(ctx, `${BASE_PATH}/use`),
    body: markUsedBody(ctx),
  }),
  execute: (ctx) =>
    postMemoryCli(ctx, `${BASE_PATH}/use`, markUsedBody(ctx), {
      retryOnUnauthorized: false,
    }),
};

export const writeContextMemory: Command = {
  service: SERVICE,
  command: '+write-context',
  description: 'Write the managed Top-K user-memory context into a target file',
  flags: [
    { name: 'file', type: 'string', required: true, desc: 'Required target file path selected by the Agent' },
    { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID used for context resolution' },
    { name: 'limit', type: 'number', required: false, desc: 'Maximum number of memories, up to 50' },
  ],
  risk: 'write',
  validate: (ctx) => {
    writeContextInput(ctx);
  },
  dryRun: (ctx) => {
    const input = writeContextInput(ctx);
    return {
      method: 'WRITE',
      url: input.file,
      body: compactObject({
        source: `${BASE_PATH}/context`,
        agentId: input.agentId,
        limit: input.limit,
        markers: [MANAGED_START, MANAGED_END],
      }),
    };
  },
  execute: async (ctx) => {
    const input = writeContextInput(ctx);
    const payload = await postMemoryCli<{ items: MemoryContextItem[] }>(
      ctx,
      `${BASE_PATH}/context`,
      compactObject({
        agentId: input.agentId,
        limit: input.limit,
      }),
    );
    return writeMemoryContextFile(input.file, payload.items ?? []);
  },
};

const commands: Command[] = [
  listMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
  extractMemory,
  submitCandidatesMemory,
  pendingList,
  pendingApprove,
  pendingReject,
  organizeMemory,
  defaultGetMemory,
  defaultSaveMemory,
  defaultClearMemory,
  contextMemory,
  markUsedMemory,
  writeContextMemory,
];

export default commands;
