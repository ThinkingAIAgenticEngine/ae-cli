import assert from 'node:assert/strict';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import { capabilityGatewayHint } from '../src/framework/runner.ts';

assert.equal(
  capabilityGatewayHint(new CapabilityGatewayError('not found', 'HISTORY_TAG_NOT_FOUND', 404)),
  undefined,
);
assert.match(
  capabilityGatewayHint(new CapabilityGatewayError('not found', undefined, 404)) ?? '',
  /capability route/,
);
assert.match(
  capabilityGatewayHint(new CapabilityGatewayError('missing', 'CAPABILITY_NOT_FOUND', 404)) ?? '',
  /does not expose this capability/,
);

process.stdout.write('runner capability hint tests: 3/3 passed\n');
