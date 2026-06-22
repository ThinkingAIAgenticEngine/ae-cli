/**
 * ae-cli model -- interactively select and switch the model for the current PTY workspace
 *
 * Fetches /api/sandbox/models to display the personal/company/system models visible to the current user;
 * after the user selects one, submits the current workspacePath + Model.id (CUID) to the main app,
 * which updates Workspace.modelId and generates/pushes settings.json.
 *
 * Auth: X-Sandbox-Id + X-Sandbox-Secret-Key, injected by te-agent-client.
 *
 * Security:
 *   - SECRET_KEY / SANDBOX_SECRET_KEY are never printed; even in --verbose mode only *** is output
 *   - apiKey is not returned to ae-cli; the main app generates and pushes it via the sandbox internal interface
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
 * Derive the current model from settings.json:
 * - For personal/company models, prefer the model-id (Model.id) from ANTHROPIC_CUSTOM_HEADERS;
 * - For system models (no model-id), fall back to the provider modelId from the top-level model / env.ANTHROPIC_MODEL.
 *
 * The return value is used only to mark the current item in the interactive list; both fields are null when absent.
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
    process.stderr.write('No models visible to the current user\n');
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
    title: 'Select a model to use',
    items: sorted.map((model) => {
      const isCurrent = isCurrentModel(model, current);
      return {
        value: model,
        label: `${model.name}  ${model.scope}`,
        hint: isCurrent ? '(current)' : undefined,
        preselected: isCurrent,
      };
    }),
  });

  const workspace = getCurrentWorkspace();
  if (!workspace) {
    process.stderr.write('Please run ae-cli model from within a te-agent workspace directory\n');
    process.exitCode = 1;
    return;
  }

  if (isCurrentModel(picked, current)) {
    process.stdout.write('This model is already active\n');
    return;
  }

  await postSandboxModelSelection({
    workspacePath: workspace.name,
    modelId: picked.id,
  });

  process.stdout.write(`Switched to ${picked.name}\n`);
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
    process.stderr.write('Cancelled\n');
    return;
  }
  if (err instanceof TeAgentCredentialsError) {
    process.stderr.write(`✗ ${err.message}\n`);
    if (err.hint) process.stderr.write(`  ${err.hint}\n`);
    process.exitCode = 1;
    return;
  }
  if (err instanceof TeAgentApiError) {
    process.stderr.write(`✗ Main app error (${err.status}${err.code ? ' ' + err.code : ''}): ${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`✗ ${msg}\n`);
  process.exitCode = 1;
}
