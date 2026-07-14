#!/usr/bin/env node
/**
 * Migrate risk levels to lark-cli 3-tier model: read | write | high-risk-write.
 * Only delete/remove operations become high-risk-write.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UBA_ROOT = path.resolve(ROOT, '..');

function walkFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, pattern, results);
    else if (pattern.test(entry.name)) results.push(full);
  }
  return results;
}

function classifyIdentifier(name) {
  const u = name.toUpperCase();
  if (/DELETE|REMOVE|DEL_|_DEL\b|RM_|\+DEL|\+DELETE|\+REMOVE|-DELETE|-REMOVE|-DEL\b/.test(u)) {
    return 'high-risk-write';
  }
  return 'write';
}

function classifyFromCommandBlock(block, filePath) {
  const commandMatch = block.match(/command:\s*['"]([^'"]+)['"]/);
  const exportMatch = block.match(/export const (\w+)/);
  const command = commandMatch?.[1] ?? exportMatch?.[1] ?? '';
  const hint = `${command} ${path.basename(filePath)}`;
  return classifyIdentifier(hint.replace(/[^A-Za-z0-9_+-]/g, '_'));
}

function migrateJavaFile(filePath, dryRun) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!/"create"|"update"|"delete"/.test(content)) return 0;

  const lines = content.split('\n');
  let currentEnum = '';
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const enumMatch = lines[i].match(/^\s*([A-Z][A-Z0-9_]*)\(/);
    if (enumMatch) currentEnum = enumMatch[1];

    if (/"create"|"update"|"delete"/.test(lines[i])) {
      const risk = classifyIdentifier(currentEnum);
      const next = lines[i]
        .replace('"create"', `"${risk}"`)
        .replace('"update"', `"${risk}"`)
        .replace('"delete"', `"${risk}"`);
      if (next !== lines[i]) {
        changes++;
        if (!dryRun) lines[i] = next;
        console.log(`  ${path.basename(filePath)}:${i + 1} ${currentEnum} -> ${risk}`);
      }
    }
  }

  if (changes && !dryRun) fs.writeFileSync(filePath, lines.join('\n'));
  return changes;
}

function migrateJavaQueryCatalog(filePath, dryRun) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('return "delete"')) return 0;
  const next = content.replace('return "delete";', 'return "write";');
  if (!dryRun) fs.writeFileSync(filePath, next);
  console.log(`  QueryCapabilityCatalog QUERY_CANCEL -> write`);
  return 1;
}

function migrateTsFile(filePath, dryRun) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!/"create"|"update"|"delete"|'create'|'update'|'delete'/.test(content)) return 0;

  const parts = content.split(/(?=export const \w+: Command = \{)/);
  let changes = 0;
  const out = [];

  for (const part of parts) {
    if (!/"create"|"update"|"delete"|'create'|'update'|'delete'/.test(part)) {
      out.push(part);
      continue;
    }

    const risk = classifyFromCommandBlock(part, filePath);
    const next = part
      .replace(/risk: 'create'/g, `risk: '${risk}'`)
      .replace(/risk: 'update'/g, `risk: '${risk}'`)
      .replace(/risk: 'delete'/g, `risk: '${risk}'`)
      .replace(/risk: "create"/g, `risk: "${risk}"`)
      .replace(/risk: "update"/g, `risk: "${risk}"`)
      .replace(/risk: "delete"/g, `risk: "${risk}"`);
    if (next !== part) {
      const count = (part.match(/risk: ['"](?:create|update|delete)['"]/g) ?? []).length;
      changes += count;
      const cmd = part.match(/command:\s*['"]([^'"]+)['"]/)?.[1] ?? path.basename(filePath);
      console.log(`  ${path.relative(ROOT, filePath)} ${cmd} -> ${risk}`);
    }
    out.push(next);
  }

  const merged = out.join('');
  if (changes && !dryRun) fs.writeFileSync(filePath, merged);
  return changes;
}

const dryRun = process.argv.includes('--dry-run');
let total = 0;

console.log('\n=== Java CapabilityDefinition ===');
for (const f of walkFiles(
  path.join(UBA_ROOT, 'ta-common-service/ta-cli/src/main/java'),
  /CapabilityDefinition\.java$/,
)) {
  total += migrateJavaFile(f, dryRun);
}

const queryCatalog = path.join(
  UBA_ROOT,
  'ta-common-service/ta-cli/src/main/java/cn/thinkingdata/ta/event/cli/support/query/config/QueryCapabilityCatalog.java',
);
if (fs.existsSync(queryCatalog)) total += migrateJavaQueryCatalog(queryCatalog, dryRun);

console.log('\n=== te-cli commands ===');
for (const f of walkFiles(path.join(ROOT, 'src/commands'), /\.ts$/)) {
  total += migrateTsFile(f, dryRun);
}

console.log(`\n${dryRun ? '[dry-run] ' : ''}Total replacements: ${total}`);
