import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const action = process.argv[2];
const cwd = process.cwd();
const choices = {
  'choose-sample': { step: 'choose_sample', options: [{ value: 'star_island' }, { value: 'season_pass' }, { value: 'keep_sample' }] },
  'after-follow-up': { step: 'follow_up_ready', options: [{ value: 'experiment_plan' }] },
  'after-experiment': { step: 'experiment_verified', options: [{ value: 'change_sample' }, { value: 'finish_demo' }] },
};
if (!(['active', 'done', 'stopped'].includes(action) || Object.hasOwn(choices, action))) {
  throw new Error('Expected active, done, stopped, choose-sample, after-follow-up, or after-experiment.');
}
if (action === 'after-experiment') await recordEndpoint('active');
if (Object.hasOwn(choices, action)) {
  process.stdout.write(JSON.stringify({ ok: true, data: { interaction: choices[action] } }) + '\n');
} else {
  await recordEndpoint(action);
}

async function recordEndpoint(endpoint) {
  const directory = path.join(cwd, '.ae-onboarding');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  if (!(await fs.lstat(directory)).isDirectory()) throw new Error('Unsafe onboarding state directory.');
  const target = path.join(directory, 'plg-journey.json');
  const schema = 'ae-onboarding.state.v5';
  const previous = await fs.lstat(target).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous && (!previous.isFile() || previous.size > 8192)) throw new Error('Unsafe onboarding journey state.');
  if (previous) {
    const state = JSON.parse(await fs.readFile(target, 'utf8'));
    if (endpoint === 'active' || (state.schema === schema && state.endpoint === endpoint)) return;
  }
  const temp = path.join(directory, `.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temp, `${JSON.stringify({ schema, revision: Date.now(), endpoint })}\n`, { mode: 0o600, flag: 'wx' });
    if (endpoint === 'active') {
      // Initialization must not replace a concurrent completion receipt.
      await fs.link(temp, target).catch(error => {
        if (error.code !== 'EEXIST') throw error;
      });
    } else {
      await fs.rename(temp, target);
    }
  } finally {
    await fs.rm(temp, { force: true });
  }
}
