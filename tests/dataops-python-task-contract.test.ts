/**
 * DataOps Python workflow task and workspace discovery command contract tests.
 *
 * Run:
 *   npx tsx tests/dataops-python-task-contract.test.ts
 */

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliValidationError } from '../src/core/errors.js';
import type { Command, DryRunResult, RuntimeContext } from '../src/framework/types.js';
import flowCommands, {
  browsePythonDirectory,
  createPythonTask,
  getPythonTask,
  listPythonDirectories,
  listPythonPackageSources,
  listPythonVersions,
  updatePythonTask,
} from '../src/commands/te-dataops/flow/index.js';
import { MAX_PYTHON_CONTENT_BYTES } from '../src/commands/te-dataops/flow/python-task-options.js';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ok - ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stderr.write(`  FAIL - ${name}\n`);
    process.stderr.write(`        ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    has: (name) => Object.prototype.hasOwnProperty.call(values, name),
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined || values[name] === '' ? undefined : Number(values[name]),
    int64: (name) => BigInt(String(values[name] ?? 0)),
    optionalInt64: (name) => values[name] === undefined || values[name] === '' ? undefined : BigInt(String(values[name])),
    bool: (name) => Boolean(values[name]),
    optionalBool: (name) => typeof values[name] === 'boolean' ? values[name] : undefined,
    json: (name) => {
      const raw = values[name];
      if (raw === undefined || raw === null) return undefined;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    },
    list: (name) => {
      const raw = values[name];
      if (Array.isArray(raw)) return raw.map(String);
      if (raw === undefined || raw === null) return [];
      return [String(raw)];
    },
    communityReport: async () => undefined,
    localDataUpload: async () => undefined,
    host: () => 'http://ta1-60.example.test',
    mcpUrl: () => undefined,
    service: () => 'dataops_flow',
    out: async () => undefined,
  };
}

async function runDryRun(command: Command, context: RuntimeContext): Promise<DryRunResult> {
  command.validate?.(context);
  const result = await command.dryRun?.(context);
  assert.ok(result, `${command.command} must implement dryRun`);
  return result as DryRunResult;
}

const tempDir = await mkdtemp(join(tmpdir(), 'ae-cli-py-node-test-'));

try {
  console.log('dataops python task contract');

  await test('all seven Python commands are registered with expected risk levels and spaceCode required', () => {
    const byName = new Map(flowCommands.map((cmd) => [cmd.command, cmd]));
    const expected: Array<[string, Command, 'read' | 'write']> = [
      ['+create_python_task', createPythonTask, 'write'],
      ['+update_python_task', updatePythonTask, 'write'],
      ['+get_python_task', getPythonTask, 'read'],
      ['+list_python_versions', listPythonVersions, 'read'],
      ['+list_python_package_sources', listPythonPackageSources, 'read'],
      ['+list_python_directories', listPythonDirectories, 'read'],
      ['+browse_python_directory', browsePythonDirectory, 'read'],
    ];

    for (const [name, instance, risk] of expected) {
      assert.equal(byName.get(name), instance, `${name} registration`);
      assert.equal(instance.risk, risk, `${name} risk`);
      const spaceFlag = instance.flags.find((flag) => flag.name === 'spaceCode');
      assert.equal(spaceFlag?.required, true, `${name} spaceCode required`);
    }

    assert.ok(!getPythonTask.flags.some((flag) => flag.name === 'env'));
  });

  await test('create_python_task reads local .py and requirements.txt files into dry-run POST body', async () => {
    const scriptPath = join(tempDir, 'main.py');
    const reqPath = join(tempDir, 'requirements.txt');
    const scriptSource = 'import json\nprint("dt=${bd}")\nprint("TE_OUTPUT:" + json.dumps({"name":"out_dt","value":"${bd}"}))\n';
    const reqSource = 'six==1.16.0 ; python_version >= "3.11"\nrequests>=2.31.0\n';
    await writeFile(scriptPath, scriptSource, 'utf8');
    await writeFile(reqPath, reqSource, 'utf8');

    const dryRun = await runDryRun(createPythonTask, ctx({
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskName: 'Daily Python Score',
      scriptFile: scriptPath,
      requirementsFile: reqPath,
      outputParams: [{ paramKey: 'out_dt', remark: 'Processed date' }],
      preTasks: [2001],
      failRetryTimes: 3,
      failRetryInterval: 5,
      failRetryUnit: 'MINUTE',
    }));

    assert.equal(dryRun.method, 'POST');
    assert.equal(dryRun.url, 'http://ta1-60.example.test/api/cli/dataops/v1/gaia/workflow/python-tasks');
    assert.deepEqual(dryRun.body, {
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskName: 'Daily Python Score',
      scriptContent: scriptSource,
      requirementsTxt: reqSource,
      outputParams: [{ paramKey: 'out_dt', remark: 'Processed date' }],
      preTasks: [2001],
      failRetryTimes: 3,
      failRetryInterval: 5,
      failRetryUnit: 'MINUTE',
    });
  });

  await test('update_python_task supports partial omit-to-keep and explicit empty-string / empty-array clears', async () => {
    const partial = await runDryRun(updatePythonTask, ctx({
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskCode: 3001,
      packageSourceId: 'aliyun',
    }));
    assert.equal(partial.method, 'POST');
    assert.equal(partial.url, 'http://ta1-60.example.test/api/cli/dataops/v1/gaia/workflow/python-task-definition');
    assert.deepEqual(partial.body, {
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskCode: 3001,
      packageSourceId: 'aliyun',
    });

    const cleared = await runDryRun(updatePythonTask, ctx({
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskCode: 3001,
      requirements: '',
      remark: '',
      outputParams: [],
      preTasks: [],
    }));
    assert.deepEqual(cleared.body, {
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskCode: 3001,
      requirementsTxt: '',
      remark: '',
      outputParams: [],
      preTasks: [],
    });

    const emptyReqFile = join(tempDir, 'empty-requirements.txt');
    await writeFile(emptyReqFile, '', 'utf8');
    const clearedByFile = await runDryRun(updatePythonTask, ctx({
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskCode: 3001,
      requirementsFile: emptyReqFile,
    }));
    assert.equal(clearedByFile.body?.requirementsTxt, '');
  });

  await test('read and discovery commands produce exact GET query URLs and bounds', async () => {
    const taskRead = await runDryRun(getPythonTask, ctx({
      spaceCode: 'demo_space',
      flowCode: 1001,
      taskCode: 3001,
    }));
    assert.equal(taskRead.method, 'GET');
    assert.match(taskRead.url, /\/workflow\/python-task-definition\?spaceCode=demo_space&flowCode=1001&taskCode=3001$/);

    const versions = await runDryRun(listPythonVersions, ctx({ spaceCode: 'demo_space' }));
    assert.match(versions.url, /\/workflow\/python-versions\?spaceCode=demo_space$/);

    const sources = await runDryRun(listPythonPackageSources, ctx({ spaceCode: 'demo_space' }));
    assert.match(sources.url, /\/workflow\/python-package-sources\?spaceCode=demo_space$/);

    const dirs = await runDryRun(listPythonDirectories, ctx({ spaceCode: 'demo_space' }));
    assert.match(dirs.url, /\/workflow\/python-directories\?spaceCode=demo_space$/);

    const browseDefault = await runDryRun(browsePythonDirectory, ctx({
      spaceCode: 'demo_space',
      maxDepth: 2,
      maxEntries: 200,
    }));
    assert.match(browseDefault.url, /\/workflow\/python-directory-tree\?spaceCode=demo_space&maxDepth=2&maxEntries=200$/);

    const browseSubPath = await runDryRun(browsePythonDirectory, ctx({
      spaceCode: 'demo_space',
      path: '/dw/demo_space/product/models',
      maxDepth: 3,
      maxEntries: 100,
    }));
    assert.equal(browseSubPath.params?.path, '/dw/demo_space/product/models');
  });

  await test('validation rejects conflicting flags, directories, oversized files, invalid outputParams, and empty updates', async () => {
    const validScript = join(tempDir, 'ok.py');
    await writeFile(validScript, 'print(1)\n', 'utf8');

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'bad',
        script: 'print(1)',
        scriptFile: validScript,
      })),
      (err) => err instanceof CliValidationError && /not both/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'bad',
        scriptFile: tempDir,
      })),
      (err) => err instanceof CliValidationError && /single regular file/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'oversized',
        script: 'a'.repeat(MAX_PYTHON_CONTENT_BYTES - 2),
        requirements: 'six==1.16.0',
      })),
      (err) => err instanceof CliValidationError && /524288-byte limit/.test(err.message),
    );

    assert.throws(
      () => updatePythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskCode: 2001,
      })),
      (err) => err instanceof CliValidationError && /at least one update field/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'bad_out',
        script: 'print(1)',
        outputParams: [{ paramKey: 'ws_reserved' }],
      })),
      (err) => err instanceof CliValidationError && /ws_/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'dup_out',
        script: 'print(1)',
        outputParams: [{ paramKey: 'out_a' }, { paramKey: 'out_a' }],
      })),
      (err) => err instanceof CliValidationError && /duplicate paramKey/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'bad_out_field',
        script: 'print(1)',
        outputParams: [{ paramKey: 'out_a', paramDataType: 'INTEGER' }],
      })),
      (err) => err instanceof CliValidationError && /unsupported field "paramDataType"/.test(err.message),
    );

    assert.throws(
      () => browsePythonDirectory.validate?.(ctx({
        spaceCode: 'demo',
        maxDepth: 4,
      })),
      (err) => err instanceof CliValidationError && /maxDepth/.test(err.message),
    );

    assert.throws(
      () => browsePythonDirectory.validate?.(ctx({
        spaceCode: 'demo',
        maxEntries: 501,
      })),
      (err) => err instanceof CliValidationError && /maxEntries/.test(err.message),
    );

    const validReq = join(tempDir, 'req.txt');
    const blankScript = join(tempDir, 'blank.py');
    await writeFile(validReq, 'six==1.16.0\n', 'utf8');
    await writeFile(blankScript, '   \n\t  ', 'utf8');

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'bad_req_conflict',
        script: 'print(1)',
        requirements: 'six==1.16.0',
        requirementsFile: validReq,
      })),
      (err) => err instanceof CliValidationError && /not both/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'missing_script',
        scriptFile: join(tempDir, 'does-not-exist.py'),
      })),
      (err) => err instanceof CliValidationError && /file not found/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'blank_script',
        scriptFile: blankScript,
      })),
      (err) => err instanceof CliValidationError && /must not be empty/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'dir_req',
        script: 'print(1)',
        requirementsFile: tempDir,
      })),
      (err) => err instanceof CliValidationError && /single regular file/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: '   ',
        script: 'print(1)',
      })),
      (err) => err instanceof CliValidationError && /--taskName/.test(err.message),
    );

    assert.throws(
      () => updatePythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskCode: 2001,
        pythonVersion: '  ',
      })),
      (err) => err instanceof CliValidationError && /--pythonVersion/.test(err.message),
    );

    assert.throws(
      () => updatePythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskCode: 2001,
        packageSourceId: '',
      })),
      (err) => err instanceof CliValidationError && /--packageSourceId/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'long_remark',
        script: 'print(1)',
        remark: 'x'.repeat(201),
      })),
      (err) => err instanceof CliValidationError && /200 characters/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'non_array_out',
        script: 'print(1)',
        outputParams: { paramKey: 'out_a' },
      })),
      (err) => err instanceof CliValidationError && /JSON array/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'reserved_env_out',
        script: 'print(1)',
        outputParams: [{ paramKey: 'env' }],
      })),
      (err) => err instanceof CliValidationError && /env/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'long_out_remark',
        script: 'print(1)',
        outputParams: [{ paramKey: 'out_a', remark: 'r'.repeat(201) }],
      })),
      (err) => err instanceof CliValidationError && /200 characters/.test(err.message),
    );

    assert.throws(
      () => createPythonTask.validate?.(ctx({
        spaceCode: 'demo',
        flowCode: 1001,
        taskName: 'num_out_remark',
        script: 'print(1)',
        outputParams: [{ paramKey: 'out_a', remark: 42 }],
      })),
      (err) => err instanceof CliValidationError && /must be a string/.test(err.message),
    );

    assert.throws(
      () => browsePythonDirectory.validate?.(ctx({
        spaceCode: 'demo',
        path: '   ',
      })),
      (err) => err instanceof CliValidationError && /whitespace only/.test(err.message),
    );
  });

  await test('skill and reference document single-file contract, TE_OUTPUT pre-declaration, and transitional tools', async () => {
    const [skill, flowPythonRef, flowCreateRef, flowMonitorRef] = await Promise.all([
      readFile(new URL('../skills/ae-dataops/SKILL.md', import.meta.url), 'utf8'),
      readFile(new URL('../skills/ae-dataops/references/dataops-flow-python.md', import.meta.url), 'utf8'),
      readFile(new URL('../skills/ae-dataops/references/dataops-flow-create.md', import.meta.url), 'utf8'),
      readFile(new URL('../skills/ae-dataops/references/dataops-flow-monitor.md', import.meta.url), 'utf8'),
    ]);

    assert.match(skill, /references\/dataops-flow-python\.md/);
    assert.match(skill, /single self-contained `main\.py`/);
    assert.match(skill, /dwWorkflowEdit/);
    assert.match(skill, /\+browse_python_directory.*DEV storage only/);
    assert.match(flowPythonRef, /Never split custom helper `\.py` modules/);
    assert.match(flowPythonRef, /--scriptFile/);
    assert.match(flowPythonRef, /--requirementsFile/);
    assert.match(flowPythonRef, /TE_OUTPUT:/);
    assert.match(flowPythonRef, /one `TE_OUTPUT:` line per parameter/);
    assert.match(flowPythonRef, /malformed `TE_OUTPUT:` protocol line fails/);
    assert.match(flowPythonRef, /dwWorkflowEdit/);
    assert.match(flowPythonRef, /No remote DEV single-node debug-run CLI/i);
    assert.match(flowPythonRef, /\| Command \| Purpose \| Risk \| Key Flags \|/);
    assert.match(flowPythonRef, /flow_create_python_task/);
    assert.match(flowPythonRef, /flow_browse_python_directory/);
    assert.match(flowPythonRef, /Review after: 2026-12-21/);
    assert.match(flowCreateRef, /### Step 5b: Create, Read, or Modify Python Task Nodes/);
    assert.match(flowCreateRef, /dataops-flow-python\.md/);
    assert.match(flowCreateRef, /refuseReason/);
    assert.match(flowCreateRef, /\| Command \| Purpose \| Risk \| Key Flags \|/);
    assert.match(flowCreateRef, /`ae-cli dataops_flow \+delete_task` \|[^|]+\| high-risk-write \|/);
    assert.match(flowCreateRef, /Review after: 2026-12-21/);
    assert.match(flowMonitorRef, /definition\.task\.pythonTask/);
    assert.match(flowMonitorRef, /log\.taskLog/);
    assert.match(flowMonitorRef, /UPSTREAM_OUTPUT/);
  });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
