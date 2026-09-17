#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { precompiledSource, normalizeSourceForHash } from './precompiled-source.mjs';

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
if (clean(semanticPlan.source_snapshot_hash) !== snapshotHash) fail('Semantic plan snapshot hash does not match the asset package.');
if (clean(semanticPlan.generation_method) !== 'agent_semantic_synthesis') {
  fail('Semantic plan generation_method must be agent_semantic_synthesis.');
}

const dashboards = readIndex('dashboard-catalog');
const reports = readIndex('report-catalog');
const metrics = readIndex('metric-catalog');
const containers = readIndex('asset-containers');
const dashboardById = indexBy(dashboards, 'resource_key');
const reportById = indexBy(reports, 'resource_key');
const metricById = indexBy(metrics, 'resource_key');
const dashboardFileNames = titleFirstAssetFileMap(dashboards, 'dashboard');
const reportFileNames = titleFirstAssetFileMap(reports, 'report');
const metricFileNames = titleFirstAssetFileMap(metrics, 'metric');
const titleFirstAssetPathMap = titleFirstAssetPathRewrites();
const containerById = indexBy(containers, 'container_key');
const domains = asArray(semanticPlan.domains);
const appendices = asArray(semanticPlan.appendices);
const domainByDashboardId = new Map();
const appendixByDashboardId = new Map();
for (const domain of domains) for (const id of asArray(domain.dashboard_ids).map(clean)) domainByDashboardId.set(id, domain);
for (const appendix of appendices) for (const id of asArray(appendix.dashboard_ids).map(clean)) appendixByDashboardId.set(id, appendix);

const planModel = validateSemanticPlan();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'project-semantic-knowledge-wiki-'));
const buildIr = path.join(scratch, 'build-ir');

try {
  const generator = path.join(import.meta.dirname, 'generate-build-ir.mjs');
  const generatorArgs = [generator, '--asset-package', packageRoot, '--domain-plan', semanticPlanPath,
    '--output', buildIr, '--project-name', projectName];
  if (allowAllVisible) generatorArgs.push('--allow-all-visible');
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
      'metadata', 'recall-cards', 'governance',
    ]) fs.mkdirSync(path.join(wikiRoot, directory), { recursive: true });

    for (const metadataType of fs.readdirSync(path.join(buildIr, 'metadata'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
      fs.mkdirSync(path.join(wikiRoot, 'metadata', metadataType), { recursive: true });
    }

    for (const domain of domains) {
      const id = clean(domain.domain_id);
      const source = readText(path.join(buildIr, 'domains', fileName('domain', id)));
      const cards = asArray(domain.recall_cards);
      const cardLinks = cards.map((card) => `- [${escapeLink(card.questions?.[0] || card.intent || card.card_id)}](../recall-cards/${fileName('recall-card', card.card_id)})`).join('\n');
      writeText(path.join(wikiRoot, 'domains', fileName('domain', id)),
        replaceFrontmatter(source, domainFrontmatter(domain))
          + `\n## 场景召回卡\n\n${cardLinks || '- 无'}\n`);
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
    copyIndex(path.join(buildIr, 'reports', 'index.md'), path.join(wikiRoot, 'reports', 'index.md'));
    copyIndex(path.join(buildIr, 'metrics', 'index.md'), path.join(wikiRoot, 'metrics', 'index.md'));
    copyIndex(path.join(buildIr, 'metadata', 'index.md'), path.join(wikiRoot, 'metadata', 'index.md'));

    for (const card of planModel.cards) {
      writeText(path.join(wikiRoot, 'recall-cards', fileName('recall-card', card.card_id)), renderRecallCard(card));
    }
    writeText(path.join(wikiRoot, 'recall-cards', 'index.md'), renderRecallCardIndex(planModel.cards));

    const coverage = readText(path.join(buildIr, 'indexes', 'coverage.md'))
      .replaceAll('../appendices/', '../technical-appendices/')
      .replaceAll('../briefs/reports/', '../reports/')
      .replaceAll('../briefs/metadata/', '../metadata/');
    writeText(path.join(wikiRoot, 'governance', 'coverage.md'), coverage);
    writeText(path.join(wikiRoot, 'governance', 'authority-index.md'), renderAuthorityIndex(authorityRows));
    writeText(path.join(wikiRoot, 'governance', 'index.md'), renderGovernanceIndex(conflictReportIds.size));
    writeText(path.join(wikiRoot, 'governance', 'source-project-boundary.md'), renderSourceProjectBoundary(sourceProjectReferencesFromPackage()));
    writeText(path.join(wikiRoot, 'project-overview.md'), renderProjectOverview(corpus));
    writeText(path.join(wikiRoot, 'index.md'), renderWikiIndex(corpus));
    writeText(path.join(wikiRoot, 'log.md'), renderLog(corpus));
    writeText(path.join(staging, 'index.md'), renderSnapshotIndex(corpus));

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
      semantic_plan_hash: sha256(fs.readFileSync(semanticPlanPath)),
      asset_package_schema_version: '3.0',
      asset_scope: packageAssetScope,
      wiki_schema_version: '1.0',
      generated_at: descriptor.generated_at ?? packageManifest.generated_at ?? null,
      counts: { ...corpus.counts, recall_cards: planModel.cards.length, blocked_assets: blockedCount, unknown_sql_reports: unknownSqlCount },
      quality_warnings: [...asArray(corpus.warnings),
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
  for (const domain of domains) {
    const domainId = clean(domain.domain_id);
    const domainDashboardIds = new Set(asArray(domain.dashboard_ids).map(clean));
    const domainReportIds = new Set(reports.filter((report) => asArray(report.dashboard_refs)
      .some((ref) => domainDashboardIds.has(clean(ref.dashboard_id)))).map((report) => clean(report.resource_key)));
    const domainMetricIds = new Set(reports.filter((report) => domainReportIds.has(clean(report.resource_key)))
      .flatMap((report) => asArray(report.metric_occurrences).map((item) => clean(item.metric_key)).filter(Boolean)));
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

  return { cards, excludedByAsset, preferredByAsset, sqlByReportId, missingSqlByReportId: new Set(missingSql) };
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
    .replace(/- 源详情: `([^`]+)`/g, '- 资产包源定位（精确证据已内嵌）: `$1`');
  const brief = readText(path.join(buildIr, 'briefs', directory, fileName(directory.slice(0, -1), id)));
  const type = directory === 'dashboards' ? 'project-dashboard' : directory === 'reports' ? 'project-report' : 'project-reusable-metric';
  const title = assetReadableTitle(asset, directory.slice(0, -1));
  writeText(path.join(wikiRoot, directory, assetOutputFileName(directory, id)),
    ensureReadableHeading(mergePage(source, brief, authorityFrontmatter(type, id, title, authority), extra), title));
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

## Agent 执行顺序

1. 先进入首选资产确认业务范围、指标和维度。
2. 首选资产不足以回答时，再使用备选资产补充证据。
3. 排除资产只用于解释为什么不采用，不能作为当前问题的主要答案来源。
4. 需要当前数值、客户名单、趋势或明细时，必须实时执行报表/查询。

${refs(card.preferred_asset_refs, '首选资产')}

${refs(card.fallback_asset_refs, '备选资产')}

${refs(card.excluded_asset_refs, '排除资产')}

## 实时执行边界

- 是否需要执行实时数据：${Boolean(card.requires_live_execution)}
- 原因：${clean(card.live_execution_reason) || '未说明'}
`;
}

function recallAssetLabel(ref) {
  const type = clean(ref.resource_type);
  const key = clean(ref.resource_key);
  const row = type === 'dashboard' ? dashboardById.get(key)
    : type === 'report' ? reportById.get(key)
      : type === 'metric' ? metricById.get(key)
        : null;
  const title = assetReadableTitle({ ...asObject(row), title: ref.display_name || ref.title || row?.title, resource_key: key }, type);
  const identity = `${type}:${key}`;
  return title && title !== key ? `${title}（${identity}）` : identity;
}

function renderRecallCardIndex(cards) {
  return `# 场景召回卡\n\n首轮召回先使用这里的业务问题与权威资产路由，不直接宽搜全部资产页。\n\n${cards.map((card) => `- [${escapeLink(card.questions?.[0] || card.intent || card.card_id)}](${fileName('recall-card', card.card_id)})（${clean(card.domain_title)}）`).join('\n')}\n`;
}

function renderAuthorityIndex(rows) {
  return `# 资产权威状态\n\n## Agent 判定规则\n\n- \`runtime_policy=allow\`：可以作为主要答案依据，但当前数值仍需实时执行。\n- \`runtime_policy=warn\`：只能作为依赖或辅助线索，回答时需要说明它不是独立召回入口。\n- \`runtime_policy=block\`：不能直接回答，必须回到 canonical 资产、业务域或等待资产作者确认。\n- \`authority_role=dependency_only\`：只在报表/指标引用时使用，不能单独作为业务入口。\n- \`definition_state=conflict\` 或 \`unknown\`：不要断言精确口径，只能描述已知证据和待确认点。\n\n| 类型 | 资产 | Authority role | Certification | Definition | Runtime | Standalone recall | Canonical |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.sort((a, b) => `${a.resource_type}:${a.resource_key}`.localeCompare(`${b.resource_type}:${b.resource_key}`, 'en')).map((row) => `| ${row.resource_type} | \`${row.resource_key}\` ${escapeTable(row.title)} | ${row.authority_role} | ${row.certification_state} | ${row.definition_state} | ${row.runtime_policy} | ${row.standalone_recall} | ${row.canonical_asset_id ?? '-'} |`).join('\n')}\n`;
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
  return `# 治理与质量\n\n- [资产权威状态](authority-index.md)\n- [覆盖、物理来源与未归属资产](coverage.md)\n- [项目来源边界](source-project-boundary.md)\n\n## Agent 使用方式\n\n- 回答前先看资产页 frontmatter 的 \`runtime_policy\`、\`definition_state\` 和 \`authority_role\`。\n- \`runtime_policy=block\` 的资产不能直接回答；如果存在 canonical 资产，优先跳转到 canonical。\n- \`dependency_only\` 元数据只解释报表/指标依赖，不单独发起召回。\n- 语义冲突表示多个资产表达同一业务含义但口径不同，不能只凭名称选择资产；优先使用业务域、召回卡或用户确认。\n- 项目来源边界用于识别资产包里引用了其他项目 ID 的字段；跨项目引用只能作为来源线索，不代表当前项目事实。\n\n当前检测到 ${conflicts} 张语义冲突报表。\n`;
}

function renderWikiIndex(corpus) {
  return `---\ntype: project-semantic-knowledge-wiki-index\nsemantic_project_id: ${semanticProjectId}\nproject_name: ${yaml(projectName)}\nsource_snapshot_hash: ${yaml(snapshotHash)}\n---\n\n# ${projectName} 项目语义知识库 Wiki\n\n## 查询顺序\n\n1. [场景召回卡](recall-cards/index.md)\n2. [业务域](domains/index.md)\n3. [看板](dashboards/index.md)、[报表](reports/index.md)、[可复用指标](metrics/index.md)\n4. [分析元数据](metadata/index.md)\n5. [治理与质量](governance/index.md)\n\n技术、演示、副本和定向诊断资产只在[技术附录](technical-appendices/index.md)中追溯。物理空间在[source containers](source-containers/index.md)中保留，不作为业务域。\n\n${countSummary(corpus)}\n`;
}

function renderSnapshotIndex(corpus) {
  const title = String(projectName).replace(/\r?\n/g, ' ').replace(/^#+\s*/, '');
  return `# ${title} 项目语义知识库 Wiki\n\n这是可导入知识库源文件体系的项目语义 Wiki，共包含 ${corpus.counts.dashboards} 张看板、${corpus.counts.reports} 张报表和 ${corpus.counts.analysis_metadata} 条分析元数据。\n\n## 查询顺序\n\n1. [场景召回卡](wiki/recall-cards/index.md)\n2. [业务域](wiki/domains/index.md)\n3. [看板](wiki/dashboards/index.md)、[报表](wiki/reports/index.md)、[可复用指标](wiki/metrics/index.md)\n4. [分析元数据](wiki/metadata/index.md)\n5. [治理与质量](wiki/governance/index.md)\n\n技术、演示、副本和定向诊断资产只在[技术附录](wiki/technical-appendices/index.md)中追溯。物理空间在[source containers](wiki/source-containers/index.md)中保留，不作为业务域。\n\n${countSummary(corpus)}\n`;
}

function renderProjectOverview(corpus) {
  return `# ${projectName} 项目语义知识库概览\n\n- Semantic project ID: ${semanticProjectId}\n- Snapshot hash: \`${snapshotHash}\`\n- Asset scope: ${packageAssetScope}\n- Business domains: ${corpus.counts.business_domains}\n- Dashboards: ${corpus.counts.dashboards}\n- Reports: ${corpus.counts.reports}\n- Reusable metrics: ${corpus.counts.reusable_metrics}\n- Metadata: ${corpus.counts.analysis_metadata}\n\nCommon 资产包是权威来源。本 Wiki 将用途总结和精确证据合并为单一页面，不再发布第二套 raw/briefs 语料。\n`;
}

function renderLog(corpus) {
  return `# Build log\n\n## Snapshot ${snapshotHash}\n\n- Semantic project ID: ${semanticProjectId}\n- Business domains: ${corpus.counts.business_domains}\n- Reports: ${corpus.counts.reports}\n- Semantic plan hash: \`${sha256(fs.readFileSync(semanticPlanPath))}\`\n`;
}

function countSummary(corpus) {
  return `## 数量\n\n| 资产 | 数量 |\n| --- | ---: |\n| 业务域 | ${corpus.counts.business_domains} |\n| 技术附录 | ${corpus.counts.technical_appendices} |\n| 看板 | ${corpus.counts.dashboards} |\n| 报表 | ${corpus.counts.reports} |\n| 可复用指标 | ${corpus.counts.reusable_metrics} |\n| 分析元数据 | ${corpus.counts.analysis_metadata} |\n| 场景召回卡 | ${planModel.cards.length} |`;
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
    'wiki/recall-cards/index.md', 'wiki/domains/index.md', 'wiki/dashboards/index.md',
    'wiki/reports/index.md', 'wiki/metrics/index.md', 'wiki/metadata/index.md',
    'wiki/governance/index.md', 'wiki/technical-appendices/index.md',
    'wiki/source-containers/index.md',
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
      });
      writeText(path.join(staging, flatName), `<!--\nkb_source_namespace: ${uploadSourceNamespace}\nsnapshot_date: ${snapshotDate ?? 'null'}\nsnapshot_hash: ${snapshotHash}\nsource_kind: ${identity.source_kind}\nasset_type: ${identity.asset_type ?? 'null'}\nasset_key: ${identity.asset_key ?? 'null'}\ncontent_hash: ${contentHash}\nsource_path: ${rel}\n-->\n\n${content}`);
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
    });
    writeText(path.join(staging, manifestName), `<!--\nkb_source_namespace: ${uploadSourceNamespace}\nsnapshot_date: ${snapshotDate ?? 'null'}\nsnapshot_hash: ${snapshotHash}\nsource_kind: manifest\nasset_type: null\nasset_key: null\ncontent_hash: ${manifestHash}\nsource_path: manifest.json\n-->\n\n${manifestContent}`);
    writeJson(path.join(staging, 'kb-upload-manifest.json'), {
      schema_version: '1.0',
      manifest_kind: 'ae_project_semantic_kb_upload_sources',
      namespace: uploadSourceNamespace,
      semantic_project_id: semanticProjectId,
      project_name: projectName,
      snapshot_date: snapshotDate,
      snapshot_hash: snapshotHash,
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
function writeText(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`, 'utf8'); }
function writeJson(file, value) { writeText(file, JSON.stringify(value, null, 2)); }
function readIndex(name) { return readText(path.join(packageRoot, 'indexes', `${name}.jsonl`)).split(/\r?\n/).filter(Boolean).map(JSON.parse).filter((row) => row.record_type !== 'header'); }
function listFiles(root) { return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? listFiles(path.join(root, entry.name)) : [path.join(root, entry.name)]); }
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i += 1) { const value = values[i]; if (!value.startsWith('--')) fail(`Unexpected argument: ${value}`); const key = value.slice(2); if (['force', 'keep-build-ir', 'allow-all-visible'].includes(key)) out[key] = true; else out[key] = values[++i]; } return out; }
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
