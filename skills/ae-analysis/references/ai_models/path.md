# `path` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for behavior paths before or after a source event.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "filters": [
    {"field": {"name": "account_id", "type": "user_property"}, "operator": "exists"}
  ],
  "relation": "and",
  "path": {
    "source_event": "purchase",
    "included_events": ["view_product", "add_to_cart", "purchase"],
    "session_interval": 30,
    "session_unit": "minute",
    "direction": "forward"
  }
}
```

`direction=forward` asks what users do after `source_event`; `direction=backward` asks what users did before it. Do not send original-QP fields such as `source_type` or `event_names`.

For path analysis, `preview_rows` is a graph-display boundary aligned with the analysis UI: it keeps up to that many real nodes per path level, then combines overflow nodes into `more`. `result.nodes` retains the synthesized `more` node for graph structure and drilldown coordinates. The top-level `returned_rows` counts real business nodes actually returned across all levels; it excludes synthesized `more` nodes and the real nodes folded into them. The count may still exceed `preview_rows` because the boundary applies independently to each level. `has_more=true` means at least one level contains real nodes folded into `more`; a linear multi-level path can return more real nodes than `preview_rows` with `has_more=false`.

Path `filters` are global member filters compiled to the original QP `user_filter`. They support `user_property`, `cluster`, and `tag`, but not `event_property`. Do not move a user filter into the source event's event-property filter.

Path session timeout accepts only these unit/value ranges:

- `second`: `1..999`
- `minute`: `1..999`
- `hour`: `1..24`

Do not use `day`. Express one day as `session_interval=24` with `session_unit=hour`.

Property types come from project metadata. If resolution says a field is an `event_property`, never relabel it as `user_property` just to satisfy the path schema. Remove the unsupported global filter, choose a model that supports event-property filtering, or ask the user to clarify the intended constraint. A familiar name such as `channel` is not universally an event or user property across projects.
