import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareCompileSchema } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/prepare-compile-schema.mjs';
import { invokeCompanyKbCli } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/company-kb.mjs';

const config = { name: 'Project KB', host: 'https://example.test', requestId: 'first-upload' };
const valid = { ok: true, data: { status: 'wiki_compiled', schemaStatus: 'generated', schemaValidation: { valid: true } } };
const pending = { ok: true, data: { status: 'schema_pending', schemaStatus: 'pending', schemaValidation: null } };
const bytes = Buffer.from('\uFEFF# Rules\r\nPreserve source authority and scoped business evidence.\r\n');
const temporary = () => fs.mkdtempSync(path.join(os.tmpdir(), 'schema-reuse-'));

test('CLI stderr business codes survive and standalone installed Skills keep PATH compatibility', () => {
  const failure = { ok: false, error: { code: 'KB_SCHEMA_IMPORT_SCHEMA_NOT_FOUND', message: 'Missing formal rules' } };
  const calls = [];
  const result = invokeCompanyKbCli(['kb', '+schema-download'], { localCli: '/nonexistent/standalone-skill/bin/ae-cli.js', spawn: (...args) => {
    calls.push(args);
    return { status: 1, stdout: '', stderr: '[ae-cli] progress\n' + JSON.stringify(failure, null, 2) + '\n' };
  } });
  assert.deepEqual(result, failure);
  assert.equal(calls[0][0], 'ae-cli');
  assert.deepEqual(calls[0][1], ['kb', '+schema-download']);
  const dir = temporary();
  try {
    const localCli = path.join(dir, 'ae-cli.js'); fs.writeFileSync(localCli, '');
    invokeCompanyKbCli(['kb', '+status'], { localCli, spawn: (...args) => {
      assert.equal(args[0], process.execPath);
      assert.deepEqual(args[1], [localCli, 'kb', '+status']);
      return { status: 0, stdout: JSON.stringify(valid), stderr: '' };
    } });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('valid formal rules are reused byte-for-byte without upload, generation, AI validation or compilation', async () => {
  const dir = temporary();
  try {
    const calls = [], output = path.join(dir, 'formal.md');
    const result = await prepareCompileSchema({ ...config, output }, async (flags) => {
      calls.push(flags);
      assert.equal(flags[flags.indexOf('--scope') + 1], 'company');
      if (flags[1] === '+status') return valid;
      fs.writeFileSync(flags[flags.indexOf('--output') + 1], bytes);
      return { ok: true, data: { output } };
    });
    assert.deepEqual(calls.map(flags => flags[1]), ['+status', '+schema-download']);
    assert.equal(result.compile_ready, true);
    assert.equal(result.schema_action, 'reuse');
    assert.equal(result.schema_hash, createHash('sha256').update(bytes).digest('hex'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('empty and populated new KBs with placeholders or missing rules produce a reviewable candidate only', async () => {
  for (const [missing, status] of [[false, 'empty'], [false, 'schema_pending'], [true, 'schema_pending']]) {
    const dir = temporary();
    try {
      const calls = [], output = path.join(dir, 'formal.md');
      const candidate = { id: 'candidate', revision: 1, canApply: true, task: null };
      const result = await prepareCompileSchema({ ...config, output }, async (flags) => {
        calls.push(flags);
        if (flags[1] === '+status') return { ...pending, data: { ...pending.data, status } };
        if (flags[1] === '+schema-download') {
          if (missing) return { ok: false, error: { code: 'KB_SCHEMA_IMPORT_SCHEMA_NOT_FOUND' } };
          fs.writeFileSync(output, '# Default placeholder');
          return { ok: true, data: { output } };
        }
        assert.equal(flags[flags.indexOf('--request-id') + 1], 'first-upload');
        assert.ok(fs.readFileSync(flags[flags.indexOf('--file') + 1], 'utf8').includes('预置版本：1.1'));
        return { ok: true, data: candidate };
      });
      assert.deepEqual(calls.map(flags => flags[1]), ['+status', '+schema-download', '+schema-import']);
      assert.equal(result.compile_ready, false);
      assert.equal(result.schema_action, 'review_import');
      assert.deepEqual(result.candidate, candidate);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('permission and transport failures never initialize or broaden scope', async () => {
  for (const code of ['FORBIDDEN', 'NOT_FOUND', 'FETCH_FAILED', 'EEXIST']) {
    const dir = temporary();
    try {
      const calls = [];
      await assert.rejects(prepareCompileSchema({ ...config, output: path.join(dir, 'formal.md') }, async (flags) => {
        calls.push(flags[1]);
        return flags[1] === '+status' ? valid : { ok: false, error: { code } };
      }), error => error.code === code);
      assert.deepEqual(calls, ['+status', '+schema-download']);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('busy, publication review and invalid rules stop without upload or overwrite', async () => {
  const dir = temporary();
  try {
    for (const status of ['schema_generating', 'wiki_compiling', 'wiki_recovering', 'wiki_review_required']) {
      let calls = 0;
      await assert.rejects(prepareCompileSchema({ ...config, output: path.join(dir, status) }, async () => {
        calls++; return { ok: true, data: { status } };
      }), /busy or requires publication review/);
      assert.equal(calls, 1);
    }
    await assert.rejects(prepareCompileSchema({ ...config, output: path.join(dir, 'empty-busy') }, async () => ({
      ok: true, data: { status: 'empty', schemaStatus: 'generating' },
    })), /busy or requires publication review/);
    const calls = [], output = path.join(dir, 'invalid.md');
    await assert.rejects(prepareCompileSchema({ ...config, output }, async (flags) => {
      calls.push(flags[1]);
      if (flags[1] === '+status') return { ok: true, data: { status: 'schema_pending', schemaStatus: 'generated', schemaValidation: { valid: false, reason: 'FILE_MISSING' } } };
      fs.writeFileSync(output, bytes); return { ok: true, data: {} };
    }), /invalid or their state is unknown/);
    assert.deepEqual(calls, ['+status', '+schema-download']);
    await assert.rejects(prepareCompileSchema({ ...config, output }, async () => { throw new Error('Must not call'); }), /Output already exists/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('corrupt formal bytes and an initialization failure are terminal', async () => {
  const dir = temporary();
  try {
    for (const [name, content] of [['utf8', Buffer.from([255])], ['short', Buffer.from('short')]]) {
      const calls = [], output = path.join(dir, name);
      await assert.rejects(prepareCompileSchema({ ...config, output }, async (flags) => {
        calls.push(flags[1]);
        if (flags[1] === '+status') return valid;
        fs.writeFileSync(output, content); return { ok: true, data: {} };
      }));
      assert.deepEqual(calls, ['+status', '+schema-download']);
    }
    const calls = [];
    await assert.rejects(prepareCompileSchema({ ...config, output: path.join(dir, 'missing') }, async (flags) => {
      calls.push(flags[1]);
      if (flags[1] === '+status') return pending;
      return { ok: false, error: { code: flags[1] === '+schema-download' ? 'SCHEMA_NOT_FOUND' : 'KB_SCHEMA_IMPORT_INVALID_REQUEST' } };
    }), error => error.code === 'KB_SCHEMA_IMPORT_INVALID_REQUEST');
    assert.deepEqual(calls, ['+status', '+schema-download', '+schema-import']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
