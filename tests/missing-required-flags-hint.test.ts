import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { taskDataDetail } from '../src/commands/te-engage/task/task-data-detail.ts';
import { missingRequiredFlagsError } from '../src/framework/runner.ts';

const detailType = taskDataDetail.flags.find((flag) => flag.name === 'detail_type');
const startTime = taskDataDetail.flags.find((flag) => flag.name === 'start_time');
const endTime = taskDataDetail.flags.find((flag) => flag.name === 'end_time');
assert.ok(detailType?.hint, 'detail_type should declare a missing-flag hint');
assert.ok(startTime?.hint, 'start_time should declare a missing-flag hint');
assert.ok(endTime?.hint, 'end_time should declare a missing-flag hint');

const built = missingRequiredFlagsError('engage +task_data_detail', [detailType!, startTime!, endTime!]);
assert.equal(
  built.message,
  'Missing required flags: --detail_type, --start_time, --end_time',
);
assert.match(built.hint, /time\|instance\|instance_daily/);
assert.match(built.hint, /--start_time/);
assert.match(built.hint, /yyyy-MM-dd/);
assert.match(built.hint, /2026-04-01/);
assert.match(built.hint, /2026-04-07/);

const fallback = missingRequiredFlagsError('engage +demo', [
  { name: 'project_id', type: 'number', required: true, desc: 'Project ID' },
]);
assert.equal(fallback.message, 'Missing required flag: --project_id');
assert.equal(fallback.hint, 'Usage: ae-cli engage +demo --project_id <value>');

const cli = spawnSync(
  'npx',
  [
    'tsx',
    'src/index.ts',
    '--no-update-check',
    'engage',
    '+task_data_detail',
    '--project_id',
    '4',
    '--task_id',
    '0015',
    '--format',
    'json',
  ],
  { cwd: process.cwd(), encoding: 'utf-8' },
);
const errText = `${cli.stderr || ''}${cli.stdout || ''}`;
const envelope = JSON.parse(errText);
assert.equal(envelope.ok, false);
assert.equal(envelope.error.type, 'validation');
assert.match(envelope.error.message, /Missing required flags: --detail_type, --start_time, --end_time/);
assert.match(envelope.error.hint, /time\|instance\|instance_daily/);
assert.match(envelope.error.hint, /--start_time 2026-04-01 --end_time 2026-04-07/);

process.stdout.write('missing required flags hint tests: passed\n');
