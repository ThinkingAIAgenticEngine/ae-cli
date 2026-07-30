/**
 * ae-cli sync -- manually sync sandbox-local Skills / MCPs with the te-claude main app
 *
 * Flow:
 *   1. Read /home/ta/te_agent_ta/.env (or process.env) to validate the sandbox environment;
 *   2. Single-select sync direction (workspace -> main app / main app -> workspace);
 *   3. Single-select resource type (skills / mcp / both);
 *   4. push direction: scan local -> multi-select -> upload Skills individually; push MCPs in a JSON batch;
 *   5. pull direction: fetch main-app candidates -> multi-select -> call /api/sandbox/sync/pull to materialize into workspace;
 *   6. Render a table with the result of each item (synced / failed).
 *
 * Auth: X-Sandbox-Id + X-Sandbox-Secret-Key, injected automatically by te-agent-client.
 * Scope: this release syncs personal scope only. company / system are managed by admins via other paths.
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import JSZip from 'jszip';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { printError } from '../../framework/output.js';
import {
  postToMainApp,
  uploadToMainApp,
  getSandboxSyncPullCandidates,
  postSandboxSyncPull,
  TeAgentApiError,
  type SandboxSyncPullCandidate,
  type SandboxSyncPullResult,
} from '../../core/te-agent-client.js';
import { TeAgentCredentialsError } from '../../core/te-agent-credentials.js';
import {
  promptMultiselect,
  promptSingleSelect,
  MultiselectCancelled,
  type MultiselectItem,
} from '../../core/multiselect.js';
import {
  scanSkills,
  scanMcps,
  splitPushableMcps,
  describeSource,
  getCurrentWorkspace,
  type McpSource,
  type SkillSource,
  type SkillCandidate,
  type McpCandidate,
} from './scanners.js';
import { updateMcpManifestForProjectSource, updateSkillManifestForSource } from './local-copy.js';
import { assertSkillDocumentSize } from '../te-agent/skill-version.js';

type Kind = 'skill' | 'mcp';
type ResourceKind = Kind | 'both';
type Direction = 'push' | 'pull';

export interface PushSkillItem {
  kind: 'skill';
  slug: string;
  scope: 'personal';
  source: SkillSource;
  workspacePath?: string;
  event: 'upsert';
  dirPath: string;
  content: string;
  checksum: string;
  mtime: string;
}

interface PushMcpItem {
  kind: 'mcp';
  slug: string;
  scope: 'personal';
  source: McpSource;
  workspacePath?: string;
  workspaceDir?: string;
  event: 'upsert';
  transport: 'http' | 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

interface PushResult {
  results: SyncResultRow[];
}

interface SkillPushResponse {
  item: { id: string };
  workspaceEnabled: boolean;
}

export interface PushSkillDependencies {
  upload(path: string, formData: FormData): Promise<SkillPushResponse>;
  updateManifest(sourceDir: string, slug: string): unknown;
}

interface SyncResultRow {
  kind: Kind;
  slug: string;
  status: 'synced' | 'failed';
  message?: string;
}

function redactEnv(env: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!env) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (/TOKEN|SECRET|KEY|PASSWORD/i.test(k)) {
      out[k] = '***';
    } else {
      out[k] = v;
    }
  }
  return out;
}

const SOURCE_ORDER: Record<string, number> = {
  global: 0,
  workspace: 1,
  project: 0,
  local: 1,
  user: 2,
};

function skillToItem(s: SkillCandidate): PushSkillItem {
  return {
    kind: 'skill',
    slug: s.slug,
    scope: 'personal',
    source: s.source,
    workspacePath: s.workspacePath,
    event: 'upsert',
    dirPath: s.dirPath,
    content: s.content,
    checksum: s.checksum,
    mtime: s.mtime,
  };
}

function mcpToItem(m: McpCandidate, includeSecrets: boolean): PushMcpItem {
  return {
    kind: 'mcp',
    slug: m.slug,
    scope: 'personal',
    source: m.source,
    workspacePath: m.workspacePath,
    workspaceDir: m.workspaceDir,
    event: 'upsert',
    transport: m.transport,
    url: m.url,
    command: m.command,
    args: m.args,
    env: includeSecrets ? m.env : redactEnv(m.env),
    headers: m.headers,
  };
}

async function selectSkills(): Promise<PushSkillItem[]> {
  const all = scanSkills();
  if (all.length === 0) {
    process.stderr.write('No Skills found (scanned current workspace .claude/skills)\n');
    return [];
  }
  // Sort by source group, then slug.
  all.sort((a, b) => {
    if (a.source !== b.source) return SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
    return a.slug.localeCompare(b.slug);
  });
  const items: MultiselectItem<SkillCandidate>[] = all.map((s) => ({
    value: s,
    label: s.slug,
    group: describeSource(s),
    hint: s.isSymlink ? '(symlink)' : undefined,
  }));
  const picked = await promptMultiselect({
    title: 'Select Skills to push to the main app',
    items,
  });
  return picked.map(skillToItem);
}

async function selectMcps(includeSecrets: boolean): Promise<PushMcpItem[]> {
  const all = scanMcps();
  if (all.length === 0) {
    process.stderr.write(
      'No MCPs found (scanned current workspace .mcp.json / .claude/.claude.json and global ~/.claude.json)\n',
    );
    return [];
  }
  const { supported, unsupportedStdio } = splitPushableMcps(all);

  if (unsupportedStdio.length > 0) {
    const names = unsupportedStdio
      .map((m) => m.slug)
      .sort()
      .join(', ');
    process.stderr.write(`ae-cli sync push only supports http/sse MCPs; skipped stdio MCPs: ${names}\n`);
  }
  if (supported.length === 0) {
    process.stderr.write('No syncable MCPs found. ae-cli sync push only supports http/sse.\n');
    return [];
  }

  supported.sort((a, b) => {
    if (a.source !== b.source) return SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
    return a.slug.localeCompare(b.slug);
  });
  const items: MultiselectItem<McpCandidate>[] = supported.map((m) => ({
    value: m,
    label: m.slug,
    group: describeSource(m),
    hint: m.hasSecrets && !includeSecrets ? '(env redacted)' : undefined,
  }));
  const picked = await promptMultiselect({
    title: 'Select MCPs to push to the main app',
    items,
  });
  return picked.map((m) => mcpToItem(m, includeSecrets));
}

function renderResults(results: SyncResultRow[]) {
  const table = new Table({
    head: ['kind', 'slug', 'status', 'message'],
    wordWrap: true,
  });
  for (const r of results) {
    table.push([r.kind, r.slug, r.status, r.message ?? '']);
  }
  process.stdout.write(table.toString() + '\n');

  const failed = results.filter((r) => r.status === 'failed').length;
  if (failed > 0) {
    process.stderr.write(`\n✗ ${failed} item(s) failed\n`);
  }
}

async function selectPullResources(args: {
  title: string;
  candidates: SandboxSyncPullCandidate[];
}): Promise<SandboxSyncPullCandidate[]> {
  const all = args.candidates
    .filter((candidate) => candidate.selected)
    .sort((a, b) => {
      const scopeOrder: Record<SandboxSyncPullCandidate['scope'], number> = {
        system: 0,
        company: 1,
        personal: 2,
      };
      const scopeDiff = scopeOrder[a.scope] - scopeOrder[b.scope];
      return scopeDiff !== 0 ? scopeDiff : a.name.localeCompare(b.name);
    });
  if (all.length === 0) {
    process.stderr.write(`${args.title}: no candidates available to sync\n`);
    return [];
  }
  const items: MultiselectItem<SandboxSyncPullCandidate>[] = all.map((candidate) => ({
    value: candidate,
    label: `${candidate.name}  ${candidate.scope}`,
    preselected: true,
  }));
  return promptMultiselect({ title: args.title, items });
}

function toHttpItems(items: Array<PushSkillItem | PushMcpItem>) {
  return items.map((item) => {
    if (item.kind === 'skill') {
      const { kind: _kind, dirPath: _dirPath, ...rest } = item;
      return rest;
    }
    const { kind: _kind, workspaceDir: _workspaceDir, ...rest } = item;
    return rest;
  });
}

async function pushItems(kind: Kind, items: Array<PushSkillItem | PushMcpItem>): Promise<PushResult> {
  if (items.length === 0) return { results: [] };
  // Request body shape: { kind, items: [...] }; sandbox internal auth is handled by the client
  try {
    const resp = await postToMainApp<PushResult>('/api/sandbox/sync/push', {
      kind,
      items: toHttpItems(items),
    });
    return { results: resp.results ?? [] };
  } catch (err: unknown) {
    if (err instanceof TeAgentApiError) {
      // Entire batch failed: mark every item as failed
      return {
        results: items.map((it) => ({
          kind: it.kind,
          slug: it.slug,
          status: 'failed' as const,
          message: `${err.code ?? err.status} ${err.message}`,
        })),
      };
    }
    throw err;
  }
}

export function readSkillVersion(content: string): string | undefined {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1];
  if (!frontmatter) return undefined;
  const matches = [...frontmatter.matchAll(/^version\s*:\s*(.+?)\s*(?:#.*)?$/gm)];
  if (matches.length !== 1) return undefined;
  const value = matches[0][1].trim().replace(/^(['"])(.*)\1$/, '$2');
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) ? value : undefined;
}

export async function buildSkillZip(dirPath: string): Promise<Buffer> {
  const zip = new JSZip();
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === '.DS_Store') continue;
      const absolute = join(dir, name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error(`Skill package contains a symlink: ${relative(dirPath, absolute)}`);
      }
      if (stat.isDirectory()) visit(absolute);
      else if (stat.isFile()) {
        const content = readFileSync(absolute);
        if (relative(dirPath, absolute).replaceAll('\\', '/') === 'SKILL.md') {
          assertSkillDocumentSize(content);
        }
        zip.file(relative(dirPath, absolute).replaceAll('\\', '/'), content);
      }
    }
  };
  visit(dirPath);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const defaultPushSkillDependencies: PushSkillDependencies = {
  upload: (path, formData) => uploadToMainApp<SkillPushResponse>(path, formData),
  updateManifest: updateSkillManifestForSource,
};

export async function pushSkillItems(
  items: PushSkillItem[],
  dependencies: PushSkillDependencies = defaultPushSkillDependencies,
): Promise<PushResult> {
  const results: SyncResultRow[] = [];
  for (const item of items) {
    try {
      const buffer = await buildSkillZip(item.dirPath);
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(buffer)], { type: 'application/zip' }), `${item.slug}.zip`);
      formData.append('slug', item.slug);
      formData.append('source', item.source);
      if (item.workspacePath) formData.append('workspacePath', item.workspacePath);
      const version = readSkillVersion(item.content);
      if (version) formData.append('version', version);
      const response = await dependencies.upload('/api/sandbox/sync/push/skill', formData);
      dependencies.updateManifest(item.dirPath, item.slug);
      results.push({
        kind: 'skill',
        slug: item.slug,
        status: 'synced',
        ...(!response.workspaceEnabled && item.source === 'workspace'
          ? {
              message: 'Skill synced, but it was not enabled in the current workspace',
            }
          : {}),
      });
    } catch (err: unknown) {
      const message =
        err instanceof TeAgentApiError
          ? `${err.code ?? err.status} ${err.message}`
          : ((err as Error)?.message ?? String(err));
      results.push({
        kind: 'skill',
        slug: item.slug,
        status: 'failed',
        message,
      });
    }
  }
  return { results };
}

function updateSyncedProjectMcpManifest(mcpItems: PushMcpItem[], resp: PushResult): void {
  if (mcpItems.length === 0) return;
  const bySlug = new Map(mcpItems.map((item) => [item.slug, item]));
  for (const result of resp.results) {
    if (result.kind !== 'mcp' || result.status !== 'synced') continue;
    const item = bySlug.get(result.slug);
    if (!item || item.source !== 'project') continue;
    if (!item.workspaceDir) {
      result.status = 'failed';
      result.message = 'Main app synced the MCP, but local MCP manifest update failed: missing workspaceDir';
      continue;
    }
    try {
      updateMcpManifestForProjectSource(item.workspaceDir, item.slug);
    } catch (err: unknown) {
      result.status = 'failed';
      result.message = `Main app synced the MCP, but local MCP manifest update failed: ${(err as Error)?.message ?? String(err)}`;
    }
  }
}

async function selectDirection(optsDirection: string | undefined): Promise<Direction> {
  if (optsDirection === 'push' || optsDirection === 'pull') return optsDirection;
  if (optsDirection) {
    throw new Error('--direction must be push or pull');
  }
  return promptSingleSelect<Direction>({
    title: 'Sync direction?',
    items: [
      { value: 'push', label: 'Workspace -> Main app' },
      { value: 'pull', label: 'Main app -> Workspace' },
    ],
  });
}

async function selectKind(optsKind: string | undefined): Promise<ResourceKind> {
  if (optsKind === 'skill' || optsKind === 'mcp' || optsKind === 'both') return optsKind;
  if (optsKind) {
    throw new Error('--kind must be skill, mcp, or both');
  }
  return promptSingleSelect<ResourceKind>({
    title: 'Which resource type to sync?',
    items: [
      { value: 'skill', label: 'Skills' },
      { value: 'mcp', label: 'MCPs' },
      { value: 'both', label: 'Skills + MCPs' },
    ],
  });
}

async function runPush(kind: ResourceKind, includeSecrets: boolean): Promise<void> {
  const skillItems = kind !== 'mcp' ? await selectSkills() : [];
  const mcpItems = kind !== 'skill' ? await selectMcps(includeSecrets) : [];

  if (skillItems.length === 0 && mcpItems.length === 0) {
    process.stderr.write('Nothing selected, exiting\n');
    return;
  }

  process.stderr.write(`Pushing ${skillItems.length} Skill(s) / ${mcpItems.length} MCP(s) ...\n`);

  const allResults: SyncResultRow[] = [];
  if (skillItems.length > 0) {
    const skillResp = await pushSkillItems(skillItems);
    allResults.push(...skillResp.results);
  }
  if (mcpItems.length > 0) {
    const mcpResp = await pushItems('mcp', mcpItems);
    updateSyncedProjectMcpManifest(mcpItems, mcpResp);
    allResults.push(...mcpResp.results);
  }
  renderResults(allResults);
}

function pullResultRows(resp: SandboxSyncPullResult): SyncResultRow[] {
  return (resp.results ?? []).map((result) => ({
    kind: result.kind,
    slug: result.name,
    status: result.status,
    message: result.message,
  }));
}

async function runPull(kind: ResourceKind): Promise<void> {
  const workspace = getCurrentWorkspace();
  if (!workspace) {
    throw new Error('Current workspace not recognized; please run from within /home/ta/workspaces/<workspace>');
  }

  const candidates = await getSandboxSyncPullCandidates({
    workspacePath: workspace.name,
    kind,
  });
  const skillItems =
    kind !== 'mcp'
      ? await selectPullResources({
          title: 'Select Skills to sync to workspace',
          candidates: (candidates.skills ?? []).filter((candidate) => candidate.scope !== 'system'),
        })
      : [];
  const mcpItems =
    kind !== 'skill'
      ? await selectPullResources({
          title: 'Select MCPs to sync to workspace',
          candidates: candidates.mcp ?? [],
        })
      : [];

  if (skillItems.length === 0 && mcpItems.length === 0) {
    process.stderr.write('Nothing selected, exiting\n');
    return;
  }

  process.stderr.write(`Syncing to workspace: ${skillItems.length} Skill(s) / ${mcpItems.length} MCP(s) ...\n`);
  const resp = await postSandboxSyncPull({
    workspacePath: workspace.name,
    kind,
    skills: skillItems.map((item) => item.id),
    mcp: mcpItems.map((item) => item.id),
  });
  renderResults(pullResultRows(resp));
}

export function registerSync(program: Command): void {
  program
    .command('sync')
    .description('Sync Skills / MCPs between current workspace and te-claude main app')
    .option('--direction <direction>', 'push | pull (skip interactive direction picker)')
    .option('--include-secrets', 'Include MCP env secrets (TOKEN/SECRET/KEY) in push', false)
    .option('--kind <kind>', 'skill | mcp | both (skip interactive picker)')
    .action(async (opts: { direction?: string; includeSecrets?: boolean; kind?: string }) => {
      try {
        const direction = await selectDirection(opts.direction);
        const kind = await selectKind(opts.kind);
        if (direction === 'push') await runPush(kind, !!opts.includeSecrets);
        else await runPull(kind);
      } catch (err: unknown) {
        if (err instanceof MultiselectCancelled) {
          process.stderr.write('Cancelled\n');
          return;
        }
        if (err instanceof TeAgentCredentialsError) {
          printError('config', err.message, err.hint);
          process.exit(1);
        }
        if (err instanceof TeAgentApiError) {
          printError('api', err.message, err.code);
          process.exit(1);
        }
        const e = err as Error;
        printError('api', e?.message ?? String(err));
        process.exit(1);
      }
    });
}
