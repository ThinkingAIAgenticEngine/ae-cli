import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_COMMIT = '6f3c497e2b25a63689de280da9ecdef829c45ad2';
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../skills/ae-page-context');
const dashboardRoot = 'apps/ta/src/pages/panel/components/agent-context-bridge';
const governanceRoot = 'apps/ta/src/pages/data/assetGovernance';
export const SOURCE_PATHS = {
  dashboard: 'apps/ta/docs/domains/dashboard-operation-dictionary.md',
  governance: 'apps/ta/docs/domains/asset-governance-operation-dictionary.md',
  log: 'apps/ta/docs/domains/asset-governance-log-operation-dictionary.md',
  dashboardTypes: `${dashboardRoot}/recorder.ts`,
  dashboardOperations: `${dashboardRoot}/operations.ts`,
  exploreTypes: `${dashboardRoot}/explore.ts`,
  governanceTypes: `${governanceRoot}/components/agent-context-bridge/types.ts`,
  logTypes: `${governanceRoot}/log/components/agent-context-bridge/types.ts`,
  batch: `${governanceRoot}/constants/batch.ts`,
};
export const sha256 = (text) => createHash('sha256').update(text).digest('hex');

export function readCommittedSources(sourceRoot) {
  if (!sourceRoot) throw new Error('A local --source repository is required; no network source is used.');
  return Object.fromEntries(Object.entries(SOURCE_PATHS).map(([key, sourcePath]) => [
    key,
    execFileSync('git', ['-C', path.resolve(sourceRoot), 'show', `${SOURCE_COMMIT}:${sourcePath}`], {
      encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    }),
  ]));
}

function numberedSections(text, expected, prefix = '## ') {
  const headings = [...text.matchAll(new RegExp(`^${prefix}([^\\n]+)$`, 'gm'))];
  const actual = headings.map((heading) => /^(\d+(?:\.\d+)?)\.?(?:\s|$)/.exec(heading[1])?.[1] ?? heading[1]);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unmapped source sections: expected ${expected.join(', ')}, received ${actual.join(', ')}`);
  }
  return Object.fromEntries(headings.map((heading, index) => [actual[index],
    text.slice(heading.index, headings[index + 1]?.index ?? text.length).trim(),
  ]));
}

function declaration(text, name, kind = 'type') {
  const start = new RegExp(`^(?:export )?${kind} ${name}(?: =| \\{)`, 'm').exec(text);
  if (!start) throw new Error(`Missing source ${kind}: ${name}`);
  const lines = text.slice(start.index).split('\n');
  let depth = 0;
  const end = lines.findIndex((line) => {
    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    return depth === 0 && (kind === 'type' ? line.trimEnd().endsWith(';') : line === '}');
  });
  if (end < 0) throw new Error(`Unterminated source ${kind}: ${name}`);
  return lines.slice(0, end + 1).join('\n');
}

function removeLines(text, patterns) {
  return text.split('\n').filter((line) => !patterns.some((pattern) => pattern.test(line))).join('\n');
}

function portableLinks(text) {
  return text
    .replace(/(?:第 )?9 节/g, '[business value reference](dashboard-business-values.md)')
    .replace(/(?:第 )?10 节/g, '[exploration query reference](explore-query-inheritance.md)')
    .replace(/（F02\/F03）|（R01）/g, '')
    .replace(/^R01 /gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function exampleBlocks(text) {
  return [...text.matchAll(/```json\n([\s\S]*?)\n```\n\n([\s\S]*?)(?=\n```json|$)/g)].map((match) => {
    const operation = JSON.parse(match[1]);
    if (!['dashboard', 'explore'].includes(operation.surface)) throw new Error('Unmapped example surface.');
    return { surface: operation.surface, text: match[0].trim() };
  });
}

export function generateBundle(sources) {
  const dashboard = numberedSections(sources.dashboard, Array.from({ length: 11 }, (_, i) => String(i)));
  const governance = numberedSections(sources.governance, ['1', '2', '3', '4']);
  const log = numberedSections(sources.log, ['1', '2', '3', '4']);
  const selection = numberedSections(dashboard['7'], ['7.1', '7.2', '7.3', '7.4'], '### ');
  const values = numberedSections(dashboard['9'], ['9.1', '9.2', '9.3', '9.4', '9.5', '9.6'], '### ');
  const inheritance = numberedSections(dashboard['10'], ['10.1', '10.2', '10.3'], '### ');
  const files = {};
  const references = [];
  const coverage = [];
  const sourceUse = (key, selector, content, transformation = 'verbatim') => ({
    source: SOURCE_PATHS[key], selector, sha256: sha256(content), transformation,
  });
  const docUse = (key, id, content, transformation) => sourceUse(key, `section ${id}`, content, transformation);
  const types = (key, names) => {
    const entries = names.map((name) => declaration(sources[key], name));
    return {
      text: ['## Source type excerpts', '', 'These are selected original declarations, not a new unified payload or a standalone schema. Referenced types are explained in the corresponding business reference.', '', '```typescript', ...entries, '```'].join('\n'),
      uses: entries.map((content, index) => sourceUse(key, `type ${names[index]}`, content)),
    };
  };
  const add = (name, title, intro, body, uses) => {
    const target = `references/${name}.md`;
    files[target] = `# ${title}\n\n${intro}\n\n${portableLinks(body)}\n`;
    references.push({ target, sha256: sha256(files[target]), sources: uses });
  };
  const route = (source, sections, targets, disposition = 'included') => {
    for (const [id, content] of Object.entries(sections)) {
      coverage.push({ source: SOURCE_PATHS[source], section: id, heading: content.split('\n')[0], sha256: sha256(content), targets: targets[id], disposition: typeof disposition === 'string' ? disposition : disposition[id] ?? 'included' });
    }
  };
  const excerpt = types('dashboardTypes', ['Json', 'Conditions', 'ReportIdentity', 'Query', 'ReportState', 'DashboardContextPayload']);
  const operationType = types('dashboardOperations', ['LastOperation']);
  const selectionText = [
    dashboard['7'].slice(0, dashboard['7'].indexOf('### 7.1')).trim(),
    selection['7.1'],
    removeLines(selection['7.2'], [/^1\. /]),
    'A componentId exists only when all selected nonempty text belongs to one unambiguous business object. Missing attribution remains page-level.',
    selection['7.3'].split('\n\n').filter((part) => part.startsWith('不要把')).join('\n\n'),
  ].join('\n\n');
  add('dashboard-context', 'Dashboard context',
    'Read this for dashboard identity, current surface, card state, and request evidence. All paths below are relative to the business payload. The dashboard payload has no source object: use resource, page.path, and resource.pageInstanceId. Selection has its own source and capture time. For exploration requests and displayed results, also read [explore-query-inheritance.md](explore-query-inheritance.md).',
    [dashboard['1'], dashboard['2'], dashboard['3'], dashboard['4'], excerpt.text, operationType.text.replace('## Source type excerpts', '## Operation type excerpt'), selectionText].join('\n\n'),
    [...['1', '2', '3', '4'].map((id) => docUse('dashboard', id, dashboard[id])), docUse('dashboard', '7', dashboard['7'], 'omit DOM algorithm, console instructions, and transport implementation; retain attribution, frozen-source, and payload distinctions'), ...excerpt.uses, ...operationType.uses]);

  for (const [surface, id] of [['dashboard', '5'], ['explore', '6']]) {
    const section = dashboard[id];
    const rows = [...section.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)];
    const targets = [...section.matchAll(/^### `([^`]+) \/ ([^`]+)`$/gm)];
    if (rows.length !== targets.length || rows.some((row) => row[1] !== surface || targets.filter((target) => target[1] === surface && target[2] === row[2]).length !== 1)) {
      throw new Error(`Operation coverage mismatch for ${surface}.`);
    }
    const examples = exampleBlocks(dashboard['8']).filter((example) => example.surface === surface);
    add(`${surface}-operations`, `${surface === 'dashboard' ? 'Dashboard' : 'Exploration'} operations`,
      'Read [dashboard-context.md](dashboard-context.md) first. Locate the joint surface/action/target row, then read its state paths and all cautions together. A legal combination does not establish that every control or model is instrumented. Examples below contain only lastOperation, not complete snapshots.',
      [section, '## Examples', ...examples.map((example) => example.text)].join('\n\n'),
      [docUse('dashboard', id, section), docUse('dashboard', '8', dashboard['8'], `route ${surface} examples without changing their operation objects`)]);
  }

  const exploreTypes = types('exploreTypes', ['ExploreTicket', 'ExploreQuery', 'ExploreState']);
  add('explore-query-inheritance', 'Exploration query and inheritance',
    'Read [dashboard-context.md](dashboard-context.md) first. Match the active report and session before reading exploration state. Query status has only submitted/running/succeeded/failed/unknown in this source; cancelRequestedAt does not add a canceled status. Current validation may remain unknown even after a successful request.',
    [dashboard['10'].slice(0, dashboard['10'].indexOf('### 10.1')), inheritance['10.1'], inheritance['10.2'], exploreTypes.text].join('\n\n'),
    [docUse('dashboard', '10', dashboard['10'], 'omit maintenance-only subsection 10.3 and development case identifier'), ...exploreTypes.uses]);
  add('dashboard-business-values', 'Dashboard business values',
    'Read only the relevant value family. Preserve original encodings, scalar types, nested groups, and model context. Decoding a value does not show that it participated in the displayed result. For that question read [explore-query-inheritance.md](explore-query-inheritance.md) or card request evidence in [dashboard-context.md](dashboard-context.md).',
    [dashboard['9'].slice(0, dashboard['9'].indexOf('### 9.1')), ...['9.1', '9.2', '9.3', '9.4', '9.5'].map((id) => values[id])].join('\n\n'),
    [docUse('dashboard', '9', dashboard['9'], 'omit source-code maintenance links in subsection 9.6 and development case identifier')]);

  const batchEnum = declaration(sources.batch, 'BatchOpTypeEnum', 'enum');
  const batchValues = [...batchEnum.matchAll(/^\s+(\w+) = '([^']+)', \/\/ (.+)$/gm)];
  if (batchValues.length !== batchEnum.split('\n').filter((line) => line.includes(' = ')).length) throw new Error('Unmapped batch operation enum member.');
  const enumTable = ['## Batch operation values', '', 'Read the actual value, not the TypeScript enum member. These describe the selected operation type; they do not prove execution.', '', '| Source member | Actual value | Business meaning |', '| --- | --- | --- |', ...batchValues.map(([, member, value, meaning]) => `| \`${member}\` | \`${value}\` | ${meaning} |`)].join('\n');
  const governanceTypes = types('governanceTypes', ['Mode', 'Detail', 'FilterValues', 'Focus', 'LastOperation', 'AssetGovernanceContext']);
  const governanceBody = removeLines(Object.values(governance).join('\n\n'), [
    /^- 同一用户操作的页面状态/, /^- 批量成功在同一 React/, /^- 新开页入口仅限/,
  ]).replace(/；selectedNodeIds 去重/g, '；selectedAssetIds 去重')
    .replace(/、不输出逐次操作日志/g, '')
    .replace(/资产行沿用公共 DOM 选区定位。/g, '');
  add('asset-governance', 'Asset governance context',
    'Use only for payload.version=1 and the verified TA source.page /data/assetGovernance, not its log or lineage pages. The page source has app/page/url/capturedAt and no componentId. Selection is independent. This context has no query payload, result body, total, or current-row ID list.',
    [governanceBody, enumTable, governanceTypes.text,
      '## Observation limits',
      'Automatic clearing of the selection and closing of the confirmation dialog retain the original confirm/execute intent; they do not create a new user select/cancel action. An empty current selection cannot recover the submitted selection or prove success.',
      'New-tab attribution covers observed valid link activations. Native context-menu opening and activity inside the new page are not observed.',
    ].join('\n\n'),
    [...Object.entries(governance).map(([id, content]) => docUse('governance', id, content, id === '2' ? 'replace React/console/DOM/event-handler mechanics with observation limits' : id === '1' ? 'use payload selectedAssetIds instead of the internal selectedNodeIds name in source prose' : 'retain business content')), sourceUse('batch', 'enum BatchOpTypeEnum', batchEnum, 'render every source enum member and its actual value'), ...governanceTypes.uses]);

  const logTypes = types('logTypes', ['LogQuery', 'LogOperation', 'AssetGovernanceLogContext']);
  add('asset-governance-log', 'Asset governance operation log context',
    'Use only for payload.version=1 and the verified TA source.page /data/assetGovernance/log. This is a history list, not a running batch operation. Resolve this exact route separately from /data/assetGovernance. Fields below belong to this business payload, not to selection or a shared governance schema.',
    [Object.values(log).join('\n\n').replace(/<!-- LOG_CONTEXT_OPERATION_DICTIONARY:(?:START|END) -->\n?/g, '')
      .replace(/没有定期强制提交的 maxWait。/g, '')
      .replace(/但保持独立计时器/g, '但记录与原查询相互独立'), logTypes.text].join('\n\n'),
    [...Object.entries(log).map(([id, content]) => docUse('log', id, content, id === '2' ? 'remove generated-region markers only' : id === '3' ? 'omit timer implementation while retaining independent query and observation timing' : 'retain business content')), ...logTypes.uses]);

  route('dashboard', dashboard, {
    0: ['references/dashboard-context.md'], 1: ['references/dashboard-context.md'], 2: ['references/dashboard-context.md'], 3: ['references/dashboard-context.md'], 4: ['references/dashboard-context.md'],
    5: ['references/dashboard-operations.md'], 6: ['references/explore-operations.md'], 7: ['references/dashboard-context.md'],
    8: ['references/dashboard-operations.md', 'references/explore-operations.md'], 9: ['references/dashboard-business-values.md'], 10: ['references/explore-query-inheritance.md'],
  }, { 0: 'navigation replaced by local routing', 8: 'examples routed by surface', 7: 'consumer projection', 9: 'consumer projection', 10: 'consumer projection' });
  route('governance', governance, Object.fromEntries(Object.keys(governance).map((id) => [id, ['references/asset-governance.md']])));
  route('log', log, Object.fromEntries(Object.keys(log).map((id) => [id, ['references/asset-governance-log.md']])));
  files['source-map.json'] = `${JSON.stringify({
    format_version: 1, source_repository: 'ta-multiverse', source_commit: SOURCE_COMMIT,
    generator: 'scripts/generate-page-context-references.mjs',
    maintenance: 'Generate from committed source with --source <local-repository> --patch; apply the patch, then run --check. No source working-tree reads, network access, or runtime source lookup.',
    sources: Object.entries(SOURCE_PATHS).map(([key, sourcePath]) => ({ path: sourcePath, sha256: sha256(sources[key]), generation: key === 'dashboard' || key === 'governance' ? 'entire document generated upstream' : key === 'log' ? 'operation table generated upstream; surrounding consumer prose maintained manually' : 'committed TypeScript source' })),
    coverage, references,
  }, null, 2)}\n`;
  return files;
}

export function checkBundle(files, packageRoot = PACKAGE_ROOT) {
  const mismatches = [];
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(packageRoot, name);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) mismatches.push(name);
  }
  const referenceRoot = path.join(packageRoot, 'references');
  if (fs.existsSync(referenceRoot)) {
    for (const name of fs.readdirSync(referenceRoot)) {
      if (name.endsWith('.md') && !Object.hasOwn(files, `references/${name}`)) mismatches.push(`references/${name} (unmapped)`);
    }
  }
  if (mismatches.length) throw new Error(`Generated references are stale or missing: ${mismatches.join(', ')}`);
}

export function bundlePatch(files, packageRoot = PACKAGE_ROOT) {
  const lines = ['*** Begin Patch'];
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(packageRoot, name);
    if (fs.existsSync(target)) {
      const old = fs.readFileSync(target, 'utf8');
      if (old === content) continue;
      lines.push(`*** Update File: ${target}`, '@@', ...old.trimEnd().split('\n').map((line) => `-${line}`), ...content.trimEnd().split('\n').map((line) => `+${line}`));
    } else lines.push(`*** Add File: ${target}`, ...content.trimEnd().split('\n').map((line) => `+${line}`));
  }
  lines.push('*** End Patch');
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const sourceIndex = args.indexOf('--source');
    const mode = args.includes('--patch') ? '--patch' : '--check';
    if (sourceIndex < 0 || !args[sourceIndex + 1] || args.some((arg, i) => i !== sourceIndex + 1 && !['--source', '--patch', '--check'].includes(arg)) || (args.includes('--patch') && args.includes('--check'))) {
      throw new Error('Usage: node scripts/generate-page-context-references.mjs --source <local-repository> [--check | --patch]');
    }
    const files = generateBundle(readCommittedSources(args[sourceIndex + 1]));
    if (mode === '--patch') process.stdout.write(bundlePatch(files));
    else { checkBundle(files); process.stdout.write(`Verified ${Object.keys(files).length} generated files at source ${SOURCE_COMMIT}.\n`); }
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
