import { CapabilityGatewayError, executeCapabilityWithEnvelope } from '../../core/capability-api.js';
import { unwrapOutputData } from '../../framework/output.js';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildAssetPackageInput, projectSemanticAssetPackageExport } from './asset-package/export.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const scopes = new Set(['none', 'certified', 'frequent', 'all', 'specified']);

function options(ctx: RuntimeContext) {
  const scope = ctx.str('asset-scope') || 'certified';
  if (!scopes.has(scope)) throw new Error('asset-scope must be none, certified, frequent, all, or specified.');
  const materials: unknown = ctx.json('materials');
  if (
    materials !== undefined &&
    (!Array.isArray(materials) || materials.some((file) => typeof file !== 'string' || !file.trim()))
  )
    throw new Error('materials must be an array of local file paths.');
  if (scope === 'none' && (!Array.isArray(materials) || !materials.length))
    throw new Error('Provide materials or select an asset scope.');
  const output = ctx.str('output');
  if (!output) throw new Error('output must name a new private setup directory.');
  if (!Number.isInteger(ctx.num('project-id')) || ctx.num('project-id') <= 0)
    throw new Error('project-id must be a positive integer.');
  if (scope !== 'none')
    buildAssetPackageInput({
      ...ctx,
      str: (name) => (name === 'asset-scope' ? scope : ctx.str(name)),
    });
  else if (ctx.json('asset-refs') !== undefined) throw new Error('asset-refs requires specified asset scope.');
  return {
    scope,
    materials: (materials || []) as string[],
    output: resolve(output),
  };
}

const reference = 'skills/ae-analysis/references/project_semantic_setup.md';
const nextSteps = [
  'Read the complete retained semantic catalogs with the bundled catalog pager; do not mark use during management.',
  'Read every input material and the selected asset indexes; inspect exact definitions and necessary dependencies. File inventory is not evidence extraction.',
  'Synthesize one project background draft, distinct semantic candidates, source locators, conflicts and unanswered questions. Do not mechanically create one entry per file or asset.',
  'Read likely existing matches by exact ID without marking use; propose CREATE, UPDATE or KEEP with scope, revision and source evidence.',
  'Present all proposed writes for user confirmation. Persist an approved local import plan and reuse unchanged request IDs when resuming.',
  'Save confirmed project entries through existing project_context capabilities and the background as a draft. Publish background only with separate explicit intent.',
];

export const projectSemanticSetup: Command = {
  service: 'project-semantic',
  command: 'setup',
  description:
    'Prepare a private evidence workspace for the CLI Agent project-semantics setup workflow; never generates or saves business facts automatically.',
  helpText: `This read-only L1 workflow reuses asset-package export and existing background/catalog reads. Continue with ${reference}.`,
  risk: 'read',
  sensitiveOutput: true,
  flags: [
    {
      name: 'project-id',
      type: 'number',
      required: true,
      min: 1,
      desc: 'Target project ID; semantic management permission is required.',
    },
    {
      name: 'asset-scope',
      type: 'string',
      desc: 'certified (default), frequent, all, specified, or none for materials only. frequent uses positive query counts from the latest 90-day usage snapshot.',
    },
    {
      name: 'asset-refs',
      type: 'json',
      desc: 'Exact asset references for specified scope; resolve supplied names or links before running.',
    },
    {
      name: 'materials',
      type: 'json',
      sensitive: true,
      desc: 'Optional array of local source file paths. The command inventories bytes; the calling Agent reads and interprets them.',
    },
    {
      name: 'output',
      type: 'string',
      required: true,
      desc: 'New private evidence directory. Existing directories are refused; retain it for review and recovery.',
    },
  ],
  validate: (ctx) => {
    options(ctx);
  },
  dryRun: async (ctx) => ({
    workflow: 'project_semantic_setup',
    project_id: ctx.num('project-id'),
    asset_scope: options(ctx).scope,
    remote_writes: false,
    agent_synthesis_required: true,
    reference,
  }),
  execute: async (ctx) => {
    const selected = options(ctx);
    try {
      await stat(selected.output);
      throw new Error('Setup output already exists. Continue from its manifest or choose another output directory.');
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    const materials = [];
    for (const file of selected.materials) {
      const path = resolve(file);
      const info = await stat(path);
      if (!info.isFile() || info.size > 20 * 1024 * 1024)
        throw new Error('Each material must be a regular file no larger than 20 MiB.');
      const bytes = await readFile(path);
      materials.push({
        path,
        name: basename(path),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        parse_status: 'not_read_by_agent',
      });
    }
    const call = async (operation: string, projectId: number) =>
      (
        await executeCapabilityWithEnvelope(ctx.host(), 'analysis', `business_semantics.${operation}`, {
          project_id: projectId,
        })
      ).data;
    const company = await call('background.get', 0);
    const project = await call('background.get', ctx.num('project-id'));
    // draft_get enforces the existing semantic-manager boundary, including when no draft exists.
    const draft = await call('background.draft_get', ctx.num('project-id'));
    const globalPersonal = await call('global_personal_context.list', -1);
    const personal = await call('personal_context.list', ctx.num('project-id'));
    const publicCatalog = await call('project_context.list', ctx.num('project-id'));
    for (const catalog of [globalPersonal, personal, publicCatalog]) {
      if (
        catalog?.complete !== true ||
        catalog.truncated === true ||
        !Array.isArray(catalog.items) ||
        catalog.items.length !== catalog.total
      ) {
        throw new Error('A complete semantic catalog is required; do not silently continue with partial evidence.');
      }
      const seen = new Set<string>();
      for (const row of catalog.items) {
        if (
          !row ||
          typeof row.id !== 'string' ||
          typeof row.title !== 'string' ||
          typeof row.summary !== 'string' ||
          !Number.isSafeInteger(row.revision) ||
          seen.has(row.id) ||
          (row.keywords !== undefined &&
            (!Array.isArray(row.keywords) || row.keywords.some((keyword: unknown) => typeof keyword !== 'string')))
        ) {
          throw new Error('Catalog row identity, revision, summary or keywords is invalid.');
        }
        seen.add(row.id);
      }
    }
    await mkdir(selected.output, { recursive: false, mode: 0o700 });
    const save = (name: string, data: unknown) =>
      writeFile(resolve(selected.output, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await save('context.json', {
      company_background: company,
      project_background: project,
      project_draft: draft,
    });
    await save('global-personal-catalog.json', {
      ok: true,
      data: globalPersonal,
    });
    await save('project-personal-catalog.json', { ok: true, data: personal });
    await save('project-public-catalog.json', {
      ok: true,
      data: publicCatalog,
    });
    await save('materials.json', materials);
    const pending = {
      workflow: 'project_semantic_setup',
      status: 'preparing_assets',
      project_id: ctx.num('project-id'),
      asset_scope: selected.scope,
      remote_writes: false,
      agent_synthesis_required: true,
      reference,
    };
    await save('setup.json', pending);
    let assetPackage: unknown;
    try {
      if (selected.scope !== 'none') {
        const packageContext: RuntimeContext = {
          ...ctx,
          str: (name) =>
            name === 'asset-scope'
              ? selected.scope
              : name === 'output'
              ? resolve(selected.output, 'assets')
              : ctx.str(name),
          bool: (name) => (name === 'force' ? false : ctx.bool(name)),
        };
        assetPackage = unwrapOutputData(await projectSemanticAssetPackageExport.execute(packageContext));
        const manifest = JSON.parse(await readFile(resolve(selected.output, 'assets', 'manifest.json'), 'utf8'));
        if (
          manifest.truncated === true ||
          manifest.project_id !== ctx.num('project-id') ||
          manifest.asset_scope !== selected.scope
        )
          throw new Error(
            'Exported asset evidence is partial or belongs to another project/scope. Keep the workspace for diagnosis; do not synthesize from it.',
          );
      }
    } catch (error) {
      await writeFile(
        resolve(selected.output, 'setup.json'),
        JSON.stringify(
          {
            ...pending,
            status: 'evidence_failed',
            failed_step: 'asset_export',
            ...(error instanceof CapabilityGatewayError
              ? {
                  error_code: error.code,
                  ...(typeof error.meta?.run_id === 'string' ? { run_id: error.meta.run_id } : {}),
                  ...(typeof error.meta?.artifact_id === 'string' ? { artifact_id: error.meta.artifact_id } : {}),
                }
              : {}),
          },
          null,
          2,
        ) + '\n',
        { mode: 0o600 },
      );
      throw error;
    }
    const manifest = {
      workflow: 'project_semantic_setup',
      status: 'evidence_ready',
      project_id: ctx.num('project-id'),
      asset_scope: selected.scope,
      materials: materials.length,
      asset_package: assetPackage,
      remote_writes: false,
      agent_synthesis_required: true,
      reference,
      next_steps: nextSteps,
    };
    await writeFile(resolve(selected.output, 'setup.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    return { ...manifest, output_path: selected.output };
  },
};
