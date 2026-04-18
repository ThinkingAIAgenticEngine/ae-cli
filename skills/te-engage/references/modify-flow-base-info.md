# te-engage +modify_flow_base_info

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Modify the basic information of a flow canvas.

Mapped command: `ae-cli engage +modify_flow_base_info`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--flow_uuid` | string | Yes | Flow UUID |
| `--flow_name` | string | No | new flow name |
| `--flow_desc` | string | No | new flow description |
| `--group_id` | number | No | new group ID |

## Safety Constraints

This command is a **write operation** and modifies the basic information of a flow.

## Examples

```bash
ae-cli engage +modify_flow_base_info --project_id 1 --flow_uuid flow_uuid_123 --flow_name "New Name"
```
