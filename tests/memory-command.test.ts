import assert from 'node:assert/strict';
import memoryCommands, {
  createMemory,
  deleteMemory,
  extractMemory,
  listMemoryJobs,
  listMemorySources,
  listMemories,
  retiredPendingApprove,
  submitMemoryCandidate,
  updateMemorySettings,
} from '../src/commands/memory/index.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
import { CliValidationError } from '../src/core/errors.ts';

const HOST = 'http://localhost:3000';

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => typeof values[name] === 'string' ? String(values[name]) : '',
    num: (name) => typeof values[name] === 'number' ? Number(values[name]) : 0,
    optionalNum: (name) => typeof values[name] === 'number' ? Number(values[name]) : undefined,
    bool: (name) => values[name] === true,
    json: (name) => values[name],
    list: () => [],
    api: async () => { throw new Error('not used'); },
    communityReport: async () => { throw new Error('not used'); },
    localDataUpload: async () => { throw new Error('not used'); },
    querySql: async () => { throw new Error('not used'); },
    queryReportData: async () => { throw new Error('not used'); },
    token: async () => '',
    host: () => HOST,
    mcpUrl: () => undefined,
    service: () => 'memory',
    out: async () => {},
  };
}

const visibleCommands = memoryCommands.filter((command) => !command.hidden);
assert.deepEqual(
  visibleCommands.map((command) => command.command),
  [
    '+list', '+get', '+create', '+update', '+delete', '+history', '+pin', '+unpin', '+restore',
    '+context', '+extract', '+source-list', '+job-list', '+job-get', '+draft-list', '+draft-get', '+draft-update', '+draft-delete',
    '+draft-submit', '+candidate-list', '+candidate-get', '+candidate-submit', '+candidate-approve',
    '+candidate-reject', '+candidate-withdraw', '+candidate-resubmit', '+settings-get', '+settings-update',
  ],
);

const retired = memoryCommands.filter((command) => command.hidden);
assert.deepEqual(
  retired.map((command) => command.command),
  ['+submit-candidates', '+pending-list', '+pending-approve', '+pending-reject', '+organize', '+default-get', '+default-save', '+default-clear', '+mark-used', '+write-context'],
);
const retiredApprove = retired.find((command) => command.command === '+pending-approve')!;
assert.equal(retiredPendingApprove, retiredApprove);
assert.ok(retiredApprove.flags.some((flag) => flag.name === 'id'));
await assert.rejects(
  () => retiredApprove.execute(ctx({ id: 'old-memory-id' })),
  (error: unknown) => error instanceof CliValidationError &&
    error.code === 'MEMORY_COMMAND_RETIRED' &&
    error.hint === 'Use ae-cli memory +candidate-approve.',
);

delete process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID;
delete process.env.TE_AGENT_CONVERSATION_ID;
assert.throws(() => listMemories.dryRun?.(ctx({ status: 'active', limit: 20 })), /Memory target is required/);

const listPreview = listMemories.dryRun!(ctx({ workspaceId: 'space-1', status: 'active', query: 'launch', limit: 10 }));
assert.equal(listPreview.method, 'GET');
assert.equal(listPreview.url, `${HOST}/agent/api/cli/memory/v2/agent-spaces/space-1/memories?status=active&query=launch&limit=10`);
assert.equal(listPreview.params?.target_url, `${HOST}/agent/api/cli/memory/v2/target?agentSpaceId=space-1`);

const createPreview = createMemory.dryRun!(ctx({ workspaceId: 'space-1', title: 'Preference', content: 'Prefer direct answers' }));
assert.deepEqual(createPreview.body, {
  title: 'Preference',
  content: 'Prefer direct answers',
  scopeType: 'space',
  agentId: null,
});
assert.equal(createMemory.flags.some((flag) => flag.name === 'scope' || flag.name === 'agent-id'), false);

assert.equal(deleteMemory.risk, 'high-risk-write');
assert.throws(() => deleteMemory.validate?.(ctx({ workspaceId: 'space-1', id: 'memory-1', version: 0 })), /positive integer/);
const deletePreview = deleteMemory.dryRun!(ctx({ workspaceId: 'space-1', id: 'memory-1', version: 3 }));
assert.match(deletePreview.url, /memories\/memory-1\/delete$/);
assert.deepEqual(deletePreview.body, { version: 3 });

assert.throws(
  () => submitMemoryCandidate.validate?.(ctx({ workspaceId: 'space-1', content: 'New memory', targetMemoryId: 'memory-1' })),
  /must be provided together/,
);
const candidatePreview = submitMemoryCandidate.dryRun!(ctx({ workspaceId: 'space-1', content: 'New memory', targetMemoryId: 'memory-1', targetMemoryVersion: 2 }));
assert.deepEqual(candidatePreview.body, {
  content: 'New memory',
  scopeType: 'space',
  agentId: null,
  targetMemoryId: 'memory-1',
  targetMemoryVersion: 2,
});

const settingsPreview = updateMemorySettings.dryRun!(ctx({ workspaceId: 'space-1', autoExtractionEnabled: false }));
assert.deepEqual(settingsPreview.body, { autoExtractionEnabled: false });

assert.throws(() => extractMemory.validate?.(ctx({ workspaceId: 'space-1' })), /conversation-id is required/);
const extractPreview = extractMemory.dryRun!(ctx({ workspaceId: 'space-1', conversationId: 'conversation-1' }));
assert.deepEqual(extractPreview.body, { conversationId: 'conversation-1' });

const sourcesPreview = listMemorySources.dryRun!(ctx({ workspaceId: 'space-1', cursor: 'conversation-1', limit: 10 }));
assert.equal(sourcesPreview.url, `${HOST}/agent/api/cli/memory/v2/agent-spaces/space-1/sources?cursor=conversation-1&limit=10`);

const jobsPreview = listMemoryJobs.dryRun!(ctx({ workspaceId: 'space-1', conversationId: 'conversation-1', limit: 20 }));
assert.equal(jobsPreview.url, `${HOST}/agent/api/cli/memory/v2/agent-spaces/space-1/jobs?conversationId=conversation-1&limit=20`);

console.log('memory command tests passed');
