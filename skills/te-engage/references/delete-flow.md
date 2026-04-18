# te-engage +delete_flow

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Batch delete flows.

Mapped command: `ae-cli engage +delete_flow`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--flow_uuid_list` | json | Yes | Flow UUID JSON array |

## Safety Constraints

This command is a **write operation** and and deletes flows.

## Examples

```bash
ae-cli engage +delete_flow --project_id 1 --flow_uuid_list '["flow_uuid_1"]'
```
