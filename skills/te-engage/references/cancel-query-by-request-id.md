# te-engage +cancel_query_by_request_id

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Cancel a running data query by requestId.

Mapped command: `ae-cli engage +cancel_query_by_request_id`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--request_id` | string | Yes | Query requestId |

## Safety Constraints

This command is a **write operation** and cancels an existing query.

## Examples

```bash
ae-cli engage +cancel_query_by_request_id --request_id 00000000-0000-0000-0000-000000000000
```
