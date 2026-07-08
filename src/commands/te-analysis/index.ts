import type { Command } from '../../framework/types.js';
import meta from './meta/index.js';
import report from './report/index.js';
import dashboard from './dashboard/index.js';
import dashboardReportData from './dashboard-report-data/index.js';
import query from './query/index.js';
import dashboardDefinition from './dashboard-definition/index.js';
import dashboardDailyReport from './dashboard-daily-report/index.js';
import biPanel from './bi-panel/index.js';
import biPanelPageData from './bi-panel-page-data/index.js';
import projectSpace from './project-space/index.js';
import folder from './folder/index.js';
import favorite from './favorite/index.js';
import publicLink from './public-link/index.js';
import model from './model/index.js';
import entity from './entity/index.js';
import schema from './schema/index.js';
import global from './global/index.js';
import { isGlobalQueryModeEnabled } from '../../core/cluster-info.js';
import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';

registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

const commands: Command[] = [
  ...meta,
  ...report,
  ...dashboard,
  ...dashboardReportData,
  ...query,
  ...dashboardDefinition,
  ...dashboardDailyReport,
  ...biPanel,
  ...biPanelPageData,
  ...projectSpace,
  ...folder,
  ...favorite,
  ...publicLink,
  ...model,
  ...entity,
  ...schema,
  ...(isGlobalQueryModeEnabled() ? global : []),
];

export default commands;
