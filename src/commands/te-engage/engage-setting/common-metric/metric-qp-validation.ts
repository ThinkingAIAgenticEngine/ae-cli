import { printError } from '../../../../framework/output.js';
import { validateSemanticMetricDefinition } from '../../semantic-qp-validation.js';

const VALID_WINDOW_TIME_UNITS = new Set(['minute', 'hour', 'day']);

/**
 * Validates --metric-definition as a closed semantic metric object.
 */
export function validateMetricDefinitionFlag(definition: unknown): void {
  validateSemanticMetricDefinition(definition, '--metric-definition');
}

/**
 * Validates --metric-window-time-unit as minute/hour/day (lowercase).
 */
export function validateMetricWindowTimeUnitFlag(unit: string): void {
  if (VALID_WINDOW_TIME_UNITS.has(unit)) {
    return;
  }
  printError(
    'validation',
    '--metric-window-time-unit must be one of: minute, hour, day.',
    'Use lowercase values matching the Engage console / TimeUnitEnum.',
  );
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
