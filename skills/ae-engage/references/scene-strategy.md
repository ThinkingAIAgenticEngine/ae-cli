# engage-scene strategy

> Capability ids: `engage-scene.strategy.{list,get,create,update,log,batch-copy,manage}` · Domain: `engage`.

Scene management / config center — config item strategy management. `create`/`update` pass backend DTOs via `--payload` (native camelCase structure); `project_id` is injected into the payload.

## Commands

```bash
# List or get strategies
ae-cli engage-scene strategy list --project-id <project_id> [--config-id <config_id>] \
  [--strategy-uuid-list '["uuid-1"]']
ae-cli engage-scene strategy get --project-id <project_id> --config-id <config_id> \
  --strategy-uuid <uuid>

# Create a config strategy (draft)
ae-cli engage-scene strategy create --project-id <project_id> \
  --payload '{"configId":"cfg-1","templateId":"tpl-1","strategyName":"s1", ...}'

# Update a config strategy
ae-cli engage-scene strategy update --project-id <project_id> \
  --payload '{"strategyUuid":"uuid-1","strategyName":"s2", ...}'

# Query a strategy's log
ae-cli engage-scene strategy log --project-id <project_id> --strategy-uuid <uuid>

# Batch-copy strategies
ae-cli engage-scene strategy batch-copy --project-id <project_id> --config-id <config_id> \
  --strategy-ids '["s1","s2"]' [--op-mode batch]

# Apply a strategy management action
ae-cli engage-scene strategy manage --project-id <project_id> --config-id <config_id> \
  --action online --strategy-uuid-list '["uuid-1"]'
```

## Parameters

| Command | Required flags | Notes |
|---|---|---|
| list | `--project-id` | Optional `--config-id`, `--strategy-uuid-list`. |
| get | `--project-id`, `--config-id`, `--strategy-uuid` | read. |
| create | `--project-id`, `--payload` | payload = `ConfigStrategyAddDTO`. |
| update | `--project-id`, `--payload` | payload = `ConfigStrategyModifyDTO` (`strategyUuid` + fields). |
| log | `--project-id`, `--strategy-uuid` | read. |
| batch-copy | `--project-id`, `--config-id`, `--strategy-ids` | `--op-mode` optional (default `batch`). |
| manage | `--project-id`, `--config-id`, `--action` | Lifecycle actions require `--strategy-uuid-list`; review actions require `--strategy-list`; write. |

## Output

- `list`: `data.items` + `data.total`; `get`: `data.item`.
- `create`: `data.strategy_uuid`.
- `update`: `data.success`.
- `log`: `data.log`.
- `batch-copy`: `data.result`.
- `manage`: `data.item`.

## Decision Rules

- Discover real strategy UUIDs / config IDs first; never invent IDs.
- **`create` requires an enabled template** on the same config item. Enable workflow: `config-param batch-add` → `template create` → `template update` (non-empty `config[]` with real `paramId`) → `template update-status --status 1`. Otherwise `create` returns `TEMPLATE_ENABLE`.
- `create` output field is `data.strategy_uuid` (not `strategy_id`).
- `manage` supports `online`, `offline`, `suspend`, `delete`, `approve`, `deny`, and `cancel`; it is a write operation.
- Save-and-submit and strategy test-send are separate high-impact operations and remain unexposed; use the product UI.
