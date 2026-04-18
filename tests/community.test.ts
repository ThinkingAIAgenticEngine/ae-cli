/**
 * Community CLI Commands Test Suite
 *
 * Tests all 18 community domain CLI commands with real API calls.
 *
 * Run with: npx tsx tests/community.test.ts
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'dist', 'index.js');
const DOMAIN = 'community';

// Expected commands matching MCP tool names (category + name)
const EXPECTED_COMMANDS = [
  // content (11)
  'get_livestream_list',
  'get_livestream_detail',
  'get_post_detail',
  'get_comments_summary',
  'get_comment_tag_analysis',
  'get_corpus_tags',
  'get_risk_content',
  'search_posts',
  'get_livestream_overview',
  'get_livestream_rooms',
  'get_livestream_room_metrics',
  // analysis (4)
  'get_channel_info',
  'get_overview_metrics',
  'get_sentiment_overview',
  'get_tag_trends',
  // hot (3)
  'get_daily_summary',
  'get_hot_topics',
  'get_topic_detail',
];

// CLI test cases with required arguments for real calls
const CLI_TEST_CASES: Record<string, { args: string[]; desc: string }> = {
  get_livestream_list: {
    args: ['--space-id', '1', '--game-id', '1'],
    desc: 'List live sessions',
  },
  get_livestream_detail: {
    args: ['--space-id', '1', '--game-id', '1', '--stream-id', 'test'],
    desc: 'Get livestream detail',
  },
  get_post_detail: {
    args: ['--space-id', '1', '--game-id', '1', '--channel-id', '1', '--uuid', 'test-uuid', '--resource-type', '0'],
    desc: 'Get post detail',
  },
  get_comments_summary: {
    args: ['--space-id', '1', '--game-id', '1', '--channel-id', '1', '--uuid', 'test-uuid'],
    desc: 'Get comments summary',
  },
  get_comment_tag_analysis: {
    args: ['--space-id', '1', '--game-id', '1', '--channel-id', '1', '--uuid', 'test-uuid', '--resource-type', '0', '--tag-code', 'test'],
    desc: 'Get comment tag analysis',
  },
  get_corpus_tags: {
    args: ['--space-id', '1', '--game-id', '1'],
    desc: 'Get corpus tags',
  },
  get_risk_content: {
    args: ['--space-id', '1', '--game-id', '1', '--start-time', '2026-04-01', '--end-time', '2026-04-07'],
    desc: 'Get risk content',
  },
  search_posts: {
    args: ['--space-id', '1', '--game-id', '1', '--start-time', '2026-04-01', '--end-time', '2026-04-07'],
    desc: 'Search posts',
  },
  get_livestream_overview: {
    args: ['--space-id', '1', '--game-id', '1', '--start-time', '2026-04-01', '--end-time', '2026-04-07'],
    desc: 'Get livestream overview',
  },
  get_livestream_rooms: {
    args: ['--space-id', '1', '--game-id', '1'],
    desc: 'Get livestream rooms',
  },
  get_livestream_room_metrics: {
    args: ['--space-id', '1', '--game-id', '1', '--channel-id', '1', '--room-id', 'test-room'],
    desc: 'Get livestream room metrics',
  },
  get_channel_info: {
    args: ['--space-id', '1', '--game-id', '1'],
    desc: 'Get channel info',
  },
  get_overview_metrics: {
    args: ['--space-id', '1', '--game-id', '1', '--start-time', '2026-04-01', '--end-time', '2026-04-07'],
    desc: 'Get overview metrics',
  },
  get_sentiment_overview: {
    args: ['--space-id', '1', '--game-id', '1', '--start-time', '2026-04-01', '--end-time', '2026-04-07'],
    desc: 'Get sentiment overview',
  },
  get_tag_trends: {
    args: ['--space-id', '1', '--game-id', '1', '--tag-code', 'test'],
    desc: 'Get tag trends',
  },
  get_daily_summary: {
    args: ['--space-id', '1', '--game-id', '1', '--date', '2026-04-01'],
    desc: 'Get daily summary',
  },
  get_hot_topics: {
    args: ['--space-id', '1', '--game-id', '1'],
    desc: 'Get hot topics',
  },
  get_topic_detail: {
    args: ['--space-id', '1', '--game-id', '1', '--topic-id', 'test', '--start-time', '2026-04-01', '--end-time', '2026-04-07'],
    desc: 'Get topic detail',
  },
};

let passed = 0;
let failed = 0;

function run(command: string, args: string[] = []): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${command} ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', status: 0 };
  } catch (e: any) {
    // When CLI exits with error, output is in stderr
    const output = e.stderr || e.stdout || '';
    // If output is empty, try to extract JSON from the error message
    if (!output && e.message) {
      const jsonMatch = e.message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { stdout: jsonMatch[0], stderr: '', status: e.status || 1 };
      }
    }
    return { stdout: output, stderr: e.stderr || '', status: e.status || 1 };
  }
}

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${message}`);
    failed++;
  }
}

function assertJsonResponse(res: { stdout: string; status: number }, desc: string): void {
  try {
    const json = JSON.parse(res.stdout);
    // Accept both success (ok: true) and error responses, as long as it's valid JSON
    const hasOkField = 'ok' in json;
    assert(hasOkField, `${desc} returns valid JSON response`);
  } catch {
    assert(false, `${desc} returns valid JSON response`);
  }
}

console.log('\x1b[1mCommunity CLI Commands Test Suite\x1b[0m\n');

// Test 1: Help displays all commands
console.log('\x1b[33m[Test 1]\x1b[0m Help displays all commands');
const helpOutput = run(`${DOMAIN} --help`);
for (const cmd of EXPECTED_COMMANDS) {
  assert(helpOutput.stdout.includes(cmd), `Command "${cmd}" appears in help`);
}

// Test 2: All commands are registered
console.log('\n\x1b[33m[Test 2]\x1b[0m All commands are registered');
for (const cmd of EXPECTED_COMMANDS) {
  const output = run(`${DOMAIN} ${cmd} --help`);
  assert(!output.stdout.includes('error: unknown command'), `Command "${cmd}" is registered`);
}

// Test 3: Real CLI calls for all commands
console.log('\n\x1b[33m[Test 3]\x1b[0m Real CLI calls');
for (const [cmd, testCase] of Object.entries(CLI_TEST_CASES)) {
  const res = run(`${DOMAIN} ${cmd}`, testCase.args);
  assertJsonResponse(res, testCase.desc);
}

// Test 4: Commands with required flags
console.log('\n\x1b[33m[Test 4]\x1b[0m Missing required flags');
const missingRequiredCases = [
  { cmd: 'get_risk_content', args: ['--space-id', '1', '--game-id', '1'], missing: '--start-time' },
  { cmd: 'search_posts', args: ['--space-id', '1', '--game-id', '1'], missing: '--start-time' },
  { cmd: 'get_overview_metrics', args: ['--space-id', '1', '--game-id', '1'], missing: '--start-time' },
  { cmd: 'get_sentiment_overview', args: ['--space-id', '1', '--game-id', '1'], missing: '--start-time' },
];
for (const tc of missingRequiredCases) {
  const res = run(`${DOMAIN} ${tc.cmd}`, tc.args);
  const hasError = res.stdout.includes('Missing required flag');
  assert(hasError, `${tc.cmd} requires ${tc.missing}`);
}

// Test 5: JSON definitions exist for all commands
console.log('\n\x1b[33m[Test 5]\x1b[0m JSON definitions exist for all commands');
try {
  const jsonPath = join(process.cwd(), 'mcp2cli', 'community-mcp-tool-definitions.json');
  const jsonContent = readFileSync(jsonPath, 'utf-8');
  const definitions = JSON.parse(jsonContent);

  const jsonToolNames = definitions.map((d: any) => `${d.category}_${d.name}`);
  for (const cmd of EXPECTED_COMMANDS) {
    assert(jsonToolNames.includes(cmd), `Command "${cmd}" exists in JSON definitions`);
  }
} catch (e: any) {
  console.log(`  \x1b[31m✗\x1b[0m Failed to load JSON definitions: ${e.message}`);
  failed++;
}

// Summary
console.log('\n\x1b[1m-------------------\x1b[0m');
console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);

if (failed > 0) {
  process.exit(1);
}
