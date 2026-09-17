import assert from 'node:assert/strict';
import { metadataGovernanceRecommendationExport } from '../src/commands/te-analysis/meta/governance-recommendation/export.ts';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import commands from '../src/commands/project-semantic/index.ts';
import { projectSemanticAssetPackageExport } from '../src/commands/project-semantic/asset-package/export.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

function ctx(values: Record<string, string | number> = {}): RuntimeContext {
  return {
    host: () => 'https://project-semantic.example.com',
    str: (name: string) => String(values[name] ?? ''),
    num: (name: string) => Number(values[name] ?? 0),
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    list: () => [],
  } as RuntimeContext;
}

assert.deepEqual(commands.map(command => `${command.service} ${command.resource} ${command.command}`), [
  'project-semantic asset-package export',
]);

async function captureGatewayCall(fn: () => Promise<unknown>) {
  setCliTokenManual('cli-test-token', 'https://project-semantic.example.com');
  let capturedUrl = '';
  let capturedBody: unknown;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    await fn();
    return { capturedUrl, capturedBody };
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken('https://project-semantic.example.com');
  }
}

const dryRun = await captureGatewayCall(() =>
  projectSemanticAssetPackageExport.dryRun!(ctx({ 'project-id': 5 })) as Promise<unknown>);
assert.deepEqual(dryRun.capturedBody, {
  input: {
    project_id: 5,
    asset_scope: 'governed',
  },
});
assert.ok(String(dryRun.capturedUrl).endsWith(
  '/api/cli/analysis/v1/capabilities/business_semantics.asset_package.export/dry-run',
));

const validate = await captureGatewayCall(() =>
  projectSemanticAssetPackageExport.validateInput!(ctx({
    'project-id': 5,
    'asset-scope': 'collaborative',
  })));
assert.deepEqual(validate.capturedBody, {
  input: {
    project_id: 5,
    asset_scope: 'collaborative',
  },
});
assert.ok(String(validate.capturedUrl).endsWith(
  '/api/cli/analysis/v1/capabilities/business_semantics.asset_package.export/validate',
));

assert.throws(
  () => projectSemanticAssetPackageExport.dryRun!(ctx({
    'project-id': 5,
    'asset-scope': 'invalid',
  })),
  /asset-scope must be one of: governed, collaborative, all_visible/,
);

const previousFetch = globalThis.fetch;
setCliTokenManual('cli-test-token', 'https://project-semantic.example.com');
try {
  for (const command of [projectSemanticAssetPackageExport, metadataGovernanceRecommendationExport]) {
    const requests: string[] = [];
    globalThis.fetch = (async (url) => {
      if (String(url).includes("/api/cli/")) requests.push(String(url));
      return new Response(JSON.stringify({
        ok: false,
        error: { code: 'PROJECT_SEMANTIC_DISABLED', message: 'Enable project_semantic_enable for this project before exporting.' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    await assert.rejects(command.execute(ctx({ 'project-id': 5 })), (error: unknown) => {
      assert.ok(error instanceof CapabilityGatewayError);
      assert.equal(error.code, 'PROJECT_SEMANTIC_DISABLED');
      assert.match(error.message, /project_semantic_enable/);
      return true;
    });
    assert.equal(requests.length, 1, `Disabled exports must not retry, poll, or download an artifact: ${requests.join(', ')}`);
    assert.ok(requests[0].endsWith('/execute'));
  }
} finally {
  globalThis.fetch = previousFetch;
  clearCliToken('https://project-semantic.example.com');
}

process.stdout.write('project semantic asset package command tests passed\n');
