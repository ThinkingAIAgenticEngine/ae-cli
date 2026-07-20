import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Sets or updates the project's push-language property field (pushLanguageColumn). */
export const pushLanguageSet = createEngageSettingCapabilityCommand({
  resource: 'push-language',
  command: 'set',
  capabilityId: 'engage-setting.push-language.set',
  description: "Set or update the project's push-language property field (pushLanguageColumn).",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'push-language-column',
      type: 'string',
      required: true,
      desc: 'User property code used as the push language field.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    push_language_column: ctx.str('push-language-column'),
  }),
});
