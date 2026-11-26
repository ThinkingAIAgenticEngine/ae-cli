/** Check that every distributed Skill has an explicit component owner. */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const COMPONENTS = new Set(['base', 'analysis', 'dataops', 'engage', 'agent', 'community']);
const REGISTRY = 'src/core/skill-businesses.json';

export function checkSkillBusinesses(root) {
  const findings = [];
  const add = (msg, file = REGISTRY) => findings.push({ level: 'P1', dim: 'D2', msg, file });
  let groups;
  try {
    groups = JSON.parse(fs.readFileSync(path.join(root, REGISTRY), 'utf8'));
  } catch (error) {
    add(`Cannot read Skill component registry: ${error.message}`);
    return { ok: false, findings };
  }
  if (!groups || typeof groups !== 'object' || Array.isArray(groups)) {
    add('Skill component registry must be an object of component arrays');
    return { ok: false, findings };
  }

  const mapped = new Map();
  for (const [component, names] of Object.entries(groups)) {
    if (!COMPONENTS.has(component)) {
      add(`Unknown Skill component '${component}'`);
      continue;
    }
    if (!Array.isArray(names)) {
      add(`Skill component '${component}' must contain an array of Skill names`);
      continue;
    }
    for (const name of names) {
      if (typeof name !== 'string' || !name || name.trim() !== name) {
        add(`Skill component '${component}' contains an invalid Skill name`);
        continue;
      }
      if (mapped.has(name)) {
        add(`Duplicate Skill '${name}' in components '${mapped.get(name)}' and '${component}'`);
      } else {
        mapped.set(name, component);
      }
    }
  }

  let parseDocument;
  try {
    ({ parseDocument } = require('yaml'));
  } catch (error) {
    add(`Cannot parse Skill identities: ${error.message}`);
    return { ok: false, findings };
  }
  const published = new Map();
  try {
    for (const skill of fs.readdirSync(path.join(root, 'skills'))) {
      const directory = path.join(root, 'skills', skill);
      if (!fs.statSync(directory).isDirectory()) continue;
      if (!fs.existsSync(path.join(directory, 'SKILL.md'))) continue;
      const relative = `skills/${skill}/SKILL.md`;
      try {
        const content = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
        const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
        if (!frontmatter) throw new Error('Missing YAML frontmatter');
        const parsed = parseDocument(frontmatter[1], { uniqueKeys: true });
        if (parsed.errors.length) throw new Error('Invalid YAML frontmatter');
        const name = parsed.toJS({ maxAliasCount: 100 })?.name;
        if (typeof name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(name)) {
          throw new Error('Invalid runtime Skill name');
        }
        if (published.has(name)) {
          add(`Duplicate distributed Skill '${name}' in ${published.get(name)} and ${relative}`, relative);
        }
        published.set(name, relative);
        if (!mapped.has(name)) add(`Skill '${name}' has no component mapping in ${REGISTRY}`, relative);
      } catch (error) {
        add(`Cannot read Skill identity in ${relative}: ${error.message}`, relative);
      }
    }
  } catch (error) {
    add(`Cannot inspect distributed Skills: ${error.message}`, 'skills');
  }
  return { ok: findings.length === 0, findings };
}

export async function run({ root }) {
  return checkSkillBusinesses(root);
}
