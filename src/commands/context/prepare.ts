import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { executeCapabilityWithEnvelope } from '../../core/capability-api.js';
import { readCliAgentContext } from '../../core/cli-agent-context.js';
import { getCliToken } from '../../core/cli-token.js';
import { getConfigDir } from '../../core/config.js';
import { CliValidationError } from '../../core/errors.js';
import { normalizeUrl } from '../../core/url-utils.js';
import type { Command, RuntimeContext } from '../../framework/types.js';

type Scope = 'global_personal' | 'project_personal' | 'project_public';
type DirectoryEntry = {
  id: string;
  title: string;
  summary: string;
  keywords?: string[];
  revision: number;
  expired: boolean;
};
type Catalog = { complete: true; total: number; items: DirectoryEntry[]; truncated?: boolean; selection_policy?: string };
type Background = Record<string, unknown>;
type Snapshot = {
  version: 2;
  binding: string;
  prepared_at: string;
  background: Background;
  personal: Catalog;
  public?: Catalog;
};
type ContextItem = Record<string, unknown>;
interface Dependencies {
  call(host: string, capability: string, input: Record<string, unknown>): Promise<unknown>;
  identity(host: string): Promise<string>;
  session(): string | undefined;
  cacheRoot(): string;
}

const defaults: Dependencies = {
  call: async (host, capability, input) =>
    (await executeCapabilityWithEnvelope(host, 'analysis', capability, input)).data,
  // A credential is bound to its company and account. Persist only its digest; a
  // credential change conservatively starts another scope, including token rotation.
  identity: async (host) => digest(await getCliToken(host)),
  session: () => readCliAgentContext().agent_session_id,
  cacheRoot: () => join(getConfigDir(), 'analysis-context'),
};
const PAGE_CHARACTERS = 16_000;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function invalid(message: string): never {
  throw new CliValidationError(message, { code: 'ANALYSIS_CONTEXT_INVALID' });
}

function catalog(value: unknown): Catalog {
  const data = value as Catalog;
  if (!data || data.complete !== true || data.truncated === true || !Array.isArray(data.items)
      || data.total !== data.items.length) invalid('A complete semantic catalog is required.');
  const seen = new Set<string>();
  for (const row of data.items) {
    if (!row || typeof row.id !== 'string' || !row.id || seen.has(row.id)
        || typeof row.title !== 'string' || typeof row.summary !== 'string'
        || !Number.isSafeInteger(row.revision) || row.revision < 1 || typeof row.expired !== 'boolean'
        || (row.keywords !== undefined && (!Array.isArray(row.keywords)
          || row.keywords.some((keyword) => typeof keyword !== 'string')))) {
      invalid('A semantic catalog contains invalid or duplicate entries.');
    }
    seen.add(row.id);
  }
  return data;
}

function background(value: unknown): Background {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || typeof (value as Background).configured !== 'boolean') {
    invalid('Published background response must explicitly report configured.');
  }
  return value as Background;
}

function options(ctx: RuntimeContext, deps: Dependencies) {
  const session = ctx.str('session-id') || deps.session();
  if (!session?.trim() || session.length > 191 || /[\x00-\x1f\x7f]/.test(session)) {
    throw new CliValidationError('A stable Agent session ID is required for context preparation.', {
      code: 'ANALYSIS_CONTEXT_SESSION_REQUIRED',
      hint: 'Set agent_session_id in the effective CLI Agent context file, or pass --session-id. Use a new ID for each conversation.',
    });
  }
  const projectId = ctx.optionalNum('project-id');
  if (projectId !== undefined && (!Number.isSafeInteger(projectId) || projectId <= 0)) {
    invalid('project-id must be a positive integer when supplied.');
  }
  const page = ctx.optionalNum('page') ?? 1;
  if (!Number.isSafeInteger(page) || page < 1) invalid('page must be a positive integer.');
  return { session, projectId, page };
}

async function save(path: string, value: Snapshot) {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    await rename(temp, path);
  } finally {
    await unlink(temp).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function load(path: string, binding: string, project = false): Promise<Snapshot | undefined> {
  let value: Snapshot;
  try {
    value = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new CliValidationError('Context cache is unreadable. Use --refresh to prepare it again.', {
      code: 'ANALYSIS_CONTEXT_CACHE_INVALID',
    });
  }
  // Version 1 snapshots preferred personal copies; reload them under the new policy.
  if ((value as { version: number }).version === 1) return undefined;
  if (value.version !== 2 || value.binding !== binding) invalid('Context cache scope does not match this request.');
  background(value.background);
  catalog(value.personal);
  if (project && !value.public) invalid('Project context cache is missing its public catalog.');
  if (value.public) catalog(value.public);
  return value;
}

function directoryItems(catalog: Catalog, scope: Scope): ContextItem[] {
  return catalog.items.map((row) => ({ kind: 'semantic', scope, ...row }));
}

function pages(items: ContextItem[]): ContextItem[][] {
  const result: ContextItem[][] = [[]];
  let size = 0;
  for (const item of items) {
    const length = JSON.stringify(item).length;
    if (length > PAGE_CHARACTERS) invalid('A context item exceeds the bounded output size; it was not truncated.');
    if (size + length > PAGE_CHARACTERS && result.at(-1)!.length) {
      result.push([]);
      size = 0;
    }
    result.at(-1)!.push(item);
    size += length;
  }
  return result;
}

export function createContextPrepareCommand(overrides: Partial<Dependencies> = {}): Command {
  const deps = { ...defaults, ...overrides };
  return {
    service: 'context',
    command: 'prepare',
    description: 'Prepare company/global personal context, then optional project background and full personal/public catalogs. Reuse a private session snapshot.',
    helpText: 'Before every business workflow, use prepare without a project, consume all pages, select the project, then prepare --project-id. Existing business commands do not initialize context automatically.',
    flags: [
      { name: 'project-id', type: 'number', desc: 'Optional selected project. Omit until project selection; global preparation always precedes a new project scope.' },
      { name: 'session-id', type: 'string', desc: 'Stable conversation ID. Defaults to agent_session_id from the effective CLI Agent context.' },
      { name: 'page', type: 'number', desc: 'One-based bounded output page. Consume every page from the same cached snapshot. Default: 1.' },
      { name: 'refresh', type: 'boolean', desc: 'Explicitly replace this scope and its global snapshot after context changes. Not needed for ordinary follow-up actions.' },
    ],
    risk: 'read',
    sensitiveOutput: true,
    validate: (ctx) => { options(ctx, deps); },
    dryRun: async (ctx) => ({ workflow: 'analysis_context_prepare', ...options(ctx, deps), remote_writes: false }),
    execute: async (ctx) => {
      const { session, projectId, page } = options(ctx, deps);
      const host = normalizeUrl(ctx.host());
      const identity = await deps.identity(host);
      const binding = digest(JSON.stringify([host, identity, session]));
      const root = join(deps.cacheRoot(), binding);
      const globalPath = join(root, 'global.json');
      const projectPath = projectId === undefined ? undefined : join(root, `project-${projectId}.json`);
      const refresh = ctx.bool('refresh');
      if (refresh && page !== 1) invalid('Refresh must start at page 1.');
      if (refresh) {
        for (const path of [globalPath, projectPath]) {
          if (path) await unlink(path).catch((error) => { if (error.code !== 'ENOENT') throw error; });
        }
      }
      let global = refresh ? undefined : await load(globalPath, binding);
      let project = projectPath && !refresh ? await load(projectPath, `${binding}:${projectId}`, true) : undefined;
      const globalCached = !!global;
      const projectCached = !!project;
      if (page > 1 && (!global || (projectPath && !project))) {
        invalid('Prepare page 1 before requesting another page.');
      }
      const call = (operation: string, id: number, extra = {}) =>
        deps.call(host, `business_semantics.${operation}`, { project_id: id, ...extra });
      if (!global) {
        const company = background(await call('background.get', 0));
        const personal = catalog(await call('global_personal_context.list', -1));
        global = { version: 2, binding, prepared_at: new Date().toISOString(), background: company, personal };
        await mkdir(root, { recursive: true, mode: 0o700 });
        await save(globalPath, global);
      }
      if (projectId !== undefined && !project) {
        const published = background(await call('background.get', projectId));
        const personal = catalog(await call('personal_context.list', projectId, { for_analysis_context: true }));
        if (personal.selection_policy !== 'ANALYSIS_CONTEXT') {
          invalid('The server must support analysis-context personal semantic filtering. Deploy the matching Common service.');
        }
        const projectPublic = catalog(await call('project_context.list', projectId));
        project = { version: 2, binding: `${binding}:${projectId}`, prepared_at: new Date().toISOString(),
          background: published, personal, public: projectPublic };
        await save(projectPath!, project);
      }
      const items: ContextItem[] = [
        { kind: 'background', scope: 'company', ...global.background },
        ...directoryItems(global.personal, 'global_personal'),
        ...(project ? [
          { kind: 'background', scope: 'project', ...project.background },
          ...directoryItems(project.personal, 'project_personal'),
          ...directoryItems(project.public!, 'project_public'),
        ] : []),
      ];
      const outputPages = pages(items);
      if (page > outputPages.length) invalid('Requested context page does not exist.');
      return {
        workflow: 'analysis_context_prepare', phase: project ? 'project' : 'global',
        session_id: session, ...(projectId === undefined ? {} : { project_id: projectId }),
        cache_hit: globalCached && (!project || projectCached),
        global_cache_hit: globalCached, ...(project ? { project_cache_hit: projectCached } : {}),
        prepared_at: project?.prepared_at ?? global.prepared_at,
        complete: true, page, total_pages: outputPages.length, remaining_pages: outputPages.length - page,
        total_source_entries: global.personal.total + (project?.personal.total ?? 0) + (project?.public?.total ?? 0),
        total_presented_entries: items.filter((item) => item.kind === 'semantic').length,
        items: outputPages[page - 1], remote_writes: false,
        next_action: page < outputPages.length
          ? `Read context prepare --page ${page + 1}${projectId === undefined ? '' : ` --project-id ${projectId}`} with the same host/session.`
          : 'Retain this complete context. Read relevant current details and dependencies by original ID; mark only actually adopted entries. Preparation is not semantic use.',
      };
    },
  };
}

export const contextPrepare = createContextPrepareCommand();
