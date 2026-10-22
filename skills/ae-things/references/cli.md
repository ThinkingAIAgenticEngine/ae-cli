# Workspace Things CLI reference

This reference describes implemented commands without duplicating permission and business-data rules. See the [main spec](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/feat/workspace-issues-convergence/docs/specs/2026-09-17-workspace-issues-convergence/spec.md).

Transition status: transitional
Owning module: te-claude / src/lib/agent-space-things
Current transport: TE REST /api/cli/things/v1; cli-token
Gateway target: Capability Gateway things domain (TBD)
Review after: 2026-10-14
Exit condition: Migrate the transport when Gateway provides equivalent space validation, idempotency, permissions, pagination and conversation associations.

Things is not yet integrated with Gateway. Typed flags, JSON/stdin, body-redacted dry-run, defaults and target-consistency checks provide the necessary Transitional entry point.

## Common parameters

`--agent-space-id` is required outside a conversation and must match the current conversation's space inside one. `--id` is the Thing ID. Writes use `--command-id <uuid>` for unchanged retries; one is generated when omitted. Editing, archiving and restoring require `--expected-version`. Pagination uses `--limit 1..100 --cursor <opaque>`, defaulting to 50. Global `--format json` produces structured output. `--dry-run` does not call business APIs, read files/stdin or expose body content. Unbinding the primary Thing, unlinking assets and removing collaborators are high-risk-write operations; explicitly authorized scripts use `--yes`.

## Fields and entries

Thing fields are limited to title, description, tags, status, assigneeId and collaboratorIds. Creation requires a title of 1–200 characters and a description of 1–10000 characters. Active statuses are `open | paused | done`; archiving and restoring are separate actions. In both personal and shared spaces, omitting the assignee on creation defaults to the current user. Omitting it on update leaves it unchanged; `null` is rejected. Use `--tags '["tag"]'` and `--collaborator-ids '["member-id"]'`; empty arrays clear these fields. `--assignee-id` must identify a valid space member.

Creation/update can read a camelCase field object with `--file fields.json` or `--stdin`; explicit flags override matching fields. Retired fields for acceptance criteria, priority, groups, due dates, progress snapshots, blockers, next steps and parent/child Things are rejected. The group and draft commands have been removed.

| Command | Parameters and results |
| --- | --- |
| `list` | `--query --status open\|paused\|done\|archived --assignee-id`; returns items/nextCursor |
| `get` | `--id`; fields, permissions, version, collaborators and latestProgress |
| `create` | `--title --description` and optional business fields |
| `update` | `--id --expected-version` and business fields |
| `archive/restore` | `--id --expected-version` |
| `delete` | `--id --expected-version --confirm-delete --yes`; irreversible, removes the Thing and all associations while retaining conversations, messages, historical run snapshots and space files; active-run conflicts return THING_RUNNING_CONFLICT |
| `members/options` | Paginated member/Thing candidates; options supports `--query` |
| `collaborator add/remove` | `--id --user-id` |
| `entry list` | `--id` and pagination; descending by createdAt, then id |
| `entry append` | `--id --type url\|note\|progress`; when type is omitted, the server detects a link or note; optional `--title`; exactly one of `--content`, `--file` or `--stdin` |
| `entry update` | `--id --entry-id --expected-updated-at`; at least one changed field: `--title`, `--clear-title`, `--type note\|url\|progress` or body input; title-only/type-only edits are allowed; title and clear-title are mutually exclusive |
| `from-message` | `--conversation-id --message-id` and body; choose either `--id` to append or `--title` to create; only append mode with `--id` accepts optional `--entry-type note\|progress`, defaulting to note; supplying it in create mode with `--title` is an error; creation uses the body as the description without an extra progress entry |

```bash
ae-cli things create --agent-space-id <space-id> --title 'Acceptance checks' --description 'Verify member operations and permissions' --format json
ae-cli things entry append --agent-space-id <space-id> --id <thing-id> --type progress --content 'Completed API integration checks' --format json
```

## Conversations

| Command | Parameters and meaning |
| --- | --- |
| `conversation get` | `--conversation-id`; read an accessible conversation snapshot and its current model projection |
| `conversation primary` | `--conversation-id`; read the primary-Thing association |
| `conversation bind/unbind` | `--conversation-id`; bind also requires `--id` |
| `conversations` | `--id` and pagination; linked conversations |
| `link-conversation` | `--id --conversation-id`; append a reference without replacing the primary Thing |

An association does not grant conversation access; other users' private conversations remain inaccessible. Binding/unbinding is allowed while a conversation is queued, running or waiting for interaction. It updates the association immediately without changing an accepted Run's frozen context, and takes effect for the next new Run. Read back with `conversation primary` after binding; an ordinary reference is not a substitute for a primary-Thing binding.

## Progress and summaries

Record interim deliverables with `entry append --type progress`. Use `--type note` for handoffs, describing completed work, evidence and next steps in the title and body. People-related relationships are assignees and collaborators; no claiming step is needed.

`+detail --id` collects the Thing, all readable entries/assets and live context. `+digest` supports an assignee filter or `--thing-ids id-a,id-b`, but not both scopes together. Optional `--from --to --time-zone` values define a start-inclusive, end-exclusive window; timestamps must include a timezone. By default, active and archived Things are paginated separately and deduplicated by ID across collections. Results include three-status open/paused/done counts, archivedCount, items and collection limits. latestProgress uses the server's latest progress entry. effectiveProgressCount counts progress entries only; it does not mean the model has verified their contents. The status timeline's before/after values support baseline reconstruction.

Each chain is limited to 100 pages / 10000 items. Errors, repeated cursors, continuation after an empty page or reaching a limit set truncated. Duplicate IDs are not evidence of completeness. Reports must check fetchedCount, truncated, consistency and collectedAt. non_transactional is not a transactional snapshot; baseline is null for changed_during_collection or truncation. counts represent state at collection, not period-end state. No recorded update does not mean no progress was made, and an available attachment does not mean it was read or accepted.

## Errors and recovery

For THING_INVALID_INPUT, correct the parameters. For THING_FORBIDDEN/THING_NOT_FOUND, do not infer facts about invisible resources. THING_READ_ONLY means the resource is read-only: restore archived Things before editing, restore space availability for unavailable spaces, and append a new record instead of editing an operation log. For THING_VERSION_CONFLICT/entry timestamp conflicts, reread and compare changes instead of merely replacing the version number. THING_COMMAND_CONFLICT means the same UUID was used for different requests. For THING_RATE_LIMITED, wait and retry with the original commandId. Primary-Thing binding is not rejected merely because a run is active; permanent deletion still retains the THING_RUNNING_CONFLICT active-run guard.

## Files and deliverables (phase 4)

`asset available` paginates over actual files and registered metadata in the current space. Registered items return a stable `assetId`; unregistered items have assetId=null and a relative path. `asset link` accepts exactly one of `--asset-id` or `--path`. Linking by path validates, registers and links the file; listing does not register files. `asset list --id` paginates Thing associations. Check availability and scanStatus/scanReason; a partial scan does not establish directory completeness.

```bash
ae-cli things asset available --agent-space-id <space-id> --limit 100 --format json
ae-cli things asset list --agent-space-id <space-id> --id <thing-id> --format json
ae-cli things asset link --agent-space-id <space-id> --id <thing-id> --asset-id <asset-id> --role attachment --command-id <uuid> --format json
ae-cli things asset publish --id <thing-id> --conversation-id <conversation-id> --artifact-id <artifact-id> --confirm-share --command-id <uuid> --format json
ae-cli things asset publish --id <thing-id> --conversation-id <conversation-id> --run-id <run-id> --source-path <absolute-delivered-file> --confirm-share --command-id <uuid> --format json
ae-cli things asset link --agent-space-id <space-id> --id <thing-id> --path <space-relative-path> --command-id <uuid> --format json
ae-cli things asset unlink --agent-space-id <space-id> --id <thing-id> --asset-id <asset-id> --command-id <uuid> --format json
```

- `role` accepts only attachment (the default). deliverable is rejected during argument validation in both normal execution and dry-run. Each Thing/asset pair has only one association.
- Pass `--confirm-share` for publication; see the Skill for authorization boundaries. Choose exactly one source: artifact-id, file-token or source-path. source-path also requires run-id. The server verifies run ownership, the actual sandbox file and the conversation artifacts directory boundary. Once published to the space, the file is visible to all members.
- Publication uses the existing conversation-artifact publisher. The publication receipt and asset metadata share a transaction; retrying with the original commandId does not copy again. When the response is `linked:false, assetId, code:THING_ASSET_LINK_FAILED`, the file is already shared. Complete only the association with asset link; do not republish or claim delivery is complete.
- Unlinking neither deletes the file nor makes it private again. Deleting a referenced asset returns `AGENT_SPACE_ASSET_REFERENCED`; unlink it first.
- `THING_ASSET_UNAVAILABLE` means the file is missing or cannot be verified. `THING_ASSET_PUBLISH_FAILED` means publication did not complete. File references freeze only the ID and reference text, not immutable body content. Context includes at most the first 10 references and explicitly reports overflow; read the full file list when needed.

<a id="执行快照与实时上下文"></a>

## Execution snapshots and live context

```bash
# Frozen facts used by this run; take parameters from this run's binding declaration
ae-cli things context --agent-space-id <space-id> --id <thing-id> --run-id <run-id> --format json
# Explicitly read current facts; existing behavior without run-id is unchanged
ae-cli things context --agent-space-id <space-id> --id <thing-id> --format json
```

With `--run-id`, the existing GET context request includes the `runId` parameter and returns the saved snapshot with `source: {kind: "run_snapshot", runId}`, `currentFiles` and `fileReferencePolicy`. `thing.version`/`capturedAt` are the version/time at acceptance; `currentFiles` contains currently available paths. File body versions are not guaranteed to be frozen; read them before use. Existing `notices` remain. Without this parameter, the original live context is returned. A run is not selected automatically from environment variables, and `+detail`/`+digest` continue collecting live data.

The run, conversation, space and original Thing in the snapshot must match, and the caller must still have access; a run ID is not authorization. The conversation's current primary Thing may have changed or been unbound; waits/resumes/retries in this run still read the original snapshot. `THING_TARGET_CONFLICT` means the snapshot and requested target differ; reconfirm the target. `THING_CONTEXT_UNAVAILABLE` means the snapshot is missing or corrupt; start a new execution instead of automatically falling back to live reads. `THING_NOT_FOUND` does not distinguish nonexistent from invisible resources. Archived Things and unavailable files continue using `THING_READ_ONLY` / `THING_ASSET_UNAVAILABLE`.

Switching or unbinding retains history and the provider session. It changes only the conversation association and the next new Run's default target; it does not erase memory or revoke access. Ordinary chat does not need a Thing lookup; specific Thing work reads the snapshot first. Current state and pre-write versions require an additional explicit live read. Disclose missing information when tools fail. **Changes to existing Things** require explicit user authorization or confirmation; a historical association does not authorize writeback. Creating new Things is not subject to that restriction: decide proactively using the [Skill's creation signals](../SKILL.md#when-to-create-things).

The owning module continues using the Things Transitional transport. The added parameter does not create a synonymous command or a separate Gateway entry point; the migration exit condition remains the admission record in this reference. The cross-repository implementation contract is te-claude `docs/specs/2026-09-17-workspace-issues-convergence/spec.md`; deliver the application and CLI/Skill together.
