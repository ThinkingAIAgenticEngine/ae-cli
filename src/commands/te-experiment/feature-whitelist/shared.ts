import type { RuntimeContext } from '../../../framework/types.js';

/** Reads a required non-empty JSON string array. */
export function readRuleIds(ctx: RuntimeContext): string[] {
  const value = ctx.json('rule-ids');
  if (!Array.isArray(value) || value.length === 0
      || !value.every((item) => typeof item === 'string' && item.trim() !== '')) {
    throw new Error('Flag --rule-ids must be a non-empty JSON array of strings');
  }
  return value;
}

/** Reads and validates the Feature whitelist bucket array. */
export function readWhitelist(ctx: RuntimeContext): Array<Record<string, unknown>> {
  const value = ctx.json('whitelist');
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Flag --whitelist must be a non-empty JSON array');
  }
  const bucketIds = new Set<string>();
  value.forEach((bucket, bucketIndex) => {
    if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) {
      throw new Error(`Flag --whitelist[${bucketIndex}] must be a JSON object`);
    }
    const item = bucket as Record<string, unknown>;
    if (typeof item.bucket_id !== 'string' || item.bucket_id.trim() === '') {
      throw new Error(`Flag --whitelist[${bucketIndex}].bucket_id must be a non-empty string`);
    }
    if (bucketIds.has(item.bucket_id)) {
      throw new Error(`Flag --whitelist contains duplicate bucket_id: ${item.bucket_id}`);
    }
    bucketIds.add(item.bucket_id);
    if (!Array.isArray(item.rules) || item.rules.length === 0) {
      throw new Error(`Flag --whitelist[${bucketIndex}].rules must be a non-empty array`);
    }
    const bucketValueIds = new Set<string>();
    item.rules.forEach((rule, ruleIndex) => {
      if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
        throw new Error(`Flag --whitelist[${bucketIndex}].rules[${ruleIndex}] must be a JSON object`);
      }
      const row = rule as Record<string, unknown>;
      if (!Array.isArray(row.ids) || row.ids.length === 0
          || !row.ids.every((id) => typeof id === 'string' && id.trim() !== '')) {
        throw new Error(`Flag --whitelist[${bucketIndex}].rules[${ruleIndex}].ids must be a non-empty string array`);
      }
      row.ids.forEach((id) => {
        if (bucketValueIds.has(id)) {
          throw new Error(`Flag --whitelist bucket ${item.bucket_id} contains duplicate ID: ${id}`);
        }
        bucketValueIds.add(id);
      });
      if (typeof row.value !== 'string') {
        throw new Error(`Flag --whitelist[${bucketIndex}].rules[${ruleIndex}].value must be a string`);
      }
    });
  });
  return value as Array<Record<string, unknown>>;
}
