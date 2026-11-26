import { CapabilityGatewayError } from '../capability-api.js';
import { NETWORK_BUDGET_MS } from './contracts.js';

interface ReplayDates {
  start: string;
  end: string;
  timezone: string;
}

export function replayReportDates(receipt: ReplayDates) {
  const zone = /^([+-])(\d{2}):(\d{2})$/.exec(receipt.timezone);
  if (!zone || Number(zone[2]) > 14 || Number(zone[3]) > 59
      || (Number(zone[2]) === 14 && Number(zone[3]) !== 0)) throw new Error('The replay reporting timezone is invalid.');
  const offset = (Number(zone[2]) * 60 + Number(zone[3])) * 60_000 * (zone[1] === '-' ? -1 : 1);
  const start = Date.parse(receipt.start);
  const end = Date.parse(receipt.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('The replay interval is invalid.');
  return { start_time: new Date(start + offset).toISOString().slice(0, 10),
    end_time: new Date(end + offset).toISOString().slice(0, 10) };
}

function isReportPending(error: unknown, projectId: number): boolean {
  if (!(error instanceof CapabilityGatewayError) || error.type === 'validation'
      || error.httpStatus === 401 || error.httpStatus === 403) return false;
  const view = `hive.hermes.v_atlas_experiment_exposure_${projectId}`.replaceAll('.', '\\.');
  return new RegExp("\\bTable\\s+['\"`]?" + view + "['\"`]?\\s+does not exist\\b", 'i').test(error.message)
    || /^(atlas\.service\.error\.report\.data_unavailable|Report data is temporarily unavailable\.|报告数据暂不可用|レポートデータを一時的に利用できません|리포트 데이터를 일시적으로 사용할 수 없습니다)/.test(error.message);
}

/** Bound each tool invocation while preserving normal readiness as a resumable result. */
export async function waitForExperimentSampleSize(
  query: (input: Record<string, unknown>, signal: AbortSignal) => Promise<any>,
  input: { project_id: number; exp_id: string; start_time: string; end_time: string },
  budgetMs = 25_000,
  delayMs = 5_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + budgetMs;
  let attempts = 0;
  do {
    attempts++;
    try {
      const response = await query({ ...input, force_refresh: true },
        AbortSignal.timeout(Math.max(1, Math.min(NETWORK_BUDGET_MS, deadline - Date.now()))));
      if (!response || typeof response.report !== 'object' || response.report === null) {
        throw new Error('The sample-size query returned no report.');
      }
      if (response.report.has_data !== false) {
        return { phase: 'complete', next_action: 'verify_experiment_results', report_dates: {
          start_time: input.start_time, end_time: input.end_time,
        }, sample_size_report: response.report, report_query_attempts: attempts };
      }
    } catch (error) {
      if (!isReportPending(error, input.project_id)
          && !(error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name))) throw error;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, remaining)));
  } while (Date.now() < deadline);
  return { phase: 'pending', next_action: 'wait_experiment_report', poll_after_ms: delayMs,
    report_dates: { start_time: input.start_time, end_time: input.end_time }, report_query_attempts: attempts };
}
