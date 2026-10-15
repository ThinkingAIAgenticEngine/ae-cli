import type { Command } from '../../framework/types.js';
import { listMemories } from './list.js';
import { getMemory } from './get.js';
import { createMemory } from './create.js';
import { updateMemory } from './update.js';
import { deleteMemory } from './delete.js';
import { historyMemory } from './history.js';
import { pinMemory } from './pin.js';
import { unpinMemory } from './unpin.js';
import { restoreMemory } from './restore.js';
import { contextMemory } from './context.js';
import { extractMemory } from './extract.js';
import { listMemorySources } from './source-list.js';
import { listMemoryJobs } from './job-list.js';
import { getMemoryJob } from './job-get.js';
import { listMemoryDrafts } from './draft-list.js';
import { getMemoryDraft } from './draft-get.js';
import { updateMemoryDraft } from './draft-update.js';
import { deleteMemoryDraft } from './draft-delete.js';
import { submitMemoryDraft } from './draft-submit.js';
import { listMemoryCandidates } from './candidate-list.js';
import { getMemoryCandidate } from './candidate-get.js';
import { submitMemoryCandidate } from './candidate-submit.js';
import { approveMemoryCandidate } from './candidate-approve.js';
import { rejectMemoryCandidate } from './candidate-reject.js';
import { withdrawMemoryCandidate } from './candidate-withdraw.js';
import { resubmitMemoryCandidate } from './candidate-resubmit.js';
import { getMemorySettings } from './settings-get.js';
import { updateMemorySettings } from './settings-update.js';
import { retiredSubmitCandidates } from './retired-submit-candidates.js';
import { retiredPendingList } from './retired-pending-list.js';
import { retiredPendingApprove } from './retired-pending-approve.js';
import { retiredPendingReject } from './retired-pending-reject.js';
import { retiredOrganize } from './retired-organize.js';
import { retiredDefaultGet } from './retired-default-get.js';
import { retiredDefaultSave } from './retired-default-save.js';
import { retiredDefaultClear } from './retired-default-clear.js';
import { retiredMarkUsed } from './retired-mark-used.js';
import { retiredWriteContext } from './retired-write-context.js';

export {
  listMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
  historyMemory,
  pinMemory,
  unpinMemory,
  restoreMemory,
  contextMemory,
  extractMemory,
  listMemorySources,
  listMemoryJobs,
  getMemoryJob,
  listMemoryDrafts,
  getMemoryDraft,
  updateMemoryDraft,
  deleteMemoryDraft,
  submitMemoryDraft,
  listMemoryCandidates,
  getMemoryCandidate,
  submitMemoryCandidate,
  approveMemoryCandidate,
  rejectMemoryCandidate,
  withdrawMemoryCandidate,
  resubmitMemoryCandidate,
  getMemorySettings,
  updateMemorySettings,
  retiredSubmitCandidates,
  retiredPendingList,
  retiredPendingApprove,
  retiredPendingReject,
  retiredOrganize,
  retiredDefaultGet,
  retiredDefaultSave,
  retiredDefaultClear,
  retiredMarkUsed,
  retiredWriteContext,
};

const commands: Command[] = [
  listMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
  historyMemory,
  pinMemory,
  unpinMemory,
  restoreMemory,
  contextMemory,
  extractMemory,
  listMemorySources,
  listMemoryJobs,
  getMemoryJob,
  listMemoryDrafts,
  getMemoryDraft,
  updateMemoryDraft,
  deleteMemoryDraft,
  submitMemoryDraft,
  listMemoryCandidates,
  getMemoryCandidate,
  submitMemoryCandidate,
  approveMemoryCandidate,
  rejectMemoryCandidate,
  withdrawMemoryCandidate,
  resubmitMemoryCandidate,
  getMemorySettings,
  updateMemorySettings,
  retiredSubmitCandidates,
  retiredPendingList,
  retiredPendingApprove,
  retiredPendingReject,
  retiredOrganize,
  retiredDefaultGet,
  retiredDefaultSave,
  retiredDefaultClear,
  retiredMarkUsed,
  retiredWriteContext,
];

export default commands;
