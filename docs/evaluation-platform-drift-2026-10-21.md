# Evaluation platform synchronization review (2026-10-21)

## Scope and evidence

Read-only comparison of the current 110 evaluation CLI commands against local
`/Users/jatny/agent-test` revision `c126221`, using OpenAPI, HTTP handlers,
application code, and versioned JSON schemas. No live platform requests were made.

The platform exposes 126 OpenAPI operations: 121 business operations and five
health/session operations. Eleven business operations are absent from the CLI.
The additions below also match the OpenAPI delta since the platform's local
pre-2026-09-19 revision. No operations were removed in that comparison.

## 1. Process evaluation guidance needs updating

The CLI accepts mapping JSON without restricting its schema version, so this is
primarily missing guidance and regression coverage rather than a transport blocker.

- `FIELD_MAPPING_V6` adds `AGENT_EXECUTION_TRACE` and `AGENT_TOOL_CALLS`.
- The platform now has `EVALUATOR_VARIABLES_V3`, `EVALUATOR_SNAPSHOT_V3`,
  `PROCESS_EVIDENCE_V1`, and `TE_CLAUDE_TOOL_CALLS_V1` contracts.
- The built-in `TOOL_TRACE_REASONABLENESS` template uses `input`, `output`, and
  `execution_trace`. Discover it through the existing template-list command;
  a new template-specific command is unnecessary.
- Process evidence requires a current-epoch READY, COMPLETE, non-truncated
  snapshot, with a 64 KiB projection limit. Missing or pending evidence fails
  the dependent score with a null score; Agent execution status stays independent.
- Score `input_variables` contains references with
  `content_location=CASE_EXECUTION_TRACE`, not complete tool payloads. Use the
  existing case-trace command to inspect separately audited evidence.
- TE Claude evidence covers recorded tool calls and explicit parent/child
  relationships; do not describe it as full model reasoning or infer timing/cost.

Update `skills/ae-evaluation/references/runs.md`, the evaluator reference, relevant
flag help, and focused request-contract tests. Retain V5 examples for workflows
that do not need process evidence.

Evidence: platform `docs/openapi/openapi.yaml` (`FieldMapping`, `ScoreResult`),
`docs/architecture/contracts/schemas/field-mapping-v6.schema.json`,
`apps/server/internal/application/evaluator/seed.go`, and the execution-trace spec.

## 2. Authenticated file download is missing

`GET /files/{fileId}/content` returns attachment bytes for local and S3 storage.
The platform web client now uses this route. CLI workflows only expose file
metadata and a download URL; filesystem storage returns a server-local `file://`
URL, which is not a usable remote download path.

Provide a file-saving workflow through the shared authenticated transport, with
explicit output handling and structured metadata. The current `evalRequest`
always parses JSON and cannot directly handle successful binary responses.
Cover exact byte preservation, JSON error responses, incomplete/expired files,
and permission failures. Update dataset/result export instructions.

Evidence: platform HTTP `file.go`, `adapter/storage/filesystem/filesystem.go`,
web `src/lib/file-api.ts`; CLI `src/core/eval-client.ts`.

## 3. Access-scope changes are not exposed

Four PATCH operations exist at `/{datasets|evaluators|model-configs|agents}/{id}/access-scope`.
Each accepts `{access_scope, lock_version}`; mutable values are PERSONAL and COMPANY.
SYSTEM is a response value, not a mutable target. The application requires an
administrator and can reject sharing with `ACCESS_SCOPE_DEPENDENCY_PRIVATE`.

Expose these capabilities through the appropriate admitted CLI surface. Treat
permission changes as high-risk writes. Document sharing dependencies and
optimistic locking, and explain that sharing remains tenant/project scoped.

Evidence: platform HTTP `asset_scope.go`, application `accessscope/service.go`,
domain `accessscope/scope.go`.

## 4. Template lifecycle and locale inputs are missing

- Add locale selection to `+list_evaluator_templates`: query `locale=zh|en`.
- Add template language to `+create_evaluator`: body `template_locale=zh|en`.
- Both default to zh when omitted; project templates retain their original content.
- `POST /evaluator-templates/{id}/enable` re-enables a project template, requires
  an administrator, has no body, and returns 204. Repeated requests succeed.

Evidence: platform HTTP `evaluator.go` and OpenAPI.

## 5. Member administration has five uncovered operations

| Operation | Method and path suffix | Request |
|---|---|---|
| Discover candidates | GET `/projects/members/candidates` | None |
| Admit members | POST `/projects/members/batch-add` | `{members:[{external_id,display_name?}]}` |
| Change role | PATCH `/projects/members/{userId}/role` | `{role:agent_admin|member}` |
| Set login status | PATCH `/projects/members/{userId}` | `{status:ACTIVE|DISABLED}` |
| Remove member | DELETE `/projects/members/{userId}` | None |

All require administrator privileges. Login status applies tenant-wide; removal
revokes only the current project's access. Root identities are protected. These
requests do not take a lock version. Preserve the distinction between external
candidate IDs and project-member UUIDs. Existing member-list output now includes
`external_id`, `status`, and roles `root|agent_admin|member`.

Evidence: platform HTTP `members.go` and OpenAPI member request schemas.

## 6. Existing help and verification assumptions need correction

- `+create_agent` and `+create_model_config` still claim ADMIN is required;
  their current server create routes are no longer guarded by RequireAdmin.
  Document current personal/shared resource permissions instead of extending
  this change to credential operations, which remain administrator-only.
- `verify-evaluation-tools.mjs` and registry tests assert a hard-coded count of
  110. They do not detect new server routes. Add a normalized method/path
  coverage comparison with explicit exclusions; counts alone are insufficient.
- New interfaces are candidates for admission, not a requirement to create 11
  more one-to-one wrappers. Apply `docs/capability-command-admission.md` first.
  If Gateway does not cover an essential operation, record its Transitional
  owner, migration target, review date, and exit conditions.

## Verification performed

- `node --import tsx tests/evaluation-command-contract.test.ts`: passed.
- `node --import tsx tests/evaluation-client.test.ts`: passed.
- OpenAPI operation inventory and added-operation comparison: 11 additions,
  zero removals; 110 CLI command files and registrations.
- The full npm verification wrapper was previously blocked by tsx IPC sandbox
  permissions. Direct Node import ran both focused suites successfully without
  requesting expanded permissions. No live end-to-end validation was performed.

Suggested order: process-evaluation guidance and file download; locale and
template lifecycle; scope/member capability admission; contract coverage checks.

## Implementation completion

The audit findings above describe the pre-update state. The synchronization now
registers 121 commands, adding `file download`, `{dataset|evaluator|model-config|agent}
access-scope`, `evaluator-template enable`, and five `project-member` operations.
Existing + commands remain compatible. Locale flags, V6 process mapping guidance,
permission help and export instructions are updated. Skill references record
Transitional ownership and migration exits.

Verification compares every command dry-run method/path against
`tests/fixtures/evaluation-api-operations.json`, with five explicit infrastructure
exclusions. To compare a new platform checkout as well, run:

```bash
EVAL_OPENAPI_PATH=/path/to/agent-test/docs/openapi/openapi.yaml npm run verify:evaluation-tools
```

This does not issue live API calls. A server contract change fails with a drift
message until its coverage and snapshot are reviewed. Binary transport tests
cover byte preservation, authorization, overwrite refusal, permission/readiness/
expiry errors, interrupted bodies, timeout, and failed-output cleanup.

Final checks: build, npm test, current-OpenAPI evaluation verification, release
gate, self-check and git diff --check passed. Manual built-CLI dry-runs confirmed
scope changes, tenant-wide status requests, locale, bodyless template enabling,
member admission and file destinations without live API calls. Optional full
`tsc --noEmit` still reports 24 pre-existing errors in unchanged files (dataset
import Blob typing, analysis imports, tracking, async artifacts and output).
No new evaluation/client type errors remain. No commit was created.
