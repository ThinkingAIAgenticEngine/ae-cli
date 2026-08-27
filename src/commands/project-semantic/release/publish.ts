import {
  arrayValue,
  compactInput,
  createProjectSemanticCommand,
  optionalJson,
  optionalString,
} from '../shared.js';
import type { RuntimeContext } from '../../../framework/types.js';

export const projectSemanticReleasePublish = createProjectSemanticCommand({
  resource: 'release',
  command: 'publish',
  capabilityId: 'business_semantics.release.publish',
  description: 'Publish explicitly approved candidates into the project semantic catalog.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'candidate-ids', type: 'json', required: true, desc: 'JSON array of approved candidate IDs.' },
    { name: 'expected-release-version', type: 'number', required: true, desc: 'Current release version, or 0 when no release exists.', min: 0 },
    { name: 'publish-note', type: 'string', desc: 'Optional publication note.' },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => candidateIds(ctx),
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    candidate_ids: candidateIds(ctx),
    expected_release_version: ctx.num('expected-release-version'),
    publish_note: optionalString(ctx, 'publish-note'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});

function candidateIds(ctx: RuntimeContext): unknown[] {
  const values = arrayValue(optionalJson(ctx, 'candidate-ids'), '--candidate-ids');
  if (values.length < 1 || values.some((value) => typeof value !== 'string' || value.trim() === '')) {
    throw new Error('--candidate-ids must be a non-empty JSON string array.');
  }
  return values;
}
