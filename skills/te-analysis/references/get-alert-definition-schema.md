# analysis +get_alert_definition_schema (Get Alert Definition Schema)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata queries**

## Use Cases
- Helper tool positioning: this command provides structural definitions (schema) and should be used as a prerequisite step.
- Recommended order: first use the current schema tool to get the structure, then call the specific business tool.
- Typical follow-up tools: `+create_alert`, `+update_alert`
- Get the alert definition schema. Returns field definitions, enum descriptions, and examples for creating or updating alerts.
- Use this to understand the alert definition structure before calling create_alert or update_alert.

## Command
```bash
ae-cli analysis +get_alert_definition_schema
ae-cli analysis +get_alert_definition_schema --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| None | - | This command has no business parameters; call it directly. |

## Decision Rules
- It is recommended to run `--dry-run` first to inspect the request body mapping before making the formal call.

## Next Steps on Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.

## Recommended chaining
- +get_alert_definition_schema
