import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "src/index.ts", "--no-update-check", ...args],
      {
        cwd: ROOT,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

test("kb +import submits an async task and +import-status reads its terminal state", async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "ae-cli-kb-import-"));
  const archivePath = path.join(temporaryRoot, "knowledge-base.zip");
  writeFileSync(archivePath, Buffer.from("zip bytes"));

  let received;
  const receivedTokens = [];
  let requestCount = 0;
  let unauthorizedRequestCount = 0;
  let tokenFilePath;
  let responseMode = "success";
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const isImportRequest = request.url?.startsWith(
        "/agent/api/external/knowledge-bases/import",
      );
      if (isImportRequest) {
        requestCount += 1;
        receivedTokens.push(request.headers["cli-token"]);
      }
      received = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      };
      if (responseMode === "unauthorized-once" && isImportRequest) {
        unauthorizedRequestCount += 1;
        if (unauthorizedRequestCount === 1) {
          writeFileSync(
            tokenFilePath,
            JSON.stringify({ url: host, token: "cli-kb-import-refreshed" }),
          );
          response.writeHead(401, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "CLI token expired" }));
          return;
        }
      }
      if (request.url?.includes("/knowledge-bases/import?requestId=")) {
        if (responseMode === "task-not-found") {
          response.writeHead(404, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              error: "Knowledge base import task not found",
              errorCode: "KB_SNAPSHOT_IMPORT_TASK_NOT_FOUND",
            }),
          );
          return;
        }
        if (responseMode === "task-empty-metadata") {
          response.writeHead(404, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              error: "Snapshot import status route not found",
              errorCode: "   ",
              hint: "   ",
            }),
          );
          return;
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          responseMode === "task-failed"
            ? JSON.stringify({
                requestId: "request-1",
                status: "failed",
                knowledgeBaseId: null,
                errorCode: "KB_SNAPSHOT_NAME_CONFLICT",
                errorMessage:
                  "A personal knowledge base with the same name already exists",
              })
            : JSON.stringify({
                requestId: "request-1",
                status: "succeeded",
                knowledgeBaseId: "kb-imported-1",
                errorCode: null,
                errorMessage: null,
              }),
        );
        return;
      }
      if (responseMode === "forbidden") {
        response.writeHead(403, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: "Snapshot import is not allowed for this user",
            errorCode: "KB_SNAPSHOT_IMPORT_FORBIDDEN",
          }),
        );
        return;
      }
      if (responseMode === "empty-metadata") {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: "Snapshot import route not found",
            errorCode: "   ",
            hint: "   ",
          }),
        );
        return;
      }
      if (responseMode === "legacy-add-error") {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: "Legacy source upload failed",
            errorCode: "SHOULD_NOT_SURFACE",
          }),
        );
        return;
      }
      response.writeHead(202, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          requestId: "request-1",
          status: "queued",
        }),
      );
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const host = `http://127.0.0.1:${address.port}`;
  const runtimeRoot = path.join(temporaryRoot, "runtime");
  mkdirSync(path.join(runtimeRoot, ".ae-config"), { recursive: true });
  tokenFilePath = path.join(runtimeRoot, ".ae-config", "cli-token.json");
  writeFileSync(
    tokenFilePath,
    JSON.stringify({ url: host, token: "cli-kb-import-test" }),
  );

  try {
    const result = await runCli(
      [
        "--host",
        host,
        "kb",
        "+import",
        "--file",
        archivePath,
        "--name",
        "Imported KB",
        "--description",
        "Read-only docs",
        "--tags",
        '["docs","product"]',
        "--project-id",
        "project-1",
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(output.data, {
      requestId: "request-1",
      status: "queued",
    });
    assert.equal(received.method, "POST");
    assert.equal(received.url, "/agent/api/external/knowledge-bases/import");
    assert.equal(received.headers["cli-token"], "cli-kb-import-test");
    assert.equal(received.headers.authorization, undefined);
    assert.match(
      received.headers["content-type"],
      /^multipart\/form-data; boundary=/,
    );
    assert.match(received.body, /name="file"; filename="knowledge-base\.zip"/);
    assert.match(received.body, /name="name"\r\n\r\nImported KB/);
    assert.match(received.body, /name="description"\r\n\r\nRead-only docs/);
    assert.equal((received.body.match(/name="tags"/g) ?? []).length, 2);
    assert.match(received.body, /name="projectId"\r\n\r\nproject-1/);
    for (const forbiddenField of [
      "scope",
      "contentMode",
      "buildStatus",
      "schemaStatus",
      "rootPath",
    ]) {
      assert.doesNotMatch(
        received.body,
        new RegExp(`name="${forbiddenField}"`),
      );
    }

    responseMode = "unauthorized-once";
    const requestsBeforeUnauthorizedRetry = requestCount;
    const refreshedTokenResult = await runCli(
      [
        "--host",
        host,
        "kb",
        "+import",
        "--file",
        archivePath,
        "--name",
        "Imported after refresh",
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(refreshedTokenResult.status, 0, refreshedTokenResult.stderr);
    assert.equal(requestCount - requestsBeforeUnauthorizedRetry, 2);
    assert.deepEqual(receivedTokens.slice(-2), [
      "cli-kb-import-test",
      "cli-kb-import-refreshed",
    ]);

    unauthorizedRequestCount = 0;
    writeFileSync(
      tokenFilePath,
      JSON.stringify({ url: host, token: "cli-kb-status-test" }),
    );
    const requestsBeforeStatusRefresh = requestCount;
    const statusResult = await runCli(
      ["--host", host, "kb", "+import-status", "--request-id", "request-1"],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(statusResult.status, 0, statusResult.stderr);
    assert.equal(requestCount - requestsBeforeStatusRefresh, 2);
    assert.deepEqual(receivedTokens.slice(-2), [
      "cli-kb-status-test",
      "cli-kb-import-refreshed",
    ]);
    assert.deepEqual(JSON.parse(statusResult.stdout).data, {
      requestId: "request-1",
      status: "succeeded",
      knowledgeBaseId: "kb-imported-1",
      errorCode: null,
      errorMessage: null,
    });
    assert.equal(
      received.url,
      "/agent/api/external/knowledge-bases/import?requestId=request-1",
    );
    assert.equal(received.method, "GET");

    responseMode = "task-failed";
    const conflict = await runCli(
      ["--host", host, "kb", "+import-status", "--request-id", "request-1"],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(conflict.status, 0, conflict.stderr);
    assert.deepEqual(JSON.parse(conflict.stdout).data, {
      requestId: "request-1",
      status: "failed",
      knowledgeBaseId: null,
      errorCode: "KB_SNAPSHOT_NAME_CONFLICT",
      errorMessage:
        "A personal knowledge base with the same name already exists",
    });

    responseMode = "task-not-found";
    const missingTask = await runCli(
      [
        "--host",
        host,
        "kb",
        "+import-status",
        "--request-id",
        "missing-request",
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(missingTask.status, 1);
    assert.equal(
      JSON.parse(missingTask.stderr).error.code,
      "KB_SNAPSHOT_IMPORT_TASK_NOT_FOUND",
    );

    responseMode = "task-empty-metadata";
    const emptyStatusMetadata = await runCli(
      ["--host", host, "kb", "+import-status", "--request-id", "request-1"],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(emptyStatusMetadata.status, 1);
    const emptyStatusMetadataOutput = JSON.parse(emptyStatusMetadata.stderr);
    assert.equal(emptyStatusMetadataOutput.error.code, undefined);
    assert.doesNotMatch(
      emptyStatusMetadataOutput.error.hint ?? "",
      /capability route|backend route\/capability/i,
    );
    assert.match(
      emptyStatusMetadataOutput.error.hint,
      /server supports kb \+import-status/,
    );

    responseMode = "forbidden";
    const requestsBeforeForbidden = requestCount;
    const forbidden = await runCli(
      [
        "--host",
        host,
        "kb",
        "+import",
        "--file",
        archivePath,
        "--name",
        "Imported KB",
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(forbidden.status, 1);
    assert.equal(requestCount - requestsBeforeForbidden, 1);
    const forbiddenOutput = JSON.parse(forbidden.stderr);
    assert.equal(forbiddenOutput.error.type, "permission");
    assert.equal(forbiddenOutput.error.code, "KB_SNAPSHOT_IMPORT_FORBIDDEN");
    assert.match(forbiddenOutput.error.message, /not allowed for this user/);
    assert.match(forbiddenOutput.error.message, /ae-cli kb \+import-status/);

    responseMode = "empty-metadata";
    const emptyMetadata = await runCli(
      [
        "--host",
        host,
        "kb",
        "+import",
        "--file",
        archivePath,
        "--name",
        "Imported KB",
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(emptyMetadata.status, 1);
    const emptyMetadataOutput = JSON.parse(emptyMetadata.stderr);
    assert.equal(emptyMetadataOutput.error.code, undefined);
    assert.doesNotMatch(
      emptyMetadataOutput.error.hint ?? "",
      /capability route|backend route\/capability/i,
    );
    assert.match(emptyMetadataOutput.error.hint, /ae-cli kb \+import-status/);

    const sourcePath = path.join(temporaryRoot, "source.md");
    writeFileSync(sourcePath, "# Existing source\n");
    responseMode = "legacy-add-error";
    const legacyAdd = await runCli(
      [
        "--host",
        host,
        "kb",
        "+add",
        "--name",
        "Existing KB",
        "--files",
        JSON.stringify([sourcePath]),
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(legacyAdd.status, 1);
    const legacyAddOutput = JSON.parse(legacyAdd.stderr);
    assert.equal(legacyAddOutput.error.type, "api");
    assert.equal(legacyAddOutput.error.code, undefined);
    assert.match(legacyAddOutput.error.message, /Legacy source upload failed/);

    const help = await runCli(["kb", "+import", "--help"], {
      HOME: path.join(temporaryRoot, "home"),
      SANDBOX_RUNTIME_ROOT: runtimeRoot,
    });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /--file/);
    assert.match(help.stdout, /--name/);
    assert.doesNotMatch(
      help.stdout,
      /--scope|--force|--replace|--version|--rollback|--request-id/,
    );

    const statusHelp = await runCli(["kb", "+import-status", "--help"], {
      HOME: path.join(temporaryRoot, "home"),
      SANDBOX_RUNTIME_ROOT: runtimeRoot,
    });
    assert.equal(statusHelp.status, 0, statusHelp.stderr);
    assert.match(statusHelp.stdout, /--request-id/);

    const dryRun = await runCli(
      [
        "--dry-run",
        "kb",
        "+import",
        "--file",
        archivePath,
        "--name",
        "Imported KB",
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.deepEqual(JSON.parse(dryRun.stdout).data, {
      message: "No dry-run implementation for this command",
    });

    const oversizedArchivePath = path.join(temporaryRoot, "oversized.zip");
    writeFileSync(oversizedArchivePath, Buffer.alloc(0));
    truncateSync(oversizedArchivePath, 50 * 1024 * 1024 + 1);
    const oversized = await runCli(
      [
        "--host",
        host,
        "kb",
        "+import",
        "--file",
        oversizedArchivePath,
        "--name",
        "Too large",
      ],
      {
        HOME: path.join(temporaryRoot, "home"),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(oversized.status, 1);
    assert.match(
      JSON.parse(oversized.stderr).error.message,
      /must not exceed 50 MB/,
    );

    const kbHelp = await runCli(["kb", "--help"], {
      HOME: path.join(temporaryRoot, "home"),
      SANDBOX_RUNTIME_ROOT: runtimeRoot,
    });
    assert.equal(kbHelp.status, 0, kbHelp.stderr);
    for (const command of [
      "+ask",
      "+add",
      "+url",
      "+compile",
      "+remove",
      "+new",
      "+rm-source",
      "+schema",
      "+status",
      "+ask-status",
      "+list",
      "+list-sources",
      "+index",
      "+grep",
      "+read",
      "+import",
      "+import-status",
    ]) {
      assert.match(kbHelp.stdout, new RegExp(command.replace("+", "\\+")));
    }

    const skill = readFileSync(
      path.join(ROOT, "skills/ae-kb/SKILL.md"),
      "utf8",
    );
    const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");
    for (const documentation of [skill, readme]) {
      assert.match(documentation, /ae-cli kb \+import/);
      assert.match(documentation, /ae-cli kb \+import-status/);
      assert.match(documentation, /read-only/i);
      assert.match(documentation, /requestId/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
