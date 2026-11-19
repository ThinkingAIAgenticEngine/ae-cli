import { printError } from '../../../../framework/output.js';
import { validateSemanticMetricDefinition } from '../../semantic-qp-validation.js';

const VALID_WINDOW_TIME_UNITS = new Set(['minute', 'hour', 'day', 'week', 'month']);

/**
 * Validates --metric-definition as a closed semantic metric object.
 */
export function validateMetricDefinitionFlag(definition: unknown): void {
  validateSemanticMetricDefinition(definition, '--metric-definition');
}

/** Validates the public rolling/natural window contract without guessing saved update state. */
export function validateMetricWindowFlags(
  unit: string,
  num: number,
  cycle: unknown,
  update = false,
): void {
  if (!VALID_WINDOW_TIME_UNITS.has(unit)) {
    invalidWindow('--metric-window-time-unit must be one of: minute, hour, day, week, month.');
  }
  if (!Number.isInteger(num) || num < 1) {
    invalidWindow('--metric-window-num must be a positive integer.');
  }
  if (cycle === undefined && update) {
    if ((unit === 'week' || unit === 'month') && num !== 1) {
      invalidWindow('Natural week/month windows require --metric-window-num 1.');
    }
    return; // The server merges an omitted definition with the saved metric.
  }
  if (cycle === undefined || cycle === null) {
    if (unit === 'week' || unit === 'month') {
      invalidWindow('Week/month windows require a non-null --time-cycle-def.');
    }
    return;
  }
  if (typeof cycle !== 'object' || Array.isArray(cycle)) {
    invalidWindow('--time-cycle-def must be an object or null.');
  }
  const def = cycle as Record<string, unknown>;
  if (Object.keys(def).some((key) => key !== 'start_day' && key !== 'start_time')) {
    invalidWindow('--time-cycle-def accepts only start_day and start_time.');
  }
  if (num !== 1 || !['day', 'week', 'month'].includes(unit)) {
    invalidWindow('Natural windows require --metric-window-num 1 and unit day, week, or month.');
  }
  if (unit === 'day' && 'start_day' in def) {
    invalidWindow('Natural day windows must omit start_day.');
  }
  if (unit === 'week' || unit === 'month') {
    const max = unit === 'week' ? 7 : 28;
    if (!Number.isInteger(def.start_day) || (def.start_day as number) < 1 || (def.start_day as number) > max) {
      invalidWindow(`Natural ${unit} start_day must be an integer from 1 to ${max}.`);
    }
  }
  if (unit === 'month') {
    if ('start_time' in def && def.start_time !== '00:00') {
      invalidWindow('Natural month start_time must be omitted or 00:00.');
    }
  } else if (typeof def.start_time !== 'string' || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(def.start_time)) {
    invalidWindow('Natural day/week start_time must use HH:mm (00:00-23:59).');
  }
}

function invalidWindow(message: string): never {
  printError('validation', message, 'Omit --time-cycle-def on update to preserve it; pass null to use a rolling window.');
  process.exit(1);
}

/**
 * Validates create --metric-type as PRESET (1).
 */
export function validatePresetMetricTypeFlag(metricType: number): void {
  if (metricType === 1) {
    return;
  }
  printError(
    'validation',
    '--metric-type must be 1 (PRESET) for common-metric create.',
    'Common metrics on the analysis setting page always use metric_type=1.',
  );
  process.exit(1);
}
