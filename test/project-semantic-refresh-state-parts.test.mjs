import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { encodeRefreshState, decodeRefreshState, readRefreshStateIndex } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/refresh-state-parts.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('large refresh state is split into bounded, verified files with legacy read support', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pskb-refresh-state-'));
  try {
    const file = path.join(root, 'pskb-p196-refresh-state.md');
    const payload = { schema_version: '1.0', semantic_plan: Array.from({ length: 1800 }, (_, i) => ({
      id: i, text: sha256(`item-${i}`).repeat(3),
    })), source_tree_baseline: { source_tree_manifest: { sources: [] } } };
    const legacy = `# Refresh State\n\n<!-- pskb_refresh_state_base64\n${Buffer.from(JSON.stringify(payload)).toString('base64url')}\n-->\n`;
    assert.deepEqual(decodeRefreshState(legacy, file).payload, payload);
    const encoded = encodeRefreshState(legacy, 'sources/project/pskb-p196-refresh-state.md', sha256(legacy));
    fs.writeFileSync(file, encoded.indexContent);
    assert.ok(encoded.parts.length > 1);
    assert.ok(Buffer.byteLength(encoded.indexContent) <= 16 * 1024);
    for (const part of encoded.parts) {
      fs.writeFileSync(path.join(root, path.basename(part.path)), part.content);
      assert.ok(part.bytes <= 16 * 1024);
    }
    assert.equal(readRefreshStateIndex(encoded.indexContent).parts.length, encoded.parts.length);
    assert.deepEqual(decodeRefreshState(encoded.indexContent, file).payload, payload);
    const first = path.join(root, encoded.parts[0].file);
    fs.appendFileSync(first, 'tampered');
    assert.throws(() => decodeRefreshState(encoded.indexContent, file), /checksum mismatch/);
    fs.rmSync(first);
    assert.throws(() => decodeRefreshState(encoded.indexContent, file), /ENOENT/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
