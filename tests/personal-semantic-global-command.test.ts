import assert from 'node:assert/strict';
import { personalSemanticPreferenceList } from '../src/commands/personal-semantic-preference/list.ts';
import { personalSemanticPreferenceGet } from '../src/commands/personal-semantic-preference/get.ts';
import { personalSemanticPreferenceAdd } from '../src/commands/personal-semantic-preference/add.ts';
import { personalSemanticPreferenceUpdate } from '../src/commands/personal-semantic-preference/update.ts';
import { personalSemanticPreferenceDelete } from '../src/commands/personal-semantic-preference/delete.ts';
import { optionalResourceRefs } from '../src/commands/personal-semantic-preference/shared.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const host = 'https://global-personal.example.com';
const commands = [personalSemanticPreferenceList, personalSemanticPreferenceGet, personalSemanticPreferenceAdd,
  personalSemanticPreferenceUpdate, personalSemanticPreferenceDelete];
const projectRef = [{ resource_type: 'project', resource_key: '195', display_name: 'System usage data' }];
function context(projectId: number, references = projectRef): RuntimeContext {
  const values: Record<string, unknown> = {
    'context-type': 'asset_context', 'resource-refs': references, id: 'preference_31',
    title: 'Default query project', summary: 'Use the default project', content: 'Use this project unless specified otherwise.',
  };
  return {
    host: () => host,
    str: (name: string) => typeof values[name] === 'string' ? values[name] as string
      : values[name] === undefined ? '' : JSON.stringify(values[name]),
    num: (name: string) => name === 'project-id' ? projectId : 1,
    optionalNum: () => 1,
    bool: () => false,
    json: (name: string) => values[name],
    list: () => [],
  } as RuntimeContext;
}
let calls: { url: string; input: Record<string, unknown> }[] = [];
const originalFetch = globalThis.fetch;
setCliTokenManual('fixture-only-global-personal', host);
globalThis.fetch = (async (url, init) => {
  calls.push({ url: String(url), input: JSON.parse(String(init?.body)).input });
  return new Response(JSON.stringify({ ok: true, data: { valid: true } }), { status: 200 });
}) as typeof fetch;
try {
  for (const command of commands) {
    const global = context(-1);
    command.validate?.(global);
    for (const invoke of [command.validateInput!, command.dryRun!, command.execute]) {
      await invoke(global);
      assert.match(calls.at(-1)!.url, new RegExp(`business_semantics\\.global_personal_context\\.${command.command}/`));
      assert.equal(calls.at(-1)!.input.project_id, -1);
    }
    await command.dryRun!(context(195));
    assert.match(calls.at(-1)!.url, new RegExp(`business_semantics\\.personal_context\\.${command.command}/`));
    for (const invalid of [0, -2, 1.5, Number.NaN]) {
      assert.throws(() => command.validate?.(context(invalid)), /positive integer or -1/);
    }
  }
  assert.equal(personalSemanticPreferenceDelete.risk, 'high-risk-write');
  const invalidType = [{ resource_type: 'virtual_property', resource_key: '123', display_name: 'Virtual field' }];
  assert.throws(() => optionalResourceRefs(context(195, invalidType)), /canonical property name/);
  assert.throws(() => personalSemanticPreferenceAdd.validate!(context(-1,
    [{ resource_type: 'report', resource_key: '12', display_name: 'Report' }])), /resource_type=project/);
  const virtual = [{ resource_type: 'event_property', resource_key: '#vp@field', display_name: 'Virtual field' }];
  assert.deepEqual(optionalResourceRefs(context(195, virtual)), virtual);

  calls = [];
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), input: JSON.parse(String(init?.body)).input });
    return new Response(JSON.stringify({ ok: false, error: { code: 'CAPABILITY_NOT_FOUND',
      message: 'Global personal capability is not deployed' } }), { status: 404 });
  }) as typeof fetch;
  await assert.rejects(() => personalSemanticPreferenceList.execute(context(-1)), /not deployed/);
  assert.equal(calls.length, 1, 'A missing global capability must not fall back to project scope.');
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
}
console.log('Global personal semantic command contracts passed.');
