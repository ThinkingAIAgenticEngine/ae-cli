import assert from 'node:assert/strict';
import {
  evaluateCompat,
  formatCompatNotice,
  formatPinCommands,
  formatUpgradeCommands,
  normalizeCliVersion,
  resolvePinTarget,
  sameVersionLine,
  versionLine,
} from '../src/core/version-compat.ts';

assert.equal(normalizeCliVersion('v6.0.31'), '6.0.31');
assert.equal(normalizeCliVersion('6.0.32'), '6.0.32');
assert.equal(versionLine('6.0.31'), '6.0');
assert.equal(sameVersionLine('6.0.20', '6.0.31'), true);
assert.equal(sameVersionLine('6.1.0', '6.0.31'), false);

assert.equal(evaluateCompat('6.0.20', '6.0.20', '6.0').kind, 'ok');
assert.equal(evaluateCompat('6.0.31', '6.0.20', '6.0').kind, 'local_newer');
assert.equal(evaluateCompat('6.0.10', '6.0.20', '6.0').kind, 'local_older');
assert.equal(evaluateCompat('6.1.0', '6.0.20', '6.0').kind, 'line_mismatch');

// cluster → public pin (many 6.0.x → one GitHub tag; GH usually later)
assert.equal(resolvePinTarget('6.0.13'), '1.0.28');
assert.equal(resolvePinTarget('6.0.14'), '1.0.28');
assert.equal(resolvePinTarget('6.0.15'), '1.0.30');
assert.equal(resolvePinTarget('6.0.19'), '6.0.18');
assert.equal(resolvePinTarget('6.0.28'), '6.0.28');
assert.equal(resolvePinTarget('6.1.3'), null); // no public 6.1.x tag yet

const pins13 = formatPinCommands('6.0.13');
assert.ok(pins13[0].includes('@thinkingai/ae-cli@1.0.28'));
assert.ok(pins13[0].includes('--registry=https://registry.npmjs.org'));
assert.ok(pins13[1].includes('#v1.0.28'));

const pins = formatPinCommands('6.0.20');
assert.ok(pins[0].includes('@thinkingai/ae-cli@6.0.20'));
assert.ok(pins[0].includes('--registry=https://registry.npmjs.org'));
assert.ok(pins[1].includes('#v6.0.20'));

const newer = formatCompatNotice(evaluateCompat('6.0.31', '6.0.20', '6.0'));
assert.match(newer ?? '', /local 6\.0\.31 > environment 6\.0\.20/);
assert.match(newer ?? '', /ae-cli update/);

const mappedPin = formatCompatNotice(evaluateCompat('6.0.32', '6.0.13', '6.0'));
assert.match(mappedPin ?? '', /local 6\.0\.32 > environment 6\.0\.13/);
assert.match(mappedPin ?? '', /ae-cli update/);

const older = formatCompatNotice(evaluateCompat('6.0.32', '6.0.33', '6.0'));
assert.match(older ?? '', /local 6\.0\.32 < environment 6\.0\.33/);
assert.match(older ?? '', /ae-cli update/);

const upgrades = formatUpgradeCommands('6.0.33');
assert.ok(upgrades[0].includes('@thinkingai/ae-cli@6.0.33'));
assert.ok(upgrades[0].includes('--registry=https://registry.npmjs.org'));
assert.ok(upgrades[1].includes('#v6.0.33'));

process.stdout.write('version-compat tests: passed\n');
