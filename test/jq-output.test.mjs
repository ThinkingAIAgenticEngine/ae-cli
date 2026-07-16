import assert from 'node:assert/strict';
import { applyJq, formatOutput } from '../src/framework/output.ts';

const sample = {
  status: 'waiting_user',
  pendingQuestion: { text: 'confirm?' },
  items: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
  ],
};

assert.equal(await applyJq(sample, '.status'), 'waiting_user');
assert.deepEqual(await applyJq(sample, '{status,pendingQuestion}'), {
  status: 'waiting_user',
  pendingQuestion: { text: 'confirm?' },
});
assert.deepEqual(await applyJq(sample, '.items[].id'), [1, 2]);
assert.equal(await applyJq(sample, '.missing'), null);

const enveloped = JSON.parse(await formatOutput(sample, 'json', '{status,pendingQuestion}'));
assert.equal(enveloped.ok, true);
assert.deepEqual(enveloped.data, {
  status: 'waiting_user',
  pendingQuestion: { text: 'confirm?' },
});

let failed = false;
try {
  await applyJq(sample, '.[[[bad');
} catch (err) {
  failed = true;
  assert.match(String(err.message), /Invalid --jq expression/);
}
assert.equal(failed, true);

console.log('jq-output.test.mjs: ok');
