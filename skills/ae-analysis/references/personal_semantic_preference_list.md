# personal-semantic-preference list

List the authenticated user's active personal semantic preference catalog for one project.

When the request involves personal business wording, asset preferences, or explicit personalization, use this command once per host, authenticated user, project, and conversation after resolving the project. Keep the returned directory in conversation context for later questions where user-specific wording or preferences may change interpretation.

Command:

```bash
ae-cli personal-semantic-preference list --project-id <project_id>
```

Input uses `project_id` only. Do not add pagination parameters: the backend returns a compact catalog intended for agent context.

Do not use this command for project semantics, shared knowledge, metadata catalogs, report/dashboard lists, or complete asset discovery. It only returns the current user's personal semantic preferences in the current project.

Output is the gateway envelope. `data.items[]` contains only `id`, `context_type`, `title`, truncated `summary`, limited `keywords`, `resource_ref_count`, distinct `resource_types`, and `revision`; it deliberately omits content, full asset references, heat, and timestamps. `data.returned_count` is at most 200, `data.truncated` says whether entries were omitted, and `data.selection_policy` is `HOT_160_PLUS_RECENT_40`: up to 160 highest-heat items plus up to 40 recently changed items not already selected. The backend may return fewer items to keep the data payload within 64 KiB.

If one returned item is actually adopted to interpret the user's request, call `ae-cli personal-semantic-preference get --project-id <project_id> --id <preference_id> --title <title_from_list> --mark-used` before using its full content. The `--title` value is telemetry context only; the backend lookup is still keyed by `id`. Do not mark an item used when it was only inspected or rejected.

Use a likely match only as the current user's working interpretation. Verify any chosen asset or calculation against its saved definition before execution. A personal preference does not replace the asset's current definition.

## Capture a durable preference

The Agent owns the personal preference capture trigger. Choose `context_type` by meaning:

- `preference`: durable interpretation or output preference without an exact asset binding.
- `asset_context`: durable user wording or intent bound to one or more exact project assets. Send the complete ordered `resource_refs` array; each item has `resource_type`, string `resource_key`, and `display_name`. This identity is generic across reports, dashboards, events, properties, metrics, tags, clusters, data tables, and future asset types.
- `experience`: a confirmed reusable project work method or analysis workflow without an exact asset binding.
- `background`: stable personal context without an exact asset binding.

Any stable choice of a concrete asset, including an event-selection scenario, must use `asset_context`; do not encode asset IDs only in prose. In an active project scope, a user request such as "remember the above workflow", "save this process for this project", or "以后按这个流程" should be captured here as `context_type=experience`, not through `ae-cli memory`. A current-user working definition remains eligible for personal storage even when it would also benefit other users. Store it only as the current user's preference; do not copy the bound asset definition into its content or imply that it is shared authority. Keep future governance or lifecycle instructions out of the stored content. Do not save transient task details, one-off analysis results, company knowledge, or standalone metadata facts.

An explicit stable statement, correction, or confirmation that passes that evidence gate authorizes `personal-semantic-preference add` or `update` without a second "save" confirmation. Compare against the already loaded catalog first; when one existing preference matches, fetch it with `--mark-used`, update that existing preference, and avoid creating a duplicate. Otherwise add a new one. An explicit instruction not to retain it always wins. Delete remains high risk and requires explicit user confirmation.

After a successful add, update, or delete, merge that response into the conversation's cached directory locally. Do not call list again merely to observe the write.

Stale or expired preferences are automatically hidden by list filtering and backend maintenance. Do not look for or invent a separate command for that behavior.
