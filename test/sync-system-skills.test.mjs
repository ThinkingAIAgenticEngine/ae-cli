import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTriggerRequest,
  inferClusterVersion,
} from "../scripts/sync-skills-to-system.mjs";

test("inferClusterVersion reads release and feature branches", () => {
  assert.equal(inferClusterVersion("release/6.1"), "6.1");
  assert.equal(inferClusterVersion("feature/6.0/skill-sync"), "6.0");
});

test("buildTriggerRequest targets one release line and immutable source commit", () => {
  const request = buildTriggerRequest({
    apiUrl: "https://gitlab.example/api/v4/",
    systemProject: "te-ai/te-system-skills",
    triggerToken: "secret",
    targetBranch: "release/6.1",
    sourceProject: "42",
    sourceRef: "feature/6.1/new-skill",
    sourceCommit: "abc123",
    clusterVersion: "6.1",
  });

  assert.equal(
    request.url,
    "https://gitlab.example/api/v4/projects/te-ai%2Fte-system-skills/trigger/pipeline",
  );
  assert.deepEqual(request.variables, {
    CURATOR_MODE: "product",
    TARGET_BRANCH: "release/6.1",
    SOURCE_PROJECT_ID: "42",
    SOURCE_REPOSITORY: "te-ai/te-cli",
    SOURCE_REF: "feature/6.1/new-skill",
    SOURCE_COMMIT: "abc123",
    CLUSTER_VERSION: "6.1",
  });
  assert.equal(request.body.get("token"), "secret");
  assert.equal(request.body.get("ref"), "release/6.1");
});
