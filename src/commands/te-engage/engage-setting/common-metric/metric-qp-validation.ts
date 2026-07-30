import { printError } from '../../../../framework/output.js';

const VALID_WINDOW_TIME_UNITS = new Set(['minute', 'hour', 'day']);

/**
 * Validate --metric-definition is a non-empty semantic metric object.
 * 校验 --metric-definition 必须是非空语义化指标对象。
 */
export function validateMetricDefinitionFlag(definition: unknown): void {
  if (definition === null || typeof definition !== 'object' || Array.isArray(definition)) {
    printError(
      'validation',
      '--metric-definition must be a JSON object.',
      'Pass a semantic event or formula metric definition.',
    );
    process.exit(1);
  }
  const type = (definition as Record<string, unknown>).type;
  if (type !== 'event' && type !== 'formula') {
    printError(
      'validation',
      '--metric-definition.type must be event or formula.',
      'Do not pass legacy type=0/1 metric_qp.',
    );
    process.exit(1);
  }
}

/**
 * Validate --metric-window-time-unit is minute/hour/day (lowercase).
 * 校验窗口时间单位必须是 minute/hour/day（小写）。
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
 * Validate create --metric-type is PRESET (1).
 * 校验 create 的 --metric-type 必须为 1（PRESET）。
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
