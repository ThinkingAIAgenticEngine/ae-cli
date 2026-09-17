# analysis-meta virtual-event create

Use when the user needs to create a virtual event from events and filters.

Do not use it for super-event creation.

Before constructing `--events` / `--filter`, validate the available events and properties with `analysis-meta event list` and `analysis-meta property list` in the same `project_id`. Resolve tag and cluster names with `analysis user-tag list` / `analysis user-cluster list`; for a fixed tag snapshot, resolve a real date with `analysis history-tag list`.

Command:

```bash
ae-cli analysis-meta virtual-event create --project-id <project_id> --event-name ta@demo --event-desc demo --events '[{"event_name":"purchase"}]'
ae-cli analysis-meta virtual-event create --project-id <project_id> --event-name ta@demo2 --event-desc demo --remark demo --events '[{"event_name":"add_to_cart","filter":{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}}]' --override true
ae-cli analysis-meta virtual-event create --project-id <project_id> --event-name ta@vip_purchase --event-desc 'VIP purchase' --events '[{"event_name":"purchase","filter":{"relation":"and","items":[{"field":{"name":"vip_users","type":"tag"},"operator":"is_true","cluster_date_policy":"SPECIFIED","specified_cluster_date":"2026-09-15"}]}}]'
ae-cli analysis-meta virtual-event create --project-id <project_id> --override false --payload '{"event_name":"ta@qualified_purchase","event_desc":"Qualified purchase","rule":{"events":[...],"filter":{...}}}'
```

Capability id: `metadata.virtual_event.create`.

Input sends `project_id`, `override`, and `payload`. When typed flags are used, ae-cli builds `payload` from `event_name`, `event_desc`, `remark`, and `rule.events/filter`.

Output data contains `v_event_id` and `event_name`. Use the returned `v_event_id` for `virtual-event get` or `virtual-event delete`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--override` | No | Whether to override an existing virtual event rule. |
| `--payload` | No | Full virtual-event DTO: `event_id?`, `event_name`, `event_desc?`, `remark?`, `rule` (`events` plus optional common `filter`), `replace_remark?`, `replace_suggestion?`. Common header fields are server-owned and must be omitted. |
| `--event-name` | No | Virtual event name. Must start with `ta@`. Required when `--payload` is omitted. |
| `--event-desc` | No | Virtual event display name. Required when `--payload` is omitted. |
| `--remark` | No | Optional virtual event remark. |
| `--events` | No | JSON array of `{event_name,event_desc?,filter?}`. Each filter uses `{relation:"and|or",items:[{field:{name,type?},operator,values?,cluster_date_policy?,specified_cluster_date?}]}`. Required when `--payload` is omitted. |
| `--filter` | No | Optional global AI-facing filter with the same `relation/items` shape. Raw `taFilters`, `junctionKind`, and `calcuSymbol` are rejected. Normal properties must come from `analysis-meta property list`; tags/clusters must come from their dedicated list commands. |

## Decision Rules
- `events` / `filter` must not be handwritten by intuition alone; they must match real metadata in the same project.
- Use snake_case `event_name`; do not pass the legacy `eventName` spelling.
- `cluster_date_policy` is valid only when `field.type` is `tag` or `cluster`: `LATEST` uses the latest computed result, `AUTO` matches each analysis date dynamically, and `SPECIFIED` selects one fixed snapshot.
- `SPECIFIED` requires `specified_cluster_date` in `yyyy-MM-dd` format. Do not send `specified_cluster_date` with `LATEST` or `AUTO`.
- For tag `SPECIFIED`, choose a date returned by `analysis history-tag list`; do not invent a snapshot date. For a cluster, verify that the chosen fixed date exists in the target environment before creation.
- Before calling `event list` / `property list`, read the corresponding reference documents.
- For first validation, pass only required typed parameters: `--project-id`, `--event-name`, `--event-desc`, and `--events`.
- Use `--payload` only when an exact virtual-event rule DTO is already available.
- This is an ordinary write operation; execute it without the high-risk confirmation flag.

## Recommended Chain
- Ordinary properties: `analysis-meta event list` -> `analysis-meta property list` -> `analysis-meta virtual-event create`
- Tag snapshot: `analysis-meta event list` -> `analysis user-tag list` -> `analysis history-tag list` -> `analysis-meta virtual-event create`
- Cluster snapshot: `analysis-meta event list` -> `analysis user-cluster list` -> verify the fixed result date -> `analysis-meta virtual-event create`
