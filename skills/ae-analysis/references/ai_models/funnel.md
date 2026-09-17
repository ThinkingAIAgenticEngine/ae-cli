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

If the user asks to match users across events by a shared event property, set `relation_event_property_name`.

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
