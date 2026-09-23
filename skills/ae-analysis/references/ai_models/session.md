# `session` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for session metrics after cutting the selected events into per-user sessions. The definition is flat at the top level, like `revenue`.

```json
{
  "time_range": {"mode": "custom", "start_time": "2026-08-30 00:00:00", "end_time": "2026-08-30 23:59:59"},
  "time_particle_size": "day",
  "events": ["app_start", "app_end", "article_open", "add_to_cart", "address_select"],
  "cut_mode": "interval",
  "session_interval": 30,
  "interval_unit": "minute",
  "view_mode": "session",
  "metrics": ["session_count", "session_users", "avg_duration", "bounce_rate"]
}
```

Only `time_range` and `events` are required.

`end_time` is inclusive. A date-only `end_time` such as `2026-08-31` covers that whole day, so a single day is written as `2026-08-30 00:00:00` to `2026-08-30 23:59:59`, as in the examples here.

- `events`: 1..100 event names. These are both the analyzed events and the only events the cutter can see.
- `time_particle_size`: `total`, `hour`, `day`, `week`, or `month` only. The `minute`, `minute5`, `minute10`, `quarter`, and `year` granularities of other models are not supported here.
- `cut_mode`: `interval` (default), `start_event`, `start_end`, or `session_id`.
- `session_interval` with `interval_unit` (`second`, `minute`, or `hour`): required unless `cut_mode=session_id`. `second` and `minute` accept `1..999`; `hour` accepts `1..24`. This is the session field pair for session analysis; `session_unit` belongs to `path`.
- `start_events`: required for `cut_mode=start_event` and `cut_mode=start_end`, and must be a subset of `events`.
- `end_events`: required for `cut_mode=start_end`, and must be a subset of `events`.
- `session_id_prop`: required for `cut_mode=session_id`. It is the event property that carries the reported session ID.
- `view_mode`: `session` (default, one row per session) or `step` (one row per step inside a session).
- `metrics`: the whitelist depends on `view_mode` and the two sets are not interchangeable.
  - `view_mode=session`: `session_count`, `session_users`, `sessions_per_user`, `total_duration`, `avg_duration`, `median_duration`, `duration_per_user`, `avg_depth`, `bounce_rate`.
  - `view_mode=step`: `step_count`, `step_users`, `avg_dwell`, `median_dwell`, `exit_rate`.
- `groups`: `start_event`, `end_event`, `duration`, `depth`, `path`, `event`, `step_index`, or `event_occur`. `event` and `step_index` are step-only, `path` is session-only, and `event_occur` can only filter, never group.
- `session_props`: up to 10 nested field references such as `{"field":{"name":"platform"}}`; they take the value from each session's first event as an extra grouping dimension. Do not send the flat `{"property":"platform"}` shape.
- `buckets`: custom boundaries for the numeric `duration` and `depth` dimensions, as a list of `{field, bounds}` objects, for example `[{"field":"duration","bounds":[60,300,1800]}]` for `[0,60)`, `[60,300)`, `[300,1800)`, `[1800,+∞)`. A flat array such as `[60,300,1800]` is rejected. At most 10 strictly increasing boundaries per field; `duration` boundaries must be greater than 0 and `depth` boundaries greater than 1.
- `session_filter`: filters whole sessions after cutting, for example `{"relation":"and","conditions":[{"field":"duration","comparator":"gt","values":["60"]}]}`. `field` is `duration`, `depth`, `start_event`, `end_event`, or `event_occur`; numeric fields use `gt`, `gte`, `lt`, `lte`, `eq`, `ne`, or `between` (two values), and enumerated fields use `in` or `not_in`. `values` is always an array of strings, including numbers such as `["60"]`; a bare number like `[60]` is rejected. `event_occur` accepts only `in`/`not_in` and may add `within_seconds` greater than 0 to require the event within N seconds of the session start.
- `filters` with `relation`: ordinary event-property filters applied to events *before* cutting. They use the shared filter shape with `operator` (`eq`, `neq`, and so on), not `comparator`.
- `first_day_of_week`: optional, `1` for Monday through `7` for Sunday.

Anchor sessions on a start event and group by it:

```json
{
  "time_range": {"mode": "custom", "start_time": "2026-08-30 00:00:00", "end_time": "2026-08-30 23:59:59"},
  "time_particle_size": "day",
  "events": ["app_start", "app_end", "article_open", "add_to_cart", "address_select"],
  "cut_mode": "start_event",
  "start_events": ["app_start"],
  "session_interval": 30,
  "interval_unit": "minute",
  "view_mode": "session",
  "metrics": ["session_count", "session_users", "avg_duration", "bounce_rate"],
  "groups": ["start_event"]
}
```

Use the reported session ID instead of cutting by interval:

```json
{
  "time_range": {"mode": "custom", "start_time": "2026-08-30 00:00:00", "end_time": "2026-08-30 23:59:59"},
  "time_particle_size": "day",
  "events": ["app_start", "app_end", "article_open", "add_to_cart", "address_select"],
  "cut_mode": "session_id",
  "session_id_prop": "session_id",
  "view_mode": "session",
  "metrics": ["session_count", "session_users", "avg_duration", "bounce_rate"]
}
```

Two reporting conventions matter when explaining the numbers:

- A session belongs to the day of its start time and is never split at midnight, so a session that crosses midnight counts once, on its start day.
- Cutting happens only within the selected `events`. Leaving a high-frequency event out of `events` splits one real stretch of usage into several sessions, which inflates session counts and deflates durations.
