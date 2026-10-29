import assert from 'node:assert/strict';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.ts';
import { callMcpTool } from '../src/core/mcp.ts';

const host = 'https://test-community-int64.internal';
clearCliToken(host);
setCliTokenManual('cli-community-int64-token', host);

let capturedBody = '';
const previousFetch = globalThis.fetch;
globalThis.fetch = (async (_url, init) => {
  capturedBody = String(init?.body ?? '');
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    result: { content: [{ type: 'text', text: '{"data":[]}' }] },
  }), { status: 200 });
}) as typeof fetch;

try {
  await callMcpTool(
    `${host}/mcp/community/http/content`,
    'search_posts',
    {
      spaceId: 1940327799817117696n,
      param: {
        gameId: 1940327799817117696n,
        channelIdList: [1940327799817117696n],
      },
    },
    host,
  );
  assert.match(capturedBody, /"spaceId":1940327799817117696/);
  assert.match(capturedBody, /"gameId":1940327799817117696/);
  assert.match(capturedBody, /"channelIdList":\[1940327799817117696\]/);
  assert.doesNotMatch(capturedBody, /1940327799817117700/);
  process.stdout.write('MCP int64 request contract test passed\n');
} finally {
  globalThis.fetch = previousFetch;
  clearCliToken(host);
}
