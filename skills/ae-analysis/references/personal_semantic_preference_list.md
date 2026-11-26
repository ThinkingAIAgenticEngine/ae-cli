# personal-semantic-preference list


Scope: use a positive project ID for project personal semantics, or `--project-id -1` for private global analysis semantics. The CLI routes global CRUD to `business_semantics.global_personal_context.*`; existing positive-project capability IDs are unchanged. Zero and other negative IDs are invalid. Global scope is isolated by authenticated company and owner. A missing global capability is a deployment prerequisite, not an empty directory or permission to fall back to a project write.
List the authenticated user's active personal semantic preference catalog for one project or global scope (`project_id=-1`).

For ordinary analysis Skill workflows, use `ae-cli context prepare` before project selection, then `ae-cli context prepare --project-id <id>` after selection; it combines company/project backgrounds with the full global/project personal and public catalogs. Retain that complete context for all business reads and writes. Do not call list again when preparation already supplied this scope. The standalone list command remains available unchanged for explicit directory inspection and existing callers. Read relevant full entries with get before applying them, including a default project. Never treat a failed initialization as an empty catalog.

Command:

```bash
ae-cli personal-semantic-preference list --project-id <project_id>
```

Input uses only `project_id`. Do not add pagination parameters: the backend returns a compact catalog intended for agent context.

Do not use this command for project semantics, shared knowledge, metadata catalogs, report/dashboard lists, or complete asset discovery. It only returns the current user's personal semantic preferences in the current project.

By default, the gateway returns every visible lightweight entry, `complete=true`, `truncated=false`, and `selection_policy=ALL_VISIBLE`. Each directory row contains only `id`, `title`, `summary`, `keywords`, `revision`, and `expired`. Keywords are selection hints visible to the Agent, never a keyword search or a mandatory literal match. Empty keyword arrays remain valid. No 90-day idle filter, heat ranking, count ceiling or byte limit applies. Deleted and forgotten entries are excluded. Explicitly expired entries remain in the directory with `expired:true`, but cannot be adopted in analysis. Redirect large JSON output to a private local file and read every page with the bundled read-semantic-catalog script; never treat a preview or partial read as a complete directory. See [business semantics](business_semantics_workspace.md).

Read a candidate with `ae-cli personal-semantic-preference get --project-id <project_id> --id <preference_id> --title <title_from_list>` without `--mark-used`. Verify current details, applicability and all necessary dependencies before adopting it; only then repeat get with `--mark-used` for an adopted item. The `--title` value is telemetry context only; the backend lookup is still keyed by `id`. Do not mark an item used when it was only inspected, maintained or rejected.

Use a likely match only as the current user's working interpretation. Verify any chosen asset or calculation against its saved definition before execution. A personal preference does not replace the asset's current definition.

## Capture a durable preference

The Agent owns the personal preference capture trigger. Choose `context_type` by meaning:

- `business_rule`: an explicit reusable business definition or calculation without an exact asset binding.
- `preference`: durable interpretation or output preference without an exact asset binding.
- `asset_context`: durable user wording or intent bound to one or more exact project assets. Send the complete ordered `resource_refs` array; each item has `resource_type`, string `resource_key`, and `display_name`. This identity is generic across reports, dashboards, events, properties, metrics, tags, clusters, data tables, and future asset types.
- `experience`: a confirmed reusable project work method or analysis workflow without an exact asset binding.
- `background`: stable personal context without an exact asset binding.

Any stable choice of a concrete asset, including an event-selection scenario, must use `asset_context`; do not encode asset IDs only in prose. In an active project scope, a user request such as "remember the above workflow", "save this process for this project", or "以后按这个流程" should be captured here as `context_type=experience`, not through `ae-cli memory`. A current-user working definition remains eligible for personal storage even when it would also benefit other users. Store it only as the current user's preference; do not copy the bound asset definition into its content or imply that it is shared authority. Keep future governance or lifecycle instructions out of the stored content. Do not save transient task details, one-off analysis results, company knowledge, or standalone metadata facts.

An explicit stable statement, correction, or confirmation that passes that evidence gate authorizes `personal-semantic-preference add` or `update` without a second "save" confirmation. Compare against the already loaded catalog first; when one existing preference matches, fetch it without `--mark-used` for maintenance, update that existing preference, and avoid creating a duplicate. Otherwise add a new one. An explicit instruction not to retain it always wins. Delete remains high risk and requires explicit user confirmation.

After a successful add, update, or delete, merge that response into the conversation's cached directory locally. Do not call list again merely to observe the write.

Deleted or forgotten preferences are hidden; explicit expiry is shown as a marker and blocks analysis use; long-unused active rules remain visible in the full catalog. Do not look for or invent a separate command for that behavior.

## Calculation definitions and acknowledgment

A clear user-defined calculation meaning or correction (for example, active users mean login users rather than registered users) must be actively captured when its scope and applicability are clear, without requiring a separate request to remember it. Resolve and bind the canonical event/property identity. If persistence intent or scope is uncertain, ask a focused save question; do not store one-off dates/results. Tell the user what was saved or updated and its scope only after success.

Always discover asset references rather than guessing them: `analysis-meta catalog list` returns the exact `resource_type`/`resource_key`. Virtual properties use `event_property` or `user_property` with canonical `prop_name`, not `virtual_property` or a numeric property ID. Global asset contexts may reference verified same-company projects only: `{"resource_type":"project","resource_key":"195","display_name":"System usage data"}`. A default query-project record describes that default in title/summary/content; a temporary project switch must not overwrite it.
