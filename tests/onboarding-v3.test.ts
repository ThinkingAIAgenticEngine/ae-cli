import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { OnboardingRuntime } from '../src/core/onboarding/runtime.js';
import { OnboardingStore } from '../src/core/onboarding/session-store.js';
import { identifyWorkspaceProjects } from '../src/core/onboarding/workspace-projects.js';

const host = 'https://plg.example.test';

test('workspace discovery identifies supported projects without following dependency or external directories', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-plg-workspace-'));
  const workspace = path.join(root, 'workspace');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const directory of ['unity/Assets', 'unity/ProjectSettings', 'web', 'api', 'node_modules/ignored']) {
    fs.mkdirSync(path.join(workspace, directory), { recursive: true });
  }
  fs.mkdirSync(path.join(root, 'external'));
  fs.writeFileSync(path.join(root, 'external', 'index.html'), '');
  fs.symlinkSync(path.join(root, 'external'), path.join(workspace, 'linked'), 'junction');
  fs.writeFileSync(path.join(workspace, 'web', 'index.html'), '');
  fs.writeFileSync(path.join(workspace, 'api', 'package.json'), JSON.stringify({ dependencies: { express: '5.0.0' } }));
  fs.writeFileSync(path.join(workspace, 'node_modules', 'ignored', 'index.html'), '');
  const candidates = identifyWorkspaceProjects(workspace);
  assert.deepEqual(candidates.map(({ directory, platform }) => [directory, platform]).sort(), [
    ['api', 'nodejs'], ['unity', 'unity'], ['web', 'web'],
  ]);
});

test('demo selection and switching stay separate from the confirmed SDK target', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-plg-v3-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls: Array<{ id: string; body: Record<string, unknown> }> = [];
  const runtime = new OnboardingRuntime(new OnboardingStore(root), {
    activeHost: () => host,
    authenticated: () => true,
    credentialKey: () => 'credential',
    compatibility: async () => undefined,
    open: () => { throw new Error('The authenticated flow must not open a browser'); },
    capability: async (_host, id, body) => {
      calls.push({ id, body });
      if (id === 'project.plg_demo.context') return {
        business_project: { project_id: 7, project_name: 'prj_example' },
        requires_confirmation: true,
        recommended_sample: 'star-island',
        samples: [{ sample_id: 'star-island' }, { sample_id: 'season-pass' }],
      };
      const starIsland = body.sample_id === 'star-island';
      return { status: 'ready', project_id: starIsland ? 40 : 41, sample_id: body.sample_id,
        item_id: starIsland ? 'starlight-bundle' : 'season-pass-item' };
    },
  });
  const start = await runtime.invoke('run', {});
  assert.equal(start.next_action, 'choose_experience');
  assert.deepEqual((start.demo_entry as { options: { value: string }[] }).options.map(({ value }) => value), ['demo', 'learn']);
  assert.equal(start.realtime_data_url, undefined);
  assert.match(String(start.skill_path), /skills\/ae-onboarding\/SKILL\.md$/);
  assert.deepEqual(calls.map(call => call.id), ['project.plg_demo.context']);
  const session_id = String(start.session_id);
  const first = await runtime.invoke('run', { session_id, choice: 'demo' });
  assert.equal(first.demo_project_id, 40);
  assert.deepEqual(calls.at(-1), { id: 'project.plg_demo.ensure', body: { sample_id: 'star-island' } });
  const overview = first.demo_overview as { primary_metric: string; featured_topic: string; featured_question: string;
    interaction: { options: { value: string; label: string }[] } };
  assert.equal(overview.primary_metric, 'purchase_rate_by_viewing_days');
  assert.equal(overview.featured_topic, 'product_revisits');
  assert.deepEqual(overview.interaction.options.map(({ value }) => value), ['growth', 'diagnosis']);
  assert.equal(overview.interaction.options[0].label, 'Find repeat bundle viewers');
  assert.deepEqual((await runtime.invoke('run', { session_id })).demo_overview, overview);
  const season = await runtime.invoke('run', { session_id, sample: 'season-pass' });
  assert.equal(season.demo_project_id, 41);
  assert.equal((season.demo_overview as typeof overview).primary_metric, 'checkout_unpaid_rate');
  assert.equal((season.demo_overview as typeof overview).interaction.options[0].label, 'Find unpaid pass checkouts');
  const status = await runtime.invoke('status', { session_id });
  assert.deepEqual(status.demo_overview, season.demo_overview);
  assert.equal(status.project_id, null);
  assert.deepEqual(status.business_project, { project_id: 7, project_name: 'prj_example' });
  assert.equal(status.workspace_projects, undefined);
  const data = status.business_data as Record<'interaction' | 'tools', { step: string; options: { value: string }[] }>;
  assert.deepEqual([data.interaction.step, data.tools.step], ['choose_data_source', 'choose_data_tool']);
  assert.deepEqual(data.interaction.options.map(({ value }) => value), ['import_data', 'sdk', 'more_data_tools']);
  assert.deepEqual(data.tools.options.map(({ value }) => value),
    ['datax', 'logbus2', 'tracking_plan', 'migrate_tracking', 'dimension_table', 'check_ingestion']);
  assert.deepEqual(calls.at(-1), { id: 'project.plg_demo.status', body: { sample_id: 'season-pass' } });
  const again = await runtime.invoke('run', { session_id, sample: 'star-island' });
  assert.equal((again.demo_overview as typeof overview).featured_topic, 'checkout_recovery');
  assert.notEqual((again.demo_overview as typeof overview).featured_question, overview.featured_question);
  const unconfirmed = await runtime.invoke('run', { session_id, choice: 'business', sdk_complete: true });
  assert.equal(unconfirmed.next_action, 'confirm_business_project');
  assert.equal(unconfirmed.realtime_data_url, undefined);
  await assert.rejects(runtime.invoke('run', { session_id, confirm_business_project_id: 41 }), /eligible business project/);
  const setup = await runtime.invoke('run', { session_id, confirm_business_project_id: 7 });
  const realtimeUrl = host + '/#/data/realtime?setupProjectId=7';
  assert.equal(setup.next_action, 'identify_workspace_projects');
  assert.equal(setup.phase, 'waiting_user');
  assert.equal(setup.realtime_data_url, realtimeUrl);
  assert.equal((await runtime.invoke('status', { session_id })).realtime_data_url, realtimeUrl);
  const finished = await runtime.invoke('run', { session_id, sdk_complete: true });
  assert.equal(finished.next_action, 'show_realtime_data');
  assert.equal(finished.phase, 'completed');
  assert.equal(finished.realtime_data_url, realtimeUrl);
  assert.equal(finished.project_id, 7);
});

test('demo advances initialization and checks ingestion in the same run', async t => {
  for (const lastStatus of ['ready', 'uploaded']) {
    await t.test(lastStatus, async t => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-plg-demo-prepare-'));
      t.after(() => fs.rmSync(root, { recursive: true, force: true }));
      const stages = ['initialized', 'uploaded', lastStatus];
      const calls: string[] = [];
      const runtime = new OnboardingRuntime(new OnboardingStore(root), {
        activeHost: () => host,
        authenticated: () => true,
        credentialKey: () => 'credential',
        compatibility: async () => undefined,
        capability: async (_host, id, body) => {
          calls.push(id);
          if (id === 'project.plg_demo.context') return { recommended_sample: 'star-island' };
          assert.deepEqual(body, { sample_id: 'star-island' });
          return { status: stages.shift(), project_id: 40 };
        },
      });

      const result = await runtime.invoke('run', { choice: 'demo' });

      assert.deepEqual(calls, ['project.plg_demo.context', ...Array(3).fill('project.plg_demo.ensure')]);
      assert.equal(result.demo_project_id, 40);
      assert.equal(result.next_action, lastStatus === 'ready' ? 'offer_growth_questions' : 'poll_demo');
      assert.equal(result.poll_after_ms, lastStatus === 'ready' ? 0 : 2000);
    });
  }
});
