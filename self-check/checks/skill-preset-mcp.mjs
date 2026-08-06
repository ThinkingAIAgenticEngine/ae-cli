/**
 * Release gate: product execution Skills must not route to AE preset MCPs.
 *
 * MCP resource administration remains a supported ae-agent capability. Other
 * explicit exceptions cover transport flags and source-description metadata;
 * they do not permit execution fallback from a domain Skill.
 */

import fs from 'node:fs';
import path from 'node:path';

const allowedPathPatterns = [
  /^skills\/ae-agent(?:\/|$)/u,
];

const allowedLinePatterns = [
  /--mcp-url\b/iu,
  /^\s*source:\s*["']Feishu MCP["']\s*$/iu,
  /\b(?:do not|does not|never|not|without|instead of|no longer)\b.{0,120}\bMCP\b/iu,
];

const prohibitedPatterns = [
  {
    label: 'AE preset MCP identifier',
    pattern: /\b(?:te-mcp(?:-[a-z0-9_-]+)?|thinkingengine-mcp|system-mcp-[a-z0-9_-]+|te-engage-mcp(?:-[a-z0-9_-]+)?|community-mcp(?:-[a-z0-9_-]+)?|apollo-mcp)\b/iu,
  },
  {
    label: 'MCP tool chain',
    pattern: /\bMCP\s+tool\s+chains?\b/iu,
  },
  {
    label: 'MCP fallback',
    pattern: /\b(?:fall\s+back|fallback|switch|route)\b.{0,120}\bMCP\b/iu,
  },
  {
    label: 'direct MCP execution',
    pattern: /\b(?:use|call|invoke|discover|access|rely\s+on)\b.{0,80}\bMCP\s+(?:tools?|servers?|services?)\b/iu,
  },
  {
    label: 'direct MCP execution',
    pattern: /\b(?:via|through)\s+MCP\b/iu,
  },
  {
    label: 'direct MCP execution',
    pattern: /(?:\u4f7f\u7528|\u8c03\u7528|\u53d1\u73b0|\u8bbf\u95ee|\u4f9d\u8d56|\u56de\u9000).{0,40}MCP|MCP.{0,40}(?:\u8c03\u7528|\u5de5\u5177\u94fe|\u56de\u9000)/iu,
  },
];

function skillFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return skillFiles(target);
    return entry.isFile() && /\.(?:md|ya?ml)$/iu.test(entry.name) ? [target] : [];
  });
}

export function checkSkillPresetMcp(root) {
  const findings = [];
  const skillsRoot = path.join(root, 'skills');

  for (const file of skillFiles(skillsRoot)) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (allowedPathPatterns.some((pattern) => pattern.test(relative))) continue;

    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const { label, pattern } of prohibitedPatterns) {
        const match = line.match(pattern);
        if (!match) continue;

        const isPresetIdentifier = label === 'AE preset MCP identifier';
        if (!isPresetIdentifier && allowedLinePatterns.some((allowed) => allowed.test(line))) {
          continue;
        }

        findings.push({
          level: 'P1',
          msg: `${relative}:${index + 1} contains ${label}: "${match[0]}"`,
        });
      }
    });
  }

  return { ok: findings.length === 0, findings };
}

export async function run({ root }) {
  return checkSkillPresetMcp(root);
}
