import { createEngageSceneCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';
import { validateSemanticAudienceDefinition } from '../../semantic-qp-validation.js';

/** Predicts custom-audience size from a semantic audience definition. */
export const strategyPredict = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'predict',
  capabilityId: 'engage-scene.strategy.predict',
  description:
    'Predict custom-audience size for a config strategy (maps to POST /v1/hermes/config/strategy/predictEntityCount).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'definition-request',
      type: 'json',
      required: true,
      desc: 'Semantic audience definition request.',
    },
    {
      name: 'zone-offset',
      type: 'number',
      required: true,
      desc: 'Strategy timezone offset in hours (e.g. 8).',
    },
    {
      name: 'strategy-uuid',
      type: 'string',
      required: false,
      desc: 'Optional strategy UUID; when set, persists clusterUserNum on the strategy.',
    },
    {
      name: 'request-id',
      type: 'string',
      required: false,
      desc: 'Optional client request id; auto-generated when omitted.',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    validateSemanticAudienceDefinition(
      readRequiredJsonObject(ctx, 'definition-request'),
      '--definition-request',
    );
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    definition_request: readRequiredJsonObject(ctx, 'definition-request'),
    zone_offset: ctx.num('zone-offset'),
    ...(ctx.str('strategy-uuid') ? { strategy_uuid: ctx.str('strategy-uuid') } : {}),
    ...(ctx.str('request-id') ? { request_id: ctx.str('request-id') } : {}),
  }),
});
