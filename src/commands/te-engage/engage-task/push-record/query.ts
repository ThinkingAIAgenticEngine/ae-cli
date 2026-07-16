import { createEngageTaskCapabilityCommand } from '../../shared.js';
import { printError } from '../../../../framework/output.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Queries delivery and push records for an engagement task. */
export const pushRecordQuery = createEngageTaskCapabilityCommand({
  resource: 'push-record',
  command: 'query',
  capabilityId: 'engage-task.push-record.query',
  description:
    'Query task delivery and push records, including trigger, send, success, and failure details.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
    { name: 'page-num', type: 'number', required: false, desc: 'Page number for scheduled tasks. Defaults to 1.' },
    { name: 'page-size', type: 'number', required: false, desc: 'Page size for scheduled tasks. Defaults to 20.' },
    {
      name: 'start-date',
      type: 'string',
      required: false,
      desc: 'Optional start date in yyyy-MM-dd format. Must not be after --end-date.',
    },
    {
      name: 'end-date',
      type: 'string',
      required: false,
      desc: 'Optional end date in yyyy-MM-dd format. Must not be before --start-date.',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    const startDate = ctx.str('start-date');
    const endDate = ctx.str('end-date');
    if (startDate && !ISO_DATE.test(startDate)) {
      printError('validation', '--start-date must be in yyyy-MM-dd format');
      process.exit(1);
    }
    if (endDate && !ISO_DATE.test(endDate)) {
      printError('validation', '--end-date must be in yyyy-MM-dd format');
      process.exit(1);
    }
    if (startDate && endDate && startDate > endDate) {
      printError('validation', '--start-date must not be after --end-date');
      process.exit(1);
    }
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    page_num: ctx.optionalNum('page-num'),
    page_size: ctx.optionalNum('page-size'),
    start_date: ctx.str('start-date') || undefined,
    end_date: ctx.str('end-date') || undefined,
  }),
});
