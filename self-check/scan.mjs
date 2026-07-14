#!/usr/bin/env node
/**
 * te-cli self-check scanner
 *
 * Multi-dimensional checks for "whether newly merged CLI features are sound". Pure Node (no new deps), idempotent.
 *
 * Usage:
 *   node self-check/scan.mjs                # full scan
 *   node self-check/scan.mjs --since master # focus on command modules added/changed relative to master
 *   node self-check/scan.mjs --json         # machine-readable output
 *
 * Exit codes: 0 = no P1/P2; 1 = P1 (blocking) issues found.
 *
 * Check dimensions (see SKILL.md):
 *   D1 command registration completeness  -- whether new domains are registered in src/index.ts; whether MCP domains have mapping registered
 *   D2 business domain <-> skill pairing  -- whether each business domain has a corresponding skill; tool commands should not
 *   D3 skill doc coverage                 -- command <-> references/*.md bidirectional diff (name normalization)
 *   D4 skill internal consistency         -- CRITICAL "+cmd->cmd.md" rule vs actual files; broken links
 *   D5 doc sync                           -- whether README covers all domains/commands; CHANGELOG/version
 *   D6 engineering robustness             -- verify script coverage; whether typecheck is wired up
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SINCE = (() => {
  const i = args.indexOf('--since');
  return i >= 0 ? args[i + 1] : null;
})();
const JSON_OUT = args.includes('--json');

// ---------- Config: business domain -> skill mapping ----------
// Multiple te-* command directories can map to the same skill (as with the analysis series).
const DOMAIN_TO_SKILL = {
  'te-analysis': 'ae-analysis',
  'te-meta': 'ae-analysis',
  'te-audience': 'ae-analysis',
  'te-common': 'ae-analysis',
  'te-engage': 'ae-engage',
  'te-dataops': 'ae-dataops',
  'te-community': 'ae-community',
  'te-kb': 'ae-kb',
  'te-team': 'ae-team',
  'te-agent': 'ae-agent',
};
// Tool command directories (should not have a skill; used for interactive/ops purposes).
const TOOL_DIRS = new Set(['sync', 'model']);
// Skills that use a "grouped/inline doc" strategy rather than per-command references: do not report per-command missing docs for these.
const GROUPED_DOC_SKILLS = new Set(['ae-dataops', 'ae-kb']);
const COMMAND_SKILL_OVERRIDES = [
  { pathPrefix: 'src/commands/te-analysis/global/', skill: 'ae-analysis-global' },
];

// ---------- Result collection ----------
const findings = []; // { level: 'P1'|'P2'|'P3'|'info', dim, msg }
function add(level, dim, msg) { findings.push({ level, dim, msg }); }

// ---------- Utility functions ----------
function read(p) { try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; } }
function exists(p) { return fs.existsSync(p); }
function listDir(p) { try { return fs.readdirSync(p); } catch { return []; } }
function walk(dir, out = []) {
  for (const e of listDir(dir)) {
    const fp = path.join(dir, e);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else out.push(fp);
  }
  return out;
}
// Name normalization: unify underscores/hyphens for cross-style comparison (engage underscore vs reference hyphen).
const norm = (s) => s.replace(/[_-]/g, '').toLowerCase();
function commandSkill(dir, command) {
  const rel = path.relative(ROOT, command.file).split(path.sep).join('/');
  const override = COMMAND_SKILL_OVERRIDES.find((item) => rel.startsWith(item.pathPrefix));
  return override ? override.skill : DOMAIN_TO_SKILL[dir];
}

// ---------- Scan command source ----------
// Returns { domainDir -> { commands: [{name, risk, file}], services: Set } }
function scanCommands() {
  const commandsRoot = path.join(ROOT, 'src/commands');
  const domains = {};
  for (const dir of listDir(commandsRoot)) {
    const dpath = path.join(commandsRoot, dir);
    if (!fs.statSync(dpath).isDirectory()) continue;
    const files = walk(dpath).filter((f) => f.endsWith('.ts'));
    const commands = [];
    const services = new Set();
    for (const f of files) {
      const c = read(f);
      const cmdMatches = [...c.matchAll(/command:\s*'\+([a-z0-9_-]+)'/g)];
      const svcMatches = [...c.matchAll(/service:\s*'([a-z0-9_]+)'/g)];
      for (const m of svcMatches) services.add(m[1]);
      for (const m of cmdMatches) {
        const riskMatch = c.match(/risk:\s*'(read|write)'/);
        commands.push({ name: m[1], risk: riskMatch ? riskMatch[1] : null, file: f });
      }
    }
    domains[dir] = { commands, services, files };
  }
  return domains;
}

// ---------- Find changed domains (--since mode) ----------
function changedDomains() {
  if (!SINCE) return null;
  let out = '';
  try {
    out = execSync(`git diff --name-only ${SINCE}...HEAD -- src/commands skills README.md README.zh.md`, {
      cwd: ROOT, encoding: 'utf-8',
    });
  } catch (e) {
    add('info', 'D0', `git diff --since ${SINCE} failed: ${e.message.split('\n')[0]} (falling back to full scan)`);
    return null;
  }
  const dirs = new Set();
  for (const line of out.split('\n')) {
    const m = line.match(/^src\/commands\/([^/]+)\//) || line.match(/^skills\/([^/]+)\//);
    if (m) dirs.add(m[1]);
  }
  return dirs;
}

// Collect all globally registered MCP mapping keys: built-in (mcp.ts) + per-domain registerMcpMapping(s).
function collectRegisteredMcpKeys() {
  const keys = new Set();
  const mcpCore = read(path.join(ROOT, 'src/core/mcp.ts'));
  // Built-in: registerMcpMapping('analysis', {...})
  for (const m of mcpCore.matchAll(/registerMcpMapping\(\s*'([a-z0-9_]+)'/g)) keys.add(m[1]);
  // All locations: registerMcpMapping('x' and registerMcpMappings({ 'x': { componentName ... } })
  for (const f of walk(path.join(ROOT, 'src'))) {
    if (!f.endsWith('.ts')) continue;
    const c = read(f);
    for (const m of c.matchAll(/registerMcpMapping\(\s*'([a-z0-9_]+)'/g)) keys.add(m[1]);
    // Each key inside a registerMcpMappings object (anchored by componentName)
    for (const m of c.matchAll(/'([a-z0-9_]+)'\s*:\s*\{\s*componentName/g)) keys.add(m[1]);
  }
  return keys;
}

// Statically extract the service names actually used for MCP routing from a domain's source (literals only; variable-passed args are not required).
function extractUsedMcpServices(info) {
  const used = new Set();
  for (const f of info.files) {
    const c = read(f);
    // createMcpCommand({ mcpService: 'X' }) explicit value
    for (const m of c.matchAll(/mcpService:\s*'([a-z0-9_]+)'/g)) used.add(m[1]);
    // shared.ts factory default: const mcpService = config.mcpService || 'X'
    for (const m of c.matchAll(/mcpService\s*\|\|\s*'([a-z0-9_]+)'/g)) used.add(m[1]);
    // resolveMcpUrl(ctx.mcpUrl(), host, 'X') direct literal
    for (const m of c.matchAll(/resolveMcpUrl\([^,]+,[^,]+,\s*'([a-z0-9_]+)'\s*\)/g)) used.add(m[1]);
  }
  return used;
}

// ====================================================================
// D1: Command registration completeness
// ====================================================================
function checkRegistration(domains) {
  const indexTs = read(path.join(ROOT, 'src/index.ts'));
  const registered = collectRegisteredMcpKeys();

  for (const [dir, info] of Object.entries(domains)) {
    if (info.commands.length === 0 && !TOOL_DIRS.has(dir)) continue;

    // 1a. Check whether index.ts imports this domain (domain index.js or tool command registration)
    const imported = indexTs.includes(`./commands/${dir}/index.js`) ||
                     indexTs.includes(`./commands/${dir}/`);
    if (!imported) {
      add('P1', 'D1', `domain '${dir}' is not registered in src/index.ts -- commands will not be loaded`);
    }

    // 1b. Check whether all MCP services (literals) actually used for routing in this domain have registered mappings.
    //     Note: uses the routing-layer service name (e.g. engage_config), not the commander group name (engage).
    //     Services passed as variables cannot be statically extracted; prefer false negatives over false positives.
    const used = extractUsedMcpServices(info);
    for (const svc of used) {
      if (!registered.has(svc)) {
        add('P1', 'D1', `MCP service '${svc}' (domain ${dir}) has no registered mapping -- buildMcpUrl will throw. Call registerMcpMappings in the domain's index.ts`);
      }
    }
  }
}

// ====================================================================
// D2: Business domain <-> skill pairing
// ====================================================================
function checkPairing(domains, focus) {
  const skillsRoot = path.join(ROOT, 'skills');
  for (const [dir, info] of Object.entries(domains)) {
    if (focus && !focus.has(dir)) continue;
    if (info.commands.length === 0) {
      if (TOOL_DIRS.has(dir)) add('info', 'D2', `tool command '${dir}' has no skill (expected by convention)`);
      continue;
    }
    const skill = DOMAIN_TO_SKILL[dir];
    if (!skill) {
      add('P2', 'D2', `business domain '${dir}' (${info.commands.length} commands) has no skill mapping configured -- confirm whether a corresponding skill is expected`);
      continue;
    }
    if (!exists(path.join(skillsRoot, skill, 'SKILL.md'))) {
      add('P1', 'D2', `skill '${skill}' referenced by business domain '${dir}' does not exist`);
    }
  }
}

// ====================================================================
// D3 + D4: Skill doc coverage & internal consistency
// ====================================================================
function checkSkills(domains, focus) {
  const skillsRoot = path.join(ROOT, 'skills');
  // Reverse aggregate: skill -> all commands covered by that skill
  const skillCmds = {};
  for (const [dir, info] of Object.entries(domains)) {
    for (const command of info.commands) {
      const skill = commandSkill(dir, command);
      if (!skill) continue;
      (skillCmds[skill] ||= []).push(command.name);
    }
  }

  for (const skill of listDir(skillsRoot)) {
    const sdir = path.join(skillsRoot, skill);
    if (!fs.statSync(sdir).isDirectory()) continue;
    const skillMd = read(path.join(sdir, 'SKILL.md'));
    if (!skillMd) { add('P2', 'D4', `skill '${skill}' is missing SKILL.md`); continue; }

    const refFiles = listDir(path.join(sdir, 'references')).filter((f) => f.endsWith('.md'));
    const refNames = refFiles.map((f) => f.replace(/\.md$/, ''));
    const cmds = skillCmds[skill] || [];

    // D3: command -> reference coverage (per-command doc skills only)
    // Use normalized matching to determine whether a corresponding doc exists (create-team.md can cover +create).
    // Naming style inconsistencies are not reported in D3; they are handled by D4's strict rule check to avoid duplicate warnings.
    if (!GROUPED_DOC_SKILLS.has(skill) && cmds.length > 0) {
      if (refNames.length === 0) {
        add('P3', 'D3', `skill '${skill}' has no references/ directory; ${cmds.length} command docs are all inline (inconsistent with per-command doc skill style)`);
      } else {
        const refSet = new Set(refNames.map(norm));
        // Only a true miss if no corresponding doc can be found even after normalization
        const missing = cmds.filter((c) => {
          const n = norm(c);
          return ![...refSet].some((r) => r === n || r.includes(n) || n.includes(r));
        });
        if (missing.length) {
          add('P2', 'D3', `skill '${skill}' is missing command docs: ${missing.map((c) => '+' + c).join(', ')}`);
        }
      }
    }

    // D4a: CRITICAL "filename = command name (strip +)" rule consistency
    const declaresExactRule = /reference filename equals the command name|references\/<command>\.md|references\/<tool_name>\.md/i.test(skillMd);
    if (declaresExactRule && refNames.length > 0) {
      const refExact = new Set(refNames); // no normalization; strictly by rule
      const violators = cmds.filter((c) => !refExact.has(c));
      if (violators.length) {
        add('P1', 'D4',
          `skill '${skill}' declares "+cmd -> references/<cmd>.md" at the top, but the following commands have no file under that rule: ` +
          violators.map((c) => `+${c}->${c}.md`).join(', ') +
          ` (actual filenames are inconsistent; the agent will read nothing and guess parameters)`);
      }
    }

    // D4b: Check whether all references/*.md links in SKILL.md point to real files
    const linked = [...skillMd.matchAll(/references\/([a-z0-9_-]+)\.md/gi)].map((m) => m[1]);
    const refOnDisk = new Set(refNames);
    const deadLinks = [...new Set(linked)].filter((l) => !refOnDisk.has(l));
    if (deadLinks.length) {
      add('P2', 'D4', `skill '${skill}' has broken doc links: ${deadLinks.map((l) => 'references/' + l + '.md').join(', ')}`);
    }

    // D4c: frontmatter required fields
    if (!/^---[\s\S]*?name:\s*\S+[\s\S]*?description:\s*\S+[\s\S]*?---/m.test(skillMd)) {
      add('P3', 'D4', `skill '${skill}' SKILL.md frontmatter is missing name/description`);
    }

    // D4d: description must be YAML-safe when it contains ": " (external skill hubs parse frontmatter as YAML)
    const fm = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm) {
      for (const line of fm[1].split(/\r?\n/)) {
        const dm = line.match(/^description:\s*(.*)$/);
        if (!dm) continue;
        const val = dm[1];
        const quoted =
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'")) ||
          val === '>' ||
          val === '|';
        if (!quoted && /:\s/.test(val)) {
          add(
            'P1',
            'D4',
            `skill '${skill}' SKILL.md description is unquoted but contains ": " — external YAML parsers will fail (quote the description)`,
          );
        }
      }
    }
  }
}

// ====================================================================
// D5: Doc sync (README / CHANGELOG / version)
// ====================================================================
function checkDocs(domains) {
  const readme = read(path.join(ROOT, 'README.md'));
  const readmeZh = read(path.join(ROOT, 'README.zh.md'));

  for (const [dir, info] of Object.entries(domains)) {
    if (info.commands.length === 0) continue;
    // Look up service name in the README command table
    for (const svc of info.services) {
      const inEn = readme.includes(svc);
      const inZh = readmeZh.includes(svc);
      if (!inEn && !inZh) {
        add('P2', 'D5', `service '${svc}' (domain ${dir}) does not appear in either README -- user docs are out of date`);
      }
    }
  }

  // Version consistency
  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')) || '{}');
  const changelog = read(path.join(ROOT, 'CHANGELOG.md'));
  if (pkg.version && changelog && !changelog.includes(pkg.version)) {
    add('P3', 'D5', `package.json version ${pkg.version} does not appear in CHANGELOG.md`);
  }
}

// ====================================================================
// D6: Engineering robustness (verify script coverage / typecheck)
// ====================================================================
function checkEngineering(domains) {
  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')) || '{}');
  const scripts = pkg.scripts || {};
  const verifyTargets = Object.keys(scripts).filter((k) => k.startsWith('verify:')).join(' ');

  // Which domains have verify coverage (coarse-grained: script name or script content mentions domain keyword)
  const scriptsDir = path.join(ROOT, 'scripts');
  const scriptBlob = walk(scriptsDir).map(read).join('\n');
  for (const [dir, info] of Object.entries(domains)) {
    if (info.commands.length === 0) continue;
    const key = dir.replace(/^te-/, '');
    const covered = scriptBlob.includes(`te-${key}`) || verifyTargets.includes(key);
    if (!covered) {
      add('P3', 'D6', `domain '${dir}' (${info.commands.length} commands) has no corresponding verify script`);
    }
  }

  if (!Object.values(scripts).some((s) => /tsc\s+--noEmit|tsc -p|typecheck/.test(s))) {
    add('P3', 'D6', `package.json has no typecheck step (tsc --noEmit) -- type errors will only surface at build time`);
  }
}

// ====================================================================
// Main flow
// ====================================================================
const domains = scanCommands();
const focus = changedDomains();

checkRegistration(domains);
checkPairing(domains, focus);
checkSkills(domains, focus);
checkDocs(domains);
checkEngineering(domains);

// ---------- Output ----------
const order = { P1: 0, P2: 1, P3: 2, info: 3 };
findings.sort((a, b) => (order[a.level] - order[b.level]) || a.dim.localeCompare(b.dim));

if (JSON_OUT) {
  console.log(JSON.stringify({ since: SINCE, focus: focus ? [...focus] : null, findings }, null, 2));
} else {
  const icon = { P1: '🔴', P2: '🟡', P3: '🟢', info: 'ℹ️ ' };
  const dimName = {
    D0: 'scan', D1: 'command registration', D2: 'domain<->skill pairing', D3: 'skill doc coverage',
    D4: 'skill consistency', D5: 'doc sync', D6: 'engineering robustness',
  };
  console.log(`\n  te-cli self-check  ${SINCE ? `(--since ${SINCE}, focus: ${[...focus].join(',') || 'no changed command domains'})` : '(full scan)'}\n`);
  const counts = { P1: 0, P2: 0, P3: 0, info: 0 };
  for (const f of findings) counts[f.level]++;
  if (findings.length === 0) {
    console.log('  ✅ No issues found\n');
  } else {
    for (const f of findings) {
      console.log(`  ${icon[f.level]} [${f.level}] ${f.dim} ${dimName[f.dim] || ''}: ${f.msg}`);
    }
    console.log(`\n  Summary: 🔴 P1=${counts.P1}  🟡 P2=${counts.P2}  🟢 P3=${counts.P3}  ℹ️ info=${counts.info}\n`);
  }
}

process.exit(findings.some((f) => f.level === 'P1') ? 1 : 0);
