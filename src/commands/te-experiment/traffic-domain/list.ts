import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { baseInput } from './shared.js';

/** List traffic domains grouped into bucket Spaces with quotas, versions, and permissions. */
export const trafficDomainList = createExperimentCapabilityCommand({
  resource: 'traffic-domain', command: 'list', capabilityId: 'experiment.traffic_domain.list',
  description: 'List traffic domains grouped into bucket Spaces with quotas, versions, and permissions.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'bucket-id', type: 'string', desc: 'Bucket subject: #user_id, #account_id, #distinct_id, or #device_id.' },
  ],
  risk: 'read',
  validate: (ctx) => { baseInput(ctx); },
  buildInput: baseInput,
});
