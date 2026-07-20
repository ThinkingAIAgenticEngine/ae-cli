import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Queries the project's push-language property field (pushLanguageColumn) used to identify each user's language. */
export const pushLanguageGet = createEngageSettingCapabilityCommand({
  resource: 'push-language',
  command: 'get',
  capabilityId: 'engage-setting.push-language.get',
  description: "Query the project's push-language property field (pushLanguageColumn) used to identify each user's language.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
