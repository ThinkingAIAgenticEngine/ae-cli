import { parseCommunityJson, stringifyCommunityJson } from './lossless-json.js';

export const COMMUNITY_DATA_TYPES = [
  'post',
  'video',
  'reply',
  'danmu',
  'live_room',
  'live_interaction',
  'chat',
  'interaction',
] as const;

export type CommunityDataType = typeof COMMUNITY_DATA_TYPES[number];

type CommunityObject = Record<string, unknown>;

export interface CommunityDataLocation {
  segment?: number;
  record?: number;
  field?: string;
}

export class CommunityDataValidationError extends Error {
  readonly code: string;
  readonly segment?: number;
  readonly record?: number;
  readonly field?: string;

  constructor(code: string, message: string, location: CommunityDataLocation = {}) {
    super(message);
    this.name = 'CommunityDataValidationError';
    this.code = code;
    this.segment = location.segment;
    this.record = location.record;
    this.field = location.field;
  }
}

export interface CommunityNormalizationStats {
  truncatedFields: number;
  defaultedFields: number;
  convertedIntegerFields: number;
  fields: Record<string, number>;
}

export interface NormalizeCommunityReportInput {
  spaceId: unknown;
  channelId: unknown;
  sourceId: unknown;
  zoneId: unknown;
  dataType?: unknown;
  data?: unknown;
  payload?: unknown;
}

export interface CommunityWirePayload {
  custom_data: {
    channel_id: bigint;
    game_id: bigint;
    source_id: bigint;
    source_type: '#standard';
    version: '5.0.0';
  };
  zone_id: string;
  payload: Array<CommunityObject & {
    data_type: CommunityDataType;
    data: CommunityObject[];
  }>;
}

export interface NormalizedCommunityReport {
  wirePayload: CommunityWirePayload;
  wireBody: string;
  segmentCount: number;
  recordCount: number;
  dataTypes: CommunityDataType[];
  byteLength: number;
  normalization: CommunityNormalizationStats;
}

const INT64_MIN = -(1n << 63n);
const INT64_MAX = (1n << 63n) - 1n;
const CANONICAL_INTEGER = /^-?(?:0|[1-9]\d*)$/;
const ROOT_TYPES = new Set(['post', 'video', 'live']);
const ACTIVITY_TYPES = new Set(['danmu', 'gift', 'superchat', 'premium']);
const ALL_DATA_TYPES = new Set<string>(COMMUNITY_DATA_TYPES);
const POST_VIDEO_METRICS = new Set([
  'views',
  'likes',
  'comments',
  'shares',
  'favorites',
  'coins',
  'danmaku',
  'dislikes',
]);
const GENERAL_CONTENT_METRICS = new Set(['favorites', 'coins', 'danmaku', 'dislikes']);
const USER_METRICS = new Set(['followers', 'total_views', 'total_likes']);

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  hasTime: boolean;
}

interface RecordContext {
  type: CommunityDataType;
  channelId: bigint;
  zoneId: string;
  location: Required<Pick<CommunityDataLocation, 'segment' | 'record'>>;
  stats: StatsCollector;
}

interface IntegerOptions {
  required?: boolean;
  nonnegative?: boolean;
  positive?: boolean;
  min?: bigint;
  max?: bigint;
}

interface TextOptions {
  required?: boolean;
  maxLength?: number;
  truncate?: boolean;
  dateTime?: boolean;
  requireTime?: boolean;
  path?: string;
}

class StatsCollector {
  readonly value: CommunityNormalizationStats = {
    truncatedFields: 0,
    defaultedFields: 0,
    convertedIntegerFields: 0,
    fields: {},
  };

  truncated(field: string): void {
    this.value.truncatedFields += 1;
    this.increment(field);
  }

  defaulted(field: string): void {
    this.value.defaultedFields += 1;
    this.increment(field);
  }

  convertedInteger(field: string): void {
    this.value.convertedIntegerFields += 1;
    this.increment(field);
  }

  private increment(field: string): void {
    this.value.fields[field] = (this.value.fields[field] ?? 0) + 1;
  }
}

function validationError(
  code: string,
  message: string,
  location: CommunityDataLocation = {},
): never {
  throw new CommunityDataValidationError(code, message, location);
}

function isObject(value: unknown): value is CommunityObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object: CommunityObject, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, field);
}

function fieldLocation(context: RecordContext, field: string): CommunityDataLocation {
  return { ...context.location, field };
}

function statField(context: RecordContext, field: string): string {
  return `${context.type}.${field}`;
}

function parseInteger(
  value: unknown,
  location: CommunityDataLocation,
  options: IntegerOptions = {},
): { value: bigint; converted: boolean } {
  let integer: bigint;
  let converted = false;

  if (typeof value === 'bigint') {
    integer = value;
  } else if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      validationError(
        'community_invalid_integer',
        'The field must be a lossless integer number or a canonical decimal string.',
        location,
      );
    }
    integer = BigInt(value);
  } else if (typeof value === 'string') {
    if (!CANONICAL_INTEGER.test(value) || value === '-0') {
      validationError(
        'community_invalid_integer',
        'The field must be a lossless integer number or a canonical decimal string.',
        location,
      );
    }
    integer = BigInt(value);
    converted = true;
  } else {
    validationError(
      'community_invalid_integer',
      'The field must be a lossless integer number or a canonical decimal string.',
      location,
    );
  }

  const minimum = options.min ?? INT64_MIN;
  const maximum = options.max ?? INT64_MAX;
  if (integer < minimum || integer > maximum) {
    validationError('community_integer_out_of_range', 'The field is outside its supported integer range.', location);
  }
  if (options.positive && integer <= 0n) {
    validationError('community_integer_out_of_range', 'The field must be a positive integer.', location);
  }
  if (options.nonnegative && integer < 0n) {
    validationError('community_integer_out_of_range', 'The field must be a nonnegative integer.', location);
  }

  return { value: integer, converted };
}

function parsePositiveId(value: unknown, field: string): bigint {
  return parseInteger(value, { field }, { positive: true }).value;
}

function normalizeIntegerField(
  input: CommunityObject,
  output: CommunityObject,
  field: string,
  context: RecordContext,
  options: IntegerOptions = {},
): bigint | undefined {
  if (!hasOwn(input, field) || input[field] === null) {
    if (options.required) {
      validationError('community_required_field', 'A required field is missing.', fieldLocation(context, field));
    }
    delete output[field];
    return undefined;
  }

  const parsed = parseInteger(input[field], fieldLocation(context, field), options);
  output[field] = parsed.value;
  if (parsed.converted) {
    context.stats.convertedInteger(statField(context, field));
  }
  return parsed.value;
}

function normalizeSmallIntegerField(
  input: CommunityObject,
  output: CommunityObject,
  field: string,
  context: RecordContext,
  options: IntegerOptions = {},
): number | undefined {
  const integer = normalizeIntegerField(input, output, field, context, options);
  if (integer === undefined) return undefined;
  const result = Number(integer);
  output[field] = result;
  return result;
}

function parseDateTime(value: string, location: CommunityDataLocation, requireTime = false): DateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?)?$/.exec(value);
  if (!match) {
    validationError('community_invalid_datetime', 'The field must use a supported Iris date-time format.', location);
  }

  const hasTime = match[4] !== undefined;
  if (requireTime && !hasTime) {
    validationError('community_invalid_datetime', 'The field must include a time component.', location);
  }

  const parts: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
    millisecond: Number(match[7] ?? 0),
    hasTime,
  };

  if (parts.year === 0 || parts.month < 1 || parts.month > 12
    || parts.hour > 23 || parts.minute > 59 || parts.second > 59) {
    validationError('community_invalid_datetime', 'The field must use a supported Iris date-time format.', location);
  }

  const calendarCheck = new Date(0);
  calendarCheck.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  calendarCheck.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond);
  if (calendarCheck.getUTCFullYear() !== parts.year
    || calendarCheck.getUTCMonth() !== parts.month - 1
    || calendarCheck.getUTCDate() !== parts.day
    || calendarCheck.getUTCHours() !== parts.hour
    || calendarCheck.getUTCMinutes() !== parts.minute
    || calendarCheck.getUTCSeconds() !== parts.second
    || calendarCheck.getUTCMilliseconds() !== parts.millisecond) {
    validationError('community_invalid_datetime', 'The field must use a supported Iris date-time format.', location);
  }

  return parts;
}

function normalizeTextField(
  input: CommunityObject,
  output: CommunityObject,
  field: string,
  context: RecordContext,
  options: TextOptions = {},
): string | undefined {
  const path = options.path ?? field;
  if (!hasOwn(input, field) || input[field] === null) {
    if (options.required) {
      validationError('community_required_field', 'A required field is missing.', fieldLocation(context, path));
    }
    delete output[field];
    return undefined;
  }

  const value = input[field];
  if (typeof value !== 'string') {
    validationError('community_invalid_text', 'The field must be a JSON string.', fieldLocation(context, path));
  }

  let normalized = value;
  if (options.maxLength !== undefined && normalized.length > options.maxLength) {
    if (!options.truncate) {
      validationError(
        'community_text_too_long',
        `The field must not exceed ${options.maxLength} UTF-16 code units.`,
        fieldLocation(context, path),
      );
    }
    normalized = normalized.slice(0, options.maxLength);
    context.stats.truncated(statField(context, path));
  }

  if (options.dateTime) {
    parseDateTime(normalized, fieldLocation(context, path), options.requireTime);
  }
  output[field] = normalized;
  return normalized;
}

function parseEncodedObject(value: unknown): CommunityObject | undefined {
  if (isObject(value)) return value;
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = parseCommunityJson(value);
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function normalizeFallbackObjectField(
  input: CommunityObject,
  output: CommunityObject,
  field: string,
  context: RecordContext,
): CommunityObject {
  const object = hasOwn(input, field) && input[field] !== null
    ? parseEncodedObject(input[field])
    : undefined;
  if (object === undefined) {
    const fallback: CommunityObject = {};
    output[field] = fallback;
    context.stats.defaulted(statField(context, field));
    return fallback;
  }
  output[field] = object;
  return object;
}

function normalizeRequiredObjectValue(
  value: unknown,
  context: RecordContext,
  field: string,
): CommunityObject {
  const object = parseEncodedObject(value);
  if (object === undefined) {
    validationError('community_invalid_object', 'The field must be a JSON object.', fieldLocation(context, field));
  }
  return object;
}

function normalizeSubtitle(input: CommunityObject, output: CommunityObject, context: RecordContext): void {
  if (!hasOwn(input, 'subtitle') || input.subtitle === null) {
    delete output.subtitle;
    return;
  }

  let value: unknown = input.subtitle;
  if (typeof value === 'string') {
    try {
      value = parseCommunityJson(value);
    } catch {
      validationError('community_invalid_array', 'The field must be an array of JSON objects.', fieldLocation(context, 'subtitle'));
    }
  }
  if (!Array.isArray(value) || value.some((element) => !isObject(element))) {
    validationError('community_invalid_array', 'The field must be an array of JSON objects.', fieldLocation(context, 'subtitle'));
  }
  output.subtitle = value;
}

function metricNamesForContentType(contentType: number): Set<string> {
  if (contentType === 0 || contentType === 1) return POST_VIDEO_METRICS;
  if (contentType === 7) return USER_METRICS;
  return GENERAL_CONTENT_METRICS;
}

function normalizeMetrics(
  value: unknown,
  contentType: number,
  context: RecordContext,
  fieldPrefix: string,
): CommunityObject {
  const metrics = normalizeRequiredObjectValue(value, context, fieldPrefix);
  const names = Object.keys(metrics);
  if (names.length === 0) {
    validationError('community_empty_metrics', 'The metrics object must not be empty.', fieldLocation(context, fieldPrefix));
  }

  const allowed = metricNamesForContentType(contentType);
  const normalized: CommunityObject = { ...metrics };
  for (const name of names) {
    const field = `${fieldPrefix}.${name}`;
    if (!allowed.has(name)) {
      validationError(
        'community_invalid_metric',
        'The metric name is not allowed for the selected content type.',
        fieldLocation(context, field),
      );
    }
    const parsed = parseInteger(metrics[name], fieldLocation(context, field), { nonnegative: true });
    normalized[name] = parsed.value;
    if (parsed.converted) {
      context.stats.convertedInteger(statField(context, field));
    }
  }
  return normalized;
}

function normalizeInteractionSidecar(
  input: CommunityObject,
  output: CommunityObject,
  context: RecordContext,
  contentType: 0 | 1,
): void {
  if (!hasOwn(input, 'interaction') || input.interaction === null) {
    delete output.interaction;
    return;
  }

  const interaction = normalizeRequiredObjectValue(input.interaction, context, 'interaction');
  const normalized: CommunityObject = { ...interaction };
  normalizeTextField(interaction, normalized, 'collect_time', context, {
    required: true,
    dateTime: true,
    path: 'interaction.collect_time',
  });
  if (!hasOwn(interaction, 'metrics') || interaction.metrics === null) {
    validationError('community_required_field', 'A required field is missing.', fieldLocation(context, 'interaction.metrics'));
  }
  normalized.metrics = normalizeMetrics(interaction.metrics, contentType, context, 'interaction.metrics');
  output.interaction = normalized;
}

function normalizePost(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  normalizeTextField(input, output, 'post_uuid', context, { required: true, maxLength: 32 });
  normalizeTextField(input, output, 'user_id', context, { maxLength: 64, truncate: true });
  normalizeTextField(input, output, 'user_name', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'title', context, { maxLength: 200, truncate: true });
  normalizeTextField(input, output, 'content', context, { maxLength: 65533, truncate: true });
  normalizeTextField(input, output, 'publish_time', context, { dateTime: true });
  normalizeFallbackObjectField(input, output, 'extras', context);
  normalizeInteractionSidecar(input, output, context, 0);
  return output;
}

function normalizeVideo(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  normalizeTextField(input, output, 'video_uuid', context, { required: true, maxLength: 32 });
  normalizeTextField(input, output, 'user_id', context, { maxLength: 64, truncate: true });
  normalizeTextField(input, output, 'user_name', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'title', context, { maxLength: 1000, truncate: true });
  normalizeTextField(input, output, 'description', context, { maxLength: 65533, truncate: true });
  normalizeTextField(input, output, 'publish_time', context, { dateTime: true });
  normalizeSubtitle(input, output, context);
  normalizeFallbackObjectField(input, output, 'extras', context);
  normalizeInteractionSidecar(input, output, context, 1);
  return output;
}

function normalizeRootFields(input: CommunityObject, output: CommunityObject, context: RecordContext): void {
  normalizeTextField(input, output, 'root_id', context, { required: true, maxLength: 32, truncate: true });
  const rootType = normalizeTextField(input, output, 'root_type', context, { required: true });
  if (!ROOT_TYPES.has(rootType!)) {
    validationError('community_invalid_enum', 'The field contains an unsupported enum value.', fieldLocation(context, 'root_type'));
  }
}

function normalizeReply(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  normalizeTextField(input, output, 'reply_uuid', context, { required: true, maxLength: 32 });
  normalizeTextField(input, output, 'user_id', context, { maxLength: 64, truncate: true });
  normalizeTextField(input, output, 'user_name', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'content', context, { maxLength: 65533, truncate: true });
  normalizeTextField(input, output, 'publish_time', context, { dateTime: true });
  normalizeTextField(input, output, 'parent_id', context, { maxLength: 32, truncate: true });
  normalizeRootFields(input, output, context);
  normalizeFallbackObjectField(input, output, 'extras', context);
  return output;
}

function normalizeDanmu(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  normalizeTextField(input, output, 'danmu_uuid', context, { required: true, maxLength: 32 });
  normalizeTextField(input, output, 'user_id', context, { maxLength: 64, truncate: true });
  normalizeTextField(input, output, 'user_name', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'content', context, { maxLength: 65533, truncate: true });
  normalizeIntegerField(input, output, 'timestamp', context, { required: true, nonnegative: true });
  normalizeTextField(input, output, 'publish_time', context, { dateTime: true });
  normalizeRootFields(input, output, context);
  return output;
}

function dateTimeToUtcMilliseconds(parts: DateTimeParts): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond);
  return date.getTime();
}

function zonedDateTimeToEpochMilliseconds(parts: DateTimeParts, zoneId: string): number {
  const localAsUtc = dateTimeToUtcMilliseconds(parts);
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-iso8601-nu-latn', {
    timeZone: zoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  let estimate = localAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const formatted = Object.fromEntries(
      formatter.formatToParts(new Date(estimate))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    ) as Record<string, number>;
    const represented = new Date(0);
    represented.setUTCFullYear(formatted.year, formatted.month - 1, formatted.day);
    represented.setUTCHours(formatted.hour, formatted.minute, formatted.second, 0);
    const offset = represented.getTime() - (estimate - (estimate % 1000));
    const next = localAsUtc - offset;
    if (next === estimate) break;
    estimate = next;
  }
  return estimate;
}

function validateStreamId(
  roomId: string,
  streamStartTime: string,
  context: RecordContext,
): void {
  const parts = parseDateTime(streamStartTime, fieldLocation(context, 'stream_start_time'), true);
  const timestamp = zonedDateTimeToEpochMilliseconds(parts, context.zoneId);
  const streamId = `${context.channelId}_${roomId}_${timestamp}`;
  if (streamId.length > 64) {
    validationError(
      'community_derived_id_too_long',
      'The derived stream identifier exceeds its supported length.',
      fieldLocation(context, 'stream_start_time'),
    );
  }
}

function normalizeLiveRoom(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  const uuid = normalizeIntegerField(input, output, 'uuid', context, { required: true, nonnegative: true })!;
  const roomId = normalizeTextField(input, output, 'room_id', context, { required: true, maxLength: 32 })!;
  normalizeTextField(input, output, 'room_name', context, { required: true, maxLength: 80 });
  normalizeTextField(input, output, 'room_type', context, { maxLength: 128, truncate: true });
  normalizeTextField(input, output, 'room_avatar', context, { required: true, maxLength: 65533 });
  normalizeIntegerField(input, output, 'fans', context, { required: true, nonnegative: true });
  normalizeTextField(input, output, 'stream_cover', context, { maxLength: 65533, truncate: true });
  normalizeTextField(input, output, 'stream_title', context, { maxLength: 80, truncate: true });

  const suppliedStreamStatus = hasOwn(input, 'stream_status') && input.stream_status !== null;
  if (!suppliedStreamStatus) {
    output.stream_status = 0;
    context.stats.defaulted(statField(context, 'stream_status'));
  } else {
    const status = normalizeSmallIntegerField(input, output, 'stream_status', context, { min: 0n, max: 2n })!;
    if (status === 2) {
      output.stream_status = 0;
      context.stats.defaulted(statField(context, 'stream_status'));
    }
  }

  const streamStartTime = normalizeTextField(input, output, 'stream_start_time', context, {
    dateTime: true,
    requireTime: true,
  });
  normalizeTextField(input, output, 'stream_end_time', context, { dateTime: true });
  normalizeTextField(input, output, 'stream_notice', context, { maxLength: 255 });
  normalizeTextField(input, output, 'timestamp', context, { required: true, dateTime: true });

  for (const metric of ['online', 'heat', 'noble_count', 'guardian_count', 'diamond_fan_count', 'dfans_count']) {
    normalizeIntegerField(input, output, metric, context, { nonnegative: true });
  }

  const guardianAliases = ['guardian_count', 'diamond_fan_count', 'dfans_count']
    .filter((field) => hasOwn(input, field) && input[field] !== null);
  if (guardianAliases.length > 1) {
    validationError(
      'community_conflicting_fields',
      'Only one guardian metric alias may be supplied.',
      fieldLocation(context, guardianAliases[1]),
    );
  }

  const streamDependentFields = [
    'stream_cover',
    'stream_title',
    'stream_status',
    'stream_end_time',
    'stream_notice',
    'online',
    'heat',
    'noble_count',
    'guardian_count',
    'diamond_fan_count',
    'dfans_count',
  ];
  const hasStreamDetails = streamDependentFields
    .some((field) => hasOwn(input, field) && input[field] !== null);
  if (hasStreamDetails && streamStartTime === undefined) {
    validationError(
      'community_required_field',
      'A stream start time is required when stream details or metrics are supplied.',
      fieldLocation(context, 'stream_start_time'),
    );
  }

  if (uuid * 5n + 4n > INT64_MAX) {
    validationError(
      'community_derived_id_overflow',
      'A derived live metric identifier would exceed signed int64.',
      fieldLocation(context, 'uuid'),
    );
  }
  if (streamStartTime !== undefined) {
    validateStreamId(roomId, streamStartTime, context);
  }
  return output;
}

function normalizeLiveInteraction(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  normalizeIntegerField(input, output, 'uuid', context, { required: true, nonnegative: true });
  const activityType = normalizeTextField(input, output, 'activity_type', context, { required: true });
  if (!ACTIVITY_TYPES.has(activityType!)) {
    validationError('community_invalid_enum', 'The field contains an unsupported enum value.', fieldLocation(context, 'activity_type'));
  }
  normalizeTextField(input, output, 'activity_content', context, { required: true, maxLength: 1024, truncate: true });
  normalizeTextField(input, output, 'user_id', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'user_name', context, { maxLength: 80, truncate: true });
  const userExtra = normalizeFallbackObjectField(input, output, 'user_extra', context);
  if (stringifyCommunityJson(userExtra).length > 1024) {
    validationError(
      'community_object_too_long',
      'The compact user_extra object must not exceed 1024 UTF-16 code units.',
      fieldLocation(context, 'user_extra'),
    );
  }
  normalizeTextField(input, output, 'timestamp', context, { required: true, dateTime: true });
  const roomId = normalizeTextField(input, output, 'room_id', context, { required: true, maxLength: 32 })!;
  const streamStartTime = normalizeTextField(input, output, 'stream_start_time', context, {
    required: true,
    dateTime: true,
    requireTime: true,
  })!;
  validateStreamId(roomId, streamStartTime, context);
  return output;
}

function normalizeChat(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  normalizeTextField(input, output, 'chat_uuid', context, { required: true, maxLength: 36, truncate: true });
  normalizeTextField(input, output, 'user_id', context, { required: true, maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'user_name', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'chat_room_type', context, { required: true, maxLength: 16, truncate: true });
  normalizeTextField(input, output, 'chat_room_id', context, { required: true, maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'chat_room', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'chat_server', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'chat_server_id', context, { maxLength: 80, truncate: true });
  normalizeTextField(input, output, 'content', context, { required: true, maxLength: 65533, truncate: true });
  normalizeTextField(input, output, 'publish_time', context, { required: true, dateTime: true });
  normalizeFallbackObjectField(input, output, 'extras', context);
  return output;
}

function normalizeInteraction(input: CommunityObject, context: RecordContext): CommunityObject {
  const output: CommunityObject = { ...input };
  normalizeTextField(input, output, 'content_uuid', context, { required: true, maxLength: 32, truncate: true });
  const contentType = normalizeSmallIntegerField(input, output, 'content_type', context, {
    required: true,
    min: 0n,
    max: 7n,
  })!;
  normalizeTextField(input, output, 'collect_time', context, { required: true, dateTime: true });
  if (!hasOwn(input, 'metrics') || input.metrics === null) {
    validationError('community_required_field', 'A required field is missing.', fieldLocation(context, 'metrics'));
  }
  output.metrics = normalizeMetrics(input.metrics, contentType, context, 'metrics');
  return output;
}

function normalizeRecord(input: unknown, context: RecordContext): CommunityObject {
  if (!isObject(input)) {
    validationError('community_invalid_record', 'Each data record must be a JSON object.', context.location);
  }

  switch (context.type) {
    case 'post': return normalizePost(input, context);
    case 'video': return normalizeVideo(input, context);
    case 'reply': return normalizeReply(input, context);
    case 'danmu': return normalizeDanmu(input, context);
    case 'live_room': return normalizeLiveRoom(input, context);
    case 'live_interaction': return normalizeLiveInteraction(input, context);
    case 'chat': return normalizeChat(input, context);
    case 'interaction': return normalizeInteraction(input, context);
  }
}

function parseDataType(value: unknown, segment: number): CommunityDataType {
  if (typeof value !== 'string' || !ALL_DATA_TYPES.has(value)) {
    validationError(
      'community_invalid_data_type',
      'The segment data_type must be one of the eight supported community data types.',
      { segment, field: 'data_type' },
    );
  }
  return value as CommunityDataType;
}

function normalizeSegment(
  input: unknown,
  segment: number,
  channelId: bigint,
  zoneId: string,
  stats: StatsCollector,
): CommunityObject & { data_type: CommunityDataType; data: CommunityObject[] } {
  if (!isObject(input)) {
    validationError('community_invalid_segment', 'Each payload segment must be a JSON object.', { segment });
  }
  if (!hasOwn(input, 'data_type')) {
    validationError('community_required_field', 'A required field is missing.', { segment, field: 'data_type' });
  }
  if (!hasOwn(input, 'data') || input.data === null) {
    validationError('community_required_field', 'A required field is missing.', { segment, field: 'data' });
  }

  const dataType = parseDataType(input.data_type, segment);
  const records = Array.isArray(input.data) ? input.data : [input.data];
  if (records.length === 0) {
    validationError('community_empty_data', 'A segment data array must not be empty.', { segment, field: 'data' });
  }

  const normalized = records.map((record, index) => normalizeRecord(record, {
    type: dataType,
    channelId,
    zoneId,
    location: { segment, record: index },
    stats,
  }));
  return { ...input, data_type: dataType, data: normalized };
}

function validateZoneId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    validationError('community_invalid_zone_id', 'zone_id must be a valid IANA time zone name.', { field: 'zone_id' });
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
  } catch {
    validationError('community_invalid_zone_id', 'zone_id must be a valid IANA time zone name.', { field: 'zone_id' });
  }
  return value;
}

/**
 * Validates and normalizes one #standard/5.0.0 community ingestion request.
 * The returned body uses unquoted JSON numbers for every int64 field.
 */
export function normalizeCommunityReportInput(input: NormalizeCommunityReportInput): NormalizedCommunityReport {
  const spaceId = parsePositiveId(input.spaceId, 'space_id');
  const channelId = parsePositiveId(input.channelId, 'channel_id');
  const sourceId = parsePositiveId(input.sourceId, 'source_id');
  const zoneId = validateZoneId(input.zoneId);
  const hasDataMode = input.dataType !== undefined || input.data !== undefined;
  const hasPayloadMode = input.payload !== undefined;

  if (hasDataMode === hasPayloadMode) {
    validationError(
      'community_input_mode',
      'Use exactly one input mode: data_type with data, or payload.',
      { field: 'data/payload' },
    );
  }

  let rawSegments: unknown[];
  if (hasDataMode) {
    if (input.dataType === undefined || input.data === undefined) {
      validationError(
        'community_input_mode',
        'The data_type and data fields must be supplied together.',
        { field: input.dataType === undefined ? 'data_type' : 'data' },
      );
    }
    rawSegments = [{ data_type: input.dataType, data: input.data }];
  } else {
    rawSegments = Array.isArray(input.payload) ? input.payload : [input.payload];
    if (rawSegments.length === 0) {
      validationError('community_empty_payload', 'The payload array must not be empty.', { field: 'payload' });
    }
  }

  const stats = new StatsCollector();
  const segments = rawSegments.map((segment, index) => normalizeSegment(
    segment,
    index,
    channelId,
    zoneId,
    stats,
  ));
  const dataTypes = [...new Set(segments.map((segment) => segment.data_type))];
  const recordCount = segments.reduce((count, segment) => count + segment.data.length, 0);
  const wirePayload: CommunityWirePayload = {
    custom_data: {
      channel_id: channelId,
      game_id: spaceId,
      source_id: sourceId,
      source_type: '#standard',
      version: '5.0.0',
    },
    zone_id: zoneId,
    payload: segments,
  };
  const wireBody = stringifyCommunityJson(wirePayload);

  return {
    wirePayload,
    wireBody,
    segmentCount: segments.length,
    recordCount,
    dataTypes,
    byteLength: Buffer.byteLength(wireBody, 'utf8'),
    normalization: stats.value,
  };
}

export const normalizeCommunityPayload = normalizeCommunityReportInput;
