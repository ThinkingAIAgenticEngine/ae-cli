# `funnel` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for ordered conversion steps with a conversion window.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "time_particle_size": "day",
  "funnel": {
    "steps": [
      {"event": "view_product"},
      {"event": "add_to_cart"},
      {"event": "purchase"}
    ],
    "window": {"value": 3, "unit": "day"},
    "groups": [
      {"field": {"name": "channel", "type": "user_property"}}
    ]
  }
}
```

If the user asks to match users across events by a shared event property, set `funnel.relation_event_property_name`. For different property names in different events, set `funnel.steps[].relation_event_property_name`; each override takes precedence over the common property. Every step must have a relation property when any step uses one, and their property types must match.

`funnel.start_step` and `funnel.end_step` preserve the selected conversion interval. They are one-based and must satisfy `1 <= start_step < end_step <= steps.length`; omission selects the whole funnel. A dimension's `funnel_step` selects the step providing its grouping value. Saved reports with an older global grouping step are read back with that step on each affected dimension.

Queries and exports show the selected steps and calculate cumulative conversion from the selected starting population. For step populations `[4, 3, 2]`, selecting steps 2–3 returns `3 → 2` and `66.67%`; omitting the selection returns all three populations with cumulative rates `75%` and `50%`. Selecting a display interval does not remove the earlier events from the funnel's qualification rules.

Step-level event-property filters belong inside the matching `funnel.steps[].filters`. Use `event_property_name`, not the common `field` object. `values` is an array of strings, including `"true"` / `"false"` for boolean properties; omit values for existence operators. For example, ordered registration -> login -> first payment:

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 14},
  "time_particle_size": "day",
  "funnel": {
    "steps": [
      {"event": "register"},
      {"event": "login"},
      {"event": "payment", "filters": [
        {"event_property_name": "is_first_pay", "operator": "eq", "values": ["true"]}
      ]}
    ],
    "window": {"value": 7, "unit": "day"}
  }
}
```

Preserve step order, conversion window, and all requested filters when correcting input. Only actual funnel results support step counts and conversion rates; independent event UVs are not an ordered funnel.

Step filters can also contain compound nodes such as `{"relation":"or","items":[{"event_property_name":"channel","operator":"eq","values":["app"]},{"event_property_name":"channel","operator":"eq","values":["web"]}]}`. Each nested leaf remains event-only. Relative-time leaf filters preserve `time_relative`, `time_unit`, and `relative_event_time_retention_phase`.
