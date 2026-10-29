import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kbList } from '../src/commands/te-kb/kb-list.js';
import { rmSource } from '../src/commands/te-kb/rm-source.js';
import {
  publicationCommands,
  readContextCreate,
  candidateDiscard,
} from '../src/commands/te-kb/publication.js';
import type { RuntimeContext } from '../src/framework/types.js';
const context = (values: Record<string, unknown> = {}): RuntimeContext =>
  ({
    host: () => 'https://example.test',
    str: (name) => (typeof values[name] === 'string' ? (values[name] as string) : ''),
    bool: (name) => values[name] === true,
    json: (name) => values[name],
  }) as RuntimeContext;
test('old list defaults remain compiled while published and contextual reads omit only implicit filters', async () => {
  assert.deepEqual((await kbList.dryRun!(context())).body, { buildStatus: 'compiled' });
  assert.deepEqual((await kbList.dryRun!(context({ view: 'published' }))).body, {
    view: 'published',
  });
  assert.deepEqual((await kbList.dryRun!(context({ 'read-context': 'one' }))).body, {});
  assert.deepEqual(
    (await kbList.dryRun!(context({ view: 'published', 'build-status': 'failed' }))).body,
    { view: 'published', buildStatus: 'failed' },
  );
});
test('new command surface preserves the existing approval workflow and requires deletion fencing', async () => {
  assert.deepEqual(
    publicationCommands.map((command) => `${command.resource} ${command.command}`),
    [
      'publication get',
      'candidate get',
      'candidate read',
      'candidate changes',
      'candidate discard',
      'read-context create',
      'read-context release',
    ],
  );
  assert.equal(candidateDiscard.risk, 'high-risk-write');
  assert.throws(
    () => rmSource.validate!(context({ name: 'Example', id: 'source', 'cancel-candidate': true })),
    /together/,
  );
  assert.deepEqual(
    (
      await rmSource.dryRun!(
        context({
          name: 'Example',
          id: 'source',
          'cancel-candidate': true,
          'expected-candidate-id': 'candidate',
        }),
      )
    ).body,
    { name: 'Example', id: 'source', cancelCandidate: true, expectedCandidateId: 'candidate' },
  );
  assert.throws(
    () =>
      readContextCreate.validate!(
        context({ sources: [{ scope: 'company', name: 'Example', versionId: 'other' }] }),
      ),
    /sources/,
  );
});

test('published list pins and releases an actual context and rejects old Host capability gaps', async () => {
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.js');
  const originalFetch = globalThis.fetch;
  const host = 'https://kb-publication-contract.invalid';
  const ctx = { ...context({ view: 'published' }), host: () => host };
  const seen: { url: string; context: string | null; method: string | undefined }[] = [];
  setCliTokenManual('test-publication-token', host);
  try {
    globalThis.fetch = async (url, init) => {
      seen.push({
        url: String(url),
        context: new Headers(init?.headers).get('X-KB-Read-Context'),
        method: init?.method,
      });
      if (String(url).endsWith('/read-contexts'))
        return Response.json({ readContextId: 'pinned-one' });
      if (String(url).endsWith('/list')) return Response.json({ items: [{ id: 'formal' }] });
      return Response.json({ released: true });
    };
    assert.deepEqual(JSON.parse(JSON.stringify(await kbList.execute(ctx))), {
      items: [{ id: 'formal' }],
    });
    const kbRequests = seen.filter((request) => request.url.includes('/knowledge-bases/'));
    assert.equal(kbRequests.length, 3);
    assert.equal(kbRequests[1].context, 'pinned-one');
    assert.equal(kbRequests[2].method, 'DELETE');
    seen.length = 0;
    globalThis.fetch = async (url) => {
      seen.push({ url: String(url), context: null, method: undefined });
      return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
    };
    await assert.rejects(kbList.execute(ctx));
    assert.equal(seen.length, 1);
    assert.ok(seen[0].url.endsWith('/read-contexts'));
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
});
