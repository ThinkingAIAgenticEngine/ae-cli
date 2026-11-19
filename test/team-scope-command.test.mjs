import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Team scope commands preview and submit the confirmed revision in the CLI language", async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "ae-cli-team-scope-"));
  const requests = [];
  const revision = "f".repeat(64);
  const server = http.createServer((request, response) => {
    if (!request.url.startsWith("/agent/api/external/team/teams/")) {
      response.writeHead(404);
      response.end();
      return;
    }
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = chunks.length
        ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
        : null;
      requests.push({ method: request.method, url: request.url, body });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ id: "team-1", expectedRevision: revision }),
      );
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtimeRoot = path.join(temporaryRoot, "runtime");
  mkdirSync(path.join(runtimeRoot, ".ae-config"), { recursive: true });
  writeFileSync(
    path.join(runtimeRoot, ".ae-config", "cli-token.json"),
    JSON.stringify({ url: host, token: "team-save-test-token" }),
  );

  const runCli = (action, locale, args) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "src/index.ts",
          "--no-update-check",
          "--host",
          host,
          "team",
          action,
          "--id",
          "team-1",
          ...args,
        ],
        {
          cwd: ROOT,
          env: {
            ...process.env,
            AE_LANG: locale,
            HOME: path.join(temporaryRoot, "home"),
            SANDBOX_RUNTIME_ROOT: runtimeRoot,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (status) => resolve({ status, stdout, stderr }));
    });

  try {
    for (const [action, locale] of [
      ["+promote", "ja"],
      ["+copy-to-personal", "ko"],
    ]) {
      const before = requests.length;
      const missing = await runCli(action, locale, []);
      assert.notEqual(missing.status, 0);
      assert.match(
        missing.stdout + missing.stderr,
        locale === "ja" ? /指定してください/ : /전달하세요/,
      );
      assert.equal(requests.length, before);
      const preview = await runCli(action, locale, ["--dry-run"]);
      assert.equal(preview.status, 0, preview.stdout + preview.stderr);
      assert.equal(JSON.parse(preview.stdout).data.expectedRevision, revision);
      const url =
        "/agent/api/external/team/teams/team-1/" +
        (action === "+promote" ? "promote" : "copy") +
        "?lang=" +
        locale;
      assert.deepEqual(requests.at(-1), { method: "GET", url, body: null });
      const done = await runCli(action, locale, [
        "--expected-revision",
        revision,
      ]);
      assert.equal(done.status, 0, done.stdout + done.stderr);
      assert.deepEqual(requests.at(-1), {
        method: "POST",
        url,
        body: { expectedRevision: revision },
      });
    }
    assert.equal(requests.length, 4);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
