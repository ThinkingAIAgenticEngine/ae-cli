# CLI telemetry optimization

Base: release/6.0 (85cbf473). Branch: feat/6.0/cli-telemetry-model-1117.

Acceptance: normal requests, multipart uploads, artifact downloads and Engage commands transmit the available Agent context through the existing encoded headers. Binary content, business inputs, authentication and source-header semantics remain unchanged. An unknown model stays optional. MCP and DataOps are excluded.

Gateway telemetry canonicalizes AE product identity to `te_agent` while keeping the protocol source `X-Source: te-agent`. Older persisted run identities are normalized when emitting new events; historical analytics are not rewritten.

Actual AE model capture is implemented in the sandbox tool-execution component on the matching release/6.0-based branch. Claude SDK messages and Fast provider stream events bind the response model to each tool call. Configuration model IDs and company-auto routing references are not used as actual model names.

## Verification

- New transport regression failed before the fix because multipart upload lacked encoded Agent headers; it passes after adding the existing context helper to upload/download exits.
- The fixture invokes all seven Engage command families and the actual Engage artifact inspection/download command. It checks model/session/turn/client/runtime/intent headers, exact uploaded/downloaded binary bytes, optional unknown models and the unchanged MCP boundary.
- `npm run qa-changed` passes (build, smoke, source/context regression and cross-source upload contract). `npx tsc --noEmit` and the 24-test transport/model/API/input-file regression pass.
- `npm run verify:engage-capability` passes with inherited Agent environment/context disabled for its exact-body fixtures. New context propagation tests run with explicit scoped context.
- Gateway `6.0.19-RELEASE` runs 296 tests (293 passed, 3 conditional skips). Its release/6.0 commit and Maven artifacts have been pushed; remote artifact checksums and isolated Common dependency resolution were verified separately.

- Common CLI regression passes: 1947 tests, 1946 passed and 1 skipped; Checkstyle passes. Dependency tree resolves core, starter and autoconfigure to 6.0.19-RELEASE. Both legacy and canonical sources retain internal scope in the serialized usage detail response.
- Common reproduction: adding canonical/legacy aliases to the usage classification test fails against the old DTO, then passes after using the gateway normalization function. Existing historical records are read compatibly without a data migration.
- Final diff review confirms no DataOps or MCP implementation changes, source-based access checks unchanged, and no UI/i18n or SQL/data-access changes. The Common large-table self-join error-memory item is not applicable.

Status: CLI, gateway, Common and sandbox implementation branches have been pushed. The user reported test-environment acceptance on 2026-11-18. Upgrade CLI before the sandbox so response-bound model metadata supersedes stale Skill files. GitLab MRs record integration targets, artifact publication and automated verification separately from service deployment and user acceptance.

## Runtime model follow-up

The existing hidden `--agent-context` payload accepts versioned `runtime_agent_model` metadata. A current response model supersedes file/env/scoped fallback models; explicit unknown removes stale model values without blocking the command. Model-only runtime metadata preserves the original intent source. Ordinary external self-report behavior is retained.

Regression: the stale-model case failed before the change; a producer-shaped payload also reproduced unintended `intent_source=agent_argument`, now fixed. Build, smoke, `tsc --noEmit`, the 21-test model/transport/API suite and a real `engage-flow flow list` invocation against a local HTTP fixture passed. Current and unknown model cases preserve business input and `X-Source: te-agent`. The runtime metadata is consumed locally and is not copied into gateway business input.
