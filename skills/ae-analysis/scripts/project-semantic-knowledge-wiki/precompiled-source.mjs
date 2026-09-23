import { createHash } from 'node:crypto';

// Raw evidence stays in the local review package. Source prose remains editable by KB.
export function precompiledSource(content) {
  const summary = [...content.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .find((value) => value?.summary_kind === 'cli_agent_sql_report_semantic_source' && value.evidence_locator && Array.isArray(value.output_fields));
  content = content.replace(/(## \u539f\u59cb\u7d22\u5f15\u8bb0\u5f55)\n[\s\S]*?(?=\n## |$)/g, '$1\n\nOriginal index retained in the local evidence package.\n');
  return content.replace(/```json\s*\n([\s\S]*?)\n```/g, (_, raw) => {
    const value = JSON.parse(raw);
    if (summary && (value?.sql_semantic_facts || value?.sql)) {
      return `SQL analysis is precompiled in the Agent semantic summary above.\n\n- Evidence locator: ${summary.evidence_locator}\n- Evidence SHA-256: ${createHash('sha256').update(raw).digest('hex')}\n- Raw evidence: retained in the local review package.\n`;
    }
    // The authored summary is already rendered as prose directly above its JSON copy.
    if (summary && value?.summary_kind === 'cli_agent_sql_report_semantic_source') {
      return `Evidence locator: ${summary.evidence_locator}`;
    }
    return renderFacts(value);
  });
}

function renderFacts(value, depth = 0) {
  if (value === null || typeof value !== 'object') return String(value ?? 'unknown').replace(/\n/g, '\n' + '  '.repeat(depth));
  return Object.entries(value).map(([key, child]) => {
    const nested = child !== null && typeof child === 'object';
    return `${'  '.repeat(depth)}- ${key}: ${nested ? '\n' + renderFacts(child, depth + 1) : renderFacts(child, depth)}`;
  }).join('\n');
}

export function normalizeSourceForHash(content) {
  const volatileTimeKeys = '(?:created_at|updated_at|modified_at|deleted_at|generated_at|authenticated_at|create_time|update_time|modified_time|created_time|last_modified_at|last_modified_time|gmt_create|gmt_modified|ctime|mtime|snapshot_date|createdAt|updatedAt|modifiedAt|deletedAt|generatedAt|authenticatedAt|createTime|updateTime|modifiedTime|createdTime|lastModifiedAt|lastModifiedTime)';
  return content
    .replace(/source_snapshot_hash:\s*[^\r\n]+/g, 'source_snapshot_hash: <snapshot>')
    .replace(/snapshot_hash:\s*[^\r\n]+/g, 'snapshot_hash: <snapshot>')
    .replace(/semantic_plan_hash:\s*[^\r\n]+/g, 'semantic_plan_hash: <semantic_plan>')
    .replace(new RegExp(`^(${volatileTimeKeys}):\\s*[^\\r\\n]+`, 'gmi'), '$1: <volatile_time>')
    .replace(/"source_snapshot_hash":\s*"[^"]+"/g, '"source_snapshot_hash":"<snapshot>"')
    .replace(/"snapshot_hash":\s*"[^"]+"/g, '"snapshot_hash":"<snapshot>"')
    .replace(/"snapshot_id":\s*"[^"]+"/g, '"snapshot_id":"<snapshot_id>"')
    .replace(/"semantic_plan_hash":\s*"[^"]+"/g, '"semantic_plan_hash":"<semantic_plan>"')
    .replace(new RegExp(`"(${volatileTimeKeys})":\\s*(?:"[^"]*"|null|-?\\d+(?:\\.\\d+)?)`, 'gi'), '"$1":"<volatile_time>"')
    .replace(/((?:创建|更新|修改|生成)时间):\s*[^\r\n]+/g, '$1: <volatile_time>')
    .replace(/((?:Created|Updated|Modified|Generated) at):\s*[^\r\n]+/gi, '$1: <volatile_time>')
    .replace(/Snapshot hash:\s*`[0-9a-f]{64}`/gi, 'Snapshot hash: `<snapshot>`')
    .replace(/Semantic plan hash:\s*`[0-9a-f]{64}`/gi, 'Semantic plan hash: `<semantic_plan>`')
    .replace(/## Snapshot [0-9a-f]{64}/gi, '## Snapshot <snapshot>')
    .replace(new RegExp(`^(\\s*-\\s+${volatileTimeKeys}):[^\\n]*`, 'gmi'), '$1: <volatile_time>')
    .replace(/^content_hash:[^\n]*$/gm, 'content_hash: <hash>');
}
