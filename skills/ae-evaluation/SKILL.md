---
name: ae-evaluation
version: 2.4.7
description: "Operate the Agent Evaluation (agent-test) platform through ae-cli: manage evaluation assets, configure and run Agent or preset-output evaluations, and analyze results. Use for platform evaluation tasks and their model, credential, integration, or schedule setup."
---

# ae-evaluation

Use `ae-cli evaluation +<command> [options]` for existing operations and the resource commands below for new capabilities. All 121 commands target the Agent Evaluation platform.
AE Agent resource management belongs to `ae-agent`; this skill manages evaluation assets and agents under test.

## Read only the relevant reference

Before executing a command, read the reference for the operation. Do not load all references.
References contain command inputs, JSON contracts, and task-specific workflows; use command `--help` for additional flags.

| Task | Reference |
|---|---|
| Create/import datasets, manage fields and cases, publish versions | [datasets.md](references/datasets.md) |
| Configure LLM judges/templates, publish evaluator versions, calibrate or optimize prompts | [evaluators.md](references/evaluators.md) |
| Create/configure/start/retry/cancel runs, inspect results/traces, export results | [runs.md](references/runs.md) |
| Configure/test models and agents, manage credentials | [connections.md](references/connections.md) |
| Change resource visibility or administer project members | [access-and-members.md](references/access-and-members.md) |
| Download imported/exported files to disk | [files.md](references/files.md) |
| Create/update/delete recurring evaluation schedules | [schedules.md](references/schedules.md) |
| Connect/import AI Monitor data, configure TE reporting, discover TE Claude catalog | [integrations.md](references/integrations.md) |

## Endpoint and authentication

- In both personal terminals and AE sandboxes, evaluation commands default to the current AE Host and call `<current-host>/agenteval/api/v1/...` (an optional trailing `/agent` is removed from the host). Use `--host` to select another AE Host. Evaluation requests use the HTTP or HTTPS scheme configured for that AE Host, consistent with other AE commands. Legacy `--endpoint` and `AE_EVAL_BASE_URL` values may only match the current AE Host; other values fail before credentials are sent. Remove these settings and use `--host` to select a host.
- Session exchange and evaluation requests reject redirects; session exchange has a 30-second timeout.
- Path resource IDs must contain only letters, digits, hyphens, or underscores; separators and URL escape syntax are rejected locally.
- Use the online platform. Do not suggest localhost/loopback endpoints or obtain tokens from a local `agent-test/.env`.
- Authentication uses `AE_EVAL_ACCESS_TOKEN` when explicitly set; it is sent only as `Authorization: Bearer` and must never appear in command arguments or output.
- In an AE sandbox, when `AE_EVAL_ACCESS_TOKEN` is unset, ae-cli automatically exchanges the sandbox-provisioned `cli-token` through te-claude for a short-lived evaluation session. The CLI token is never sent to Agent Evaluation. If the token can access multiple TE projects, set `AE_EVAL_TE_PROJECT_ID` to the authorized TE project id.
- Outside a sandbox, when the token is unset, the CLI immediately returns `EVAL_ACCESS_TOKEN_MISSING` with `token_missing` onboarding guidance and sends no network request. Module availability and service health remain unchecked. Direct the user to obtain a session token through the platform web console (`sessionStorage.getItem('agent.evaluation.session-token')`) or `POST /agenteval/api/v1/auth/session`. Never request tokens in chat.
- Successful commands return JSON by default; use the actual error envelope to diagnose failures.

### Evaluation availability and onboarding

AI Evaluation Center is an optional deployment module. CLI command/Skill availability does not establish that the server module is installed or that the user has access.

- When an error includes `error.details.onboarding`, follow the status-specific scope below. Do not blindly repeat the failed operation, change flags, refresh tokens, or use direct HTTP calls to bypass a denial. This is a host-Agent instruction, not a persistent CLI circuit breaker. Independent local work can continue.
- First preserve local work: when asked to organize and upload a dataset, finish and save the local CSV/JSON if possible. Confirm its actual file path. If a write times out, loses its response, or receives a gateway/server failure, explain that the write result is unconfirmed: the server may already have accepted it. Do not claim either success or failure and do not resubmit blindly. Once connectivity is restored, use authorized read-only status checks with any known resource/import ID to reconcile the result. If no reliable identifier or lookup exists, ask the administrator/support to verify before another write.
- Read `onboarding.status`, explain the evidence in the user's language, and follow its `next_steps`:
  - `module_not_detected`: stop further evaluation commands on the affected host until deployment/routing is verified. The API route was not detected (generic route 404 or HTML fallback). The optional module may be missing or its routing may be wrong. Contact the ThinkingData service representative (CSM or Technical Support) to verify deployment/routing, install the module if needed, and grant access. Do not assert that installation is certainly absent.
  - `access_not_granted`: stop only the denied operation. Independent authorized operations may continue; for example, a denied delete does not prohibit an authorized dataset read. Do not run other commands just to probe or bypass the denial. Stop a whole project or module only when that access scope is confirmed. Ask the administrator or ThinkingData support to check the required permission (READER / EDITOR / ADMIN as appropriate). A 403 alone proves neither cluster-wide denial nor module installation; do not recommend reinstallation or token rotation.
  - `token_missing`: stop remote evaluation operations on this host until a token is configured. The external terminal has no token; no request was sent and endpoint availability was not checked. Follow the conditional web-console instructions; if the app launcher entry is missing, request administrator/support verification instead of sending the user to a nonexistent page. This status does not establish the health of every evaluation service.
  - `availability_unknown`: stop blind retries of the failed operation. Network errors, timeouts, server failures, invalid responses, and missing sandbox session routes cannot establish installation state. Ask for host/network/service/routing verification; do not present an outage as an installation requirement. After connectivity is restored, authorized read-only status checks may reconcile an unconfirmed write; they must not resubmit it.
- Briefly relate the three capabilities to the user's task: **Datasets** manage single/multi-turn test cases and versions, with CSV/JSON imports and AI Monitor traces; **Evaluators** provide templates/custom LLM judges, human calibration, and prompt optimization; **Evaluation Runs** test live Agents or score preset outputs, schedule regressions, and inspect low-score cases and traces. Translate this explanation naturally for Chinese or English users; CLI envelopes remain English.
- If the user asks only about capabilities, explain them without a network call. If they also request current datasets/runs, apply the status-specific stop scope above when the first call reports onboarding; do not make another call just to demonstrate another capability.
- Existing business error codes, error type (`api`), and exit code remain unchanged. Onboarding is additive; ordinary business 404 errors (such as `DATASET_NOT_FOUND`) do not indicate a missing module. Older CLIs may omit onboarding; use their diagnostic evidence cautiously and do not infer installation from a bare 404/5xx.

## IDs, versions, and mutations

- Discover real IDs with list/get commands. UUIDs are version-7 strings; never guess IDs, JSON payload shapes, frequency fields, or `lock_version` values.
- Published dataset, evaluator, and evaluation-task versions are immutable and separate from drafts. Runs and schedules pin versions; existing published versions cannot be overwritten. Publishing unchanged assets returns `ASSET_VERSION_NO_CHANGES`.
- Read operations can run once inputs are known. Writes require user intent; high-risk operations retain confirmation unless the user authorizes bypassing it with `--yes`.
- Credential enabling/disabling, run cancellations, deletes, ownership transfers, template disabling, access-scope changes, and member admission/permission changes are high-risk writes. Check command help for risk and role requirements; references identify ADMIN-only operations.
- Before each mutation requiring `--lock-version`, read the current resource. Every successful mutation increments its version; re-read before the next mutation.
- Use the corresponding get command for runs, datasets, evaluators, models, agents, credentials, dataset cases, TE report config, and AI Monitor connection. Schedules use `+list_schedules`; calibration cases use `+list_calibration_cases`.
- Field mutations use the dataset version; case mutations use the case version. First creation of TE report config or AI Monitor connection omits `--lock-version`; updates require the current value, including 0.
- Async dataset imports, evaluation-set imports, and result exports require a fresh unique `--idempotency-key` per attempt. Poll the relevant status until completion; resource creation alone does not establish readiness.
- Prefer `--dry-run` before broad/destructive writes whose targets have not been validated. It previews the request without executing it.
- Evaluation errors redact the submitted credential values and session tokens; server-provided error messages and hints are not persisted in CLI logs. Stable business error codes are preserved unchanged; non-sensitive diagnostics remain available in the JSON error envelope.
- Case data is redacted from command logs for both single-case and batch writes. Sensitive JSON parse failures report the flag and syntax guidance without echoing the input.
- Credential secrets are write-only. Never echo secrets, session claims, or sensitive trace evidence; use redacted dry-run output.

## Evaluation lifecycle

1. Select a published dataset version with `+list_dataset_versions`.
2. Choose `LIVE_AGENT` (default) to call an Agent/model, or `PRESET_RESULT` to score outputs stored in the dataset. PRESET_RESULT must omit agent/model config IDs. `IMPORTED_OUTPUT` is legacy data only; never recommend it.
3. Create a draft run, bind at least one ACTIVE evaluator (prefer pinned published versions), and configure complete field mapping plus result filter fields. An explicit empty result filter is required when no fields are selected.
4. Prefer `+validate_run` before starting. It runs the start preflight without a body or lock version. Read the latest run, then `+start_run` with its current lock version.
5. Inspect overview/distribution, drill into cases, and use the run reference for retry, trace, and export semantics.

Read [runs.md](references/runs.md) for the executable sequence and mapping examples. Setup of datasets, evaluators, or connections needs only the matching reference above.

## Transport transition

The existing platform contract exposes REST operations rather than evaluation
capabilities registered in this repository. New commands retain that transport
for typed input, permission confirmation, and file handling. They are Transitional;
see the matching references for migration records. Check deployment Gateway
coverage before extending these commands; prefer existing equivalent capabilities.

Transition status: transitional
Owning module: Agent Evaluation (agent-test)
Current transport: authenticated REST /agenteval/api/v1
Gateway target: TBD (evaluation capability registration)
Review after: 2027-01-21
Exit condition: once equivalent evaluation capabilities are available, migrate
selected typed/file commands to L2 or replace simple wrappers with L3; retain
existing + commands only where compatibility or orchestration justifies them.

This record also applies to the locale and process-evidence updates in the
existing evaluator/run references. It is a migration plan, not a claim that a
particular deployed Gateway has been inspected.
