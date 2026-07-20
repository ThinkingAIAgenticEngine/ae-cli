import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownEntitiesRunFlags, drilldownEntitiesRunInput } from './shared.js';

export const drilldownEntitiesRun = createAnalysisCapabilityCommand({
  resource: 'drilldown-entities',
  command: 'run',
  capabilityId: 'analysis.query.drilldown_entities',
  description: `Preview users or custom entities behind one synchronous-preview cell whose metric advertises drilldown_entities. ${analysisDataRunRoutingHelp}`,
  flags: [...drilldownEntitiesRunFlags],
  risk: 'read',
  buildInput: drilldownEntitiesRunInput,
  postProcess: applyAnalysisInlineLimit,
});
