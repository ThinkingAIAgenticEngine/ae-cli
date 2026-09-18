import assert from 'node:assert/strict';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import { capabilityGatewayHint } from '../src/framework/runner.ts';

const prevSandbox = process.env.SANDBOX_RUNTIME_ROOT;
const prevNoCompat = process.env.AE_CLI_NO_COMPAT_CHECK;
const prevCi = process.env.CI;
process.env.AE_CLI_NO_COMPAT_CHECK = '1';
delete process.env.SANDBOX_RUNTIME_ROOT;

assert.equal(
  capabilityGatewayHint(new CapabilityGatewayError('not found', 'HISTORY_TAG_NOT_FOUND', 404)),
  undefined,
);
assert.match(
  capabilityGatewayHint(new CapabilityGatewayError('not found', undefined, 404)) ?? '',
  /capability route/,
);
assert.match(
  capabilityGatewayHint(new CapabilityGatewayError('not found', undefined, 404)) ?? '',
  /AE_CLI_CAPABILITY_GATEWAY_DOMAIN=/,
);
assert.match(
  capabilityGatewayHint(new CapabilityGatewayError('missing', 'CAPABILITY_NOT_FOUND', 404)) ?? '',
  /does not expose this capability/,
);

if (prevSandbox === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
else process.env.SANDBOX_RUNTIME_ROOT = prevSandbox;
if (prevNoCompat === undefined) delete process.env.AE_CLI_NO_COMPAT_CHECK;
else process.env.AE_CLI_NO_COMPAT_CHECK = prevNoCompat;
if (prevCi === undefined) delete process.env.CI;
else process.env.CI = prevCi;

process.stdout.write('runner capability hint tests: 4/4 passed\n');
