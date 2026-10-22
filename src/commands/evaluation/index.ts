import type { Command } from '../../framework/types.js';
import { listDatasets } from './list-datasets.js';
import { getDataset } from './get-dataset.js';
import { createDataset } from './create-dataset.js';
import { importDataset } from './import-dataset.js';
import { datasetImportStatus } from './dataset-import-status.js';
import { datasetImportErrors } from './dataset-import-errors.js';
import { updateDataset } from './update-dataset.js';
import { deleteDataset } from './delete-dataset.js';
import { transferDatasetOwner } from './transfer-dataset-owner.js';
import { listDatasetFields } from './list-dataset-fields.js';
import { createDatasetField } from './create-dataset-field.js';
import { batchCreateDatasetFields } from './batch-create-dataset-fields.js';
import { updateDatasetField } from './update-dataset-field.js';
import { deleteDatasetField } from './delete-dataset-field.js';
import { reorderDatasetFields } from './reorder-dataset-fields.js';
import { listDatasetCases } from './list-dataset-cases.js';
import { getDatasetCase } from './get-dataset-case.js';
import { createDatasetCase } from './create-dataset-case.js';
import { batchCreateDatasetCases } from './batch-create-dataset-cases.js';
import { updateDatasetCase } from './update-dataset-case.js';
import { deleteDatasetCase } from './delete-dataset-case.js';
import { exportDataset } from './export-dataset.js';
import { listDatasetVersions } from './list-dataset-versions.js';
import { publishDatasetVersion } from './publish-dataset-version.js';
import { getDatasetVersion } from './get-dataset-version.js';
import { listDatasetReferences } from './list-dataset-references.js';
import { listEvaluators } from './list-evaluators.js';
import { getEvaluator } from './get-evaluator.js';
import { createEvaluator } from './create-evaluator.js';
import { updateEvaluator } from './update-evaluator.js';
import { deleteEvaluator } from './delete-evaluator.js';
import { transferEvaluatorOwner } from './transfer-evaluator-owner.js';
import { listEvaluatorTemplates } from './list-evaluator-templates.js';
import { createEvaluatorTemplate } from './create-evaluator-template.js';
import { disableEvaluatorTemplate } from './disable-evaluator-template.js';
import { listEvaluatorVersions } from './list-evaluator-versions.js';
import { publishEvaluatorVersion } from './publish-evaluator-version.js';
import { optimizeEvaluatorPrompt } from './optimize-evaluator-prompt.js';
import { getEvaluatorHealth } from './get-evaluator-health.js';
import { listCalibrationSuites } from './list-calibration-suites.js';
import { createCalibrationSuite } from './create-calibration-suite.js';
import { listCalibrationCases } from './list-calibration-cases.js';
import { createCalibrationCase } from './create-calibration-case.js';
import { deleteCalibrationCase } from './delete-calibration-case.js';
import { startCalibrationRun } from './start-calibration-run.js';
import { getCalibrationRun } from './get-calibration-run.js';
import { listCalibrationResults } from './list-calibration-results.js';
import { listRuns } from './list-runs.js';
import { getRun } from './get-run.js';
import { createRun } from './create-run.js';
import { updateRun } from './update-run.js';
import { deleteRun } from './delete-run.js';
import { selectRunEvaluators } from './select-run-evaluators.js';
import { listRunEvaluators } from './list-run-evaluators.js';
import { updateRunFieldMapping } from './update-run-field-mapping.js';
import { updateRunResultFilterFields } from './update-run-result-filter-fields.js';
import { validateRun } from './validate-run.js';
import { startRun } from './start-run.js';
import { cancelRun } from './cancel-run.js';
import { runOverview } from './run-overview.js';
import { runCases } from './run-cases.js';
import { getRunCase } from './get-run-case.js';
import { exportRunResults } from './export-run-results.js';
import { exportRunLowScores } from './export-run-low-scores.js';
import { fileDownloadUrl } from './file-download-url.js';
import { getFile } from './get-file.js';
import { createNextTaskVersionDraft } from './create-next-task-version-draft.js';
import { listEvaluationTaskVersions } from './list-evaluation-task-versions.js';
import { retryFailedRunCases } from './retry-failed-run-cases.js';
import { getRunCaseTrace } from './get-run-case-trace.js';
import { retryRunCaseTrace } from './retry-run-case-trace.js';
import { runDistribution } from './run-distribution.js';
import { copyRunCase } from './copy-run-case.js';
import { transferRunOwner } from './transfer-run-owner.js';
import { listSchedules } from './list-schedules.js';
import { createSchedule } from './create-schedule.js';
import { updateSchedule } from './update-schedule.js';
import { deleteSchedule } from './delete-schedule.js';
import { getTeReportConfig } from './get-te-report-config.js';
import { saveTeReportConfig } from './save-te-report-config.js';
import { getAiMonitorConnection } from './get-ai-monitor-connection.js';
import { saveAiMonitorConnection } from './save-ai-monitor-connection.js';
import { verifyAiMonitorConnection } from './verify-ai-monitor-connection.js';
import { importAiMonitorTraces } from './import-ai-monitor-traces.js';
import { listTeClaudeCatalog } from './list-te-claude-catalog.js';
import { listProjectMembers } from './list-project-members.js';
import { listModelConfigs } from './list-model-configs.js';
import { getModelConfig } from './get-model-config.js';
import { createModelConfig } from './create-model-config.js';
import { updateModelConfig } from './update-model-config.js';
import { deleteModelConfig } from './delete-model-config.js';
import { testModelConfigConnectivity } from './test-model-config-connectivity.js';
import { transferModelConfigOwner } from './transfer-model-config-owner.js';
import { listAgents } from './list-agents.js';
import { getAgent } from './get-agent.js';
import { createAgent } from './create-agent.js';
import { updateAgent } from './update-agent.js';
import { deleteAgent } from './delete-agent.js';
import { testAgentConnectivity } from './test-agent-connectivity.js';
import { agentSnapshotPreview } from './agent-snapshot-preview.js';
import { transferAgentOwner } from './transfer-agent-owner.js';
import { listCredentials } from './list-credentials.js';
import { getCredential } from './get-credential.js';
import { createCredential } from './create-credential.js';
import { updateCredential } from './update-credential.js';
import { rotateCredential } from './rotate-credential.js';
import { disableCredential } from './disable-credential.js';
import { enableCredential } from './enable-credential.js';
import { deleteCredential } from './delete-credential.js';
import { transferCredentialOwner } from './transfer-credential-owner.js';

import { changeDatasetAccessScope } from './change-dataset-access-scope.js';
import { changeEvaluatorAccessScope } from './change-evaluator-access-scope.js';
import { changeModelConfigAccessScope } from './change-model-config-access-scope.js';
import { changeAgentAccessScope } from './change-agent-access-scope.js';
import { enableEvaluatorTemplate } from './enable-evaluator-template.js';
import { listProjectMemberCandidates } from './list-project-member-candidates.js';
import { batchAddProjectMembers } from './batch-add-project-members.js';
import { changeProjectMemberRole } from './change-project-member-role.js';
import { setProjectMemberStatus } from './set-project-member-status.js';
import { removeProjectMember } from './remove-project-member.js';
import { downloadFile } from './download-file.js';

const commands: Command[] = [
  changeDatasetAccessScope,
  changeEvaluatorAccessScope,
  changeModelConfigAccessScope,
  changeAgentAccessScope,
  enableEvaluatorTemplate,
  listProjectMemberCandidates,
  batchAddProjectMembers,
  changeProjectMemberRole,
  setProjectMemberStatus,
  removeProjectMember,
  downloadFile,

  listDatasets,
  getDataset,
  createDataset,
  importDataset,
  datasetImportStatus,
  datasetImportErrors,
  updateDataset,
  deleteDataset,
  transferDatasetOwner,
  listDatasetFields,
  createDatasetField,
  batchCreateDatasetFields,
  updateDatasetField,
  deleteDatasetField,
  reorderDatasetFields,
  listDatasetCases,
  getDatasetCase,
  createDatasetCase,
  batchCreateDatasetCases,
  updateDatasetCase,
  deleteDatasetCase,
  exportDataset,
  listDatasetVersions,
  publishDatasetVersion,
  getDatasetVersion,
  listDatasetReferences,
  listEvaluators,
  getEvaluator,
  createEvaluator,
  updateEvaluator,
  deleteEvaluator,
  transferEvaluatorOwner,
  listEvaluatorTemplates,
  createEvaluatorTemplate,
  disableEvaluatorTemplate,
  listEvaluatorVersions,
  publishEvaluatorVersion,
  optimizeEvaluatorPrompt,
  getEvaluatorHealth,
  listCalibrationSuites,
  createCalibrationSuite,
  listCalibrationCases,
  createCalibrationCase,
  deleteCalibrationCase,
  startCalibrationRun,
  getCalibrationRun,
  listCalibrationResults,
  listRuns,
  getRun,
  createRun,
  updateRun,
  deleteRun,
  selectRunEvaluators,
  listRunEvaluators,
  updateRunFieldMapping,
  updateRunResultFilterFields,
  validateRun,
  startRun,
  cancelRun,
  runOverview,
  runCases,
  getRunCase,
  exportRunResults,
  exportRunLowScores,
  fileDownloadUrl,
  getFile,
  createNextTaskVersionDraft,
  listEvaluationTaskVersions,
  retryFailedRunCases,
  getRunCaseTrace,
  retryRunCaseTrace,
  runDistribution,
  copyRunCase,
  transferRunOwner,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getTeReportConfig,
  saveTeReportConfig,
  getAiMonitorConnection,
  saveAiMonitorConnection,
  verifyAiMonitorConnection,
  importAiMonitorTraces,
  listTeClaudeCatalog,
  listProjectMembers,
  listModelConfigs,
  getModelConfig,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  testModelConfigConnectivity,
  transferModelConfigOwner,
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  testAgentConnectivity,
  agentSnapshotPreview,
  transferAgentOwner,
  listCredentials,
  getCredential,
  createCredential,
  updateCredential,
  rotateCredential,
  disableCredential,
  enableCredential,
  deleteCredential,
  transferCredentialOwner,
];

export default commands;
export {
  changeDatasetAccessScope,
  changeEvaluatorAccessScope,
  changeModelConfigAccessScope,
  changeAgentAccessScope,
  enableEvaluatorTemplate,
  listProjectMemberCandidates,
  batchAddProjectMembers,
  changeProjectMemberRole,
  setProjectMemberStatus,
  removeProjectMember,
  downloadFile,

  listDatasets,
  getDataset,
  createDataset,
  importDataset,
  datasetImportStatus,
  datasetImportErrors,
  updateDataset,
  deleteDataset,
  transferDatasetOwner,
  listDatasetFields,
  createDatasetField,
  batchCreateDatasetFields,
  updateDatasetField,
  deleteDatasetField,
  reorderDatasetFields,
  listDatasetCases,
  getDatasetCase,
  createDatasetCase,
  batchCreateDatasetCases,
  updateDatasetCase,
  deleteDatasetCase,
  exportDataset,
  listDatasetVersions,
  publishDatasetVersion,
  getDatasetVersion,
  listDatasetReferences,
  listEvaluators,
  getEvaluator,
  createEvaluator,
  updateEvaluator,
  deleteEvaluator,
  transferEvaluatorOwner,
  listEvaluatorTemplates,
  createEvaluatorTemplate,
  disableEvaluatorTemplate,
  listEvaluatorVersions,
  publishEvaluatorVersion,
  optimizeEvaluatorPrompt,
  getEvaluatorHealth,
  listCalibrationSuites,
  createCalibrationSuite,
  listCalibrationCases,
  createCalibrationCase,
  deleteCalibrationCase,
  startCalibrationRun,
  getCalibrationRun,
  listCalibrationResults,
  listRuns,
  getRun,
  createRun,
  updateRun,
  deleteRun,
  selectRunEvaluators,
  listRunEvaluators,
  updateRunFieldMapping,
  updateRunResultFilterFields,
  validateRun,
  startRun,
  cancelRun,
  runOverview,
  runCases,
  getRunCase,
  exportRunResults,
  exportRunLowScores,
  fileDownloadUrl,
  getFile,
  createNextTaskVersionDraft,
  listEvaluationTaskVersions,
  retryFailedRunCases,
  getRunCaseTrace,
  retryRunCaseTrace,
  runDistribution,
  copyRunCase,
  transferRunOwner,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getTeReportConfig,
  saveTeReportConfig,
  getAiMonitorConnection,
  saveAiMonitorConnection,
  verifyAiMonitorConnection,
  importAiMonitorTraces,
  listTeClaudeCatalog,
  listProjectMembers,
  listModelConfigs,
  getModelConfig,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  testModelConfigConnectivity,
  transferModelConfigOwner,
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  testAgentConnectivity,
  agentSnapshotPreview,
  transferAgentOwner,
  listCredentials,
  getCredential,
  createCredential,
  updateCredential,
  rotateCredential,
  disableCredential,
  enableCredential,
  deleteCredential,
  transferCredentialOwner,
};
