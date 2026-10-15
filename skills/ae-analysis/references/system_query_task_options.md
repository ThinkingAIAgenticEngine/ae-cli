# system query-task options

Use before query-task list, realtime-list, or export to discover valid filter values exposed by the current environment.

Command:

```bash
ae-cli system query-task options --company-id <company_id>
```

Capability id: `system.query_task.options`.

The response maps:

- `statuses[].code` to the localized task status name.
- `content_types[].code` to the localized content type name.
- `task_types[].code` to the localized task type name.
- `projects[].project_id` and `workspaces[].space_code` to display names.
- `clusters[].cluster_name` to its query engine metadata.

Project and workspace options are limited to `--company-id`; status, content, task type, and cluster codes remain discoverable. Use the returned codes and names unchanged in `query-task list`, `query-task realtime-list`, or `query-task export`. Discovery does not authorize a project or workspace; execution still checks company ownership. Do not infer codes from UI labels or examples.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--company-id` | Yes | Company ID. |
