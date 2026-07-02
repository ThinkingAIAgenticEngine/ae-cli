import type { Command } from '../../../framework/types.js';
import { listDashboards } from './list-dashboards.js';
import { listBiPanels } from './list-bi-panels.js';
import { getBiPanelDetail } from './get-bi-panel-detail.js';
import { queryBiPanelData } from './query-bi-panel-data.js';
import { queryDashboardDetail } from './query-dashboard-detail.js';
import { queryDashboardReportData } from './query-dashboard-report-data.js';
import { createDashboard } from './create-dashboard.js';
import { updateDashboard } from './update-dashboard.js';
import { createOrUpdateDashboardNote } from './create-or-update-dashboard-note.js';
import { listPublicAccessLinks } from './list-public-access-links.js';
import { createPublicAccessLink } from './create-public-access-link.js';
import { updatePublicAccessLink } from './update-public-access-link.js';
import { createSpace } from './create-space.js';
import { deleteDashboard } from './delete-dashboard.js';
import { copyDashboard } from './copy-dashboard.js';
import { moveDashboard } from './move-dashboard.js';
import { listSpaces } from './list-spaces.js';
import { freezeDashboards } from './freeze-dashboards.js';

const commands: Command[] = [
  listDashboards,
  listBiPanels,
  getBiPanelDetail,
  queryBiPanelData,
  queryDashboardDetail,
  queryDashboardReportData,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  copyDashboard,
  moveDashboard,
  createOrUpdateDashboardNote,
  listPublicAccessLinks,
  createPublicAccessLink,
  updatePublicAccessLink,
  createSpace,
  listSpaces,
  freezeDashboards,
];

export default commands;
