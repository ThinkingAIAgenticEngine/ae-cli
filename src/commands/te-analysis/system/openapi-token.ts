import { link, lstat, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { CliApiError, CliValidationError } from '../../../core/errors.js';
import { logger } from '../../../core/logger.js';
import type { RuntimeContext } from '../../../framework/types.js';
import { createAnalysisCapabilityCommand } from '../capability-shared.js';

const MAX_BATCH_MEMBERS = 200;
const ZONED_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function batchInput(ctx: RuntimeContext) {
  const companyId = ctx.num('company-id');
  if (!Number.isInteger(companyId) || companyId < 1 || companyId > 2147483647) {
    throw new CliValidationError('--company-id must be a positive company ID.');
  }
  const openIds: unknown = ctx.json('open-ids');
  if (!Array.isArray(openIds) || openIds.length === 0 || openIds.length > MAX_BATCH_MEMBERS
      || !openIds.every((id): id is string => typeof id === 'string' && id.trim().length > 0)) {
    throw new CliValidationError('--open-ids must be a JSON array of 1 to 200 nonblank member open IDs.');
  }
  const expiry = ctx.str('expires-at');
  if (!ZONED_TIMESTAMP.test(expiry) || !Number.isFinite(Date.parse(expiry))
      || !new Date(`${expiry.slice(0, 10)}T00:00:00Z`).toISOString().startsWith(expiry.slice(0, 10))) {
    throw new CliValidationError('--expires-at must be an ISO-8601 timestamp with an explicit timezone.');
  }
  return { company_id: companyId, open_ids: [...new Set(openIds.map(id => id.trim()))], expires_at: expiry };
}

function responseRecord(result: unknown): Record<string, unknown> {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) throw invalidTokenResponse();
  return result as Record<string, unknown>;
}

function invalidTokenResponse() {
  return new CliApiError('Invalid OpenAPI token response from the server.', { code: 'INVALID_OPENAPI_TOKEN_RESPONSE' });
}

function batchSummary(result: unknown) {
  const { items, generated_count, skipped_count, failed_count } = responseRecord(result);
  if (!Array.isArray(items) || ![generated_count, skipped_count, failed_count].every(
    count => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0,
  )) throw invalidTokenResponse();
  const summaries = items.map(value => {
    const { open_id, status, expires_at, code } = responseRecord(value);
    if (typeof open_id !== 'string' || (status !== 'generated' && status !== 'skipped' && status !== 'failed')) {
      throw invalidTokenResponse();
    }
    return {
      open_id,
      status,
      ...(typeof expires_at === 'string' && ZONED_TIMESTAMP.test(expires_at) ? { expires_at } : {}),
      ...(typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(code) ? { code } : {}),
    };
  });
  return { items: summaries, generated_count, skipped_count, failed_count };
}

function outputError(error: unknown): CliValidationError {
  if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
    return new CliValidationError('--output already exists. Choose a new file.', { code: 'OUTPUT_ALREADY_EXISTS' });
  }
  return new CliValidationError('Cannot write the OpenAPI token to --output.', { code: 'OPENAPI_TOKEN_OUTPUT_FAILED' });
}

async function requireNewOutput(file: string): Promise<void> {
  try {
    await lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw outputError(error);
  }
  throw outputError({ code: 'EEXIST' });
}

async function writeToken(file: string, token: string): Promise<void> {
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(dirname(file), '.ae-openapi-token-'));
    const temporary = join(directory, 'token');
    await writeFile(temporary, `${token}\n`, { mode: 0o600, flag: 'wx' });
    await link(temporary, file);
  } catch (error) {
    throw outputError(error);
  } finally {
    if (directory) {
      await rm(directory, { recursive: true, force: true }).catch(() => {
        logger.warn('Could not remove the private OpenAPI token staging directory.');
      });
    }
  }
}

export const systemOpenApiTokenCommands = [
  createAnalysisCapabilityCommand({
    resource: 'system openapi-token',
    command: 'batch-generate',
    capabilityId: 'system.openapi_token.batch_generate',
    description: 'Generate OpenAPI tokens for selected company members and report per-member results.',
    helpText: 'Discover member open IDs with system member list. Use --dry-run to review the batch and --yes for explicit non-interactive confirmation.',
    flags: [
      { name: 'company-id', type: 'number', required: true, min: 1, max: 2147483647, desc: 'Company ID.' },
      { name: 'open-ids', type: 'json', required: true, desc: 'JSON array of 1 to 200 company member open IDs.' },
      { name: 'expires-at', type: 'string', required: true, desc: 'Expiration timestamp with an explicit ISO-8601 timezone.' },
    ],
    risk: 'high-risk-write',
    buildInput: batchInput,
    prepareExecuteInput: (_ctx, input) => ({ ...input, yes: true }),
    postProcess: batchSummary,
  }),
  createAnalysisCapabilityCommand({
    resource: 'system openapi-token',
    command: 'get',
    capabilityId: 'system.openapi_token.get',
    description: 'Get personal OpenAPI token status and expiration for the current account.',
    helpText: 'Supply --output to save an active token to a new private local file. The output envelope contains status and file metadata.',
    flags: [
      { name: 'output', type: 'string', sensitive: true, desc: 'Save an active token to this new private local file.' },
    ],
    risk: 'read',
    buildInput: ctx => {
      const file = ctx.str('output');
      if ((ctx.has?.('output') || file) && !file.trim()) {
        throw new CliValidationError('--output must be a nonblank local file path.');
      }
      return {};
    },
    prepareExecuteInput: async (ctx, input) => {
      const file = ctx.str('output');
      if (!file) return input;
      await requireNewOutput(resolve(file));
      return { ...input, reveal: true };
    },
    postProcess: async (result, input, ctx) => {
      const { status, expires_at, token } = responseRecord(result);
      if (status !== 'active' && status !== 'expired' && status !== 'not_generated' && status !== 'disabled') {
        throw invalidTokenResponse();
      }
      const summary = {
        status,
        ...(typeof expires_at === 'string' && ZONED_TIMESTAMP.test(expires_at) ? { expires_at } : {}),
      };
      if (input.reveal !== true || status !== 'active') return summary;
      if (typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) throw invalidTokenResponse();
      const outputFile = resolve(ctx.str('output'));
      await writeToken(outputFile, token);
      return { ...summary, output_file: outputFile };
    },
  }),
];
