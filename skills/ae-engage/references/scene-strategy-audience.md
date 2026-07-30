# Scene strategy semantic audience

Scene strategy capabilities expose Analysis-compatible semantic audience definitions. Do not construct or submit internal QP fields, calculation codes, metadata display fields, or numeric relation values.

## Public contract

| Operation | Audience field |
|---|---|
| `strategy create`, `update`, `save-submit` | `payload.definitionRequest` (native camelCase payload) |
| `strategy get` | `data.item.definition_request` |
| `strategy predict` | `--definition-request` |

For a custom audience, set `targetClusterType` to `1` and supply `definitionRequest`. For all users, set `targetClusterType` to `0` and omit `definitionRequest`.

Do not pass `targetClusterQp` or `qp`. Hermes compiles the semantic definition before invoking the existing strategy service and converts stored definitions back on get.

## Semantic definition

Use the same condition definition accepted by Analysis user-cluster commands:

```json
{
  "type": "condition",
  "conditions": {
    "relation": "and",
    "items": [
      {
        "type": "user_property",
        "property": "vip_level",
        "operator": "eq",
        "value": "gold"
      },
      {
        "type": "event_behavior",
        "event": "purchase",
        "aggregation": "count",
        "operator": "gte",
        "value": 2,
        "time": {
          "type": "relative",
          "unit": "day",
          "value": 7
        }
      }
    ]
  }
}
```

Before writing, resolve real event and property names through Analysis metadata commands. Never invent names or copy internal calculation codes from historical output.

Nested `and`/`or`, user properties, event behavior, include/exclude existing clusters, relative time, and custom time use the Analysis semantic shape documented by `ae-analysis`.

## Create or update

```bash
ae-cli engage-scene strategy create --project-id <project_id> \
  --payload '{"configId":"cfg-1","templateId":"tpl-1","strategyName":"s1","targetClusterType":1,"definitionRequest":{"type":"condition","conditions":{...}}}'
```

Use `strategy get` as the source for an update. When `definition_status` is `UNAVAILABLE`, do not guess a replacement definition; ask the user to redefine the audience.

## Audience size estimate

```bash
ae-cli engage-scene strategy predict --project-id <project_id> \
  --definition-request '{"type":"condition","conditions":{...}}' \
  --zone-offset 8 \
  [--strategy-uuid <uuid>]
```

Prediction and save use the same semantic compiler. Reuse the exact semantic definition between them.

## Read behavior

`strategy get` hides the stored execution QP and returns:

```json
{
  "definition_request": {
    "type": "condition",
    "conditions": {}
  },
  "definition_status": "AVAILABLE"
}
```

For unsupported historical data, `definition_request` is absent, `definition_status` is `UNAVAILABLE`, and `definition_unavailable_reason` contains a stable reason. Raw legacy QP is not returned.
