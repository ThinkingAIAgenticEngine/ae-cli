import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { writeInput } from './shared.js';

/** Update traffic domain metadata and optionally replace complete Space quotas. */
export const trafficDomainUpdate = createExperimentCapabilityCommand({
  resource: 'traffic-domain', command: 'update', capabilityId: 'experiment.traffic_domain.update',
  description: 'Update traffic domain metadata and optionally replace complete Space quotas.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'domain-id', type: 'string', required: true, desc: 'Existing traffic domain ID in this project.' },
    { name: 'bucket-id', type: 'string', desc: 'Bucket subject: #user_id, #account_id, #distinct_id, or #device_id.' },
    { name: 'name', type: 'string', required: true, desc: 'Domain name, 1 to 128 characters; unique within the bucket subject.' },
    { name: 'description', type: 'string', desc: 'Domain description, at most 200 characters; omitted value clears the description.' },
    { name: 'allocation-bps', type: 'number', desc: 'Domain quota in integer basis points (1 to 10000; 10000 = 100%).' },
    { name: 'expected-version', type: 'number', desc: 'Current Space allocation_version from list; use 0 only when no domains exist.' },
    { name: 'allocations', type: 'json', desc: 'Complete other-domain quotas: [{"domain_id":"d1","allocation_bps":3000}]; required with --allocation-bps and --expected-version; exclude this domain.' },
  ],
  risk: 'write',
  validate: (ctx) => { writeInput(ctx, false); },
  buildInput: (ctx) => writeInput(ctx, false),
});
