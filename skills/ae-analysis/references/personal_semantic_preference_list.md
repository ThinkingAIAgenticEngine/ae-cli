# personal-semantic-preference list


Scope: use a positive project ID for project personal semantics, or `--project-id -1` for private global analysis semantics. The CLI routes global CRUD to `business_semantics.global_personal_context.*`; existing positive-project capability IDs are unchanged. Zero and other negative IDs are invalid. Global scope is isolated by authenticated company and owner. A missing global capability is a deployment prerequisite, not an empty directory or permission to fall back to a project write.
List the authenticated user's active personal semantic preference catalog for one project or global scope (`project_id=-1`).

Load the global catalog before project selection in every new analysis conversation; after resolving the project, load its catalog before asset discovery or a query. Read relevant full entries with get before applying them, including the default project. Cache once per host/account/company/project/conversation; refresh on scope change or update the cache from write results. Never treat a failed initialization as an empty catalog.

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

## Calculation definitions and acknowledgment

A clear user-defined calculation meaning or correction (for example, active users mean login users rather than registered users) must be actively captured when its scope and applicability are clear, without requiring a separate request to remember it. Resolve and bind the canonical event/property identity. If persistence intent or scope is uncertain, ask a focused save question; do not store one-off dates/results. Tell the user what was saved or updated and its scope only after success.

Always discover asset references rather than guessing them: `analysis-meta catalog list` returns the exact `resource_type`/`resource_key`. Virtual properties use `event_property` or `user_property` with canonical `prop_name`, not `virtual_property` or a numeric property ID. Global asset contexts may reference verified same-company projects only: `{"resource_type":"project","resource_key":"195","display_name":"System usage data"}`. A default query-project record describes that default in title/summary/content; a temporary project switch must not overwrite it.
