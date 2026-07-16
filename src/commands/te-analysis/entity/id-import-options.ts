import type { Command } from '../../../framework/types.js';
import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../capability-shared.js';

export const entityIdImportOptions: Command = createAnalysisCapabilityCommand({
  resource: 'entity',
  command: 'id-import-options',
  capabilityId: 'analysis.entity.id_import_options',
  description: 'Discover the authoritative ID-import mapping contract for one analysis entity.',
  flags: [
    projectIdFlag,
    {
      name: 'entity-id',
      type: 'number',
      required: true,
      desc: 'Analysis entity ID. Discover it from project entity metadata; do not guess.',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    entity_id: ctx.num('entity-id'),
  }),
});
