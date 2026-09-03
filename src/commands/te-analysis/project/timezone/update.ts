import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';
import { CliValidationError } from '../../../../core/errors.js';

const TIMEZONE_ITEMS = [
  'timezone_toggle',
  'zone_offset',
  'user_timezone',
  'project_timezone_display',
] as const;

type TimezoneItem = typeof TIMEZONE_ITEMS[number];

const timezonePayloadFlag = {
  ...requiredPayloadFlag,
  desc: 'Item-specific snake_case payload: timezone_toggle uses {"toggle":true}; zone_offset uses {"column_name":"#zone_offset"}; user_timezone uses {"column_name":"user_timezone","codetable":"optional_table"}; project_timezone_display uses {"display_timezones":[{"timezone":8,"is_default":true}]}.',
};

export const projectTimezoneUpdate = createAnalysisCapabilityCommand({
  resource: 'project timezone',
  command: 'update',
  capabilityId: 'project.timezone.update',
  description: 'Update one project time zone configuration item.',
  flags: [
    projectIdFlag,
    timezonePayloadFlag,
    { name: 'item', type: 'string', required: true, desc: 'Timezone item: timezone_toggle, zone_offset, user_timezone, project_timezone_display.' },
  ],
  risk: 'write',
  buildInput: (ctx) => {
    const item = ctx.str('item').toLowerCase();
    const payload = ctx.json('payload');
    validateTimezonePayload(item, payload);
    return compactInput({
      project_id: ctx.num('project-id'),
      payload,
      item,
    });
  },
});

function validateTimezonePayload(item: string, payload: unknown): asserts item is TimezoneItem {
  if (!TIMEZONE_ITEMS.includes(item as TimezoneItem)) {
    throw new CliValidationError(
      '--item must be timezone_toggle, zone_offset, user_timezone, or project_timezone_display.',
      { code: 'INVALID_TIMEZONE_ITEM' },
    );
  }
  if (!isObject(payload)) {
    throw invalidPayload(item, 'must be a JSON object');
  }

  switch (item) {
    case 'timezone_toggle':
      if (typeof payload.toggle !== 'boolean') {
        throw invalidPayload(item, 'requires boolean field toggle', '{"toggle":true}');
      }
      allowOnly(payload, item, ['toggle']);
      return;
    case 'zone_offset':
      if (typeof payload.column_name !== 'string') {
        throw invalidPayload(item, 'requires string field column_name', '{"column_name":"#zone_offset"}');
      }
      allowOnly(payload, item, ['column_name']);
      return;
    case 'user_timezone':
      if (typeof payload.column_name !== 'string' || payload.column_name.length === 0) {
        throw invalidPayload(item, 'requires non-empty string field column_name', '{"column_name":"user_timezone"}');
      }
      if (payload.codetable !== undefined && typeof payload.codetable !== 'string') {
        throw invalidPayload(item, 'optional field codetable must be a string', '{"column_name":"user_timezone","codetable":"timezone_code_table"}');
      }
      allowOnly(payload, item, ['column_name', 'codetable']);
      return;
    case 'project_timezone_display':
      validateDisplayTimezones(payload.display_timezones, item);
      allowOnly(payload, item, ['display_timezones']);
  }
}

function validateDisplayTimezones(value: unknown, item: TimezoneItem): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidPayload(item, 'requires non-empty array field display_timezones', '{"display_timezones":[{"timezone":8,"is_default":true}]}');
  }
  for (const entry of value) {
    if (!isObject(entry)) {
      throw invalidPayload(item, 'display_timezones entries must be objects', '{"display_timezones":[{"timezone":8,"is_default":true}]}');
    }
    allowOnly(entry, item, ['timezone', 'is_default']);
    if (!Number.isInteger(entry.timezone)
      || !((entry.timezone as number) >= -12 && (entry.timezone as number) <= 14 || entry.timezone === 99)) {
      throw invalidPayload(item, 'display_timezones[].timezone must be an integer from -12 through 14, or 99 for no fixed display timezone');
    }
    if (entry.is_default !== undefined && typeof entry.is_default !== 'boolean') {
      throw invalidPayload(item, 'display_timezones[].is_default must be a boolean when provided');
    }
  }
}

function allowOnly(payload: Record<string, unknown>, item: TimezoneItem, fields: string[]): void {
  if (Object.keys(payload).some((field) => !fields.includes(field))) {
    throw invalidPayload(item, `supports only fields ${fields.join(', ')}`);
  }
}

function invalidPayload(item: string, reason: string, example?: string): CliValidationError {
  return new CliValidationError(
    `--payload for --item ${item} ${reason}.`,
    {
      code: 'INVALID_TIMEZONE_PAYLOAD',
      hint: example === undefined ? undefined : `Use: --payload '${example}'`,
    },
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
