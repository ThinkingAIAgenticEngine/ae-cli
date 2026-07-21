import {
  compactInput,
  createTrackingCapabilityCommand,
  developmentCarrierFlag,
  formDataFlag,
  languageFlag,
  optionalJson,
  predefinedEventFlag,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingPlanGenerate = createTrackingCapabilityCommand({
  resource: 'plan',
  command: 'generate',
  capabilityId: 'tracking.plan.generate',
  description: 'Submit an AI tracking plan generation task.',
  flags: [projectIdFlag, languageFlag, formDataFlag, developmentCarrierFlag, predefinedEventFlag],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    language: ctx.str('language'),
    form_data: ctx.json('form-data'),
    development_carrier: optionalJson(ctx, 'development-carrier'),
    predefined_event: optionalJson(ctx, 'predefined-event'),
  }),
});
