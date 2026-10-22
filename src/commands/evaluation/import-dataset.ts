import { promises as fs } from 'fs';
import * as path from 'path';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/datasets/imports';

async function buildForm(ctx: RuntimeContext): Promise<FormData> {
  const filePath = path.resolve(ctx.str('file'));
  let content: Buffer;
  try {
    content = await fs.readFile(filePath);
  } catch {
    throw new Error(`File not found or unreadable: ${ctx.str('file')}`);
  }
  const form = new FormData();
  form.append('name', ctx.str('name'));
  const description = ctx.str('description');
  if (description) form.append('description', description);
  const profile = ctx.str('profile');
  if (profile) form.append('profile', profile);
  form.append('file', new Blob([Uint8Array.from(content)]), path.basename(filePath));
  return form;
}

export const importDataset: Command = {
  service: 'evaluation',
  command: '+import_dataset',
  description:
    'Import an evaluation dataset from a local CSV/Excel/JSONL file via POST /agenteval/api/v1/datasets/imports (multipart). Requires an Idempotency-Key; returns 202 with the created dataset and staged file.',
  flags: [
    ...evalFlags(),
    { name: 'name', type: 'string', required: true, desc: 'Dataset name (1-128 characters)' },
    {
      name: 'file',
      type: 'string',
      required: true,
      desc: 'Local path to a CSV, Excel, or JSONL file to import',
    },
    {
      name: 'profile',
      type: 'string',
      desc: 'Import profile: GENERIC | AGENT_TASK_CASES_V1 (default GENERIC)',
    },
    { name: 'description', type: 'string', desc: 'Optional dataset description (<=2000 characters)' },
    {
      name: 'idempotency-key',
      type: 'string',
      required: true,
      hint: 'Required. Use a fresh value per import attempt (max 191 chars) sent as the Idempotency-Key header.',
      desc: 'Unique Idempotency-Key header value (1-191 characters)',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, {
    name: ctx.str('name'),
    description: ctx.str('description') || undefined,
    profile: ctx.str('profile') || 'GENERIC',
    file: ctx.str('file'),
    contentType: 'multipart/form-data',
  }, { idempotencyKey: ctx.str('idempotency-key') }),
  execute: async (ctx) => {
    const form = await buildForm(ctx);
    return evalApi(ctx, 'POST', PATH, undefined, form, {
      idempotencyKey: ctx.str('idempotency-key'),
    });
  },
};
