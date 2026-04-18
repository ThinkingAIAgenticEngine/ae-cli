# te-engage +add_approver

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Batch add approvers.

Mapped command: `ae-cli engage +add_approver`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--approvers` | json | Yes | approver open ID JSON array |

## Safety Constraints

This command is a **write operation** and and modifies the project approver configuration.

## Examples

```bash
ae-cli engage +add_approver --project_id 1 --approvers '["ou_xxx","ou_yyy"]'
```
