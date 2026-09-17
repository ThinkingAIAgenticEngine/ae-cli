# Analysis capability-gateway commands

Follow [`../SKILL.md`](../SKILL.md) for project resolution, personal preferences, command routing, evidence reuse, and authorization.

Gateway command paths use `ae-cli <service> <resource> <action>` with kebab-case flags and snake_case input. Services include `analysis`, `analysis-meta`, `analysis-governance`, `project`, `system`, and `tracking`; use the exact registered command path. Before execution, read its dedicated reference. If the family is unknown, search only matching rows in [`command_index.md`](command_index.md), which is the generated command, capability ID, flag, and risk inventory.

Use this overview for analysis assets and lifecycle routing. Do not use it as a substitute for a command's input contract or infer commands from old MCP names. An unsupported capability is a gap in the current host, not permission to invent a route.

## Result retrieval and lifecycle

Read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) for the supported run/export choice, result reading and preview limits. Ordinary reads execute directly when the target and complete definition are known. Use saved definitions when semantically equivalent; batch compatible metrics and reuse successful results.

Export submission returns one `run_id` / `artifact_id` pair. `--output <file>` waits and downloads; `--wait` waits without downloading. After local interruption, resume with `analysis run wait --run-id <run_id>` and the returned artifact identity. Completion requires both `status=SUCCEEDED` and `artifact_status=COMPLETED`; submission alone is not completion. Local interruption does not cancel a remote query. Cancellation uses the explicit `analysis query cancel` command with the required authorization.

The JSON envelope distinguishes success, empty success, partial results, and failures. Use bounded results directly; save stdout only for local processing or a requested file, keeping stderr visible. Exports do not create interactive query contexts. For synchronous follow-up, fetch `analysis query-context get` and use only the advertised action and returned selectable coordinate fragments with the original project ID.

## SQL and governance input

For SQL, discover an unknown authorized table with [`sql_table_list.md`](sql_table_list.md), inspect its exact reference through [`sql_table_columns.md`](sql_table_columns.md), and reuse verified columns in the same scope. Keep the same `usage` in both commands. Apply the discovered event-table date partition predicate and quote special identifiers. Generic data-table metadata does not establish SQL authorization.

For governance commands that expose `--payload`, it is an optional snake_case JSON object merged into top-level input. Explicit flags override its matching business fields, and `--project-id` owns project identity. Required business fields must exist after the merge; this construction does not change server permissions, feature availability, or the published server schema. Read the dedicated reference for the operation's required fields and risk.

## L3 project-space and folder capabilities

Capabilities without a dedicated typed command use dynamic discovery: `capability search` → `inspect` → `run`. Use `validate` while correcting input or `dry-run` for execution/risk preview when needed; do not stack them routinely.

For **create / delete / share**, read the linked reference before `capability inspect` then `run` (optional pre-check per [`ae-capability`](../../ae-capability/SKILL.md) on-demand table). For **`*.members` read**, use this matrix only — no separate `references/*.md` (pilot).

| Capability ID | Use for | Reference / discovery |
| --- | --- | --- |
| `analysis.project_space.create` | Create a project space | [`project_space_create.md`](project_space_create.md) |
| `analysis.project_space.delete` | Delete project spaces | [`project_space_delete.md`](project_space_delete.md) |
| `analysis.project_space.share` | Modify project-space members | [`project_space_share.md`](project_space_share.md) |
| `analysis.project_space.members` | Read project-space members | Matrix only (see below) |
| `analysis.folder.create` | Create personal/project-space folder | [`folder_create.md`](folder_create.md) |
| `analysis.folder.delete` | Delete folders | [`folder_delete.md`](folder_delete.md) |
| `analysis.folder.share` | Modify folder members | [`folder_share.md`](folder_share.md) |
| `analysis.folder.members` | Read folder members | Matrix only (see below) |

### L3 members (matrix-only pilot)

Read-only member lists; `risk=read`. Do not use to modify members — use the matching `*.share` capability.

**When to use:** inspect who has access to a project space or folder.

**When not to use:** modify members → `analysis.project_space.share` or `analysis.folder.share`.

```bash
ae-cli capability inspect analysis.project_space.members
ae-cli capability run analysis.project_space.members --input '{"project_id":1,"space_id":10}'

ae-cli capability inspect analysis.folder.members
ae-cli capability run analysis.folder.members --input '{"project_id":1,"folder_id":1001}'
```

| field | type | required | capability |
| --- | --- | --- | --- |
| `project_id` | integer | yes | both |
| `space_id` | integer | yes | `project_space.members` |
| `folder_id` | integer | yes | `folder.members` |

Output is the gateway envelope; `data` contains members.

### Saved business asset or ad-hoc

Choose the shortest path that preserves the requested business semantics:

1. Extract metric, dimensions, filters, time window, and comparison semantics.
2. Use a saved report/dashboard when the user names it, an exact ID or canonical name is already verified, or the conclusion requires its formal business definition.
3. For unknown business measures, use [metadata resolution](metadata_resolution.md) to search relevant saved metrics and reports together and read suitable definitions. Use dashboard search when the request names a dashboard or its context is needed.
4. Before querying a selected dashboard's report data, reuse verified detail or call `analysis dashboard get` once. Inspect `effective_settings` and `filter_config`; dashboard default, dashboard business, and space business filters are already applied and call-time filters add AND conditions. Honor the saved fixed time unless the user explicitly supplies a supported time override. Preserve non-empty `location.folder_name`, `dashboard_name`, `remark`, and `notes[].note_title/description` as authored dashboard context; never repeat detail per report. Fetch a report definition only when conclusion semantics are absent, stale, ambiguous, conflicting, or override-required.
5. Use `analysis adhoc run|export` for a custom combination, grouping, filter, comparison or exploration. Reuse applicable saved definitions and verified metadata, discover only missing fields, then execute the complete definition.
6. A failed query surface is not evidence that another surface is healthy. Do not switch among saved report, dashboard, ad-hoc, or export merely to re-prove a terminal failure in the same verified failure domain.

Do not call removed QP builders or schema helpers for ad-hoc analysis. `--definition` is the AI-facing contract from `ai_models.md`, not raw QP or a frontend DTO.
