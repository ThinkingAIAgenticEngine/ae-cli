# te-engage +delete_channel

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Delete an Engage channel.

Mapped command: `ae-cli engage +delete_channel`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--channel_id` | string | Yes | channel ID |

## Safety Constraints

This command is a **write operation** and Before executing, confirm that this channel is allowed to be deleted.

## Examples

```bash
ae-cli engage +delete_channel --project_id 1 --channel_id <channel_id>
```
