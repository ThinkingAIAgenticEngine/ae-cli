import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function assertIncludes(rel, content, required) {
  const missing = required.filter(token => !content.includes(token));
  if (missing.length > 0) {
    throw new Error(`${rel} missing required routing text: ${missing.join(', ')}`);
  }
}

function assertFile(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    throw new Error(`${rel} is required`);
  }
  return fs.readFileSync(file, 'utf-8');
}

function assertNotIncludes(rel, content, forbidden) {
  const present = forbidden.filter(token => content.includes(token));
  if (present.length > 0) {
    throw new Error(`${rel} contains global-only routing text: ${present.join(', ')}`);
  }
}

const globalSkillRel = 'skills/ae-analysis-global/SKILL.md';
const analysisSkillRel = 'skills/ae-analysis/SKILL.md';
const listQueryClustersRel = 'skills/ae-analysis-global/references/list_query_clusters.md';
const baseListQueryClustersRel = 'skills/ae-analysis/references/list_query_clusters.md';
const listClustersRefRel = 'skills/ae-analysis/references/list_clusters.md';
const listQueryClustersCmdRel = 'src/commands/te-analysis/global/list-query-clusters.ts';
const listClustersCmdRel = 'src/commands/te-audience/cluster/list-clusters.ts';

assertIncludes(globalSkillRel, read(globalSkillRel), [
  'Localized examples',
  'query cluster',
  'audience/user segment cluster',
  'analysis +list_query_clusters',
  'analysis_audience +list_clusters',
]);

assertNotIncludes(analysisSkillRel, read(analysisSkillRel), [
  'Term Disambiguation',
  'list_query_clusters',
  'multi-cluster',
  'query cluster',
  '集群信息',
  '查询集群',
  '用户分群',
]);

if (fs.existsSync(path.join(ROOT, baseListQueryClustersRel))) {
  throw new Error(`${baseListQueryClustersRel} must not exist; list_query_clusters is a global overlay reference`);
}

assertIncludes(listQueryClustersRel, assertFile(listQueryClustersRel), [
  '# analysis +list_query_clusters',
  'Localized examples',
  'query cluster',
  'currentCluster',
  'slaveClusters',
  'permissions',
  'allowedClusterQueryParams',
  'cluster_query_scope',
]);

assertIncludes(listClustersRefRel, read(listClustersRefRel), [
  'Audience/User Segment',
  'audience/user segment clusters',
]);

assertNotIncludes(listClustersRefRel, read(listClustersRefRel), [
  'list_query_clusters',
  'multi-cluster',
  '集群信息',
  '有哪些集群',
  '可查询哪些集群',
]);

assertIncludes(listQueryClustersCmdRel, read(listQueryClustersCmdRel), [
  'query cluster',
  'current self cluster',
  'global aggregated data',
  'specific slave cluster',
]);

assertIncludes(listClustersCmdRel, read(listClustersCmdRel), [
  'user cohort/segment cluster',
]);

console.log('OK: analysis cluster routing docs and command descriptions are explicit.');
