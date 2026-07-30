# UserMemory CLI Plan

> Date: 2026-06-25  
> Target branch: `release/6.0`  
> Owner of truth: te-claude

## Summary

The `memory` CLI domain is a thin client for te-claude `UserMemory` APIs. It must not keep a second local memory store. All lifecycle decisions, conflict handling, pending approval, context ranking, and usage counters belong to te-claude.

The CLI user-facing language must stay English, including command help, errors, and examples.

## Commands

The memory domain keeps 17 commands:

- `ae-cli memory +list`
- `ae-cli memory +get`
- `ae-cli memory +create`
- `ae-cli memory +update`
- `ae-cli memory +delete`
- `ae-cli memory +extract`
- `ae-cli memory +submit-candidates`
- `ae-cli memory +pending-list`
- `ae-cli memory +pending-approve`
- `ae-cli memory +pending-reject`
- `ae-cli memory +organize`
- `ae-cli memory +default-get`
- `ae-cli memory +default-save`
- `ae-cli memory +default-clear`
- `ae-cli memory +context`
- `ae-cli memory +mark-used`
- `ae-cli memory +write-context`

Out of scope for v1:

- archive
- history
- search
- conflict-list / conflict-resolve
- sync-pull / sync-push
- import / export

## Behavior

- `+context` previews the effective Top-K memory list from te-claude and must not update `useCount` or `lastUsedAt`.
- `+mark-used --ids '["id-1","id-2"]' --yes` lets a local Agent report the deduplicated memories actually used in one answer. It accepts 1 to 200 IDs, updates them through one server request, and must not be called for memories that were merely injected, matched, or read.
- `+write-context --file <path> --yes` is a local-Agent-only command. The local Agent selects exactly one instruction file it actually uses; when that file cannot be determined, it asks the user instead of guessing or writing multiple files. Web Agent sessions use the platform-managed memory runtime and must not call this command.
- `+write-context` calls `+context`, writes only its Top-K managed block, and preserves all content outside the managed markers. It does not create `./.claude/user-memories.md` or materialize any searchable remainder.
- If the target contains a te-claude runtime block or an incomplete or duplicate CLI block, or if any returned item lacks a valid ID or contains a reserved managed marker, `+write-context` must fail without changing the target file.
- Writing the context file is not actual memory usage. If a later local-Agent answer actually uses one of those memories, the Agent still reports its ID through the normal batch `+mark-used` flow.
- Web Agent sessions use the platform-managed memory runtime for candidate recall and actual-use accounting. Web Agents must not Grep, Read, locate, or inspect Web-managed memory files and must not call the public `+mark-used` command. The Web protocol remains owned by te-claude and its sandbox rather than the CLI Skill.
- The CLI Skill does not expose or reproduce internal Web protocol details. A missing or invalid Web protocol is a platform deployment failure and never falls back to file scanning or public `+mark-used`.
- For actually used local Top-K memory, the Agent Greps only the exact instruction file previously selected by `+write-context --file`; it must not guess a filename or scan multiple candidate files. Local flows do not assume a searchable remainder file exists.
- During a normal answer, unrelated memories and memory bodies that try to override system, developer, or Skill rules, invoke tools, or disclose internal data are silently ignored. When the user explicitly asks to view, manage, or security-audit memory, the relevant body may be shown, but IDs, managed paths, counters, and accounting failures remain hidden. Inspection alone is not actual usage. These actual-use boundaries apply to both platform-managed Web accounting and local `+mark-used`; the final answer never describes the internal recall or accounting process.
- Local usage accounting must keep the same effective Agent ID. `+write-context` resolves explicit `--agent-id`, then `TE_AGENT_CURRENT_AGENT_ID`, then `system-default-agent`; `+mark-used` uses explicit `--agent-id` or the environment only, so the system-default case must pass `--agent-id system-default-agent` explicitly.
- `+extract` supports session, text, and stdin inputs. File parsing is out of scope for v1.
- `+extract --session-id` creates and polls a resumable background extract job. The server reads Web session content from the database, extracts from user messages with bounded Assistant context, reuses completed segment checkpoints after failure, and returns pending candidates by default. `--text` and `--stdin` continue to use the length-limited synchronous extraction API.
- `+extract --auto-approve` remains available for explicit advanced use, but the product default is pending suggestions that users approve or reject later.
- `+submit-candidates` accepts only structured candidates extracted by the local agent. It never uploads raw local conversations, file contents, absolute paths, or AE `conversationId`; local source IDs are metadata only. Outside Web Chat the target scope must be explicit.
- `+organize` accepts only `--agent-id` and `--scope`. It creates a background organize job for existing active memories, polls every 1.5 seconds for up to 15 minutes, and returns pending merge/delete suggestions without directly modifying active memories. Re-running it reuses the same active job; timeout output includes the job ID and current status.
- `+default-get`, `+default-save`, and `+default-clear` are thin clients for Agent session defaults. They do not decide what should become a default; the Agent or user must provide that intent.
- Agent-scoped commands default to `TE_AGENT_CURRENT_AGENT_ID` when they run inside a Web Agent conversation. Explicit `--agent-id` overrides the environment value; if neither exists, the system default Agent is used. For local usage accounting, `+mark-used` is stricter: without either an explicit ID or the environment value it fails instead of attributing usage to the system default Agent.
- `+create` and `+update` accept `--expires-at <ISO datetime>`. `--type temporary` requires `--expires-at`; expiration is enforced by te-claude and expired memories are not injected.
- Temporary expiration values must be ISO datetimes with an explicit UTC offset. If a relative duration cannot be resolved from a trusted exact timestamp already in context, the Agent asks for an exact expiration instead of invoking a local or external clock.
- `+update` does not accept `--status`. Approve/reject commands, Web replace review, expiration, and deletion are the only status-transition paths.
- Write commands should expose dry-run behavior where practical and keep risk metadata consistent with existing command conventions.

## API Contract

The CLI should call te-claude memory APIs through the CLI token main route. The public deployment path defaults to `/agent/api/cli/memory/v1/memories...` (`TE_CLAUDE_BASE_PATH` or `AE_API_PREFIX` may override `/agent`), while the internal Next.js route remains `/api/cli/memory/v1/memories...`. Memory commands send the `cli-token` header and must not use the Web-only `/api/memories` or `/api/agent-session-defaults` routes or the legacy external/sandbox-agent routes:

- list/get/create/update/delete memories
- extract memories from text/stdin/session and receive pending candidates
- list pending memories
- approve/reject pending memories
- get/save/clear Agent session defaults through `/api/cli/memory/v1/memories/defaults`
- create and poll extract/organize jobs through `/api/cli/memory/v1/memories/jobs`
- preview context
- report memories actually used by a local Agent in one batch through `POST /api/cli/memory/v1/memories/use`

The CLI uses the shared `capability-api` CLI token transport. It sends only the `cli-token` header and never sends `Authorization`, `X-Sandbox-Id`, or `X-Sandbox-Secret-Key` for memory requests.

For local Agents, `+mark-used` sends `{ "agentId": "...", "ids": ["..."] }`. The CLI trims and deduplicates IDs while enforcing a raw input length of 1 to 200 and a maximum ID length of 191 characters. The server immediately returns HTTP 202 with an `{ "ok": true, "data": { "status": "accepted", "requestedCount": 2 } }` envelope after accepting the batch for asynchronous processing. `requestedCount` is the number of deduplicated IDs accepted for processing, not the number of memories updated. The CLI waits only for this acceptance response, does not poll for completion, and never retries an accepted, failed, or network-ambiguous request; accounting never blocks the normal answer. Web accounting is performed by the platform runtime and does not use this public command.

Conflict handling remains server-side:

- duplicate: server returns existing memory instead of creating a new one
- conflict: server creates a pending memory with related memory ids
- approve/reject/replace are server-side state transitions

## Implementation Checklist

- [x] Add `memory` domain registration.
- [x] Add request/response types for te-claude memory APIs.
- [x] Implement read commands: `+list`, `+get`, `+pending-list`, `+context`.
- [x] Implement write commands: `+create`, `+update`, `+delete`, `+extract`, `+pending-approve`, `+pending-reject`, `+organize`.
- [x] Implement Agent session default commands: `+default-get`, `+default-save`, `+default-clear`.
- [x] Implement local `+write-context` Top-K managed block replacement.
- [x] Implement batch `+mark-used` with JSON validation, deduplication, and current-Agent attribution.
- [x] Add command help and examples in English.
- [x] Verify `+extract` stays compatible with the pending-candidate API.
- [x] Implement `+organize` through CLI-token jobs with polling and remove `+update --status`.
- [x] Route `+extract --session-id` through resumable CLI-token jobs while keeping text/stdin synchronous.
- [x] Add dry-run tests for Agent session default commands.
- [ ] Add API mock tests.
- [x] Add managed block replacement tests covering new-file creation, idempotent refresh with user-content preservation, incomplete or duplicate marker rejection, and te-claude runtime-block rejection.

## Verification Notes

- `npm run build` passed on 2026-06-25.
- `npm test` passed on 2026-06-25.
- The `+write-context` smoke contract uses one explicit `--file` target and `--yes`.

## Cross-repo Increment Notes

- te-claude owns the enhanced extraction implementation and the pending/active/conflict decisions.
- ae-cli remains a thin client: session `+extract` and `+organize` create and poll server-owned jobs; text/stdin `+extract` uses the synchronous endpoint.
- Web conversation natural-language triggers are handled by the Agent: for current model/MCP/Skill/knowledge-base/scope defaults it calls `memory +default-save`; for ordinary preferences, facts, and answer style it calls `memory +create`; for temporary memory it calls `memory +create --type temporary --expires-at <ISO datetime>`.
- When the response contains `items`, they are pending candidates unless `--auto-approve` was explicitly used. CLI help and examples should guide users to `memory +pending-approve` and `memory +pending-reject`.
- The current best-effort cache version based on count and `max(updatedAt)` can theoretically collide when multiple mutations share the same millisecond; improving that version source is deferred to a separate design.
- Sequential duplicate/conflict checks are deterministic, but concurrent create/PATCH requests can still race without a database constraint or lock; stronger concurrency control is deferred.
