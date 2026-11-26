# personal-semantic-preference add


Scope: use a positive project ID for project personal semantics, or `--project-id -1` for private global analysis semantics. The CLI routes global CRUD to `business_semantics.global_personal_context.*`; existing positive-project capability IDs are unchanged. Zero and other negative IDs are invalid. Global scope is isolated by authenticated company and owner. A missing global capability is a deployment prerequisite, not an empty directory or permission to fall back to a project write.
Add one personal semantic preference for the authenticated user in one project or global scope (`project_id=-1`).

Use this when the user explicitly asks to save a personal semantic preference, or when the current project task contains an explicit stable statement, correction, reusable workflow, or confirmation that should become a reusable current-user preference. When a project scope is active, requests such as "remember the above workflow", "save this process for this project", or "以后按这个流程" are project-scoped personal semantics, not global memory; store reusable workflows with `context_type=experience`. A current-user working definition remains eligible even when the same content may benefit other users. A second "save" confirmation is not required after that evidence gate is met, unless the target meaning is ambiguous.

Command:

```bash
ae-cli personal-semantic-preference add --project-id <project_id> --context-type <context_type> --title <title> --summary <summary> --content <content> [--keywords '["keyword"]'] [--resource-refs '[{"resource_type":"report","resource_key":"101","display_name":"Revenue daily report"}]'] [--fresh-until-at "yyyy-MM-dd HH:mm:ss"] [--request-id <id>]
```

Use `business_rule` for an explicit reusable business definition or calculation without an exact asset binding, `preference` for durable interpretation/output preferences, `asset_context` for durable wording or intent bound to exact assets, `experience` for confirmed reusable project work methods or analysis workflows, and `background` for stable personal context. `--resource-refs` is required and non-empty only for `asset_context`; for every other type it must be absent or empty. Existing context types remain valid; do not automatically migrate historical entries.

Apply the [capture quality rules](business_semantics_workspace.md#capture-quality): summaries preserve the business subject, applicability and key exclusions; optional keywords use distinctive business phrases; changing environment observations do not become permanent business rules.

`--resource-refs` accepts 1 to 50 ordered objects. Each object contains exactly `resource_type`, string `resource_key`, and `display_name`; `(resource_type, resource_key)` must be unique. `resource_type` is generic lower snake_case rather than a report-only enum, so events, properties, metrics, tags, clusters, reports, dashboards, data tables, and later asset types share the same shape. Array order is the user's intended priority.

`--request-id` is an idempotency key; omit it for ordinary interactive use and the CLI will generate one.

This command creates only a current-user preference; it never creates or approves a project semantic. Do not reject an otherwise valid personal preference merely because the same content may benefit other users, and do not imply that the saved preference is shared authority. Keep project-candidate recommendation separate: after personal capture, ask whether to recommend broadly reusable content as a project semantic candidate, and submit nothing without that choice.

Store only the present working preference. Do not append future governance or lifecycle instructions. Do not use this command for company knowledge, standalone metadata facts, reports, dashboards, transient task details, one-off analysis results, or automatic stale/expired preference handling.

Output is the gateway envelope. `data.preference` contains the full created preference, current revision, and complete ordered `resource_refs`. A separate readback is unnecessary unless a later step needs to refresh the record.

## Calculation definitions and acknowledgment

A clear user-defined calculation meaning or correction (for example, active users mean login users rather than registered users) must be actively captured when its scope and applicability are clear, without requiring a separate request to remember it. Resolve and bind the canonical event/property identity. If persistence intent or scope is uncertain, ask a focused save question; do not store one-off dates/results. Tell the user what was saved or updated and its scope only after success.

Always discover asset references rather than guessing them: `analysis-meta catalog list` returns the exact `resource_type`/`resource_key`. Virtual properties use `event_property` or `user_property` with canonical `prop_name`, not `virtual_property` or a numeric property ID. Global asset contexts may reference verified same-company projects only: `{"resource_type":"project","resource_key":"195","display_name":"System usage data"}`. A default query-project record describes that default in title/summary/content; a temporary project switch must not overwrite it.

Optional `--applicable-question`, `--dependency-ids` (JSON array), and `--sources` (JSON array) preserve applicability, explicit dependencies and provenance. Default sources to `[{"name":"business-overview.docx"}]`, optionally with `input_file_id` for a retained original, or reuse an authorized `evidence_id`. Keep paths, raw JSON and detailed excerpts in the private local plan, not in the save payload. `business_rule` is supported alongside existing types. See [the business semantics workflow](business_semantics_workspace.md) for multiple files and independent sharing. Successful personal saves stay committed if the returned `follow_result` reports a project synchronization failure; report the two outcomes separately.
