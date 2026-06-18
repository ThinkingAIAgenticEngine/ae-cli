/**
 * ae-cli model —— 交互选择并切换当前 PTY 工作空间的模型
 *
 * 拉 /api/sandbox/models 展示当前用户可见的 personal/company/system 模型；
 * 用户选择后，把当前 workspacePath + Model.id（CUID）提交给主应用，由主应用更新
 * Workspace.modelId 并统一生成 / 推送 settings.json。
 *
 * 鉴权：X-Sandbox-Id + X-Sandbox-Secret-Key，由 te-agent-client 注入。
 *
 * 安全：
 *   - SECRET_KEY / SANDBOX_SECRET_KEY 不打印；--verbose 模式下也仅输出 ***
 *   - apiKey 不返回 ae-cli，由主应用生成并通过沙箱内部接口推送 settings.json
 */

import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getSandboxModels,
  postSandboxModelSelection,
  type SandboxModelSummary,
  TeAgentApiError,
} from '../../core/te-agent-client.js';
import {
  TeAgentCredentialsError,
  getClaudeConfigDir,
} from '../../core/te-agent-credentials.js';
import { MultiselectCancelled, promptSingleCheckboxSelect } from '../../core/multiselect.js';
import { getCurrentWorkspace } from '../sync/scanners.js';

export interface CurrentModelSelection {
  routingModelId: string | null;
  providerModelId: string | null;
}

/**
 * 从 settings.json 反推当前模型：
 * - personal/company 模型优先用 ANTHROPIC_CUSTOM_HEADERS 中的 model-id（Model.id）；
 * - system 模型没有 model-id，回退到顶层 model / env.ANTHROPIC_MODEL 的 provider modelId。
 *
 * 返回值仅用于交互列表的当前项标记；缺失时两个字段均为 null。
 */
export function readCurrentModelSelection(): CurrentModelSelection {
  const settingsPath = join(getClaudeConfigDir(), 'settings.json');
  if (!existsSync(settingsPath)) return { routingModelId: null, providerModelId: null };
  try {
    const raw = readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { routingModelId: null, providerModelId: null };
    }
    const env = parsed.env && typeof parsed.env === 'object' ? parsed.env : {};
    const headers =
      typeof env.ANTHROPIC_CUSTOM_HEADERS === 'string'
        ? env.ANTHROPIC_CUSTOM_HEADERS
        : undefined;
    const routingModelId = extractModelIdHeader(headers);
    const providerModelId =
      typeof parsed.model === 'string' && parsed.model
        ? parsed.model
        : typeof env.ANTHROPIC_MODEL === 'string' && env.ANTHROPIC_MODEL
          ? env.ANTHROPIC_MODEL
          : null;
    return { routingModelId, providerModelId };
  } catch {
    return { routingModelId: null, providerModelId: null };
  }
}

export function extractModelIdHeader(headers: string | undefined): string | null {
  if (!headers) return null;
  for (const line of headers.split(/\r?\n/)) {
    const match = line.match(/^\s*model-id\s*:\s*(.+?)\s*$/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function isCurrentModel(model: SandboxModelSummary, current: CurrentModelSelection): boolean {
  if (current.routingModelId) return model.id === current.routingModelId;
  return model.scope === 'system' && Boolean(current.providerModelId) && model.modelId === current.providerModelId;
}

async function runModelPicker(): Promise<void> {
  const current = readCurrentModelSelection();
  const models = await getSandboxModels();
  if (models.length === 0) {
    process.stderr.write('当前用户无可见模型\n');
    return;
  }

  const sorted = models.slice().sort((a, b) => {
    const scopeOrder: Record<SandboxModelSummary['scope'], number> = {
      system: 0,
      company: 1,
      personal: 2,
    };
    const scopeDiff = scopeOrder[a.scope] - scopeOrder[b.scope];
    return scopeDiff !== 0 ? scopeDiff : a.name.localeCompare(b.name);
  });

  const picked = await promptSingleCheckboxSelect<SandboxModelSummary>({
    title: '选择要使用的模型',
    items: sorted.map((model) => {
      const isCurrent = isCurrentModel(model, current);
      return {
        value: model,
        label: `${model.name}  ${model.scope}`,
        hint: isCurrent ? '(当前)' : undefined,
        preselected: isCurrent,
      };
    }),
  });

  const workspace = getCurrentWorkspace();
  if (!workspace) {
    process.stderr.write('请在 te-agent 工作空间目录内执行 ae-cli model\n');
    process.exitCode = 1;
    return;
  }

  if (isCurrentModel(picked, current)) {
    process.stdout.write('当前已使用该模型\n');
    return;
  }

  await postSandboxModelSelection({
    workspacePath: workspace.name,
    modelId: picked.id,
  });

  process.stdout.write(`已切换为 ${picked.name}\n`);
}

export function registerModel(program: Command): void {
  program
    .command('model')
    .description('Choose and switch the current workspace model (te-agent sandbox only)')
    .action(async () => {
      try {
        await runModelPicker();
      } catch (err: unknown) {
        handleError(err);
      }
    });
}

function handleError(err: unknown): void {
  if (err instanceof MultiselectCancelled) {
    process.stderr.write('已取消\n');
    return;
  }
  if (err instanceof TeAgentCredentialsError) {
    process.stderr.write(`✗ ${err.message}\n`);
    if (err.hint) process.stderr.write(`  ${err.hint}\n`);
    process.exitCode = 1;
    return;
  }
  if (err instanceof TeAgentApiError) {
    process.stderr.write(`✗ 主应用错误（${err.status}${err.code ? ' ' + err.code : ''}）：${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`✗ ${msg}\n`);
  process.exitCode = 1;
}
