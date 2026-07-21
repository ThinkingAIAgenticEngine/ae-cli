import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const createJsonBigInt = require('json-bigint') as (options: {
  strict: boolean;
  useNativeBigInt: boolean;
  protoAction: 'error';
  constructorAction: 'error';
}) => {
  parse(text: string): unknown;
  stringify(value: unknown): string | undefined;
};

const losslessJson = createJsonBigInt({
  strict: true,
  useNativeBigInt: true,
  protoAction: 'error',
  constructorAction: 'error',
});

export class CommunityJsonParseError extends Error {
  readonly code = 'community_invalid_json';

  constructor() {
    super('Input must be valid JSON.');
    this.name = 'CommunityJsonParseError';
  }
}

/**
 * Parses community ingestion JSON without rounding integer tokens. Parser
 * diagnostics are intentionally hidden because they may quote business data.
 */
export function parseCommunityJson(text: string): unknown {
  try {
    return losslessJson.parse(text);
  } catch {
    throw new CommunityJsonParseError();
  }
}

/** Serializes native bigint values as unquoted JSON number tokens. */
export function stringifyCommunityJson(value: unknown): string {
  try {
    const result = losslessJson.stringify(value);
    if (typeof result !== 'string') {
      throw new Error('JSON value is not serializable.');
    }
    return result;
  } catch (error) {
    if (error instanceof CommunityJsonParseError) {
      throw error;
    }
    throw new CommunityJsonParseError();
  }
}
