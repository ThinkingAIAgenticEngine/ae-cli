# te-engage +manage_flow

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Batch manage flow status or review actions.

Mapped command: `ae-cli engage +manage_flow`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--action` | string | Yes | action type |
| `--flow_list` | json | No | Review list JSON array |
| `--pause_flow_list` | json | No | pause list JSON array |
| `--flow_id_list` | json | No | Flow ID JSON array |
| `--reason` | string | No | review reason |

## Enum Notes

### `--action`

- `approve`: review approved, requires `--flow_list`
- `deny`: review denied, requires `--flow_list`
- `cancel`: cancel review, requires `--flow_list`
- `pause`: pause flow, requires `--pause_flow_list`
- `recover`: resume flow, requires `--flow_id_list`
- `end`: end flow, requires `--flow_id_list`

## JSON Parameter Notes

### `--flow_list`

Used for review actions such as `approve`, `deny`, and `cancel`. Each array item is an object:

| Field | Type | Required | Description |
|------|------|------|------|
| `flowUuid` | string | Yes | Flow UUID |
| `reason` | string | No | per-item review reason |

Examples: 

```json
[
  { "flowUuid": "flow_uuid_1", "reason": "approve by ops" }
]
```

### `--pause_flow_list`

Used for the `pause` action. Each array item is an object:

| Field | Type | Required | Description |
|------|------|------|------|
| `flowId` | string | Yes | Flow ID |
| `flowInstanceProcessType` | number | No | flow instance processing mode |

`flowInstanceProcessType` enum:

- `1`: normal, normal pause
- `2`: force exit, force-exit the instance

Examples: 

```json
[
  { "flowId": "flow_id_1", "flowInstanceProcessType": 1 }
]
```

### `--flow_id_list`

Used for batch operations by ID such as `recover` and `end`:

```json
["flow_id_1", "flow_id_2"]
```

## Safety Constraints

This command is a **write operation** and changes the flow status.

Different `action` values require different parameters:

- `approve` / `deny` / `cancel`: must include `--flow_list`
- `pause`: must include `--pause_flow_list`
- `recover` / `end`: must include `--flow_id_list`

## Examples

```bash
ae-cli engage +manage_flow --project_id 1 --action end --flow_id_list '["flow_id_1"]'
```
