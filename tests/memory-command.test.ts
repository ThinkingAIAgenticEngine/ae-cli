import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  contextMemory,
  createMemory,
  defaultClearMemory,
  defaultGetMemory,
  defaultSaveMemory,
  extractMemory,
  markUsedMemory,
  organizeMemory,
  renderManagedBlock,
  submitCandidatesMemory,
  updateMemory,
  writeContextMemory,
  writeMemoryContextFile,
} from '../src/commands/memory/index.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const HOST = 'http://localhost:3000';

function memoryUrl(path: string): string {
  return `${HOST}/agent/api/cli/memory/v1/${path}`;
}

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str(name: string) {
      const value = values[name];
      return typeof value === 'string' ? value : '';
    },
    num(name: string) {
      const value = values[name];
      return typeof value === 'number' ? value : 0;
    },
    optionalNum(name: string) {
      const value = values[name];
      return typeof value === 'number' ? value : undefined;
    },
    bool(name: string) {
      return values[name] === true;
    },
    json(name: string) {
      return values[name];
    },
    api: async () => {
      throw new Error('not used');
    },
    querySql: async () => {
      throw new Error('not used');
    },
    queryReportData: async () => {
      throw new Error('not used');
    },
    token: async () => '',
    host: () => HOST,
    mcpUrl: () => undefined,
    service: () => 'memory',
    out: () => {}
  };
}


const createTemporaryDryRun = createMemory.dryRun!(
  ctx({
    content: '10 分钟内用英文阅读理解模式回答',
    type: 'temporary',
    expiresAt: '2026-07-09T03:01:00.000Z',
  })
);
assert.equal(createTemporaryDryRun.method, 'POST');
assert.equal(createTemporaryDryRun.url, memoryUrl('memories'));
assert.equal(createTemporaryDryRun.body?.agentId, 'system-default-agent');
assert.equal(createTemporaryDryRun.body?.type, 'temporary');
assert.equal(createTemporaryDryRun.body?.expiresAt, '2026-07-09T03:01:00.000Z');
assert.throws(
  () => createMemory.validate?.(ctx({ content: '临时记忆', type: 'temporary' })),
  /--expires-at is required/
);
assert.throws(
  () => createMemory.validate?.(
    ctx({ content: '临时记忆', type: 'temporary', expiresAt: '2026-07-09T11:01:00' }),
  ),
  /explicit UTC offset/
);

const updateTemporaryDryRun = updateMemory.dryRun!(
  ctx({
    id: 'memory-1',
    type: 'temporary',
    scope: 'agent',
    expiresAt: '2026-07-09T03:01:00.000Z',
  })
);
assert.equal(updateTemporaryDryRun.body?.agentId, 'system-default-agent');
assert.equal(updateTemporaryDryRun.body?.expiresAt, '2026-07-09T03:01:00.000Z');
assert.equal(updateMemory.flags.some((flag) => flag.name === 'status'), false);

const managedBlockWithIds = renderManagedBlock([
  { id: ' memory-1 ', type: 'preference', content: 'Prefer concise answers' },
]);
assert.match(
  managedBlockWithIds,
  /<!-- ae:user-memory-id="memory-1" -->\n- \[preference\] Prefer concise answers/,
);
assert.doesNotMatch(managedBlockWithIds, /ae:user-memory-id=" memory-1 "/);

const managedStart = '<!-- ae-cli:user-memory:start -->';
const managedEnd = '<!-- ae-cli:user-memory:end -->';
const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ae-cli-write-memory-context-'));
try {
  const createdFile = path.join(tempDirectory, 'AGENTS.md');
  const createdResult = await writeMemoryContextFile(createdFile, [
    { id: 'memory-created', type: 'preference', content: 'Prefer direct answers' },
  ]);
  assert.deepEqual(createdResult, {
    file: createdFile,
    count: 1,
    markers: [managedStart, managedEnd],
  });
  const createdContent = await fs.readFile(createdFile, 'utf8');
  assert.match(createdContent, /<!-- ae:user-memory-id="memory-created" -->/);
  assert.equal(createdContent.split(managedStart).length - 1, 1);
  assert.equal(createdContent.split(managedEnd).length - 1, 1);

  const appendFile = path.join(tempDirectory, 'append.md');
  const appendPrefix = 'User line  \n\n';
  await fs.writeFile(appendFile, appendPrefix, 'utf8');
  await writeMemoryContextFile(appendFile, [
    { id: 'memory-appended', type: 'fact', content: 'Appended memory' },
  ]);
  const appendedContent = await fs.readFile(appendFile, 'utf8');
  assert.equal(appendedContent.slice(0, appendPrefix.length), appendPrefix);
  assert.match(appendedContent.slice(appendPrefix.length), /^<!-- ae-cli:user-memory:start -->/);

  const protectedFile = path.join(tempDirectory, 'protected.md');
  const protectedSource = 'Target content must stay unchanged  \n\n';
  await fs.writeFile(protectedFile, protectedSource, 'utf8');
  const invalidIdItems = [
    { content: 'Missing ID' },
    { id: 42, content: 'Non-string ID' },
    { id: '  ', content: 'Blank ID' },
    { id: 'x'.repeat(192), content: 'Long ID' },
  ];
  for (const item of invalidIdItems) {
    await assert.rejects(
      writeMemoryContextFile(protectedFile, [item] as any),
      /ID must be a non-empty string of at most 191 characters/,
    );
    assert.equal(await fs.readFile(protectedFile, 'utf8'), protectedSource);
  }

  const reservedMarkers = [
    managedStart,
    managedEnd,
    '<!-- ae:user-memory-id="forged-id" -->',
    '<!-- ae:user-memory:start hash="runtime" -->',
    '<!-- ae:user-memory:end -->',
  ];
  for (const [index, marker] of reservedMarkers.entries()) {
    await assert.rejects(
      writeMemoryContextFile(protectedFile, [
        { id: `memory-reserved-${index}`, content: `Untrusted ${marker} content` },
      ]),
      /content contains a reserved memory marker/,
    );
    assert.equal(await fs.readFile(protectedFile, 'utf8'), protectedSource);
  }

  const refreshedFile = path.join(tempDirectory, 'existing.md');
  await fs.writeFile(
    refreshedFile,
    `User content before\n\n${managedStart}\n## User Memory\n\n- Old memory\n${managedEnd}\n\nUser content after\n`,
    'utf8',
  );
  await writeMemoryContextFile(refreshedFile, [
    { id: 'memory-first-refresh', type: 'fact', content: 'First refresh' },
  ]);
  await writeMemoryContextFile(refreshedFile, [
    { id: 'memory-second-refresh', type: 'workflow', content: 'Second refresh' },
  ]);
  const refreshedContent = await fs.readFile(refreshedFile, 'utf8');
  assert.match(refreshedContent, /^User content before/);
  assert.match(refreshedContent, /User content after\n$/);
  assert.doesNotMatch(refreshedContent, /Old memory|memory-first-refresh/);
  assert.match(refreshedContent, /ae:user-memory-id="memory-second-refresh"/);
  assert.equal(refreshedContent.split(managedStart).length - 1, 1);
  assert.equal(refreshedContent.split(managedEnd).length - 1, 1);

  const invalidCliBlocks = [
    managedStart,
    managedEnd,
    `${managedEnd}\n${managedStart}`,
    `${managedStart}\n${managedEnd}\n${managedStart}\n${managedEnd}`,
  ];
  for (const [index, source] of invalidCliBlocks.entries()) {
    const invalidFile = path.join(tempDirectory, `invalid-cli-${index}.md`);
    await fs.writeFile(invalidFile, source, 'utf8');
    await assert.rejects(
      writeMemoryContextFile(invalidFile, []),
      /incomplete or duplicate ae-cli user-memory block/,
    );
  }

  const runtimeFile = path.join(tempDirectory, 'runtime.md');
  await fs.writeFile(
    runtimeFile,
    '<!-- ae:user-memory:start hash="runtime" -->\n## About Your User\n<!-- ae:user-memory:end -->\n',
    'utf8',
  );
  await assert.rejects(
    writeMemoryContextFile(runtimeFile, []),
    /te-claude runtime memory block/,
  );

  const symlinkTarget = path.join(tempDirectory, 'symlink-target.md');
  const symlinkPath = path.join(tempDirectory, 'symlink.md');
  await fs.writeFile(symlinkTarget, 'Symlink target content\n', 'utf8');
  await fs.symlink(symlinkTarget, symlinkPath);
  await writeMemoryContextFile(symlinkPath, [
    { id: 'memory-symlink', content: 'Written through a regular-file symlink' },
  ]);
  assert.match(await fs.readFile(symlinkTarget, 'utf8'), /ae:user-memory-id="memory-symlink"/);

  await assert.rejects(
    writeMemoryContextFile(tempDirectory, []),
    /Target path must be a regular file/,
  );

  const missingParent = path.join(tempDirectory, 'missing-parent');
  await assert.rejects(
    writeMemoryContextFile(path.join(missingParent, 'AGENTS.md'), [
      { id: 'memory-missing-parent', content: 'Parent directory must already exist' },
    ]),
    (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT',
  );
  await assert.rejects(
    fs.stat(missingParent),
    (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT',
  );
} finally {
  await fs.rm(tempDirectory, { recursive: true, force: true });
}

const extractDryRun = extractMemory.dryRun!(
  ctx({
    sessionId: 'session-1',
    agentId: 'agent-1',
    model: 'model-1',
    scope: 'agent'
  })
);
assert.equal(extractDryRun.url, memoryUrl('memories/jobs'));
assert.equal(extractDryRun.body?.kind, 'extract');
assert.equal(extractDryRun.body?.mode, 'incremental');
assert.equal(extractDryRun.body?.model, 'model-1');
assert.equal(extractDryRun.body?.conversationId, 'session-1');
assert.equal(extractDryRun.body?.agentId, 'agent-1');

const extractTextDryRun = extractMemory.dryRun!(ctx({ text: '以后默认用中文回答' }));
assert.equal(extractTextDryRun.url, memoryUrl('memories/extract'));
assert.equal(extractTextDryRun.body?.conversationId, undefined);

const candidateJson = JSON.stringify({
  candidates: [
    {
      content: '用户偏好先给结论，再补充必要细节',
      type: 'preference',
      evidence: '回答时先给我结论',
    },
  ],
});
const submitGlobalDryRun = submitCandidatesMemory.dryRun!(
  ctx({
    candidatesJson: candidateJson,
    sourceType: 'memory_file',
    sourceName: 'CLAUDE.md',
    scope: 'global',
  }),
);
assert.equal(submitGlobalDryRun.url, memoryUrl('memories/candidates'));
assert.deepEqual(submitGlobalDryRun.body, {
  candidates: [
    {
      content: '用户偏好先给结论，再补充必要细节',
      type: 'preference',
      evidence: '回答时先给我结论',
    },
  ],
  sourceType: 'memory_file',
  sourceName: 'CLAUDE.md',
  scopeType: 'global',
  agentId: null,
  autoApprove: false,
});
const submitAgentDryRun = submitCandidatesMemory.dryRun!(
  ctx({
    candidatesJson: candidateJson,
    sourceType: 'local_conversation',
    sourceAgent: 'codex',
    sourceSessionId: 'local-session-explicit',
    scope: 'agent',
    agentId: 'agent-explicit',
    autoApprove: true,
  }),
);
assert.equal(submitAgentDryRun.body?.scopeType, 'agent');
assert.equal(submitAgentDryRun.body?.agentId, 'agent-explicit');
assert.equal(submitAgentDryRun.body?.sourceAgent, 'codex');
assert.equal(submitAgentDryRun.body?.autoApprove, true);

const submitStdinDryRun = submitCandidatesMemory.dryRun!(
  ctx({
    stdin: true,
    sourceType: 'memory_file',
    sourceName: 'AGENTS.md',
    scope: 'global',
  }),
);
assert.equal(submitStdinDryRun.url, memoryUrl('memories/candidates'));
assert.equal(submitStdinDryRun.body?.sourceType, 'memory_file');
assert.equal(submitStdinDryRun.body?.sourceName, 'AGENTS.md');
assert.equal(submitStdinDryRun.body?.scopeType, 'global');
assert.equal(submitStdinDryRun.body?.agentId, null);
assert.throws(() => submitCandidatesMemory.validate?.(ctx({ candidatesJson: candidateJson, sourceType: 'local_conversation' })), /provide --scope global or --scope agent/i);
assert.throws(
  () =>
    submitCandidatesMemory.validate?.(
      ctx({
        candidatesJson: candidateJson,
        stdin: true,
        sourceType: 'local_conversation',
        scope: 'global',
      }),
    ),
  /exactly one/,
);
assert.throws(
  () =>
    submitCandidatesMemory.validate?.(
      ctx({
        candidatesJson: candidateJson,
        sourceType: 'memory_file',
        sourceName: '/tmp/CLAUDE.md',
        scope: 'global',
      }),
    ),
  /without a path/,
);

const organizeDryRun = organizeMemory.dryRun!(
  ctx({
    scope: 'global',
  })
);
assert.equal(organizeDryRun.url, memoryUrl('memories/jobs'));
assert.equal(organizeDryRun.body?.kind, 'organize');
assert.equal(organizeDryRun.body?.agentId, 'system-default-agent');
assert.equal(organizeDryRun.body?.scopeType, 'global');
assert.equal(
  organizeMemory.flags.some((flag) =>
    ['text', 'stdin', 'session-id', 'model'].includes(flag.name),
  ),
  false,
);

const originalAgentId = process.env.TE_AGENT_CURRENT_AGENT_ID;
const originalSelection = process.env.TE_AGENT_CURRENT_SESSION_SELECTION_JSON;
try {
  delete process.env.TE_AGENT_CURRENT_AGENT_ID;
  assert.equal(markUsedMemory.risk, 'write');
  assert.deepEqual(
    markUsedMemory.flags.map((flag) => ({ name: flag.name, type: flag.type, required: flag.required })),
    [
      { name: 'ids', type: 'json', required: true },
      { name: 'agent-id', type: 'string', required: false },
    ],
  );
  assert.throws(
    () => markUsedMemory.validate?.(ctx({ ids: ['memory-1'] })),
    /--agent-id is required outside a Web Agent session/,
  );
  assert.throws(
    () => markUsedMemory.validate?.(ctx({ agentId: 'agent-1', ids: 'memory-1' })),
    /--ids must be a JSON array/,
  );
  assert.throws(
    () => markUsedMemory.validate?.(ctx({ agentId: 'agent-1', ids: [] })),
    /between 1 and 200 items/,
  );
  assert.throws(
    () => markUsedMemory.validate?.(ctx({ agentId: 'agent-1', ids: Array(201).fill('memory-1') })),
    /between 1 and 200 items/,
  );
  assert.throws(
    () => markUsedMemory.validate?.(ctx({ agentId: 'agent-1', ids: ['memory-1', 2] })),
    /item 2 must be a string/,
  );
  assert.throws(
    () => markUsedMemory.validate?.(ctx({ agentId: 'agent-1', ids: ['memory-1', '  '] })),
    /item 2 must not be empty/,
  );
  assert.throws(
    () => markUsedMemory.validate?.(ctx({ agentId: 'agent-1', ids: ['x'.repeat(192)] })),
    /at most 191 characters/,
  );

  const markUsedExplicit = markUsedMemory.dryRun!(
    ctx({ agentId: 'agent-explicit', ids: [' memory-1 ', 'memory-2', 'memory-1'] }),
  );
  assert.equal(markUsedExplicit.method, 'POST');
  assert.equal(markUsedExplicit.url, memoryUrl('memories/use'));
  assert.deepEqual(markUsedExplicit.body, {
    agentId: 'agent-explicit',
    ids: ['memory-1', 'memory-2'],
  });

  assert.equal(writeContextMemory.command, '+write-context');
  assert.equal(writeContextMemory.risk, 'write');
  assert.equal(writeContextMemory.flags.find((flag) => flag.name === 'file')?.required, true);
  assert.match(writeContextMemory.flags.find((flag) => flag.name === 'file')?.desc ?? '', /Required/);
  assert.throws(
    () => writeContextMemory.validate?.(ctx({})),
    /--file is required/,
  );
  assert.throws(
    () => writeContextMemory.validate?.(ctx({ file: '   ' })),
    /--file is required/,
  );
  const reservedRemainderPaths = [
    '.Claude/User-Memories.md',
    path.join(os.tmpdir(), 'agent-session', '.CLAUDE', 'USER-MEMORIES.MD'),
  ];
  for (const file of reservedRemainderPaths) {
    assert.throws(
      () => writeContextMemory.validate?.(ctx({ file })),
      /--file must not target \.claude\/user-memories\.md/,
    );
    assert.throws(
      () => writeContextMemory.dryRun?.(ctx({ file })),
      /--file must not target \.claude\/user-memories\.md/,
    );
  }
  for (const limit of [0, 1.5, 51]) {
    assert.throws(
      () => writeContextMemory.validate?.(ctx({ file: 'AGENTS.md', limit })),
      /--limit must be an integer between 1 and 50/,
    );
  }
  const writeContextWithoutEnv = writeContextMemory.dryRun!(ctx({ file: 'AGENTS.md' }));
  assert.equal(writeContextWithoutEnv.method, 'WRITE');
  assert.equal(writeContextWithoutEnv.url, 'AGENTS.md');
  assert.equal(writeContextWithoutEnv.body?.agentId, 'system-default-agent');
  assert.equal(Object.hasOwn(writeContextWithoutEnv.body ?? {}, 'limit'), false);
  assert.deepEqual(writeContextWithoutEnv.body?.markers, [managedStart, managedEnd]);

  process.env.TE_AGENT_CURRENT_AGENT_ID = 'agent-env';
  process.env.TE_AGENT_CURRENT_SESSION_SELECTION_JSON = JSON.stringify({
    model: 'glm-5.2::company',
    skillIds: ['skill-1'],
  });

  const createFromEnv = createMemory.dryRun!(ctx({ content: '默认用中文回答' }));
  assert.equal(createFromEnv.body?.agentId, 'agent-env');

  const submitFromEnv = submitCandidatesMemory.dryRun!(
    ctx({
      candidatesJson: candidateJson,
      sourceType: 'local_conversation',
      sourceAgent: 'codex',
      sourceSessionId: 'local-session-1',
    }),
  );
  assert.equal(submitFromEnv.body?.scopeType, 'agent');
  assert.equal(submitFromEnv.body?.agentId, 'agent-env');
  assert.equal(submitFromEnv.body?.sourceSessionId, 'local-session-1');

  const extractFromEnv = extractMemory.dryRun!(ctx({ sessionId: 'session-env' }));
  assert.equal(extractFromEnv.body?.agentId, 'agent-env');

  const contextFromEnv = contextMemory.dryRun!(ctx({}));
  assert.equal(contextFromEnv.body?.agentId, 'agent-env');

  const writeContextFromEnv = writeContextMemory.dryRun!(ctx({ file: 'AGENTS.md' }));
  assert.equal(writeContextFromEnv.body?.agentId, 'agent-env');
  assert.equal(Object.hasOwn(writeContextFromEnv.body ?? {}, 'limit'), false);

  const writeContextExplicit = writeContextMemory.dryRun!(
    ctx({ file: 'CLAUDE.md', agentId: 'agent-explicit', limit: 7 }),
  );
  assert.equal(writeContextExplicit.url, 'CLAUDE.md');
  assert.equal(writeContextExplicit.body?.agentId, 'agent-explicit');
  assert.equal(writeContextExplicit.body?.limit, 7);

  const markUsedFromEnv = markUsedMemory.dryRun!(ctx({ ids: ['memory-env'] }));
  assert.equal(markUsedFromEnv.url, memoryUrl('memories/use'));
  assert.deepEqual(markUsedFromEnv.body, {
    agentId: 'agent-env',
    ids: ['memory-env'],
  });

  const defaultSaveFromEnv = defaultSaveMemory.dryRun!(ctx({}));
  assert.equal(defaultSaveFromEnv.method, 'PUT');
  assert.equal(defaultSaveFromEnv.url, memoryUrl('memories/defaults?agentId=agent-env'));
  assert.deepEqual(defaultSaveFromEnv.body, {
    selection: {
      model: 'glm-5.2::company',
      skillIds: ['skill-1'],
    },
  });

  const defaultSaveExplicit = defaultSaveMemory.dryRun!(
    ctx({
      agentId: 'agent-explicit',
      selectionJson: JSON.stringify({ model: 'model-explicit' }),
    }),
  );
  assert.equal(defaultSaveExplicit.method, 'PUT');
  assert.equal(defaultSaveExplicit.url, memoryUrl('memories/defaults?agentId=agent-explicit'));
  assert.deepEqual(defaultSaveExplicit.body, {
    selection: { model: 'model-explicit' },
  });

  const defaultGetDryRun = defaultGetMemory.dryRun!(ctx({ agentId: 'agent-explicit' }));
  assert.equal(defaultGetDryRun.method, 'GET');
  assert.equal(defaultGetDryRun.url, memoryUrl('memories/defaults?agentId=agent-explicit'));

  const defaultClearDryRun = defaultClearMemory.dryRun!(ctx({ agentId: 'agent-explicit' }));
  assert.equal(defaultClearDryRun.method, 'DELETE');
  assert.equal(defaultClearDryRun.url, memoryUrl('memories/defaults?agentId=agent-explicit'));
} finally {
  if (originalAgentId === undefined) {
    delete process.env.TE_AGENT_CURRENT_AGENT_ID;
  } else {
    process.env.TE_AGENT_CURRENT_AGENT_ID = originalAgentId;
  }
  if (originalSelection === undefined) {
    delete process.env.TE_AGENT_CURRENT_SESSION_SELECTION_JSON;
  } else {
    process.env.TE_AGENT_CURRENT_SESSION_SELECTION_JSON = originalSelection;
  }
}

console.log('memory command tests passed');
