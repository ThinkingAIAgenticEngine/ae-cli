# analysis alert update

Use only when the user asks to update an alert.

Command:

```bash
ae-cli analysis alert update --project-id <project_id> --alert-id <alert_id> --definition-request '<definition_request>'
```

Capability id: `analysis.alert.update`

Input sends `project_id`, `alert_id`, and `definition_request`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

If the alert definition fields are not known from the current task, inspect `ae-cli capability inspect analysis.alert.update` once and use its snake_case input schema.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--alert-id` | Alert task ID. | Yes |
| `--definition-request` | Structured alert definition request JSON object using snake_case field names. | Yes |
