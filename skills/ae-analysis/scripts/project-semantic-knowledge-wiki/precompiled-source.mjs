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
  return normalizeBulletSectionOrder(
    normalizeBulletSectionOrder(
      normalizeSemanticConflictCandidateOrder(normalizeRefreshStatePayload(content)),
      '语义冲突',
    ),
    '缺少源标题的元数据',
  )
    .replace(/^\s*[-*]\s+semantic_plan_hash:\s*[^\r\n]*\r?\n?/gmi, '')
    .replace(/source_snapshot_hash:\s*[^\r\n]+/g, 'source_snapshot_hash: <snapshot>')
    .replace(/snapshot_hash:\s*[^\r\n]+/g, 'snapshot_hash: <snapshot>')
    .replace(/semantic_plan_hash:\s*[^\r\n]+/g, 'semantic_plan_hash: <semantic_plan>')
    .replace(new RegExp(`^(${volatileTimeKeys}):\\s*[^\\r\\n]+`, 'gmi'), '$1: <volatile_time>')
    .replace(/"source_snapshot_hash":\s*"[^"]+"/g, '"source_snapshot_hash":"<snapshot>"')
    .replace(/"snapshot_hash":\s*"[^"]+"/g, '"snapshot_hash":"<snapshot>"')
    .replace(/"snapshot_id":\s*"[^"]+"/g, '"snapshot_id":"<snapshot_id>"')
    .replace(/,?\s*"semantic_plan_hash":\s*"[^"]+"/g, '')
    .replace(new RegExp(`"(${volatileTimeKeys})":\\s*(?:"[^"]*"|null|-?\\d+(?:\\.\\d+)?)`, 'gi'), '"$1":"<volatile_time>"')
    .replace(/((?:创建|更新|修改|生成)时间):\s*[^\r\n]+/g, '$1: <volatile_time>')
    .replace(/((?:Created|Updated|Modified|Generated) at):\s*[^\r\n]+/gi, '$1: <volatile_time>')
    .replace(/快照:\s*`[0-9a-f]{64}`/gi, '快照: `<snapshot>`')
    .replace(/Snapshot hash:\s*`[0-9a-f]{64}`/gi, 'Snapshot hash: `<snapshot>`')
    .replace(/Semantic plan hash:\s*`[0-9a-f]{64}`/gi, 'Semantic plan hash: `<semantic_plan>`')
    .replace(/## Snapshot [0-9a-f]{64}/gi, '## Snapshot <snapshot>')
    .replace(new RegExp(`^(\\s*-\\s+${volatileTimeKeys}):[^\\n]*`, 'gmi'), '$1: <volatile_time>')
    .replace(/^content_hash:[^\n]*$/gm, 'content_hash: <hash>');
}

function normalizeRefreshStatePayload(content) {
  return String(content).replace(/<!-- pskb_refresh_state_base64\n([A-Za-z0-9_=\-\s]+)\n-->/g, (match, encoded) => {
    try {
      const payload = JSON.parse(Buffer.from(encoded.replace(/\s+/g, ''), 'base64url').toString('utf8'));
      delete payload.source_tree_baseline;
      return `<!-- pskb_refresh_state_json\n${stableJson(payload)}\n-->`;
    } catch {
      return match;
    }
  });
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right, 'en'));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}

function normalizeSemanticConflictCandidateOrder(content) {
  return content.replace(/(语义“[^”]+”存在 \d+ 个[^，\r\n]+候选，但口径不同：)([^\r\n]*?)(。Agent 不应仅凭名称选择，需要优先使用业务域\/召回卡或让用户确认。)/g,
    (_, prefix, candidates, suffix) => `${prefix}${candidates.split('；').sort((left, right) => left.localeCompare(right, 'zh-Hans-CN')).join('；')}${suffix}`);
}

function normalizeBulletSectionOrder(content, heading) {
  return content.replace(new RegExp(`(## ${escapeRegExp(heading)}\\r?\\n\\r?\\n)([\\s\\S]*?)(?=\\r?\\n## |$)`, 'g'), (match, prefix, body) => {
    const lines = body.split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length || !lines.every((line) => line.startsWith('- '))) return match;
    return `${prefix}${lines.sort((left, right) => left.localeCompare(right, 'zh-Hans-CN')).join('\n')}\n`;
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
