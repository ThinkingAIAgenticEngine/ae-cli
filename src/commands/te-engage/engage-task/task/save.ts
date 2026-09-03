import { createEngageTaskCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';
import {
  validateEmbeddedSemanticDefinitions,
  validateTaskAudienceChannelCompatibility,
  validateTaskTriggerPeriodDefinition,
} from '../../semantic-qp-validation.js';

/** Creates or updates a task draft (draft or paused). */
export const taskSave = createEngageTaskCapabilityCommand({
  resource: 'task', command: 'save', capabilityId: 'engage-task.task.save',
  description: 'Create a task draft, or update an existing draft/paused task.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true,
      desc: 'Task save JSON; triggered tasks require periodTimeSymbol on the primary trigger rule.' }],
  risk: 'write', validate: (ctx) => {
    const req = readRequiredJsonObject(ctx, 'req');
    validateEmbeddedSemanticDefinitions(req, '--req');
    validateTaskAudienceChannelCompatibility(req, '--req');
    validateTaskTriggerPeriodDefinition(req, '--req');
  },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredJsonObject(ctx, 'req') }),
});
