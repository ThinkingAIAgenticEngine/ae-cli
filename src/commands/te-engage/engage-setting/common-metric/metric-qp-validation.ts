import { printError } from '../../../../framework/output.js';

const VALID_WINDOW_TIME_UNITS = new Set(['minute', 'hour', 'day']);

/**
 * Validate --metric-qp is a non-empty JSON object string.
 * 校验 --metric-qp 必须是非空 JSON 对象字符串。
 */
export function validateMetricQpFlag(metricQp: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(metricQp);
  } catch {
    printError(
      'validation',
      '--metric-qp must be a valid JSON object string.',
      'Discover events via analysis-meta event list, then assemble a type=0/1 metric QP object.',
    );
    process.exit(1);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    printError(
      'validation',
      '--metric-qp must be a JSON object string.',
      'Do not pass placeholders like "event"; pass a complete metric QP object.',
    );
    process.exit(1);
  }
  if (Object.keys(parsed as Record<string, unknown>).length === 0) {
    printError(
      'validation',
      '--metric-qp cannot be an empty JSON object.',
      'Pass a complete metric QP expression instead of {}.',
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
