import assert from 'node:assert/strict';

import kbCommands from '../src/commands/te-kb/index.ts';
import projectSemanticCommands from '../src/commands/project-semantic/index.ts';

const HOST = 'https://ta.example/';
const KB_NAME = 'Product Radar 项目语义知识库';
const KB_REF = { scope: 'company', name: KB_NAME };
const SOURCES = [KB_REF];

const kbByCommand = new Map(kbCommands.map((command) => [command.command, command]));
const projectSemanticByName = new Map(projectSemanticCommands.map((command) => [
  `${command.service} ${command.resource} ${command.command}`,
  command,
]));

assert.ok(
  projectSemanticByName.has('project-semantic asset-package export'),
  'closed loop requires project-semantic asset-package export',
);
assert.equal(
  projectSemanticByName.get('project-semantic asset-package export').risk,
  'read',
);

for (const [command, risk] of Object.entries({
  '+list': 'read',
  '+new': 'write',
  '+add': 'write',
  '+list-sources': 'read',
  '+rm-source': 'high-risk-write',
  '+schema': 'write',
  '+compile': 'write',
  '+status': 'read',
  '+index': 'read',
  '+grep': 'read',
  '+read': 'read',
  '+ask': 'read',
})) {
  assert.ok(kbByCommand.has(command), `closed loop KB command is registered: ${command}`);
  assert.equal(kbByCommand.get(command).risk, risk, `${command} risk contract`);
  assert.equal(typeof kbByCommand.get(command).dryRun, 'function', `${command} exposes dry-run contract`);
}

assertDryRun('+list', { 'build-status': 'compiled', locale: 'zh' }, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/list',
  body: { buildStatus: 'compiled', locale: 'zh' },
});
assertDryRun('+new', {
  scope: 'company',
  name: KB_NAME,
  description: 'Project semantic asset source compiled from a governed Common asset package',
  'project-id': '196',
  'project-name': 'Product Radar',
}, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/create',
  body: {
    scope: 'company',
    name: KB_NAME,
    description: 'Project semantic asset source compiled from a governed Common asset package',
    projectId: '196',
    projectName: 'Product Radar',
  },
});
assertDryRun('+add', { name: KB_NAME, files: ['/tmp/project-assets.zip'] }, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/sources/upload',
  body: {
    name: KB_NAME,
    files: [{ value: '/tmp/project-assets.zip', type: 'path' }],
    contentType: 'multipart/form-data',
  },
});
assertDryRun('+list-sources', { name: KB_NAME }, {
  method: 'GET',
  path: '/agent/api/external/knowledge-bases/sources',
  query: { name: KB_NAME },
});
assertDryRun('+rm-source', { name: KB_NAME, id: 'source-1', 'display-name': 'legacy.md' }, {
  method: 'DELETE',
  path: '/agent/api/external/knowledge-bases/sources',
  body: { name: KB_NAME, id: 'source-1' },
});
assertDryRun('+schema', {
  name: KB_NAME,
}, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/schema',
  body: {
    name: KB_NAME,
  },
});
assertDryRun('+compile', { name: KB_NAME, mode: 'full' }, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/compile',
  body: { name: KB_NAME, mode: 'full' },
});
assertDryRun('+status', { name: KB_NAME }, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/status',
  body: { name: KB_NAME },
});
assertDryRun('+index', { sources: SOURCES }, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/index',
  body: { sources: SOURCES },
});
assertDryRun('+grep', {
  query: '收入规模和趋势',
  sources: SOURCES,
  paths: ['wiki/recall-cards'],
  'top-k': 10,
}, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/grep',
  body: {
    query: '收入规模和趋势',
    sources: SOURCES,
    paths: ['wiki/recall-cards'],
    topK: 10,
  },
});
assertDryRun('+read', {
  source: KB_REF,
  path: 'wiki/dashboards/d1.md',
  offset: 12,
  limit: 60,
}, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/read',
  body: {
    source: KB_REF,
    path: 'wiki/dashboards/d1.md',
    offset: 12,
    limit: 60,
  },
});
assertDryRun('+ask', {
  question: '收入规模和趋势如何？',
  sources: SOURCES,
  locale: 'zh',
}, {
  method: 'POST',
  path: '/agent/api/external/knowledge-bases/ask',
  body: {
    question: '收入规模和趋势如何？',
    sources: SOURCES,
    locale: 'zh',
  },
});

assert.throws(
  () => kbByCommand.get('+compile').validate(context({ mode: 'partial' })),
  /Invalid --mode/,
);
assert.throws(
  () => kbByCommand.get('+rm-source').validate(context({ name: KB_NAME })),
  /One of --id or --display-name is required/,
);

console.log('project semantic KB closed-loop CLI contract tests passed');

function assertDryRun(commandName, values, expected) {
  if (['+new', '+add', '+list-sources', '+rm-source', '+schema', '+compile', '+status'].includes(commandName)) {
    values = { ...values, scope: 'company' };
    if (expected.body) expected.body.scope = 'company';
    if (expected.query) expected.query.scope = 'company';
  }
  if (['+schema', '+compile'].includes(commandName)) {
    values.model = 'system-model-glm-5.2';
    expected.body.model = 'system-model-glm-5.2';
  }
  const command = kbByCommand.get(commandName);
  const actual = command.dryRun(context(values));
  assert.equal(actual.method, expected.method, `${commandName} method`);
  const url = new URL(actual.url);
  assert.equal(url.origin, 'https://ta.example', `${commandName} host`);
  assert.equal(url.pathname, expected.path, `${commandName} path`);
  if (expected.query) {
    for (const [key, value] of Object.entries(expected.query)) {
      assert.equal(url.searchParams.get(key), value, `${commandName} query ${key}`);
    }
  } else {
    assert.equal(url.search, '', `${commandName} has no unexpected query`);
  }
  if ('body' in expected) assert.deepEqual(actual.body, expected.body, `${commandName} body`);
}

function context(values = {}) {
  return {
    host: () => HOST,
    str: (name) => values[name] == null ? '' : String(values[name]),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] == null ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
  };
}
