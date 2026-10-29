import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateChanges, candidateRead } from '../src/commands/te-kb/publication.js';
import type { RuntimeContext } from '../src/framework/types.js';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.js';
const host = 'https://candidate-preview.invalid';
function context(values: Record<string, unknown> = {}) {
  return {
    host: () => host,
    str: (name: string) => String(values[name] ?? ''),
    num: (name: string) => (values[name] === undefined ? 0 : Number(values[name])),
    optionalNum: (name: string) => (values[name] === undefined ? undefined : Number(values[name])),
    bool: () => false,
    json: (name: string) => values[name],
  } as RuntimeContext;
}
test('candidate changes dry-run validates fixed candidate selectors and bounded context', async () => {
  const ctx = context({
    name: 'Example',
    scope: 'company',
    candidate: 'candidate-1',
    'entry-id': 'source:one',
    file: 'docs/pay.md',
    context: 3,
  });
  candidateChanges.validate!(ctx);
  assert.deepEqual(await candidateChanges.dryRun!(ctx), {
    method: 'GET',
    url: host + '/agent/api/external/knowledge-bases/publication-candidates/candidate-1/changes',
    params: {
      name: 'Example',
      scope: 'company',
      entryId: 'source:one',
      file: 'docs/pay.md',
      context: 3,
    },
  });
  assert.equal(candidateChanges.risk, 'read');
  assert.throws(
    () => candidateChanges.validate!(context({ name: 'Example', candidate: '../wrong' })),
    /candidate/,
  );
  assert.throws(
    () => candidateChanges.validate!(context({ name: 'Example', candidate: 'one', file: 'other' })),
    /entry-id/,
  );
  for (const value of [-1, 2, 10, NaN])
    assert.throws(
      () =>
        candidateChanges.validate!(context({ name: 'Example', candidate: 'one', context: value })),
      /context/,
    );
});
test('candidate changes transport matches dry-run and preserves old candidate read', async () => {
  const fetch = globalThis.fetch;
  const seen: string[] = [];
  setCliTokenManual('test-candidate-token', host);
  try {
    globalThis.fetch = async (input) => {
      seen.push(String(input));
      return Response.json({
        candidateId: 'one',
        entries: [],
        summary: { added: 0, modified: 0, deleted: 0, unchanged: 3 },
      });
    };
    const result = await candidateChanges.execute(context({ name: 'Example', candidate: 'one' }));
    assert.equal((result as { candidateId: string }).candidateId, 'one');
    const request = new URL(seen.find((url) => url.includes('/changes'))!);
    assert.equal(request.searchParams.get('name'), 'Example');
    assert.equal(request.searchParams.has('entryId'), false);
    assert.equal(
      request.pathname,
      '/agent/api/external/knowledge-bases/publication-candidates/one/changes',
    );
    const old = await candidateRead.dryRun!(
      context({ name: 'Example', candidate: 'one', path: 'index.md' }),
    );
    assert.deepEqual(old.params, { name: 'Example', path: 'index.md' });
    assert.ok(old.url.endsWith('/one/files'));
    globalThis.fetch = async () =>
      Response.json({ error: 'Preview is forbidden', code: 'FORBIDDEN' }, { status: 403 });
    await assert.rejects(candidateChanges.execute(context({ name: 'Example', candidate: 'one' })));
  } finally {
    globalThis.fetch = fetch;
    clearCliToken(host);
  }
});

test('candidate changes pages and filters keep transport, dry-run and legacy calls compatible', async () => {
  const values = {
    name: 'Example',
    candidate: 'one',
    group: 'wiki',
    search: 'payment',
    change: 'modified',
    offset: 50,
    limit: 50,
  };
  const ctx = context(values);
  candidateChanges.validate!(ctx);
  const expected = {
    name: 'Example',
    group: 'wiki',
    search: 'payment',
    change: 'modified',
    offset: 50,
    limit: 50,
  };
  assert.deepEqual((await candidateChanges.dryRun!(ctx)).params, expected);
  const fetch = globalThis.fetch;
  setCliTokenManual('test-candidate-token', host);
  try {
    let actual: URL | undefined;
    globalThis.fetch = async (input) => {
      actual = new URL(String(input));
      return Response.json({
        candidateId: 'one',
        entries: [],
        groups: { wiki: 500, sources: 100, index: 1 },
        page: { total: 125, offset: 50, limit: 50 },
        summary: { added: 1, modified: 600, deleted: 0, unchanged: 10 },
      });
    };
    const result = (await candidateChanges.execute(ctx)) as { page: { total: number } };
    assert.equal(result.page.total, 125);
    for (const [key, value] of Object.entries(expected))
      assert.equal(actual!.searchParams.get(key), String(value));
  } finally {
    globalThis.fetch = fetch;
    clearCliToken(host);
  }
  for (const invalid of [
    { group: 'all' },
    { change: 'updated' },
    { limit: 201 },
    { limit: 0 },
    { offset: -1 },
    { offset: 1.5 },
    { 'file-limit': 201 },
    { 'file-offset': NaN },
  ])
    assert.throws(() =>
      candidateChanges.validate!(context({ name: 'Example', candidate: 'one', ...invalid })),
    );
  assert.deepEqual(
    (await candidateChanges.dryRun!(context({ name: 'Example', candidate: 'one' }))).params,
    { name: 'Example' },
  );
});

test('candidate member paging validates its entry and rejects older server capability gaps', async () => {
  const ctx = context({
    name: 'Example',
    candidate: 'one',
    'entry-id': 'source:one',
    'file-search': 'docs',
    'file-offset': 10,
    'file-limit': 10,
  });
  candidateChanges.validate!(ctx);
  assert.deepEqual((await candidateChanges.dryRun!(ctx)).params, {
    name: 'Example',
    entryId: 'source:one',
    fileSearch: 'docs',
    fileOffset: 10,
    fileLimit: 10,
  });
  assert.throws(
    () =>
      candidateChanges.validate!(
        context({ name: 'Example', candidate: 'one', 'file-search': 'docs' }),
      ),
    /entry-id/,
  );
  const fetch = globalThis.fetch;
  setCliTokenManual('test-candidate-token', host);
  try {
    globalThis.fetch = async () => Response.json({ candidateId: 'one', entries: [] });
    await assert.rejects(
      candidateChanges.execute(context({ name: 'Example', candidate: 'one', limit: 50 })),
      (error: unknown) => (error as { code: string }).code === 'KB_CANDIDATE_PAGING_UNSUPPORTED',
    );
    await assert.rejects(
      candidateChanges.execute(ctx),
      (error: unknown) => (error as { code: string }).code === 'KB_CANDIDATE_PAGING_UNSUPPORTED',
    );
    globalThis.fetch = async () =>
      Response.json({
        candidateId: 'one',
        files: [],
        filePage: { total: 1000, offset: 10, limit: 10 },
      });
    assert.equal(
      ((await candidateChanges.execute(ctx)) as { filePage: { total: number } }).filePage.total,
      1000,
    );
  } finally {
    globalThis.fetch = fetch;
    clearCliToken(host);
  }
});
