# te-engage +manage_strategy

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Batch manage strategy status or review actions.

Mapped command: `ae-cli engage +manage_strategy`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--config_id` | string | Yes | config item ID |
| `--action` | string | Yes | action type |
| `--strategy_uuid_list` | json | No | Strategy UUID JSON array |
| `--strategy_list` | json | No | Review-entry JSON array |
| `--reason` | string | No | review reason |

## Enum Notes

### `--action`

- `online`: publish strategy, requires `--strategy_uuid_list`
- `offline`: take strategy offline, requires `--strategy_uuid_list`
- `suspend`: suspend strategy, requires `--strategy_uuid_list`
- `delete`: delete strategy, requires `--strategy_uuid_list`
- `approve`: review approved, requires `--strategy_list`
- `deny`: review denied, requires `--strategy_list`
- `cancel`: cancel review, requires `--strategy_list`

## JSON Parameter Notes

### `--strategy_uuid_list`

Used for actions such as `online`, `offline`, `suspend`, and `delete` that batch-process items directly by UUID.

```json
["uuid_1", "uuid_2"]
```

### `--strategy_list`

Used for review actions such as `approve`, `deny`, and `cancel`. Each array item is an object:

| Field | Type | Required | Description |
|------|------|------|------|
| `strategyUuid` | string | Yes | strategy UUID |
| `reason` | string | No | review reason for that strategy |

Examples: 

```json
[
  { "strategyUuid": "uuid_1", "reason": "approve by ops" }
]
```

## Safety Constraints

This command is a **write operation** and changes the strategy status.

Different `action` values require different parameters:

- `online` / `offline` / `suspend` / `delete`: must include `--strategy_uuid_list`
- `approve` / `deny` / `cancel`: must include `--strategy_list`

## Examples

```bash
ae-cli engage +manage_strategy \
  --project_id 1 --config_id cfg_123 --action online \
  --strategy_uuid_list '["uuid_1"]'
```
