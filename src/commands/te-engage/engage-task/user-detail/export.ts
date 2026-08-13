import { createEngageTaskCapabilityCommand } from '../../shared.js';
import { printError } from '../../../../framework/output.js';

export const taskUserDetailStatuses = [
  'frequency_control',
  'fatigue_control',
  'fail',
  'success',
  'sample',
  'exp_skip_push',
  'deduplicate',
  'push_plan',
  'push_actual',
] as const;

const statusSet = new Set<string>(taskUserDetailStatuses);

/** Exports user details for one non-triggered engagement task instance. */
export const taskUserDetailExport = createEngageTaskCapabilityCommand({
  resource: 'user-detail',
  command: 'export',
  capabilityId: 'engage-task.user-detail.export',
  description: 'Export user details for one non-triggered task instance and user status.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
    { name: 'task-instance-id', type: 'string', required: true, desc: 'Non-triggered task instance ID.' },
    {
      name: 'task-exec-detail-id',
      type: 'string',
      required: false,
      desc: 'Optional execution detail ID used to narrow the task instance export.',
    },
    {
      name: 'user-status',
      type: 'string',
      required: false,
      desc: `English user status. Defaults to fail. Values: ${taskUserDetailStatuses.join(', ')}.`,
    },
    { name: 'request-id', type: 'string', required: false, desc: 'Export correlation ID. Generated when omitted.' },
    {
      name: 'artifact-format',
      type: 'string',
      required: false,
      desc: 'Export artifact format: csv or jsonl. Defaults to jsonl.',
    },
    {
      name: 'timeout-seconds',
      type: 'number',
      required: false,
      desc: 'Export timeout in seconds. Defaults to backend policy and cannot exceed 21600.',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    const status = ctx.str('user-status') || 'fail';
    if (!statusSet.has(status)) {
      printError('validation', `--user-status must be one of: ${taskUserDetailStatuses.join(', ')}`);
      process.exit(1);
    }
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    task_instance_id: ctx.str('task-instance-id'),
    task_exec_detail_id: ctx.str('task-exec-detail-id') || undefined,
    user_status: ctx.str('user-status') || 'fail',
    request_id: ctx.str('request-id') || undefined,
    format: ctx.str('artifact-format') || undefined,
    timeout_seconds: ctx.optionalNum('timeout-seconds'),
  }),
});
