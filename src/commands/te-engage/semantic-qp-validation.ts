import { CliValidationError } from '../../core/errors.js';

const OPERATORS = new Set([
  'eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'exists', 'not_exists', 'between',
  'contains', 'not_contains', 'is_true', 'is_false', 'regex', 'not_regex',
  'relative_current_time', 'relative_event_time', 'array_contains', 'in_cluster',
  'not_in_cluster',
]);
const AUDIENCE_AGGREGATIONS = new Set([
  'count', 'active_days', 'sum', 'avg', 'max', 'min', 'distinct_count',
]);
const METRIC_AGGREGATIONS = new Set([
  'total_count', 'user_count', 'per_user_count', 'sum', 'avg', 'avg_per_user',
  'max', 'min', 'distinct_count', 'median', 'percentile', 'variance', 'stddev',
]);

type JsonObject = Record<string, unknown>;

/** Validates one closed semantic audience definition without compiling it. */
export function validateSemanticAudienceDefinition(value: unknown, path: string): void {
  const definition = object(value, path);
  rejectUnknown(definition, ['type', 'conditions', 'include_filter', 'exclude_filter'], path);
  exactString(definition.type, 'condition', `${path}.type`);
  validateGroup(definition.conditions, `${path}.conditions`);
  optional(definition.include_filter, (item) => validateGroup(item, `${path}.include_filter`));
  optional(definition.exclude_filter, (item) => validateGroup(item, `${path}.exclude_filter`));
}

/** Validates one closed semantic trigger/completion event definition. */
export function validateSemanticEventDefinition(value: unknown, path: string): void {
  const event = object(value, path);
  rejectUnknown(event, [
    'type', 'event', 'operator', 'value', 'aggregation', 'property', 'time_range', 'filters',
  ], path);
  exactString(event.type, 'event', `${path}.type`);
  nonBlankString(event.event, `${path}.event`);
  optionalEnum(event.operator, OPERATORS, `${path}.operator`);
  optionalNumber(event.value, `${path}.value`);
  optionalEnum(event.aggregation, AUDIENCE_AGGREGATIONS, `${path}.aggregation`);
  optionalString(event.property, `${path}.property`);
  optional(event.time_range, (item) => validateTimeRange(item, `${path}.time_range`));
  optional(event.filters, (item) => validateFilterGroup(item, `${path}.filters`));
}

/** Validates one closed semantic event/formula metric definition. */
export function validateSemanticMetricDefinition(value: unknown, path: string): void {
  const metric = object(value, path);
  if (metric.type === 'event') {
    validateMetricEvent(metric, path, false);
    return;
  }
  if (metric.type === 'formula') {
    rejectUnknown(metric, ['type', 'expression', 'dependencies', 'format'], path);
    nonBlankString(metric.expression, `${path}.expression`);
    optionalString(metric.format, `${path}.format`);
    array(metric.dependencies, `${path}.dependencies`, 1)
      .forEach((dependency, index) => validateMetricEvent(
        object(dependency, `${path}.dependencies[${index}]`),
        `${path}.dependencies[${index}]`,
        true,
      ));
    return;
  }
  invalid(`${path}.type must be event or formula.`);
}

/** Validates semantic QP fields embedded in a native Engage request body. */
export function validateEmbeddedSemanticDefinitions(value: unknown, path: string): void {
  walk(value, path);
}

/** Recursively validates semantic definitions embedded in native DTO fields. */
function walk(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}.${key}`;
    if (item === undefined || item === null) continue;
    if (['definitionRequest', 'targetDefinitionRequest', 'topicDefinitionRequest'].includes(key)) {
      validateSemanticAudienceDefinition(item, itemPath);
    } else if (key === 'eventDefinition') {
      validateSemanticEventDefinition(item, itemPath);
    } else if (key === 'triggerDefinition') {
      validateTriggerDefinition(item, itemPath);
    } else if (key === 'config' && typeof item === 'string') {
      walkJsonString(item, itemPath);
    } else {
      walk(item, itemPath);
    }
  }
}

/** Validates a semantic trigger-definition envelope. */
function validateTriggerDefinition(value: unknown, path: string): void {
  const definition = object(value, path);
  rejectUnknown(definition, ['rules'], path);
  array(definition.rules, `${path}.rules`, 1).forEach((ruleValue, ruleIndex) => {
    const rulePath = `${path}.rules[${ruleIndex}]`;
    const rule = object(ruleValue, rulePath);
    array(rule.events, `${rulePath}.events`, 1).forEach((event, eventIndex) => {
      const eventPath = `${rulePath}.events[${eventIndex}]`;
      const candidate = object(event, eventPath);
      if ('eventDefinition' in candidate) {
        validateSemanticEventDefinition(candidate.eventDefinition, `${eventPath}.eventDefinition`);
      } else {
        validateSemanticEventDefinition(candidate, eventPath);
      }
    });
    optional(rule.blackList, (items) => array(items, `${rulePath}.blackList`)
      .forEach((event, index) => validateSemanticEventDefinition(
        event,
        `${rulePath}.blackList[${index}]`,
      )));
  });
}

/** Validates one recursive audience condition group. */
function validateGroup(value: unknown, path: string): void {
  const group = object(value, path);
  rejectUnknown(group, ['relation', 'items'], path);
  enumValue(group.relation, new Set(['and', 'or']), `${path}.relation`);
  array(group.items, `${path}.items`, 1)
    .forEach((item, index) => validateCondition(item, `${path}.items[${index}]`));
}

/** Validates one supported audience condition variant. */
function validateCondition(value: unknown, path: string): void {
  const condition = object(value, path);
  switch (condition.type) {
    case 'event':
      validateSemanticEventDefinition(condition, path);
      required(condition.time_range, `${path}.time_range`);
      return;
    case 'user':
    case 'tag':
    case 'cluster':
      validatePropertyCondition(condition, path);
      return;
    case 'compound':
      rejectUnknown(condition, ['type', 'group'], path);
      validateGroup(condition.group, `${path}.group`);
      return;
    case 'behavior_sequence':
      validateBehaviorSequence(condition, path);
      return;
    default:
      invalid(`${path}.type is unsupported.`);
  }
}

/** Validates one user, tag, or cluster property condition. */
function validatePropertyCondition(condition: JsonObject, path: string): void {
  const extended = condition.type === 'tag' || condition.type === 'cluster';
  rejectUnknown(condition, [
    'type', 'field', 'operator', 'values', 'time_relative', 'time_unit',
    ...(extended ? ['cluster_date_policy', 'specified_cluster_date'] : []),
  ], path);
  validateField(condition.field, `${path}.field`);
  if (condition.type === 'user') enumValue(condition.operator, OPERATORS, `${path}.operator`);
  else optionalEnum(condition.operator, OPERATORS, `${path}.operator`);
  optional(condition.values, (item) => array(item, `${path}.values`));
  optionalString(condition.time_relative, `${path}.time_relative`);
  optionalString(condition.time_unit, `${path}.time_unit`);
  optionalString(condition.cluster_date_policy, `${path}.cluster_date_policy`);
  optionalString(condition.specified_cluster_date, `${path}.specified_cluster_date`);
}

/** Validates one behavior-sequence condition. */
function validateBehaviorSequence(condition: JsonObject, path: string): void {
  rejectUnknown(condition, ['type', 'completed', 'steps', 'time_range', 'window'], path);
  if (typeof condition.completed !== 'boolean') invalid(`${path}.completed must be a boolean.`);
  array(condition.steps, `${path}.steps`, 1).forEach((stepValue, index) => {
    const stepPath = `${path}.steps[${index}]`;
    const step = object(stepValue, stepPath);
    rejectUnknown(step, ['event', 'completed', 'filters', 'relative_to_first', 'window'], stepPath);
    nonBlankString(step.event, `${stepPath}.event`);
    optionalBoolean(step.completed, `${stepPath}.completed`);
    optionalBoolean(step.relative_to_first, `${stepPath}.relative_to_first`);
    if (index === 1 && step.relative_to_first === true) {
      invalid(`${stepPath}.relative_to_first must be false or omitted for the second step.`);
    }
    optional(step.filters, (item) => validateFilterGroup(item, `${stepPath}.filters`));
    optional(step.window, (item) => validateWindow(item, `${stepPath}.window`));
  });
  required(condition.time_range, `${path}.time_range`);
  validateTimeRange(condition.time_range, `${path}.time_range`);
  optional(condition.window, (item) => validateWindow(item, `${path}.window`));
}

/** Validates one event-property filter group. */
function validateFilterGroup(value: unknown, path: string): void {
  const group = object(value, path);
  rejectUnknown(group, ['relation', 'items'], path);
  optionalEnum(group.relation, new Set(['and', 'or']), `${path}.relation`);
  array(group.items, `${path}.items`, 1).forEach((filterValue, index) => {
    const filterPath = `${path}.items[${index}]`;
    const filter = object(filterValue, filterPath);
    rejectUnknown(filter, ['field', 'operator', 'values'], filterPath);
    validateField(filter.field, `${filterPath}.field`);
    enumValue(filter.operator, OPERATORS, `${filterPath}.operator`);
    optional(filter.values, (item) => array(item, `${filterPath}.values`));
  });
}

/** Validates a technical-name string or typed field reference. */
function validateField(value: unknown, path: string): void {
  if (typeof value === 'string') {
    nonBlankString(value, path);
    return;
  }
  const field = object(value, path);
  rejectUnknown(field, ['name', 'type'], path);
  nonBlankString(field.name, `${path}.name`);
  optionalEnum(field.type, new Set([
    'event_property', 'user_property', 'tag', 'cluster',
  ]), `${path}.type`);
}

/** Validates one relative or custom time range. */
function validateTimeRange(value: unknown, path: string): void {
  const range = object(value, path);
  rejectUnknown(range, ['mode', 'unit', 'value', 'start_time', 'end_time'], path);
  if (range.mode === 'custom') {
    nonBlankString(range.start_time, `${path}.start_time`);
    nonBlankString(range.end_time, `${path}.end_time`);
    return;
  }
  enumValue(range.mode, new Set(['recent', 'previous']), `${path}.mode`);
  optional(range.unit, (unit) => exactString(unit, 'day', `${path}.unit`));
  positiveInteger(range.value, `${path}.value`);
}

/** Validates one positive duration window. */
function validateWindow(value: unknown, path: string): void {
  const window = object(value, path);
  rejectUnknown(window, ['value', 'unit'], path);
  positiveInteger(window.value, `${path}.value`);
  nonBlankString(window.unit, `${path}.unit`);
}

/** Validates one event metric or formula dependency. */
function validateMetricEvent(metric: JsonObject, path: string, dependency: boolean): void {
  rejectUnknown(metric, [
    'type', ...(dependency ? ['key'] : []), 'event', 'aggregation', 'property',
    'percentile', 'filters', 'display_name',
  ], path);
  exactString(metric.type, 'event', `${path}.type`);
  if (dependency) nonBlankString(metric.key, `${path}.key`);
  nonBlankString(metric.event, `${path}.event`);
  enumValue(metric.aggregation, METRIC_AGGREGATIONS, `${path}.aggregation`);
  if (!['total_count', 'user_count', 'per_user_count'].includes(String(metric.aggregation))) {
    nonBlankString(metric.property, `${path}.property`);
  }
  optionalString(metric.property, `${path}.property`);
  if (metric.aggregation === 'percentile') {
    optionalNumber(metric.percentile, `${path}.percentile`);
    if (typeof metric.percentile !== 'number' || metric.percentile <= 0 || metric.percentile > 100) {
      invalid(`${path}.percentile must be greater than 0 and at most 100.`);
    }
  } else if (metric.percentile !== undefined && metric.percentile !== null) {
    invalid(`${path}.percentile is only valid for percentile aggregation.`);
  }
  optionalString(metric.display_name, `${path}.display_name`);
  optional(metric.filters, (item) => validateFilterGroup(item, `${path}.filters`));
}

/** Parses and scans one JSON-encoded node config. */
function walkJsonString(value: string, path: string): void {
  try {
    walk(JSON.parse(value), path);
  } catch (error) {
    if (error instanceof SyntaxError) invalid(`${path} must contain valid JSON.`);
    throw error;
  }
}

/** Returns a JSON object or raises a validation error. */
function object(value: unknown, path: string): JsonObject {
  if (!isObject(value)) invalid(`${path} must be a JSON object.`);
  return value;
}

/** Returns whether a value is a non-array JSON object. */
function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Returns an array satisfying the required minimum length. */
function array(value: unknown, path: string, minLength = 0): unknown[] {
  if (!Array.isArray(value) || value.length < minLength) {
    invalid(`${path} must be an array with at least ${minLength} item(s).`);
  }
  return value;
}

/** Rejects the first unsupported object field. */
function rejectUnknown(value: JsonObject, allowed: string[], path: string): void {
  const supported = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !supported.has(key));
  if (unknown) invalid(`Unsupported field ${path}.${unknown}.`);
}

/** Applies a validator when an optional value is present. */
function optional(value: unknown, validate: (item: unknown) => void): void {
  if (value !== undefined && value !== null) validate(value);
}

/** Validates that a required semantic field is present. */
function required(value: unknown, path: string): void {
  if (value === undefined || value === null) invalid(`${path} is required.`);
}

/** Validates a required non-blank string. */
function nonBlankString(value: unknown, path: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    invalid(`${path} must be a non-blank string.`);
  }
}

/** Validates an optional non-blank string. */
function optionalString(value: unknown, path: string): void {
  optional(value, (item) => nonBlankString(item, path));
}

/** Validates one exact string literal. */
function exactString(value: unknown, expected: string, path: string): void {
  if (value !== expected) invalid(`${path} must be ${expected}.`);
}

/** Validates one required string enum value. */
function enumValue(value: unknown, allowed: Set<string>, path: string): void {
  if (typeof value !== 'string' || !allowed.has(value)) {
    invalid(`${path} must be one of: ${[...allowed].join(', ')}.`);
  }
}

/** Validates one optional string enum value. */
function optionalEnum(value: unknown, allowed: Set<string>, path: string): void {
  optional(value, (item) => enumValue(item, allowed, path));
}

/** Validates one optional finite number. */
function optionalNumber(value: unknown, path: string): void {
  optional(value, (item) => {
    if (typeof item !== 'number' || !Number.isFinite(item)) invalid(`${path} must be a number.`);
  });
}

/** Validates one required positive integer. */
function positiveInteger(value: unknown, path: string): void {
  if (!Number.isInteger(value) || (value as number) < 1) {
    invalid(`${path} must be a positive integer.`);
  }
}

/** Validates one optional boolean. */
function optionalBoolean(value: unknown, path: string): void {
  optional(value, (item) => {
    if (typeof item !== 'boolean') invalid(`${path} must be a boolean.`);
  });
}

/** Raises a structured CLI validation error. */
function invalid(message: string): never {
  throw new CliValidationError(message);
}
