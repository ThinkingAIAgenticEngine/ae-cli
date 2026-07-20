import { printError } from '../../../../framework/output.js';

export function validateMetricQpFlag(metricQp: string): void {
  if (metricQp.trim() !== '{}') {
    return;
  }
  printError(
    'validation',
    '--metric-qp cannot be an empty JSON object.',
    'Pass a complete metric QP expression instead of {}.',
  );
  process.exit(1);
}
