/**
 * ae-cli sync —— 手动同步沙箱本地 Skill / MCP 与 te-claude 主应用
 *
 * 流程：
 *   1. 读 /home/ta/te_agent_ta/.env（或 process.env）校验沙箱环境；
 *   2. 单选同步方向（工作空间 -> 主应用 / 主应用 -> 工作空间）；
 *   3. 单选资源类型（skills / mcp / both）；
 *   4. push 方向：扫描本地 → 多选 → 调 /api/sandbox/sync/push 更新 DB；
 *   5. pull 方向：拉主应用候选 → 多选 → 调 /api/sandbox/sync/pull 物化到 workspace；
 *   6. 表格输出每项结果（synced / failed）。
 *
 * 鉴权：X-Sandbox-Id + X-Sandbox-Secret-Key，由 te-agent-client 自动注入。
 * 范围：本期只同步 personal scope。company / system 由管理员通过其它路径维护。
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { printError } from '../../framework/output.js';
import {
  postToMainApp,
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
  describeSource,
  getCurrentWorkspace,
  type SkillCandidate,
  type McpCandidate,
} from './scanners.js';
import { copySkillPackageToTarget, updateSkillManifestForSource } from './local-copy.js';

type Kind = 'skill' | 'mcp';
type ResourceKind = Kind | 'both';
type Direction = 'push' | 'pull';

interface PushSkillItem {
  kind: 'skill';
  slug: string;
  scope: 'personal';
  source: 'workspace' | 'global';
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
  source: 'workspace' | 'global';
  workspacePath?: string;
  event: 'upsert';
  transport: 'http' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

interface PushResult {
  skillTargetRoot?: string;
  results: SyncResultRow[];
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
    process.stderr.write('未找到任何 Skill（扫描了当前工作空间 .claude/skills）\n');
    return [];
  }
  // 按来源分组排序：先 global 后 workspace
  all.sort((a, b) => {
    if (a.source !== b.source) return a.source === 'global' ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
  const items: MultiselectItem<SkillCandidate>[] = all.map((s) => ({
    value: s,
    label: s.slug,
    group: describeSource(s),
    hint: s.isSymlink ? '(symlink)' : undefined,
  }));
  const picked = await promptMultiselect({ title: '选择要推送到主应用的 Skill', items });
  return picked.map(skillToItem);
}

async function selectMcps(includeSecrets: boolean): Promise<PushMcpItem[]> {
  const all = scanMcps();
  if (all.length === 0) {
    process.stderr.write('未找到任何 MCP（扫描了当前工作空间 .mcp.json / .claude/.claude.json 与全局 ~/.claude.json）\n');
    return [];
  }
  all.sort((a, b) => {
    if (a.source !== b.source) return a.source === 'global' ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
  const items: MultiselectItem<McpCandidate>[] = all.map((m) => ({
    value: m,
    label: m.slug,
    group: describeSource(m),
    hint: m.hasSecrets && !includeSecrets ? '(env 已脱敏)' : undefined,
  }));
  const picked = await promptMultiselect({ title: '选择要推送到主应用的 MCP', items });
  return picked.map((m) => mcpToItem(m, includeSecrets));
}

function renderResults(results: SyncResultRow[]) {
  const table = new Table({ head: ['kind', 'slug', 'status', 'message'], wordWrap: true });
  for (const r of results) {
    table.push([r.kind, r.slug, r.status, r.message ?? '']);
  }
  process.stdout.write(table.toString() + '\n');

  const failed = results.filter((r) => r.status === 'failed').length;
  if (failed > 0) {
    process.stderr.write(`\n✗ 有 ${failed} 项失败\n`);
  }
}

async function selectPullResources(args: {
  title: string;
  candidates: SandboxSyncPullCandidate[];
}): Promise<SandboxSyncPullCandidate[]> {
  const all = args.candidates.filter((candidate) => candidate.selected).sort((a, b) => {
    const scopeOrder: Record<SandboxSyncPullCandidate['scope'], number> = {
      system: 0,
      company: 1,
      personal: 2,
    };
    const scopeDiff = scopeOrder[a.scope] - scopeOrder[b.scope];
    return scopeDiff !== 0 ? scopeDiff : a.name.localeCompare(b.name);
  });
  if (all.length === 0) {
    process.stderr.write(`${args.title} 无可同步候选\n`);
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
    const { kind: _kind, ...rest } = item;
    return rest;
  });
}

async function pushItems(kind: Kind, items: Array<PushSkillItem | PushMcpItem>): Promise<PushResult> {
  if (items.length === 0) return { results: [] };
  // 接口 body 形态：{ kind, items: [...] }；client 已处理 sandbox internal auth
  try {
    const resp = await postToMainApp<PushResult>('/api/sandbox/sync/push', {
      kind,
      items: toHttpItems(items),
    });
    return { skillTargetRoot: resp.skillTargetRoot, results: resp.results ?? [] };
  } catch (err: unknown) {
    if (err instanceof TeAgentApiError) {
      // 整批失败：把每项标记为 failed
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

function copySyncedSkillPackages(skillItems: PushSkillItem[], resp: PushResult): void {
  if (skillItems.length === 0) return;
  const bySlug = new Map(skillItems.map((item) => [item.slug, item]));
  for (const result of resp.results) {
    if (result.kind !== 'skill' || result.status !== 'synced') continue;
    const item = bySlug.get(result.slug);
    if (!item) continue;
    if (!resp.skillTargetRoot) {
      result.status = 'failed';
      result.message = '主应用响应缺少 skillTargetRoot，无法复制 Skill package';
      continue;
    }
    try {
      const copied = copySkillPackageToTarget({
        sourceDir: item.dirPath,
        targetRoot: resp.skillTargetRoot,
        slug: item.slug,
      });
      updateSkillManifestForSource(item.dirPath, item.slug);
      if (copied.skipped) {
        result.message = '源目录已是目标目录，跳过本地复制';
      }
    } catch (err: unknown) {
      result.status = 'failed';
      result.message = `本地复制失败：${(err as Error)?.message ?? String(err)}`;
    }
  }
}

async function selectDirection(optsDirection: string | undefined): Promise<Direction> {
  if (optsDirection === 'push' || optsDirection === 'pull') return optsDirection;
  if (optsDirection) {
    throw new Error('--direction 仅支持 push 或 pull');
  }
  return promptSingleSelect<Direction>({
    title: '同步方向？',
    items: [
      { value: 'push', label: '工作空间 -> 主应用' },
      { value: 'pull', label: '主应用 -> 工作空间' },
    ],
  });
}

async function selectKind(optsKind: string | undefined): Promise<ResourceKind> {
  if (optsKind === 'skill' || optsKind === 'mcp' || optsKind === 'both') return optsKind;
  if (optsKind) {
    throw new Error('--kind 仅支持 skill、mcp 或 both');
  }
  return promptSingleSelect<ResourceKind>({
    title: '同步哪类资源？',
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
    process.stderr.write('未选择任何项，已退出\n');
    return;
  }

  process.stderr.write(`推送 ${skillItems.length} 个 Skill / ${mcpItems.length} 个 MCP ...\n`);

  const allResults: SyncResultRow[] = [];
  if (skillItems.length > 0) {
    const skillResp = await pushItems('skill', skillItems);
    copySyncedSkillPackages(skillItems, skillResp);
    allResults.push(...skillResp.results);
  }
  if (mcpItems.length > 0) {
    const mcpResp = await pushItems('mcp', mcpItems);
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
    throw new Error('未识别当前工作空间，请在 /home/ta/workspaces/<workspace> 下执行');
  }

  const candidates = await getSandboxSyncPullCandidates({
    workspacePath: workspace.name,
    kind,
  });
  const skillItems =
    kind !== 'mcp'
      ? await selectPullResources({
          title: '选择要同步到工作空间的 Skill',
          candidates: candidates.skills ?? [],
        })
      : [];
  const mcpItems =
    kind !== 'skill'
      ? await selectPullResources({
          title: '选择要同步到工作空间的 MCP',
          candidates: candidates.mcp ?? [],
        })
      : [];

  if (skillItems.length === 0 && mcpItems.length === 0) {
    process.stderr.write('未选择任何项，已退出\n');
    return;
  }

  process.stderr.write(`同步到工作空间 ${skillItems.length} 个 Skill / ${mcpItems.length} 个 MCP ...\n`);
  const resp = await postSandboxSyncPull({
    workspacePath: workspace.name,
    kind,
    skills: skillItems.map((item) => item.id),
    mcp: mcpItems.map((item) => item.id),
    ifUnmodifiedSince: candidates.mtime,
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
          process.stderr.write('已取消\n');
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
