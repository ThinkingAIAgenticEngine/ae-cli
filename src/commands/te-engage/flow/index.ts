import type { Command } from '../../../framework/types.js';
import { deleteFlow } from './delete-flow.js';
import { flowAbSplitNodeReport } from './flow-ab-split-node-report.js';
import { flowDetail } from './flow-detail.js';
import { flowList } from './flow-list.js';
import { flowNodeConfigSchema } from './flow-node-config-schema.js';
import { flowNodeDetailReport } from './flow-node-detail-report.js';
import { flowNodeOverviewReport } from './flow-node-overview-report.js';
import { flowProcessReport } from './flow-process-report.js';
import { manageFlow } from './manage-flow.js';
import { modifyFlowBaseInfo } from './modify-flow-base-info.js';
import { saveFlow } from './save-flow.js';
import { validateFlowNodeConfig } from './validate-flow-node-config.js';

const commands: Command[] = [
  flowNodeOverviewReport,
  flowProcessReport,
  flowNodeDetailReport,
  flowAbSplitNodeReport,
  flowDetail,
  modifyFlowBaseInfo,
  manageFlow,
  flowNodeConfigSchema,
  validateFlowNodeConfig,
  deleteFlow,
  flowList,
  saveFlow,
];

export default commands;
