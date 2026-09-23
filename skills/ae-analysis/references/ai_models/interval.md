# `interval` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for elapsed-time analysis between an initial event and a return event.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "time_particle_size": "day",
  "interval": {
    "initial_event": "register",
    "return_event": "first_purchase",
    "window": {"value": 7, "unit": "day"},
    "groups": [
      {"field": {"name": "channel", "type": "user_property"}}
    ]
  }
}
```

`window.unit` accepts `minute`, `hour`, or `day`; its positive integer value must fit a millisecond duration. The native interval engine does not implement second/week/month windows, so those inputs are rejected instead of being interpreted as days.

Use `relation_event_property_name` for a shared property, or `initial_relation_event_property_name` and `return_relation_event_property_name` for different properties. Each event-specific name overrides the shared name. Both resolved properties must have compatible types. `relation_comparison` defaults to `equal`; `higher_by`/`lower_by` mean the return value equals the initial value plus/minus `relation_difference`. These modes require numeric properties and a nonnegative integer difference; omit the difference for `equal`.

Optional `interval` output settings:

```json
{
  "initial_event": "level_start",
  "return_event": "level_complete",
  "window": {"value": 1, "unit": "day"},
  "initial_relation_event_property_name": "start_level",
  "return_relation_event_property_name": "end_level",
  "relation_comparison": "higher_by",
  "relation_difference": 2,
  "buckets": {"mode": "custom", "unit": "minute", "boundaries": [1, 5, 30]},
  "selected_statistics": ["avgValue", "percent95", "midValue"]
}
```

`buckets` uses either `equal` with `count` from 2 to 30, or `custom` with 1–29 strictly increasing positive integer `boundaries` and `unit` (`second/minute/hour/day`). Do not mix the fields of the two modes. Omission keeps the native 12-subdivision default.

`selected_statistics` controls the ordered statistic columns, including exports. Values: `maxValue`, `threeQuarterValue`, `midValue`, `quarterValue`, `minValue`, `avgValue`, `percent99`, `percent95`, `percent90`, `percent80`, `percent70`, `percent60`, `percent40`, `percent30`, `percent20`, `percent10`, `percent5`. Omission uses the first six; `[]` selects none. Duplicates are invalid. Relation conditions, buckets, and statistics survive report get → update → run.
