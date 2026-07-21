# analysis alert-definition-schema get

Use when get the alert definition schema.

Do not use for commands listed under the sheet's non-CLI section or for unrelated metadata/report operations. If the command needs a complex JSON object, read the backend schema or existing asset first and send snake_case fields only.

Command:

```bash
ae-cli analysis alert-definition-schema get
```

Capability id: `analysis.alert_definition_schema.get`

Input sends No input. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Export commands return lifecycle data such as `run_id` and `artifact_id` for inspect/download.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| None | - | - |

