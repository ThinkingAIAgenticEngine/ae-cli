import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { writeInput } from './shared.js';

/** Create a traffic domain with complete Space quotas. */
export const trafficDomainCreate = createExperimentCapabilityCommand({
  resource: 'traffic-domain', command: 'create', capabilityId: 'experiment.traffic_domain.create',
  description: 'Create a traffic domain with complete Space quotas.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'bucket-id', type: 'string', required: true, desc: 'Bucket subject: #user_id, #account_id, #distinct_id, or #device_id.' },
    { name: 'name', type: 'string', required: true, desc: 'Domain name, 1 to 128 characters; unique within the bucket subject.' },
    { name: 'description', type: 'string', desc: 'Domain description, at most 200 characters; omitted value clears the description.' },
    { name: 'allocation-bps', type: 'number', required: true, desc: 'Domain quota in integer basis points (1 to 10000; 10000 = 100%).' },
    { name: 'expected-version', type: 'number', required: true, desc: 'Current Space allocation_version from list; use 0 only when no domains exist.' },
    { name: 'allocations', type: 'json', desc: 'Complete other-domain quotas: [{"domain_id":"d1","allocation_bps":3000}]; omit only for the first domain.' },
  ],
  risk: 'write',
  validate: (ctx) => { writeInput(ctx, true); },
  buildInput: (ctx) => writeInput(ctx, true),
});
