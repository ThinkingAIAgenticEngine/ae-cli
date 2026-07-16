# DataOps CLI Download Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `dataops_ide +get_sql_query_status --downloadTo` download SQL result files with `cli-token` only, while enforcing space and task ownership in Gaia.

**Architecture:** Gaia adds a binary download endpoint under the existing `/api/cli/v1/gaia/ide` controller, so `CliAuthHandlerInterceptor` supplies the current user before the controller checks space access and task ownership. te-cli adds a binary DataOps transport helper with the same CLI-token and 401/403 semantics as JSON DataOps calls, then uses it from the existing status command.

**Tech Stack:** TypeScript ESM, Node.js >= 18, Java 11, Spring Boot 2.6.15, JUnit 4, Mockito, Maven.

## Global Constraints

- The public download route is `GET /api/cli/dataops/v1/gaia/ide/sql-query-download` in te-cli and `GET /api/cli/v1/gaia/ide/sql-query-download` inside Gaia.
- Query parameters remain `spaceCode` and `taskId`; no new CLI flag is added.
- Download authentication uses only the `cli-token` request header; no `Authorization` header and no token query parameter.
- HTTP 401 clears the CLI token and retries once; HTTP 403 throws `PermissionError` without retrying.
- Gaia validates login identity, space access, and task ownership (`spaceCode + openId + taskId`) before streaming a file.
- The existing `/v1/gaia/task/async/download` route remains available for frontend compatibility.
- CLI source strings, comments, descriptions, and user-visible output remain English.
- Do not modify unrelated DataOps commands, MCP authentication, frontend authentication, or td-auth starter code.

---

### Task 1: Add the Gaia CLI-token SQL result download endpoint

**Files:**
- Create: `/Users/felix/app/githubsourceWorkspace/gaia/gaia-start/src/test/java/cn/thinkingdata/gaia/mcp/ide/controller/IdeMcpControllerDownloadTest.java`
- Create: `/Users/felix/app/githubsourceWorkspace/gaia/gaia-start/src/test/java/cn/thinkingdata/gaia/mcp/ide/service/McpIdeExecuteServiceV2DownloadTest.java`
- Create: `/Users/felix/app/githubsourceWorkspace/gaia/gaia-start/src/test/java/cn/thinkingdata/gaia/application/service/back/task/service/AsyncTaskServiceDownloadTest.java`
- Modify: `/Users/felix/app/githubsourceWorkspace/gaia/gaia-mcp/gaia-mcp-ide/src/main/java/cn/thinkingdata/gaia/mcp/ide/controller/IdeMcpController.java`
- Modify: `/Users/felix/app/githubsourceWorkspace/gaia/gaia-mcp/gaia-mcp-ide/src/main/java/cn/thinkingdata/gaia/mcp/ide/service/McpIdeExecuteServiceV2.java`
- Modify: `/Users/felix/app/githubsourceWorkspace/gaia/gaia-api/src/main/java/cn/thinkingdata/gaia/api/controller/task/AsyncTaskController.java`
- Modify: `/Users/felix/app/githubsourceWorkspace/gaia/gaia-application/src/main/java/cn/thinkingdata/gaia/application/service/back/task/service/AsyncTaskService.java`

**Interfaces:**
- Consumes: `McpControllerAuthHelper.requireSpaceAuth(String)`, `TaAuthDO.getOperatorOpenId()`, `DownloadCenterResourcesDAO.getTasksById(String, String, List<Long>)`.
- Produces: `IdeMcpController.downloadSqlQueryResult(String, Long, HttpServletResponse)` and `McpIdeExecuteServiceV2.downloadQueryResult(String, Long, TaAuthDO, HttpServletResponse)`.
- Changes: `AsyncTaskService.taskFileDownload` becomes `taskFileDownload(String spaceCode, String openId, long taskId, HttpServletResponse response)`.

- [ ] **Step 1: Write the failing controller test**

Create `IdeMcpControllerDownloadTest.java` with this complete content:

```java
package cn.thinkingdata.gaia.mcp.ide.controller;

import cn.thinkingdata.gaia.application.service.ide.IdeDictService;
import cn.thinkingdata.gaia.domain.external.ta.TaAuthDO;
import cn.thinkingdata.gaia.mcp.common.controller.McpControllerAuthHelper;
import cn.thinkingdata.gaia.mcp.ide.service.McpIdeExecuteServiceV2;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import javax.servlet.http.HttpServletResponse;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class IdeMcpControllerDownloadTest {
    @Mock private IdeDictService ideDictService;
    @Mock private McpIdeExecuteServiceV2 executeService;
    @Mock private McpControllerAuthHelper authHelper;
    @Mock private TaAuthDO authDO;
    @Mock private HttpServletResponse response;
    @InjectMocks private IdeMcpController controller;

    @Test
    public void downloadSqlQueryResultChecksSpaceAuthBeforeDownload() {
        when(authHelper.requireSpaceAuth("test_ly")).thenReturn(authDO);

        controller.downloadSqlQueryResult("test_ly", 40L, response);

        InOrder inOrder = inOrder(authHelper, executeService);
        inOrder.verify(authHelper).requireSpaceAuth("test_ly");
        inOrder.verify(executeService).downloadQueryResult("test_ly", 40L, authDO, response);
    }
}
```

- [ ] **Step 2: Write the failing status metadata test**

Create `McpIdeExecuteServiceV2DownloadTest.java` with this complete content:

```java
package cn.thinkingdata.gaia.mcp.ide.service;

import cn.thinkingdata.gaia.api.websocket.item.IdeProcessCheck;
import cn.thinkingdata.gaia.application.service.back.task.service.AsyncTaskService;
import cn.thinkingdata.gaia.application.service.ide.IdeService;
import cn.thinkingdata.gaia.application.service.space.SpaceService;
import cn.thinkingdata.gaia.application.utils.ParamUtilService;
import cn.thinkingdata.gaia.domain.external.bs.BaseServerClient;
import cn.thinkingdata.gaia.domain.external.ta.TaAuthDO;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.Collections;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class McpIdeExecuteServiceV2DownloadTest {
    @Mock private SpaceService spaceService;
    @Mock private ParamUtilService paramUtilService;
    @Mock private IdeProcessCheck ideProcessCheck;
    @Mock private IdeService ideService;
    @Mock private AsyncTaskService asyncTaskService;
    @Mock private BaseServerClient baseServerClient;
    @Mock private TaAuthDO authDO;
    @InjectMocks private McpIdeExecuteServiceV2 service;

@Test
public void getQueryStatusReturnsCliGatewayDownloadPath() {
    when(authDO.getOperatorOpenId()).thenReturn("ou_test");
    when(asyncTaskService.asyncTaskProgressList("test_ly", "ou_test", Collections.singletonList(40L)))
            .thenReturn(Collections.emptyList());

    Map<String, Object> result = service.getQueryStatus("test_ly", 40L, null, authDO);

    assertEquals("/api/cli/dataops/v1/gaia/ide/sql-query-download", result.get("downloadApi"));
    assertEquals("test_ly", ((Map<?, ?>) result.get("downloadParams")).get("spaceCode"));
    assertEquals(40L, ((Map<?, ?>) result.get("downloadParams")).get("taskId"));
}
}
```

- [ ] **Step 3: Write the failing task ownership test**

Create `AsyncTaskServiceDownloadTest.java` with this complete content:

```java
package cn.thinkingdata.gaia.application.service.back.task.service;

import cn.thinkingdata.gaia.application.helper.redis.RedisService;
import cn.thinkingdata.gaia.domain.back.task.dao.DownloadCenterResourcesDAO;
import cn.thinkingdata.gaia.domain.external.ta.config.TaSoftwareConfigDomain;
import cn.thinkingdata.ta.hdfs.common.HdfsConfig;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import javax.servlet.http.HttpServletResponse;
import java.util.Collections;

import static org.junit.Assert.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class AsyncTaskServiceDownloadTest {
    @Mock private AsyncSqlExecuteService asyncSqlExecuteService;
    @Mock private DownloadCenterResourcesDAO downloadCenterResourcesDAO;
    @Mock private TaSoftwareConfigDomain taSoftwareConfigDomain;
    @Mock private HdfsConfig hdfsConfig;
    @Mock private RedisService redisService;
    @Mock private HttpServletResponse response;
    @InjectMocks private AsyncTaskService service;

@Test
public void taskFileDownloadScopesTaskLookupToSpaceAndOwner() {
    when(downloadCenterResourcesDAO.getTasksById("test_ly", "ou_test", Collections.singletonList(40L)))
            .thenReturn(Collections.emptyList());

    assertThrows(RuntimeException.class,
            () -> service.taskFileDownload("test_ly", "ou_test", 40L, response));

    verify(downloadCenterResourcesDAO)
            .getTasksById("test_ly", "ou_test", Collections.singletonList(40L));
    verify(downloadCenterResourcesDAO, never()).getTaskById(anyLong());
}
}
```

- [ ] **Step 4: Run the focused tests to verify RED**

Run:

```bash
mvn -pl gaia-start -Dtest=IdeMcpControllerDownloadTest,McpIdeExecuteServiceV2DownloadTest,AsyncTaskServiceDownloadTest test
```

Expected: test compilation fails because the new controller/service methods and the owner-scoped `taskFileDownload` signature do not exist. After the missing-method failures are implemented, the metadata assertion must still prove that the old `/v1/gaia/task/async/download` path was replaced.

- [ ] **Step 5: Implement the controller and IDE service methods**

In `IdeMcpController.java`, import `HttpServletResponse` and add:

```java
@GetMapping("/sql-query-download")
public void downloadSqlQueryResult(@RequestParam("spaceCode") String spaceCode,
                                   @RequestParam("taskId") Long taskId,
                                   HttpServletResponse response) {
    TaAuthDO authDo = authHelper.requireSpaceAuth(spaceCode);
    mcpIdeExecuteServiceV2.downloadQueryResult(spaceCode, taskId, authDo, response);
}
```

In `McpIdeExecuteServiceV2.java`, change the constant and add the method:

```java
private static final String DOWNLOAD_API = "/api/cli/dataops/v1/gaia/ide/sql-query-download";

public void downloadQueryResult(String spaceCode, Long taskId, TaAuthDO authDO,
                                HttpServletResponse response) {
    asyncTaskService.taskFileDownload(spaceCode, authDO.getOperatorOpenId(), taskId, response);
}
```

- [ ] **Step 6: Enforce task ownership in AsyncTaskService**

Change the method signature and replace the primary-key lookup:

```java
public void taskFileDownload(String spaceCode, String openId, long taskId,
                             HttpServletResponse response) {
    List<DownloadCenterResource> tasks =
            downloadCenterResourcesDAO.getTasksById(
                    spaceCode, openId, Collections.singletonList(taskId));
    DownloadCenterResource task = CollectionUtils.isEmpty(tasks) ? null : tasks.get(0);
    checkExist(task, "async Task(taskId)");
    String taskCode = task.getTaskCode();
}
```

Keep the method's existing HDFS path, response header, and stream-copy statements after `String taskCode = task.getTaskCode();`. Rename its remaining two `taBackTack` references to `task`:

```java
String zipFileName = task.getTaskName().replaceAll(" ", "_") + ".zip";
```

Update `AsyncTaskController` to call:

```java
asyncTaskService.taskFileDownload(spaceCode, openId, taskId, response);
```

- [ ] **Step 7: Run focused tests to verify GREEN**

Run:

```bash
mvn -pl gaia-start -am -DskipTests install
mvn -pl gaia-start -Dtest=IdeMcpControllerDownloadTest,McpIdeExecuteServiceV2DownloadTest,AsyncTaskServiceDownloadTest test
```

Expected: the current reactor artifacts install successfully, then all three test classes pass with zero failures.

- [ ] **Step 8: Compile the Gaia reactor**

Run:

```bash
mvn -pl gaia-start -am -DskipTests compile
```

Expected: all 16 reactor modules report `SUCCESS` and Maven reports `BUILD SUCCESS`.

- [ ] **Step 9: Commit Gaia changes**

```bash
git add gaia-start/src/test/java/cn/thinkingdata/gaia/mcp/ide/controller/IdeMcpControllerDownloadTest.java \
  gaia-start/src/test/java/cn/thinkingdata/gaia/mcp/ide/service/McpIdeExecuteServiceV2DownloadTest.java \
  gaia-start/src/test/java/cn/thinkingdata/gaia/application/service/back/task/service/AsyncTaskServiceDownloadTest.java \
  gaia-mcp/gaia-mcp-ide/src/main/java/cn/thinkingdata/gaia/mcp/ide/controller/IdeMcpController.java \
  gaia-mcp/gaia-mcp-ide/src/main/java/cn/thinkingdata/gaia/mcp/ide/service/McpIdeExecuteServiceV2.java \
  gaia-api/src/main/java/cn/thinkingdata/gaia/api/controller/task/AsyncTaskController.java \
  gaia-application/src/main/java/cn/thinkingdata/gaia/application/service/back/task/service/AsyncTaskService.java
git commit -m "fix: 统一 DataOps SQL 下载鉴权"
```

---

### Task 2: Download SQL result bytes with cli-token in te-cli

**Files:**
- Modify: `/Users/felix/app/WebstormProjects/te-cli/tests/dataops-integration.test.ts`
- Modify: `/Users/felix/app/WebstormProjects/te-cli/src/commands/te-dataops/shared.ts`
- Modify: `/Users/felix/app/WebstormProjects/te-cli/src/commands/te-dataops/ide/get-sql-query-status.ts`

**Interfaces:**
- Consumes: `getCliToken(host)`, `clearCliToken(host)`, `PermissionError`, existing `downloadParams.spaceCode/taskId`.
- Produces: `downloadDataopsApi(ctx, path, params): Promise<Buffer>`.
- Preserves: `getSqlQueryStatus.execute(ctx)` output, including `localFile` after a successful write.

- [ ] **Step 1: Repair the existing focused-test credential setup**

Replace the removed `clearToken/saveToken` import with current secure-store APIs:

```ts
import { clear as clearSecureToken, save as saveSecureToken } from '../src/core/secure-store.js';
```

In the existing 401 retry test, seed and clean up a real `TokenPayload`:

```ts
saveSecureToken(host, {
  accessToken: 'fake-access-token-for-dataops-401-test',
  refreshToken: '',
  accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
});
```

Replace the setup `clearToken(host)` with `clearSecureToken(host)`, and replace the cleanup `clearToken(host)` with this exact pair so both credentials are removed:

```ts
clearCliToken(host);
clearSecureToken(host);
```

Do not change the test's request count or token assertions.

Run `npx tsx tests/dataops-integration.test.ts` and expect the existing tests to pass before adding the regression.

- [ ] **Step 2: Write the failing cli-token-only download regression**

Add these imports:

```ts
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSqlQueryStatus } from '../src/commands/te-dataops/ide/get-sql-query-status.js';
```

Change the context factory signature and `token` member exactly as follows:

```ts
function ctx(
  values: Record<string, string>,
  hostUrl = 'http://example.test',
  token: () => Promise<string> = async () => '',
): RuntimeContext {
  return {
    str: (name) => values[name] ?? '',
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined || values[name] === '' ? undefined : Number(values[name]),
    bool: () => false,
    json: () => undefined,
    api: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token,
    host: () => hostUrl,
    mcpUrl: () => undefined,
    service: () => 'dataops_integration',
    out: () => undefined,
  };
}
```

Append this complete regression test:

```ts
await test('get_sql_query_status downloads with cli-token and never requests an access token', async () => {
  const host = 'https://test-dataops-download.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-'));
  const targetFile = join(targetDir, 'result.zip');
  const expected = Buffer.from('zip-result');
  clearCliToken(host);
  setCliTokenManual('cli-download-token', host);

  let accessTokenCalls = 0;
  const requestUrls: string[] = [];
  const requestHeaders: Record<string, string>[] = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    requestUrls.push(String(url));
    requestHeaders.push((init?.headers as Record<string, string>) ?? {});
    if (String(url).includes('/sql-query-status')) {
      return new Response(JSON.stringify({
        returnCode: 0,
        data: {
          downloadStatus: 'SUCCESS',
          downloadParams: { spaceCode: 'test_ly', taskId: 40 },
        },
      }), { status: 200 });
    }
    return new Response(expected, { status: 200 });
  }) as typeof fetch;

  try {
    const result = await getSqlQueryStatus.execute(ctx({
      spaceCode: 'test_ly',
      downloadTaskId: '40',
      downloadTo: targetFile,
    }, host, async () => {
      accessTokenCalls++;
      throw new Error('access token must not be requested');
    }));

    assert.equal(accessTokenCalls, 0);
    assert.equal((result as any).localFile, targetFile);
    assert.deepEqual(await readFile(targetFile), expected);
    assert.match(requestUrls[1], /\/api\/cli\/dataops\/v1\/gaia\/ide\/sql-query-download/);
    assert.match(requestUrls[1], /spaceCode=test_ly/);
    assert.match(requestUrls[1], /taskId=40/);
    assert.equal(requestHeaders[1]['cli-token'], 'cli-download-token');
    assert.equal(requestHeaders[1].Authorization, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run the regression to verify RED**

Run:

```bash
npx tsx tests/dataops-integration.test.ts
```

Expected: the new test fails with `access token must not be requested`, proving the current download branch still calls `ctx.token()`.

- [ ] **Step 4: Add the binary DataOps transport helper**

In `shared.ts`, export:

```ts
export async function downloadDataopsApi(
  ctx: RuntimeContext,
  path: string,
  params: Record<string, unknown>,
  retry = true,
): Promise<Buffer> {
  const host = resolveHost(ctx.host());
  const token = await getCliToken(host);
  const url = buildUrl(host, path, compactArgs(params));
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'cli-token': token,
      'Accept': '*/*',
      'X-Source': 'ae-cli',
    },
  });

  if (resp.status === 403) {
    const data = parseResponseBody(await resp.text(), url, resp.status, true);
    throw new PermissionError(permissionMessage(data));
  }
  if (resp.status === 401 && retry) {
    clearCliToken(host);
    return downloadDataopsApi(ctx, path, params, false);
  }
  if (!resp.ok) {
    const data = parseResponseBody(await resp.text(), url, resp.status, true);
    throw new Error(formatHttpError(resp.status, resp.statusText, data));
  }
  return Buffer.from(await resp.arrayBuffer());
}
```

Keep it in the existing DataOps transport file so binary and JSON calls share host, URL, token, and permission semantics.

- [ ] **Step 5: Switch the SQL status command to the CLI download route**

In `get-sql-query-status.ts`, remove the access-token/host imports and use:

```ts
const downloadPath = '/api/cli/dataops/v1/gaia/ide/sql-query-download';

async function downloadResult(ctx: RuntimeContext, data: any, targetPath: string): Promise<string> {
  const params = data?.downloadParams ?? {};
  const bytes = await downloadDataopsApi(ctx, downloadPath, {
    spaceCode: params.spaceCode,
    taskId: params.taskId,
  });
  const absPath = path.resolve(targetPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, bytes);
  return absPath;
}
```

- [ ] **Step 6: Run focused tests to verify GREEN**

Run:

```bash
npx tsx tests/dataops-integration.test.ts
```

Expected: all existing tests and the new cli-token-only download regression pass.

- [ ] **Step 7: Run te-cli verification**

Run:

```bash
npm test
npm run build
```

Expected: the help smoke test and TypeScript build both exit 0.

- [ ] **Step 8: Commit te-cli changes**

```bash
git add tests/dataops-integration.test.ts \
  src/commands/te-dataops/shared.ts \
  src/commands/te-dataops/ide/get-sql-query-status.ts
git commit -m "fix: 统一 DataOps SQL 下载鉴权"
```

---

## Final Cross-Repository Verification

Run from te-cli:

```bash
npx tsx tests/dataops-integration.test.ts
npm test
npm run build
```

Run from Gaia:

```bash
mvn -pl gaia-start -Dtest=IdeMcpControllerDownloadTest,McpIdeExecuteServiceV2DownloadTest,AsyncTaskServiceDownloadTest test
mvn -pl gaia-start -am -DskipTests compile
```

Inspect both diffs and confirm:

- te-cli contains no `ctx.token()` or `accessToken` use in the SQL result download path.
- the new external and internal route strings match exactly across repositories.
- Gaia owner-scoped lookup includes `spaceCode`, `openId`, and `taskId`.
- no token value is logged or placed in a URL.
