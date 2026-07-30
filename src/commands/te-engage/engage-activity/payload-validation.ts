import { CliValidationError } from '../../../core/errors.js';

const TOPIC_TASK_OVERRIDE_FIELDS = [
  'clusterKey',
  'triggerDefinition',
  'triggerRule',
  'triggerType',
  'triggerTime',
  'triggerCrontab',
  'startDate',
  'endDate',
  'triggerTimeStrategy',
  'tzOffset',
  'channelType',
  'channelId',
  'frequencyLimits',
  'enableChannelTouchLimits',
  'channelTouchLimitsRuleDef',
  'whitelistList',
  'expConfig',
] as const;

const TOPIC_TASK_EXCLUSION_FIELDS = new Set([
  'clusterOutFilters',
  'totalOutCFilter',
  'exclude',
  'excludes',
]);

/** Validates the static UI-compatibility subset for a standalone activity task. */
export function validateStandaloneActivityPayload(value: unknown): void {
  const payload = requireObject(value);
  validateTriggerType(payload.triggerType, 'triggerType');
  validateScheduleFields(payload);
  validateExperiment(payload.expConfig, 'expConfig');
  validateSingleContentGroup(payload.groupContentList, 'groupContentList');
  if (payload.triggerTimeStrategy !== 'fixed_time_zone') {
    fail(
      'Activity tasks must use triggerTimeStrategy=fixed_time_zone.',
      'ACTIVITY_TRIGGER_TIME_STRATEGY_UNSUPPORTED',
      'triggerTimeStrategy',
      'Use the parent activity timezone. User timezone and user active time are not supported.',
    );
  }
  if (typeof payload.tzOffset !== 'number' || !Number.isFinite(payload.tzOffset)) {
    fail(
      'tzOffset is required for a standalone activity task.',
      'ACTIVITY_TIMEZONE_REQUIRED',
      'tzOffset',
      'Read the parent activity and copy its tzOffset exactly.',
    );
  }
}

/** Validates the static UI-compatibility subset for an activity topic. */
export function validateActivityTopicPayload(value: unknown): void {
  const payload = requireObject(value);
  validateTriggerType(payload.triggerType, 'triggerType');
  validateScheduleFields(payload);
  validateExperiment(payload.expConfig, 'expConfig');
  for (const listField of ['tasks', 'modifyTaskList', 'addTaskList']) {
    const taskList = payload[listField];
    if (!Array.isArray(taskList)) continue;
    taskList.forEach((taskValue, index) => {
      const task = requireObject(taskValue, `${listField}[${index}]`);
      if (hasValue(task.targetClusterType) && task.targetClusterType !== 1) {
        fail(
          `${listField}[${index}].targetClusterType must be 1 (custom) for a topic task.`,
          'TOPIC_TASK_OVERRIDE_UNSUPPORTED',
          `${listField}[${index}].targetClusterType`,
          'Topic tasks always use the canonical custom audience mode and may only add an inclusion-only definitionRequest.',
        );
      }
      for (const field of TOPIC_TASK_OVERRIDE_FIELDS) {
        if (hasValue(task[field])) {
          fail(
            `${listField}[${index}].${field} is not configurable for a topic task.`,
            'TOPIC_TASK_OVERRIDE_UNSUPPORTED',
            `${listField}[${index}].${field}`,
            'Topic tasks inherit schedule, channel, frequency, whitelist, and experiment settings from the topic.',
          );
        }
      }
      if (containsAnyKey(task.definitionRequest, TOPIC_TASK_EXCLUSION_FIELDS)) {
        fail(
          `${listField}[${index}].definitionRequest must be an inclusion-only custom audience.`,
          'TOPIC_TASK_AUDIENCE_EXCLUSION_UNSUPPORTED',
          `${listField}[${index}].definitionRequest`,
          'Remove exclusion filters; topic tasks may only refine the shared topic audience with inclusion conditions.',
        );
      }
      validateSingleContentGroup(
        task.groupContentList,
        `${listField}[${index}].groupContentList`,
      );
    });
  }
}

function validateTriggerType(value: unknown, field: string): void {
  if (value === 0 || value === 1) return;
  fail(
    `${field} only supports 0 (schedule single) or 1 (schedule repeat) for activities.`,
    'ACTIVITY_TRIGGER_TYPE_UNSUPPORTED',
    field,
    'Use engage-task for manual, event-triggered, or other triggered tasks.',
  );
}

function validateScheduleFields(payload: Record<string, unknown>): void {
  if (payload.triggerType === 0 && !hasValue(payload.triggerTime)) {
    fail(
      'triggerTime is required when triggerType=0.',
      'TRIGGER_TIME_REQUIRED',
      'triggerTime',
      'Use yyyy-MM-dd HH:mm in the parent activity timezone.',
    );
  }
  if (payload.triggerType === 1) {
    for (const field of ['startDate', 'endDate', 'triggerCrontab']) {
      if (!hasValue(payload[field])) {
        fail(
          `${field} is required when triggerType=1.`,
          'REPEAT_SCHEDULE_REQUIRED',
          field,
          'Provide the complete repeated schedule inside the parent activity period.',
        );
      }
    }
  }
}

function validateExperiment(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  if (!isObject(value)) {
    fail(
      `${field} must be omitted or set to {"enableExp":false}.`,
      'ACTIVITY_EXPERIMENT_UNSUPPORTED',
      field,
      'A/B and horse-race experiments are not supported for activity tasks.',
    );
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === 'enableExp' && item === false) continue;
    if (hasValue(item)) {
      fail(
        `${field} must not enable or configure an experiment.`,
        'ACTIVITY_EXPERIMENT_UNSUPPORTED',
        field,
        'Remove experiment groups and use exactly one non-experiment content group.',
      );
    }
  }
}

function validateSingleContentGroup(value: unknown, field: string): void {
  if (Array.isArray(value) && value.length !== 1) {
    fail(
      `${field} must contain exactly one non-experiment content group.`,
      'ACTIVITY_CONTENT_GROUPS_UNSUPPORTED',
      field,
      'Keep language variants inside the single group contentList.',
    );
  }
}

function requireObject(value: unknown, field = 'payload'): Record<string, unknown> {
  if (!isObject(value)) {
    fail(
      `${field} must be a JSON object.`,
      'ACTIVITY_PAYLOAD_INVALID',
      field,
      'Pass a native camelCase activity task or topic payload.',
    );
  }
  return value;
}

function containsAnyKey(value: unknown, keys: Set<string>): boolean {
  if (Array.isArray(value)) return value.some((item) => containsAnyKey(item, keys));
  if (!isObject(value)) return false;
  return Object.entries(value).some(
    ([key, item]) => (keys.has(key) && hasValue(item)) || containsAnyKey(item, keys),
  );
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(message: string, code: string, field: string, hint: string): never {
  throw new CliValidationError(message, {
    code,
    hint,
    location: { field },
  });
}
