import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const endpoint = process.argv[2];
const cwd = process.cwd();
const choices = {
  'choose-sample': { step: 'choose_sample', options: [{ value: 'star_island' }, { value: 'season_pass' }, { value: 'keep_sample' }] },
  'after-follow-up': { step: 'follow_up_ready', options: [{ value: 'experiment_plan' }, { value: 'change_sample' }] },
};
if (!(['done', 'stopped'].includes(endpoint) || Object.hasOwn(choices, endpoint))) {
  throw new Error('Expected done, stopped, choose-sample, or after-follow-up.');
}
if (Object.hasOwn(choices, endpoint)) {
  process.stdout.write(JSON.stringify({ ok: true, data: { interaction: choices[endpoint] } }) + '\n');
  process.exit(0);
}

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
  if (state.schema === schema && state.endpoint === endpoint) process.exit(0);
}
const temp = path.join(directory, `.${randomUUID()}.tmp`);
try {
  await fs.writeFile(temp, `${JSON.stringify({ schema, revision: Date.now(), endpoint })}\n`, { mode: 0o600, flag: 'wx' });
  await fs.rename(temp, target);
} finally {
  await fs.rm(temp, { force: true });
}
