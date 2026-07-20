import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectMarkTimeUpdate = createAnalysisCapabilityCommand({
  resource: 'project mark-time',
  command: 'update',
  capabilityId: 'project.mark_time.update',
  description: 'Update a project date marker.',
  flags: [
    projectIdFlag,
    { name: 'mark-time-id', type: 'number', required: true, desc: 'Date marker ID.' },
    { name: 'marked-at', type: 'string', required: true, desc: 'Marker timestamp, for example yyyy-MM-dd HH:mm.' },
    { name: 'zone-offset', type: 'number', required: false, desc: 'Marker time zone offset.' },
    { name: 'content', type: 'string', required: true, desc: 'Marker content.' },
    { name: 'is-visible', type: 'number', required: false, desc: 'Whether the marker is visible. 1 visible, 0 hidden.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    mark_time_id: ctx.num('mark-time-id'),
    marked_at: ctx.str('marked-at'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    content: ctx.str('content'),
    is_visible: optionalNumber(ctx, 'is-visible'),
  }),
});
