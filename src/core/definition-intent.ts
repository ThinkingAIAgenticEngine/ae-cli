import { createHash } from 'node:crypto';
import { CliValidationError } from './errors.js';
import type { Flag, RuntimeContext } from '../framework/types.js';

export const definitionIntentSnapshotFlag: Flag = {
  name: 'intent-snapshot',
  type: 'json',
  required: false,
  desc: 'Optional user-confirmed intent snapshot: {"schema_version":1,"requirement":"...","definition":{...}}. ae-cli rejects drift between this snapshot and the final definition before validate, dry-run, or execute. The snapshot is not sent to the Gateway.',
};

export const modelDefinitionIntentSnapshotFlag: Flag = {
  name: 'intent-snapshot',
  type: 'json',
  required: false,
  desc: 'Optional user-confirmed intent snapshot: {"schema_version":1,"requirement":"...","model_type":"event","definition":{...}}. ae-cli rejects drift between this snapshot and the final model-type/definition before validate, dry-run, or execute. The snapshot is not sent to the Gateway.',
};

export interface DefinitionIntentConfig {
  definitionFlag?: string;
  modelTypeFlag?: string;
  snapshotFlag?: string;
}

export interface DefinitionIntentEvidence {
  checked: true;
  matched: true;
  schema_version: 1;
  snapshot_sha256: string;
}

export function verifyDefinitionIntent(
  ctx: RuntimeContext,
  config: DefinitionIntentConfig,
): DefinitionIntentEvidence | undefined {
  const snapshotFlag = config.snapshotFlag ?? 'intent-snapshot';
  const snapshot = ctx.json(snapshotFlag);
  if (snapshot === undefined) return undefined;
  if (!isRecord(snapshot) || snapshot.schema_version !== 1) {
    throw mismatch('Intent snapshot must be an object with schema_version=1.');
  }
  if (typeof snapshot.requirement !== 'string' || snapshot.requirement.trim().length === 0) {
    throw mismatch('Intent snapshot requirement must be a non-empty string.');
  }
  if (!Object.prototype.hasOwnProperty.call(snapshot, 'definition')) {
    throw mismatch('Intent snapshot must include definition.');
  }

  const definitionFlag = config.definitionFlag ?? 'definition';
  const finalDefinition = ctx.json(definitionFlag);
  if (finalDefinition === undefined || !jsonEqual(snapshot.definition, finalDefinition)) {
    throw mismatch('Final definition does not match the user-confirmed intent snapshot.');
  }

  if (config.modelTypeFlag) {
    const finalModelType = ctx.str(config.modelTypeFlag);
    if (typeof snapshot.model_type !== 'string' || snapshot.model_type !== finalModelType) {
      throw mismatch('Final model type does not match the user-confirmed intent snapshot.');
    }
  }

  return {
    checked: true,
    matched: true,
    schema_version: 1,
    snapshot_sha256: createHash('sha256').update(canonicalJson(snapshot)).digest('hex'),
  };
}

function mismatch(message: string): CliValidationError {
  return new CliValidationError(message, {
    code: 'DEFINITION_INTENT_MISMATCH',
    hint: 'Rebuild the final definition from the confirmed snapshot, or ask the user to confirm a new snapshot.',
  });
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  return encoded === undefined ? 'null' : encoded;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
