import type { Command } from '../../framework/types.js';
import meta from './meta/index.js';
import governance from './governance/index.js';
import report from './report/index.js';
import reportData from './report-data/index.js';
import reportChangeLog from './report-change-log/index.js';
import reportVersion from './report-version/index.js';
import reportAbnormal from './report-abnormal/index.js';
import dashboard from './dashboard/index.js';
import dashboardReport from './dashboard-report/index.js';
import dashboardReportData from './dashboard-report-data/index.js';
import query from './query/index.js';
import run from './run/index.js';
import artifact from './artifact/index.js';
import adhoc from './adhoc/index.js';
import dashboardDefinition from './dashboard-definition/index.js';
import dashboardDailyReport from './dashboard-daily-report/index.js';
import biPanel from './bi-panel/index.js';
import biPanelVersion from './bi-panel-version/index.js';
import biPanelPageData from './bi-panel-page-data/index.js';
import projectSpace from './project-space/index.js';
import favorite from './favorite/index.js';
import publicLink from './public-link/index.js';
import model from './model/index.js';
import eventDetail from './event-detail/index.js';
import entityDetail from './entity-detail/index.js';
import drilldownEvents from './drilldown-events/index.js';
import drilldownEntities from './drilldown-entities/index.js';
import drilldownUserEvents from './drilldown-user-events/index.js';
import user from './user/index.js';
import global from './global/index.js';
import sqlTable from './sql-table/index.js';
import entity from './entity/index.js';
import inputFile from './input-file/index.js';
import project from './project/index.js';
import tracking from './tracking/index.js';
import alert from './alert/index.js';
import alertDefinitionSchema from './alert-definition-schema/index.js';
import alertDetail from './alert-detail/index.js';
import alertJob from './alert-job/index.js';
import alertNoticeConfig from './alert-notice-config/index.js';
import { isGlobalQueryModeEnabled } from '../../core/cluster-info.js';
import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';

registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
registerCapabilityGatewayRoute('tracking', { gatewayDomain: 'analysis' });

export const baseCommands: Command[] = [
  ...meta,
  ...governance,
  ...report,
  ...reportData,
  ...reportChangeLog,
  ...reportVersion,
  ...reportAbnormal,
  ...dashboard,
  ...dashboardReport,
  ...dashboardReportData,
  ...query,
  ...run,
  ...artifact,
  ...adhoc,
  ...dashboardDefinition,
  ...dashboardDailyReport,
  ...biPanel,
  ...biPanelVersion,
  ...biPanelPageData,
  ...projectSpace,
  ...favorite,
  ...publicLink,
  ...model,
  ...eventDetail,
  ...entityDetail,
  ...drilldownEvents,
  ...drilldownEntities,
  ...drilldownUserEvents,
  ...user,
  ...sqlTable,
  ...entity,
  ...inputFile,
  ...project,
  ...tracking,
  ...alert,
  ...alertDefinitionSchema,
  ...alertDetail,
  ...alertJob,
  ...alertNoticeConfig,
];

const commands: Command[] = [
  ...baseCommands,
  ...(isGlobalQueryModeEnabled() ? global : []),
];

export default commands;
