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
const listQueryClustersRel = 'skills/ae-analysis/references/query_cluster_list.md';
const listClustersRefRel = 'skills/ae-analysis/references/user_cluster_list.md';
const listQueryClustersCmdRel = 'src/commands/te-analysis/query-cluster/list.ts';
const listClustersCmdRel = 'src/commands/te-analysis/user/index.ts';

assertIncludes(globalSkillRel, read(globalSkillRel), [
  'Localized examples',
  '查询集群',
  '用户分群',
  'analysis query-cluster list',
  'analysis user-cluster list',
]);

assertIncludes(listQueryClustersRel, assertFile(listQueryClustersRel), [
  '# analysis query-cluster list',
  '查询集群',
  '用户分群',
  'current_cluster',
  'slave_clusters',
  'permissions',
  'allowed_cluster_query_params',
  'cluster-query-scope',
]);

assertIncludes(listClustersRefRel, read(listClustersRefRel), [
  'user-cluster list',
  'cluster_name',
]);

assertNotIncludes(listClustersRefRel, read(listClustersRefRel), [
  '集群信息',
  '有哪些集群',
  '可查询哪些集群',
]);

assertIncludes(listQueryClustersCmdRel, read(listQueryClustersCmdRel), [
  'physical query-routing clusters',
  'saved user cohort/cluster catalog',
  'analysis.query_cluster.list',
]);

assertIncludes(listClustersCmdRel, read(listClustersCmdRel), [
  'analysis.user_cluster.list',
]);

console.log('OK: analysis cluster routing docs and command descriptions are explicit.');
