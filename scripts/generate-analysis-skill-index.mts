import fs from 'node:fs';
import path from 'node:path';
import type { Command, Flag } from '../src/framework/types.js';
import { baseCommands as analysisCommands } from '../src/commands/te-analysis/index.js';

const root = process.cwd();
const referencesDir = path.join(root, 'skills/ae-analysis/references');
const outputPath = path.join(referencesDir, 'command_index.md');
const checkOnly = process.argv.includes('--check');

const sharedReferences = new Set([
  'ai_models.md',
  'analysis_data_retrieval.md',
  'analysis_drilldown_contract.md',
  'analysis_gateway_assets.md',
  'analysis_interpretation.md',
  'audience_models.md',
  'command_index.md',
  'folder_create.md',
  'folder_delete.md',
  'folder_share.md',
  'project_space_create.md',
  'project_space_delete.md',
  'project_space_share.md',
  'user_cluster_models.md',
  'user_tag_models.md',
]);

const commands = deduplicate(analysisCommands)
  .sort((left, right) => commandPath(left).localeCompare(commandPath(right)));

const expectedCommandReferences = new Set(commands.map(referenceName));
const missingReferences = [...expectedCommandReferences]
  .filter((name) => !fs.existsSync(path.join(referencesDir, name)))
  .sort();
const actualReferences = fs.readdirSync(referencesDir)
  .filter((name) => name.endsWith('.md'));
const orphanReferences = actualReferences
  .filter((name) => !expectedCommandReferences.has(name) && !sharedReferences.has(name))
  .sort();

if (missingReferences.length > 0 || orphanReferences.length > 0) {
  const details = [
    missingReferences.length > 0 ? `missing command references: ${missingReferences.join(', ')}` : '',
    orphanReferences.length > 0 ? `orphan command references: ${orphanReferences.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  throw new Error(details);
}

const referenceContractErrors: string[] = [];
const forbiddenReferencePhrases = [
  'Do not use this command for unrelated analysis queries',
  'Output is the gateway envelope. `data` contains the common-service capability result.',
];
for (const command of commands) {
  const name = referenceName(command);
  const content = fs.readFileSync(path.join(referencesDir, name), 'utf8');
  const cliPath = commandPath(command);
  if (!content.includes(cliPath)) {
    referenceContractErrors.push(`${name}: missing canonical command path ${cliPath}`);
  }
  for (const flag of command.flags.filter((item) => item.required)) {
    if (!content.includes(`--${flag.name}`)) {
      referenceContractErrors.push(`${name}: missing required flag --${flag.name}`);
    }
  }
  if (command.flags.some((flag) => flag.name === 'payload' && flag.required)
      && content.includes("--payload '{}'")) {
    referenceContractErrors.push(`${name}: required payload example must not be an empty object`);
  }
  for (const phrase of forbiddenReferencePhrases) {
    if (content.includes(phrase)) {
      referenceContractErrors.push(`${name}: replace generic reference text with command-specific guidance`);
    }
  }
  const normalized = content.toLowerCase();
  if (!/(do not|don't use|not use|only when|instead of)/.test(normalized)) {
    referenceContractErrors.push(`${name}: missing command-specific non-use guidance`);
  }
  if (!/(output|return|response|result)/.test(normalized)) {
    referenceContractErrors.push(`${name}: missing output interpretation`);
  }
}
if (referenceContractErrors.length > 0) {
  throw new Error(`invalid command references:\n${referenceContractErrors.join('\n')}`);
}

const content = render(commands);
if (checkOnly) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== content) {
    throw new Error('skills/ae-analysis/references/command_index.md is stale; run npm run generate:analysis-skill');
  }
  process.stdout.write(`analysis skill index verified (${commands.length} registered commands)\n`);
} else {
  fs.writeFileSync(outputPath, content);
  process.stdout.write(`generated ${path.relative(root, outputPath)} (${commands.length} registered commands)\n`);
}

function deduplicate(items: Command[]): Command[] {
  const bySignature = new Map<string, Command>();
  for (const item of items) bySignature.set(signature(item), item);
  return [...bySignature.values()];
}

function signature(command: Command): string {
  return `${command.service}\0${command.resource ?? ''}\0${command.command}`;
}

function commandPath(command: Command): string {
  return ['ae-cli', command.service, command.resource, command.command].filter(Boolean).join(' ');
}

function referenceName(command: Command): string {
  if (command.resource) {
    return `${command.resource}_${command.command}`.replaceAll('-', '_').replaceAll(/\s+/g, '_') + '.md';
  }
  return `${command.command.replace(/^\+/, '').replaceAll('-', '_')}.md`;
}

function commandContract(command: Command): string {
  if (command.capabilityId) return command.capabilityId;
  if (command.resource && !command.command.startsWith('+')) return 'gateway lifecycle';
  return 'legacy/MCP';
}

function renderFlag(flag: Flag): string {
  const constraints = [
    flag.required ? 'required' : 'optional',
    flag.default !== undefined ? `default=${JSON.stringify(flag.default)}` : '',
    flag.min !== undefined ? `min=${flag.min}` : '',
    flag.max !== undefined ? `max=${flag.max}` : '',
    flag.minLength !== undefined ? `minLength=${flag.minLength}` : '',
    flag.maxLength !== undefined ? `maxLength=${flag.maxLength}` : '',
    flag.pattern !== undefined ? `pattern=${flag.pattern}` : '',
  ].filter(Boolean).join(', ');
  return `\`--${flag.name}\` (${escapeCell(flag.type)}; ${constraints}) — ${escapeCell(flag.desc)}`;
}

function escapeCell(value: unknown): string {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function render(items: Command[]): string {
  const lines = [
    '# Analysis command index',
    '',
    '<!-- Generated by scripts/generate-analysis-skill-index.mts. Do not edit manually. -->',
    '',
    'This is the exhaustive command and flag inventory for the analysis skill. Read the linked command reference for routing, semantic input contracts, output interpretation, and cases where the command must not be used.',
    '',
    '| Command | Capability ID | Risk | Flags | Reference |',
    '|---|---|---|---|---|',
  ];

  for (const command of items) {
    const reference = referenceName(command);
    lines.push([
      `| \`${escapeCell(commandPath(command))}\``,
      escapeCell(commandContract(command)),
      command.risk,
      command.flags.length > 0 ? command.flags.map(renderFlag).join('<br>') : 'None',
      `[${reference}](${reference}) |`,
    ].join(' | '));
  }
  lines.push('');
  return lines.join('\n');
}
