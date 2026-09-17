# `attribution` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use to attribute target conversions to touchpoint/source events.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 14},
  "attribution": {
    "target_event": "purchase",
    "target_aggregation": "total_count",
    "attribution_events": [
      {"event": "ad_click"},
      {"event": "campaign_view"}
    ],
    "attribution_model": "first",
    "window": {"value": 7, "unit": "day"},
    "direct_conversion": true
  }
}
```

`attribution_model` values: `first`, `last`, or `linear`.
The target aggregation is intentionally narrow: use `total_count` without a property, or `sum` with a numeric `target_property`. Do not use `user_count`.

## Aggregation

- `attribution`: use `total_count` without `target_property`, or `sum` with a numeric `target_property`.
