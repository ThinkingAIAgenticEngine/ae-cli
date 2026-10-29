import { createCapabilityCommand, optionalBoolean } from '../shared.js';

export const dataTableGet = createCapabilityCommand({
  resource: 'data-table',
  command: 'get',
  capabilityId: 'metadata.data_table.get',
  description: 'Get one metadata data table detail, including saved SQL definitions and schedule configuration when supported by the server. Requires metadata view permission.',
  helpText: [
    'SQL tables on supported servers include create_qp/update_qp, create_zone_offset/update_zone_offset, strategy, update_cron, and update_conf_status.',
    'QP objects preserve SQL parameter/view-parameter definitions and saved values; they do not report values resolved for a particular execution.',
    'The zone offsets belong to SQL parameter parsing, not the cron schedule timezone. The schedule switch status is separate from task execution status.',
    'Use --format json for complete detail. --jq selects from the payload before envelope wrapping, for example --jq .update_qp.taSqlVo.sqlVoParams.',
    'Older servers may omit these fields; null means unavailable configuration, not an empty parameter list.',
  ].join('\n'),
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'data-table-id', type: 'number', required: true, desc: 'Data table ID.' },
    { name: 'include-preview', type: 'boolean', required: false, desc: 'Whether to include preview rows.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    data_table_id: ctx.num('data-table-id'),
    include_preview: optionalBoolean(ctx, 'include-preview'),
  }),
});
