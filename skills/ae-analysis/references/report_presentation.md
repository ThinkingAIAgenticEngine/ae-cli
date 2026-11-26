# Ordinary-model source-report presentation

Use `analysis report get` and `analysis report update --presentation` to read or patch saved source-report display intent. It is separate from query `definition`, dashboard-local display and dashboard notes. Read [event presentation](event_report_presentation.md) for existing event charts, series and axes.

The ordinary models are `event`, `retention`, `funnel`, `distribution`, `interval`, and `prop_analysis`; each field has its own applicability below. SQL, heat-map, path, ranking, revenue and tag visualizations are outside this display patch contract. Creation retains its original event-only `chart_type`, `table_layout`, `series` contract.

## Read, patch and verify

Read the exact report and current `version` immediately before updating. A display-only update omits `definition` and `model_type`; the server uses the saved report model. Do not replace the complete query just to alter display.

```bash
ae-cli analysis report update --project-id <project_id> --report-id <report_id> --report-version <fresh_version> --presentation '{"show_values":true,"retention":{"key_periods":{"mode":"selected","day":[2,7,14,30,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236]}}}'
```

Omitted fields, including nested members, retain saved values. Explicit `false` disables a switch. An array replaces only that array; other arrays/grains remain saved. Empty `date_annotations.tag_keys: []` selects no tagged categories. Key-period arrays must be non-empty; use `mode: "all"` to disable filtering. Null, empty objects, unknown/native fields and unavailable combinations fail before writing. Display patches do not change query windows or automatically switch charts.

Read the report again when display verification is requested. Returned presentation uses the same semantic fields; absent values mean no recognized applicable persisted setting, not a guessed browser default. Event `series_scope` remains read-only. A successful save does not prove data-query success or live page rendering.

Same-model definition updates preserve the supported display fields and validate them against the resulting query. Resolve conflicts explicitly within the user's intent; model changes use target defaults. Existing event-series/stage preservation rules remain applicable. Complete preservation of other legacy UI settings is not promised.

## Shared options

| Field | Shape and applicability |
| --- | --- |
| `show_values` | Boolean numeric labels for event, retention, funnel, interval and prop_analysis. Not distribution. |
| `date_annotations` | `{tag_keys:["<existing category key>"],include_untagged:true}` for all six ordinary models. Omit either member to retain it. Use verified category keys; never the native ungrouped sentinel. Without a stored filter, a partial patch retains the page's include-untagged default. |
| `sort` | `{by:"value"|"group_name",direction:"asc"|"desc"}` for event, interval and prop_analysis. Both members required. This is chart-group ordering, not SQL order or table-column sorting. |

## Retention

`presentation.retention` accepts:

| Field | Meaning |
| --- | --- |
| `key_periods.mode` | `selected` enables selected periods; `all` disables filtering while retaining lists. Explicit mode is required when no saved mode exists. |
| `key_periods.day`, `.week`, `.month` | Non-empty integer arrays of elapsed observation periods: **0=current, 1=next**. The server adapts company-specific header numbering, sorts and deduplicates lists. Omitted grain lists remain saved. Selected mode requires a submitted or already saved list for the current query grain. |
| `trend_value` | `rate` or `users`. Users requires an existing trend with simultaneous-only mode disabled. This differs from query `definition.retention.rtn_rate_or_num`. |
| `cohort_display_grain` | `day`, `week` or `month` for cohort rows, available only for a day-grain query. Other query grains use their native cohort grain. It does not change `time_particle_size`; existing `summary_first_day_of_week` owns the weekly summary start day. |
| `table_rows` | `date` or `group`; group requires a group-by dimension. |

Elapsed indexes are 0..2147483646. Periods beyond the observation window remain saved without expanding it. Native final-period/total columns retain page behavior. Do not increase `unit_num` without authorization to expose a saved period.

Existing definition parameters `hide_incomplete_data`, `only_simultaneous_metrics`, `stage_summary` and related analytical settings retain their authoring path. Do not invent duplicate presentation fields.

## Funnel, pie and interval

`presentation.funnel.result_view=conversion|drop_off` chooses conversion/drop-off display. `table_detail=summary|steps` controls the trend table; steps requires an existing non-total funnel trend. These do not replace definition start/end steps or windows.

`presentation.pie` supports boolean `show_percentage` and `group_limit=10|15|20|30|50` for event and prop_analysis, plus event-only `max_charts=1|2|4|6`. These save pie options without changing the chart type.

`presentation.interval.histogram_value=users|occurrences` requires an existing interval histogram. Query buckets and selected statistics stay unchanged.

## Compatibility

Original event fields and dashboard-report inputs retain their behavior. New options require a server advertising this schema. If an older server rejects them, do not retry as raw QP or a guessed definition field; use the discovered schema and report missing server support.
