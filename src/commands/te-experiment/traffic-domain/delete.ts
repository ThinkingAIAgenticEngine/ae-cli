import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { baseInput, domainId, integerFlag } from './shared.js';

/** Delete a traffic domain and unbind its layers while retaining layers and experiments. */
export const trafficDomainDelete = createExperimentCapabilityCommand({
  resource: 'traffic-domain', command: 'delete', capabilityId: 'experiment.traffic_domain.delete',
  description: 'Delete a traffic domain and unbind its layers while retaining layers and experiments.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'domain-id', type: 'string', required: true, desc: 'Existing traffic domain ID in this project.' },
    { name: 'expected-version', type: 'number', required: true, desc: 'Current Space allocation_version from list; use 0 only when no domains exist.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { baseInput(ctx); domainId(ctx); integerFlag(ctx, 'expected-version', 0); },
  buildInput: (ctx) => ({ ...baseInput(ctx), domain_id: domainId(ctx), expected_version: integerFlag(ctx, 'expected-version', 0) }),
});
