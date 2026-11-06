import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough } from 'node:stream';
import { confirmHighRiskWrite } from '../src/framework/confirmation.ts';

function streams() {
  return { input: Object.assign(new PassThrough(), { isTTY: true }),
    output: Object.assign(new PassThrough(), { isTTY: true }) };
}

test('interactive confirmation accepts an explicit yes', { timeout: 1500 }, async () => {
  const { input, output } = streams();
  try {
    const answer = confirmHighRiskWrite('Confirm test', input, output);
    input.write('yes\n');
    assert.equal(await answer, true);
  } finally { input.destroy(); output.destroy(); }
});

test('interactive EOF resolves as an abort', { timeout: 1500 }, async () => {
  const { input, output } = streams();
  try {
    const answer = confirmHighRiskWrite('Confirm test', input, output);
    input.end();
    assert.equal(await answer, false);
  } finally { input.destroy(); output.destroy(); }
});

test('interactive refusal resolves as an abort', { timeout: 1500 }, async () => {
  const { input, output } = streams();
  try {
    const answer = confirmHighRiskWrite('Confirm test', input, output);
    input.write('no\n');
    assert.equal(await answer, false);
  } finally { input.destroy(); output.destroy(); }
});
