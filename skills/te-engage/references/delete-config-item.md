# te-engage +delete_config_item

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Delete a config item.

Mapped command: `ae-cli engage +delete_config_item`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--config_id` | string | Yes | config item ID |
| `--open_id` | string | Yes | operator open ID |

## Safety Constraints

This command is a **write operation** and deletes a config item.

## Examples

```bash
ae-cli engage +delete_config_item --project_id 1 --config_id cfg_123 --open_id ou_xxx
```
