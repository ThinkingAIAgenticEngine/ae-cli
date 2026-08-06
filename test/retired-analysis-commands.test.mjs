import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = process.cwd();

const retiredAnalysisCommands = [
  '+create_alert',
  '+delete_alert',
  '+get_alert',
  '+list_alerts',
  '+update_alert',
  '+cancel_query',
  '+load_filters',
  '+list_query_clusters',
  '+get_table_columns',
  '+build_entity_details_sql',
  '+build_event_details_sql',
  '+query_entity_details',
  '+query_event_details',
  '+batch_create_metadata',
  '+batch_edit_metadata',
];

const retiredSemanticBuildGroups = [
  'alert-definition-schema',
  'user-cluster-definition',
  'user-tag-definition',
];

const retiredAudienceCommands = [
  '+build_cluster_definition',
  '+build_tag_definition',
  '+create_cluster',
  '+create_id_cluster',
  '+create_id_tag',
  '+create_tag',
  '+delete_cluster',
  '+delete_tag',
  '+get_cluster_definition_schema',
  '+get_clusters_by_name',
  '+get_tag_definition_schema',
  '+get_tags_by_name',
  '+list_cluster_members',
  '+list_clusters',
  '+list_tag_members',
  '+list_tags',
  '+refresh_cluster',
  '+refresh_tag',
  '+update_cluster',
  '+update_id_cluster',
  '+update_id_tag',
  '+update_tag',
];

const retiredTokens = [
  'analysis_audience',
  'analysis user-cluster-definition build',
  'analysis user-tag-definition build',
  'analysis.user_cluster_definition.build',
  'analysis.user_tag_definition.build',
  ...retiredAnalysisCommands,
  ...retiredAudienceCommands,
];

const allowedServiceScopedOccurrences = new Map([
  ['+cancel_query', [
    'src/commands/te-engage/',
    'skills/ae-engage/',
    'docs/engage-',
  ]],
]);

function runCli(...args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function walkFiles(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [absolutePath];
  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relativePath, entry.name);
    return entry.isDirectory() ? walkFiles(child) : [path.join(ROOT, child)];
  });
}

test('retired analysis commands are absent from CLI help', () => {
  const analysisHelp = runCli('analysis', '--help');
  assert.equal(analysisHelp.status, 0, analysisHelp.stderr);
  for (const command of retiredAnalysisCommands) {
    assert.doesNotMatch(analysisHelp.stdout, new RegExp(command.replace('+', '\\+')));
  }
  for (const command of retiredSemanticBuildGroups) {
    assert.doesNotMatch(analysisHelp.stdout, new RegExp(command));
  }

  const rootHelp = runCli('--help');
  assert.equal(rootHelp.status, 0, rootHelp.stderr);
  assert.doesNotMatch(rootHelp.stdout, /analysis_audience/);

  const audienceHelp = runCli('analysis_audience', '--help');
  assert.notEqual(audienceHelp.status, 0, 'analysis_audience must not remain as an empty compatibility service');

  const metadataHelp = runCli('analysis_meta', '--help');
  assert.notEqual(metadataHelp.status, 0, 'analysis_meta must not remain as an empty compatibility service');
});

test('retired analysis commands are absent from source and agent-facing documentation', () => {
  const roots = [
    'src',
    'scripts',
    'skills',
    'docs',
    'README.md',
    'README.zh.md',
    'open-source/README.opensource.md',
    'open-source/README.opensource.zh.md',
  ];
  const files = roots.flatMap(walkFiles)
    .filter((file) => /\.(?:ts|mts|mjs|md)$/.test(file));

  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(ROOT, file);
    for (const token of retiredTokens) {
      const allowedPrefixes = allowedServiceScopedOccurrences.get(token) ?? [];
      if (allowedPrefixes.some((prefix) => relativeFile.startsWith(prefix))) {
        continue;
      }
      if (content.includes(token)) {
        violations.push(`${relativeFile} contains ${token}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('the retired command inventory remains exactly 40 commands', () => {
  assert.equal(retiredAnalysisCommands.length + retiredAudienceCommands.length
    + retiredSemanticBuildGroups.length, 40);
});

test('gateway lifecycle commands are not labeled as legacy MCP commands', () => {
  const index = fs.readFileSync(
    path.join(ROOT, 'skills/ae-analysis/references/command_index.md'),
    'utf8',
  );
  assert.match(index, /`ae-cli analysis run inspect` \| gateway lifecycle \|/);
  assert.match(index, /`ae-cli analysis artifact download` \| gateway lifecycle \|/);
});
