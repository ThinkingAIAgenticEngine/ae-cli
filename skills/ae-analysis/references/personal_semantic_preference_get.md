# personal-semantic-preference get

Get one personal semantic preference by ID.

Use this command after `personal-semantic-preference list` identifies a likely current-user preference. Pass the returned directory title with `--title`; it is telemetry context only, and the lookup still uses `id`. Pass `--mark-used` when the preference is adopted for the answer, query path, or as the matched target for an update.

Command:

```bash
ae-cli personal-semantic-preference get --project-id <project_id> --id <preference_id> --title <title_from_list> [--mark-used]
```

Input uses `project_id`, `id`, required `title`, and optional `mark_used`. `id` must be the exact `preference_<id>` value returned by list/add. `title` must be copied from the matching list item; do not invent it.

Do not use this command as a keyword search, project semantics lookup, or asset catalog lookup. Do not call it repeatedly for every catalog row. Do not use `--mark-used` for a candidate that turns out not to match the user's intent or is only inspected and then rejected.

Fetch and mark the personal item only when it materially affects the response. When its asset or calculation wording differs from the current saved definition, explain the difference and use the saved definition for execution unless the user explicitly requests a different calculation.

Output is the gateway envelope. `data.preference` contains the full personal preference, including content, complete ordered `resource_refs`, and revision. When `--mark-used` is set, the backend increments `heat_count` and updates `last_used_at` for that record.
