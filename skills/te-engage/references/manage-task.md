# te-engage +manage_task

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Perform task lifecycle actions such as send, pause, end, or review.

Mapped command: `ae-cli engage +manage_task`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--task_id` | string | Yes | task ID |
| `--action` | string | Yes | action type |
| `--reason` | string | No | reason for review actions |

## Enum Notes

### `--action`

- `send`: send immediately, typically for manually triggered tasks in the waiting state
- `pause`: pause a running task
- `end`: end a running or paused task
- `approve`: review approved
- `deny`: review denied
- `cancel`: cancel review

## Safety Constraints

This command is a **write operation** and and changes the task status.

## Examples

```bash
ae-cli engage +manage_task --project_id 1 --task_id task_123 --action pause
```
