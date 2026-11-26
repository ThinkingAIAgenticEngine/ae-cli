/** Public display intent validation; native page/QP encodings belong to the server. */
export const displayFields = ['show_values', 'date_annotations', 'sort', 'retention', 'funnel', 'pie', 'interval'] as const;
const ordinaryModels = ['event', 'retention', 'funnel', 'distribution', 'interval', 'prop_analysis'];

export function validateDisplayPresentation(value: Record<string, unknown>, model: string): void {
  const supplied = displayFields.filter((field) => Object.hasOwn(value, field));
  if (supplied.length === 0) return;
  if (model && !ordinaryModels.includes(model)) fail('is supported only for ordinary analysis models.');
  if (Object.hasOwn(value, 'show_values')) {
    boolean(value.show_values, 'show_values');
    if (model === 'distribution') fail('.show_values is not supported for distribution.');
  }
  if (Object.hasOwn(value, 'date_annotations')) {
    const annotations = object(value.date_annotations, 'date_annotations', ['tag_keys', 'include_untagged']);
    if (Object.hasOwn(annotations, 'tag_keys')) {
      if (!Array.isArray(annotations.tag_keys) || annotations.tag_keys.some((key) => typeof key !== 'string' || !key.trim() || key === '__UNGROUPED__')) {
        fail('.date_annotations.tag_keys must be an array of nonblank category keys; use include_untagged for uncategorized annotations.');
      }
    }
    if (Object.hasOwn(annotations, 'include_untagged')) boolean(annotations.include_untagged, 'date_annotations.include_untagged');
  }
  if (Object.hasOwn(value, 'sort')) {
    onlyModels(model, ['event', 'interval', 'prop_analysis'], 'sort');
    const sort = object(value.sort, 'sort', ['by', 'direction']);
    enumeration(sort.by, ['value', 'group_name'], 'sort.by');
    enumeration(sort.direction, ['asc', 'desc'], 'sort.direction');
  }
  if (Object.hasOwn(value, 'retention')) {
    onlyModels(model, ['retention'], 'retention');
    const retention = object(value.retention, 'retention', ['key_periods', 'trend_value', 'cohort_display_grain', 'table_rows']);
    if (Object.hasOwn(retention, 'key_periods')) {
      const periods = object(retention.key_periods, 'retention.key_periods', ['mode', 'day', 'week', 'month']);
      if (Object.hasOwn(periods, 'mode')) enumeration(periods.mode, ['all', 'selected'], 'retention.key_periods.mode');
      for (const unit of ['day', 'week', 'month']) {
        if (!Object.hasOwn(periods, unit)) continue;
        const indexes = periods[unit];
        if (!Array.isArray(indexes) || indexes.length === 0 || indexes.some((index) => typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 2147483646)) {
          fail(`.retention.key_periods.${unit} must be a non-empty array of elapsed integer periods, 0..2147483646 (0=current, 1=next).`);
        }
      }
    }
    if (Object.hasOwn(retention, 'trend_value')) enumeration(retention.trend_value, ['rate', 'users'], 'retention.trend_value');
    if (Object.hasOwn(retention, 'cohort_display_grain')) enumeration(retention.cohort_display_grain, ['day', 'week', 'month'], 'retention.cohort_display_grain');
    if (Object.hasOwn(retention, 'table_rows')) enumeration(retention.table_rows, ['date', 'group'], 'retention.table_rows');
  }
  if (Object.hasOwn(value, 'funnel')) {
    onlyModels(model, ['funnel'], 'funnel');
    const funnel = object(value.funnel, 'funnel', ['result_view', 'table_detail']);
    if (Object.hasOwn(funnel, 'result_view')) enumeration(funnel.result_view, ['conversion', 'drop_off'], 'funnel.result_view');
    if (Object.hasOwn(funnel, 'table_detail')) enumeration(funnel.table_detail, ['summary', 'steps'], 'funnel.table_detail');
  }
  if (Object.hasOwn(value, 'pie')) {
    onlyModels(model, ['event', 'prop_analysis'], 'pie');
    const pie = object(value.pie, 'pie', ['show_percentage', 'group_limit', 'max_charts']);
    if (Object.hasOwn(pie, 'show_percentage')) boolean(pie.show_percentage, 'pie.show_percentage');
    if (Object.hasOwn(pie, 'group_limit')) enumeration(pie.group_limit, [10, 15, 20, 30, 50], 'pie.group_limit');
    if (Object.hasOwn(pie, 'max_charts')) {
      onlyModels(model, ['event'], 'pie.max_charts');
      enumeration(pie.max_charts, [1, 2, 4, 6], 'pie.max_charts');
    }
  }
  if (Object.hasOwn(value, 'interval')) {
    onlyModels(model, ['interval'], 'interval');
    const interval = object(value.interval, 'interval', ['histogram_value']);
    enumeration(interval.histogram_value, ['users', 'occurrences'], 'interval.histogram_value');
  }
}

function object(value: unknown, path: string, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0
      || Object.keys(value).some((key) => !keys.includes(key))) {
    fail(`.${path} must be a non-empty object containing only ${keys.join(', ')}. Omit fields to preserve saved values; null is not a reset.`);
  }
  return value as Record<string, unknown>;
}

function boolean(value: unknown, path: string): void {
  if (typeof value !== 'boolean') fail(`.${path} must be a boolean.`);
}

function enumeration(value: unknown, choices: readonly unknown[], path: string): void {
  if (!choices.includes(value)) fail(`.${path} must be one of ${choices.join(', ')}.`);
}

function onlyModels(model: string, models: string[], path: string): void {
  if (model && !models.includes(model)) fail(`.${path} supports only ${models.join(', ')} reports.`);
}

function fail(message: string): never {
  throw new Error(`--presentation${message.startsWith('.') ? '' : ' '}${message}`);
}
