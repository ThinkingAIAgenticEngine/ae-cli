import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { requestCapabilityGatewayWithEnvelope, buildCapabilityGatewayUrl, CapabilityGatewayError } from '../../core/capability-api.js';
import { resolveGatewayDomain } from '../../core/capability-routing.js';
import { parseJsonRequest } from '../../core/json-utils.js';
import { CliValidationError, PermissionError } from '../../core/errors.js';
import { SecureStoreAuthError } from '../../core/secure-store.js';

const CAPABILITY = 'community.content.post_detail';
const MAX_ITEMS = 20;
const INT64_MAX = 9223372036854775807n;
interface Locator { channel_id: string; uuid: string; resource_type: 0 | 1 }

function invalid(message: string): never {
  throw new CliValidationError(message, { hint: 'Use --input @file.json with {"items":[{"channel_id":"<ID>","uuid":"<UUID>","resource_type":0}]}.' });
}
function record(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function int64(value: unknown): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) invalid('Evidence IDs must be exact integers; use quoted int64 IDs.');
  if (!['string', 'number', 'bigint'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))) invalid('Evidence channel_id must be a positive int64.');
  if (BigInt(String(value)) > INT64_MAX) invalid('Evidence channel_id exceeds signed int64.');
  return String(value);
}
function prepare(ctx: RuntimeContext) {
  let input: unknown;
  try {
    const raw = ctx.str('input').trim();
    input = parseJsonRequest(raw === '-' ? readFileSync(0, 'utf8') : raw.startsWith('@') ? readFileSync(raw.slice(1), 'utf8') : raw);
  } catch {
    invalid('Cannot read evidence input as JSON.');
  }
  if (!record(input) || Object.keys(input).some(k => k !== 'items') || !Array.isArray(input.items)
      || input.items.length < 1 || input.items.length > MAX_ITEMS) invalid('Evidence input must contain only items, with 1 to 20 entries.');
  const locators: Locator[] = input.items.map((value: unknown) => {
    if (!record(value) || Object.keys(value).some(k => !['channel_id', 'uuid', 'resource_type'].includes(k))) invalid('Each evidence item must contain only channel_id, uuid, and resource_type.');
    const channelId = int64(value.channel_id);
    if (typeof value.uuid !== 'string' || !value.uuid.trim() || value.uuid.length > 512 || /[\u0000-\u001f\u007f]/.test(value.uuid)) invalid('Evidence uuid must be a non-empty opaque ID of at most 512 characters without control characters.');
    if (value.resource_type !== 0 && value.resource_type !== 1) invalid('Evidence resource_type must be 0 (post) or 1 (video).');
    return { channel_id: channelId, uuid: value.uuid, resource_type: value.resource_type };
  });
  const spaceId = ctx.int64('space-id');
  if (spaceId < 1n || spaceId > INT64_MAX) invalid('Evidence space-id must be a positive int64.');
  const maxChars = ctx.optionalNum('max-chars') ?? 100000;
  if (!Number.isInteger(maxChars) || maxChars < 1 || maxChars > 1000000) invalid('--max-chars must be an integer between 1 and 1000000.');
  const unique = [...new Map(locators.map(item => [JSON.stringify(item), item])).values()];
  return { spaceId, requested: locators.length, locators: unique, maxChars };
}
function request(spaceId: bigint, item: Locator) {
  return { game_id: spaceId, channel_id: BigInt(item.channel_id), uuid: item.uuid, resource_type: item.resource_type,
    reply_pager_header: { page_num: 1, page_size: 1 }, danmu_pager_header: { page_num: 1, page_size: 1 } };
}
function identity(host: string, spaceId: bigint, item: Locator): string {
  return `community:${createHash('sha256').update(JSON.stringify([host.replace(/\/+$/, ''), String(spaceId), item.channel_id, item.resource_type, item.uuid])).digest('hex')}`;
}

function field(data: Record<string, any>, snake: string, camel = snake): unknown {
  return data[snake] ?? data[camel];
}
function matches(data: unknown, item: Locator): data is Record<string, any> {
  if (!record(data)) return false;
  const type = field(data, 'resource_type', 'resourceType');
  return String(field(data, 'channel_id', 'channelId')) === item.channel_id && data.uuid === item.uuid
    && (type === item.resource_type || type === (item.resource_type === 0 ? 'POST' : 'VIDEO'));
}
function evidenceText(data: Record<string, any>, remaining: number) {
  const text: Record<string, unknown> = {};
  const textFields: Record<string, unknown> = {};
  let used = 0;
  let truncated = false;
  for (const name of ['title', 'content', 'description', 'subtitle']) {
    const value = data[name];
    const parts = typeof value === 'string' ? [value] : Array.isArray(value) && value.every(v => typeof v === 'string') ? value : null;
    if (parts === null) {
      text[name] = null;
      textFields[name] = { status: value == null ? 'missing' : 'unsupported_format' };
      continue;
    }
    let original = 0;
    let returned = 0;
    const clipped: string[] = [];
    for (const part of parts) {
      const chars = Array.from(part);
      original += chars.length;
      const kept = chars.slice(0, Math.max(0, remaining - used));
      returned += kept.length;
      used += kept.length;
      if (kept.length || chars.length === 0) clipped.push(kept.join(''));
    }
    text[name] = typeof value === 'string' ? clipped[0] ?? '' : clipped;
    const cut = returned < original;
    truncated ||= cut;
    textFields[name] = { status: cut ? 'truncated' : 'available', original_chars: original, returned_chars: returned };
  }
  return { text, textFields, used, truncated };
}
function safeSource(data: Record<string, any>): string | null {
  const value = field(data, 'red_note_url', 'redNoteUrl');
  if (typeof value !== 'string' || value.length > 4096) return null;
  try { return ['https:', 'http:'].includes(new URL(value).protocol) ? value : null; } catch { return null; }
}
function safeError(error: unknown) {
  const code = (value: unknown, fallback: string) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : fallback;
  if (error instanceof SecureStoreAuthError) return { type: 'auth', code: 'AUTH_REQUIRED', message: 'Authentication is required to read evidence.' };
  if (error instanceof PermissionError) return { type: 'permission', code: code(error.code, 'PERMISSION_DENIED'), message: 'Access to this evidence was denied.' };
  if (error instanceof CapabilityGatewayError) {
    const type = error.httpStatus === 401 ? 'auth' : error.httpStatus === 403 ? 'permission' : 'api';
    return { type, code: code(error.code, 'CAPABILITY_FAILED'), message: 'Evidence could not be read from the capability service.' };
  }
  return { type: 'api', code: 'REQUEST_FAILED', message: 'Evidence request failed.' };
}

/** Bounded evidence collection using the existing authorized detail capability. */
export const communityEvidenceFetch: Command = {
  service: 'community', resource: 'evidence', command: 'fetch',
  description: 'Read up to 20 unique post/video sources with verified IDs, complete text, and explicit partial-result status.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID from spaces list.' },
    { name: 'input', type: 'string', required: true, sensitive: true, desc: 'JSON object, @file.json, or - for stdin; items contain channel_id, uuid, resource_type.' },
    { name: 'max-chars', type: 'number', min: 1, max: 1000000, desc: 'Combined returned text budget in Unicode code points (default 100000).' },
  ],
  risk: 'read',
  dryRun: ctx => {
    const plan = prepare(ctx);
    return { method: 'POST', url: buildCapabilityGatewayUrl(ctx.host(), resolveGatewayDomain('community', 'community'), `capabilities/${CAPABILITY}/execute`),
      body: { preview_only: true, requested: plan.requested, unique: plan.locators.length, max_chars: plan.maxChars,
        inputs: plan.locators.map(item => ({ ...request(plan.spaceId, item), game_id: String(plan.spaceId), channel_id: item.channel_id })) } };
  },
  execute: async ctx => {
    const plan = prepare(ctx);
    const gatewayDomain = resolveGatewayDomain('community', 'community');
    const items: Record<string, any>[] = [];
    let returnedChars = 0;
    let accessStopped = false;
    for (const item of plan.locators) {
      const base = { evidence_id: identity(ctx.host(), plan.spaceId, item), locator: { space_id: String(plan.spaceId), ...item } };
      if (returnedChars >= plan.maxChars || accessStopped) {
        items.push({ ...base, status: 'not_fetched', reason: accessStopped ? 'access_denied' : 'text_budget_exhausted' });
        continue;
      }
      try {
        const response = await requestCapabilityGatewayWithEnvelope(ctx.host(), gatewayDomain, `capabilities/${CAPABILITY}/execute`, 'POST', { input: request(plan.spaceId, item) });
        if (response.data == null) {
          items.push({ ...base, status: 'missing', reason: 'no_detail_returned' });
          continue;
        }
        if (!matches(response.data, item)) {
          items.push({ ...base, status: 'invalid_response', reason: 'evidence_identity_mismatch' });
          continue;
        }
        const excerpt = evidenceText(response.data, plan.maxChars - returnedChars);
        returnedChars += excerpt.used;
        items.push({ ...base, status: 'ok', text: excerpt.text,
          author: { user_id: field(response.data, 'user_id', 'userId') ?? null, user_name: field(response.data, 'user_name', 'userName') ?? null },
          publish_time: field(response.data, 'publish_time', 'publishTime') ?? null,
          last_update_time: field(response.data, 'last_update_time', 'lastUpdateTime') ?? null,
          source_url: safeSource(response.data),
          quality: { identity_verified: true, text_truncated: excerpt.truncated, source_completeness: 'unknown', text_fields: excerpt.textFields,
            related_comments_included: false, related_media_included: false },
          ...(response.meta ? { meta: response.meta } : {}) });
      } catch (error) {
        const failure = safeError(error);
        accessStopped = failure.type === 'auth' || failure.type === 'permission';
        items.push({ ...base, status: 'error', error: failure });
      }
    }
    return { contract_version: 'community-evidence-v1', capability_id: CAPABILITY, host: ctx.host(),
      space_id: String(plan.spaceId), requested: plan.requested, unique: items.length, items,
      quality: { dataset_complete: false, batch_complete: items.every(item => item.status === 'ok' && !item.quality.text_truncated),
        returned_chars: returnedChars, max_chars: plan.maxChars, snapshot: false } };
  },
};

/** Compatibility entry for existing community evidence workflows. */
export const communityEvidenceFetchAlias: Command = {
  ...communityEvidenceFetch,
  resource: undefined,
  command: '+fetch-evidence',
  description: 'Compatibility alias for community evidence fetch.',
};
