# engage-scene strategy

> Capability ids: `engage-scene.strategy.{create,update,log,batch-copy}` · Domain: `engage`.

场景管理 / 配置中心 - 配置项策略管理。create/update 使用 `--payload` 直传后端 DTO（原生 camelCase 结构），`project_id` 会注入 payload。

## Commands

```bash
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
```

## Parameters

| Command | Required flags | Notes |
|---|---|---|
| create | `--project-id`, `--payload` | payload = `ConfigStrategyAddDTO`. |
| update | `--project-id`, `--payload` | payload = `ConfigStrategyModifyDTO` (`strategyUuid` + fields). |
| log | `--project-id`, `--strategy-uuid` | read. |
| batch-copy | `--project-id`, `--config-id`, `--strategy-ids` | `--op-mode` optional (default `batch`). |

## Output

- `create`: `data.strategy_uuid`.
- `update`: `data.success`.
- `log`: `data.log`.
- `batch-copy`: `data.result`.

## Decision Rules

- Discover real strategy UUIDs / config IDs first; never invent IDs.
- **`create` requires an enabled template** on the same config item. Enable workflow: `config-param batch-add` → `template create` → `template update` (non-empty `config[]` with real `paramId`) → `template update-status --status 1`. Otherwise `create` returns `TEMPLATE_ENABLE`.
- `create` output field is `data.strategy_uuid` (not `strategy_id`).
- Save-and-submit and strategy test-send are not exposed via `engage-scene` CLI; use legacy `engage +manage_strategy` or the product UI.
