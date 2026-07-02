import type { Command } from '../../../framework/types.js';

import { getFlowInstanceDetail } from './get-flow-instance-detail.js';
import { getTaskInstanceDetail } from './get-task-instance-detail.js';
import { searchFlowInstances } from './search-flow-instances.js';
import { stopFlowInstance } from './stop-flow-instance.js';

const commands: Command[] = [
  searchFlowInstances,
  getFlowInstanceDetail,
  getTaskInstanceDetail,
  stopFlowInstance,
];

export default commands;
