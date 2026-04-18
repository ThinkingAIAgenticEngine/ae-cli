# te-engage +delete_config_channel

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Delete a config channel.

Mapped command: `ae-cli engage +delete_config_channel`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--channel_id` | string | Yes | config channel ID |

## Safety Constraints

This command is a **write operation** and and deletes a config channel.

## Examples

```bash
ae-cli engage +delete_config_channel --project_id 1 --channel_id <channel_id>
```
