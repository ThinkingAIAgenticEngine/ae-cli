import { createAiMonitorCapabilityCommand, prepareAiMonitorScope } from './shared.js';
import { buildReadInput, scopeFlags } from './read-shared.js';
import { READ_COMMAND_SPECS } from './read-command-specs.js';
import { ensureNewArchivePath, saveArchive } from './archive.js';

export const readCommands = READ_COMMAND_SPECS.map(spec => {
  const [, resource, action] = spec.id.split('.');
  const isExport = action === 'export';
  return createAiMonitorCapabilityCommand({
    resource: resource.replace(/_/g, '-'),
    command: action.replace(/_/g, '-'),
    capabilityId: spec.id,
    description: spec.description,
    helpText: spec.outputDescription + (isExport
      ? ' --output is required. The ZIP is verified and written to a new private file; existing files are never overwritten. --validate and --dry-run never write files.'
      : ' Read-only: this command never starts, retries, or cancels analysis. Reuse the same platform/environment across related queries.'),
    flags: [...scopeFlags, ...spec.fields, ...(isExport ? [{ name: 'output', type: 'string' as const, required: true, minLength: 1, desc: 'New local ZIP path; existing files are never overwritten.' }] : [])],
    risk: 'read',
    buildInput: ctx => buildReadInput(ctx, spec),
    prepareInput: async (ctx, input) => {
      if (isExport) await ensureNewArchivePath(ctx.str('output'));
      return prepareAiMonitorScope(ctx, input);
    },
    ...(isExport ? { postProcess: (result: unknown, _input: Record<string, unknown>, ctx: import('../../framework/types.js').RuntimeContext) => saveArchive(result, ctx.str('output')) } : {}),
  });
});
