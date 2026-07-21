import { readFileSync } from 'node:fs';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import {
  CommunityDataValidationError,
  normalizeCommunityReportInput,
  type CommunityNormalizationStats,
  type NormalizedCommunityReport,
} from './standard-v5.js';
import { CommunityJsonParseError, parseCommunityJson } from './lossless-json.js';

const DEFAULT_ZONE_ID = 'Asia/Shanghai';
const SCHEMA_HELP_COMMAND = 'ae-cli community data report --help';
const SCHEMA_VALIDATION_HINT =
  `Run "${SCHEMA_HELP_COMMAND}" to review input modes and required fields for all eight data types. `
  + 'Use meta.location, when present, to correct the field without exposing its value.';
const QUEUED_VERIFICATION_NEXT_STEP =
  'After asynchronous processing, verify the submitted record identifiers through an authorized downstream query or storage path before treating this submission as persisted.';
const COMMUNITY_REPORT_HELP = [
  'Record schema summary (required fields):',
  '  post: post_uuid',
  '  video: video_uuid',
  '  reply: reply_uuid, root_id, root_type',
  '  danmu: danmu_uuid, timestamp, root_id, root_type',
  '  live_room: uuid, room_id, room_name, room_avatar, fans, timestamp',
  '  live_interaction: uuid, activity_type, activity_content, room_id, stream_start_time, timestamp',
  '  chat: chat_uuid, user_id, chat_room_type, chat_room_id, content, publish_time',
  '  interaction: content_uuid, content_type, collect_time, metrics',
  '',
  'Input modes: use --data-type <type> with --data, or --payload for mixed data types.',
].join('\n');

interface PreparedCommunityReport {
  endpoint: string;
  normalized: NormalizedCommunityReport;
  ids: {
    spaceId: string;
    channelId: string;
    sourceId: string;
  };
  zoneId: string;
}

interface CommunityReportTransportResult {
  return_code: 0;
  return_message: string;
  http_status: number;
  request_bytes: number;
  response_bytes: number;
}

export const communityDataReport: Command = {
  service: 'community',
  resource: 'data',
  command: 'report',
  usesAeHost: false,
  description: 'Validate and queue community data at an explicit Iris /sync_content endpoint.',
  helpText: COMMUNITY_REPORT_HELP,
  flags: [
    {
      name: 'endpoint',
      type: 'string',
      sensitive: true,
      desc: 'Complete Iris ingestion URL ending in /sync_content. Overrides AE_IRIS_SYNC_ENDPOINT; unrelated to --host.',
    },
    {
      name: 'space-id',
      type: 'string',
      required: true,
      desc: 'Positive int64 community space ID, sent to Iris as game_id.',
    },
    {
      name: 'channel-id',
      type: 'string',
      required: true,
      desc: 'Positive int64 Iris channel ID.',
    },
    {
      name: 'source-id',
      type: 'string',
      required: true,
      desc: 'Positive int64 Iris source ID.',
    },
    {
      name: 'data-type',
      type: 'string',
      desc: 'Record type for --data: post, video, reply, danmu, live_room, live_interaction, chat, or interaction.',
    },
    {
      name: 'data',
      type: 'string',
      sensitive: true,
      desc: 'One record or a non-empty record array as inline JSON, path, @path, or - for stdin.',
    },
    {
      name: 'payload',
      type: 'string',
      sensitive: true,
      desc: 'One segment or a non-empty segment array as inline JSON, path, @path, or - for stdin.',
    },
    {
      name: 'zone-id',
      type: 'string',
      default: DEFAULT_ZONE_ID,
      desc: `IANA time zone used by Iris. Default: ${DEFAULT_ZONE_ID}.`,
    },
  ],
  risk: 'write',
  dryRun: async (ctx) => {
    const prepared = prepareCommunityReport(ctx);
    return {
      endpoint: prepared.endpoint,
      data_types: prepared.normalized.dataTypes,
      segment_count: prepared.normalized.segmentCount,
      record_count: prepared.normalized.recordCount,
      request_bytes: prepared.normalized.byteLength,
      normalization: formatNormalization(prepared.normalized.normalization),
    };
  },
  execute: async (ctx) => {
    const prepared = prepareCommunityReport(ctx);
    const transport = await ctx.communityReport(
      prepared.endpoint,
      prepared.normalized.wireBody,
    ) as CommunityReportTransportResult;

    return {
      status: 'queued',
      return_code: transport.return_code,
      return_message: transport.return_message,
      endpoint: prepared.endpoint,
      space_id: prepared.ids.spaceId,
      channel_id: prepared.ids.channelId,
      source_id: prepared.ids.sourceId,
      zone_id: prepared.zoneId,
      data_types: prepared.normalized.dataTypes,
      segment_count: prepared.normalized.segmentCount,
      submitted_record_count: prepared.normalized.recordCount,
      request_bytes: prepared.normalized.byteLength,
      response_bytes: transport.response_bytes,
      http_status: transport.http_status,
      normalization: formatNormalization(prepared.normalized.normalization),
      persistence_verified: false,
      next_step: QUEUED_VERIFICATION_NEXT_STEP,
    };
  },
};

export function resolveCommunityReportEndpoint(
  flagValue: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const raw = (flagValue?.trim() || environment.AE_IRIS_SYNC_ENDPOINT?.trim() || '');
  if (!raw) {
    throw new CliValidationError(
      'A complete Iris sync endpoint is required.',
      {
        code: 'community_missing_endpoint',
        hint: 'Pass --endpoint <http(s)://.../sync_content> or set AE_IRIS_SYNC_ENDPOINT.',
        location: { field: 'endpoint' },
      },
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(raw);
  } catch {
    throw endpointValidationError();
  }
  const usesHttp = endpoint.protocol === 'http:' || endpoint.protocol === 'https:';
  const hasForbiddenComponents = endpoint.username !== ''
    || endpoint.password !== ''
    || endpoint.search !== ''
    || endpoint.hash !== ''
    || raw.includes('?')
    || raw.includes('#');
  if (usesHttp && !hasForbiddenComponents && !endpoint.pathname.endsWith('/sync_content')) {
    throw endpointMissingSyncContentError();
  }
  if (!usesHttp || hasForbiddenComponents) {
    throw endpointValidationError();
  }
  return endpoint.toString();
}

export function readCommunityReportInput(raw: string, field: 'data' | 'payload'): unknown {
  const trimmed = raw.trim();
  let text: string;
  try {
    if (trimmed === '-') {
      text = readFileSync(0, 'utf8');
    } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      text = trimmed;
    } else {
      const filePath = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      if (!filePath) throw new Error('missing path');
      text = readFileSync(filePath, 'utf8');
    }
  } catch {
    throw new CliValidationError(
      'Unable to read the community JSON input.',
      {
        code: 'community_input_read_failed',
        hint: `Pass --${field} as inline JSON, an existing path, @path, or - for stdin.`,
        location: { field },
      },
    );
  }

  try {
    return parseCommunityJson(text);
  } catch (error) {
    if (error instanceof CommunityJsonParseError) {
      throw new CliValidationError(
        'Community input must be valid JSON.',
        {
          code: error.code,
          hint: SCHEMA_VALIDATION_HINT,
          location: { field },
        },
      );
    }
    throw error;
  }
}

export function prepareCommunityReport(ctx: RuntimeContext): PreparedCommunityReport {
  const endpoint = resolveCommunityReportEndpoint(ctx.str('endpoint'));
  const dataType = ctx.str('data-type');
  const dataArgument = ctx.str('data');
  const payloadArgument = ctx.str('payload');
  const hasDataMode = dataType !== '' || dataArgument !== '';
  const hasPayloadMode = payloadArgument !== '';

  let data: unknown;
  let payload: unknown;
  if (hasDataMode && dataArgument !== '') {
    data = readCommunityReportInput(dataArgument, 'data');
  }
  if (hasPayloadMode) {
    payload = readCommunityReportInput(payloadArgument, 'payload');
  }

  const ids = {
    spaceId: ctx.str('space-id'),
    channelId: ctx.str('channel-id'),
    sourceId: ctx.str('source-id'),
  };
  const zoneId = ctx.str('zone-id') || DEFAULT_ZONE_ID;

  try {
    const normalized = normalizeCommunityReportInput({
      spaceId: ids.spaceId,
      channelId: ids.channelId,
      sourceId: ids.sourceId,
      zoneId,
      dataType: hasDataMode ? (dataType || undefined) : undefined,
      data: hasDataMode ? data : undefined,
      payload: hasPayloadMode ? payload : undefined,
    });
    return { endpoint, normalized, ids, zoneId };
  } catch (error) {
    if (error instanceof CommunityDataValidationError) {
      throw new CliValidationError(error.message, {
        code: error.code,
        hint: SCHEMA_VALIDATION_HINT,
        location: {
          segment: error.segment,
          record: error.record,
          field: error.field,
        },
      });
    }
    throw error;
  }
}

function endpointMissingSyncContentError(): CliValidationError {
  return new CliValidationError(
    'The Iris sync endpoint URL is valid, but its path does not end with the required /sync_content suffix.',
    {
      code: 'community_invalid_endpoint',
      hint: 'Provide the complete endpoint with /sync_content as the final path component and no trailing slash.',
      location: { field: 'endpoint' },
    },
  );
}

function endpointValidationError(): CliValidationError {
  return new CliValidationError(
    'The Iris sync endpoint is invalid.',
    {
      code: 'community_invalid_endpoint',
      hint: 'Use a complete http(s) URL ending in /sync_content, without credentials, query parameters, or a fragment.',
      location: { field: 'endpoint' },
    },
  );
}

function formatNormalization(stats: CommunityNormalizationStats): Record<string, unknown> {
  return {
    truncated_fields: stats.truncatedFields,
    defaulted_fields: stats.defaultedFields,
    converted_integer_fields: stats.convertedIntegerFields,
    fields: stats.fields,
  };
}
