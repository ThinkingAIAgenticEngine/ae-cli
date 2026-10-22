import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag, lockVersionFlag } from './shared.js';

const PATH = '/evaluation-runs';

const EXECUTION_MODES = ['LIVE_AGENT', 'PRESET_RESULT'] as const;

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { name: ctx.str('name'), lock_version: ctx.num('lock-version') };
  const description = ctx.str('description');
  if (description) body.description = description;
  const datasetId = ctx.str('dataset-id');
  if (datasetId) body.dataset_id = datasetId;
  const datasetVersionId = ctx.str('dataset-version-id');
  if (datasetVersionId) body.dataset_version_id = datasetVersionId;
  const subjectType = ctx.str('subject-type');
  if (subjectType) body.subject_type = subjectType;
  const executionMode = ctx.str('execution-mode') || 'LIVE_AGENT';
  if (!EXECUTION_MODES.includes(executionMode as (typeof EXECUTION_MODES)[number])) {
    throw new Error('--execution-mode must be one of LIVE_AGENT | PRESET_RESULT');
  }
  const agentConfigId = ctx.str('agent-config-id');
  const modelConfigId = ctx.str('model-config-id');
  if (executionMode === 'PRESET_RESULT' && (agentConfigId || modelConfigId)) {
    throw new Error('--agent-config-id / --model-config-id are not allowed with --execution-mode PRESET_RESULT');
  }
  if (agentConfigId) body.agent_config_id = agentConfigId;
  if (modelConfigId) body.model_config_id = modelConfigId;
  body.execution_mode = executionMode;
  const fieldMapping = ctx.json('field-mapping-json');
  if (fieldMapping !== undefined) body.field_mapping_json = fieldMapping;
  const resultFilterFields = ctx.json('result-filter-fields-json');
  if (resultFilterFields !== undefined) body.result_filter_fields_json = resultFilterFields;
  const passThreshold = ctx.optionalNum('pass-threshold');
  if (passThreshold !== undefined) body.pass_threshold = passThreshold;
  const caseSampleSize = ctx.optionalNum('case-sample-size');
  if (caseSampleSize !== undefined) {
    if (!Number.isInteger(caseSampleSize) || caseSampleSize < 1 || caseSampleSize > 1000) {
      throw new CliValidationError('--case-sample-size must be an integer between 1 and 1000');
    }
    body.case_sample_size = caseSampleSize;
  }
  return body;
}

export const updateRun: Command = {
  service: 'evaluation',
  command: '+update_run',
  description:
    'Update a draft evaluation run via PATCH /agenteval/api/v1/evaluation-runs/{runId}. Full-replace semantics for provided fields; requires the current lock_version from +get_run and increments it. Runs must target a published dataset version (--dataset-version-id from +list_dataset_versions).',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
    { name: 'name', type: 'string', required: true, desc: 'Run name (1-128 characters)' },
    { name: 'description', type: 'string', desc: 'Optional run description (<=2000 characters)' },
    { name: 'dataset-id', type: 'string', desc: 'Dataset UUID this run evaluates against' },
    {
      name: 'dataset-version-id',
      type: 'string',
      desc: 'Published dataset version UUID (from +list_dataset_versions); required for PRESET_RESULT and recommended for every run',
    },
    {
      name: 'execution-mode',
      type: 'string',
      desc: 'LIVE_AGENT (default) sends the case to the Agent/Model; PRESET_RESULT scores fields already stored in the selected published dataset version',
    },
    { name: 'subject-type', type: 'string', desc: 'Subject under test: AGENT | MODEL' },
    { name: 'agent-config-id', type: 'string', desc: 'Agent config UUID (LIVE_AGENT with subject_type=AGENT)' },
    { name: 'model-config-id', type: 'string', desc: 'Model config UUID (LIVE_AGENT with subject_type=MODEL)' },
    { name: 'field-mapping-json', type: 'json', desc: 'FieldMapping JSON (schema_version/agent/evaluators); V6 adds AGENT_EXECUTION_TRACE and AGENT_TOOL_CALLS for LIVE_AGENT Agent process scoring' },
    { name: 'result-filter-fields-json', type: 'json', desc: 'ResultFilterFields JSON (schema_version/fields, max 5)' },
    { name: 'pass-threshold', type: 'number', min: 0, max: 1, desc: 'Optional pass threshold (0-1)' },
    {
      name: 'case-sample-size',
      type: 'number',
      min: 1,
      max: 1000,
      desc: 'Randomly sample this many dataset cases when the run starts (1-1000); omit to run all cases',
    },
    lockVersionFlag('run'),
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
