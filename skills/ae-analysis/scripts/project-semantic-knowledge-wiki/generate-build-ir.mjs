#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const packageRoot = path.resolve(requiredArg(args, 'asset-package'));
const domainPlanPath = path.resolve(requiredArg(args, 'domain-plan'));
const outputRoot = path.resolve(requiredArg(args, 'output'));
const force = Boolean(args.force);
const allowTruncated = Boolean(args['allow-truncated']);
const allowAllVisible = Boolean(args['allow-all-visible']);
const allowSemanticPlanSnapshotDrift = Boolean(args['allow-semantic-plan-snapshot-drift']);

assertSafePaths(packageRoot, outputRoot);

const descriptor = readObject(path.join(packageRoot, '.asset-package.json'), 'asset package descriptor');
const manifest = readObject(path.join(packageRoot, 'manifest.json'), 'asset package manifest');
if (String(descriptor.schema_version ?? manifest.schema_version) !== '3.0') {
  fail('Project semantic asset package schema 3.0 is required. Re-export it from the updated Common service.');
}
if ((descriptor.truncated === true || manifest.truncated === true) && !allowTruncated) {
  fail('The asset package is truncated. Re-export a complete package or pass --allow-truncated explicitly.');
}
const assetScope = text(descriptor.asset_scope ?? manifest.asset_scope);
const filterPolicy = object(descriptor.filter_policy ?? manifest.filter_policy);
if (assetScope === 'governed') {
  if (filterPolicy.authenticated_entry_assets_only !== true || filterPolicy.dependency_closure !== true) {
    fail('The governed asset package must declare authenticated_entry_assets_only=true and dependency_closure=true.');
  }
} else if (assetScope === 'all_visible') {
  if (!allowAllVisible) {
    fail('The primary knowledge corpus defaults to asset_scope=governed. Pass --allow-all-visible only when the user explicitly requested all visible assets.');
  }
} else {
  fail(`The primary knowledge corpus supports asset_scope=governed by default or asset_scope=all_visible with --allow-all-visible, received ${assetScope || 'unknown'}.`);
}

const projectId = Number(descriptor.project_id ?? manifest.project_id);
if (!Number.isInteger(projectId) || projectId < 1) fail('The asset package is missing a valid project_id.');
const snapshotHash = text(descriptor.snapshot_hash);
if (!/^[0-9a-f]{64}$/i.test(snapshotHash)) fail('The asset package descriptor is missing a valid snapshot_hash.');
const projectName = text(args['project-name'] ?? descriptor.project_name ?? manifest.project_name)
  || `Project ${projectId}`;

const containers = rows('asset-containers');
const dashboards = rows('dashboard-catalog');
const reports = rows('report-catalog');
const metrics = rows('metric-catalog');
const metadata = readJsonl(path.join(packageRoot, 'metadata', 'analysis-selectable.jsonl'))
  .filter((row) => row.record_type !== 'header')
  .map(normalizeMetadata);
if (dashboards.length + reports.length + metrics.length === 0) fail('The knowledge catalogs are empty.');
const unauthenticatedDashboards = dashboards.filter((row) => row.authenticated !== true);
if (assetScope === 'governed' && unauthenticatedDashboards.length) {
  fail(`The governed asset package contains ${unauthenticatedDashboards.length} unauthenticated dashboard entry asset(s): `
    + `${unauthenticatedDashboards.slice(0, 20).map((row) => text(row.resource_key)).join(', ')}.`);
}

const dashboardById = index(dashboards, 'resource_key');
const reportById = index(reports, 'resource_key');
validatePackageReferenceIntegrity();
const dashboardFiles = fileMap(dashboards, 'resource_key', 'dashboard');
const reportFiles = fileMap(reports, 'resource_key', 'report');
const metricFiles = fileMap(metrics, 'resource_key', 'metric');
const containerFiles = fileMap(containers, 'container_key', 'container');
const metadataFiles = fileMap(metadata, 'evidence_id', 'metadata');
const metadataByResourceKey = groupBy(metadata, 'resource_key');
const metadataUsageByEvidenceId = metadataUsage();
const metadataMetricUsageByEvidenceId = metadataMetricUsage();
const packageJsonCache = new Map();

const domainPlan = readObject(domainPlanPath, 'business domain plan');
const classifications = validateAndEnrichDomainPlan(domainPlan);
const domains = classifications.domains;
const appendices = classifications.appendices;
const projectBusinessModel = classifications.project_business_model;
const domainByDashboardId = new Map();
for (const domain of domains) {
  for (const id of domain.dashboard_ids) domainByDashboardId.set(id, domain);
}
const appendixByDashboardId = new Map();
for (const appendix of appendices) {
  for (const id of appendix.dashboard_ids) appendixByDashboardId.set(id, appendix);
}
const domainFiles = fileMap(domains, 'domain_id', 'domain');
const appendixFiles = fileMap(appendices, 'appendix_id', 'appendix');
const standaloneReports = reports.filter((row) => row.standalone === true);
const unassignedDashboards = dashboards.filter((row) =>
  text(object(row.source_container_ref).container_kind) === 'unassigned');
const physicalContainers = containers.filter((row) => text(row.container_kind) === 'dashboard_space');
const technicalContainers = containers.filter((row) => text(row.container_kind) !== 'dashboard_space');
const sharedDashboards = dashboards.filter((row) =>
  text(object(row.source_container_ref).container_kind) === 'shared_assets');
const reportMetricOccurrences = reports.reduce((sum, row) => sum + array(row.metric_occurrences).length, 0);
const sqlReports = reports.filter((row) => row.definition_kind === 'SQL');
const sqlReportSemanticsById = new Map(array(domainPlan.sql_report_semantics)
  .map((value) => object(value))
  .map((value) => [text(value.report_id), value])
  .filter(([id]) => id));
const semanticConflicts = detectSemanticConflicts();
const reportConflicts = semanticConflicts.reportConflicts;
const metadataSemanticConflicts = semanticConflicts.metadataConflicts;
const metadataMissingTitles = metadata.filter((item) => !text(item.title));
const reportsInBusinessDomains = reports.filter((report) => domainsForReport(report).length);
const reportsInTechnicalAppendices = reports.filter((report) => appendicesForReport(report).length);
const warnings = [
  ...(text(descriptor.asset_scope ?? manifest.asset_scope) !== 'governed'
    ? [`The package scope is ${text(descriptor.asset_scope ?? manifest.asset_scope) || 'unknown'}; unauthenticated assets may be present.`]
    : []),
  ...(unassignedDashboards.length > 0
    ? [`${unassignedDashboards.length} dashboards have no physical dashboard-space placement.`]
    : []),
  ...(standaloneReports.length > 0
    ? [`${standaloneReports.length} reports are not referenced by a dashboard and therefore have no inferred business domain.`]
    : []),
  ...(reportConflicts.size > 0
    ? [`${reportConflicts.size} assets have detectable semantic conflicts.`]
    : []),
  ...(metadataMissingTitles.length > 0
    ? [`${metadataMissingTitles.length} metadata items have no source title and use their technical resource key.`]
    : []),
];
const domainPlanHash = createHash('sha256').update(fs.readFileSync(domainPlanPath)).digest('hex');
const corpus = {
  schema_version: '3.0',
  corpus_kind: 'ae_project_asset_raw_sources',
  project_id: projectId,
  project_name: projectName,
  snapshot_id: descriptor.snapshot_id ?? null,
  snapshot_hash: snapshotHash,
  asset_scope: assetScope,
  truncated: Boolean(descriptor.truncated ?? manifest.truncated),
  business_domain_source: 'agent-authored semantic plan validated against every dashboard in the asset package',
  business_domain_plan_hash: domainPlanHash,
  project_business_model: projectBusinessModel,
  counts: {
    business_domains: domains.length,
    technical_appendices: appendices.length,
    source_dashboard_spaces: physicalContainers.length,
    technical_containers: technicalContainers.length,
    dashboards: dashboards.length,
    dashboards_in_business_domains: domainByDashboardId.size,
    dashboards_in_technical_appendices: appendixByDashboardId.size,
    dashboards_classified_once: domainByDashboardId.size + appendixByDashboardId.size,
    shared_dashboards: sharedDashboards.length,
    unassigned_dashboards: unassignedDashboards.length,
    reports: reports.length,
    reports_linked_to_dashboards: reports.length - standaloneReports.length,
    reports_in_business_domains: reportsInBusinessDomains.length,
    reports_in_technical_appendices: reportsInTechnicalAppendices.length,
    standalone_reports: standaloneReports.length,
    reusable_metrics: metrics.length,
    analysis_metadata: metadata.length,
    metadata_type_counts: valueCounts(metadata, 'resource_type'),
    authenticated_assets: count(descriptor.authenticated_asset_count ?? manifest.authenticated_asset_count),
    unauthenticated_dependencies: count(descriptor.unauthenticated_asset_count ?? manifest.unauthenticated_asset_count),
    authenticated_reports: reports.filter((row) => row.authenticated === true).length,
    unauthenticated_reports: reports.filter((row) => row.authenticated !== true).length,
    authenticated_metadata: metadata.filter((row) => row.authenticated === true).length,
    unauthenticated_metadata: metadata.filter((row) => row.authenticated !== true).length,
    semantic_conflict_reports: reportConflicts.size,
    semantic_conflict_metadata: metadataSemanticConflicts.size,
    metadata_missing_source_titles: metadataMissingTitles.length,
    report_metric_occurrences: reportMetricOccurrences,
    sql_reports: sqlReports.length,
  },
  warnings,
};

materialize(outputRoot, force, (staging) => {
  for (const directory of [
    '_source', 'domains', 'appendices', 'source-containers', 'dashboards', 'reports', 'metrics', 'indexes',
    'metadata', 'briefs/domains', 'briefs/dashboards', 'briefs/reports', 'briefs/metrics', 'briefs/metadata',
  ]) fs.mkdirSync(path.join(staging, directory), { recursive: true });
  for (const type of [...new Set(metadata.map((row) => metadataDirectory(row.resource_type)))]) {
    fs.mkdirSync(path.join(staging, 'metadata', type), { recursive: true });
    fs.mkdirSync(path.join(staging, 'briefs', 'metadata', type), { recursive: true });
  }

  fs.copyFileSync(path.join(packageRoot, '.asset-package.json'), path.join(staging, '_source', 'asset-package.json'));
  fs.copyFileSync(path.join(packageRoot, 'manifest.json'), path.join(staging, '_source', 'manifest.json'));
  fs.copyFileSync(path.join(packageRoot, 'metadata', 'analysis-selectable.jsonl'),
    path.join(staging, '_source', 'analysis-selectable.jsonl'));
  fs.copyFileSync(domainPlanPath, path.join(staging, '_source', 'business-domain-plan.json'));
  for (const name of ['asset-containers', 'dashboard-catalog', 'report-catalog', 'metric-catalog']) {
    fs.copyFileSync(path.join(packageRoot, 'indexes', `${name}.jsonl`), path.join(staging, '_source', `${name}.jsonl`));
  }
  writeJson(path.join(staging, 'corpus.json'), corpus);
  writeText(path.join(staging, 'index.md'), renderRootIndex());

  for (const domain of domains) {
    const key = text(domain.domain_id);
    writeText(path.join(staging, 'domains', domainFiles.get(key)), renderDomainSource(domain));
    writeText(path.join(staging, 'briefs', 'domains', domainFiles.get(key)), renderDomainBrief(domain));
  }
  for (const appendix of appendices) {
    const key = text(appendix.appendix_id);
    writeText(path.join(staging, 'appendices', appendixFiles.get(key)), renderAppendixSource(appendix));
  }
  for (const container of sort(containers, 'container_key')) {
    const key = text(container.container_key);
    writeText(path.join(staging, 'source-containers', containerFiles.get(key)), renderContainerSource(container));
  }
  for (const dashboard of sort(dashboards, 'resource_key')) {
    const id = text(dashboard.resource_key);
    writeText(path.join(staging, 'dashboards', dashboardFiles.get(id)), renderDashboardSource(dashboard));
    writeText(path.join(staging, 'briefs', 'dashboards', dashboardFiles.get(id)), renderDashboardBrief(dashboard));
  }
  for (const report of sort(reports, 'resource_key')) {
    const id = text(report.resource_key);
    writeText(path.join(staging, 'reports', reportFiles.get(id)), renderReportSource(report));
    writeText(path.join(staging, 'briefs', 'reports', reportFiles.get(id)), renderReportBrief(report));
  }
  for (const metric of sort(metrics, 'resource_key')) {
    const id = text(metric.resource_key);
    writeText(path.join(staging, 'metrics', metricFiles.get(id)), renderMetricSource(metric));
    writeText(path.join(staging, 'briefs', 'metrics', metricFiles.get(id)), renderMetricBrief(metric));
  }
  for (const item of sort(metadata, 'evidence_id')) {
    const id = text(item.evidence_id);
    const directory = metadataDirectory(item.resource_type);
    writeText(path.join(staging, 'metadata', directory, metadataFiles.get(id)), renderMetadataSource(item));
    writeText(path.join(staging, 'briefs', 'metadata', directory, metadataFiles.get(id)), renderMetadataBrief(item));
  }

  writeText(path.join(staging, 'domains', 'index.md'), renderAssetIndex('Business domains', domains, domainFiles, 'domain_id'));
  writeText(path.join(staging, 'appendices', 'index.md'), renderAssetIndex('Technical appendices', appendices, appendixFiles, 'appendix_id'));
  writeText(path.join(staging, 'source-containers', 'index.md'), renderAssetIndex('Source containers', containers, containerFiles, 'container_key'));
  writeText(path.join(staging, 'dashboards', 'index.md'), renderAssetIndex('Dashboards', dashboards, dashboardFiles));
  writeText(path.join(staging, 'reports', 'index.md'), renderAssetIndex('Reports', reports, reportFiles));
  writeText(path.join(staging, 'metrics', 'index.md'), renderAssetIndex('Reusable metrics', metrics, metricFiles));
  writeText(path.join(staging, 'metadata', 'index.md'), renderMetadataIndex(false));
  writeText(path.join(staging, 'briefs', 'index.md'), renderBriefIndex());
  writeText(path.join(staging, 'briefs', 'domains', 'index.md'), renderBriefList('Business domain briefs', domains, domainFiles, 'domain_id'));
  writeText(path.join(staging, 'briefs', 'dashboards', 'index.md'), renderBriefList('Dashboard briefs', dashboards, dashboardFiles));
  writeText(path.join(staging, 'briefs', 'reports', 'index.md'), renderBriefList('Report briefs', reports, reportFiles));
  writeText(path.join(staging, 'briefs', 'metrics', 'index.md'), renderBriefList('Metric briefs', metrics, metricFiles));
  writeText(path.join(staging, 'briefs', 'metadata', 'index.md'), renderMetadataIndex(true));
  writeText(path.join(staging, 'indexes', 'coverage.md'), renderCoverage());
});

process.stdout.write(`${JSON.stringify({ output_path: outputRoot, ...corpus }, null, 2)}\n`);

function validateAndEnrichDomainPlan(plan) {
  if (!['1.0', '2.0'].includes(text(plan.schema_version))) {
    fail('Business domain plan schema 1.0 or project semantic Wiki plan schema 2.0 is required.');
  }
  if (text(plan.source_snapshot_hash) !== snapshotHash && !allowSemanticPlanSnapshotDrift) {
    fail(`Business domain plan snapshot mismatch: expected ${snapshotHash}.`);
  }
  if (text(plan.generation_method) !== 'agent_semantic_synthesis') {
    fail('Business domain plan generation_method must be agent_semantic_synthesis.');
  }
  const domainValues = array(plan.domains);
  const appendixValues = array(plan.appendices);
  if (!domainValues.length) fail('Business domain plan must contain at least one domain.');
  const domainIds = new Set();
  const domainTitles = new Set();
  const appendixIds = new Set();
  const appendixTitles = new Set();
  const assigned = new Map();
  const technicalKeys = new Set(technicalContainerIdentityValues());
  const enrichedDomains = domainValues.map((value, domainIndex) => {
    const domain = object(value);
    const id = text(domain.domain_id);
    const title = text(domain.title);
    const summary = text(domain.summary);
    const rationale = text(domain.merge_rationale);
    const questions = array(domain.primary_questions).map(text).filter(Boolean);
    const primaryMetrics = normalizeAgentAuthoredDomainFacts(domain.primary_metrics);
    const drilldownDimensions = normalizeAgentAuthoredDomainFacts(domain.drilldown_dimensions);
    const dashboardIds = array(domain.dashboard_ids).map(text).filter(Boolean);
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(id)) fail(`Domain ${domainIndex + 1} has an invalid domain_id: ${id || '<empty>'}.`);
    if (!title) fail(`Domain ${id} is missing title.`);
    if (!summary) fail(`Domain ${id} is missing summary.`);
    if (!rationale) fail(`Domain ${id} is missing merge_rationale.`);
    if (!questions.length) fail(`Domain ${id} is missing primary_questions.`);
    if (!primaryMetrics.length) fail(`Domain ${id} is missing agent-authored primary_metrics.`);
    if (!drilldownDimensions.length) fail(`Domain ${id} is missing agent-authored drilldown_dimensions.`);
    if (!dashboardIds.length) fail(`Domain ${id} does not assign any dashboards.`);
    const normalizedTitle = title.normalize('NFKC').toLocaleLowerCase('zh-CN');
    if (domainIds.has(id)) fail(`Business domain plan contains duplicate domain_id: ${id}.`);
    if (domainTitles.has(normalizedTitle)) fail(`Business domain plan contains duplicate domain title: ${title}.`);
    if (technicalKeys.has(id) || technicalKeys.has(normalizedTitle)) {
      fail(`Technical source container cannot be used as a business domain: ${title} (${id}).`);
    }
    domainIds.add(id);
    domainTitles.add(normalizedTitle);
    for (const dashboardId of dashboardIds) {
      if (!dashboardById.has(dashboardId)) fail(`Domain ${id} references unknown dashboard_id: ${dashboardId}.`);
      if (assigned.has(dashboardId)) {
        fail(`Dashboard ${dashboardId} is assigned to both ${assigned.get(dashboardId)} and ${id}.`);
      }
      assigned.set(dashboardId, id);
    }
    assertAgentAuthoredDomain(domain, `Domain ${id}`);
    const dashboardRows = dashboardIds.map((dashboardId) => dashboardById.get(dashboardId));
    const sourceContainerRefs = uniqueObjects(dashboardRows.map((row) => object(row.source_container_ref)), 'container_key');
    const reportRefs = uniqueObjects(dashboardRows.flatMap((row) => array(row.report_refs)), 'report_id');
    const reportIds = new Set(reportRefs.map((ref) => text(ref.report_id)).filter(Boolean));
    const metricIds = new Set(reports
      .filter((report) => reportIds.has(text(report.resource_key)))
      .flatMap((report) => array(report.metric_occurrences).map((item) => text(item.metric_key)).filter(Boolean)));
    return {
      domain_id: id,
      title,
      summary,
      primary_questions: questions,
      primary_metrics: primaryMetrics,
      drilldown_dimensions: drilldownDimensions,
      domain_judgment_model: normalizeDomainJudgmentModel(domain.domain_judgment_model, id,
        new Set(dashboardIds), reportIds, metricIds),
      merge_rationale: rationale,
      dashboard_ids: dashboardIds,
      dashboard_refs: dashboardRows.map((row) => ({
        dashboard_id: text(row.resource_key),
        dashboard_name: text(row.title),
        report_count: array(row.report_refs).length,
      })),
      source_container_refs: sourceContainerRefs,
      report_refs: reportRefs,
    };
  });
  const enrichedAppendices = appendixValues.map((value, appendixIndex) => {
    const appendix = object(value);
    const id = text(appendix.appendix_id);
    const title = text(appendix.title);
    const summary = text(appendix.summary);
    const rationale = text(appendix.selection_rationale);
    const dashboardIds = array(appendix.dashboard_ids).map(text).filter(Boolean);
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(id)) fail(`Appendix ${appendixIndex + 1} has an invalid appendix_id: ${id || '<empty>'}.`);
    if (!title) fail(`Appendix ${id} is missing title.`);
    if (!summary) fail(`Appendix ${id} is missing summary.`);
    if (!rationale) fail(`Appendix ${id} is missing selection_rationale.`);
    if (!dashboardIds.length) fail(`Appendix ${id} does not assign any dashboards.`);
    const normalizedTitle = title.normalize('NFKC').toLocaleLowerCase('zh-CN');
    if (appendixIds.has(id) || domainIds.has(id)) fail(`Business domain plan contains duplicate classification id: ${id}.`);
    if (appendixTitles.has(normalizedTitle) || domainTitles.has(normalizedTitle)) {
      fail(`Business domain plan contains duplicate classification title: ${title}.`);
    }
    appendixIds.add(id);
    appendixTitles.add(normalizedTitle);
    for (const dashboardId of dashboardIds) {
      if (!dashboardById.has(dashboardId)) fail(`Appendix ${id} references unknown dashboard_id: ${dashboardId}.`);
      if (assigned.has(dashboardId)) {
        fail(`Dashboard ${dashboardId} is assigned to both ${assigned.get(dashboardId)} and appendix:${id}.`);
      }
      assigned.set(dashboardId, `appendix:${id}`);
    }
    const dashboardRows = dashboardIds.map((dashboardId) => dashboardById.get(dashboardId));
    return {
      appendix_id: id,
      title,
      summary,
      selection_rationale: rationale,
      dashboard_ids: dashboardIds,
      dashboard_refs: dashboardRows.map((row) => ({
        dashboard_id: text(row.resource_key),
        dashboard_name: text(row.title),
        report_count: array(row.report_refs).length,
      })),
      source_container_refs: uniqueObjects(dashboardRows.map((row) => object(row.source_container_ref)), 'container_key'),
      report_refs: uniqueObjects(dashboardRows.flatMap((row) => array(row.report_refs)), 'report_id'),
    };
  });
  const projectBusinessModel = normalizeProjectBusinessModel(plan.project_business_model, domainIds);
  validateSqlSemanticPlan(plan);
  const missing = dashboards.map((row) => text(row.resource_key)).filter((id) => !assigned.has(id));
  if (missing.length) {
    fail(`Business domain plan does not classify ${missing.length} dashboard(s): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', ...' : ''}.`);
  }
  return {
    project_business_model: projectBusinessModel,
    domains: enrichedDomains.sort((a, b) => a.domain_id.localeCompare(b.domain_id, 'en')),
    appendices: enrichedAppendices.sort((a, b) => a.appendix_id.localeCompare(b.appendix_id, 'en')),
  };
}

function normalizeProjectBusinessModel(value, domainIds) {
  const model = object(value);
  const businessPositioning = text(model.business_positioning);
  const audienceRoles = array(model.audience_roles).map(text).filter(Boolean);
  const businessObjects = array(model.business_objects).map((item, index) => {
    const row = object(item);
    const objectId = text(row.object_id);
    const name = text(row.name);
    const meaning = text(row.meaning);
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(objectId)) fail(`project_business_model.business_objects[${index}] has invalid object_id.`);
    if (!name || !meaning) fail(`project_business_model.business_objects[${index}] requires name and meaning.`);
    const evidenceRefs = normalizePlanAssetRefs(row.evidence_refs, `business object ${objectId}`);
    if (!evidenceRefs.length) fail(`business object ${objectId} requires evidence_refs.`);
    return { object_id: objectId, name, meaning, evidence_refs: evidenceRefs };
  });
  const objectNames = new Set(businessObjects.map((item) => item.name));
  const objectRelationships = array(model.object_relationships).map((item, index) => {
    const row = object(item);
    const fromObject = text(row.from_object);
    const toObject = text(row.to_object);
    const relationship = text(row.relationship);
    if (!fromObject || !toObject || !relationship) {
      fail(`project_business_model.object_relationships[${index}] requires from_object, to_object and relationship.`);
    }
    if (!objectNames.has(fromObject) || !objectNames.has(toObject)) {
      fail(`object relationship ${fromObject || '<empty>'}->${toObject || '<empty>'} must reference declared business object names.`);
    }
    const evidenceRefs = normalizePlanAssetRefs(row.evidence_refs, `object relationship ${fromObject}->${toObject}`);
    if (!evidenceRefs.length) fail(`object relationship ${fromObject}->${toObject} requires evidence_refs.`);
    return { from_object: fromObject, to_object: toObject, relationship, evidence_refs: evidenceRefs };
  });
  const decisionChains = array(model.decision_chains).map((item, index) => {
    const row = object(item);
    const chainId = text(row.chain_id);
    const title = text(row.title);
    const decisionQuestion = text(row.decision_question);
    const signals = array(row.signals).map(text).filter(Boolean);
    const decisionSteps = array(row.decision_steps).map(text).filter(Boolean);
    const preferredDomainIds = array(row.preferred_domain_ids).map(text).filter(Boolean);
    const assetRefs = normalizePlanAssetRefs(row.asset_refs, `decision chain ${chainId || index + 1}`);
    const boundaries = array(row.boundaries).map(text).filter(Boolean);
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(chainId)) fail(`project_business_model.decision_chains[${index}] has invalid chain_id.`);
    if (!title || !decisionQuestion) fail(`decision chain ${chainId} requires title and decision_question.`);
    if (signals.length < 2) fail(`decision chain ${chainId} requires at least two signals.`);
    if (decisionSteps.length < 2) fail(`decision chain ${chainId} requires at least two decision_steps.`);
    if (!preferredDomainIds.length || preferredDomainIds.some((id) => !domainIds.has(id))) {
      fail(`decision chain ${chainId} must reference existing preferred_domain_ids.`);
    }
    if (!assetRefs.length) fail(`decision chain ${chainId} requires asset_refs.`);
    if (!boundaries.length) fail(`decision chain ${chainId} requires boundaries.`);
    return {
      chain_id: chainId,
      title,
      decision_question: decisionQuestion,
      signals,
      decision_steps: decisionSteps,
      preferred_domain_ids: preferredDomainIds,
      asset_refs: assetRefs,
      requires_live_execution: Boolean(row.requires_live_execution),
      boundaries,
    };
  });
  const nonGoals = array(model.non_goals).map(text).filter(Boolean);
  if (!businessPositioning) fail('project_business_model requires business_positioning.');
  if (!audienceRoles.length) fail('project_business_model requires audience_roles.');
  if (!businessObjects.length) fail('project_business_model requires business_objects.');
  if (!objectRelationships.length) fail('project_business_model requires object_relationships.');
  if (!decisionChains.length) fail('project_business_model requires decision_chains.');
  if (!nonGoals.length) fail('project_business_model requires non_goals.');
  const combined = [
    businessPositioning, ...audienceRoles, ...businessObjects.flatMap((item) => [item.name, item.meaning]),
    ...objectRelationships.map((item) => item.relationship),
    ...decisionChains.flatMap((item) => [item.title, item.decision_question, ...item.signals, ...item.decision_steps, ...item.boundaries]),
    ...nonGoals,
  ].join('\n');
  if (isMechanicalPlanText(combined)) fail('project_business_model looks mechanically generated; Agent must author project-level business semantics from current asset evidence.');
  return {
    business_positioning: businessPositioning,
    audience_roles: audienceRoles,
    business_objects: businessObjects,
    object_relationships: objectRelationships,
    decision_chains: decisionChains,
    non_goals: nonGoals,
  };
}

function normalizeDomainJudgmentModel(value, domainId, domainDashboardIds, domainReportIds, domainMetricIds) {
  const model = object(value);
  const businessStateJudged = text(model.business_state_judged);
  const mainObjects = array(model.main_objects).map(text).filter(Boolean);
  const signals = array(model.signals).map(text).filter(Boolean);
  const decisionPath = array(model.decision_path).map(text).filter(Boolean);
  const boundaries = array(model.boundaries).map(text).filter(Boolean);
  const attachmentLogic = array(model.asset_attachment_logic).map((item, index) => {
    const row = object(item);
    const assetRef = normalizePlanAssetRef(row.asset_ref, `domain ${domainId} asset_attachment_logic[${index}]`);
    const role = text(row.role);
    const reason = text(row.reason);
    if (!['primary_entry', 'supporting_evidence', 'drilldown', 'exclusion'].includes(role)) {
      fail(`domain ${domainId} asset_attachment_logic[${index}] has invalid role.`);
    }
    if (!reason || reason.length < 10) fail(`domain ${domainId} asset_attachment_logic[${index}] requires concrete reason.`);
    const inDomain = assetRef.resource_type === 'dashboard' ? domainDashboardIds.has(assetRef.resource_key)
      : assetRef.resource_type === 'report' ? domainReportIds.has(assetRef.resource_key)
        : assetRef.resource_type === 'metric' ? domainMetricIds.has(assetRef.resource_key) : false;
    if (!inDomain) fail(`domain ${domainId} asset_attachment_logic references ${assetRef.resource_type}:${assetRef.resource_key} outside domain closure.`);
    return { asset_ref: assetRef, role, reason };
  });
  if (!businessStateJudged) fail(`Domain ${domainId} is missing domain_judgment_model.business_state_judged.`);
  if (!mainObjects.length) fail(`Domain ${domainId} is missing domain_judgment_model.main_objects.`);
  if (signals.length < 2) fail(`Domain ${domainId} domain_judgment_model requires at least two signals.`);
  if (decisionPath.length < 2) fail(`Domain ${domainId} domain_judgment_model requires at least two decision_path steps.`);
  if (!attachmentLogic.length) fail(`Domain ${domainId} domain_judgment_model requires asset_attachment_logic.`);
  if (!boundaries.length) fail(`Domain ${domainId} domain_judgment_model requires boundaries.`);
  const combined = [businessStateJudged, ...mainObjects, ...signals, ...decisionPath, ...attachmentLogic.map((item) => item.reason), ...boundaries].join('\n');
  if (isMechanicalPlanText(combined)) fail(`Domain ${domainId} judgment model looks mechanically generated.`);
  return {
    business_state_judged: businessStateJudged,
    main_objects: mainObjects,
    signals,
    decision_path: decisionPath,
    asset_attachment_logic: attachmentLogic,
    boundaries,
  };
}

function normalizePlanAssetRefs(values, label) {
  return array(values).map((value, index) => normalizePlanAssetRef(value, `${label} evidence_refs[${index}]`));
}

function normalizePlanAssetRef(value, label) {
  const ref = object(value);
  const type = text(ref.resource_type);
  const key = text(ref.resource_key);
  const exists = type === 'dashboard' ? dashboardById.has(key)
    : type === 'report' ? reportById.has(key)
      : type === 'metric' ? metrics.some((metric) => text(metric.resource_key) === key) : false;
  if (!exists) fail(`${label} references unknown asset ${type || '<type>'}:${key || '<key>'}.`);
  return { resource_type: type, resource_key: key };
}


function assertAgentAuthoredDomain(domain, label) {
  const values = [domain.title, domain.summary, domain.merge_rationale, ...array(domain.primary_questions)].map(text);
  if (values.some(isMechanicalPlanText)) {
    fail(`${label} looks mechanically generated. Agent must read asset definitions and author business semantics before rendering sources.`);
  }
}

function validateSqlSemanticPlan(plan) {
  const sqlReportsById = new Map(reports.filter((report) => text(report.definition_kind) === 'SQL').map((report) => [text(report.resource_key), report]));
  for (const summaryValue of array(plan.sql_report_semantics)) {
    const summary = object(summaryValue);
    const reportId = text(summary.report_id);
    if (!sqlReportsById.has(reportId)) continue;
    if (text(summary.definition_state) !== 'valid') continue;
    const issues = sqlSemanticQualityIssues(summary);
    if (issues.length) {
      fail(`SQL report ${reportId} semantic summary is not Agent-authored enough: ${issues.slice(0, 6).join('; ')}.`);
    }
  }
}

function sqlSemanticQualityIssues(summary) {
  const issues = [];
  const textFields = [summary.business_purpose, summary.statistical_grain, ...array(summary.applicable_questions), ...array(summary.non_applicable_questions)]
    .map((item) => replaceSqlParameterMentions(renderPlainSemanticItem(item), summary)).join('\n');
  if (isMechanicalPlanText(textFields)) issues.push('contains generic template language');
  for (const [field, values] of Object.entries({
    output_fields: summary.output_fields,
    key_filters: summary.key_filters,
    default_limits: summary.default_limits,
    applicable_questions: summary.applicable_questions,
  })) {
    const rendered = array(values).map((item) => replaceSqlParameterMentions(renderPlainSemanticItem(item), summary)).join('\n');
    if (/sql\s*输出字段|来源表达式|where 条件|order by|group by|\$\{|(?:^|[^a-z0-9_])(?:selector|partdate|variable)\d*(?:$|[^a-z0-9_])/i.test(rendered)) {
      issues.push(`${field} exposes SQL/parser placeholders instead of business text`);
    }
  }
  if (!array(summary.output_fields).some((item) => {
    const row = object(item);
    return usefulSemanticText(row.name ?? row.field ?? row.key ?? row.column ?? row.title)
      && usefulSemanticText(row.meaning ?? row.description ?? row.remark ?? row.purpose);
  })) {
    issues.push('output fields need business names and meanings');
  }
  return issues;
}

function isMechanicalPlanText(value) {
  const normalized = text(value).toLowerCase();
  if (!normalized) return false;
  return /根据报表标题|根据 sql 输出结构|根据 sql 查询|相关明细、汇总或排行|具体范围由 sql 参数决定|用于查看或统计|用于分析.*明细.*趋势|packaged sql report|exact business caliber remains unknown/.test(normalized);
}

function validatePackageReferenceIntegrity() {
  const missingReports = [];
  for (const dashboard of dashboards) {
    for (const ref of array(dashboard.report_refs)) {
      const reportId = text(object(ref).report_id);
      if (reportId && !reportById.has(reportId)) {
        missingReports.push(`${text(dashboard.resource_key)}->${reportId}`);
      }
    }
  }
  const missingDashboards = [];
  for (const report of reports) {
    for (const ref of array(report.dashboard_refs)) {
      const dashboardId = text(object(ref).dashboard_id);
      if (dashboardId && !dashboardById.has(dashboardId)) {
        missingDashboards.push(`${text(report.resource_key)}->${dashboardId}`);
      }
    }
  }
  if (missingReports.length || missingDashboards.length) {
    fail(`Asset package has dangling knowledge-index references: `
      + `${missingReports.length} dashboard-to-report and ${missingDashboards.length} report-to-dashboard. `
      + `Re-export from Common. Examples: ${[...missingReports, ...missingDashboards].slice(0, 12).join(', ')}.`);
  }
}

function technicalContainerIdentityValues() {
  return containers.filter((row) => text(row.container_kind) !== 'dashboard_space').flatMap((row) => [
    text(row.container_key),
    text(row.container_title).normalize('NFKC').toLocaleLowerCase('zh-CN'),
  ]).filter(Boolean);
}

function renderRootIndex() {
  return `---\ntype: project-asset-raw-index\nproject_id: ${projectId}\nproject_name: ${yaml(projectName)}\nsnapshot_hash: ${yaml(snapshotHash)}\n---\n\n# ${heading(projectName)} 项目资产知识原始语料\n\n本目录由项目扫描资产包和同快照的 Agent 业务域规划生成。\`briefs/\` 用于先理解资产解决的问题；事实、精确口径和物理来源以对应源页面为准。\n\n## 浏览入口\n\n- [AI 辅助摘要](briefs/index.md)\n- [业务域资料](domains/index.md)\n- [技术附录](appendices/index.md)\n- [物理来源容器](source-containers/index.md)\n- [看板源资料](dashboards/index.md)\n- [报表源资料](reports/index.md)\n- [可复用指标源资料](metrics/index.md)\n- [分析元数据](metadata/index.md)\n- [覆盖与未归属资产](indexes/coverage.md)\n\n## 快照\n\n- Project ID: ${projectId}\n- 资产范围: ${text(corpus.asset_scope) || 'unknown'}\n- Snapshot hash: \`${snapshotHash}\`\n- Business domain plan hash: \`${domainPlanHash}\`\n- Truncated: ${corpus.truncated}\n\n${countTable()}\n\n${warningSection()}\n`;
}

function renderBriefIndex() {
  return `---\ntype: ai-asset-brief-index\nsummary_kind: evidence_grounded_generated\nproject_id: ${projectId}\nproject_name: ${yaml(projectName)}\nsource_snapshot_hash: ${yaml(snapshotHash)}\n---\n\n# ${heading(projectName)} 资产理解摘要\n\n这一层把结构化资产定义转成“主要讲什么、解决什么问题、包含什么”的阅读入口。业务域由 Agent 跨物理空间综合归类；测试、演示和临时探索类看板可进入技术附录。每张看板必须且只能进入一个业务域或技术附录。摘要不替代原始定义。\n\n## 浏览入口\n\n- [业务域摘要](domains/index.md)\n- [看板摘要](dashboards/index.md)\n- [报表摘要](reports/index.md)\n- [指标摘要](metrics/index.md)\n- [元数据摘要](metadata/index.md)\n\n## 使用规则\n\n- 先读业务域和看板摘要判断应使用哪个资产。\n- 回答指标、过滤条件、时间范围或 SQL 口径时，必须回到页面中的“原始定义”链接核对。\n- 业务域是知识组织层；\`source-containers/\` 才是看板空间、共享资产和未归属等物理来源。\n- \`confidence\` 表示摘要与结构化证据的一致程度，不表示业务认证状态。\n- \`semantic_conflict\` 表示多个资产表达同一业务语义但口径、字段或过滤不同，Agent 不能仅凭名称选择，需要业务域、召回卡或用户确认。\n\n${countTable()}\n\n${warningSection()}\n`;
}

function renderDomainSource(domain) {
  const key = text(domain.domain_id);
  return `---\ntype: project-business-domain-source\nproject_id: ${projectId}\ndomain_id: ${yaml(key)}\ntitle: ${yaml(domain.title)}\nclassification_method: agent_semantic_synthesis\nsnapshot_hash: ${yaml(snapshotHash)}\n---\n\n# ${heading(domain.title)}\n\n${text(domain.summary)}\n\n## 这个域判断什么\n\n${renderDomainJudgmentModel(domain)}\n\n## 主要业务问题\n\n${array(domain.primary_questions).map((question) => `- ${question}`).join('\n')}\n\n## 归类依据\n\n${text(domain.merge_rationale)}\n\n${renderDomainAgentUsageSummary(domain)}\n## 看板（${array(domain.dashboard_refs).length}）\n\n${refLinks(array(domain.dashboard_refs), 'dashboard_id', 'dashboard_name', dashboardFiles, '../dashboards')}\n\n## 涉及报表（${array(domain.report_refs).length}）\n\n${refLinks(array(domain.report_refs), 'report_id', 'report_name', reportFiles, '../reports')}\n\n## 物理来源容器\n\n${containerLinks(domain.source_container_refs, '../source-containers')}\n\n## 规划依据摘要\n\n- Domain ID: \`${key}\`\n- 归类方法: agent_semantic_synthesis\n- 快照: \`${snapshotHash}\`\n- 纳入看板: ${array(domain.dashboard_refs).length}\n- 涉及报表: ${array(domain.report_refs).length}\n- 物理来源容器: ${array(domain.source_container_refs).length}\n`;
}

function renderDomainJudgmentModel(domain) {
  const model = object(domain.domain_judgment_model);
  const attachmentLines = array(model.asset_attachment_logic).map((item) => {
    const row = object(item);
    const ref = object(row.asset_ref);
    const label = domainAssetLabel(ref);
    return `- ${domainAttachmentRoleLabel(row.role)}：${label}。${stripClausePunctuation(row.reason)}`;
  });
  return `- 判断状态：${stripClausePunctuation(model.business_state_judged)}\n- 主要对象：${array(model.main_objects).map(text).filter(Boolean).join('、')}\n- 判断信号：${joinChineseClauses(model.signals)}\n- 判断路径：\n${renderNumberedSteps(model.decision_path, '  ')}\n- 资产挂载：\n${attachmentLines.join('\n') || '  - 无'}\n- 边界：${joinChineseClauses(model.boundaries)}`;
}

function domainAssetLabel(ref) {
  const type = text(ref.resource_type);
  const key = text(ref.resource_key);
  if (type === 'dashboard') {
    const dashboard = dashboardById.get(key);
    const title = text(dashboard?.title) || key;
    return `[${link(title)}](../dashboards/${dashboardFiles.get(key)})（dashboard:${key}）`;
  }
  if (type === 'report') {
    const report = reportById.get(key);
    const title = text(report?.title) || key;
    return `[${link(title)}](../reports/${reportFiles.get(key)})（report:${key}）`;
  }
  if (type === 'metric') {
    const metric = metrics.find((row) => text(row.resource_key) === key);
    const title = text(metric?.title) || key;
    return `[${link(title)}](../metrics/${metricFiles.get(key)})（metric:${key}）`;
  }
  return `${type}:${key}`;
}

function domainAttachmentRoleLabel(value) {
  return ({
    primary_entry: '首选入口',
    supporting_evidence: '辅助证据',
    drilldown: '下钻资产',
    exclusion: '排除资产',
  })[text(value)] ?? text(value);
}

function renderDomainAgentUsageSummary(domain) {
  const reportsInDomain = array(domain.report_refs)
    .map((ref) => reportById.get(text(object(ref).report_id)))
    .filter(Boolean);
  const dashboardLines = array(domain.dashboard_refs).slice(0, 5)
    .map((ref) => `- [${link(text(ref.dashboard_name) || text(ref.dashboard_id))}](../dashboards/${dashboardFiles.get(text(ref.dashboard_id))})`);
  const reportLines = pickRepresentativeReports(reportsInDomain)
    .map((report) => `- [${link(text(report.title) || text(report.resource_key))}](../reports/${reportFiles.get(text(report.resource_key))})`);
  const events = topDomainFacts(reportsInDomain.flatMap(domainReportEvents), 12);
  const metrics = topDomainFacts(array(domain.primary_metrics).map(renderAgentAuthoredDomainFact), 12);
  const dimensions = topDomainFacts(array(domain.drilldown_dimensions).map(renderAgentAuthoredDomainFact), 16);
  const sqlCount = reportsInDomain.filter((report) => text(report.definition_kind) === 'SQL').length;
  const unknownSqlCount = reportsInDomain.filter((report) => text(report.definition_kind) === 'SQL'
    && text(sqlReportSemanticsById.get(text(report.resource_key))?.definition_state) === 'unknown').length;
  const conflictCount = reportsInDomain.filter((report) => reportConflicts.has(text(report.resource_key))).length;
  const boundaryLines = [
    '- 当前数量、客户名单、趋势结果需要实时执行对应看板或报表；知识库只提供路由、口径和使用边界。',
    sqlCount ? `- 本业务域包含 ${sqlCount} 张 SQL 报表；SQL 报表优先使用报表页的 \`Agent 使用摘要\`，不要重新从长 SQL 临场推导。` : '',
    unknownSqlCount ? `- ${unknownSqlCount} 张 SQL 报表语义状态为 unknown，只能作为待核验线索，不能直接回答确定口径。` : '',
    conflictCount ? `- ${conflictCount} 张报表存在语义冲突，回答前必须回到报表页核对冲突说明。` : '',
  ].filter(Boolean);
  return `## Agent 使用摘要\n\n### 主要分析目标\n\n${array(domain.primary_questions).map((question) => `- ${question}`).join('\n')}\n\n### 首选入口\n\n看板：\n${dashboardLines.join('\n') || '- 无'}\n\n主要报表：\n${reportLines.join('\n') || '- 无'}\n\n### 主要事件\n\n${events.map((item) => `- ${item}`).join('\n') || '- 无'}\n\n### 主要指标\n\n${metrics.map((item) => `- ${item}`).join('\n') || '- 无'}\n\n### 常用下钻维度\n\n${dimensions.map((item) => `- ${item}`).join('\n') || '- 无'}\n\n### 使用边界\n\n${boundaryLines.join('\n')}\n\n`;
}

function normalizeAgentAuthoredDomainFacts(values) {
  return array(values).map((value) => {
    if (typeof value === 'string') return cleanSemanticFactForDisplay(value);
    const item = object(value);
    const name = text(item.name ?? item.title ?? item.metric ?? item.dimension ?? item.field);
    const key = text(item.key ?? item.resource_key ?? item.field_key ?? item.event_key);
    const meaning = text(item.meaning ?? item.description ?? item.purpose ?? item.usage);
    if (!name && !key && !meaning) return '';
    return {
      name,
      key,
      meaning,
      source_report_ids: array(item.source_report_ids ?? item.report_ids).map(text).filter(Boolean),
      source_dashboard_ids: array(item.source_dashboard_ids ?? item.dashboard_ids).map(text).filter(Boolean),
    };
  }).filter((value) => {
    if (typeof value === 'string') return Boolean(value);
    return Boolean(value.name || value.key || value.meaning);
  });
}

function renderAgentAuthoredDomainFact(value) {
  if (typeof value === 'string') return value;
  const item = object(value);
  const label = text(item.name || item.key || item.meaning);
  const key = text(item.key);
  const meaning = text(item.meaning);
  const evidence = [
    ...array(item.source_report_ids).map((id) => reportById.has(text(id)) ? `报表 ${text(id)}` : ''),
    ...array(item.source_dashboard_ids).map((id) => dashboardById.has(text(id)) ? `看板 ${text(id)}` : ''),
  ].filter(Boolean).slice(0, 3);
  return [
    key && label !== key ? `${label}（\`${key}\`）` : label,
    meaning,
    evidence.length ? `证据：${evidence.join('、')}` : '',
  ].filter(Boolean).join('：');
}

function pickRepresentativeReports(reportsInDomain) {
  return sort([...reportsInDomain], 'resource_key')
    .sort((left, right) => reportRepresentativeScore(right) - reportRepresentativeScore(left))
    .slice(0, 8);
}

function reportRepresentativeScore(report) {
  const sqlSummary = sqlReportSemanticsById.get(text(report.resource_key));
  return (report.authenticated === true ? 100 : 0)
    + (text(report.definition_kind) === 'SQL' ? 20 : 0)
    + (array(report.metric_occurrences).length ? 10 : 0)
    + (text(sqlSummary?.definition_state) === 'valid' ? 6 : 0)
    - (text(sqlSummary?.definition_state) === 'unknown' ? 12 : 0)
    - (reportConflicts.has(text(report.resource_key)) ? 20 : 0);
}

function domainReportEvents(report) {
  const refs = metadataRefsForReport(report)
    .filter((item) => text(item.resource_type) === 'event')
    .map((item) => namedCodeFact(item.title, item.resource_key))
    .filter(isUsefulDomainEventFact);
  const occurrenceEvents = array(report.metric_occurrences)
    .map((item) => namedCodeFact(item.event_title, item.event_name))
    .filter(isUsefulDomainEventFact);
  return [...refs, ...occurrenceEvents];
}

function domainReportMetrics(report) {
  const occurrenceMetrics = array(report.metric_occurrences).map((item) => {
    const label = occurrenceLabel(item);
    const event = metricEventLabel(item);
    const aggregation = aggregationLabel(item);
    const measure = readableMetricText(item.measure_title || item.measure_key);
    const detail = [event && `基于“${event}”`, aggregation && `按“${aggregation}”`, measure && `度量“${measure}”`]
      .filter(Boolean).join('，');
    return label ? `${label}${detail ? `：${detail}` : ''}` : '';
  });
  return occurrenceMetrics.filter(isUsefulDomainMetricFact);
}

function domainReportDimensions(report) {
  const groups = array(object(report.calculation_context).group_by)
    .map(groupLabel)
    .filter(isUsefulDomainDimensionFact);
  const metadataDimensions = metadataRefsForReport(report)
    .filter((item) => ['event_prop', 'user_prop', 'tag', 'user_tag', 'cluster', 'user_cluster'].includes(text(item.resource_type)))
    .map((item) => namedCodeFact(item.title, item.resource_key))
    .filter(isUsefulDomainDimensionFact);
  return [...groups, ...metadataDimensions];
}

function sqlSummaryForReport(report) {
  const summary = completeSqlAgentSummary(report, sqlReportSemanticsById.get(text(report.resource_key)),
    calculationContextForKb(report).sql_semantic_facts);
  return summary ? [summary] : [];
}

function renderDomainSemanticOutputField(value) {
  const item = object(value);
  const name = text(item.name ?? item.field ?? item.key ?? item.column ?? item.title);
  const meaning = text(item.meaning ?? item.description ?? item.remark ?? item.purpose);
  if (!name && !meaning) return '';
  return name && meaning ? `${name}：${meaning}` : name || meaning;
}

function renderDomainDimensionName(value) {
  const item = object(value);
  const name = text(item.name ?? item.field ?? item.key ?? item.column ?? item.title);
  const meaning = shortenDomainDimensionMeaning(text(item.meaning ?? item.description ?? item.remark ?? item.purpose));
  return name && meaning ? `${name}：${meaning}` : name || meaning;
}

function shortenDomainDimensionMeaning(value) {
  return text(value)
    .replace(/。.*$/s, '')
    .replace(/；.*$/s, '')
    .replace(/，?选项[:：].*$/s, '')
    .replace(/保存包未提供实际选中值或默认值.*$/s, '')
    .trim();
}

function isLikelyMetricText(value) {
  const normalized = text(value).toLowerCase();
  return /(指标|数量|人数|次数|用户数|客户数|公司数|金额|收入|数据量|增量|累计|上限|已用|日均|预估|天数|耗时|时长|率|占比|令牌|调用数|调用次数|长度|_ct\b|_count\b)/i.test(normalized)
    || /(?:^|[^a-z0-9_])(count|cnt|num|amount|sum|avg|rate|ratio|percent|duration|tokens?)(?:$|[^a-z0-9_])/i.test(normalized)
    || /(?:^|_)(count|cnt|num|amount|sum|avg|rate|ratio|percent|duration|tokens?)(?:$|_|\d)/i.test(normalized);
}

function isUsefulDomainMetricFact(value) {
  const normalized = text(value).toLowerCase();
  if (!normalized || isExcludedDrilldownDimensionText(normalized)) return false;
  if (/chat_content|content_len|input_tokens|output_tokens|cache_.*tokens|tool_call_count|skill_call_count|mcp_call_count|process_steps|agent_reply_duration/.test(normalized)) return false;
  return isLikelyMetricText(normalized);
}

function isLikelyDrilldownDimensionText(value) {
  const name = cleanSemanticFactKey(text(value)).split(/[：:]/)[0].trim().toLowerCase();
  return /^(date|day|week|month|quarter|year|timewindow|company|company_name|customer|customer_name|project|project_id|project_name|user_name|login_name|role_type|ta_serial_no|csm|agent_id|session_id|final_state|is_dev|send_channel)$/.test(name);
}

function isUsefulDomainEventFact(value) {
  const normalized = text(value).toLowerCase();
  if (!normalized || isLikelyMetricText(normalized)) return false;
  if (/自定义指标|渗透率|留存|排行|趋势|报表$|看板$/.test(normalized)) return false;
  return /（`[^`]+`）|`[^`]+`|event|_create|_search|_send|_receive|_like|_dislike|_action|_click|_query|_save|_edit|pageview|访问|查询|创建|发送|接收|点赞|点踩|操作|更新|浏览/.test(normalized);
}

function isUsefulDomainDimensionFact(value) {
  const normalized = text(value).toLowerCase();
  if (!normalized || isLikelyMetricText(normalized) || isExcludedDrilldownDimensionText(normalized)) return false;
  return isLikelyDrilldownDimensionText(normalized)
    || /(公司|客户|企业|成员|用户|账号|角色|会话|项目|集群|版本|阶段|状态|类型|渠道|来源|事件时间|时间|日期|国家|地区|城市|标签|分群|负责人|空间|页面|环境|测试|正式|company|customer|user|login|role|session|agent|project|cluster|version|status|state|type|channel|source|date|time|country|city|region|tag|segment|owner|space|folder|page|url|env)/i.test(normalized);
}

function isExcludedDrilldownDimensionText(value) {
  const normalized = text(value).toLowerCase();
  const name = normalized.split(/[：:]/)[0].trim();
  return /^number\d*$/.test(name)
    || /^x$/.test(name)
    || /\$\{|selector|partdate|variable\d*|sql\s*输出字段|来源表达式|source expression|where 条件|order by|group by|limit|排序方法|筛选数据量|返回数量|row count|chat_content|content_len|input_tokens|output_tokens|cache_.*tokens|mcp_list|skill_list|process_steps|response_duration|agent_reply_duration|call_count|tool_call_count|skill_call_count|mcp_call_count/.test(normalized);
}

function namedCodeFact(titleValue, keyValue) {
  const key = text(keyValue);
  const title = cleanDimensionTitle(titleValue, key);
  const fallbackTitle = dimensionKeyLabel(key);
  if (title && key && title !== key) return `${title}（\`${key}\`）`;
  if (key && fallbackTitle && (!title || title === key)) return `${fallbackTitle}（\`${key}\`）`;
  return title || (key ? `\`${key}\`` : '');
}

function cleanDimensionTitle(titleValue, keyValue = '') {
  const key = text(keyValue);
  const fallbackTitle = dimensionKeyLabel(key);
  const cleaned = text(titleValue)
    .replace(/（[^）]*(?:处理\d*个saas|区分saas集群用)[^）]*）/gi, '')
    .replace(/\([^)]*(?:处理\d*个saas|区分saas集群用)[^)]*\)/gi, '')
    .trim();
  if (!cleaned || cleaned === key) return fallbackTitle || cleaned;
  if (/^level_for_csm_serial_company$/i.test(cleaned)) return '公司级别';
  if (/^initial_date_serial_company$/i.test(cleaned)) return '首次接入日期';
  if (/^es_serial_no_event_date$/i.test(cleaned)) return 'ES客户集群序列号';
  return cleaned;
}

function dimensionKeyLabel(value) {
  const key = text(value);
  const normalized = key.replace(/^#vp@serial_company@/i, '');
  return ({
    send_channel: '发送渠道',
    final_state: '最终状态',
    type: '消息方向',
    login_name: '登录账号名',
    user_name: '成员显示名',
    session_id: '会话 ID',
    agent_id: 'Agent ID',
    company_name: '公司名称',
    project_id: '项目 ID',
    project_name: '项目名称',
    date: '日期',
    day: '日期',
    level_for_csm_serial_company: '公司级别',
    level_for_csm: '公司级别',
    initial_date_serial_company: '首次接入日期',
    initial_date: '首次接入日期',
    serial_no_saas: 'ES客户集群序列号',
    ta_version: 'TA版本号',
    is_dev: '是否为测试服',
  })[normalized] || '';
}

function topDomainFacts(values, limit) {
  const entries = [];
  const byCode = new Map();
  const byLabel = new Map();
  for (const value of values.map(text).filter(Boolean)) {
    const cleaned = cleanSemanticFactForDisplay(value);
    if (!cleaned) continue;
    const identity = semanticFactIdentity(cleaned);
    if (!identity.code && !identity.label) continue;

    const candidates = [
      identity.code ? byCode.get(identity.code) : null,
      identity.label ? byLabel.get(identity.label) : null,
    ].filter((item) => item != null);
    const existingIndex = candidates.length ? candidates[0] : -1;

    if (existingIndex < 0) {
      const nextIndex = entries.length;
      entries.push({ value: cleaned, identity });
      if (identity.code) byCode.set(identity.code, nextIndex);
      if (identity.label) byLabel.set(identity.label, nextIndex);
      continue;
    }

    const existing = entries[existingIndex];
    const replacement = factSpecificity(cleaned) > factSpecificity(existing.value)
      ? { value: cleaned, identity }
      : existing;
    entries[existingIndex] = replacement;
    if (identity.code) byCode.set(identity.code, existingIndex);
    if (identity.label) byLabel.set(identity.label, existingIndex);
    if (replacement.identity.code) byCode.set(replacement.identity.code, existingIndex);
    if (replacement.identity.label) byLabel.set(replacement.identity.label, existingIndex);
  }

  const result = [];
  const seenCodes = new Set();
  const seenLabels = new Set();
  for (const entry of entries) {
    if (!entry) continue;
    const { code, label } = entry.identity;
    if ((code && seenCodes.has(code)) || (label && seenLabels.has(label))) continue;
    result.push(entry.value);
    if (code) seenCodes.add(code);
    if (label) seenLabels.add(label);
    if (result.length >= limit) break;
  }
  return result;
}

function semanticFactIdentity(value) {
  const normalized = cleanSemanticFactForDisplay(value).normalize('NFKC').toLocaleLowerCase('zh-CN');
  const code = normalized.match(/`([^`]+)`/)?.[1]?.trim() || '';
  const label = normalized
    .replace(/（`[^`]+`）/g, '')
    .replace(/\s*\(`[^`]+`\)/g, '')
    .split(/[：:]/)[0]
    .replace(/[\s`]+/g, '');
  return {
    code,
    label: normalizeSemanticFactLabel(label),
  };
}

function normalizeSemanticFactLabel(value) {
  const normalized = text(value)
    .replace(/（[^）]*(?:处理\d*个saas|区分saas集群用)[^）]*）/gi, '')
    .replace(/\([^)]*(?:处理\d*个saas|区分saas集群用)[^)]*\)/gi, '')
    .trim();
  if (/^level_for_csm_serial_company$/i.test(normalized)) return '公司级别';
  if (/^initial_date_serial_company$/i.test(normalized)) return '首次接入日期';
  if (/^es_serial_no_event_date$/i.test(normalized)) return 'ES客户集群序列号';
  return normalized;
}

function factSpecificity(value) {
  const identity = semanticFactIdentity(value);
  const rawCodeLabel = identity.code && (identity.label === identity.code || !identity.label);
  return (/`[^`]+`/.test(value) ? 2 : 0)
    + (/[：:]/.test(value) ? 1 : 0)
    + (identity.code && !rawCodeLabel ? 2 : 0);
}

function cleanSemanticFactForDisplay(value) {
  return text(value)
    .replace(/\$\{(?:(?:Text|Selector|PartDate|Number|Date|DateTime|MultiSelector)\s*:)?\s*([A-Za-z_][\w.-]*)\s*\}/g, '$1')
    .replace(/（[^）]*(?:处理\d*个saas|区分saas集群用)[^）]*）/gi, '')
    .replace(/\([^)]*(?:处理\d*个saas|区分saas集群用)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSemanticFactKey(value) {
  return cleanSemanticFactForDisplay(value).replace(/`/g, '');
}

function renderAppendixSource(appendix) {
  const key = text(appendix.appendix_id);
  return `---\ntype: project-technical-appendix-source\nproject_id: ${projectId}\nappendix_id: ${yaml(key)}\ntitle: ${yaml(appendix.title)}\nclassification_method: agent_semantic_synthesis\nsnapshot_hash: ${yaml(snapshotHash)}\n---\n\n# ${heading(appendix.title)}\n\n${text(appendix.summary)}\n\n本附录中的资产保留用于追溯，但不进入主要业务域检索入口。\n\n## 收录依据\n\n${text(appendix.selection_rationale)}\n\n## 看板（${array(appendix.dashboard_refs).length}）\n\n${refLinks(array(appendix.dashboard_refs), 'dashboard_id', 'dashboard_name', dashboardFiles, '../dashboards')}\n\n## 涉及报表（${array(appendix.report_refs).length}）\n\n${refLinks(array(appendix.report_refs), 'report_id', 'report_name', reportFiles, '../reports')}\n\n## 物理来源容器\n\n${containerLinks(appendix.source_container_refs, '../source-containers')}\n`;
}

function renderContainerSource(container) {
  const key = text(container.container_key);
  return `---\ntype: project-asset-source-container\nproject_id: ${projectId}\ncontainer_key: ${yaml(key)}\ncontainer_kind: ${yaml(container.container_kind)}\nspace_id: ${container.space_id == null ? 'null' : yaml(container.space_id)}\nsnapshot_hash: ${yaml(snapshotHash)}\n---\n\n# ${heading(container.container_title || key)}\n\n这是资产包记录的物理/技术来源容器，不是业务域。相同名称可以对应不同空间，混合空间也可以被拆分到多个业务域。\n\n## Agent 使用方式\n\n- 用它追溯资产的物理归属、看板空间或共享资产来源。\n- 不要把来源容器名称当作业务域或业务口径。\n- 回答业务问题时，应从业务域、场景召回卡、看板或报表进入。\n\n## 看板（${array(container.dashboard_refs).length}）\n\n${refLinks(array(container.dashboard_refs), 'dashboard_id', 'dashboard_name', dashboardFiles, '../dashboards')}\n\n## 独立报表（${array(container.standalone_report_refs).length}）\n\n${refLinks(array(container.standalone_report_refs), 'report_id', 'report_name', reportFiles, '../reports')}\n\n## 证据定位\n\n- container_key: \`${key || 'unknown'}\`\n- container_kind: ${text(container.container_kind) || 'unknown'}\n- space_id: ${container.space_id == null ? 'unknown' : `\`${text(container.space_id)}\``}\n`;
}

function renderDashboardSource(dashboard) {
  const id = text(dashboard.resource_key);
  const domain = domainByDashboardId.get(id);
  const appendix = appendixByDashboardId.get(id);
  const container = object(dashboard.source_container_ref);
  const classification = domain
    ? `- 业务域: [${link(domain.title)}](../domains/${domainFiles.get(domain.domain_id)})`
    : `- 技术附录: [${link(appendix.title)}](../appendices/${appendixFiles.get(appendix.appendix_id)})`;
  const notes = array(dashboard.notes);
  const reportRows = array(dashboard.report_refs).map((ref) => reportById.get(text(ref.report_id))).filter(Boolean);
  return `${assetFrontmatter('project-dashboard', dashboard)}\n# ${heading(dashboard.title || `Dashboard ${id}`)}\n\n## Agent 使用摘要\n\n${renderDashboardAgentUsageSummary(dashboard, reportRows, notes, domain, appendix)}\n\n## 身份与归属\n\n- 看板 ID: \`${id}\`\n${classification}\n- 物理来源: [${link(container.container_title || container.container_key)}](../source-containers/${containerFiles.get(text(container.container_key))})\n- 已认证: ${Boolean(dashboard.authenticated)}\n- 更新时间: ${text(dashboard.updated_at) || 'unknown'}\n- 源详情: \`${text(dashboard.source_detail_path) || 'unavailable'}\`\n\n## 描述\n\n${text(dashboard.description || dashboard.summary) || '_资产包中没有描述。_'}\n\n## 看板便签（${notes.length}）\n\n${renderDashboardNotes(notes)}\n\n## 报表（${array(dashboard.report_refs).length}）\n\n${refLinks(array(dashboard.report_refs), 'report_id', 'report_name', reportFiles, '../reports')}\n\n## 证据定位\n\n- 资产包源定位: \`${text(dashboard.source_detail_path) || 'unavailable'}\`\n`;
}

function renderReportSource(report) {
  const id = text(report.resource_key);
  const reportDomains = domainsForReport(report);
  const reportAppendices = appendicesForReport(report);
  const metadataRefs = metadataRefsForReport(report);
  const calculationContext = calculationContextForKb(report);
  const sqlSummary = completeSqlAgentSummary(report, sqlReportSemanticsById.get(id), calculationContext.sql_semantic_facts);
  return `${assetFrontmatter('project-report', report)}\n# ${heading(report.title || `Report ${id}`)}\n\n## Agent 使用摘要\n\n${renderReportAgentUsageSummary(report, metadataRefs, calculationContext, sqlSummary)}\n\n## 身份与归属\n\n- 报表 ID: \`${id}\`\n- 报表模型: ${text(report.report_model) || 'unknown'}\n- 定义类型: ${text(report.definition_kind) || 'UNKNOWN'}\n- 独立报表: ${Boolean(report.standalone)}\n- 已认证: ${Boolean(report.authenticated)}\n- 源详情: \`${text(report.source_detail_path) || 'unavailable'}\`\n\n业务域（由承载看板派生）：\n${domainLinks(reportDomains, '../domains')}\n\n技术附录（由承载看板派生）：\n${appendixLinks(reportAppendices, '../appendices')}\n\n物理来源容器：\n${containerLinks(report.source_container_refs, '../source-containers')}\n\n看板：\n${refLinks(array(report.dashboard_refs), 'dashboard_id', 'dashboard_name', dashboardFiles, '../dashboards')}\n\n## 描述\n\n${text(report.description || report.summary) || '_资产包中没有描述。_'}\n\n## 指标与计算口径（${array(report.metric_occurrences).length}）\n\n${renderReportMetricOccurrencesSection(report)}\n\n## 引用元数据（${metadataRefs.length}）\n\n${metadataLinks(metadataRefs, '../metadata')}\n\n## 证据定位\n\n- 资产包源定位: \`${text(report.source_detail_path) || 'unavailable'}\`\n${text(object(calculationContext.sql_semantic_facts).evidence_hash) ? `- SQL 证据 SHA-256: \`${text(object(calculationContext.sql_semantic_facts).evidence_hash)}\`\n` : ''}`;
}



function renderDashboardAgentUsageSummary(dashboard, reportRows, notes, domain, appendix) {
  const classification = domain
    ? `属于“${text(domain.title)}”业务域。`
    : `收录在“${text(appendix?.title)}”技术附录，不作为主要业务域入口。`;
  const purposes = reportRows.slice(0, 8).map((row) => reportPurpose(row));
  const metrics = topDomainFacts(reportRows.flatMap((row) => reportMetricSummaryItems(row)), 10);
  const dimensions = topDomainFacts(reportRows.flatMap((row) => reportDimensionSummaryItems(row)), 10);
  return `- 用途：${classification}${reportRows.length ? `这张看板承载 ${reportRows.length} 张报表，用于从看板层进入相关分析。` : '当前没有关联报表。'}\n- 适合回答：\n${purposes.map((item) => `  - ${item}`).join('\n') || '  - 当前看板没有足够报表证据概括适用问题。'}\n- 主要指标：${metrics.join('、') || '关联报表没有暴露可稳定概括的指标，使用时需要先进入下属报表核验。'}\n- 常用下钻维度：${dimensions.join('、') || '关联报表没有暴露稳定拆分维度，执行前需要按报表页面设置确认。'}\n- 便签规则：${notes.length ? '看板便签可用于理解业务目的、注意事项和共享边界；精确口径仍以下属报表为准。' : '没有看板便签。'}\n- 使用边界：当前数值、客户名单和趋势结果需要实时执行看板或下属报表；知识库只提供路由、口径和边界。`;
}

function renderReportAgentUsageSummary(report, metadataRefs, calculationContext, sqlSummary) {
  const isSql = text(report.definition_kind) === 'SQL';
  if (isSql) return renderSqlReportAgentUsageSummary(report, sqlSummary);
  const purpose = usefulSemanticText(sqlSummary?.business_purpose) || reportPurpose(report);
  const questions = usefulSemanticList(sqlSummary?.applicable_questions)
    ? array(sqlSummary.applicable_questions).map(renderPlainSemanticItem)
    : reportApplicableQuestions(report);
  const metrics = topDomainFacts(array(report.metric_occurrences).map(occurrenceSentence), 12);
  const parameters = reportParameterSummaryItems(calculationContext);
  const dimensions = reportDimensionSummaryItems(report, sqlSummary, calculationContext, metadataRefs);
  const filters = reportFilterSummaryItems(report, calculationContext);
  const limits = [];
  const boundaries = usefulSemanticList(sqlSummary?.non_applicable_questions)
    ? array(sqlSummary.non_applicable_questions).map(renderPlainSemanticItem)
    : ['不能替代实时执行结果；当前知识库只说明报表语义和使用边界。'];
  return `- 用途：${purpose}\n- 适合回答：\n${questions.map((item) => `  - ${item}`).join('\n') || '  - 适合在进入报表后核验该资产标题对应的业务问题。'}\n- 主要指标/输出：\n${metrics.map((item) => `  - ${item}`).join('\n') || '  - 资产包没有暴露稳定指标或输出字段，使用时需要回到源报表核验。'}\n- 输入参数：\n${parameters.map((item) => `  - ${item}`).join('\n') || '  - 本报表没有需要 Agent 预先解释的运行参数。'}\n- 常用下钻维度：${dimensions.join('、') || '资产包没有暴露稳定拆分维度；如需分组比较，应先打开报表确认可用维度。'}\n- 关键过滤与限制：\n${[...filters, ...limits].map((item) => `  - ${item}`).join('\n') || '  - 资产包没有暴露固定过滤、排序或行数限制；执行前按报表页面设置确认。'}\n- 使用边界：\n${boundaries.map((item) => `  - ${item}`).join('\n')}`;
}

function reportApplicableQuestions(report) {
  const title = text(report.title || report.resource_key);
  const metricNames = topDomainFacts(array(report.metric_occurrences).map(occurrenceLabel).filter(Boolean), 4);
  const dimensions = reportDimensionSummaryItems(report, null, calculationContextForKb(report), metadataRefsForReport(report)).slice(0, 4);
  const filters = reportFilterSummaryItems(report, object(report.calculation_context)).slice(0, 2);
  const subject = metricNames.length ? metricNames.join('、') : title;
  const result = [
    `查看“${title}”对应的${subject}。`,
    dimensions.length ? `按${dimensions.join('、')}拆分比较${subject}。` : '',
    filters.length ? `在${filters.join('；')}条件下解释${subject}。` : '',
  ].filter(Boolean);
  return [...new Set(result)];
}

function renderReportMetricOccurrencesSection(report) {
  const occurrences = array(report.metric_occurrences);
  if (occurrences.length) return occurrences.map(renderOccurrence).join('\n\n');
  if (text(report.definition_kind) === 'SQL') return '_SQL 报表口径以本页的 Agent 使用摘要为准。_';
  return '_未识别到结构化指标项。_';
}

function renderSqlReportAgentUsageSummary(report, summary) {
  if (!summary) {
    return '_当前 SQL 报表没有可用的 Agent 语义摘要。该报表只能作为待核验线索，不能直接回答确定口径。_';
  }
  const purpose = usefulSemanticText(summary.business_purpose) || reportPurpose(report);
  return `- 定义状态: ${text(summary.definition_state) || 'unknown'}\n- 用途：${purpose}\n- 统计粒度: ${text(summary.statistical_grain) || 'unknown'}\n- 证据定位: \`${text(summary.evidence_locator) || 'unknown'}\`\n\n### 输入参数\n\n${renderSemanticList(summary.input_parameters, renderSqlInputParameterItem)}\n\n### 输出字段\n\n${renderSemanticList(summary.output_fields, (item) => renderSqlSemanticItem(item, summary))}\n\n### 关键过滤与排除\n\n${renderSemanticList(summary.key_filters, (item) => renderSqlSemanticItem(item, summary))}\n\n### 默认限制与排序\n\n${renderSemanticList(summary.default_limits, (item) => renderSqlSemanticItem(item, summary))}\n\n### 可回答的问题\n\n${renderSemanticList(summary.applicable_questions, (item) => renderSqlSemanticItem(item, summary))}\n\n### 不可安全回答的问题\n\n${renderSemanticList(summary.non_applicable_questions, (item) => renderSqlSemanticItem(item, summary))}`;
}

function renderSqlSemanticItem(value, summary) {
  return replaceSqlParameterMentions(renderSemanticItem(value), summary);
}

function renderSqlInputParameterItem(value) {
  return sanitizeVisibleSqlSemanticText(renderSemanticItem(value));
}

function replaceSqlParameterMentions(value, summary) {
  let result = sanitizeVisibleSqlSemanticText(value);
  for (const [name, meaning] of sqlParameterMeaningEntries(summary)) {
    const pattern = new RegExp(`(?<![A-Za-z0-9_#$])${escapeRegExp(name)}(?![A-Za-z0-9_#$]|\\s*\\()`, 'giu');
    result = result.replace(pattern, meaning);
  }
  return sanitizeVisibleSqlSemanticText(result)
    .replace(/\bLIMIT\s+([^，；。]+?)限制/g, '按$1限制')
    .replace(/\bLIMIT\s+/g, '返回行数上限：')
    .replace(/\bLIMIT\b/gi, '返回行数上限');
}

function sqlParameterMeaningEntries(summary) {
  return array(summary?.input_parameters)
    .map((value) => {
      const item = object(value);
      const name = text(item.name ?? item.field ?? item.key ?? item.column ?? item.title);
      const meaning = shortSqlParameterMeaning(item);
      return name && meaning ? [name, meaning] : null;
    })
    .filter(Boolean)
    .sort((left, right) => right[0].length - left[0].length);
}

function shortSqlParameterMeaning(item) {
  const name = text(item.name ?? item.field ?? item.key ?? item.column ?? item.title);
  const raw = text(item.meaning ?? item.description ?? item.remark ?? item.purpose);
  const shortened = raw
    .replace(/；选项[:：].*$/s, '')
    .replace(/，?选项[:：].*$/s, '')
    .replace(/。保存包未提供实际选中值或默认值。?$/s, '')
    .replace(/保存包未提供实际选中值或默认值。?$/s, '')
    .replace(/[；;].*$/s, '')
    .trim();
  return shortened || genericSqlParameterMeaning(name);
}

function genericSqlParameterMeaning(name) {
  const normalized = text(name);
  if (/^date\d*$/i.test(normalized)) return '日期范围';
  if (/^selector\d*$/i.test(normalized)) return '选项参数';
  if (/^variable\d*$/i.test(normalized)) return '输入值';
  return normalized;
}

function isGeneratedSqlParameterName(name) {
  return /^(?:selector|variable|text|number|partdate)\d*$/i.test(text(name))
    || /^date\d+$/i.test(text(name));
}

function escapeRegExp(value) {
  return text(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function usefulSemanticText(value) {
  const normalized = text(value);
  if (!normalized || ['none', 'unknown', 'null', 'undefined'].includes(normalized.toLowerCase())) return '';
  return normalized;
}

function renderPlainSemanticItem(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return text(value);
  const item = object(value);
  const name = text(item.name ?? item.field ?? item.key ?? item.column ?? item.title);
  const meaning = text(item.meaning ?? item.description ?? item.remark ?? item.purpose);
  const extras = [];
  if (item.required != null) extras.push(`required=${Boolean(item.required)}`);
  if (item.default_value != null && text(item.default_value)) extras.push(`default=${text(item.default_value)}`);
  const expressionKind = text(item.expression_kind);
  if (expressionKind) extras.push(expressionKind);
  if (isInputParameterSemanticItem(item) && meaning && name && !isGeneratedSqlParameterName(name)) {
    return [`${meaning}（\`${name}\`）`, extras.join('，')].filter(Boolean).join('：');
  }
  if (isInputParameterSemanticItem(item) && meaning) {
    return [meaning, extras.join('，')].filter(Boolean).join('：');
  }
  return [name ? `\`${name}\`` : '', meaning, extras.join('，')].filter(Boolean).join('：') || jsonInline(item);
}

function reportMetricSummaryItems(report) {
  if (text(report.definition_kind) === 'SQL') {
    const context = calculationContextForKb(report);
    const summary = completeSqlAgentSummary(report, sqlReportSemanticsById.get(text(report.resource_key)), context.sql_semantic_facts);
    return sqlOutputMetricSummaryItems(summary);
  }
  return array(report.metric_occurrences).map(occurrenceSentence);
}

function sqlOutputMetricSummaryItems(summary) {
  return array(summary?.output_fields)
    .map((field) => renderPlainSemanticItem(field))
    .filter((item) => item && isLikelyMetricText(item))
    .slice(0, 12);
}

function reportDimensionSummaryItems(report, summary = null, calculationContext = null, metadataRefs = null) {
  const context = calculationContext || calculationContextForKb(report);
  const facts = object(context.sql_semantic_facts);
  const refs = metadataRefs || metadataRefsForReport(report);
  const candidates = [
    ...array(summary?.output_fields)
      .filter((item) => text(object(item).semantic_role) === 'dimension')
      .map(renderPlainSemanticItem),
    ...array(facts.group_by).map((item) => groupByLabel(item, array(summary?.output_fields || []))),
    ...array(object(facts.visual_view).dimensions).map((item) => text(object(item).title || object(item).name)),
    ...array(object(context.visual_view).dimensions).map((item) => text(object(item).title || object(item).name)),
    ...array(object(context.event_view).group_by).map(text),
    ...array(object(context.event_view).groups).map(text),
    ...array(refs).map((ref) => namedCodeFact(ref.title || ref.display_name, ref.resource_key)),
  ];
  return topDomainFacts(candidates.filter(isUsefulDomainDimensionFact), 12);
}

function reportParameterSummaryItems(calculationContext) {
  const context = object(calculationContext);
  return [
    ...array(context.sql_params).map((item) => renderPlainSemanticItem({ name: object(item).name || object(item).paramName, meaning: object(item).displayName || object(item).placeholder })),
  ].filter(Boolean).slice(0, 12);
}

function reportFilterSummaryItems(report, calculationContext) {
  const items = [
    ...array(report.metric_occurrences).flatMap((item) => filterSummaryLines(item.filters ?? item.custom_filters)),
    ...array(object(calculationContext).filters).flatMap((item) => filterSummaryLines(item)),
    ...array(object(calculationContext).event_view?.filts).flatMap((item) => filterSummaryLines(item)),
    ...array(object(calculationContext).visual_view?.filters).flatMap((item) => filterSummaryLines(item)),
    ...array(object(calculationContext).key_predicate_fragments).map(compactSqlFragment),
  ];
  return topDomainFacts(items, 10);
}

function completeSqlAgentSummary(report, planSummary, facts) {
  const base = object(planSummary);
  if (Object.keys(base).length) return { summary_source: 'semantic_plan', ...base };
  return null;
}

function usefulSemanticList(values) {
  return array(values).some((value) => {
    if (value == null) return false;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return Boolean(normalized) && !['none', 'unknown'].includes(normalized) && !/none observed|未发现/.test(normalized);
    }
    return Object.values(object(value)).some((item) => text(item) && !['none', 'unknown'].includes(text(item).toLowerCase()));
  });
}

function sqlParameterKindMeaning(value) {
  const kind = text(value).toLowerCase();
  if (kind.includes('partdate') || kind.includes('date')) return '日期或时间范围参数';
  if (kind.includes('selector')) return '枚举选择参数';
  if (kind.includes('text')) return '文本输入参数';
  if (kind.includes('number')) return '数值输入参数';
  if (kind.includes('variable')) return '变量参数';
  return kind ? `${value} 参数` : '';
}

function expressionDisplayName(value) {
  const expression = text(value);
  const quoted = expression.match(/^"([^"]+)"$/)?.[1] ?? expression.match(/^`([^`]+)`$/)?.[1];
  if (quoted) return quoted;
  const dotted = expression.match(/(?:^|\.)([A-Za-z_][\w$#@]*)$/)?.[1];
  return dotted || '';
}

function sqlFieldMeaning(name, kind) {
  const label = text(name);
  const lower = label.toLowerCase();
  if (kind === 'all_columns') return '返回源表全部列，资产包未展开字段清单';
  if (kind === 'aggregate') return `${label} 聚合指标`;
  if (kind === 'window') return `${label} 窗口计算字段`;
  if (kind === 'case_expression') return `${label} 分段或条件派生字段`;
  if (/(date|day|日期|时间)/i.test(label)) return `${label} 时间维度`;
  if (/(count|cnt|num|数量|人数|次数|用户数|公司数)/i.test(lower)) return `${label} 数量指标`;
  if (/(rate|ratio|percent|率|占比)/i.test(lower)) return `${label} 比率指标`;
  return `${label} 输出字段`;
}

function groupByLabel(value, outputFields, parameters = new Map()) {
  const raw = text(value);
  if (!raw) return '';
  const leading = raw.match(/^\s*(\d+)\b/);
  if (leading) {
    const field = outputFields[Number(leading[1]) - 1];
    if (field?.name) return field.name;
  }
  return raw.replace(/\$\{(?:(?:Text|Selector|PartDate|Number|Date|DateTime|MultiSelector)\s*:)?\s*([A-Za-z_][\w.-]*)\s*\}/g, (_, name) => {
    const parameter = parameters.get(text(name));
    return text(parameter?.display_name) || text(name);
  });
}

function firstSourceTableName(facts) {
  return text(object(array(object(facts).source_tables)[0]).table);
}

function normalizeSqlParametersFromFacts(facts) {
  return new Map(array(object(facts).parameters).map((item) => {
    const row = object(item);
    return [text(row.name), row];
  }).filter(([name]) => name));
}

function parameterizedFieldName(expressionValue, parameters) {
  const expression = text(expressionValue);
  const names = [...expression.matchAll(/\$\{(?:(?:Text|Selector|PartDate|Number|Date|DateTime|MultiSelector)\s*:)?\s*([A-Za-z_][\w.-]*)\s*\}/g)]
    .map((match) => text(match[1]))
    .filter(Boolean);
  if (!names.length) return '';
  const labels = names.map((name) => text(parameters.get(name)?.display_name) || name);
  return `参数化字段(${labels.join('、')})`;
}

function sanitizeKeyFilters(values) {
  return array(values).map((value) => {
    if (typeof value === 'string') return compactSqlFragment(value);
    const item = object(value);
    return compactSqlFragment(text(item.meaning ?? item.description ?? item.sql ?? item.expression ?? JSON.stringify(item)));
  }).filter(Boolean).slice(0, 8);
}


function sanitizeVisibleSqlSemanticText(value) {
  let normalized = text(value)
    .replace(/SQL\s*使用\s*select\s+\*\s*[，,]\s*输出字段需以源表\s*([^，。]+?)\s*当前结构为准/gi, '源表全字段输出，字段清单需回源表 $1 当前结构确认')
    .replace(/\bselect\s+\*/gi, '源表全字段输出')
    .replace(/\$\{(?:(?:Text|Selector|PartDate|Number|Date|DateTime|MultiSelector)\s*:)?\s*([A-Za-z_][\w.-]*)\s*\}/g, '$1')
    .replace(/SQL\s*输出字段[:：]?/gi, '')
    .replace(/来源表达式[:：]?/g, '')
    .replace(/where 条件[:：]?/gi, '')
    .replace(/[；;]?\s*计算上下文[:：]\s*/g, '；')
    .replace(/\bORDER\s+BY\b/gi, '排序')
    .replace(/\bGROUP\s+BY\b/gi, '分组')
    .replace(/\bSelector\b/gi, '选择参数')
    .replace(/\bPartDate\b/gi, '日期参数')
    .replace(/\bVariable\b/gi, '变量参数')
    .replace(/\bNumber\b/gi, '数值参数')
    .replace(/无\s*LIMIT/gi, '无行数上限')
    .replace(/\s+/g, ' ')
    .replace(/；{2,}/g, '；')
    .replace(/^[；;，,\s]+|[；;，,\s]+$/g, '')
    .trim();
  normalized = dedupeSemicolonSegments(normalized);
  return normalized;
}

function dedupeSemicolonSegments(value) {
  const parts = text(value).split('；').map((part) => part.trim()).filter(Boolean);
  const result = [];
  for (const part of parts) {
    const previous = result.at(-1) || '';
    if (previous === part || previous.endsWith(part)) continue;
    result.push(part);
  }
  return result.join('；');
}

function stripClausePunctuation(value) {
  return text(value).replace(/[。；;，,\s]+$/u, '');
}

function joinChineseClauses(value) {
  const values = array(value).map(stripClausePunctuation).filter(Boolean);
  return values.join('；') || '无';
}

function renderNumberedSteps(value, indent = '') {
  const values = array(value).map(stripClausePunctuation).filter(Boolean);
  if (!values.length) return `${indent}- 无`;
  return values.map((item, index) => `${indent}${index + 1}. ${item}`).join('\n');
}

function renderSemanticList(value, renderer) {
  const values = array(value);
  if (!values.length) return '- 无';
  return values.map((item) => `- ${renderer(item)}`).join('\n');
}

function renderSemanticItem(value) {
  if (value == null) return '无';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return text(value);
  const item = object(value);
  const name = text(item.name ?? item.field ?? item.key ?? item.column ?? item.title);
  const meaning = text(item.meaning ?? item.description ?? item.remark ?? item.purpose);
  const details = Object.entries(item)
    .filter(([key]) => !['name', 'field', 'key', 'column', 'title', 'meaning', 'description', 'remark', 'purpose'].includes(key))
    .map(([key, itemValue]) => `${key}=${inlineSemanticValue(itemValue)}`)
    .join(', ');
  if (isInputParameterSemanticItem(item) && meaning && name && !isGeneratedSqlParameterName(name)) {
    return [`${meaning}（\`${name}\`）`, details].filter(Boolean).join('：') || jsonInline(item);
  }
  if (isInputParameterSemanticItem(item) && meaning) {
    return [meaning, details].filter(Boolean).join('：') || jsonInline(item);
  }
  return [name ? `\`${name}\`` : '', meaning, details].filter(Boolean).join('：') || jsonInline(item);
}

function isInputParameterSemanticItem(item) {
  const row = object(item);
  const name = text(row.name ?? row.field ?? row.key ?? row.column ?? row.title);
  const meaning = text(row.meaning ?? row.description ?? row.remark ?? row.purpose);
  return row.required != null
    || row.default_value != null
    || Array.isArray(row.options)
    || (Boolean(meaning) && /^(?:selector|variable|date|partdate|text|number)\d*$/i.test(name));
}

function inlineSemanticValue(value) {
  if (value == null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) {
    const labels = value.map((item) => {
      const row = object(item);
      return text(row.label ?? row.name ?? row.title ?? row.value ?? item);
    }).filter(Boolean);
    return labels.length ? JSON.stringify(labels.slice(0, 20).join('、')) : JSON.stringify(value);
  }
  return JSON.stringify(value);
}


function calculationContextForKb(report) {
  const context = { ...reportDetailCalculationContext(report), ...object(report.calculation_context) };
  const sql = sqlTextFromCalculationContext(context);
  if (text(report.definition_kind) !== 'SQL' && !sql) return context;
  return {
    ...context,
    sql_semantic_facts: extractSqlSemanticFacts(sql, context),
  };
}

function reportDetailCalculationContext(report) {
  const normalizedDetail = readPackageJson(text(report.source_detail_path));
  const rawDetail = readPackageJson(text(object(normalizedDetail.raw_locator).path));
  const rawDefinition = object(rawDetail.raw_definition);
  const result = {};
  const visualView = jsonObject(rawDefinition.visual_view ?? rawDefinition.visualView);
  if (Object.keys(visualView).length) result.visual_view = visualView;
  const eventView = jsonObject(rawDefinition.event_view ?? rawDefinition.eventView);
  if (Object.keys(eventView).length) result.event_view = eventView;
  const events = jsonObject(rawDefinition.events);
  if (array(events.sqlVoParams).length) result.sql_params = events.sqlVoParams;
  return result;
}

function sqlTextFromCalculationContext(context) {
  const direct = text(context.sql);
  if (direct) return direct;
  return firstStringByKey(context, new Set(['sql', 'sql_text', 'sqlText', 'query']));
}

function extractSqlSemanticFacts(sql, context) {
  const normalizedSql = normalizeSql(sql);
  const placeholders = extractSqlPlaceholders(normalizedSql);
  const finalSelect = extractFinalSelect(normalizedSql);
  const sourceTables = extractSourceTables(normalizedSql);
  const warnings = [];
  if (!normalizedSql) warnings.push('sql_text_missing');
  if (normalizedSql && !finalSelect.fields.length) warnings.push('final_select_not_confidently_parsed');
  if (normalizedSql && !sourceTables.length) warnings.push('source_tables_not_confidently_parsed');
  if (finalSelect.truncated) warnings.push('final_select_field_list_truncated');
  if (sourceTables.length >= 80) warnings.push('source_table_list_truncated');
  return {
    schema_version: '1.0',
    extraction_method: 'cli_deterministic_sql_facts',
    extraction_boundary: 'mechanical_sql_structure_only_not_business_summary',
    raw_sql_sha256: normalizedSql ? createHash('sha256').update(normalizedSql).digest('hex') : null,
    sql_char_count: normalizedSql.length,
    statement_count: countSqlStatements(normalizedSql),
    placeholders,
    parameters: normalizeSqlParameters(context, placeholders),
    visual_view: extractVisualViewFacts(context),
    final_select: finalSelect,
    source_tables: sourceTables.slice(0, 80),
    group_by: extractClauseList(normalizedSql, 'group by', ['having', 'order by', 'limit', 'union']),
    order_by: extractClauseList(normalizedSql, 'order by', ['limit', 'union']),
    limit: extractLimit(normalizedSql),
    key_predicate_fragments: [
      ...extractClauseFragments(normalizedSql, 'where', ['group by', 'having', 'order by', 'limit', 'union']),
      ...extractClauseFragments(normalizedSql, 'having', ['order by', 'limit', 'union']),
    ].slice(0, 40),
    warnings,
  };
}

function normalizeSql(value) {
  return text(value).replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function extractSqlPlaceholders(sql) {
  const found = [];
  const seen = new Set();
  const patterns = [
    /\$\{(?:(Text|Selector|PartDate|Number|Date|DateTime|MultiSelector)\s*:)?\s*([A-Za-z_][\w.-]*)\s*\}/g,
    /:([A-Za-z_][\w.-]*)/g,
  ];
  for (const pattern of patterns) {
    for (const match of sql.matchAll(pattern)) {
      const raw = match[0];
      const name = match[2] ?? match[1];
      if (raw.startsWith(':') && isInsideDollarPlaceholder(sql, match.index)) continue;
      if (!name || seen.has(raw)) continue;
      seen.add(raw);
      found.push({ raw, name, kind: match[2] ? text(match[1]) || 'raw' : 'colon' });
    }
  }
  return found.sort((a, b) => a.raw.localeCompare(b.raw, 'en'));
}


function extractVisualViewFacts(context) {
  const view = jsonObject(context.visual_view ?? context.visualView);
  const dimensions = array(view.groupBys ?? view.group_by ?? view.dimensions).map(normalizeVisualField).filter((item) => item.name || item.title);
  const measures = array(view.aggregates ?? view.measures ?? view.displayQuotas).map(normalizeVisualField).filter((item) => item.name || item.title);
  return {
    dimensions,
    measures,
  };
}

function normalizeVisualField(value) {
  const row = object(value);
  return {
    name: text(row.columnName ?? row.name ?? row.key ?? row.quota ?? row.eventNameDisplay),
    title: text(row.columnDesc ?? row.title ?? row.display_name ?? row.displayName ?? row.name ?? row.columnName ?? row.eventNameDisplay),
    column_type: text(row.columnType ?? row.type ?? row.selectType) || null,
    analysis: text(row.analysis ?? row.analysisDesc) || null,
  };
}

function semanticFieldsFromVisualFacts(value) {
  const facts = object(value);
  return [
    ...array(facts.dimensions).map((field) => visualSemanticField(field, 'dimension')),
    ...array(facts.measures).map((field) => visualSemanticField(field, 'measure')),
  ].filter((field) => field.name);
}

function visualSemanticField(value, role) {
  const field = object(value);
  const name = text(field.title || field.name);
  return {
    name,
    meaning: role === 'dimension' ? `${name} 分组维度` : `${name} 指标`,
    expression_kind: 'visual_view',
    semantic_role: role,
  };
}

function normalizeSqlParameters(context, placeholders) {
  const candidate = [context.parameters, context.params, context.sql_params, context.sqlParams, object(context.taSqlVo).sqlVoParams]
    .find(Array.isArray);
  const byName = new Map(array(candidate).map((item) => {
    const row = object(item);
    return [text(row.name ?? row.key ?? row.param_name ?? row.paramName), row];
  }).filter(([name]) => name));
  return placeholders.map((placeholder) => {
    const row = byName.get(placeholder.name) ?? {};
    const options = array(row.options ?? row.selectorItems ?? row.values).map((item) => {
      const option = object(item);
      return {
        value: option.value ?? option.selectorValue ?? option.key ?? option.id ?? null,
        label: text(option.label ?? option.selectorName ?? option.name ?? option.title ?? option.text) || null,
      };
    }).slice(0, 60);
    return {
      name: placeholder.name,
      placeholder: placeholder.raw,
      placeholder_kind: placeholder.kind,
      param_type: text(row.paramType ?? row.param_type ?? row.type) || null,
      display_name: text(row.paramDisplay ?? row.display_name ?? row.displayName ?? row.title) || null,
      remark: text(row.paramRemark ?? row.remark ?? row.description) || null,
      required: row.required == null ? null : Boolean(row.required),
      default_value: row.defaultValue ?? row.default_value ?? row.value ?? null,
      use_timezone: row.use_timezone ?? row.useTimezone ?? null,
      options,
    };
  });
}

function extractFinalSelect(sql) {
  const select = findTopLevelKeyword(sql, 'select', { last: true });
  if (select < 0) return { fields: [], truncated: false };
  const from = findNextTopLevelKeyword(sql, 'from', select + 'select'.length);
  if (from < 0) return { fields: [], truncated: false };
  const projection = sql.slice(select + 'select'.length, from).trim();
  const rawFields = splitTopLevel(projection, ',');
  return {
    fields: rawFields.slice(0, 80).map((expression, index) => summarizeSelectField(expression, index + 1)),
    truncated: rawFields.length > 80,
  };
}

function summarizeSelectField(expression, ordinal) {
  const expr = expression.trim();
  const aliasMatch = expr.match(/\s+as\s+((?:"[^"]+")|(?:`[^`]+`)|(?:\[[^\]]+\])|(?:[A-Za-z_][\w$#@.-]*))\s*$/i)
    ?? expr.match(/\s+((?:"[^"]+")|(?:`[^`]+`)|(?:\[[^\]]+\])|(?:[A-Za-z_][\w$#@.-]*))\s*$/);
  const alias = aliasMatch && aliasMatch.index > 0 ? unquoteIdentifier(aliasMatch[1]) : null;
  return {
    ordinal,
    name: alias,
    expression: shortenSql(expr, 500),
    expression_kind: classifySelectExpression(expr),
  };
}

function classifySelectExpression(expression) {
  const value = expression.toLowerCase();
  if (/\b(count|sum|avg|min|max|approx_distinct|count_if|percentile)\s*\(/.test(value)) return 'aggregate';
  if (/\bover\s*\(/.test(value)) return 'window';
  if (/\bcase\b/.test(value)) return 'case_expression';
  if (expression.trim() === '*') return 'all_columns';
  if (/\$\{/.test(expression)) return 'parameterized_expression';
  return 'field_or_expression';
}

function extractSourceTables(sql) {
  const tables = [];
  const seen = new Set();
  const pattern = /\b(from|join)\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$#@.-]*)(?:\s*\.\s*(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$#@.-]*))*)/gi;
  for (const match of stripSqlComments(sql).matchAll(pattern)) {
    const normalized = unquoteIdentifier(match[2].replace(/\s*\.\s*/g, '.'));
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    tables.push({ clause: match[1].toLowerCase(), table: normalized });
  }
  return tables;
}

function extractClauseFragments(sql, keyword, endKeywords) {
  const clause = extractTopLevelClause(sql, keyword, endKeywords);
  if (!clause) return [];
  return splitTopLevel(clause, /\band\b/i).map((item) => shortenSql(item, 500)).filter(Boolean);
}

function extractClauseList(sql, keyword, endKeywords) {
  const clause = extractTopLevelClause(sql, keyword, endKeywords);
  if (!clause) return [];
  return splitTopLevel(clause, ',').map((item) => shortenSql(item, 300)).filter(Boolean).slice(0, 80);
}

function extractTopLevelClause(sql, keyword, endKeywords) {
  const start = findTopLevelKeyword(sql, keyword, { last: true });
  if (start < 0) return '';
  const bodyStart = start + keyword.length;
  const endPositions = endKeywords.map((value) => findNextTopLevelKeyword(sql, value, bodyStart)).filter((value) => value >= 0);
  const end = endPositions.length ? Math.min(...endPositions) : sql.length;
  return sql.slice(bodyStart, end).trim();
}

function extractLimit(sql) {
  const match = stripSqlComments(sql).match(/\blimit\s+(.+?)\s*;?\s*$/i);
  if (!match) return null;
  const rawValue = match[1].trim();
  const numeric = rawValue.match(/^(\d+)(?:\s*,\s*(\d+))?(?:\s+offset\s+(\d+))?$/i);
  if (!numeric) return { value: null, offset: null, expression: rawValue, raw: match[0].trim() };
  return {
    value: Number(numeric[2] ?? numeric[1]),
    offset: numeric[3] == null && numeric[2] != null ? Number(numeric[1]) : numeric[3] == null ? null : Number(numeric[3]),
    raw: match[0].trim(),
  };
}

function countSqlStatements(sql) {
  return splitTopLevel(stripSqlComments(sql), ';').map((item) => item.trim()).filter(Boolean).length;
}

function findTopLevelKeyword(sql, keyword, options = {}) {
  const positions = [];
  const lower = sql.toLowerCase();
  const target = keyword.toLowerCase();
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  let depth = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (ch === quote && sql[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '-' && next === '-') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') { depth += 1; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0 && lower.startsWith(target, i) && isKeywordBoundary(sql[i - 1]) && isKeywordBoundary(sql[i + target.length])) {
      positions.push(i);
    }
  }
  return options.last ? positions.at(-1) ?? -1 : positions[0] ?? -1;
}

function findNextTopLevelKeyword(sql, keyword, offset) {
  const position = findTopLevelKeyword(sql.slice(offset), keyword);
  return position < 0 ? -1 : offset + position;
}

function splitTopLevel(value, separator) {
  const parts = [];
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const next = value[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (ch === quote && value[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '-' && next === '-') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') { depth += 1; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth !== 0) continue;
    if (typeof separator === 'string' && ch === separator) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    } else if (separator instanceof RegExp) {
      const match = value.slice(i).match(separator);
      if (match?.index === 0) {
        parts.push(value.slice(start, i).trim());
        start = i + match[0].length;
        i = start - 1;
      }
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function stripSqlComments(sql) {
  return sql.replace(/--[^\n\r]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function shortenSql(value, max) {
  const collapsed = text(value).replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

function firstStringByKey(value, keys) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstStringByKey(item, keys);
      if (found) return found;
    }
    return '';
  }
  if (!value || typeof value !== 'object') return '';
  for (const [key, item] of Object.entries(value)) {
    if (keys.has(key) && typeof item === 'string' && item.trim()) return item;
    const found = firstStringByKey(item, keys);
    if (found) return found;
  }
  return '';
}

function isInsideDollarPlaceholder(sql, index) {
  const open = sql.lastIndexOf('${', index);
  if (open < 0) return false;
  const close = sql.lastIndexOf('}', index);
  return close < open;
}

function unquoteIdentifier(value) {
  return text(value).split('.').map((part) => part.trim().replace(/^["`\[]|["`\]]$/g, '')).join('.');
}

function isKeywordBoundary(ch) {
  return !ch || !/[A-Za-z0-9_$#@.-]/.test(ch);
}

function renderMetricSource(metric) {
  const id = text(metric.resource_key);
  const metadataRefs = metadataRefsForMetric(metric);
  const occurrences = array(metric.metric_occurrences);
  const dependencies = [
    ...array(metric.dependent_events).map((item) => namedCodeFact(object(item).title || object(item).display_name, object(item).resource_key || item)),
    ...array(metric.dependent_properties).map((item) => namedCodeFact(object(item).title || object(item).display_name, object(item).resource_key || item)),
  ].filter(Boolean);
  const metadataDependencies = metadataRefs
    .filter((item) => ['event', 'event_prop', 'user_prop', 'tag', 'user_tag', 'cluster', 'user_cluster'].includes(text(item.resource_type)))
    .map((item) => namedCodeFact(item.title, item.resource_key))
    .filter(Boolean);
  const dependencySummary = [...new Set([...dependencies, ...metadataDependencies])];
  return `${assetFrontmatter('project-reusable-metric', metric)}\n# ${heading(metric.title || `Metric ${id}`)}\n\n## Agent 使用摘要\n\n- 用途：统一表达“${text(metric.title || id)}”这一可复用指标，供报表和业务域复用。\n- 计算口径：\n${occurrences.map((item) => `  - ${occurrenceSentence(item)}`).join('\n') || '  - 未识别到结构化指标项，需查看原始定义。'}\n- 依赖事件/属性：${dependencySummary.slice(0, 12).join('、') || '未识别到稳定依赖。'}\n- 使用边界：当前数值需要实时执行对应报表或查询；知识库只说明口径和依赖。\n\n## 身份\n\n- 指标 key: \`${id}\`\n- 已认证: ${Boolean(metric.authenticated)}\n- 源详情: \`${text(metric.source_detail_path) || 'unavailable'}\`\n\n## 描述\n\n${text(metric.description || metric.summary) || '_资产包中没有描述。_'}\n\n## 计算定义\n\n${occurrences.map(renderOccurrence).join('\n\n') || '_未识别到结构化指标项。_'}\n\n## 引用元数据（${metadataRefs.length}）\n\n${metadataLinks(metadataRefs, '../metadata')}\n\n## 证据定位\n\n- 资产包源定位: \`${text(metric.source_detail_path) || 'unavailable'}\`\n`;
}

function renderMetadataSource(item) {
  const id = text(item.evidence_id);
  const usage = metadataUsageByEvidenceId.get(id) ?? [];
  const metricUsage = metadataMetricUsageByEvidenceId.get(id) ?? [];
  const title = metadataDisplayTitle(item);
  return `---\ntype: project-analysis-metadata\nproject_id: ${projectId}\nevidence_id: ${yaml(id)}\nresource_type: ${yaml(item.resource_type)}\nresource_key: ${yaml(item.resource_key)}\ntitle: ${yaml(title)}\nauthenticated: ${Boolean(item.authenticated)}\nsnapshot_hash: ${yaml(snapshotHash)}\n---\n\n# ${heading(title)}\n\n## Agent 使用摘要\n\n${metadataAgentSummaryLines(item, usage, metricUsage).map((line) => `- ${line}`).join('\n')}\n\n## 身份\n\n- 元数据类型: ${metadataTypeLabel(item.resource_type)}\n- Resource key: \`${text(item.resource_key)}\`\n- 已认证: ${Boolean(item.authenticated)}\n- Evidence ID: \`${id}\`\n\n## 可读定义\n\n${text(item.description || item.summary) || '_资产包中没有描述。_'}\n\n${metadataDefinitionLines(item).map((line) => `- ${line}`).join('\n') || '- 资产包未提供可读结构化定义。'}\n\n## 被报表引用（${usage.length}）\n\n${refLinks(usage, 'report_id', 'report_name', reportFiles, '../../reports')}\n\n## 被可复用指标引用（${metricUsage.length}）\n\n${refLinks(metricUsage, 'metric_id', 'metric_name', metricFiles, '../../metrics')}\n\n## 证据定位\n\n${metadataEvidenceLines(item).map((line) => `- ${line}`).join('\n')}\n`;
}


function metadataAgentSummaryLines(item, usage, metricUsage) {
  const type = text(item.resource_type);
  const label = metadataTypeLabel(type);
  const title = metadataDisplayTitle(item);
  const result = [
    `用途：这是${label}“${title}”，用于理解报表、看板或可复用指标中引用的底层字段/事件，不作为独立业务结论。`,
    `使用方式：${metadataUsageHint(type)}。`,
    `引用范围：当前快照中被 ${usage.length} 张报表直接引用，被 ${metricUsage.length} 个可复用指标依赖。`,
    `认证边界：${item.authenticated === true ? '已认证，可作为被引用资产的元数据依据。' : '未认证，只能作为被认证报表/指标的依赖线索，不能单独作为权威口径。'}`,
    '实时边界：知识库只记录定义、引用和适用范围；具体数值、用户清单或趋势仍需实时执行报表/查询。',
  ];
  if (!text(item.title)) result.push('命名边界：资产包没有业务标题，当前仅保留 resource key，回答时需要回到承载报表确认业务含义。');
  return result;
}

function metadataUsageHint(type) {
  return ({
    event: '作为行为事件入口，优先用于判断某个报表或指标观察的是哪类用户行为',
    event_prop: '作为事件属性，常用于筛选、分组、下钻或度量字段，需结合引用它的事件理解',
    user_prop: '作为用户属性，常用于用户分层、筛选或分组，需确认统计对象是否为用户/公司/账号',
    tag: '作为标签或标签派生字段，常用于分群、过滤或维度拆分，需注意标签版本和生成规则',
    user_tag: '作为用户标签，常用于用户/公司分层、过滤或维度拆分，需注意标签版本和生成规则',
    cluster: '作为分群条件，常用于限制分析对象范围，需注意分群快照和计算时间',
    user_cluster: '作为用户分群条件，常用于限制分析对象范围，需注意分群快照和计算时间',
    metric: '作为指标元数据，常用于复用口径；精确计算还应查看可复用指标页或承载报表',
  })[text(type)] ?? '作为依赖元数据使用，需要回到引用它的报表、指标或业务域确认语义';
}

function metadataDefinitionLines(item) {
  const definition = object(item.definition);
  const lines = [];
  const add = (label, value) => {
    const normalized = text(value);
    if (normalized) lines.push(`${label}: ${normalized}`);
  };
  add('资产类型', definition.asset_kind);
  add('来源类型', definition.source_type);
  add('分析类型', definition.select_type);
  add('存储类型', definition.real_data_type);
  add('单位', definition.unit);
  const tableScope = metadataTableScope(definition.table_type);
  if (tableScope) lines.push(`作用对象: ${tableScope}`);
  const tagKind = text(definition.tag_sub_type || definition.tag_type);
  if (tagKind) lines.push(`标签类型: ${tagKind}${tagKind === 'sql' ? '（SQL 标签，知识页不展开原始 SQL）' : ''}`);
  if (definition.has_connected != null) lines.push(`已连接/可用状态: ${definition.has_connected ? '是' : '否'}`);
  if (text(definition.entity_mapping_scope)) lines.push(`实体映射范围: ${text(definition.entity_mapping_scope)}`);
  const sourceVersion = text(object(item.raw).sourceVersion ?? object(item.raw).source_version);
  if (sourceVersion) lines.push(`来源版本: ${sourceVersion}`);
  return lines;
}

function metadataTableScope(value) {
  const normalized = text(value);
  if (normalized === '0') return '事件';
  if (normalized === '1') return '用户';
  if (normalized === '2') return '标签/分群';
  return '';
}

function metadataEvidenceLines(item) {
  const raw = object(item.raw);
  return [
    `Evidence ID: \`${text(item.evidence_id)}\``,
    `Source ref: \`${text(raw.sourceRef ?? raw.source_ref) || 'unknown'}\``,
    `Source version: \`${text(raw.sourceVersion ?? raw.source_version) || 'unknown'}\``,
  ];
}

function renderMetadataBrief(item) {
  const id = text(item.evidence_id);
  const usage = metadataUsageByEvidenceId.get(id) ?? [];
  const metricUsage = metadataMetricUsageByEvidenceId.get(id) ?? [];
  const definition = object(item.definition);
  const details = [
    definition.asset_kind ? `资产类型 ${text(definition.asset_kind)}` : '',
    definition.select_type ? `分析类型 ${text(definition.select_type)}` : '',
    definition.real_data_type ? `存储类型 ${text(definition.real_data_type)}` : '',
    definition.unit ? `单位 ${text(definition.unit)}` : '',
  ].filter(Boolean).join('，');
  const titleStatus = text(item.title) ? {} : { title_status: 'source_title_missing' };
  const title = metadataDisplayTitle(item);
  return `${briefFrontmatter('ai-metadata-brief', {
    evidence_id: id, resource_key: item.resource_key, authenticated: Boolean(item.authenticated), ...titleStatus,
  }, text(item.title) ? 'high' : 'medium')}\n# ${heading(title)}\n\n> 这是一个${metadataTypeLabel(item.resource_type)}${details ? `，${details}` : ''}；在当前快照中被 ${usage.length} 张报表直接引用，并被 ${metricUsage.length} 个可复用指标依赖。\n\n## 用途边界\n\n- 认证状态：${Boolean(item.authenticated)}。\n- ${text(item.title) ? '名称来自资产包，已清理为 agent 可读名称。' : '资产包没有业务标题，当前仅展示技术 resource key，不补写业务名称。'}\n- 该页只概括资产包中的技术定义，不补写业务口径。\n- 精确规则、数据类型和认证状态以原始元数据页为准。\n\n## 来源\n\n- [原始元数据定义](../../../metadata/${metadataDirectory(item.resource_type)}/${metadataFiles.get(id)})\n`;
}

function renderDomainBrief(domain) {
  const key = text(domain.domain_id);
  const dashboardRefs = array(domain.dashboard_refs);
  const reportRefs = array(domain.report_refs);
  return `${briefFrontmatter('ai-business-domain-brief', { domain_id: key }, 'high')}\n# ${heading(domain.title)}\n\n> ${text(domain.summary)}\n\n## 主要解决的问题\n\n${array(domain.primary_questions).map((question) => `- ${question}`).join('\n')}\n\n## 资产组成\n\n- 看板：${dashboardRefs.length} 张\n- 涉及报表：${reportRefs.length} 张\n- 物理来源容器：${array(domain.source_container_refs).length} 个\n\n${dashboardRefs.length ? `代表看板：\n${refLinks(dashboardRefs.slice(0, 12), 'dashboard_id', 'dashboard_name', dashboardFiles, '../dashboards')}` : ''}\n\n## 边界\n\n- 该业务域是 Agent 基于同快照资产证据生成的知识组织层，不等同于看板空间，也不表示业务认证。\n- 精确指标、过滤条件和计算口径必须继续下钻到报表或指标源资料。\n\n## 来源\n\n- [业务域规划与完整资产清单](../../domains/${domainFiles.get(key)})\n`;
}

function renderDashboardBrief(dashboard) {
  const id = text(dashboard.resource_key);
  const domain = domainByDashboardId.get(id);
  const appendix = appendixByDashboardId.get(id);
  const refs = array(dashboard.report_refs);
  const reportRows = refs.map((ref) => reportById.get(text(ref.report_id))).filter(Boolean);
  const notes = array(dashboard.notes);
  const themes = topNames(reportRows.map((row) => row.title), 6);
  const classification = domain
    ? { fields: { dashboard_id: id, domain_id: domain.domain_id, authenticated: Boolean(dashboard.authenticated) }, confidence: 'medium', sentence: `属于“${text(domain.title)}”业务域` }
    : { fields: { dashboard_id: id, appendix_id: appendix.appendix_id, authenticated: Boolean(dashboard.authenticated) }, confidence: 'low', sentence: `收录在“${text(appendix.title)}”技术附录，不作为主要业务域资产` };
  return `${briefFrontmatter('ai-dashboard-brief', classification.fields, classification.confidence)}\n# ${heading(dashboard.title || `Dashboard ${id}`)}\n\n> 这张看板${classification.sentence}，共承载 ${refs.length} 张报表${themes ? `，主要覆盖${themes}` : ''}${notes.length ? `，并包含 ${notes.length} 条看板便签说明` : ''}。\n\n## 主要回答的问题\n\n${reportRows.slice(0, 12).map((row) => `- ${reportPurpose(row)}`).join('\n') || '- 当前看板没有关联报表，无法从资产定义归纳具体分析问题。'}\n\n## 看板便签说明\n\n${notes.map((value, index) => dashboardNoteSummary(value, index)).join('\n') || '- 当前看板没有便签。'}\n\n## 报表结构\n\n| 报表 | 主要作用 |\n| --- | --- |\n${reportRows.map((row) => `| [${table(row.title || row.resource_key)}](../reports/${reportFiles.get(text(row.resource_key))}) | ${table(reportPurpose(row))} |`).join('\n')}\n\n## 使用边界\n\n- 看板便签用于解释业务目的、使用顺序和注意事项，但不能覆盖报表中的精确指标、筛选和时间口径。\n- 看板主题由名称、便签和下属报表结构概括，精确计算仍以报表源页为准。\n- [原始看板定义](../../dashboards/${dashboardFiles.get(id)})\n`;
}

function renderDashboardNotes(values) {
  if (!values.length) return '_该看板没有便签。_';
  return values.map((value, index) => {
    const note = object(value);
    const title = dashboardNoteText(note.note_title) || `便签 ${index + 1}`;
    const description = dashboardNoteText(note.description);
    const body = description
      ? description.split(/\r?\n/).map((line) => `> ${line || ' '}`).join('\n')
      : '> _便签没有正文。_';
    return `### ${index + 1}. ${heading(title)}\n\n- Note ID: \`${text(note.note_id) || 'unknown'}\`\n- 更新时间: ${text(note.updated_at) || 'unknown'}\n\n${body}`;
  }).join('\n\n');
}

function dashboardNoteSummary(value, index) {
  const note = object(value);
  const title = dashboardNoteText(note.note_title) || `便签 ${index + 1}`;
  const description = dashboardNoteText(note.description).replace(/\s+/g, ' ').trim();
  const summary = description.length > 240 ? `${description.slice(0, 240)}…` : description;
  return `- ${title}${summary ? `：${summary}` : '：没有正文。'}`;
}

function dashboardNoteText(value) {
  return text(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li(?:\s[^>]*)?>/gi, '\n- ')
    .replace(/<\/(?:p|div|li|ul|ol|h[1-6]|custom-h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .split(/\r?\n/)
    .map((line) => cleanQuestionMarkPlaceholders(line).trim())
    .filter(Boolean)
    .join('\n');
}

function renderReportBrief(report) {
  const id = text(report.resource_key);
  const conflicts = reportConflicts.get(id) ?? [];
  const confidence = conflicts.length ? 'low'
    : array(report.metric_occurrences).length || report.definition_kind === 'SQL' ? 'medium' : 'low';
  const extra = conflicts.length ? { review_status: 'semantic_conflict' } : {};
  const occurrences = array(report.metric_occurrences);
  const groups = array(object(report.calculation_context).group_by);
  const metadataRefs = metadataRefsForReport(report);
  const reportAppendices = appendicesForReport(report);
  return `${briefFrontmatter('ai-report-brief', {
    report_id: id, authenticated: Boolean(report.authenticated), ...extra,
  }, confidence)}\n# ${heading(report.title || `Report ${id}`)}\n\n> ${reportPurpose(report)}\n\n## 主要解决的问题\n\n- 认证状态：${Boolean(report.authenticated)}${report.authenticated === true ? '。' : '；该报表作为认证看板的依赖被保留，并未单独认证。'}\n- ${reportAppendices.length ? `该报表仅归入技术附录“${reportAppendices.map((item) => item.title).join('、')}”，不作为主要业务域资产。` : '该报表由主要业务域看板承载。'}\n- ${report.definition_kind === 'SQL' ? '通过 SQL 明细或汇总查询定位具体对象、记录或排行。' : `观察${occurrences.map(occurrenceLabel).filter(Boolean).join('、') || text(report.title)}的规模、趋势或分布。`}\n- ${groups.length ? `支持按 ${groups.map(groupLabel).filter(Boolean).join('、')} 分组比较。` : '资产定义未暴露明确分组维度，消费时需按源定义确认。'}\n\n## 指标与口径\n\n${occurrences.map((item) => `- ${occurrenceSentence(item)}`).join('\n') || (report.definition_kind === 'SQL' ? '- 口径由 SQL 和参数决定，详见原始报表定义。' : '- 未识别到结构化指标项。')}\n\n## 引用元数据\n\n${metadataLinks(metadataRefs, '../../metadata')}\n\n${conflicts.length ? `## 语义冲突\n\n${conflicts.map((item) => `- ${item}`).join('\n')}\n\n在资产作者或业务域召回卡确认前，不应仅凭名称把该资产作为确定查询入口。\n\n` : ''}## 来源\n\n- [原始报表定义](../../reports/${reportFiles.get(id)})\n`;
}

function renderMetricBrief(metric) {
  const id = text(metric.resource_key);
  const occurrences = array(metric.metric_occurrences);
  const metadataRefs = metadataRefsForMetric(metric);
  return `${briefFrontmatter('ai-metric-brief', {
    metric_key: id, authenticated: Boolean(metric.authenticated),
  }, occurrences.length ? 'medium' : 'low')}\n# ${heading(metric.title || `Metric ${id}`)}\n\n> 该可复用指标用于统一表达“${text(metric.title || id)}”${occurrences.length ? `，其核心计算基于${occurrences.map(occurrenceLabel).filter(Boolean).join('、')}` : ''}。\n\n## 主要解决的问题\n\n- 认证状态：${Boolean(metric.authenticated)}。\n- 在多个分析资产之间复用同一指标定义，减少临时口径差异。\n- 明确依赖事件、属性和参数，便于知识查询后继续核对计算证据。\n\n## 计算口径\n\n${occurrences.map((item) => `- ${occurrenceSentence(item)}`).join('\n') || '- 未识别到结构化指标项，需查看原始定义。'}\n\n## 引用元数据\n\n${metadataLinks(metadataRefs, '../../metadata')}\n\n## 来源\n\n- [原始指标定义](../../metrics/${metricFiles.get(id)})\n`;
}

function reportPurpose(report) {
  const title = text(report.title || report.resource_key);
  const occurrences = array(report.metric_occurrences);
  if (report.definition_kind === 'SQL') return `通过 SQL 查询“${title}”相关明细、汇总或排行，具体范围由 SQL 参数决定。`;
  if (occurrences.length) return eventAnalysisReportPurpose(report, title, occurrences);
  return `查看“${title}”相关结果；资产包未识别到可直接概括的指标项，Agent 需要回到报表源定义核验用途。`;
}

function eventAnalysisReportPurpose(report, title, occurrences) {
  const eventNames = topDomainFacts(occurrences.map(metricEventLabel).filter(Boolean), 3);
  const metricNames = topDomainFacts(occurrences.map(occurrenceLabel).filter(Boolean), 4);
  const aggregationNames = topDomainFacts(occurrences.map(aggregationLabel).filter(Boolean), 3);
  const measureNames = topDomainFacts(occurrences.map((item) => readableMetricText(item.measure_title || item.measure_key)).filter(Boolean), 3);
  const groups = topDomainFacts(array(object(report.calculation_context).group_by)
    .map(groupLabel)
    .filter(isUsefulDomainDimensionFact), 4);
  const filters = reportFilterSummaryItems(report, object(report.calculation_context)).slice(0, 3);
  const subject = metricNames.length ? metricNames.join('、') : title;
  const basis = eventNames.length ? `基于${eventNames.map((name) => eventBasisLabel(name)).join('、')}` : '基于事件分析模型';
  const calculation = [
    aggregationNames.length ? `按“${aggregationNames.join('、')}”统计` : '统计',
    measureNames.length ? `度量字段为“${measureNames.join('、')}”` : '',
  ].filter(Boolean).join('，');
  const suffix = [
    groups.length ? `可按 ${groups.join('、')} 下钻` : '',
    filters.length ? `过滤 ${filters.join('；')}` : '',
  ].filter(Boolean).join('；');
  return `${basis}${calculation ? `${calculation}` : ''}“${subject}”${suffix ? `；${suffix}` : ''}。`;
}


function eventBasisLabel(value) {
  const label = text(value);
  if (!label) return '';
  return /事件$/.test(label) ? `“${label}”` : `“${label}”事件`;
}

function detectSemanticConflicts() {
  const reportConflicts = new Map();
  const metadataConflicts = new Map();
  for (const [key, values] of groupBySemanticKey(reports, reportSemanticKey)) {
    if (values.length < 2) continue;
    const signatures = new Set(values.map(reportSemanticSignature));
    if (signatures.size <= 1) continue;
    const summary = semanticConflictSummary('报表', key, values, (row) => reportSemanticSignatureLabel(row));
    for (const report of values) appendConflict(reportConflicts, text(report.resource_key), summary);
  }
  const comparableMetadata = metadata.filter((item) => ['event_prop', 'user_prop', 'tag', 'user_tag', 'cluster', 'user_cluster', 'metric'].includes(text(item.resource_type)));
  for (const [key, values] of groupBySemanticKey(comparableMetadata, metadataSemanticKey)) {
    if (values.length < 2) continue;
    const signatures = new Set(values.map(metadataSemanticSignature));
    if (signatures.size <= 1) continue;
    const summary = semanticConflictSummary('元数据', key, values, (row) => metadataSemanticSignatureLabel(row));
    for (const item of values) appendConflict(metadataConflicts, text(item.evidence_id), summary);
  }
  return { reportConflicts, metadataConflicts };
}

function groupBySemanticKey(values, keyFn) {
  const result = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!key) continue;
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(value);
  }
  return result;
}

function appendConflict(target, id, message) {
  if (!id) return;
  if (!target.has(id)) target.set(id, []);
  target.get(id).push(message);
}

function semanticConflictSummary(kind, key, values, signatureLabelFn) {
  const rows = [...values]
    .sort((left, right) => semanticConflictAssetSortKey(left).localeCompare(semanticConflictAssetSortKey(right), 'en'))
    .map((row) => `${assetDisplayName(row)}（${assetIdentity(row)}，${signatureLabelFn(row)}）`);
  return `语义“${key}”存在 ${values.length} 个${kind}候选，但口径不同：${rows.join('；')}。Agent 不应仅凭名称选择，需要优先使用业务域/召回卡或让用户确认。`;
}

function semanticConflictAssetSortKey(row) {
  return [
    assetIdentity(row),
    text(row.resource_type),
    text(row.evidence_id),
  ].join('\u0000');
}

function reportSemanticKey(report) {
  return normalizeSemanticIntent(text(report.title)) || normalizeSemanticIntent(array(report.metric_occurrences).map(occurrenceLabel).join(' '));
}

function metadataSemanticKey(item) {
  return normalizeMetadataSemanticIntent(text(item.title || item.summary || item.description));
}

function normalizeMetadataSemanticIntent(value) {
  let normalized = text(value).toLowerCase().normalize('NFKC');
  normalized = normalized
    .replace(/正式客户|真实客户|有效客户/g, '真实正式客户')
    .replace(/\busers?\b/g, '用户')
    .replace(/公司|企业/g, '客户')
    .replace(/[\s_\-—–、，,。\.：:；;（）()【】\[\]{}<>《》“”"'`/\\]+/g, '')
    .replace(/\//g, '');
  return normalized.length >= 2 ? normalized : '';
}

function normalizeSemanticIntent(value) {
  let normalized = text(value).toLowerCase().normalize('NFKC');
  normalized = normalized
    .replace(/\bdau\b|daily\s*active\s*users?|日活跃用户|日活用户|活跃用户数|活跃用户/g, '用户日活')
    .replace(/正式客户|真实客户|有效客户/g, '真实正式客户')
    .replace(/\busers?\b/g, '用户')
    .replace(/公司|企业/g, '客户')
    .replace(/报表|看板|图表|趋势|分布|情况|统计|查询|分析/g, '')
    .replace(/[\s_\-—–、，,。\.：:；;（）()【】\[\]{}<>《》“”"'`/\\]+/g, '')
    .replace(/\//g, '')
    .replace(/用户用户日活/g, '用户日活');
  return normalized.length >= 2 ? normalized : '';
}

function reportSemanticSignature(report) {
  if (text(report.definition_kind) === 'SQL') {
    return JSON.stringify({ kind: 'SQL', sql: normalizeSql(text(object(report.calculation_context).sql)) });
  }
  return JSON.stringify({
    kind: text(report.definition_kind) || text(report.report_model),
    metrics: array(report.metric_occurrences).map(metricSemanticSignature).sort(),
    filters: filterSummaryLines(object(report.calculation_context).filters).sort(),
    groups: array(object(report.calculation_context).group_by).map(groupLabel).sort(),
  });
}

function metricSemanticSignature(item) {
  return JSON.stringify({
    event_name: text(item.event_name),
    aggregation_code: text(item.aggregation_code),
    measure_key: text(item.measure_key),
    formula_expression: text(item.formula_expression),
    filters: filterSummaryLines(item.filters ?? item.custom_filters).sort(),
  });
}

function reportSemanticSignatureLabel(report) {
  if (text(report.definition_kind) === 'SQL') return 'SQL 口径';
  const metrics = array(report.metric_occurrences).map((item) => {
    const event = text(item.event_title || item.event_name) || '未知事件';
    const aggregation = aggregationLabel(item) || '未知聚合';
    const measure = text(item.measure_title || item.measure_key);
    return `${event}/${aggregation}${measure ? `/${measure}` : ''}`;
  });
  return metrics.slice(0, 4).join('、') || '未识别指标口径';
}

function metadataSemanticSignature(item) {
  const definition = object(item.definition);
  return JSON.stringify({
    resource_type: text(item.resource_type),
    resource_key: text(item.resource_key),
    table_type: text(definition.table_type),
    select_type: text(definition.select_type),
    source_type: text(definition.source_type),
    tag_type: text(definition.tag_type || definition.tag_sub_type),
  });
}

function metadataSemanticSignatureLabel(item) {
  const definition = object(item.definition);
  return `${metadataTypeLabel(item.resource_type)} ${text(item.resource_key)}${text(definition.table_type) ? ` table_type=${text(definition.table_type)}` : ''}`;
}

function assetDisplayName(row) {
  return `“${text(row.title || row.resource_key || row.evidence_id)}”`;
}

function assetIdentity(row) {
  if (text(row.resource_key)) return `id=${text(row.resource_key)}`;
  return `evidence=${text(row.evidence_id)}`;
}

function collectFilterValues(value) {
  if (Array.isArray(value)) return value.flatMap(collectFilterValues);
  if (!value || typeof value !== 'object') return [];
  return [...array(value.ftv).map(text).filter(Boolean),
    ...Object.entries(value).filter(([key]) => key !== 'ftv').flatMap(([, item]) => collectFilterValues(item))];
}

function renderOccurrence(item, index) {
  const expression = formulaExpression(item);
  const formulaSummary = formulaDefinitionSummary(item);
  const filterSummary = filterSummaryLines(item.filters || item.custom_filters);
  const event = metricEventLabel(item) || 'unknown';
  return `### ${index + 1}. ${heading(occurrenceLabel(item) || `Metric ${index + 1}`)}

- 事件: ${event}
- 复用指标 key: ${text(item.metric_key) ? `\`${text(item.metric_key)}\`` : '无'}
- 聚合方式: ${aggregationLabel(item) || '资产包未暴露聚合方式'}
- 度量字段: ${readableMetricText(item.measure_title || item.measure_key) || '无'}
- 公式表达式: ${expression ? `\`${expression}\`` : '无'}
- 公式依赖: ${formulaSummary || '无'}
- 过滤条件: ${filterSummary.length ? filterSummary.join('；') : '无'}
`;
}

function occurrenceSentence(item) {
  const label = occurrenceLabel(item) || '未命名指标';
  const expression = formulaExpression(item);
  const dependencies = formulaDependencies(item);
  if (expression || dependencies.length) {
    return `${label}：公式指标${expression ? `，表达式为 \`${expression}\`` : ''}${dependencies.length ? `，依赖${dependencies.join('、')}` : ''}。`;
  }
  const event = metricEventLabel(item) || '未知事件';
  const aggregation = aggregationLabel(item);
  const measure = readableMetricText(item.measure_title || item.measure_key);
  const aggregationPart = aggregation ? `按“${aggregation}”计算` : '计算，资产包未暴露聚合方式';
  return `${label}：基于“${event}”${aggregationPart}${measure ? `，度量字段为“${measure}”` : ''}${text(item.metric_key) ? `，复用指标 key 为 \`${text(item.metric_key)}\`` : ''}。`;
}

function formulaExpression(item) {
  const expression = text(item.formula_expression) || (typeof item.formula === 'string' ? text(item.formula) : '');
  return readableFormulaExpression(expression);
}

function readableFormulaExpression(value) {
  return text(value).replace(/\.?(A\d{3}(?:_\d+)?)/g, (_, code) => {
    const label = aggregationCodeLabel(code);
    return label ? `.${label}` : '.未知聚合';
  });
}

function formulaDefinition(item) {
  const definition = object(item.formula_definition);
  return Object.keys(definition).length ? definition : object(item.formula);
}

function formulaDependencies(item) {
  return array(formulaDefinition(item).formulationDeps).map((dependency) => {
    const event = object(object(dependency).event);
    const quota = object(object(dependency).quota);
    const eventName = text(event.eventDesc || event.eventName) || '未知事件';
    const aggregation = text(quota.quotaDesc || quota.quotaName) || '资产包未暴露聚合方式';
    const filters = array(object(event.filter).filts)
      .map((filter) => text(object(filter).columnDesc || object(filter).quotDesc || object(filter).prop))
      .filter(Boolean);
    return `“${eventName}”的“${aggregation}”${filters.length ? `（过滤：${filters.join('、')}）` : ''}`;
  });
}


function formulaDefinitionSummary(item) {
  const dependencies = formulaDependencies(item);
  if (dependencies.length) return dependencies.join('、');
  const definition = formulaDefinition(item);
  const event = object(definition.event);
  const quota = object(definition.quota);
  const eventName = text(event.eventDesc || event.eventName || definition.eventDesc || definition.eventName);
  const quotaName = text(quota.quotaDesc || quota.quotaName || definition.quotaDesc || definition.quotaName);
  const metricName = text(definition.metricName ?? definition.metric_name);
  return [
    eventName ? `事件“${eventName}”` : '',
    quotaName ? `指标“${quotaName}”` : '',
    metricName && metricName !== quotaName ? `名称“${metricName}”` : '',
  ].filter(Boolean).join('，');
}

function aggregationLabel(item) {
  const name = text(item.aggregation_name);
  const code = text(item.aggregation_code);
  const codeLabel = aggregationCodeLabel(code);
  if (name && !isAggregationCode(name)) return normalizeAggregationName(name);
  if (codeLabel) return codeLabel;
  return name || (code ? '未知聚合' : '');
}

function normalizeAggregationName(value) {
  const name = text(value);
  return ({
    'Total count': '总次数',
    'Total Count': '总次数',
    'Unique users': '触发用户数',
    'Unique Users': '触发用户数',
    Sum: '总和',
    Average: '均值',
    Avg: '均值',
    Max: '最大值',
    Min: '最小值',
    Distinct: '去重数',
  })[name] ?? name;
}

function aggregationCodeLabel(value) {
  const code = text(value);
  return ({
    A100: '总次数',
    A100_1: '总次数的周期累计总和',
    A100_2: '总次数的周期累计人均值',
    A101: '触发用户数',
    A101_1: '触发用户数的周期累计总和',
    A101_2: '触发用户数的周期累计人均值',
    A102: '人均次数',
    A103: '总和',
    A104: '均值',
    A105: '人均值',
    A106: '最大值',
    A107: '最小值',
    A108: '去重数',
    A109: '为真数',
    A110: '为假数',
    A111: '不为空数',
    A112: '为空数',
    A113: '周期累计总和',
    A114: '周期累计人均值',
    A115: '列表整体去重数',
    A116: '列表元素去重数',
    A117: '中位数',
    A118: '元素集合去重数',
    A119: '分位数',
    A120: '方差',
    A121: '标准差',
    A200: '次数',
    A201: '天数',
    A202: '小时数',
  })[code] ?? '';
}

function isAggregationCode(value) {
  return /^A\d{3}(?:_\d+)?$/.test(text(value));
}

function filterSummaryLines(value) {
  const conditions = collectFilterConditions(value);
  return [...new Set(conditions.map(filterConditionSentence).filter(Boolean))];
}

function collectFilterConditions(value) {
  if (Array.isArray(value)) return value.flatMap(collectFilterConditions);
  if (!value || typeof value !== 'object') return [];
  const source = object(value);
  const nested = Object.entries(source)
    .filter(([key]) => !['ftv', 'columnDesc', 'columnName', 'quotDesc', 'prop', 'calcuSymbol', 'calcu_symbol', 'relation', 'junctionKind', 'junction_kind'].includes(key))
    .flatMap(([, item]) => collectFilterConditions(item));
  const hasConditionIdentity = ['columnDesc', 'columnName', 'quotDesc', 'prop', 'propertyName', 'tagName'].some((key) => text(source[key]))
    || array(source.ftv).some((item) => text(item));
  return hasConditionIdentity ? [source, ...nested] : nested;
}

function filterConditionSentence(condition) {
  const field = text(condition.columnDesc || condition.quotDesc || condition.columnName || condition.prop || condition.propertyName || condition.tagName) || '未命名字段';
  const values = array(condition.ftv).map(text).filter(Boolean);
  const code = text(condition.calcuSymbol ?? condition.calcu_symbol);
  const operator = filterOperatorLabel(code);
  const relation = text(condition.relation || condition.junctionKind || condition.junction_kind);
  const needsValue = filterOperatorNeedsValue(code);
  const valueText = values.length ? values.map((value) => `“${value}”`).join('、') : needsValue ? '未给出固定值' : '';
  const valuePart = valueText ? ` ${valueText}` : '';
  const relationText = relation ? `（关系：${relation}）` : '';
  return `${field} ${operator}${valuePart}${relationText}`;
}

function filterOperatorLabel(value) {
  const code = text(value);
  return ({
    C00: '等于',
    C01: '不等于',
    C02: '小于',
    C020: '小于等于',
    C03: '大于',
    C030: '大于等于',
    C04: '有值',
    C05: '无值',
    C06: '区间',
    C07: '包括',
    C08: '不包括',
    C09: '为真',
    C10: '为假',
    C11: '正则匹配',
    C12: '正则不匹配',
    C13: '相对当前时间',
    C14: '相对事件时间',
    C15: '存在元素',
    C16: '不存在元素',
    C17: '元素位置',
    C18: '无值',
    C19: '有值',
    C20: '属于分群',
    C21: '不属于分群',
    C22: '存在对象满足',
    C23: '没有对象满足',
    C24: '全部对象满足',
  })[code] ?? (code ? '未知操作符' : '满足');
}

function filterOperatorNeedsValue(value) {
  const code = text(value);
  return !new Set(['', 'C04', 'C05', 'C09', 'C10', 'C18', 'C19']).has(code);
}

function occurrenceLabel(item) { return readableMetricText(item.display_name || item.event_title || item.event_name); }

function metricEventLabel(item) {
  const title = readableMetricText(item.event_title);
  const name = readableMetricText(item.event_name);
  const display = readableMetricText(item.display_name);
  if (title && !isInternalMetricExpression(title)) return title;
  if (name && !isInternalMetricExpression(name)) return name;
  if (display === '自定义指标') return '自定义指标';
  return display || title || name;
}

function isInternalMetricExpression(value) {
  return /(?:^|[、.])dashboard_search(?:[、.]|$)|(?:^|[、.])event_view(?:[、.]|$)|(?:^|[、.])undefined(?:[、.]|$)/i.test(text(value));
}

function readableMetricText(value) {
  return text(value)
    .replace(/undefined[._-]*/gi, '')
    .replace(/\.?(A\d{3}(?:_\d+)?)/g, (_, code) => {
      const label = aggregationCodeLabel(code);
      return label ? `.${label}` : '.未知聚合';
    })
    .replace(/([\u4e00-\u9fa5])\.([A-Za-z_])/g, '$1、$2')
    .replace(/([A-Za-z_])\.([\u4e00-\u9fa5])/g, '$1、$2')
    .replace(/([\u4e00-\u9fa5])\.([\u4e00-\u9fa5])/g, '$1、$2')
    .replace(/,+/g, '、')
    .replace(/、+/g, '、')
    .replace(/^、|、$/g, '')
    .trim();
}
function groupLabel(group) { return text(object(group).columnDesc || object(group).columnName || group); }

function renderSemanticConflictList() {
  const reportLines = [...reportConflicts.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([id, conflicts]) =>
      `- [${link(reportById.get(id)?.title || id)}](../briefs/reports/${reportFiles.get(id)})：${conflicts.join('；')}`);
  const metadataLines = [...metadataSemanticConflicts.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([id, conflicts]) => {
    const item = metadata.find((row) => text(row.evidence_id) === id);
    if (!item) return `- \`${id}\`：${conflicts.join('；')}`;
    return `- [${link(metadataDisplayTitle(item))}](../briefs/metadata/${metadataDirectory(item.resource_type)}/${metadataFiles.get(id)})：${conflicts.join('；')}`;
  });
  return [...reportLines, ...metadataLines].join('\n') || '- 无';
}

function renderCoverage() {
  return `# 覆盖、物理来源与未归属资产

## Agent 使用方式

- 先用本页判断知识库覆盖范围、未归属资产和风险清单，再回到业务域、召回卡或具体资产页回答问题。
- 语义冲突表示多个资产表达同一业务含义但口径不同，Agent 不能只按名称选择资产。
- 缺少源标题的元数据通常只作为被引用字段或事件解释，不单独作为业务入口。
- 独立报表没有看板承载，不根据名称强行归入业务域；使用前需先确认它是否适配当前问题。

| 检查项 | 数量 |
| --- | ---: |
| 业务域 | ${domains.length} |
| 技术附录 | ${appendices.length} |
| 归属业务域的看板 | ${domainByDashboardId.size} |
| 归属技术附录的看板 | ${appendixByDashboardId.size} |
| 恰好完成一次分类的看板 | ${domainByDashboardId.size + appendixByDashboardId.size} |
| 物理看板空间 | ${physicalContainers.length} |
| 共享资产看板 | ${sharedDashboards.length} |
| 无物理空间归属的看板 | ${unassignedDashboards.length} |
| 业务域报表 | ${reportsInBusinessDomains.length} |
| 技术附录报表 | ${reportsInTechnicalAppendices.length} |
| 独立报表（不推断业务域） | ${standaloneReports.length} |
| 语义冲突报表 | ${reportConflicts.size} |
| 语义冲突元数据 | ${metadataSemanticConflicts.size} |
| 缺少源标题的元数据 | ${metadataMissingTitles.length} |

## 技术附录

${sort(appendices, 'appendix_id').map((row) => `- [${link(row.title)}](../appendices/${appendixFiles.get(text(row.appendix_id))})`).join('\n') || '- 无'}

## 技术来源容器

${containerAssetLinks(technicalContainers)}

## 无物理空间看板

${assetLinks(sort(unassignedDashboards, 'resource_key'), dashboardFiles, '../dashboards')}

## 独立报表

这些报表没有看板承载，保留为可检索资产，但不根据名称强行推断业务域。

${assetLinks(sort(standaloneReports, 'resource_key'), reportFiles, '../reports')}

## 语义冲突

${renderSemanticConflictList()}

## 缺少源标题的元数据

${sort(metadataMissingTitles, 'evidence_id').map((item) => `- [\`${link(item.resource_key)}\`](../metadata/${metadataDirectory(item.resource_type)}/${metadataFiles.get(text(item.evidence_id))})`).join('\n') || '- 无'}
`;
}

function renderMetadataIndex(brief) {
  const grouped = groupBy(metadata, 'resource_type');
  const sections = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([type, values]) => {
      const directory = metadataDirectory(type);
      const rows = sort(values, 'evidence_id').map((item) => {
        const id = text(item.evidence_id);
        return `| [${table(metadataDisplayTitle(item))}](${directory}/${metadataFiles.get(id)}) | \`${table(item.resource_key)}\` | ${Boolean(item.authenticated)} | ${(metadataUsageByEvidenceId.get(id) ?? []).length} |`;
      }).join('\n');
      return `## ${metadataTypeLabel(type)}（${values.length}）\n\n| 名称 | Resource key | 已认证 | 引用报表 |\n| --- | --- | --- | ---: |\n${rows}`;
    }).join('\n\n');
  return `# ${brief ? '元数据摘要' : '分析元数据'}\n\n元数据只收录当前看板报表闭包实际引用的事件、属性、标签、分群和指标定义，并保留各自认证状态。\n\n${sections}\n`;
}

function renderAssetIndex(title, values, files, key = 'resource_key') {
  return `# ${title}\n\n| 名称 | Key | 已认证 |\n| --- | --- | --- |\n${sort(values, key).map((row) => `| [${table(row.title || row.domain_title || row.container_title || row[key])}](${files.get(text(row[key]))}) | \`${table(row[key])}\` | ${row.authenticated == null ? '-' : Boolean(row.authenticated)} |`).join('\n')}\n`;
}

function renderBriefList(title, values, files, key = 'resource_key') {
  return `# ${title}\n\n${sort(values, key).map((row) => `- [${link(row.title || row.domain_title || row.container_title || row[key])}](${files.get(text(row[key]))})`).join('\n') || '- 无'}\n`;
}

function countTable() {
  return `## 数量

| 资产 | 数量 |
| --- | ---: |
| Agent 业务域 | ${corpus.counts.business_domains} |
| 技术附录 | ${corpus.counts.technical_appendices} |
| 业务域看板 | ${corpus.counts.dashboards_in_business_domains} |
| 技术附录看板 | ${corpus.counts.dashboards_in_technical_appendices} |
| 物理看板空间 | ${corpus.counts.source_dashboard_spaces} |
| 技术来源容器 | ${corpus.counts.technical_containers} |
| 看板 | ${corpus.counts.dashboards} |
| 报表 | ${corpus.counts.reports} |
| 业务域报表 | ${corpus.counts.reports_in_business_domains} |
| 技术附录报表 | ${corpus.counts.reports_in_technical_appendices} |
| 独立报表 | ${corpus.counts.standalone_reports} |
| 可复用指标 | ${corpus.counts.reusable_metrics} |
| 分析元数据 | ${corpus.counts.analysis_metadata} |
| 已认证资产 | ${corpus.counts.authenticated_assets} |
| 未单独认证的依赖资产 | ${corpus.counts.unauthenticated_dependencies} |
| 已认证 / 未单独认证报表 | ${corpus.counts.authenticated_reports} / ${corpus.counts.unauthenticated_reports} |
| 已认证 / 未单独认证元数据 | ${corpus.counts.authenticated_metadata} / ${corpus.counts.unauthenticated_metadata} |
| 语义冲突报表 | ${corpus.counts.semantic_conflict_reports} |
| 语义冲突元数据 | ${corpus.counts.semantic_conflict_metadata} |
| 缺少源标题的元数据 | ${corpus.counts.metadata_missing_source_titles} |
| 报表指标出现项 | ${corpus.counts.report_metric_occurrences} |
| SQL 报表 | ${corpus.counts.sql_reports} |`;
}

function warningSection() {
  return `## 已知质量提示\n\n${warnings.map((warning) => `- ${warning}`).join('\n') || '- 无'}`;
}

function assetFrontmatter(type, asset) {
  return `---\ntype: ${type}\nproject_id: ${projectId}\nresource_key: ${yaml(asset.resource_key)}\ntitle: ${yaml(asset.title)}\nauthenticated: ${Boolean(asset.authenticated)}\nsnapshot_hash: ${yaml(snapshotHash)}\nsource_detail_path: ${yaml(asset.source_detail_path)}\n---\n`;
}

function briefFrontmatter(type, extra, confidence) {
  const fields = Object.entries(extra).map(([key, value]) => `${key}: ${yaml(value)}`).join('\n');
  return `---\ntype: ${type}\nsummary_kind: evidence_grounded_generated\nconfidence: ${confidence}\nproject_id: ${projectId}\n${fields}\nsource_snapshot_hash: ${snapshotHash}\n---\n`;
}

function domainsForReport(report) {
  const result = [];
  const seen = new Set();
  for (const ref of array(report.dashboard_refs)) {
    const domain = domainByDashboardId.get(text(ref.dashboard_id));
    if (domain && !seen.has(domain.domain_id)) {
      seen.add(domain.domain_id);
      result.push(domain);
    }
  }
  return result;
}

function appendicesForReport(report) {
  const result = [];
  const seen = new Set();
  for (const ref of array(report.dashboard_refs)) {
    const appendix = appendixByDashboardId.get(text(ref.dashboard_id));
    if (appendix && !seen.has(appendix.appendix_id)) {
      seen.add(appendix.appendix_id);
      result.push(appendix);
    }
  }
  return result;
}

function domainLinks(values, prefix) {
  return array(values).map((domain) => `- [${link(domain.title || domain.domain_id)}](${prefix}/${domainFiles.get(text(domain.domain_id))})`).join('\n') || '- 无';
}

function appendixLinks(values, prefix) {
  return array(values).map((appendix) => `- [${link(appendix.title || appendix.appendix_id)}](${prefix}/${appendixFiles.get(text(appendix.appendix_id))})`).join('\n') || '- 无';
}

function containerLinks(values, prefix) {
  return array(values).map((ref) => `- [${link(ref.container_title || ref.container_key)}](${prefix}/${containerFiles.get(text(ref.container_key))})`).join('\n') || '- 无';
}

function metadataLinks(values, prefix) {
  return array(values).map((item) => {
    const id = text(item.evidence_id);
    return `- [${link(metadataDisplayTitle(item))}](${prefix}/${metadataDirectory(item.resource_type)}/${metadataFiles.get(id)})（${metadataTypeLabel(item.resource_type)}，\`${text(item.resource_key)}\`）`;
  }).join('\n') || '- 无';
}

function refLinks(values, idKey, nameKey, files, prefix) {
  return values.map((ref) => `- [${link(ref[nameKey] || ref[idKey])}](${prefix}/${files.get(text(ref[idKey]))}) (\`${text(ref[idKey])}\`)`).join('\n') || '- 无';
}

function assetLinks(values, files, prefix) {
  return values.map((row) => `- [${link(row.title || row.resource_key)}](${prefix}/${files.get(text(row.resource_key))})`).join('\n') || '- 无';
}

function containerAssetLinks(values) {
  return sort(values, 'container_key').map((row) => `- [${link(row.container_title || row.container_key)}](../source-containers/${containerFiles.get(text(row.container_key))})（${text(row.container_kind)}）`).join('\n') || '- 无';
}

function topNames(values, limit = 5) {
  const names = [...new Set(values.map(text).filter(Boolean))].slice(0, limit);
  return names.length ? `“${names.join('、')}”` : '';
}

function rows(name) {
  return readJsonl(path.join(packageRoot, 'indexes', `${name}.jsonl`)).filter((row) => row.record_type !== 'header');
}

function normalizeMetadata(row) {
  const raw = object(row);
  const evidenceId = text(raw.evidenceId ?? raw.evidence_id);
  const resourceType = text(raw.resourceType ?? raw.resource_type);
  const resourceKey = text(raw.resourceKey ?? raw.resource_key);
  if (!evidenceId || !resourceType || !resourceKey) {
    fail(`Analysis metadata row is missing identity: ${JSON.stringify(raw).slice(0, 300)}.`);
  }
  return {
    evidence_id: evidenceId,
    resource_type: resourceType,
    resource_key: resourceKey,
    title: text(raw.title),
    summary: text(raw.summary),
    description: text(raw.description),
    authenticated: raw.authenticated === true,
    definition: parseEmbeddedJson(raw.definitionJson ?? raw.definition_json),
    raw,
  };
}

function metadataDirectory(type) {
  return ({
    event: 'events',
    event_prop: 'event-properties',
    user_prop: 'user-properties',
    tag: 'tags',
    user_tag: 'tags',
    cluster: 'clusters',
    user_cluster: 'clusters',
    metric: 'metrics',
  })[text(type)] ?? 'other';
}

function metadataTypeLabel(type) {
  return ({
    event: '事件',
    event_prop: '事件属性',
    user_prop: '用户属性',
    tag: '标签',
    user_tag: '标签',
    cluster: '分群',
    user_cluster: '分群',
    metric: '指标元数据',
  })[text(type)] ?? `其他元数据（${text(type) || 'unknown'}）`;
}

function metadataDisplayTitle(item) {
  const row = object(item);
  return cleanDimensionTitle(row.title || row.resource_key, row.resource_key) || text(row.resource_key) || '未命名元数据';
}

function metadataRefsForReport(report) {
  const found = new Map();
  collectMetadataReferences(report.metric_occurrences, found);
  collectMetadataReferences(report.calculation_context, found);
  return [...found.values()].sort((left, right) =>
    text(left.evidence_id).localeCompare(text(right.evidence_id), 'en'));
}

function metadataRefsForMetric(metric) {
  const found = new Map();
  collectMetadataReferences(metric.metric_occurrences, found);
  collectMetadataReferences(metric.dependent_events, found);
  collectMetadataReferences(metric.dependent_properties, found);
  return [...found.values()].filter((item) => text(item.resource_type) !== 'metric').sort((left, right) =>
    text(left.evidence_id).localeCompare(text(right.evidence_id), 'en'));
}

function collectMetadataReferences(value, found, inheritedKind = null) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectMetadataReferences(item, found, inheritedKind));
    return;
  }
  if (value && typeof value === 'object') {
    const source = object(value);
    const metadataKind = metadataReferenceKind(source, inheritedKind);
    Object.entries(value).forEach(([key, item]) => {
      const expectedTypes = expectedMetadataTypes(key, metadataKind);
      if (expectedTypes && (typeof item === 'string' || typeof item === 'number')) {
        addMetadataCandidate(text(item), found, expectedTypes);
      } else if (key === 'sql' && typeof item === 'string') {
        collectSqlMetadataReferences(item, found);
      } else if (['group_by', 'groupBy'].includes(key) && Array.isArray(item)) {
        for (const group of item) {
          if (typeof group === 'string') addMetadataCandidate(group, found, new Set(['event_prop']));
          else collectMetadataReferences(group, found, metadataKind);
        }
      } else {
        collectMetadataReferences(item, found, metadataKind);
      }
    });
    return;
  }
}

function collectSqlMetadataReferences(value, found) {
  for (const match of value.matchAll(/["`]([^"`]+)["`]/g)) {
    let candidate = text(match[1]);
    if (!candidate || candidate.startsWith('$part_') || isSqlAlias(value, match.index ?? 0)) continue;
    if (candidate.startsWith('@vpc_cluster_tag_')) {
      candidate = candidate.slice('@vpc_cluster_'.length);
      addMetadataCandidate(candidate, found, new Set(['tag', 'user_tag']));
    } else if (candidate.startsWith('@vpc_cluster_')) {
      candidate = candidate.slice('@vpc_cluster_'.length);
      addMetadataCandidate(candidate, found, new Set(['cluster', 'user_cluster']));
    } else {
      candidate = candidate.replace(/^@vpc_tz_/, '');
      addMetadataCandidate(candidate, found, new Set(['event_prop', 'user_prop']));
    }
  }
  for (const match of value.matchAll(/["`]?\$part_event["`]?\s*=\s*'([^']+)'/gi)) {
    addMetadataCandidate(text(match[1]), found, new Set(['event']));
  }
  for (const match of value.matchAll(/["`]?\$part_event["`]?\s+in\s*\(([^)]*)\)/gi)) {
    for (const literal of match[1].matchAll(/'([^']+)'/g)) {
      addMetadataCandidate(text(literal[1]), found, new Set(['event']));
    }
  }
}

function isSqlAlias(sql, identifierStart) {
  return /\bas\s*$/is.test(sql.slice(Math.max(0, identifierStart - 12), identifierStart));
}

function metadataReferenceKind(source, inheritedKind) {
  const tableType = text(source.tableType ?? source.table_type);
  if (!tableType) return inheritedKind;
  if (tableType === '0') return 'event_property';
  if (tableType === '1') return 'user_property';
  if (tableType !== '2') return inheritedKind;
  const subTableType = text(source.subTableType ?? source.sub_table_type);
  if (subTableType.startsWith('tag_') || source.tagFilter === true) return 'tag';
  if (subTableType.startsWith('cluster_') || source.clusterFilter === true) return 'cluster';
  return 'tag_or_cluster';
}

function expectedMetadataTypes(key, metadataKind) {
  if (['event_name', 'eventName'].includes(key)) return new Set(['event']);
  if (['metric_key', 'metricName'].includes(key)) return new Set(['metric']);
  if (!['measure_key', 'measureKey', 'quota', 'columnName', 'column_name', 'prop'].includes(key)) return null;
  if (metadataKind === 'user_property') return new Set(['user_prop']);
  if (metadataKind === 'tag') return new Set(['tag', 'user_tag']);
  if (metadataKind === 'cluster') return new Set(['cluster', 'user_cluster']);
  if (metadataKind === 'tag_or_cluster') return new Set(['tag', 'user_tag', 'cluster', 'user_cluster']);
  return new Set(['event_prop']);
}

function addMetadataCandidate(candidate, found, expectedTypes) {
  for (const item of metadataByResourceKey.get(text(candidate)) ?? []) {
    if (!expectedTypes || expectedTypes.has(text(item.resource_type))) {
      found.set(text(item.evidence_id), item);
    }
  }
}

function metadataUsage() {
  const result = new Map();
  for (const report of reports) {
    for (const item of metadataRefsForReport(report)) {
      const id = text(item.evidence_id);
      if (!result.has(id)) result.set(id, []);
      result.get(id).push({ report_id: text(report.resource_key), report_name: text(report.title) });
    }
  }
  for (const [id, values] of result.entries()) {
    result.set(id, values.sort((left, right) => text(left.report_id).localeCompare(text(right.report_id), 'en')));
  }
  return result;
}

function metadataMetricUsage() {
  const result = new Map();
  for (const metric of metrics) {
    for (const item of metadataRefsForMetric(metric)) {
      const id = text(item.evidence_id);
      if (!result.has(id)) result.set(id, []);
      result.get(id).push({ metric_id: text(metric.resource_key), metric_name: text(metric.title) });
    }
  }
  for (const [id, values] of result.entries()) {
    result.set(id, values.sort((left, right) => text(left.metric_id).localeCompare(text(right.metric_id), 'en')));
  }
  return result;
}

function index(values, key) { return new Map(values.map((row) => [text(row[key]), row])); }
function fileMap(values, key, fallback) { return new Map(values.map((row) => [text(row[key]), `${safeFilePart(text(row[key]), fallback)}.md`])); }

function groupBy(values, key) {
  const result = new Map();
  for (const value of values) {
    const identity = text(value[key]);
    if (!result.has(identity)) result.set(identity, []);
    result.get(identity).push(value);
  }
  return result;
}

function valueCounts(values, key) {
  return Object.fromEntries([...groupBy(values, key).entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([identity, items]) => [identity, items.length]));
}

function parseEmbeddedJson(value) {
  if (value && typeof value === 'object') return value;
  const source = text(value);
  if (!source) return {};
  try {
    return JSON.parse(source);
  } catch {
    return { raw_value: source };
  }
}

function uniqueObjects(values, key) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const item = object(value);
    const identity = text(item[key]);
    if (identity && !seen.has(identity)) {
      seen.add(identity);
      result.push(item);
    }
  }
  return result;
}

function materialize(output, replace, write) {
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  if (fs.existsSync(output) && !replace) fail(`Output already exists: ${output}. Pass --force to replace it.`);
  const nonce = `${process.pid}-${randomBytes(6).toString('hex')}`;
  const staging = path.join(parent, `.${path.basename(output)}.staging-${nonce}`);
  const backup = path.join(parent, `.${path.basename(output)}.backup-${nonce}`);
  fs.mkdirSync(staging, { recursive: false });
  let moved = false;
  try {
    write(staging);
    if (fs.existsSync(output)) {
      fs.renameSync(output, backup);
      moved = true;
    }
    fs.renameSync(staging, output);
    if (moved) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    if (moved && !fs.existsSync(output)) fs.renameSync(backup, output);
    throw error;
  }
}

function assertSafePaths(source, output) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) fail(`Asset package directory does not exist: ${source}`);
  if (!fs.existsSync(domainPlanPath) || !fs.statSync(domainPlanPath).isFile()) fail(`Business domain plan does not exist: ${domainPlanPath}`);
  if (output === path.parse(output).root) fail('Output cannot be a filesystem root.');
  if (output === source || output.startsWith(`${source}${path.sep}`) || source.startsWith(`${output}${path.sep}`)) {
    fail('Asset package and output directories must not contain each other.');
  }
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    if (['force', 'allow-truncated', 'allow-all-visible', 'allow-semantic-plan-snapshot-drift'].includes(name)) result[name] = true;
    else {
      const value = values[index + 1];
      if (!value || value.startsWith('--')) fail(`Missing value for --${name}.`);
      result[name] = value;
      index += 1;
    }
  }
  return result;
}

function requiredArg(values, name) {
  const value = text(values[name]);
  if (!value) fail(`--${name} is required.`);
  return value;
}

function readObject(file, label) {
  if (!fs.existsSync(file)) fail(`Missing ${label}: ${file}`);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be a JSON object.`);
  return value;
}

function readJsonl(file) {
  if (!fs.existsSync(file)) fail(`Missing JSONL file: ${file}`);
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim()).map((line, lineIndex) => {
    try {
      const value = JSON.parse(line);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected a JSON object');
      return value;
    } catch (error) {
      fail(`${file} line ${lineIndex + 1}: ${error.message}`);
    }
  });
}

function jsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const content = text(value);
  if (!content) return {};
  try {
    const parsed = JSON.parse(content);
    return object(parsed);
  } catch {
    return {};
  }
}

function readPackageJson(relativePath) {
  const relative = text(relativePath);
  if (!relative || path.isAbsolute(relative) || /[\x00]/.test(relative)) return {};
  const file = path.resolve(packageRoot, relative);
  if (file !== packageRoot && !file.startsWith(`${packageRoot}${path.sep}`)) return {};
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return {};
  if (packageJsonCache.has(file)) return packageJsonCache.get(file);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const result = object(parsed);
    packageJsonCache.set(file, result);
    return result;
  } catch {
    packageJsonCache.set(file, {});
    return {};
  }
}

function compactSqlFragment(value) {
  const normalized = sanitizeVisibleSqlSemanticText(value).replace(/\s+/g, ' ');
  if (!normalized) return '';
  return normalized.length <= 260 ? normalized : `${normalized.slice(0, 240)}...`;
}

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) {
  if (value == null) return '';
  const normalized = String(value).trim();
  return normalized === 'undefined' || normalized === '[object Object]' || normalized === 'null' ? '' : normalized;
}
function count(value) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }
function sort(values, key) { return [...values].sort((a, b) => text(a[key]).localeCompare(text(b[key]), 'en')); }
function jsonFence(value) { return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``; }
function jsonInline(value) { return value == null ? 'none' : `\`${JSON.stringify(value)}\``; }
function yaml(value) { return JSON.stringify(text(value)); }
function cleanDisplayText(value) {
  return cleanQuestionMarkPlaceholders(text(value)
    .replace(new RegExp('\\r?\\n', 'g'), ' ')
    .replace(/�/g, ''))
    .replace(/^(?:[?？]\s*){2,}(?=\S)/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanQuestionMarkPlaceholders(value) {
  return text(value).replace(new RegExp('(^|\\s)(?:[?？]\\s*){2,}(?=\\S)', 'g'), '$1');
}

function heading(value) { return cleanDisplayText(value).replace(/^#+\s*/, ''); }
function link(value) { return cleanDisplayText(value).replace(/([\[\]])/g, '\\$1'); }
function table(value) { return cleanDisplayText(value).replace(/\|/g, '\\|'); }

function safeFilePart(value, fallback) {
  const normalized = value.normalize('NFKC').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (normalized && normalized.length <= 80) return normalized;
  return `${fallback}-${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function writeText(file, value) { fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`, 'utf8'); }
function writeJson(file, value) { writeText(file, JSON.stringify(value, null, 2)); }
function fail(message) { throw new Error(message); }
