import type { RuntimeContext } from '../../../framework/types.js';

/** Reads an integer flag without accepting omitted values as zero. */
export function integerFlag(ctx: RuntimeContext, name: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const value = ctx.num(name);
  if (ctx.str(name).trim() === '' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`Flag --${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

/** Builds the project and optional bucket filter shared by domain requests. */
export function baseInput(ctx: RuntimeContext, bucketRequired = false): Record<string, unknown> {
  const input: Record<string, unknown> = { project_id: integerFlag(ctx, 'project-id', 1, 2147483647) };
  const bucket = ctx.str('bucket-id').trim();
  if (bucketRequired || bucket !== '') {
    if (!['#user_id', '#account_id', '#distinct_id', '#device_id'].includes(bucket)) {
      throw new Error('Flag --bucket-id must be one of #user_id, #account_id, #distinct_id, #device_id');
    }
    input.bucket_id = bucket;
  }
  return input;
}

/** Reads a required resource ID. */
export function domainId(ctx: RuntimeContext): string {
  const value = ctx.str('domain-id').trim();
  if (!value) throw new Error('Flag --domain-id must be a non-empty string');
  return value;
}

/** Builds domain metadata and an optional complete quota change. */
export function writeInput(ctx: RuntimeContext, create: boolean): Record<string, unknown> {
  const input = baseInput(ctx, create);
  if (!create) input.domain_id = domainId(ctx);
  const name = ctx.str('name').trim();
  const description = ctx.str('description');
  if (!name || name.length > 128) throw new Error('Flag --name must contain 1 to 128 characters');
  if (description.length > 200) throw new Error('Flag --description must contain at most 200 characters');
  input.domain_name = name;
  input.domain_desc = description;
  const quotaChange = create || ['allocation-bps', 'allocations', 'expected-version'].some(
    (flag) => ctx.has?.(flag) ?? ctx.str(flag) !== '',
  );
  if (!quotaChange) return input;
  input.allocation_bps = integerFlag(ctx, 'allocation-bps', 1, 10000);
  input.expected_version = integerFlag(ctx, 'expected-version', 0);
  const raw = ctx.json('allocations');
  const allocations = raw === undefined && create ? [] : raw;
  if (!Array.isArray(allocations)) throw new Error('Flag --allocations must be a JSON array of all other domains');
  const ids = new Set<string>();
  let total = input.allocation_bps as number;
  input.allocations = allocations.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || Object.keys(item).some((key) => !['domain_id', 'allocation_bps'].includes(key))
        || typeof item.domain_id !== 'string' || !item.domain_id.trim()
        || !Number.isInteger(item.allocation_bps) || item.allocation_bps < 1 || item.allocation_bps > 10000) {
      throw new Error(`Flag --allocations[${index}] must contain only domain_id and integer allocation_bps (1 to 10000)`);
    }
    const id = item.domain_id.trim();
    if (ids.has(id) || id === input.domain_id) {
      throw new Error('Flag --allocations must not repeat a domain or include the domain being updated');
    }
    ids.add(id);
    total += item.allocation_bps;
    return { domain_id: id, allocation_bps: item.allocation_bps };
  });
  if (total > 10000) throw new Error('Total domain allocation must not exceed 10000 basis points');
  return input;
}
