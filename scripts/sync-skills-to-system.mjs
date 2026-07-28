import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_API_URL = "https://gitlab.thinkingdata.cn/api/v4";
const DEFAULT_SYSTEM_SKILLS_PROJECT = "te-ai/te-system-skills";
const DEFAULT_SOURCE_PROJECT = "te-ai/te-cli";

export function parseArgs(argv = process.argv.slice(2)) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

export function inferClusterVersion(...values) {
  for (const value of values) {
    const match = String(value || "").match(/(?:^|\/)(\d+\.\d+)(?:\/|$)/);
    if (match) return match[1];
  }
  throw new Error(
    "Unable to infer the cluster version. Pass --cluster-version <major.minor>.",
  );
}

export function buildTriggerRequest(options) {
  const {
    apiUrl,
    systemProject,
    triggerToken,
    targetBranch,
    sourceProject,
    sourceRef,
    sourceCommit,
    clusterVersion,
  } = options;
  const body = new FormData();
  body.set("token", triggerToken);
  body.set("ref", targetBranch);
  const variables = {
    CURATOR_MODE: "product",
    TARGET_BRANCH: targetBranch,
    SOURCE_PROJECT_ID: sourceProject,
    SOURCE_REPOSITORY: DEFAULT_SOURCE_PROJECT,
    SOURCE_REF: sourceRef,
    SOURCE_COMMIT: sourceCommit,
    CLUSTER_VERSION: clusterVersion,
  };
  for (const [key, value] of Object.entries(variables)) {
    body.set(`variables[${key}]`, value);
  }
  return {
    url: `${apiUrl.replace(/\/$/, "")}/projects/${encodeURIComponent(systemProject)}/trigger/pipeline`,
    body,
    variables,
  };
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const sourceRef =
    String(args["source-ref"] || env.CI_COMMIT_REF_NAME || git("rev-parse", "--abbrev-ref", "HEAD"));
  const sourceCommit = String(
    args["source-commit"] || env.CI_COMMIT_SHA || git("rev-parse", "HEAD"),
  );
  const clusterVersion = String(
    args["cluster-version"] ||
      inferClusterVersion(args["target-branch"], sourceRef),
  );
  if (!/^\d+\.\d+$/.test(clusterVersion)) {
    throw new Error("--cluster-version must use the <major.minor> format.");
  }
  const targetBranch = String(args["target-branch"] || `release/${clusterVersion}`);
  if (targetBranch !== `release/${clusterVersion}`) {
    throw new Error(
      `Target branch ${targetBranch} does not match cluster version ${clusterVersion}.`,
    );
  }

  const dryRun = Boolean(args["dry-run"]);
  const triggerToken = String(env.TE_SYSTEM_SKILLS_TRIGGER_TOKEN || "");
  if (!dryRun && !triggerToken) {
    throw new Error("TE_SYSTEM_SKILLS_TRIGGER_TOKEN is required.");
  }

  const request = buildTriggerRequest({
    apiUrl: String(env.GITLAB_API_URL || env.CI_API_V4_URL || DEFAULT_API_URL),
    systemProject: String(
      env.TE_SYSTEM_SKILLS_PROJECT_ID || DEFAULT_SYSTEM_SKILLS_PROJECT,
    ),
    triggerToken: triggerToken || "<redacted>",
    targetBranch,
    sourceProject: String(
      args["source-project-id"] ||
        env.CI_PROJECT_ID ||
        env.TE_CLI_PROJECT_ID ||
        DEFAULT_SOURCE_PROJECT,
    ),
    sourceRef,
    sourceCommit,
    clusterVersion,
  });

  if (dryRun) {
    print({
      dry_run: true,
      url: request.url,
      ref: targetBranch,
      variables: request.variables,
    });
    return;
  }

  const response = await fetch(request.url, {
    method: "POST",
    body: request.body,
  });
  if (!response.ok) {
    throw new Error(
      `Unable to trigger te-system-skills Pipeline (${response.status}): ${(await response.text()).slice(0, 500)}`,
    );
  }
  const pipeline = await response.json();
  print({
    triggered: true,
    pipeline_id: pipeline.id,
    status: pipeline.status,
    web_url: pipeline.web_url,
    target_branch: targetBranch,
    source_commit: sourceCommit,
  });
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function print(value) {
  process.stdout.write(`${JSON.stringify({ ok: true, data: value }, null, 2)}\n`);
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
