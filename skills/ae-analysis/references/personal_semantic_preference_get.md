# personal-semantic-preference get


Scope: use a positive project ID for project personal semantics, or `--project-id -1` for private global analysis semantics. The CLI routes global CRUD to `business_semantics.global_personal_context.*`; existing positive-project capability IDs are unchanged. Zero and other negative IDs are invalid. Global scope is isolated by authenticated company and owner. A missing global capability is a deployment prerequisite, not an empty directory or permission to fall back to a project write.
Get one personal semantic preference by ID.

Use this command after `personal-semantic-preference list` identifies a likely current-user preference. Pass the returned directory title with `--title`; it is telemetry context only, and the lookup still uses `id`. First read without `--mark-used`, then verify current details, applicability and all necessary dependencies recursively without marking use. Only after the rule is adopted for the answer or query path, repeat get with `--mark-used`. Maintenance reads for an update do not mark usage.

Command:

```bash
ae-cli personal-semantic-preference get --project-id <project_id> --id <preference_id> --title <title_from_list> [--mark-used]
```

Input uses `project_id`, `id`, required `title`, and optional `mark_used`. `id` must be the exact `preference_<id>` value returned by list/add. `title` must be copied from the matching list item; do not invent it.

Do not use this command as a keyword search, project semantics lookup, or asset catalog lookup. Do not call it repeatedly for every catalog row. Do not use `--mark-used` for a candidate that turns out not to match the user's intent or is only inspected and then rejected.

Mark the personal item only when its verified rule materially affects the response. A missing, expired or unreadable necessary dependency prevents adoption of the parent and must not produce a mark-used call, even when the directory summary gave no warning. When its asset or calculation wording differs from the current saved definition, explain the difference and use the saved definition for execution unless the user explicitly requests a different calculation.

Output is the gateway envelope. `data.preference` contains the full personal preference, including content, complete ordered `resource_refs`, and revision. When `--mark-used` is set, the backend increments `heat_count` and updates `last_used_at` for that record.

Use `--include-expired` only to inspect expired entries for maintenance. It cannot be combined with `--mark-used`. The next question may read current details using the retained directory; do not reload the directory.
