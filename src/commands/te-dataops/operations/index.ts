import type { Command } from '../../../framework/types.js';

import { createBackfillJob } from './create-backfill-job.js';
import { deleteBackfillJob } from './delete-backfill-job.js';
import { getFlowInstanceDetail } from './get-flow-instance-detail.js';
import { getBackfillJobDetail } from './get-backfill-job-detail.js';
import { getTaskInstanceDetail } from './get-task-instance-detail.js';
import { listBackfillFlows } from './list-backfill-flows.js';
import { rerunBackfillJob } from './rerun-backfill-job.js';
import { runBackfillJob } from './run-backfill-job.js';
import { searchBackfillJobs } from './search-backfill-jobs.js';
import { searchFlowInstances } from './search-flow-instances.js';
import { stopBackfillJob } from './stop-backfill-job.js';
import { stopFlowInstance } from './stop-flow-instance.js';
import { updateBackfillJob } from './update-backfill-job.js';

const commands: Command[] = [
  searchFlowInstances,
  getFlowInstanceDetail,
  getTaskInstanceDetail,
  stopFlowInstance,
  listBackfillFlows,
  createBackfillJob,
  updateBackfillJob,
  deleteBackfillJob,
  runBackfillJob,
  searchBackfillJobs,
  getBackfillJobDetail,
  stopBackfillJob,
  rerunBackfillJob,
];

export default commands;
