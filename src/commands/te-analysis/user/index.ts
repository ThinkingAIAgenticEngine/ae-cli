import type { Command, Flag, RiskLevel, RuntimeContext } from '../../../framework/types.js';
import { existsSync, statSync } from 'node:fs';
import { buildCapabilityGatewayUrl, uploadInputFile } from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';
import {
  analysisDataExportRoutingHelp,
  analysisDataRunRoutingHelp,
  asyncTimeoutSecondsFlag,
  compactInput,
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalBoolean,
  optionalJson,
  optionalJsonArray,
  optionalNumber,
  optionalString,
  previewRowsFlag,
  projectIdFlag,
  queryFlag,
  requestIdFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import {
  catalogExportOutputFlag,
  catalogExportPostProcess,
  optionalQueries,
  queriesFlag,
  validateCatalogExportFlags,
  validateCatalogListFlags,
} from '../catalog-list.js';

const authenticatedOnlyFlag: Flag = {
  name: 'authenticated-only',
  type: 'boolean',
  required: false,
  desc: 'Return only resources whose metadata can be resolved under the current identity.',
};

const AUDIENCE_NAME_PATTERN = '^[a-zA-Z][a-zA-Z0-9_]*$';
const AUDIENCE_NAME_MAX_LENGTH = 80;
const AUDIENCE_DISPLAY_NAME_MAX_LENGTH = 80;
const AUDIENCE_REMARK_MAX_LENGTH = 400;

const tagListFieldsFlag: Flag = {
  ...fieldsFlag,
  desc: 'Optional tag inventory projection. Use tag_name, display_name, users_num, and other tag fields. cluster_name is reserved for user clusters and is rejected here.',
};

const tagMemberFieldsFlag: Flag = {
  ...fieldsFlag,
  desc: 'Optional result fields. Defaults to #user_id, #account_id, #distinct_id, and tag_value.',
};

const clusterMemberFieldsFlag: Flag = {
  ...fieldsFlag,
  desc: 'Optional result fields. Defaults to #user_id, #account_id, and #distinct_id.',
};

const memberPreviewRowsFlag: Flag = {
  ...previewRowsFlag,
  max: 100000,
  desc: 'Maximum business rows returned per result. Default: 1000, matching the UI member query. Maximum: 100000.',
};

const memberDataRunRoutingHelp =
  'Routing: --preview-rows bounds returned business rows per result; omitting it defaults to 1000 rows, matching the UI member query. Use export for full, unknown-size, timed-out, or long-running data.';

const clusterNameFlag: Flag = {
  name: 'cluster-name',
  type: 'string',
  required: true,
  desc: 'Exact cluster_name. Discover real values with analysis user-cluster list first.',
};

const newClusterNameFlag: Flag = {
  ...clusterNameFlag,
  minLength: 1,
  maxLength: AUDIENCE_NAME_MAX_LENGTH,
  pattern: AUDIENCE_NAME_PATTERN,
  desc: 'New cluster_name. Must start with a letter, contain only letters, digits, and underscores, and be at most 80 characters.',
};

const tagNameFlag: Flag = {
  name: 'tag-name',
  type: 'string',
  required: true,
  desc: 'Exact tag_name. Discover real values with analysis user-tag list first.',
};

const newTagNameFlag: Flag = {
  ...tagNameFlag,
  minLength: 1,
  maxLength: AUDIENCE_NAME_MAX_LENGTH,
  pattern: AUDIENCE_NAME_PATTERN,
  desc: 'New tag_name. Must start with a letter, contain only letters, digits, and underscores, and be at most 80 characters.',
};

const displayNameFlag: Flag = {
  name: 'display-name',
  type: 'string',
  required: true,
  minLength: 1,
  maxLength: AUDIENCE_DISPLAY_NAME_MAX_LENGTH,
  desc: 'Human-readable display name. Maximum: 80 characters.',
};

const optionalDisplayNameFlag: Flag = {
  ...displayNameFlag,
  required: false,
  desc: 'Optional new display name. Maximum: 80 characters.',
};

const clusterDefinitionRequestFlag: Flag = {
  name: 'definition-request',
  type: 'json',
  required: true,
  desc: 'Semantic snake_case cluster definition. Read skills/ae-analysis/references/user_cluster_models.md; shared primitives are in audience_models.md.',
};

const optionalClusterDefinitionRequestFlag: Flag = {
  ...clusterDefinitionRequestFlag,
  required: false,
  desc: 'Optional semantic snake_case cluster definition. Its type must match the existing cluster type; update cannot change the analysis entity. Read user_cluster_models.md; raw filts, C-codes, ftv, columnName, and backend DTOs are rejected.',
};

const tagDefinitionRequestFlag: Flag = {
  ...clusterDefinitionRequestFlag,
  desc: 'Semantic snake_case tag definition. Read skills/ae-analysis/references/user_tag_models.md; shared primitives are in audience_models.md.',
};

const optionalTagDefinitionRequestFlag: Flag = {
  ...tagDefinitionRequestFlag,
  required: false,
  desc: 'Optional semantic snake_case tag definition. Read user_tag_models.md; raw filts, C-codes, ftv, columnName, and backend DTOs are rejected.',
};

const zoneOffsetFlag: Flag = {
  name: 'zone-offset',
  type: 'number',
  required: false,
  desc: 'Optional timezone offset. UTC+8 is 8; UTC-5 is -5.',
};

const autoRefreshCronFlag: Flag = {
  name: 'auto-refresh-cron',
  type: 'string',
  required: false,
  desc: 'Optional Quartz cron expression for an existing enabled auto-refresh schedule. This does not enable auto refresh.',
};

const entityIdFlag: Flag = {
  name: 'entity-id',
  type: 'number',
  required: false,
  desc: 'Optional entity ID. Required by ID-file create commands.',
};

const requiredEntityIdFlag: Flag = {
  ...entityIdFlag,
  required: true,
  desc: 'Required analysis entity. Use the primary user entity only when matching uploaded external identifiers through a user property.',
};

const inputFileIdFlag: Flag = {
  name: 'input-file-id',
  type: 'string',
  required: false,
  desc: 'Reuse a file already uploaded for purpose analysis.user.id_import.',
};

const inputFileFlag: Flag = {
  name: 'input-file',
  type: 'string',
  required: false,
  desc: 'Local CSV path. The CLI uploads it with purpose analysis.user.id_import before executing the create/update capability.',
};

const clusterFileContentFlag: Flag = {
  name: 'file-content',
  type: 'string',
  required: false,
  desc: 'Headerless UTF-8 CSV. No header row. Exactly one non-empty column per row: association-property value for the primary user entity, otherwise the entity ID.',
};

const tagFileContentFlag: Flag = {
  name: 'file-content',
  type: 'string',
  required: false,
  desc: 'Headerless UTF-8 CSV. No header row. Exactly two non-empty columns per row: association-property value or entity ID, then tag_value.',
};

const associationPropertyFlag: Flag = {
  name: 'association-property',
  type: 'string',
  required: false,
  desc: 'Required only for the primary user entity. The first CSV column is matched against this allowed user property; #user_id is forbidden. Omit for non-primary entities.',
};

const remarksFlag: Flag = {
  name: 'remarks',
  type: 'string',
  required: false,
  maxLength: AUDIENCE_REMARK_MAX_LENGTH,
  desc: 'Optional remarks. Maximum: 400 characters.',
};

const remarkFlag: Flag = {
  name: 'remark',
  type: 'string',
  required: false,
  maxLength: AUDIENCE_REMARK_MAX_LENGTH,
  desc: 'Optional new remark. Maximum: 400 characters.',
};

const propertyNamesFlag: Flag = {
  name: 'property-names',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of user property names to include.',
};

const snapshotDateFlag: Flag = {
  name: 'snapshot-date',
  type: 'string',
  required: false,
  desc: 'Optional tag snapshot date, yyyy-MM-dd.',
};

const jsonlArtifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Artifact format. Only jsonl is supported for history-tag statistics exports.',
};

const memberArtifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Artifact format: jsonl or csv. Default: jsonl. Both formats use native full-download streaming and gzip compression.',
};

const confirmedFlag: Flag = {
  name: 'confirmed',
  type: 'boolean',
  required: false,
  desc: 'Set true only after dependency and influence checks have been accepted.',
};

const refreshDateFlag: Flag = {
  name: 'refresh-date',
  type: 'string',
  required: true,
  desc: 'History tag date to refresh, yyyy-MM-dd.',
};

const historyViewFlag: Flag = {
  name: 'view',
  type: 'json',
  required: true,
  desc: 'AI-facing history tag view with interval_type/property_range/time_particle/array_group_type/column_splited_str.',
};

const groupColFlag: Flag = {
  name: 'group-col',
  type: 'string',
  required: true,
  desc: 'Exact statistic value or bucket from history-tag-data results to drill down into.',
};

function capability(
  resource: string,
  command: string,
  capabilityId: string,
  description: string,
  flags: Flag[],
  risk: RiskLevel,
  buildInput: (ctx: RuntimeContext) => Record<string, unknown>,
  options: {
    asyncArtifact?: boolean;
    validate?: (ctx: RuntimeContext) => void;
    postProcess?: (
      result: unknown,
      input: Record<string, unknown>,
      ctx: RuntimeContext,
    ) => unknown | Promise<unknown>;
  } = {},
): Command {
  return createAnalysisCapabilityCommand({
    resource,
    command,
    capabilityId,
    description,
    flags,
    risk,
    buildInput,
    ...options,
  });
}

function idImportCapability(command: Command): Command {
  const originalValidate = command.validate;
  const originalValidateInput = command.validateInput;
  const originalDryRun = command.dryRun;
  const originalExecute = command.execute;
  return {
    ...command,
    flags: command.flags.flatMap((flag) => flag.name === 'input-file-id' ? [inputFileFlag, flag] : [flag]),
    validate: (ctx) => {
      originalValidate?.(ctx);
      const sources = ['input-file', 'input-file-id', 'file-content']
        .filter((name) => ctx.str(name).trim() !== '');
      if (sources.length !== 1) {
        throw new Error('Pass exactly one of --input-file, --input-file-id, or --file-content');
      }
      const localFile = ctx.str('input-file');
      if (localFile && (!existsSync(localFile) || !statSync(localFile).isFile())) {
        throw new Error(`--input-file must reference a readable local file: ${localFile}`);
      }
    },
    validateInput: originalValidateInput
      ? async (ctx) => ctx.str('input-file')
        ? {
            valid: true,
            validation_scope: 'local_orchestration',
            input_file: ctx.str('input-file'),
            next_step: 'Execution uploads this file with purpose analysis.user.id_import, then validates and executes the capability with the returned input_file_id.',
          }
        : originalValidateInput(ctx)
      : undefined,
    dryRun: originalDryRun
      ? async (ctx) => {
          if (!ctx.str('input-file')) {
            return originalDryRun(ctx);
          }
          return {
            steps: [
              {
                method: 'POST',
                url: buildCapabilityGatewayUrl(ctx.host(), resolveGatewayDomain('analysis'), 'input-files'),
                body: { multipart: { project_id: ctx.num('project-id'), purpose: 'analysis.user.id_import', file: ctx.str('input-file') } },
              },
              {
                method: 'POST',
                url: `${ctx.host()}/api/cli/${resolveGatewayDomain('analysis')}/v1/capabilities/${command.capabilityId}/dry-run`,
                body: {
                  input_file_id: '<input_file_id returned by upload step>',
                  note: 'The remaining command flags are sent unchanged after upload.',
                },
              },
            ],
          };
        }
      : undefined,
    execute: async (ctx) => {
      if (!ctx.str('input-file')) {
        return originalExecute(ctx);
      }
      const uploaded = await uploadInputFile(
        ctx.host(), resolveGatewayDomain('analysis'), ctx.num('project-id'),
        'analysis.user.id_import', ctx.str('input-file'),
      );
      const inputFileId = uploadedInputFileId(uploaded);
      return originalExecute(withInputFileId(ctx, inputFileId));
    },
  };
}

function withInputFileId(ctx: RuntimeContext, inputFileId: string | undefined): RuntimeContext {
  if (!inputFileId) return ctx;
  return new Proxy(ctx, {
    get(target, property, receiver) {
      if (property === 'str') {
        return (name: string) => name === 'input-file-id' ? inputFileId : target.str(name);
      }
      return Reflect.get(target, property, target);
    },
  });
}

function uploadedInputFileId(value: any): string {
  const inputFileId = value?.input_file_id ?? value?.inputFileId
    ?? value?.data?.input_file_id ?? value?.data?.inputFileId;
  if (typeof inputFileId !== 'string' || !inputFileId.startsWith('ifile_')) {
    throw new Error('Analysis input-file upload did not return input_file_id');
  }
  return inputFileId;
}

function assetListInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    queries: optionalQueries(ctx),
    fields: optionalJsonArray(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  });
}

function assetExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    queries: optionalQueries(ctx),
    fields: optionalJsonArray(ctx, 'fields'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  });
}

function memberInput(ctx: RuntimeContext, kind: 'cluster' | 'tag', inline: boolean): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    cluster_name: kind === 'cluster' ? ctx.str('cluster-name') : undefined,
    tag_name: kind === 'tag' ? ctx.str('tag-name') : undefined,
    snapshot_date: kind === 'tag' ? optionalString(ctx, 'snapshot-date') : undefined,
    property_names: optionalJsonArray(ctx, 'property-names'),
    fields: inline ? optionalJsonArray(ctx, 'fields') : undefined,
    query: inline ? optionalString(ctx, 'query') : undefined,
    use_cache: inline ? optionalBoolean(ctx, 'use-cache') : undefined,
    preview_rows: inline ? optionalNumber(ctx, 'preview-rows') : undefined,
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    format: inline ? undefined : optionalMemberFormat(ctx),
  });
}

function clusterWriteInput(ctx: RuntimeContext, create: boolean): Record<string, unknown> {
  const definitionRequest = optionalJson(ctx, 'definition-request');
  validateDefinitionRequest(create, definitionRequest);
  return compactInput({
    project_id: ctx.num('project-id'),
    cluster_name: ctx.str('cluster-name'),
    display_name: create ? ctx.str('display-name') : optionalString(ctx, 'display-name'),
    definition_request: definitionRequest,
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
    remark: create ? undefined : optionalString(ctx, 'remark'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    auto_refresh_cron: create ? undefined : optionalString(ctx, 'auto-refresh-cron'),
    entity_id: create ? optionalNumber(ctx, 'entity-id') : undefined,
  });
}

function tagWriteInput(ctx: RuntimeContext, create: boolean): Record<string, unknown> {
  const definitionRequest = optionalJson(ctx, 'definition-request');
  validateDefinitionRequest(create, definitionRequest);
  return compactInput({
    project_id: ctx.num('project-id'),
    tag_name: ctx.str('tag-name'),
    display_name: create ? ctx.str('display-name') : optionalString(ctx, 'display-name'),
    definition_request: definitionRequest,
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
    remark: create ? undefined : optionalString(ctx, 'remark'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    auto_refresh_cron: create ? undefined : optionalString(ctx, 'auto-refresh-cron'),
    entity_id: create ? optionalNumber(ctx, 'entity-id') : undefined,
  });
}

function validateDefinitionRequest(create: boolean, definitionRequest: unknown | undefined): void {
  if (create && definitionRequest === undefined) {
    throw new Error('Pass --definition-request');
  }
}

function idClusterInput(ctx: RuntimeContext, create: boolean): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    cluster_name: create ? optionalString(ctx, 'cluster-name') : ctx.str('cluster-name'),
    display_name: create ? ctx.str('display-name') : optionalString(ctx, 'display-name'),
    input_file_id: optionalString(ctx, 'input-file-id'),
    file_content: optionalString(ctx, 'file-content'),
    entity_id: create ? ctx.num('entity-id') : undefined,
    remarks: optionalString(ctx, 'remarks'),
    main_column_name: optionalString(ctx, 'association-property'),
  });
}

function idTagInput(ctx: RuntimeContext, create: boolean): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    tag_name: create ? optionalString(ctx, 'tag-name') : ctx.str('tag-name'),
    display_name: create ? ctx.str('display-name') : optionalString(ctx, 'display-name'),
    input_file_id: optionalString(ctx, 'input-file-id'),
    file_content: optionalString(ctx, 'file-content'),
    entity_id: create ? ctx.num('entity-id') : optionalNumber(ctx, 'entity-id'),
    remarks: optionalString(ctx, 'remarks'),
    main_column_name: optionalString(ctx, 'association-property'),
  });
}

function historyTagDataInput(ctx: RuntimeContext, inline: boolean): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    tag_name: ctx.str('tag-name'),
    view: ctx.json('view'),
    preview_rows: inline ? optionalNumber(ctx, 'preview-rows') : undefined,
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    format: inline ? undefined : optionalJsonlFormat(ctx),
  });
}

function historyTagDataDrilldownInput(ctx: RuntimeContext, inline: boolean): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    tag_name: ctx.str('tag-name'),
    snapshot_date: ctx.str('snapshot-date'),
    group_col: ctx.str('group-col'),
    view: ctx.json('view'),
    property_names: optionalJsonArray(ctx, 'property-names'),
    fields: inline ? optionalJsonArray(ctx, 'fields') : undefined,
    query: inline ? optionalString(ctx, 'query') : undefined,
    use_cache: inline ? optionalBoolean(ctx, 'use-cache') : undefined,
    preview_rows: inline ? optionalNumber(ctx, 'preview-rows') : undefined,
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    format: inline ? undefined : optionalMemberFormat(ctx),
  });
}

function optionalJsonlFormat(ctx: RuntimeContext): string | undefined {
  const format = optionalString(ctx, 'artifact-format');
  if (format !== undefined && format !== 'jsonl') {
    throw new Error('--artifact-format only supports jsonl for user member/history-tag exports');
  }
  return format;
}

function optionalMemberFormat(ctx: RuntimeContext): string | undefined {
  const format = optionalString(ctx, 'artifact-format');
  if (format !== undefined && format !== 'jsonl' && format !== 'csv') {
    throw new Error('--artifact-format only supports jsonl or csv for member full-download exports');
  }
  return format;
}

const listFlags = [
  projectIdFlag,
  queriesFlag,
  fieldsFlag,
  directoryLimitFlag,
  directoryOffsetFlag,
  authenticatedOnlyFlag,
];
const tagListFlags = [
  projectIdFlag,
  queriesFlag,
  tagListFieldsFlag,
  directoryLimitFlag,
  directoryOffsetFlag,
  authenticatedOnlyFlag,
];
const exportFlags = [
  projectIdFlag,
  queriesFlag,
  fieldsFlag,
  authenticatedOnlyFlag,
  catalogExportOutputFlag,
];
const tagExportFlags = [
  projectIdFlag,
  queriesFlag,
  tagListFieldsFlag,
  authenticatedOnlyFlag,
  catalogExportOutputFlag,
];
const memberRunFlags = (memberFieldsFlag: Flag) => [
  projectIdFlag,
  propertyNamesFlag,
  memberFieldsFlag,
  queryFlag,
  { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use query cache. Default: true.' } satisfies Flag,
  memberPreviewRowsFlag,
  requestIdFlag,
  syncTimeoutSecondsFlag,
];
const memberExportFlags = [
  projectIdFlag,
  propertyNamesFlag,
  requestIdFlag,
  memberArtifactFormatFlag,
  asyncTimeoutSecondsFlag,
];

const commands: Command[] = [
  capability(
    'user-cluster',
    'list',
    'analysis.user_cluster.list',
    'List user clusters with bounded discovery.',
    listFlags,
    'read',
    assetListInput,
    {
      validate: validateCatalogListFlags,
    },
  ),
  capability(
    'user-cluster',
    'export',
    'analysis.user_cluster.export',
    'Export the complete matching user-cluster catalog to JSONL with an integrity sidecar.',
    exportFlags,
    'read',
    assetExportInput,
    {
      validate: validateCatalogExportFlags,
      postProcess: catalogExportPostProcess('cluster', 'items'),
    },
  ),
  capability('user-cluster', 'get', 'analysis.user_cluster.get', 'Get user cluster details by exact cluster_name values.', [
    projectIdFlag,
    { name: 'cluster-names', type: 'json', required: true, desc: 'JSON array of exact cluster_name values.' },
  ], 'read', (ctx) => ({
    project_id: ctx.num('project-id'),
    cluster_names: ctx.json('cluster-names'),
  })),
  capability('user-cluster-member', 'list', 'analysis.user_cluster_member.list', `Run a bounded user cluster member query. ${memberDataRunRoutingHelp}`, [
    clusterNameFlag,
    ...memberRunFlags(clusterMemberFieldsFlag),
  ], 'read', (ctx) => memberInput(ctx, 'cluster', true)),
  capability('user-cluster-member', 'export', 'analysis.user_cluster_member.export', `Stream the native full user-cluster download as a jsonl.gz or csv.gz artifact. ${analysisDataExportRoutingHelp}`, [
    clusterNameFlag,
    ...memberExportFlags,
  ], 'read', (ctx) => memberInput(ctx, 'cluster', false), { asyncArtifact: true }),
  capability('user-cluster', 'create', 'analysis.user_cluster.create', 'Create a condition or SQL user cluster directly from an AI-facing definition request.', [
    projectIdFlag,
    newClusterNameFlag,
    displayNameFlag,
    clusterDefinitionRequestFlag,
    authenticatedOnlyFlag,
    zoneOffsetFlag,
    entityIdFlag,
  ], 'write', (ctx) => clusterWriteInput(ctx, true)),
  capability('user-cluster', 'update', 'analysis.user_cluster.update', 'Update a condition or SQL user cluster without changing its existing type or analysis entity. Pass only fields that should change.', [
    projectIdFlag,
    clusterNameFlag,
    optionalDisplayNameFlag,
    optionalClusterDefinitionRequestFlag,
    authenticatedOnlyFlag,
    remarkFlag,
    zoneOffsetFlag,
    autoRefreshCronFlag,
  ], 'high-risk-write', (ctx) => clusterWriteInput(ctx, false)),
  idImportCapability(capability('user-cluster', 'create-id', 'analysis.user_cluster.create_id', 'Create a cluster by mapping imported values to an analysis entity.', [
    projectIdFlag,
    { ...newClusterNameFlag, required: false, desc: 'Optional cluster_name; generated if omitted. When provided, it must satisfy the 1-80 character machine-name contract.' },
    displayNameFlag,
    requiredEntityIdFlag,
    inputFileIdFlag,
    clusterFileContentFlag,
    remarksFlag,
    associationPropertyFlag,
  ], 'write', (ctx) => idClusterInput(ctx, true))),
  idImportCapability(capability('user-cluster', 'update-id', 'analysis.user_cluster.update_id', 'Update a cluster by remapping imported values to its analysis entity.', [
    projectIdFlag,
    clusterNameFlag,
    optionalDisplayNameFlag,
    inputFileIdFlag,
    clusterFileContentFlag,
    remarksFlag,
    associationPropertyFlag,
  ], 'write', (ctx) => idClusterInput(ctx, false))),
  capability('user-cluster', 'refresh', 'analysis.user_cluster.refresh', 'Refresh a user cluster by exact cluster_name.', [
    projectIdFlag,
    clusterNameFlag,
  ], 'write', (ctx) => ({ project_id: ctx.num('project-id'), cluster_name: ctx.str('cluster-name') })),
  capability('user-cluster', 'delete', 'analysis.user_cluster.delete', 'Delete a user cluster by exact cluster_name after dependency review.', [
    projectIdFlag,
    clusterNameFlag,
    confirmedFlag,
  ], 'high-risk-write', (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    cluster_name: ctx.str('cluster-name'),
    confirmed: optionalBoolean(ctx, 'confirmed'),
  })),

  capability(
    'user-tag',
    'list',
    'analysis.user_tag.list',
    'List user tags with bounded discovery. Returned identifiers use canonical tag_name.',
    tagListFlags,
    'read',
    assetListInput,
    {
      validate: validateCatalogListFlags,
    },
  ),
  capability(
    'user-tag',
    'export',
    'analysis.user_tag.export',
    'Export the complete matching user-tag catalog to JSONL with an integrity sidecar.',
    tagExportFlags,
    'read',
    assetExportInput,
    {
      validate: validateCatalogExportFlags,
      postProcess: catalogExportPostProcess('tag', 'items'),
    },
  ),
  capability('user-tag', 'get', 'analysis.user_tag.get', 'Get user tag details by exact tag_name values.', [
    projectIdFlag,
    { name: 'tag-names', type: 'json', required: true, desc: 'JSON array of exact tag_name values.' },
  ], 'read', (ctx) => ({
    project_id: ctx.num('project-id'),
    tag_names: ctx.json('tag-names'),
  })),
  capability('user-tag-member', 'list', 'analysis.user_tag_member.list', `Run a bounded user tag member query. ${memberDataRunRoutingHelp}`, [
    tagNameFlag,
    snapshotDateFlag,
    ...memberRunFlags(tagMemberFieldsFlag),
  ], 'read', (ctx) => memberInput(ctx, 'tag', true)),
  capability('user-tag-member', 'export', 'analysis.user_tag_member.export', `Stream the native full user-tag download as a jsonl.gz or csv.gz artifact. ${analysisDataExportRoutingHelp}`, [
    tagNameFlag,
    snapshotDateFlag,
    ...memberExportFlags,
  ], 'read', (ctx) => memberInput(ctx, 'tag', false), { asyncArtifact: true }),
  capability('user-tag', 'create', 'analysis.user_tag.create', 'Create a user tag directly from an AI-facing definition request.', [
    projectIdFlag,
    newTagNameFlag,
    displayNameFlag,
    tagDefinitionRequestFlag,
    authenticatedOnlyFlag,
    zoneOffsetFlag,
    entityIdFlag,
  ], 'write', (ctx) => tagWriteInput(ctx, true)),
  capability('user-tag', 'update', 'analysis.user_tag.update', 'Update a user tag. Pass only fields that should change.', [
    projectIdFlag,
    tagNameFlag,
    optionalDisplayNameFlag,
    optionalTagDefinitionRequestFlag,
    authenticatedOnlyFlag,
    remarkFlag,
    zoneOffsetFlag,
    autoRefreshCronFlag,
  ], 'write', (ctx) => tagWriteInput(ctx, false)),
  capability('user-tag', 'refresh', 'analysis.user_tag.refresh', 'Refresh a user tag by exact tag_name.', [
    projectIdFlag,
    tagNameFlag,
  ], 'write', (ctx) => ({ project_id: ctx.num('project-id'), tag_name: ctx.str('tag-name') })),
  idImportCapability(capability('user-tag', 'create-id', 'analysis.user_tag.create_id', 'Create a tag by mapping imported values to an analysis entity.', [
    projectIdFlag,
    { ...newTagNameFlag, required: false, desc: 'Optional tag_name; generated if omitted. When provided, it must satisfy the 1-80 character machine-name contract.' },
    displayNameFlag,
    requiredEntityIdFlag,
    inputFileIdFlag,
    tagFileContentFlag,
    remarksFlag,
    associationPropertyFlag,
  ], 'write', (ctx) => idTagInput(ctx, true))),
  idImportCapability(capability('user-tag', 'update-id', 'analysis.user_tag.update_id', 'Update a tag by remapping imported values to its analysis entity.', [
    projectIdFlag,
    tagNameFlag,
    optionalDisplayNameFlag,
    entityIdFlag,
    inputFileIdFlag,
    tagFileContentFlag,
    remarksFlag,
    associationPropertyFlag,
  ], 'write', (ctx) => idTagInput(ctx, false))),
  capability('user-tag', 'delete', 'analysis.user_tag.delete', 'Delete a user tag by exact tag_name after dependency review.', [
    projectIdFlag,
    tagNameFlag,
    confirmedFlag,
  ], 'high-risk-write', (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    tag_name: ctx.str('tag-name'),
    confirmed: optionalBoolean(ctx, 'confirmed'),
  })),

  capability('history-tag', 'list', 'analysis.history_tag.list', 'List history tag snapshots for a tag.', [
    projectIdFlag,
    tagNameFlag,
  ], 'read', (ctx) => ({ project_id: ctx.num('project-id'), tag_name: ctx.str('tag-name') })),
  capability('history-tag', 'refresh', 'analysis.history_tag.refresh', 'Refresh one history tag snapshot.', [
    projectIdFlag,
    tagNameFlag,
    refreshDateFlag,
    { name: 'use-user-table-type', type: 'string', required: false, desc: 'Optional source strategy: user_table, user_backup_table_default, or user_backup_table_last_date.' },
  ], 'write', (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    tag_name: ctx.str('tag-name'),
    refresh_date: ctx.str('refresh-date'),
    use_user_table_type: optionalString(ctx, 'use-user-table-type'),
  })),
  capability('history-tag', 'batch-refresh', 'analysis.history_tag.batch_refresh', 'Batch refresh history tag snapshots using the product refresh request object.', [
    projectIdFlag,
    tagNameFlag,
    { name: 'refresh-request', type: 'json', required: true, desc: 'Snake_case object: {start_time,end_time,only_abnormal?,use_user_table_type?}. Dates use yyyy-MM-dd; see history_tag_batch_refresh.md.' },
  ], 'write', (ctx) => ({
    project_id: ctx.num('project-id'),
    tag_name: ctx.str('tag-name'),
    refresh_request: ctx.json('refresh-request'),
  })),
  capability('history-tag', 'clear', 'analysis.history_tag.clear', 'Clear history tag snapshots in a date range after explicit confirmation.', [
    projectIdFlag,
    tagNameFlag,
    { name: 'start-time', type: 'string', required: true, desc: 'Start date, yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date, yyyy-MM-dd.' },
    confirmedFlag,
  ], 'high-risk-write', (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    tag_name: ctx.str('tag-name'),
    start_time: ctx.str('start-time'),
    end_time: ctx.str('end-time'),
    confirmed: optionalBoolean(ctx, 'confirmed'),
  })),
  capability('history-tag-data', 'run', 'analysis.history_tag_data.run', `Run a bounded history tag statistics query. ${analysisDataRunRoutingHelp}`, [
    projectIdFlag,
    tagNameFlag,
    historyViewFlag,
    previewRowsFlag,
    requestIdFlag,
    syncTimeoutSecondsFlag,
  ], 'read', (ctx) => historyTagDataInput(ctx, true)),
  capability('history-tag-data', 'export', 'analysis.history_tag_data.export', `Export history tag statistics as a jsonl artifact. ${analysisDataExportRoutingHelp}`, [
    projectIdFlag,
    tagNameFlag,
    historyViewFlag,
    requestIdFlag,
    jsonlArtifactFormatFlag,
    asyncTimeoutSecondsFlag,
  ], 'read', (ctx) => historyTagDataInput(ctx, false), { asyncArtifact: true }),
  capability('history-tag-data-drilldown', 'run', 'analysis.history_tag_data_drilldown.run', `Run a bounded drilldown user query for one history tag statistic value. ${analysisDataRunRoutingHelp}`, [
    tagNameFlag,
    { ...snapshotDateFlag, required: true, desc: 'History tag snapshot date, yyyy-MM-dd.' },
    groupColFlag,
    historyViewFlag,
    ...memberRunFlags(tagMemberFieldsFlag),
  ], 'read', (ctx) => historyTagDataDrilldownInput(ctx, true)),
  capability('history-tag-data-drilldown', 'export', 'analysis.history_tag_data_drilldown.export', `Stream the native full history-tag drilldown download as a jsonl.gz or csv.gz artifact. ${analysisDataExportRoutingHelp}`, [
    tagNameFlag,
    { ...snapshotDateFlag, required: true, desc: 'History tag snapshot date, yyyy-MM-dd.' },
    groupColFlag,
    historyViewFlag,
    ...memberExportFlags,
  ], 'read', (ctx) => historyTagDataDrilldownInput(ctx, false), { asyncArtifact: true }),
];

export default commands;
