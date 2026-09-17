# `tag` AI-facing definition (report write only)

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use only with `analysis report create/update`; do not use with `analysis adhoc run/export`.

`tag_name` is the only tag-report name field. Do not send `cluster_name` for a tag report; `cluster_name` belongs only to audience-cluster commands.

```json
{
  "tag": {
    "tag_name": "vip_users",
    "time_range": {"mode": "recent", "unit": "day", "value": 7},
    "time_particle_size": "day"
  }
}
```

Prefer `time_range` for new tag reports. `recent_day`, `start_time`, and `end_time` are only for report readback or precise round-trip updates.
