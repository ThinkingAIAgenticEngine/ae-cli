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
