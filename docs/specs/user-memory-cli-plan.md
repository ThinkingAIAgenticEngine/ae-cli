# AgentSpace memory CLI contract

Status: implemented in te-cli

## Product boundary

The `memory` domain manages memory inside one AgentSpace. It does not expose the retired global/Agent-scoped UserMemory model and does not manage session capability defaults.

`--workspace-id` always means `AgentSpace.id`. It is unrelated to the legacy sandbox `Workspace` row, `workspacePath`, or local directory name.

## Target resolution

Every command resolves its target through `GET /api/cli/memory/v2/target` before accessing workspace memory.

Resolution inputs, in order:

1. explicit `--workspace-id`;
2. `TE_AGENT_CURRENT_AGENT_SPACE_ID` or the canonical `/spaces/actived/<id>/.conversations/...` runtime directory;
3. explicit `--conversation-id` or `TE_AGENT_CONVERSATION_ID`.

When workspace and conversation are both present, both are sent and the server must reject a mismatch. If neither is available, the command fails. There is no account-default fallback.

## API and authentication

The public route prefix is `/agent/api/cli/memory/v2`; `TE_CLAUDE_BASE_PATH` or `AE_API_PREFIX` may replace `/agent`. Requests use only the unified `cli-token` credential chain. The CLI does not call Web-only memory routes or the legacy v1 CLI route.

All responses may use the `{ "ok": true, "data": ... }` envelope. The CLI returns `data` as its command payload.

## Commands

- Active memory: `+list`, `+get`, `+create`, `+update`, `+delete`, `+history`, `+pin`, `+unpin`, `+restore`.
- Runtime and extraction audit: `+context`, `+extract`, `+source-list`, `+job-list`, `+job-get`.
- Private drafts: `+draft-list`, `+draft-get`, `+draft-update`, `+draft-delete`, `+draft-submit`.
- Shared review: `+candidate-list`, `+candidate-get`, `+candidate-submit`, `+candidate-approve`, `+candidate-reject`, `+candidate-withdraw`, `+candidate-resubmit`.
- Extraction settings: `+settings-get`, `+settings-update`.

Memory, draft, and candidate mutations use optimistic concurrency through the current positive integer `--version`. A conflict must be resolved by reading current state; clients must not silently retry.

Delete operations are `high-risk-write`. Other mutations are `write`. Extraction returns accepted asynchronous work and must not be described as completed memory creation.

## Compatibility

Previously published commands with incompatible semantics remain hidden callable stubs for one release cycle. They return an actionable replacement and never map old inputs silently:

- `+submit-candidates` -> `+candidate-submit`
- `+pending-list` -> `+candidate-list --view pending`
- `+pending-approve` / `+pending-reject` -> candidate review commands
- `+organize` -> `+extract`
- `+default-*` -> workspace capability commands
- `+mark-used` -> platform-managed runtime accounting
- `+write-context` -> `+context`

Old `--scope`, memory `--type`, `--expires-at`, local context-file writing, and public usage accounting are not part of memory v2.
