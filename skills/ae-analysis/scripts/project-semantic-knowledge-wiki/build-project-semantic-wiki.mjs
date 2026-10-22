#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { precompiledSource, normalizeSourceForHash } from './precompiled-source.mjs';
import { reportContract } from './execution-contract.mjs';

const require = createRequire(import.meta.url);
const archiverModule = require('archiver');
const archiver = archiverModule.default ?? archiverModule;
const ZipArchive = archiverModule.ZipArchive;

const args = parseArgs(process.argv.slice(2));
const packageRoot = path.resolve(required(args, 'asset-package'));
const semanticPlanPath = path.resolve(required(args, 'semantic-plan'));
const outputRoot = path.resolve(required(args, 'output'));
const archivePath = path.resolve(args.archive || `${outputRoot}.zip`);
const uploadSourcesPath = path.resolve(args['upload-sources-output'] || `${outputRoot}-kb-upload-sources`);
const projectNameOverride = clean(args['project-name']);
const force = Boolean(args.force);
const keepBuildIr = Boolean(args['keep-build-ir']);
const allowAllVisible = Boolean(args['allow-all-visible']);
const allowSemanticPlanSnapshotDrift = Boolean(args['allow-semantic-plan-snapshot-drift']);

assertSafePaths(packageRoot, outputRoot, archivePath, uploadSourcesPath);

const descriptor = readJson(path.join(packageRoot, '.asset-package.json'));
const packageManifest = readJson(path.join(packageRoot, 'manifest.json'));
if (String(descriptor.schema_version ?? packageManifest.schema_version) !== '3.0') {
  fail('Project semantic asset package schema 3.0 is required.');
}
if ((descriptor.truncated ?? packageManifest.truncated) === true) {
  fail('A truncated asset package cannot produce a project semantic knowledge Wiki.');
}
const filterPolicy = asObject(descriptor.filter_policy ?? packageManifest.filter_policy);
const packageAssetScope = clean(descriptor.asset_scope ?? packageManifest.asset_scope);
if (packageAssetScope === 'governed') {
  if (filterPolicy.authenticated_entry_assets_only !== true || filterPolicy.dependency_closure !== true) {
    fail('The governed Wiki package must declare authenticated_entry_assets_only=true and dependency_closure=true.');
  }
} else if (packageAssetScope === 'all_visible') {
  if (!allowAllVisible) {
    fail('The Wiki defaults to governed packages. Pass --allow-all-visible only when the user explicitly requested all visible assets.');
  }
} else {
  fail(`The Wiki supports asset_scope=governed by default or asset_scope=all_visible with --allow-all-visible, received ${packageAssetScope || 'unknown'}.`);
}

const semanticProjectId = Number(descriptor.project_id ?? packageManifest.project_id);
const snapshotHash = clean(descriptor.snapshot_hash ?? packageManifest.snapshot_hash);
if (!Number.isInteger(semanticProjectId) || semanticProjectId < 1) fail('A valid semantic project ID is required.');
if (!/^[0-9a-f]{64}$/i.test(snapshotHash)) fail('A valid asset-package snapshot hash is required.');
const projectName = projectNameOverride || clean(descriptor.project_name ?? packageManifest.project_name)
  || `Project ${semanticProjectId}`;
const uploadSourceNamespace = normalizeUploadSourceNamespace(args['upload-source-namespace'] || `pskb-p${semanticProjectId}`);
const snapshotDate = normalizeSnapshotDate(args['snapshot-date'] || descriptor.generated_at || packageManifest.generated_at);

const semanticPlan = readJson(semanticPlanPath);
if (clean(semanticPlan.schema_version) !== '2.0') fail('Project semantic knowledge Wiki plan schema 2.0 is required.');
if (clean(semanticPlan.source_snapshot_hash) !== snapshotHash && !allowSemanticPlanSnapshotDrift) {
  fail('Semantic plan snapshot hash does not match the asset package.');
}
if (clean(semanticPlan.generation_method) !== 'agent_semantic_synthesis') {
  fail('Semantic plan generation_method must be agent_semantic_synthesis.');
}

const dashboards = readIndex('dashboard-catalog');
const reports = readIndex('report-catalog');
const metrics = readIndex('metric-catalog');
const containers = readIndex('asset-containers');
const adoptedPersonalSemantics = readPackageJsonl('sources/adopted-personal-semantics.jsonl');
const eventGroups = readOptionalIndex('event-groups');
const dashboardById = indexBy(dashboards, 'resource_key');
const reportById = indexBy(reports, 'resource_key');
const metricById = indexBy(metrics, 'resource_key');
const adoptedPersonalBySourceId = indexBy(adoptedPersonalSemantics, 'source_id');
const dashboardFileNames = titleFirstAssetFileMap(dashboards, 'dashboard');
const reportFileNames = titleFirstAssetFileMap(reports, 'report');
const metricFileNames = titleFirstAssetFileMap(metrics, 'metric');
const titleFirstAssetPathMap = titleFirstAssetPathRewrites();
const containerById = indexBy(containers, 'container_key');
const domains = asArray(semanticPlan.domains);
const appendices = asArray(semanticPlan.appendices);
const personalSemanticIntegrations = asArray(semanticPlan.personal_semantic_integrations);
const domainByDashboardId = new Map();
const appendixByDashboardId = new Map();
for (const domain of domains) for (const id of asArray(domain.dashboard_ids).map(clean)) domainByDashboardId.set(id, domain);
for (const appendix of appendices) for (const id of asArray(appendix.dashboard_ids).map(clean)) appendixByDashboardId.set(id, appendix);

const planModel = validateSemanticPlan();
const semanticPlanState = buildSemanticPlanState();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'project-semantic-knowledge-wiki-'));
const buildIr = path.join(scratch, 'build-ir');

try {
  const generator = path.join(import.meta.dirname, 'generate-build-ir.mjs');
  const generatorArgs = [generator, '--asset-package', packageRoot, '--domain-plan', semanticPlanPath,
    '--output', buildIr, '--project-name', projectName];
  if (allowAllVisible) generatorArgs.push('--allow-all-visible');
  if (allowSemanticPlanSnapshotDrift) generatorArgs.push('--allow-semantic-plan-snapshot-drift');
  execFileSync(process.execPath, generatorArgs, { stdio: 'pipe' });

  const corpus = readJson(path.join(buildIr, 'corpus.json'));
  const conflictReportIds = new Set(reports
    .filter((report) => fs.readFileSync(path.join(buildIr, 'briefs', 'reports', fileName('report', report.resource_key)), 'utf8')
      .includes('semantic_conflict'))
    .map((report) => clean(report.resource_key)));
  const authorityRows = [];

  materialize(outputRoot, force, (staging) => {
    const wikiRoot = path.join(staging, 'wiki');
    for (const directory of [
      'domains', 'technical-appendices', 'source-containers', 'dashboards', 'reports', 'metrics',
      'metadata', 'recall-cards', 'personal-semantics', 'governance', 'common', 'event-map', 'asset-index',
    ]) fs.mkdirSync(path.join(wikiRoot, directory), { recursive: true });
    for (const type of ['background', 'preference', 'experience', 'asset-context']) {
      fs.mkdirSync(path.join(wikiRoot, 'personal-semantics', type), { recursive: true });
    }

    for (const metadataType of fs.readdirSync(path.join(buildIr, 'metadata'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
      fs.mkdirSync(path.join(wikiRoot, 'metadata', metadataType), { recursive: true });
    }

    for (const domain of domains) {
      const id = clean(domain.domain_id);
      const source = readText(path.join(buildIr, 'domains', fileName('domain', id)));
      const cards = asArray(domain.recall_cards);
      const cardLinks = cards.map((card) => `- [${escapeLink(card.intent || card.card_id)}](../recall-cards/${fileName('recall-card', card.card_id)})`).join('\n');
      writeText(path.join(wikiRoot, 'domains', fileName('domain', id)),
        replaceFrontmatter(source, domainFrontmatter(domain))
          + `\n## 场景召回卡\n\n${cardLinks || '- 无'}\n`
          + renderTargetedKnowledge('domain', id, '../personal-semantics/'));
    }

    for (const appendix of appendices) {
      const id = clean(appendix.appendix_id);
      const source = readText(path.join(buildIr, 'appendices', fileName('appendix', id)))
        .replaceAll('../appendices/', '../technical-appendices/');
      writeText(path.join(wikiRoot, 'technical-appendices', fileName('appendix', id)),
        replaceFrontmatter(source, appendixFrontmatter(appendix)));
    }

    copyIndex(path.join(buildIr, 'domains', 'index.md'), path.join(wikiRoot, 'domains', 'index.md'));
    copyIndex(path.join(buildIr, 'appendices', 'index.md'), path.join(wikiRoot, 'technical-appendices', 'index.md'));
    copyIndex(path.join(buildIr, 'source-containers', 'index.md'), path.join(wikiRoot, 'source-containers', 'index.md'));

    for (const container of containers) {
      const id = clean(container.container_key);
      const source = readText(path.join(buildIr, 'source-containers', fileName('container', id)));
      writeText(path.join(wikiRoot, 'source-containers', fileName('container', id)), source);
    }

    for (const dashboard of dashboards) {
      const id = clean(dashboard.resource_key);
      const authority = dashboardAuthority(dashboard);
      authorityRows.push({ resource_type: 'dashboard', resource_key: id, title: assetReadableTitle(dashboard, 'dashboard'), ...authority });
      writeMergedAsset(wikiRoot, 'dashboards', dashboard, authority);
    }

    for (const report of reports) {
      const id = clean(report.resource_key);
      const authority = reportAuthority(report, conflictReportIds);
      authorityRows.push({ resource_type: 'report', resource_key: id, title: assetReadableTitle(report, 'report'), ...authority });
      writeMergedAsset(wikiRoot, 'reports', report, authority);
    }

    for (const metric of metrics) {
      const id = clean(metric.resource_key);
      const authority = metricAuthority(metric);
      authorityRows.push({ resource_type: 'metric', resource_key: id, title: assetReadableTitle(metric, 'metric'), ...authority });
      writeMergedAsset(wikiRoot, 'metrics', metric, authority);
    }

    for (const type of fs.readdirSync(path.join(buildIr, 'metadata'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
      for (const file of fs.readdirSync(path.join(buildIr, 'metadata', type)).filter((name) => name.endsWith('.md'))) {
        const source = readText(path.join(buildIr, 'metadata', type, file));
        const briefPath = path.join(buildIr, 'briefs', 'metadata', type, file);
        const brief = fs.existsSync(briefPath) ? readText(briefPath) : '';
        const identity = frontmatterValue(source, 'evidence_id') || file.replace(/\.md$/, '');
        const authority = {
          authority_role: 'dependency_only', certification_state: frontmatterValue(source, 'authenticated') === 'true' ? 'certified' : 'uncertified',
          definition_state: 'valid', runtime_policy: 'warn', standalone_recall: false, canonical_asset_id: null,
        };
        authorityRows.push({ resource_type: 'metadata', resource_key: identity, title: firstHeading(source), ...authority });
        writeText(path.join(wikiRoot, 'metadata', type, file), mergePage(source, brief,
          authorityFrontmatter('project-analysis-metadata', identity, firstHeading(source), authority)));
      }
    }

    copyIndex(path.join(buildIr, 'dashboards', 'index.md'), path.join(wikiRoot, 'dashboards', 'index.md'));
    writeText(path.join(wikiRoot, 'reports', 'index.md'), renderReportIndex());
    copyIndex(path.join(buildIr, 'metrics', 'index.md'), path.join(wikiRoot, 'metrics', 'index.md'));
    copyIndex(path.join(buildIr, 'metadata', 'index.md'), path.join(wikiRoot, 'metadata', 'index.md'));

    for (const card of planModel.cards) {
      writeText(path.join(wikiRoot, 'recall-cards', fileName('recall-card', card.card_id)), renderRecallCard(card));
    }
    writeText(path.join(wikiRoot, 'recall-cards', 'index.md'), renderRecallCardIndex(planModel.cards));

    writeText(path.join(wikiRoot, 'common', 'index.md'), renderCommonIndex());
    writeText(path.join(wikiRoot, 'asset-index', 'index.md'), renderAssetIndex());
    writeEventMap(wikiRoot, buildIr);

    for (const integration of planModel.personalSemanticIntegrations) {
      const contextPath = personalSemanticContextPath(integration.context_type);
      writeText(path.join(wikiRoot, 'personal-semantics', contextPath,
        fileName('personal-semantic', integration.integration_id)), renderPersonalSemanticIntegration(integration));
    }
    writeText(path.join(wikiRoot, 'personal-semantics', 'index.md'),
      renderPersonalSemanticIndex(planModel.personalSemanticIntegrations));
    for (const type of ['background', 'preference', 'experience', 'asset_context']) {
      writeText(path.join(wikiRoot, 'personal-semantics', personalSemanticContextPath(type), 'index.md'),
        renderPersonalSemanticTypeIndex(type, planModel.personalSemanticIntegrations));
    }

    const coverage = readText(path.join(buildIr, 'indexes', 'coverage.md'))
      .replaceAll('../appendices/', '../technical-appendices/')
      .replaceAll('../briefs/reports/', '../reports/')
      .replaceAll('../briefs/metadata/', '../metadata/');
    writeText(path.join(wikiRoot, 'governance', 'coverage.md'), coverage);
    writeText(path.join(wikiRoot, 'governance', 'authority-index.md'), renderAuthorityIndex(authorityRows));
    writeText(path.join(wikiRoot, 'governance', 'knowledge-adoption.md'), renderKnowledgeAdoptionIndex());
    writeText(path.join(wikiRoot, 'governance', 'index.md'), renderGovernanceIndex(conflictReportIds.size));
    writeText(path.join(wikiRoot, 'governance', 'source-project-boundary.md'), renderSourceProjectBoundary(sourceProjectReferencesFromPackage()));
    writeText(path.join(wikiRoot, 'project-overview.md'), renderProjectOverview(corpus));
    writeText(path.join(wikiRoot, 'index.md'), renderWikiIndex(corpus));
    writeText(path.join(wikiRoot, 'log.md'), renderLog(corpus));
    writeText(path.join(staging, 'index.md'), renderSnapshotIndex(corpus));
    writeText(path.join(staging, 'refresh-state.md'), renderRefreshState(semanticPlanState));

    const sourceProjectRefs = sourceProjectReferencesFromPackage();
    const sourceProjectIds = [...new Set(sourceProjectRefs.map((row) => row.source_project_id))].sort((a, b) => a - b);
    const blockedCount = authorityRows.filter((row) => row.runtime_policy === 'block').length;
    const unknownSqlCount = reports.filter((report) => clean(report.definition_kind) === 'SQL'
      && sqlFinalDefinitionState(report) === 'unknown').length;
    const bundleManifest = {
      schema_version: '1.0',
      package_kind: 'ae_project_semantic_knowledge_wiki',
      semantic_project_id: semanticProjectId,
      source_project_ids: sourceProjectIds,
      source_project_id_status: sourceProjectRefs.length ? 'detected_in_packaged_definitions' : 'not_exposed',
      project_name: projectName,
      source_snapshot_hash: snapshotHash,
      semantic_plan_hash: semanticPlanState.plan_hash,
      semantic_plan_state_schema_version: semanticPlanState.schema_version,
      semantic_plan_fragment_count: semanticPlanState.fragments.length,
      asset_package_schema_version: '3.0',
      asset_scope: packageAssetScope,
      wiki_schema_version: '2.0',
      navigation_taxonomy_version: '2.1',
      generated_at: descriptor.generated_at ?? packageManifest.generated_at ?? null,
      counts: { ...corpus.counts, recall_cards: planModel.cards.length,
        adopted_personal_semantics: adoptedPersonalSemantics.length,
        personal_semantic_integrations: planModel.personalSemanticIntegrations.length,
        blocked_assets: blockedCount, unknown_sql_reports: unknownSqlCount },
      quality_warnings: [...asArray(corpus.warnings),
        ...planModel.cards.filter(card => !card.routing).map(card => `Recall card ${card.card_id} has legacy routing; precise intent branches require semantic review.`),
        ...(sourceProjectRefs.filter((row) => Number(row.source_project_id) !== semanticProjectId).length
          ? [`${sourceProjectRefs.filter((row) => Number(row.source_project_id) !== semanticProjectId).length} packaged asset reference(s) mention another project: ${sourceProjectRefs.filter((row) => Number(row.source_project_id) !== semanticProjectId).slice(0, 5).map((row) => `${row.resource_type}:${row.resource_key}->${row.source_project_id}`).join(', ')}`] : []),
        ...(unknownSqlCount ? [`${unknownSqlCount} SQL reports have unknown semantics and are blocked.`] : []),
      ],
    };
    writeJson(path.join(staging, 'manifest.json'), bundleManifest);

    rewriteTitleFirstAssetLinks(staging, titleFirstAssetPathMap);
    assertNoBareNumericAssetFiles(wikiRoot);
    hideMarkdownFrontmatter(staging);
    assertNoForbiddenPublishedLayers(staging);
    assertSnapshotEntryPoint(staging);
    assertMarkdownLinks(staging);
  });

  const uploadSources = writeFlatUploadSources(outputRoot, uploadSourcesPath, force);
  assertPrecompiledSourceQuality(uploadSourcesPath);
  await writeDeterministicZip(outputRoot, archivePath, force);
  const resultManifest = readJson(path.join(outputRoot, 'manifest.json'));
  process.stdout.write(`${JSON.stringify({
    output_path: outputRoot,
    archive_path: archivePath,
    archive_bytes: fs.statSync(archivePath).size,
    upload_sources_path: uploadSourcesPath,
    upload_source_count: uploadSources.count,
    upload_source_namespace: uploadSources.namespace,
    upload_manifest_path: uploadSources.manifestPath,
    ...resultManifest,
  }, null, 2)}\n`);
} finally {
  if (keepBuildIr) {
    process.stderr.write(`Build IR preserved at ${buildIr}\n`);
  } else {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function validateSemanticPlan() {
  if (!domains.length) fail('The semantic plan must contain at least one business domain.');
  const cards = [];
  const cardIds = new Set();
  const excludedByAsset = new Map();
  const preferredByAsset = new Map();
  const domainIds = new Set(domains.map((domain) => clean(domain.domain_id)).filter(Boolean));
  const projectBusinessModel = validateProjectBusinessModel(semanticPlan.project_business_model, domainIds);
  for (const domain of domains) {
    const domainId = clean(domain.domain_id);
    const domainDashboardIds = new Set(asArray(domain.dashboard_ids).map(clean));
    const domainReportIds = new Set(reports.filter((report) => asArray(report.dashboard_refs)
      .some((ref) => domainDashboardIds.has(clean(ref.dashboard_id)))).map((report) => clean(report.resource_key)));
    const domainMetricIds = new Set(reports.filter((report) => domainReportIds.has(clean(report.resource_key)))
      .flatMap((report) => asArray(report.metric_occurrences).map((item) => clean(item.metric_key)).filter(Boolean)));
    validateDomainJudgmentModel(domain.domain_judgment_model, domainId, domainDashboardIds, domainReportIds, domainMetricIds);
    const recallCards = asArray(domain.recall_cards);
    if (!recallCards.length) fail(`Domain ${domainId || '<unknown>'} must contain at least one recall card.`);
    for (const value of recallCards) {
      const card = asObject(value);
      const cardId = clean(card.card_id);
      if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(cardId) || cardIds.has(cardId)) fail(`Invalid or duplicate recall card ID: ${cardId || '<empty>'}.`);
      cardIds.add(cardId);
      if (!asArray(card.questions).map(clean).filter(Boolean).length || !clean(card.intent)) fail(`Recall card ${cardId} requires questions and intent.`);
      assertAgentAuthoredRecallCard(card, domainId);
      const preferred = asArray(card.preferred_asset_refs);
      if (!preferred.length) fail(`Recall card ${cardId} requires at least one preferred asset.`);
      for (const ref of [...preferred, ...asArray(card.fallback_asset_refs)]) {
        validateAssetRef(ref, cardId);
        const type = clean(ref.resource_type);
        const key = clean(ref.resource_key);
        const inDomain = type === 'dashboard' ? domainDashboardIds.has(key)
          : type === 'report' ? domainReportIds.has(key)
            : type === 'metric' ? domainMetricIds.has(key) : false;
        if (!inDomain) fail(`Recall card ${cardId} references ${type}:${key} outside domain ${domainId}.`);
        if (preferred.includes(ref)) addMulti(preferredByAsset, `${type}:${key}`, cardId);
      }
      const routing = asObject(card.routing);
      if (card.routing != null) {
        for (const field of ['applicable_when', 'answer_grain', 'stop_when', 'fallback_when_unavailable', 'evidence_boundary']) {
          if (!clean(routing[field])) fail(`Recall card ${cardId} routing requires ${field}.`);
        }
        if (!asArray(routing.branches).length) fail(`Recall card ${cardId} routing requires branches.`);
        for (const branch of asArray(routing.branches)) {
          if (!clean(branch.when) || !asArray(branch.asset_refs).length) {
            fail(`Recall card ${cardId} routing branch requires when and asset_refs.`);
          }
          for (const ref of asArray(branch.asset_refs)) {
            validateAssetRef(ref, cardId);
            if (![...preferred, ...asArray(card.fallback_asset_refs)].some((allowed) =>
              clean(allowed.resource_type) === clean(ref.resource_type) && clean(allowed.resource_key) === clean(ref.resource_key))) {
              fail(`Recall card ${cardId} routing branch references an asset outside preferred/fallback refs.`);
            }
          }
          const combination = asObject(branch.combination);
          if (branch.combination != null) {
            if (!['compatible', 'incompatible', 'unknown'].includes(clean(combination.compatibility))) fail(`Recall card ${cardId} has invalid combination compatibility.`);
            if (!clean(combination.reason)) fail(`Recall card ${cardId} combination requires an evidence-based reason.`);
            if (combination.compatibility === 'compatible'
              && (!asArray(combination.join_keys).length || !clean(combination.time_alignment))) {
              fail(`Recall card ${cardId} compatible combination requires join_keys and time_alignment.`);
            }
            for (const ref of asArray(branch.asset_refs).filter(ref => ref.resource_type === 'report')) {
              const summary = asArray(semanticPlan.sql_report_semantics).find(row => clean(row.report_id) === clean(ref.resource_key));
              if (summary && combination.compatibility === 'compatible'
                && asArray(combination.join_keys).some(key => !asArray(summary.output_fields).some(field => clean(field.name) === clean(key)))) {
                fail(`Recall card ${cardId} join key is not an output field of report ${ref.resource_key}.`);
              }
            }
          }
        }
      }
      for (const ref of asArray(card.excluded_asset_refs)) {
        validateAssetRef(ref, cardId);
        if (!clean(ref.reason)) fail(`Recall card ${cardId} excluded asset ${clean(ref.resource_key)} is missing a reason.`);
        addMulti(excludedByAsset, `${clean(ref.resource_type)}:${clean(ref.resource_key)}`, {
          card_id: cardId, reason: clean(ref.reason), canonical_resource_key: clean(ref.canonical_resource_key),
        });
      }
      cards.push({ ...card, domain_id: domainId, domain_title: clean(domain.title) });
    }
  }

  const sqlReports = reports.filter((report) => clean(report.definition_kind) === 'SQL');
  const sqlByReportId = new Map();
  for (const summary of asArray(semanticPlan.sql_report_semantics)) {
    const row = asObject(summary);
    const reportId = clean(row.report_id);
    if (!reportById.has(reportId) || clean(reportById.get(reportId).definition_kind) !== 'SQL') {
      fail(`SQL semantics references unknown or non-SQL report ${reportId || '<empty>'}.`);
    }
    if (sqlByReportId.has(reportId)) fail(`Duplicate SQL semantics for report ${reportId}.`);
    for (const field of ['business_purpose', 'statistical_grain', 'evidence_locator']) {
      if (!clean(row[field])) fail(`SQL report ${reportId} is missing ${field}.`);
    }
    for (const field of ['input_parameters', 'output_fields', 'key_filters', 'default_limits', 'applicable_questions', 'non_applicable_questions']) {
      if (!Array.isArray(row[field])) fail(`SQL report ${reportId} must declare ${field} as an array.`);
    }
    if (!['valid', 'unknown'].includes(clean(row.definition_state))) fail(`SQL report ${reportId} has invalid definition_state.`);
    if (clean(row.evidence_locator) !== clean(reportById.get(reportId).source_detail_path)) {
      fail(`SQL report ${reportId} evidence_locator must equal its packaged source_detail_path.`);
    }
    if (clean(row.definition_state) === 'valid'
      && (!row.output_fields.length || !row.applicable_questions.length || !row.non_applicable_questions.length)) {
      fail(`SQL report ${reportId} marked valid requires output fields plus applicable and non-applicable questions.`);
    }
    sqlByReportId.set(reportId, row);
  }
  const missingSql = sqlReports.map((report) => clean(report.resource_key)).filter((id) => !sqlByReportId.has(id));
  if (missingSql.length && !allowAllVisible) {
    fail(`Semantic plan is missing SQL semantics for ${missingSql.length} report(s): ${missingSql.join(', ')}`);
  }
  const personalIntegrations = validatePersonalSemanticIntegrations(domainIds, cardIds);

  return {
    cards,
    personalSemanticIntegrations: personalIntegrations,
    excludedByAsset,
    preferredByAsset,
    sqlByReportId,
    missingSqlByReportId: new Set(missingSql),
    projectBusinessModel,
  };
}

function validatePersonalSemanticIntegrations(domainIds, cardIds) {
  const integrationIds = new Set();
  const referencedSourceIds = new Set();
  const integrations = [];
  for (const [index, value] of personalSemanticIntegrations.entries()) {
    const row = asObject(value);
    const integrationId = clean(row.integration_id);
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(integrationId) || integrationIds.has(integrationId)) {
      fail(`Invalid or duplicate personal semantic integration ID: ${integrationId || `<index ${index}>`}.`);
    }
    integrationIds.add(integrationId);
    const contextType = normalizePersonalSemanticContextType(row.context_type);
    const sourceIds = asArray(row.source_ids).map(clean).filter(Boolean);
    if (!sourceIds.length) fail(`Personal semantic integration ${integrationId} requires source_ids.`);
    for (const sourceId of sourceIds) {
      const source = adoptedPersonalBySourceId.get(sourceId);
      if (!source) fail(`Personal semantic integration ${integrationId} references unknown source ${sourceId}.`);
      if (normalizePersonalSemanticContextType(source.context_type) !== contextType) {
        fail(`Personal semantic integration ${integrationId} mixes context_type ${contextType} with source ${sourceId}:${source.context_type}.`);
      }
      referencedSourceIds.add(sourceId);
    }
    const title = clean(row.title);
    const projectUsage = clean(row.project_usage);
    const boundaries = asArray(row.boundaries).map(clean).filter(Boolean);
    const conflictPolicy = clean(row.conflict_policy);
    if (!title || !projectUsage) fail(`Personal semantic integration ${integrationId} requires title and project_usage.`);
    if (!['compatible', 'scoped', 'blocked'].includes(conflictPolicy)) {
      fail(`Personal semantic integration ${integrationId} has invalid conflict_policy.`);
    }
    if (!boundaries.length) fail(`Personal semantic integration ${integrationId} requires boundaries.`);
    const target = validatePersonalSemanticIntegrationTarget(row.integration_target, integrationId, domainIds, cardIds);
    integrations.push({ ...row, integration_id: integrationId, context_type: contextType,
      source_ids: sourceIds, title, project_usage: projectUsage, boundaries, conflict_policy: conflictPolicy,
      integration_target: target });
  }
  const missing = adoptedPersonalSemantics
    .map((source) => clean(source.source_id))
    .filter((sourceId) => sourceId && !referencedSourceIds.has(sourceId));
  if (missing.length) {
    fail(`Semantic plan is missing adopted personal semantic source(s): ${missing.join(', ')}`);
  }
  return integrations;
}

function validatePersonalSemanticIntegrationTarget(value, integrationId, domainIds, cardIds) {
  const target = asObject(value);
  const type = clean(target.target_type);
  const id = clean(target.target_id);
  if (!['project', 'domain', 'asset', 'recall_card'].includes(type)) {
    fail(`Personal semantic integration ${integrationId} has invalid integration_target.target_type.`);
  }
  if (type === 'project') return { target_type: type, target_id: id || 'project' };
  if (!id) fail(`Personal semantic integration ${integrationId} target ${type} requires target_id.`);
  if (type === 'domain' && !domainIds.has(id)) fail(`Personal semantic integration ${integrationId} references unknown domain ${id}.`);
  if (type === 'recall_card' && !cardIds.has(id)) fail(`Personal semantic integration ${integrationId} references unknown recall card ${id}.`);
  if (type === 'asset') {
    const [assetType, assetKey] = id.includes(':') ? id.split(/:(.*)/s).filter(Boolean) : ['', id];
    const exists = assetType === 'dashboard' ? dashboardById.has(assetKey)
      : assetType === 'report' ? reportById.has(assetKey)
        : assetType === 'metric' ? metricById.has(assetKey)
          : dashboardById.has(assetKey) || reportById.has(assetKey) || metricById.has(assetKey);
    if (!exists) fail(`Personal semantic integration ${integrationId} references unknown asset target ${id}.`);
  }
  return { target_type: type, target_id: id };
}

function validateProjectBusinessModel(value, domainIds) {
  const model = asObject(value);
  const businessPositioning = clean(model.business_positioning);
  const audienceRoles = asArray(model.audience_roles).map(clean).filter(Boolean);
  const businessObjects = asArray(model.business_objects).map((item, index) => {
    const row = asObject(item);
    const objectId = clean(row.object_id);
    const name = clean(row.name);
    const meaning = clean(row.meaning);
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(objectId)) fail(`project_business_model.business_objects[${index}] has invalid object_id.`);
    if (!name || !meaning) fail(`project_business_model.business_objects[${index}] requires name and meaning.`);
    const evidenceRefs = normalizePlanAssetRefs(row.evidence_refs, `business object ${objectId}`);
    if (!evidenceRefs.length) fail(`business object ${objectId} requires evidence_refs.`);
    return { object_id: objectId, name, meaning, evidence_refs: evidenceRefs };
  });
  const objectNames = new Set(businessObjects.map((item) => item.name));
  const objectRelationships = asArray(model.object_relationships).map((item, index) => {
    const row = asObject(item);
    const fromObject = clean(row.from_object);
    const toObject = clean(row.to_object);
    const relationship = clean(row.relationship);
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
  const decisionChains = asArray(model.decision_chains).map((item, index) => {
    const row = asObject(item);
    const chainId = clean(row.chain_id);
    const title = clean(row.title);
    const decisionQuestion = clean(row.decision_question);
    const signals = asArray(row.signals).map(clean).filter(Boolean);
    const decisionSteps = asArray(row.decision_steps).map(clean).filter(Boolean);
    const preferredDomainIds = asArray(row.preferred_domain_ids).map(clean).filter(Boolean);
    const assetRefs = normalizePlanAssetRefs(row.asset_refs, `decision chain ${chainId || index + 1}`);
    const boundaries = asArray(row.boundaries).map(clean).filter(Boolean);
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
  const nonGoals = asArray(model.non_goals).map(clean).filter(Boolean);
  if (!businessPositioning) fail('project_business_model requires business_positioning.');
  if (!audienceRoles.length) fail('project_business_model requires audience_roles.');
  if (!businessObjects.length) fail('project_business_model requires business_objects.');
  if (!objectRelationships.length) fail('project_business_model requires object_relationships.');
  if (!decisionChains.length) fail('project_business_model requires decision_chains.');
  if (!nonGoals.length) fail('project_business_model requires non_goals.');
  return {
    business_positioning: businessPositioning,
    audience_roles: audienceRoles,
    business_objects: businessObjects,
    object_relationships: objectRelationships,
    decision_chains: decisionChains,
    non_goals: nonGoals,
  };
}

function validateDomainJudgmentModel(value, domainId, domainDashboardIds, domainReportIds, domainMetricIds) {
  const model = asObject(value);
  const businessStateJudged = clean(model.business_state_judged);
  const mainObjects = asArray(model.main_objects).map(clean).filter(Boolean);
  const signals = asArray(model.signals).map(clean).filter(Boolean);
  const decisionPath = asArray(model.decision_path).map(clean).filter(Boolean);
  const boundaries = asArray(model.boundaries).map(clean).filter(Boolean);
  const attachmentLogic = asArray(model.asset_attachment_logic);
  if (!businessStateJudged) fail(`Domain ${domainId} is missing domain_judgment_model.business_state_judged.`);
  if (!mainObjects.length) fail(`Domain ${domainId} is missing domain_judgment_model.main_objects.`);
  if (signals.length < 2) fail(`Domain ${domainId} domain_judgment_model requires at least two signals.`);
  if (decisionPath.length < 2) fail(`Domain ${domainId} domain_judgment_model requires at least two decision_path steps.`);
  if (!attachmentLogic.length) fail(`Domain ${domainId} domain_judgment_model requires asset_attachment_logic.`);
  if (!boundaries.length) fail(`Domain ${domainId} domain_judgment_model requires boundaries.`);
  for (const [index, item] of attachmentLogic.entries()) {
    const row = asObject(item);
    const ref = normalizePlanAssetRef(row.asset_ref, `domain ${domainId} asset_attachment_logic[${index}]`);
    const role = clean(row.role);
    const reason = clean(row.reason);
    if (!['primary_entry', 'supporting_evidence', 'drilldown', 'exclusion'].includes(role)) {
      fail(`domain ${domainId} asset_attachment_logic[${index}] has invalid role.`);
    }
    if (!reason || reason.length < 10) fail(`domain ${domainId} asset_attachment_logic[${index}] requires concrete reason.`);
    const inDomain = ref.resource_type === 'dashboard' ? domainDashboardIds.has(ref.resource_key)
      : ref.resource_type === 'report' ? domainReportIds.has(ref.resource_key)
        : ref.resource_type === 'metric' ? domainMetricIds.has(ref.resource_key) : false;
    if (!inDomain) fail(`domain ${domainId} asset_attachment_logic references ${ref.resource_type}:${ref.resource_key} outside domain closure.`);
  }
}

function normalizePlanAssetRefs(values, label) {
  return asArray(values).map((value, index) => normalizePlanAssetRef(value, `${label} asset_refs[${index}]`));
}

function normalizePlanAssetRef(value, label) {
  const ref = asObject(value);
  const type = clean(ref.resource_type);
  const key = clean(ref.resource_key);
  const exists = type === 'dashboard' ? dashboardById.has(key)
    : type === 'report' ? reportById.has(key)
      : type === 'metric' ? metricById.has(key) : false;
  if (!exists) fail(`${label} references unknown asset ${type || '<type>'}:${key || '<key>'}.`);
  return { resource_type: type, resource_key: key };
}

function assertAgentAuthoredRecallCard(card, domainId) {
  const cardId = clean(card.card_id);
  const values = [card.intent, card.live_execution_reason, ...asArray(card.questions)].map(clean);
  const refs = [...asArray(card.preferred_asset_refs), ...asArray(card.fallback_asset_refs), ...asArray(card.excluded_asset_refs)].map(asObject);
  const reasons = refs.map((ref) => clean(ref.reason));
  const combined = [...values, ...reasons].join('\n');
  if (isGenericRecallText(combined)) {
    fail(`Recall card ${cardId} in domain ${domainId || '<unknown>'} uses generic routing text; Agent must author concrete applicability, fallback, exclusion and execution boundaries.`);
  }
  for (const [index, reason] of reasons.entries()) {
    if (!reason || reason.length < 10) {
      fail(`Recall card ${cardId} asset reference ${index + 1} needs a concrete Agent-authored reason.`);
    }
  }
}

function isGenericRecallText(value) {
  const normalized = clean(value).toLowerCase();
  return /该认证看板的子报表直接覆盖|具体口径以资产页为准|同主题补充视角|使用前确认报表适用范围|知识库记录定义和使用边界；当前数量、客户名单及性能需实时执行|当前数量、客户名单及性能需实时执行|相关资产|主要资产|补充视角/.test(normalized);
}

function validateAssetRef(value, cardId) {
  const ref = asObject(value);
  const type = clean(ref.resource_type);
  const key = clean(ref.resource_key);
  const exists = type === 'dashboard' ? dashboardById.has(key) : type === 'report' ? reportById.has(key) : type === 'metric' ? metricById.has(key) : false;
  if (!exists) fail(`Recall card ${cardId} has unknown asset reference ${type || '<type>'}:${key || '<key>'}.`);
  if (!clean(ref.reason)) fail(`Recall card ${cardId} asset ${type}:${key} is missing a reason.`);
}

function dashboardAuthority(dashboard) {
  const id = clean(dashboard.resource_key);
  const isAppendix = appendixByDashboardId.has(id);
  const excluded = planModel.excludedByAsset.get(`dashboard:${id}`) ?? [];
  const blocked = isAppendix || excluded.length > 0;
  return {
    authority_role: isAppendix ? 'appendix' : 'canonical',
    certification_state: dashboard.authenticated === true ? 'certified' : 'uncertified',
    definition_state: 'valid', runtime_policy: blocked ? 'block' : 'allow', standalone_recall: !blocked,
    canonical_asset_id: canonicalId('dashboard', excluded),
  };
}

function reportAuthority(report, conflictIds) {
  const id = clean(report.resource_key);
  const hasBusinessDomain = asArray(report.dashboard_refs).some((ref) => domainByDashboardId.has(clean(ref.dashboard_id)));
  const onlyAppendix = !hasBusinessDomain && asArray(report.dashboard_refs).some((ref) => appendixByDashboardId.has(clean(ref.dashboard_id)));
  const dependencyOnly = report.authenticated !== true && asArray(report.dashboard_refs).length > 0;
  const excluded = planModel.excludedByAsset.get(`report:${id}`) ?? [];
  const conflict = conflictIds.has(id);
  const sqlDefinitionState = sqlFinalDefinitionState(report);
  const unknown = sqlDefinitionState === 'unknown'
    || (clean(report.definition_kind) !== 'SQL' && !asArray(report.metric_occurrences).length);
  const blocked = onlyAppendix || conflict || excluded.length > 0 || sqlDefinitionState === 'unknown';
  return {
    authority_role: onlyAppendix ? 'appendix' : dependencyOnly ? 'dependency_only' : 'canonical',
    certification_state: report.authenticated === true ? 'certified' : 'uncertified',
    definition_state: conflict ? 'conflict' : unknown ? 'unknown' : 'valid',
    runtime_policy: blocked ? 'block' : dependencyOnly || unknown ? 'warn' : 'allow',
    standalone_recall: !blocked && !dependencyOnly,
    canonical_asset_id: canonicalId('report', excluded),
  };
}

function sqlFinalDefinitionState(report) {
  if (clean(report.definition_kind) !== 'SQL') return null;
  const id = clean(report.resource_key);
  const generated = path.join(buildIr, 'reports', fileName('report', id));
  if (fs.existsSync(generated)) {
    const match = readText(generated).match(/^- 定义状态:\s*(valid|unknown)\s*$/m);
    if (match) return match[1];
  }
  return clean(planModel.sqlByReportId.get(id)?.definition_state) || 'unknown';
}

function metricAuthority(metric) {
  const id = clean(metric.resource_key);
  const dependencyOnly = metric.authenticated !== true;
  const excluded = planModel.excludedByAsset.get(`metric:${id}`) ?? [];
  const unknown = !asArray(metric.metric_occurrences).length;
  const blocked = excluded.length > 0;
  return {
    authority_role: dependencyOnly ? 'dependency_only' : 'canonical',
    certification_state: metric.authenticated === true ? 'certified' : 'uncertified',
    definition_state: unknown ? 'unknown' : 'valid',
    runtime_policy: blocked ? 'block' : dependencyOnly || unknown ? 'warn' : 'allow',
    standalone_recall: !blocked && !dependencyOnly,
    canonical_asset_id: canonicalId('metric', excluded),
  };
}

function writeMergedAsset(wikiRoot, directory, asset, authority, extra = '') {
  const id = clean(asset.resource_key);
  const source = readText(path.join(buildIr, directory, fileName(directory.slice(0, -1), id)))
    .replaceAll('../appendices/', '../technical-appendices/')
    .replace(/^- 定义状态:\s*(valid|unknown|conflict)\s*$/m, `- 定义状态: ${authority.definition_state}`)
    .replace(/- 源详情: `([^`]+)`/g, '- 资产包源定位（精确证据已内嵌）: `$1`');
  const brief = readText(path.join(buildIr, 'briefs', directory, fileName(directory.slice(0, -1), id)));
  const type = directory === 'dashboards' ? 'project-dashboard' : directory === 'reports' ? 'project-report' : 'project-reusable-metric';
  const title = assetReadableTitle(asset, directory.slice(0, -1));
  const authorityNotice = renderAssetAuthorityNotice(authority);
  const mergedExtra = [authorityNotice, extra.trim(), renderTargetedKnowledge('asset', `${directory.slice(0, -1)}:${id}`, '../personal-semantics/')].filter(Boolean).join('\n\n');
  writeText(path.join(wikiRoot, directory, assetOutputFileName(directory, id)),
    ensureReadableHeading(mergePage(source, brief, authorityFrontmatter(type, id, title, authority), mergedExtra), title));
}

function renderAssetAuthorityNotice(authority) {
  const runtimePolicy = clean(authority.runtime_policy);
  const definitionState = clean(authority.definition_state);
  const authorityRole = clean(authority.authority_role);
  const canonical = clean(authority.canonical_asset_id);
  const lines = [];
  if (runtimePolicy === 'block') {
    lines.push('- 召回限制：该资产不能作为直接回答入口。');
  } else if (runtimePolicy === 'warn') {
    lines.push('- 召回限制：该资产只能作为辅助线索，回答时需要说明其依赖或待确认边界。');
  }
  if (authorityRole === 'dependency_only') {
    lines.push('- 权威边界：该资产来自依赖闭包，只能支撑承载看板或业务域，不能单独代表正式业务入口。');
  }
  if (definitionState === 'conflict') {
    lines.push('- 口径状态：存在同名或近义资产口径冲突，应优先回到业务域、召回卡或让用户确认。');
  } else if (definitionState === 'unknown') {
    lines.push('- 口径状态：定义证据不足，只能作为待核验线索。');
  }
  if (canonical) {
    lines.push(`- 推荐入口：优先使用 \`${canonical}\`，本页只保留来源和排除理由。`);
  }
  if (!lines.length) return '';
  return `## 召回与权威边界\n\n${lines.join('\n')}`;
}

function mergePage(source, brief, frontmatter, extra = '') {
  const title = firstHeading(source) || firstHeading(brief);
  const sourceBody = stripFirstHeading(stripFrontmatter(source)).trim();
  if (/^## Agent 使用摘要$/m.test(sourceBody)) {
    return `${frontmatter}\n# ${title}\n\n${sourceBody}${extra ? `\n\n${extra.trim()}\n` : '\n'}`;
  }
  const briefBody = stripFirstHeading(stripFrontmatter(brief))
    .replace(/\n## 来源\n[\s\S]*$/m, '')
    .replace(/^.*原始(?:看板|报表|指标|元数据)定义.*$/gm, '')
    .replaceAll('../../metadata/', '../metadata/')
    .replaceAll('详见原始报表定义', '详见本页“证据定位”')
    .trim();
  return `${frontmatter}\n# ${title}\n\n${briefBody}\n${extra}\n\n## 证据定位\n\n${sourceBody}\n`;
}


function renderRecallCard(card) {
  const title = clean(card.questions?.[0] || card.intent || card.card_id);
  const alternateQuestions = asArray(card.questions).map(clean).filter((value) => value && value !== title);
  const refs = (values, heading) => `## ${heading}

${asArray(values).map((ref) => {
    const linkPath = assetPath(clean(ref.resource_type), clean(ref.resource_key));
    return `- [${escapeLink(recallAssetLabel(ref))}](${linkPath})：${clean(ref.reason)}`;
  }).join('\n') || '- 无'}`;
  const routing = asObject(card.routing);
  const branches = asArray(routing.branches).map((branch) => {
    const item = asObject(branch);
    const targets = asArray(item.asset_refs).map(ref => `[${escapeLink(recallAssetLabel(ref))}](${assetPath(clean(ref.resource_type), clean(ref.resource_key))})`).join('、') || '回到业务域核对资产';
    const combination = asObject(item.combination);
    const combinationNote = asArray(item.asset_refs).filter(ref => ref.resource_type !== 'dashboard').length > 1
      ? ` Combination: ${clean(combination.compatibility) || 'unknown'}; ${clean(combination.reason) || 'Verify common population, stable identity, grain and time before combining.'}${asArray(combination.join_keys).length ? ` Keys: ${asArray(combination.join_keys).join(', ')}.` : ''}${clean(combination.time_alignment) ? ` Time: ${clean(combination.time_alignment)}.` : ''}${asArray(combination.missing_coverage).length ? ` Gaps: ${asArray(combination.missing_coverage).join('; ')}.` : ''}` : '';
    return `- 当${clean(item.when)}：使用 ${targets}。${clean(item.reason)}${combinationNote}`;
  });
  return `---
type: project-semantic-recall-card
card_id: ${yaml(card.card_id)}
domain_id: ${yaml(card.domain_id)}
source_snapshot_hash: ${yaml(snapshotHash)}
requires_live_execution: ${Boolean(card.requires_live_execution)}
---

# ${title}

## Agent 使用摘要

- 适用问题：${title}
- 意图：${clean(card.intent) || '未说明'}
- 首选资产：${asArray(card.preferred_asset_refs).map(recallAssetLabel).join('、') || '无'}
- 备选资产：${asArray(card.fallback_asset_refs).map(recallAssetLabel).join('、') || '无'}
- 排除资产：${asArray(card.excluded_asset_refs).map(recallAssetLabel).join('、') || '无'}
- 实时执行：${Boolean(card.requires_live_execution) ? `需要，${clean(card.live_execution_reason) || '当前数值、客户名单、趋势或明细需要实时执行。'}` : '不强制，但当前数值仍需按具体资产能力实时确认。'}

## 用户问法

${alternateQuestions.map((value) => `- ${value}`).join('\n') || '- 同页面标题。'}

## 意图

${clean(card.intent)}

## 条件路由与停止

- 适用条件：${clean(routing.applicable_when) || clean(card.intent)}
- 答案对象与粒度：${clean(routing.answer_grain) || '先按用户问法确认对象、统计粒度与时间范围。'}
- 必要参数：${asArray(routing.required_parameters).map(clean).filter(Boolean).join('、') || '按首选资产的输入定义核对。'}
${branches.join('\n') || `- 问法和资产定义匹配时使用首选资产；不匹配时先回到业务域确认对象与口径，再考虑备选资产。`}
- 停止条件：${clean(routing.stop_when) || '取得对象、粒度、范围、时间和权威状态均匹配的最小证据后停止扩搜。'}
- 无匹配或不可用时：${clean(routing.fallback_when_unavailable) || '回到业务域按对象、粒度、过滤和时间筛选域内资产；仍不匹配则说明缺口。'}
- 执行边界：${clean(routing.evidence_boundary) || '排除资产不能作为当前答案；当前数值、客户名单、趋势或明细必须实时执行。'}

${refs(card.preferred_asset_refs, '首选资产')}

${refs(card.fallback_asset_refs, '备选资产')}

${refs(card.excluded_asset_refs, '排除资产')}

${renderRecallEvidence(card)}

## 实时执行边界

- 是否需要执行实时数据：${Boolean(card.requires_live_execution)}
- 原因：${clean(card.live_execution_reason) || '未说明'}
${renderTargetedKnowledge('recall_card', clean(card.card_id), '../personal-semantics/')}
`;
}

function recallAssetLabel(ref) {
  const type = clean(ref.resource_type);
  const key = clean(ref.resource_key);
  const row = type === 'dashboard' ? dashboardById.get(key)
    : type === 'report' ? reportById.get(key)
      : type === 'metric' ? metricById.get(key)
        : null;
  const title = assetReadableTitle({ ...asObject(row), title: row?.title || ref.display_name || ref.title, resource_key: key }, type);
  const identity = `${type}:${key}`;
  return title && title !== key ? `${title}（${identity}）` : identity;
}

function renderRecallEvidence(card) {
  const refs = [...asArray(card.preferred_asset_refs), ...asArray(card.fallback_asset_refs),
    ...asArray(asObject(card.routing).branches).flatMap(branch => asArray(branch.asset_refs))];
  const seen = new Set();
  const lines = [];
  for (const ref of refs) {
    const identity = `${ref.resource_type}:${ref.resource_key}`;
    if (seen.has(identity) || !['report', 'metric'].includes(ref.resource_type)) continue;
    seen.add(identity);
    const report = ref.resource_type === 'report' ? reportById.get(clean(ref.resource_key)) : null;
    const summary = report ? planModel.sqlByReportId.get(clean(ref.resource_key)) : null;
    const facts = report ? reportContract(report) : null;
    const parameters = summary ? asArray(summary.input_parameters).map(item => `${clean(item.name)}: ${clean(item.meaning)}`) : [];
    const measures = summary ? [] : asArray(report?.metric_occurrences).map(item =>
      [clean(item.display_name || item.event_title || item.event_name), clean(item.aggregation_name || item.aggregation_code)].filter(Boolean).join(': '));
    const savedScope = !summary && facts && Object.keys(facts.time).length ? ` Saved time scope: ${JSON.stringify(facts.time)}.` : '';
    const reportSource = summary ? readText(path.join(buildIr, 'reports', fileName('report', clean(ref.resource_key)))) : '';
    const outputs = summary ? asArray(summary.output_fields).map(item => {
      const name = clean(item.name);
      const unverified = reportSource.split('\n').some(line => line.startsWith(`- \`${name}\``) && line.includes('output identity unverified'));
      if (unverified && asArray(asObject(card.routing).branches).some(branch =>
        branch.combination?.compatibility === 'compatible'
        && asArray(branch.combination.join_keys).includes(name)
        && asArray(branch.asset_refs).some(asset => asset.resource_type === 'report' && clean(asset.resource_key) === clean(ref.resource_key)))) {
        fail(`Recall card ${card.card_id} join key has unverified output identity in report ${ref.resource_key}: ${name}.`);
      }
      return `${name}${unverified ? ' (identity unknown)' : ''}`;
    }) : [];
    const reminders = summary ? [
      ...asArray(summary.calculation_rules).slice(0, 1).map(item => clean(item.meaning)),
      ...['time_semantics', 'coverage_gaps'].flatMap(key => asArray(summary[key]).map(item => clean(item.meaning))),
    ] : [];
    lines.push(`- [${escapeLink(recallAssetLabel(ref))}](${assetPath(ref.resource_type, clean(ref.resource_key))}): ${clean(summary?.business_purpose) || clean(ref.reason)} Grain: ${clean(summary?.statistical_grain) || (facts ? JSON.stringify(facts.groups) : 'verify the asset definition')}.${parameters.length ? ` Parameters: ${parameters.join('; ')}.` : ''}${outputs.length ? ` Outputs: ${outputs.join(', ')}.` : ''}${measures.length ? ` Measures (verify result column identities): ${measures.join('; ')}.` : ''}${savedScope}${reminders.length ? ` Reminders: ${reminders.join('; ')}.` : ''}`);
  }
  return lines.length ? `## Minimum asset evidence\n\n${lines.join('\n')}\n\nVerify only dashboard notes, inherited filters or timezone settings that affect the chosen route. Asset visibility does not establish runtime data permissions.` : '';
}

function renderRecallCardIndex(cards) {
  return `# 场景召回卡\n\n先按问法、对象、粒度和参数选择匹配的卡；卡内按条件分支找到最小证据并在满足停止条件后停止。无匹配卡时，回到[业务领域](../domains/index.md)，按对象、粒度、过滤和时间筛选域内资产；仍无可用资产时说明具体缺口。\n\n${cards.map((card) => `- [${escapeLink(card.intent || card.card_id)}](${fileName('recall-card', card.card_id)})（${clean(card.domain_title)}）`).join('\n')}\n`;
}

function renderReportIndex() {
  const assigned = new Set();
  const sections = domains.map((domain) => {
    const dashboardIds = new Set(asArray(domain.dashboard_ids).map(clean));
    const matching = reports.filter((report) => asArray(report.dashboard_refs)
      .some((ref) => dashboardIds.has(clean(ref.dashboard_id))))
      .sort((a, b) => clean(a.resource_key).localeCompare(clean(b.resource_key), 'en'));
    for (const report of matching) assigned.add(clean(report.resource_key));
    const questions = asArray(domain.primary_questions).map(clean).filter(Boolean);
    const cards = asArray(domain.recall_cards)
      .map((card) => `- 问题入口：[${escapeLink(clean(card.questions?.[0]) || clean(card.intent))}](../recall-cards/${fileName('recall-card', card.card_id)})`);
    return `## ${clean(domain.title)}\n\n- 业务问题：${questions.join('；') || clean(domain.summary)}\n- [领域判断](../domains/${fileName('domain', domain.domain_id)})\n${cards.join('\n')}\n${matching.map((report) => `- [${escapeLink(assetReadableTitle(report, 'report'))}](${reportFileNames.get(clean(report.resource_key))})（report:${clean(report.resource_key)}）`).join('\n') || '- 本快照无该域报表，按领域页核对其他资产。'}\n`;
  });
  const unassigned = reports.filter((report) => !assigned.has(clean(report.resource_key)))
    .sort((a, b) => clean(a.resource_key).localeCompare(clean(b.resource_key), 'en'));
  return `# 报表\n\n先按业务问题选择领域或场景，再核对报表的对象、粒度、过滤和时间。点名报表时可直接进入报表页；未归属报表不自动视为业务入口。\n\n${sections.join('\n')}\n## 其他与未归属报表\n\n${unassigned.map((report) => `- [${escapeLink(assetReadableTitle(report, 'report'))}](${reportFileNames.get(clean(report.resource_key))})（report:${clean(report.resource_key)}）`).join('\n') || '- 无'}\n`;
}

function renderPersonalSemanticIntegration(integration) {
  const sourceRows = integration.source_ids.map((sourceId) => adoptedPersonalBySourceId.get(sourceId)).filter(Boolean);
  const provenanceRows = sourceRows.map((source) => {
    const payload = asObject(source.payload);
    return `| \`${clean(source.source_id)}\` | ${escapeTable(personalSemanticOwnerName(payload))} | ${escapeTable(formatPersonalSemanticTime(payload.updated_at ?? source.updated_at))} | ${escapeTable(payload.heat_count)} |`;
  }).join('\n');
  const sourceSummaries = sourceRows.map((source) => {
    const payload = asObject(source.payload);
    return `### ${clean(payload.title) || clean(source.source_id)}\n\n- Source ID: \`${clean(source.source_id)}\`\n- 来源人：${personalSemanticOwnerName(payload)}\n- 更新时间：${formatPersonalSemanticTime(payload.updated_at ?? source.updated_at)}\n- 热度：${clean(payload.heat_count) || '0'}\n- 摘要：${clean(payload.summary) || 'unknown'}\n- 内容：${clean(payload.content) || 'unknown'}\n- 关键词：${asArray(payload.keywords).map(clean).filter(Boolean).join('、') || '无'}\n- 资源引用：${renderPersonalSemanticResourceRefs(payload.resource_refs)}\n`;
  }).join('\n');
  return `---\ntype: project-semantic-personal-integration\nsemantic_project_id: ${semanticProjectId}\nintegration_id: ${yaml(integration.integration_id)}\ncontext_type: ${yaml(integration.context_type)}\nsource_snapshot_hash: ${yaml(snapshotHash)}\ntarget_type: ${yaml(integration.integration_target.target_type)}\ntarget_id: ${yaml(integration.integration_target.target_id)}\nconflict_policy: ${yaml(integration.conflict_policy)}\n---\n\n# ${clean(integration.title)}\n\n## Agent 使用摘要\n\n- 类型：${personalSemanticContextLabel(integration.context_type)}\n- 项目用法：${clean(integration.project_usage)}\n- 作用目标：${renderPersonalSemanticTarget(integration.integration_target)}\n- 冲突策略：${clean(integration.conflict_policy)}\n- 边界：${joinChineseClauses(integration.boundaries)}\n\n## 来源\n\n| Source ID | 来源人 | 更新时间 | 热度 |\n| --- | --- | --- | ---: |\n${provenanceRows || '| - | - | - | - |'}\n\n## 原始个人语义摘要\n\n${sourceSummaries || '无'}\n`;
}

function personalSemanticOwnerName(payload) {
  return clean(payload.owner_name) || clean(payload.owner_display_name) || '未知用户';
}

function renderPersonalSemanticIndex(integrations) {
  const rows = integrations
    .slice()
    .sort((left, right) => `${left.context_type}:${left.integration_id}`.localeCompare(`${right.context_type}:${right.integration_id}`, 'en'));
  return `# 知识采纳记录\n\n已采纳的补充知识按目标写入项目、业务领域、场景或资产页；这里保留来源和适用边界以便追溯。\n\n- [背景](background/index.md)\n- [偏好](preference/index.md)\n- [经验](experience/index.md)\n- [资产上下文](asset-context/index.md)\n\n## 采纳项\n\n${rows.map((row) => `- [${escapeLink(row.title)}](${personalSemanticContextPath(row.context_type)}/${fileName('personal-semantic', row.integration_id)})：${personalSemanticContextLabel(row.context_type)}，${clean(row.project_usage)}`).join('\n') || '- 无已采纳补充知识。'}\n`;
}

function renderTargetedKnowledge(type, id, relativeRoot) {
  const rows = planModel.personalSemanticIntegrations.filter((integration) => {
    const target = integration.integration_target;
    if (target.target_type !== type) return false;
    if (type !== 'asset') return target.target_id === id;
    return target.target_id === id || target.target_id === id.split(':')[1];
  });
  if (!rows.length) return '';
  return `\n## 项目补充知识\n\n${rows.map((row) => `- [${escapeLink(row.title)}](${relativeRoot}${personalSemanticContextPath(row.context_type)}/${fileName('personal-semantic', row.integration_id)})：${clean(row.project_usage)}；适用边界：${joinChineseClauses(row.boundaries)}`).join('\n')}\n`;
}

function renderKnowledgeAdoptionIndex() {
  return `# 知识采纳记录\n\n[查看已采纳补充知识及来源](../personal-semantics/index.md)。内容按适用目标进入项目、领域、场景和资产页；个人偏好只在声明的范围内生效。\n`;
}

function renderCommonIndex() {
  const model = planModel.projectBusinessModel;
  const objects = asArray(model.business_objects).map((row) => `- **${clean(row.name)}**：${clean(row.meaning)}`).join('\n');
  const relationships = asArray(model.object_relationships).map((row) => `- ${clean(row.from_object)} → ${clean(row.to_object)}：${clean(row.relationship)}`).join('\n');
  const supplements = planModel.personalSemanticIntegrations.filter((row) => row.integration_target.target_type === 'project')
    .map((row) => `- [${escapeLink(row.title)}](../personal-semantics/${personalSemanticContextPath(row.context_type)}/${fileName('personal-semantic', row.integration_id)})：${clean(row.project_usage)}；适用边界：${joinChineseClauses(row.boundaries)}`).join('\n');
  return `# 项目共识\n\n这里收录跨业务领域适用的项目对象、关系与已采纳补充知识。领域特有的判断方法保留在对应领域页。\n\n## 共同业务对象\n\n${objects || '- 无。'}\n\n## 对象关系\n\n${relationships || '- 无。'}\n\n## 跨领域补充知识\n\n${supplements || '- 暂无。'}\n\n[查看完整项目判断链路](../project-overview.md#业务判断链路)。\n`;
}

function renderAssetIndex() {
  return `# 事件与资产目录\n\n事件公共分组帮助按产品模块找到事件；分组名称本身不定义业务领域或认证状态。业务含义以领域判断和事件定义为准。\n\n- [事件地图](../event-map/index.md)\n- [看板](../dashboards/index.md)\n- [报表](../reports/index.md)\n- [可复用指标](../metrics/index.md)\n- [分析元数据](../metadata/index.md)\n`;
}

function writeEventMap(wikiRoot, buildIrRoot) {
  const eventPages = new Map();
  const eventsDir = path.join(buildIrRoot, 'metadata', 'events');
  if (fs.existsSync(eventsDir)) for (const name of fs.readdirSync(eventsDir).filter((item) => item.endsWith('.md'))) {
    const content = readText(path.join(eventsDir, name));
    const key = frontmatterValue(content, 'resource_key');
    if (key) eventPages.set(key, name);
  }
  const groups = eventGroups.filter((group) => clean(group.catalog_scope) === 'project_public');
  const seen = new Set();
  const links = [];
  for (const group of groups) {
    const name = clean(group.group_name);
    if (!name || seen.has(name)) fail(`Duplicate or empty public event group: ${name || '<empty>'}.`);
    seen.add(name);
    const members = asArray(group.events).filter((event) => eventPages.has(clean(event.event_name)));
    if (!members.length) continue;
    const file = fileName('event-group', `group-${name}-${sha256(name).slice(0, 8)}`);
    links.push(`- [${escapeLink(name)}](${file})（${members.length} 个已导出事件）`);
    writeText(path.join(wikiRoot, 'event-map', file), `# ${name}\n\n来源：项目公共事件目录。此分组仅用于查找事件，不自动定义业务领域或事件认证状态。\n\n${members.map((event) => `- [${escapeLink(clean(event.event_title) || clean(event.event_name))}（\`${clean(event.event_name)}\`）](../metadata/events/${eventPages.get(clean(event.event_name))})`).join('\n')}\n`);
  }
  writeText(path.join(wikiRoot, 'event-map', 'index.md'), `# 事件地图\n\n按项目公共事件分组查找已纳入资产包的事件。未纳入当前资产范围的事件不会在这里出现；事件分组不等于业务领域。\n\n${links.join('\n') || '- 当前资产范围内没有可展示的公共事件分组。'}\n\n[按元数据类型查找事件](../metadata/index.md)。\n`);
}

function renderPersonalSemanticTypeIndex(type, integrations) {
  const normalized = normalizePersonalSemanticContextType(type);
  const rows = integrations.filter((row) => normalizePersonalSemanticContextType(row.context_type) === normalized)
    .sort((left, right) => left.integration_id.localeCompare(right.integration_id, 'en'));
  return `# ${personalSemanticContextLabel(normalized)}\n\n${personalSemanticContextUsage(normalized)}\n\n${rows.map((row) => `- [${escapeLink(row.title)}](${fileName('personal-semantic', row.integration_id)})：${clean(row.project_usage)}`).join('\n') || '- 暂无。'}\n`;
}

function renderPersonalSemanticTarget(target) {
  const type = clean(target.target_type);
  const id = clean(target.target_id);
  if (type === 'domain') return `业务域 \`${id}\``;
  if (type === 'recall_card') return `召回卡 \`${id}\``;
  if (type === 'asset') return `资产 \`${id}\``;
  return '项目整体';
}

function renderPersonalSemanticResourceRefs(value) {
  const refs = asArray(value).map(asObject).map((ref) => {
    const type = clean(ref.resource_type);
    const key = clean(ref.resource_key);
    return type && key ? `${type}:${key}` : clean(ref);
  }).filter(Boolean);
  return refs.join('、') || '无';
}

function formatPersonalSemanticTime(value) {
  const text = clean(value);
  if (!text) return 'unknown';
  if (/^\d{12,}$/.test(text)) {
    const date = new Date(Number(text));
    if (!Number.isNaN(date.getTime())) return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  }
  return text;
}

function renderAuthorityIndex(rows) {
  return `# 资产权威状态\n\n## Agent 判定规则\n\n- \`runtime_policy=allow\`：可以作为主要答案依据，但当前数值仍需实时执行。\n- \`runtime_policy=warn\`：只能作为依赖或辅助线索，回答时需要说明它不是独立召回入口。\n- \`runtime_policy=block\`：不能直接回答，必须回到 canonical 资产、业务域或等待资产作者确认。\n- \`authority_role=dependency_only\`：定义、依赖关系或冲突解释可以引用已知元数据；不能单独据此断言业务状态或当前数值。平台禁止直接检索时回到授权引用资产。\n- \`definition_state=conflict\` 或 \`unknown\`：不要断言精确口径，只能描述已知证据和待确认点。\n\n| 类型 | 资产 | Authority role | Certification | Definition | Runtime | Standalone recall | Canonical |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.sort((a, b) => `${a.resource_type}:${a.resource_key}`.localeCompare(`${b.resource_type}:${b.resource_key}`, 'en')).map((row) => `| ${row.resource_type} | \`${row.resource_key}\` ${escapeTable(row.title)} | ${row.authority_role} | ${row.certification_state} | ${row.definition_state} | ${row.runtime_policy} | ${row.standalone_recall} | ${row.canonical_asset_id ?? '-'} |`).join('\n')}\n`;
}

function renderSourceProjectBoundary(rows) {
  const external = rows.filter((row) => Number(row.source_project_id) !== semanticProjectId);
  return `# 项目来源边界

## Agent 使用方式

- 本知识库的语义项目 ID 是 ${semanticProjectId}。资产定义中出现其他项目 ID 时，只能视为打包定义中的跨项目引用线索。
- 不要把外部项目 ID 当作本项目正式业务范围；回答前需要回到对应资产页和实时权限确认。
- 若跨项目引用来自字段粒度、实体或公式依赖，优先按当前资产的认证状态与召回卡使用，不能扩展为外部项目知识。

## 跨项目引用

${external.length ? `| 资产 | 来源项目 | 定位 |
| --- | ---: | --- |
${external.map((row) => `| ${row.resource_type}:${row.resource_key} ${escapeTable(row.title)} | ${row.source_project_id} | ${escapeTable(row.locator)} |`).join('\n')}` : '未发现非本项目来源 ID。'}
`;
}

function renderGovernanceIndex(conflicts) {
  return `# 治理与来源\n\n- [知识采纳记录](knowledge-adoption.md)\n- [资产权威状态](authority-index.md)\n- [覆盖、物理来源与未归属资产](coverage.md)\n- [项目来源边界](source-project-boundary.md)\n\n## Agent 使用方式\n\n- 回答前先看资产页 frontmatter 的 \`runtime_policy\`、\`definition_state\` 和 \`authority_role\`。\n- \`runtime_policy=block\` 的资产不能直接回答；如果存在 canonical 资产，优先跳转到 canonical。\n- \`dependency_only\` 元数据可用于有证据的定义、依赖和冲突解释；不能据此单独回答业务状态或当前数值。\n- 语义冲突表示多个资产表达同一业务含义但口径不同，不能只凭名称选择资产；优先使用业务域、召回卡或用户确认。\n- 项目来源边界用于识别资产包里引用了其他项目 ID 的字段；跨项目引用只能作为来源线索，不代表当前项目事实。\n\n当前检测到 ${conflicts} 张语义冲突报表。\n`;
}

function renderWikiIndex(corpus) {
  return `---\ntype: project-semantic-knowledge-wiki-index\nsemantic_project_id: ${semanticProjectId}\nproject_name: ${yaml(projectName)}\nsource_snapshot_hash: ${yaml(snapshotHash)}\nnavigation_taxonomy_version: "2.1"\n---\n\n# ${projectName} 项目语义知识库 Wiki\n\n## 问题意图路由\n\n- 业务判断或当前数值：先选[业务领域](domains/index.md)及其[场景召回卡](recall-cards/index.md)，按对象、粒度、参数选择分支并实时执行。\n- 点名资产、字段定义或依赖关系：从[事件与资产目录](asset-index/index.md)定位资产，再核对[治理与来源](governance/index.md)；依赖元数据可解释定义与关系，但不能单独证明业务状态。\n- 产品机制或共同背景：先读[项目共识](common/index.md)，再进入相关业务域。\n- 无匹配场景卡：进入相关业务域，按对象、粒度、过滤和时间筛选域内资产；仍无合适资产就说明缺口，不编造答案。\n- 已取得对象、粒度、时间、范围和权威性匹配的最小证据后停止扩搜；需要当前值时按权限执行。\n\n## 知识导航\n\n1. [项目总览](project-overview.md)：项目定位、对象关系和判断链路。\n2. [项目共识](common/index.md)：跨领域适用的知识。\n3. [业务领域](domains/index.md)：按业务问题进入判断路径和证据。\n4. [事件与资产目录](asset-index/index.md)：按事件公共分组或资产类型查找。\n5. [治理与来源](governance/index.md)：采纳、权威状态和边界。\n\n技术、演示、副本和定向诊断资产只在[技术附录](technical-appendices/index.md)中追溯。物理空间在[source containers](source-containers/index.md)中保留，不作为业务域。\n\n${countSummary(corpus)}\n`;
}

function renderSnapshotIndex(corpus) {
  const title = String(projectName).replace(/\r?\n/g, ' ').replace(/^#+\s*/, '');
  return `# ${title} 项目语义知识库 Wiki\n\n## 问题意图路由\n\n- 业务判断或当前数值：先选[业务领域](wiki/domains/index.md)和匹配的[场景召回卡](wiki/recall-cards/index.md)，按对象、粒度和参数选择分支。\n- 点名资产、字段定义或依赖关系：从[事件与资产目录](wiki/asset-index/index.md)定位，再核对[治理与来源](wiki/governance/index.md)。\n- 产品机制或共同背景：先读[项目共识](wiki/common/index.md)。\n- 无匹配场景卡：回到相关业务域，按对象、粒度、过滤和时间筛选；仍无合适资产则说明缺口。\n- 证据已经匹配对象、粒度、范围、时间和权威状态时停止扩搜；当前数值需要授权实时执行。\n\n## 知识导航\n\n1. [项目总览](wiki/project-overview.md)\n2. [项目共识](wiki/common/index.md)\n3. [业务领域](wiki/domains/index.md)\n4. [事件与资产目录](wiki/asset-index/index.md)\n5. [治理与来源](wiki/governance/index.md)\n\n${countSummary(corpus)}\n`;
}

function renderProjectOverview(corpus) {
  return `# ${projectName} 项目总览\n\n${renderProjectBusinessModel(planModel.projectBusinessModel)}${renderTargetedKnowledge('project', 'project', 'personal-semantics/')}\n\n## 资产与治理范围\n\n- Semantic project ID: ${semanticProjectId}\n- Snapshot hash: \`${snapshotHash}\`\n- Asset scope: ${packageAssetScope}\n- Business domains: ${corpus.counts.business_domains}\n- Dashboards: ${corpus.counts.dashboards}\n- Reports: ${corpus.counts.reports}\n- Reusable metrics: ${corpus.counts.reusable_metrics}\n- Metadata: ${corpus.counts.analysis_metadata}\n\nCommon 资产包是权威来源。本 Wiki 将业务判断模型、用途总结和精确证据合并为单一页面，不再发布第二套 raw/briefs 语料。\n`;
}

function renderProjectBusinessModel(model) {
  return `## 项目定位\n\n${clean(model.business_positioning)}\n\n## 使用角色\n\n${asArray(model.audience_roles).map((role) => `- ${clean(role)}`).join('\n')}\n\n## 业务对象\n\n${asArray(model.business_objects).map((item) => {
    const evidence = asArray(item.evidence_refs).map(renderOverviewAssetRef).join('、');
    return `- ${clean(item.name)}（\`${clean(item.object_id)}\`）：${appendEvidenceSentence(item.meaning, evidence)}`;
  }).join('\n')}\n\n## 对象关系\n\n${asArray(model.object_relationships).map((item) => {
    const evidence = asArray(item.evidence_refs).map(renderOverviewAssetRef).join('、');
    return `- ${clean(item.from_object)} -> ${clean(item.to_object)}：${appendEvidenceSentence(item.relationship, evidence)}`;
  }).join('\n')}\n\n## 业务判断链路\n\n${asArray(model.decision_chains).map(renderDecisionChain).join('\n\n')}\n\n## 不承载的内容\n\n${asArray(model.non_goals).map((item) => `- ${clean(item)}`).join('\n')}`;
}

function appendEvidenceSentence(value, evidence) {
  const body = clean(value).replace(/[。；;，,\s]+$/u, '');
  return `${body}${evidence ? `。证据：${evidence}` : ''}`;
}

function renderDecisionChain(chain) {
  const domains = asArray(chain.preferred_domain_ids)
    .map((id) => `[\`${clean(id)}\`](domains/${fileName('domain', id)})`).join('、');
  const assets = asArray(chain.asset_refs).map(renderOverviewAssetRef).join('、');
  return `### ${clean(chain.title)}\n\n- 判断问题：${stripClausePunctuation(chain.decision_question)}\n- 判断信号：${joinChineseClauses(chain.signals)}\n- 判断步骤：\n${renderNumberedSteps(chain.decision_steps, '  ')}\n- 业务域：${domains || '未指定'}\n- 关联资产：${assets || '未指定'}\n- 实时执行：${chain.requires_live_execution ? '需要' : '不需要'}\n- 边界：${joinChineseClauses(chain.boundaries)}`;
}

function renderOverviewAssetRef(ref) {
  const type = clean(ref.resource_type);
  const key = clean(ref.resource_key);
  const label = recallAssetLabel(ref);
  if (type === 'dashboard') return `[${escapeLink(label)}](dashboards/${dashboardFileNames.get(key) ?? fileName('dashboard', key)})`;
  if (type === 'report') return `[${escapeLink(label)}](reports/${reportFileNames.get(key) ?? fileName('report', key)})`;
  if (type === 'metric') return `[${escapeLink(label)}](metrics/${metricFileNames.get(key) ?? fileName('metric', key)})`;
  return `${type}:${key}`;
}

function renderLog(corpus) {
  return `# Build log\n\n## Snapshot ${snapshotHash}\n\n- Semantic project ID: ${semanticProjectId}\n- Business domains: ${corpus.counts.business_domains}\n- Reports: ${corpus.counts.reports}\n- Semantic plan hash: \`${sha256(fs.readFileSync(semanticPlanPath))}\`\n`;
}

function countSummary(corpus) {
  return `## 数量\n\n| 内容 | 数量 |\n| --- | ---: |\n| 业务领域 | ${corpus.counts.business_domains} |\n| 公共事件分组 | ${eventGroups.length} |\n| 看板 | ${corpus.counts.dashboards} |\n| 报表 | ${corpus.counts.reports} |\n| 可复用指标 | ${corpus.counts.reusable_metrics} |\n| 分析元数据 | ${corpus.counts.analysis_metadata} |\n| 场景召回卡 | ${planModel.cards.length} |\n| 已采纳补充知识 | ${planModel.personalSemanticIntegrations.length} |`;
}

function authorityFrontmatter(type, resourceKey, title, authority) {
  return `---\ntype: ${type}\nsemantic_project_id: ${semanticProjectId}\nresource_key: ${yaml(resourceKey)}\ntitle: ${yaml(title)}\nsource_snapshot_hash: ${yaml(snapshotHash)}\nauthority_role: ${authority.authority_role}\ncertification_state: ${authority.certification_state}\ndefinition_state: ${authority.definition_state}\nruntime_policy: ${authority.runtime_policy}\nstandalone_recall: ${authority.standalone_recall}\ncanonical_asset_id: ${authority.canonical_asset_id ? yaml(authority.canonical_asset_id) : 'null'}\n---`;
}

function domainFrontmatter(domain) {
  return `---\ntype: project-semantic-business-domain\nsemantic_project_id: ${semanticProjectId}\ndomain_id: ${yaml(domain.domain_id)}\ntitle: ${yaml(domain.title)}\nsource_snapshot_hash: ${yaml(snapshotHash)}\n---`;
}

function appendixFrontmatter(appendix) {
  return `---\ntype: project-semantic-technical-appendix\nsemantic_project_id: ${semanticProjectId}\nappendix_id: ${yaml(appendix.appendix_id)}\ntitle: ${yaml(appendix.title)}\nsource_snapshot_hash: ${yaml(snapshotHash)}\nauthority_role: appendix\nruntime_policy: block\nstandalone_recall: false\n---`;
}

function canonicalId(type, excluded) {
  const key = asArray(excluded).map((row) => clean(row.canonical_resource_key)).find(Boolean);
  return key ? `${type}:${key}` : null;
}

function assetPath(type, key) {
  if (type === 'dashboard') return `../dashboards/${dashboardFileNames.get(key) ?? fileName('dashboard', key)}`;
  if (type === 'report') return `../reports/${reportFileNames.get(key) ?? fileName('report', key)}`;
  if (type === 'metric') return `../metrics/${metricFileNames.get(key) ?? fileName('metric', key)}`;
  fail(`Unsupported recall-card asset type ${type}.`);
}

function normalizePersonalSemanticContextType(value) {
  const type = clean(value).toLowerCase().replace('-', '_');
  if (!['background', 'preference', 'experience', 'asset_context'].includes(type)) {
    fail(`Invalid adopted personal semantic context_type: ${clean(value) || '<empty>'}.`);
  }
  return type;
}

function personalSemanticContextPath(value) {
  const type = normalizePersonalSemanticContextType(value);
  return type === 'asset_context' ? 'asset-context' : type;
}

function personalSemanticContextLabel(value) {
  const type = normalizePersonalSemanticContextType(value);
  if (type === 'background') return '项目背景';
  if (type === 'preference') return '偏好';
  if (type === 'experience') return '经验';
  return '资产上下文';
}

function personalSemanticContextUsage(value) {
  const type = normalizePersonalSemanticContextType(value);
  if (type === 'background') return '用于补充项目、业务域和对象关系的背景信息。';
  if (type === 'preference') return '用于补充项目内的回答偏好、入口选择和路由方式。';
  if (type === 'experience') return '用于补充已经验证过的分析路径、风险提示和经验规则。';
  return '用于补充具体资产的使用语境；引用资产不存在时不能作为当前资产事实。';
}

function assetOutputFileName(directory, key) {
  if (directory === 'dashboards') return dashboardFileNames.get(key) ?? fileName('dashboard', key);
  if (directory === 'reports') return reportFileNames.get(key) ?? fileName('report', key);
  if (directory === 'metrics') return metricFileNames.get(key) ?? fileName('metric', key);
  return fileName(directory.slice(0, -1), key);
}

function titleFirstAssetFileMap(values, kind) {
  const stems = new Map();
  const result = new Map();
  for (const asset of values) {
    const key = clean(asset.resource_key);
    const titleStem = slug(assetReadableTitle(asset, kind)) || kind;
    const keyStem = slug(key) || 'id';
    const base = slug([titleStem, keyStem].filter(Boolean).join('-'));
    const stem = stems.has(base) ? `${base}-${sha256(`${kind}:${key}`).slice(0, 8)}` : base;
    stems.set(base, true);
    result.set(key, `${stem}.md`);
  }
  return result;
}

function titleFirstAssetPathRewrites() {
  const mappings = new Map();
  for (const [key, file] of dashboardFileNames) {
    mappings.set(`wiki/dashboards/${fileName('dashboard', key)}`, `wiki/dashboards/${file}`);
  }
  for (const [key, file] of reportFileNames) {
    mappings.set(`wiki/reports/${fileName('report', key)}`, `wiki/reports/${file}`);
  }
  for (const [key, file] of metricFileNames) {
    mappings.set(`wiki/metrics/${fileName('metric', key)}`, `wiki/metrics/${file}`);
  }
  return mappings;
}

function assetReadableTitle(asset, kind) {
  const title = cleanAssetTitle(asset.title);
  if (isMeaningfulTitle(title)) return title;
  if (kind === 'report') {
    const dashboardTitle = asArray(asset.dashboard_refs)
      .map((ref) => clean(ref.dashboard_name))
      .find(isMeaningfulTitle);
    if (dashboardTitle) return `${dashboardTitle} 报表`;
    const containerTitle = asArray(asset.source_container_refs)
      .map((ref) => clean(ref.container_title))
      .find(isMeaningfulTitle);
    if (containerTitle) return `${containerTitle} 报表`;
  }
  if (kind === 'dashboard') {
    const containerTitle = clean(asObject(asset.source_container_ref).container_title);
    if (isMeaningfulTitle(containerTitle)) return `${containerTitle} 看板`;
  }
  if (kind === 'metric') return '可复用指标';
  return kind === 'dashboard' ? '看板' : kind === 'report' ? '报表' : kind;
}

function cleanAssetTitle(value) {
  return clean(value)
    .replace(/^(?:[?？]\s*){2,}(?=\S)/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningfulTitle(value) {
  const normalized = cleanAssetTitle(value);
  if (!normalized || /^undefined$/i.test(normalized)) return false;
  const stem = slug(normalized);
  return Boolean(stem) && /\p{L}/u.test(normalized) && !/^[._-]+$/.test(stem) && !/^\d+$/.test(stem);
}

function ensureReadableHeading(content, title) {
  const current = firstHeading(content);
  if (isMeaningfulTitle(current)) return content;
  return content.replace(/^# .+$/m, `# ${title}`);
}

function sourceProjectReferencesFromPackage() {
  const rows = [];
  for (const [resourceType, values] of [['dashboard', dashboards], ['report', reports], ['metric', metrics]]) {
    for (const asset of values) collectSourceProjectReferences(asset, rows, {
      resource_type: resourceType,
      resource_key: clean(asset.resource_key),
      title: assetReadableTitle(asset, resourceType),
    });
  }
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.resource_type}:${row.resource_key}:${row.source_project_id}:${row.locator}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => `${a.resource_type}:${a.resource_key}:${a.locator}`.localeCompare(`${b.resource_type}:${b.resource_key}:${b.locator}`, 'en'));
}

function collectSourceProjectReferences(value, rows, asset, stack = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSourceProjectReferences(item, rows, asset, [...stack, String(index)]));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    const nextStack = [...stack, key];
    if (['projectId', 'source_project_id'].includes(key) && Number.isInteger(Number(item))) {
      rows.push({ ...asset, source_project_id: Number(item), locator: nextStack.join('.') });
    } else {
      collectSourceProjectReferences(item, rows, asset, nextStack);
    }
  }
}

function sourceProjectIdsFromPackage() {
  const ids = new Set();
  collectProjectIds([...dashboards, ...reports, ...metrics], ids);
  return [...ids].filter((id) => Number.isInteger(id) && id > 0).sort((a, b) => a - b);
}

function collectProjectIds(value, ids) {
  if (Array.isArray(value)) return value.forEach((item) => collectProjectIds(item, ids));
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (['projectId', 'source_project_id'].includes(key) && Number.isInteger(Number(item))) ids.add(Number(item));
    else collectProjectIds(item, ids);
  }
}

function assertNoForbiddenPublishedLayers(root) {
  for (const name of ['raw', 'briefs', '_source']) {
    if (fs.existsSync(path.join(root, name)) || fs.existsSync(path.join(root, 'wiki', name))) {
      fail(`Published Wiki bundle must not contain ${name}/.`);
    }
  }
}

function hideMarkdownFrontmatter(root) {
  for (const file of listFiles(root).filter((value) => value.endsWith('.md'))) {
    const content = readText(file);
    const hidden = content.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/, '<!--\npage_metadata:\n$1\n-->\n\n');
    if (hidden !== content) writeText(file, hidden);
  }
}

function assertSnapshotEntryPoint(root) {
  const content = readText(path.join(root, 'index.md'));
  const requiredLinks = [
    'wiki/project-overview.md',
    'wiki/common/index.md', 'wiki/domains/index.md', 'wiki/asset-index/index.md',
    'wiki/governance/index.md',
  ];
  const missing = requiredLinks.filter((target) => !content.includes(`(${target})`));
  if (missing.length) fail(`Snapshot root index is missing required navigation: ${missing.join(', ')}.`);
  if (/^---$/m.test(content) || content.includes('进入项目语义知识库 Wiki')) {
    fail('Snapshot root index must be a display-ready navigation page, not a frontmatter or wrapper page.');
  }
}

function rewriteTitleFirstAssetLinks(root, relPathMap) {
  for (const file of listFiles(root).filter((value) => value.endsWith('.md'))) {
    const currentRel = path.relative(root, file).replaceAll(path.sep, '/');
    const rewritten = readText(file).replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, label, target) => {
      const [targetPath, fragment = ''] = String(target).split('#');
      if (!targetPath || /^(https?:|mailto:)/.test(targetPath)) return match;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(currentRel), decodeURIComponent(targetPath)));
      const mapped = relPathMap.get(resolved);
      if (!mapped) return match;
      const relative = path.posix.relative(path.posix.dirname(currentRel), mapped) || path.posix.basename(mapped);
      return `[${label}](${relative}${fragment ? `#${fragment}` : ''})`;
    });
    if (rewritten !== readText(file)) writeText(file, rewritten);
  }
}

function assertNoBareNumericAssetFiles(wikiRoot) {
  const offenders = ['dashboards', 'reports', 'metrics'].flatMap((directory) => {
    const dir = path.join(wikiRoot, directory);
    return fs.readdirSync(dir).filter((file) => /^[0-9]+\.md$/.test(file)).map((file) => `${directory}/${file}`);
  });
  if (offenders.length) fail(`Published Wiki asset files must be title-first, not bare numeric IDs: ${offenders.slice(0, 10).join(', ')}.`);
}

function assertMarkdownLinks(root) {
  const files = listFiles(root).filter((file) => file.endsWith('.md'));
  const missing = [];
  for (const file of files) {
    const content = stripFencedCodeBlocks(readText(file));
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
      if (!fs.existsSync(resolved)) missing.push(`${path.relative(root, file)} -> ${target}`);
    }
  }
  if (missing.length) fail(`Wiki contains ${missing.length} broken Markdown link(s): ${missing.slice(0, 12).join(', ')}.`);
}

function stripFencedCodeBlocks(content) {
  return content.replace(/^```[\s\S]*?^```/gm, '');
}

async function writeDeterministicZip(root, target, replace) {
  if (fs.existsSync(target) && !replace) fail(`Archive already exists: ${target}. Pass --force to replace it.`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(temporary, { mode: 0o600 });
    const zip = typeof archiver === 'function'
      ? archiver('zip', { zlib: { level: 9 } })
      : new ZipArchive({ zlib: { level: 9 } });
    output.on('close', resolve);
    output.on('error', reject);
    zip.on('error', reject);
    zip.pipe(output);
    for (const file of listFiles(root).sort()) {
      zip.append(fs.readFileSync(file), {
        name: path.relative(root, file).replaceAll(path.sep, '/'), mode: 0o600,
        date: new Date('1980-01-01T00:00:00.000Z'),
      });
    }
    void zip.finalize();
  });
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
  fs.renameSync(temporary, target);
}


function assertPrecompiledSourceQuality(root) {
  const issues = [];
  const maxIssues = 30;
  for (const file of listFiles(root).filter((value) => value.endsWith('.md')).sort()) {
    const rel = path.relative(root, file).replaceAll(path.sep, '/');
    if (rel === 'kb-upload-manifest.json') continue;
    const visible = stripHtmlComments(readText(file));
    for (const [label, pattern] of forbiddenVisibleSourcePatterns()) {
      const match = visible.match(pattern);
      if (match) issues.push(`${rel}: ${label}: ${match[0].slice(0, 80)}`);
      if (issues.length >= maxIssues) break;
    }
    if (issues.length >= maxIssues) break;
  }
  if (issues.length) {
    fail(`Precompiled KB source quality check failed; Agent-authored source still contains template or parser noise. Examples: ${issues.join(' | ')}`);
  }
}

function stripHtmlComments(value) {
  return clean(value).replace(/<!--[\s\S]*?-->/g, '');
}

function forbiddenVisibleSourcePatterns() {
  return [
    ['generic recall routing text', new RegExp('该认证看板的子报表直接覆盖|同主题补充视角|具体口径以资产页为准|使用前确认报表适用范围')],
    ['undefined metric prefix', new RegExp('\\bundefined[._-]+[\\p{L}\\p{N}_-]+', 'u')],
    ['unreadable question-mark title prefix', new RegExp('(?:^|[\\n#\\-：:])\\s*[?？]\\s+[?？]\\s+\\S', 'u')],
    ['raw aggregation code', new RegExp('[（(\\s：:]A\\d{3}(?:_\\d+)?[）)\\s，,；;。]')],
    ['raw filter operator code', new RegExp('[（(\\s：:]C\\d{2,3}[）)\\s，,；;。]')],
    ['SQL parser placeholder', new RegExp('\\$\\{(?:Text|Selector|PartDate|Number|Date|DateTime|MultiSelector)\\s*:[^}]+\\}|SQL\\s*输出字段|来源表达式|where 条件', 'i')],
  ];
}

function writeFlatUploadSources(sourceRoot, targetRoot, replace) {
  if (fs.existsSync(targetRoot) && !replace) fail(`Upload sources output already exists: ${targetRoot}. Pass --force to replace it.`);
  const markdownFiles = listFiles(sourceRoot)
    .filter((file) => file.endsWith('.md'))
    .sort();
  const relToFlat = new Map(markdownFiles.map((file) => {
    const rel = path.relative(sourceRoot, file).replaceAll(path.sep, '/');
    return [rel, flatUploadFileName(rel, uploadSourceNamespace)];
  }));
  const manifestSources = [];
  materialize(targetRoot, replace, (staging) => {
    for (const file of markdownFiles) {
      const rel = path.relative(sourceRoot, file).replaceAll(path.sep, '/');
      const flatName = relToFlat.get(rel);
      const content = precompiledSource(rewriteLinksForFlatUpload(readText(file), rel, relToFlat));
      const contentHash = syncContentHash(content);
      const identity = uploadSourceIdentity(rel, content);
      const semanticPlanFragmentRefs = semanticPlanFragmentRefsForSource(identity, rel);
      manifestSources.push({
        display_name: flatName,
        file: flatName,
        namespace: uploadSourceNamespace,
        snapshot_date: snapshotDate,
        snapshot_hash: snapshotHash,
        source_kind: identity.source_kind,
        asset_type: identity.asset_type,
        asset_key: identity.asset_key,
        title: firstHeading(content),
        content_hash: contentHash,
        source_path: rel,
        semantic_plan_fragment_refs: semanticPlanFragmentRefs,
      });
      writeText(path.join(staging, flatName), `<!--\nkb_source_namespace: ${uploadSourceNamespace}\nsnapshot_date: ${snapshotDate ?? 'null'}\nsnapshot_hash: ${snapshotHash}\nsource_kind: ${identity.source_kind}\nasset_type: ${identity.asset_type ?? 'null'}\nasset_key: ${identity.asset_key ?? 'null'}\ncontent_hash: ${contentHash}\nsource_path: ${rel}\nsemantic_plan_fragment_refs: ${semanticPlanFragmentRefs.join(',') || 'null'}\n-->\n\n${content}`);
    }
    const manifest = readJson(path.join(sourceRoot, 'manifest.json'));
    const manifestContent = precompiledSource(`# Package manifest\n\n\`\`\`json\n${JSON.stringify(manifest, null, 2)}\n\`\`\`\n`);
    const manifestName = `${uploadSourceNamespace}-manifest.md`;
    const manifestHash = syncContentHash(manifestContent);
    manifestSources.push({
      display_name: manifestName,
      file: manifestName,
      namespace: uploadSourceNamespace,
      snapshot_date: snapshotDate,
      snapshot_hash: snapshotHash,
      source_kind: 'manifest',
      asset_type: null,
      asset_key: null,
      title: 'Package manifest',
      content_hash: manifestHash,
      source_path: 'manifest.json',
      semantic_plan_fragment_refs: [],
    });
    writeText(path.join(staging, manifestName), `<!--\nkb_source_namespace: ${uploadSourceNamespace}\nsnapshot_date: ${snapshotDate ?? 'null'}\nsnapshot_hash: ${snapshotHash}\nsource_kind: manifest\nasset_type: null\nasset_key: null\ncontent_hash: ${manifestHash}\nsource_path: manifest.json\nsemantic_plan_fragment_refs: null\n-->\n\n${manifestContent}`);
    writeJson(path.join(staging, 'kb-upload-manifest.json'), {
      schema_version: '1.0',
      manifest_kind: 'ae_project_semantic_kb_upload_sources',
      navigation_taxonomy_version: '2.1',
      namespace: uploadSourceNamespace,
      semantic_project_id: semanticProjectId,
      project_name: projectName,
      snapshot_date: snapshotDate,
      snapshot_hash: snapshotHash,
      semantic_plan_state: semanticPlanState,
      source_count: manifestSources.length,
      sources: manifestSources.sort((a, b) => a.display_name.localeCompare(b.display_name, 'en')),
    });
  });
  const basenames = listFiles(targetRoot).filter((file) => file.endsWith('.md')).map((file) => path.basename(file));
  if (new Set(basenames).size !== basenames.length) fail('Flat upload sources contain duplicate file names.');
  return {
    count: basenames.length,
    namespace: uploadSourceNamespace,
    manifestPath: path.join(targetRoot, 'kb-upload-manifest.json'),
  };
}

function flatUploadFileName(rel, namespace) {
  const identity = uploadSourceIdentity(rel);
  const stem = slug([namespace, identity.file_stem].filter(Boolean).join('-'));
  if (stem.length <= 150) return `${stem}.md`;
  return `${stem.slice(0, 125)}-${sha256(rel).slice(0, 16)}.md`;
}

function uploadSourceIdentity(rel, content = '') {
  const normalized = rel.replaceAll('\\', '/');
  if (normalized === 'index.md') return { source_kind: 'index', asset_type: null, asset_key: null, file_stem: 'index' };
  if (normalized === 'refresh-state.md') return { source_kind: 'refresh-state', asset_type: null, asset_key: null, file_stem: 'refresh-state' };
  if (normalized === 'wiki/index.md') return { source_kind: 'index', asset_type: null, asset_key: null, file_stem: 'wiki-index' };
  const match = normalized.match(/^wiki\/([^/]+)\/(.+)\.md$/);
  if (!match) {
    const fallback = normalized.replace(/\.md$/i, '').replace(/\//g, '-');
    return { source_kind: 'wiki-page', asset_type: null, asset_key: null, file_stem: fallback };
  }
  const section = match[1];
  const rest = match[2];
  const stem = rest.split('/').join('-');
  if (section === 'dashboards') return namedUploadSource('dashboard', stem, frontmatterValue(content, 'resource_key'));
  if (section === 'reports') return namedUploadSource('report', stem, frontmatterValue(content, 'resource_key'));
  if (section === 'metrics') return namedUploadSource('metric', stem, frontmatterValue(content, 'resource_key'));
  if (section === 'domains') return namedUploadSource('domain', stem);
  if (section === 'recall-cards') return namedUploadSource('recall-card', stem);
  if (section === 'personal-semantics') {
    if (rest.endsWith('/index') || rest === 'index') {
      return {
        source_kind: 'personal-semantic',
        asset_type: null,
        asset_key: null,
        file_stem: `personal-semantic-${stem}`,
      };
    }
    return namedUploadSource('personal-semantic', stem, frontmatterValue(content, 'integration_id'));
  }
  if (section === 'technical-appendices') return namedUploadSource('appendix', stem);
  if (section === 'source-containers') return namedUploadSource('source-container', stem);
  if (section === 'governance') return namedUploadSource('governance', stem);
  if (section === 'metadata') return {
    source_kind: 'metadata',
    asset_type: 'metadata',
    asset_key: stem === 'index' ? null : stem,
    file_stem: `metadata-${stem}`,
  };
  return namedUploadSource(section, stem);
}

function semanticPlanFragmentRefsForSource(identity, rel) {
  const refs = new Set();
  const sourceKind = clean(identity.source_kind);
  const assetType = clean(identity.asset_type);
  const assetKey = clean(identity.asset_key);
  if (sourceKind === 'refresh-state') {
    for (const fragment of semanticPlanState.fragments) refs.add(fragment.id);
    return [...refs].sort();
  }
  if (rel === 'wiki/project-overview.md') refs.add('project:model');
  if (sourceKind === 'domain' && assetKey) refs.add(`domain:${assetKey}`);
  if (sourceKind === 'appendix' && assetKey) refs.add(`appendix:${assetKey}`);
  if (sourceKind === 'recall-card' && assetKey) {
    refs.add(`recall-card:${assetKey}`);
    const card = planModel.cards.find(card => clean(card.card_id) === assetKey);
    for (const ref of [...asArray(card?.preferred_asset_refs), ...asArray(card?.fallback_asset_refs)]) {
      if (ref.resource_type === 'report' && planModel.sqlByReportId.has(clean(ref.resource_key))) {
        refs.add(`report:${clean(ref.resource_key)}:sql_semantics`);
      }
    }
  }
  if (sourceKind === 'personal-semantic' && assetKey) {
    refs.add(`personal-semantic-integration:${assetKey}`);
  }
  if (assetType === 'dashboard' && assetKey) {
    const domain = domainByDashboardId.get(assetKey);
    const appendix = appendixByDashboardId.get(assetKey);
    if (domain) refs.add(`domain:${clean(domain.domain_id)}`);
    if (appendix) refs.add(`appendix:${clean(appendix.appendix_id)}`);
  }
  if (assetType === 'report' && assetKey) {
    if (planModel.sqlByReportId.has(assetKey)) refs.add(`report:${assetKey}:sql_semantics`);
    const report = reportById.get(assetKey);
    for (const dashboardRef of asArray(report?.dashboard_refs)) {
      const dashboardId = clean(dashboardRef.dashboard_id);
      const domain = domainByDashboardId.get(dashboardId);
      const appendix = appendixByDashboardId.get(dashboardId);
      if (domain) refs.add(`domain:${clean(domain.domain_id)}`);
      if (appendix) refs.add(`appendix:${clean(appendix.appendix_id)}`);
    }
  }
  if (sourceKind === 'index' && rel === 'wiki/recall-cards/index.md') {
    for (const card of planModel.cards) refs.add(`recall-card:${clean(card.card_id)}`);
  }
  if (sourceKind === 'index' && rel === 'wiki/domains/index.md') {
    for (const domain of domains) refs.add(`domain:${clean(domain.domain_id)}`);
  }
  if (sourceKind === 'personal-semantic' && /\/index\.md$/.test(rel)) {
    for (const integration of planModel.personalSemanticIntegrations) refs.add(`personal-semantic-integration:${clean(integration.integration_id)}`);
  }
  return [...refs].filter(Boolean).sort();
}

function buildSemanticPlanState() {
  const fragments = [];
  const add = (id, kind, value, fields = {}) => {
    const fragmentId = clean(id);
    if (!fragmentId) return;
    fragments.push({
      id: fragmentId,
      kind,
      ...fields,
      hash: sha256(stableJson(value)),
    });
  };
  add('project:model', 'project', semanticPlan.project_business_model ?? null);
  for (const domain of domains) {
    const id = clean(domain.domain_id);
    const { recall_cards: _recallCards, ...domainWithoutCards } = asObject(domain);
    add(`domain:${id}`, 'domain', domainWithoutCards, { domain_id: id });
    for (const card of asArray(domain.recall_cards)) {
      const cardId = clean(card.card_id);
      add(`recall-card:${cardId}`, 'recall-card', { ...asObject(card), domain_id: id }, { card_id: cardId, domain_id: id });
    }
  }
  for (const appendix of appendices) {
    const id = clean(appendix.appendix_id);
    add(`appendix:${id}`, 'appendix', appendix, { appendix_id: id });
  }
  for (const [reportId, summary] of [...planModel.sqlByReportId.entries()].sort(([left], [right]) => left.localeCompare(right, 'en'))) {
    add(`report:${reportId}:sql_semantics`, 'sql-report', summary, { report_id: reportId });
  }
  for (const integration of planModel.personalSemanticIntegrations) {
    const id = clean(integration.integration_id);
    add(`personal-semantic-integration:${id}`, 'personal-semantic-integration', integration, {
      integration_id: id,
      context_type: clean(integration.context_type),
      source_ids: integration.source_ids,
    });
  }
  fragments.sort((left, right) => left.id.localeCompare(right.id, 'en'));
  return {
    schema_version: '1.0',
    plan_schema_version: clean(semanticPlan.schema_version),
    plan_hash: sha256(stableJson(semanticPlan)),
    fragment_count: fragments.length,
    fragments,
  };
}

function renderRefreshState(state) {
  const payload = {
    schema_version: '1.0',
    semantic_plan: semanticPlan,
    semantic_plan_state: state,
  };
  const encoded = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64url');
  return `# Refresh State

This managed source stores the reusable semantic plan and incremental-refresh state for generated project semantic sources. It is not business evidence.

<!-- pskb_refresh_state_base64
${encoded}
-->
`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right, 'en'));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}

function namedUploadSource(kind, stem, resourceKey = '') {
  const key = stem === 'index' ? null : clean(resourceKey) || stem;
  return {
    source_kind: kind,
    asset_type: key ? kind : null,
    asset_key: key,
    file_stem: key ? `${kind}-${key}` : `${kind}-index`,
  };
}

function rewriteLinksForFlatUpload(content, currentRel, relToFlat) {
  return content.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, label, target) => {
    const [targetPath, fragment = ''] = String(target).split('#');
    if (!targetPath || /^(https?:|mailto:)/.test(targetPath)) return match;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(currentRel), decodeURIComponent(targetPath)));
    const flat = relToFlat.get(resolved);
    if (!flat) return match;
    return `[${label}](${flat}${fragment ? `#${fragment}` : ''})`;
  });
}

function syncContentHash(content) { return sha256(normalizeSourceForHash(content)); }

function materialize(output, replace, writer) {
  if (fs.existsSync(output) && !replace) fail(`Output already exists: ${output}. Pass --force to replace it.`);
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  const staging = path.join(parent, `.${path.basename(output)}.staging-${process.pid}-${randomBytes(4).toString('hex')}`);
  const backup = path.join(parent, `.${path.basename(output)}.backup-${process.pid}-${randomBytes(4).toString('hex')}`);
  fs.mkdirSync(staging, { recursive: true });
  try {
    writer(staging);
    if (fs.existsSync(output)) fs.renameSync(output, backup);
    fs.renameSync(staging, output);
    fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    if (!fs.existsSync(output) && fs.existsSync(backup)) fs.renameSync(backup, output);
    throw error;
  }
}

function replaceFrontmatter(content, frontmatter) { return `${frontmatter}\n${stripFrontmatter(content).trimStart()}`; }
function stripFrontmatter(content) { return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''); }
function stripFirstHeading(content) { return content.trimStart().replace(/^# .*\r?\n+/, ''); }
function firstHeading(content) { return content.match(/^# (.+)$/m)?.[1]?.trim() || 'Untitled'; }
function frontmatterValue(content, key) { return content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^['"]|['"]$/g, '') || ''; }
function copyIndex(source, target) { writeText(target, readText(source).replaceAll('../appendices/', '../technical-appendices/')); }
function fileName(prefix, value) { return `${slug(clean(value) || prefix)}.md`; }
function slug(value) { return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'item'; }
function yaml(value) { return JSON.stringify(value ?? null); }
function escapeLink(value) { return clean(value).replaceAll('[', '\\[').replaceAll(']', '\\]'); }
function escapeTable(value) { return clean(value).replaceAll('|', '\\|').replaceAll('\n', ' '); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function addMulti(map, key, value) { map.set(key, [...(map.get(key) ?? []), value]); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function asArray(value) { return Array.isArray(value) ? value : []; }
function asObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function indexBy(values, key) { return new Map(values.map((value) => [clean(value[key]), value])); }
function readText(file) { return fs.readFileSync(file, 'utf8'); }
function readJson(file) { return JSON.parse(readText(file)); }

function stripClausePunctuation(value) {
  return clean(value).replace(/[。；;，,\s]+$/u, '');
}

function joinChineseClauses(value) {
  const values = asArray(value).map(stripClausePunctuation).filter(Boolean);
  return values.join('；') || '无';
}

function renderNumberedSteps(value, indent = '') {
  const values = asArray(value).map(stripClausePunctuation).filter(Boolean);
  if (!values.length) return `${indent}- 无`;
  return values.map((item, index) => `${indent}${index + 1}. ${item}`).join('\n');
}
function writeText(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`, 'utf8'); }
function writeJson(file, value) { writeText(file, JSON.stringify(value, null, 2)); }
function readIndex(name) { return readText(path.join(packageRoot, 'indexes', `${name}.jsonl`)).split(/\r?\n/).filter(Boolean).map(JSON.parse).filter((row) => row.record_type !== 'header'); }
function readOptionalIndex(name) { return fs.existsSync(path.join(packageRoot, 'indexes', `${name}.jsonl`)) ? readIndex(name) : []; }
function readPackageJsonl(rel) {
  const file = path.join(packageRoot, rel);
  if (!fs.existsSync(file)) return [];
  return readText(file).split(/\r?\n/).filter(Boolean).map(JSON.parse).filter((row) => row.record_type !== 'header');
}
function listFiles(root) { return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? listFiles(path.join(root, entry.name)) : [path.join(root, entry.name)]); }
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i += 1) { const value = values[i]; if (!value.startsWith('--')) fail(`Unexpected argument: ${value}`); const key = value.slice(2); if (['force', 'keep-build-ir', 'allow-all-visible', 'allow-semantic-plan-snapshot-drift'].includes(key)) out[key] = true; else out[key] = values[++i]; } return out; }
function required(values, key) { const value = clean(values[key]); if (!value) fail(`--${key} is required.`); return value; }
function normalizeUploadSourceNamespace(value) {
  const namespace = slug(clean(value));
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(namespace)) fail('Upload source namespace must be 2-80 characters and use lowercase letters, numbers, dot, underscore, or dash.');
  return namespace;
}
function normalizeSnapshotDate(value) {
  const text = clean(value);
  if (!text) return null;
  const date = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) fail('Snapshot date must start with YYYY-MM-DD.');
  return date;
}
function assertSafePaths(source, output, archive, uploadSources) {
  if (source === output || output.startsWith(`${source}${path.sep}`)) fail('Output must not overwrite or be nested inside the asset package.');
  if (archive.startsWith(`${output}${path.sep}`)) fail('Archive must not be nested inside the output directory.');
  if (uploadSources === output || uploadSources.startsWith(`${output}${path.sep}`)) fail('Upload sources output must not be nested inside the review Wiki output.');
  if (uploadSources === source || uploadSources.startsWith(`${source}${path.sep}`)) fail('Upload sources output must not be nested inside the asset package.');
}
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }
