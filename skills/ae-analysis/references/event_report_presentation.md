# Event-report presentation and combination charts

Read this reference for event combination charts, per-metric chart styles/axes, or the difference between source-report, result-table and analysis-board-card display. This is a saved-event-report contract, not an ad-hoc or SQL visualization contract.

## Display scope

- Source event chart: `report create/update --presentation`, read through `report get`.
- Analysis page's result-table layout: source `presentation.table_layout=date|event|group`; it can coexist with a source line/combo chart.
- Card on one analysis board (`看板`): `dashboard-report get/update` with exact project/dashboard/report IDs. A table card is `--chart-type table`, not source `chart_type=table`.
- Combination series and axes belong to the source report. Card read responses expose `series_scope=report` and the inherited series when relevant; they are not card-local configuration.

Changing source series affects its other trend (`L0`) cards, not just the card currently visible. Explain this scope before a source-series write when the user's intent only names one card. Do not promise a card-local override or use a new copied report without authorization.

## Chart names

Source `chart_type` accepts `line|combo|bar|stacked|cumulative|pie`. Card display also accepts `table`. Gateway checks compatibility against the current granularity, groups, metrics and comparison settings.

Line, combo, and cumulative require a non-total time granularity. An event definition that omits `time_particle_size` defaults to `total`; when creating a trend/combo, explicitly set the requested `day`, `hour`, or another supported non-total grain. For a saved total-time report, a combo requires an authorized definition/granularity change, not a display-only patch; preserve the requested calculation scope rather than silently changing it to make the chart valid.

- `line`: pure lines on the primary axis. Explicitly selecting it resets every source metric's combination style and secondary axis.
- `combo`: trend rendering with report-level non-default per-metric bar/line or secondary-axis settings. A source needs a resulting non-default series configuration; choosing the name alone does not invent one.
- `stacked`: stacked area, not a bar/line combination.
- `cumulative`: accumulated line, not a combo chart. It does not configure a second Y axis.
- `pie`: event pie uses internal `L11`, not `L2`. It requires grouping without time comparison; total-time reports/cards still require those pie conditions.

Use semantic names, never internal graph codes. A pure line and a combo both use the native trend family `L0`; the metric styles/axes distinguish them. Do not infer the effective chart from raw `graphShape` alone.

## Metric bindings

`metric_index` is a 1-based position in the current normalized `definition.metrics` array, not an asset ID, formula dependency index, event ID, or metric UUID. Read the exact report/version before modifying an existing report's series, map each index to its returned metric, and use that version in `--report-version`. Do not reuse positions from an older definition after metrics change.

Source `presentation.series` accepts an array. Each item contains exactly three required fields:

```json
{"metric_index":1,"type":"bar","axis":"primary"}
```

`type` is `bar|line`; `axis` is `primary|secondary`. Indexes must be positive integers, unique and within the current submitted/saved metrics. The server validates the binding and the saved report state before writing.

Series is a subset patch: specified metrics change and unspecified metrics retain their styles/axes. `series: []` explicitly resets all metric styles/axes to primary-axis lines. Omitting `series` preserves existing styles/axes where the server can uniquely match each technical metric identity; explicitly selecting `chart_type=line` resets them. `series_scope` is read-only output, never input.

A non-empty series-only patch requires an existing compatible trend (`line`/`combo`). An empty `series: []` can clear retained series on a compatible non-trend chart such as bar/cumulative while keeping that current chart type. To switch from another chart and configure non-empty series in the same update, explicitly select `chart_type=combo`; a non-empty series array cannot accompany another explicit chart type. Source reads omit series on non-trend charts, which does not prove that retained series settings are absent; a trend card can still inherit them.

For a display-only update, omit `definition` and `model_type` so the query and metric order are not replaced. During a same-model definition update without an explicit series reset, the server preserves styles by uniquely matched technical metric identity, not display labels, UUIDs, or old positions. Filter-only changes and unique reordering can retain the series; added metrics default to primary-axis lines. Removing/changing a non-default metric or an ambiguous match fails before writing with `SERIES_PRESERVATION_CONFLICT`. Follow its hint: reset through `chart_type=line` or `series: []`, then configure the new normalized metric order when needed. Do not manually carry old positions into a new definition, infer a match from a label, or describe this protection as complete preservation of every visual setting.

If a definition change makes a previously valid chart unavailable, implicit chart preservation fails before writing. Follow the returned guidance and explicitly choose a compatible chart only within the user's authorized intent; keep the requested query semantics. A pre-existing invalid legacy chart still uses the page's fallback rather than newly blocking an otherwise valid update. These protections do not promise preservation of every visual setting.

## Author and verify a combination chart

For confirmed event/property metadata, a requested daily window, and two metrics whose metric 1 is revenue and metric 2 is user count:

```bash
ae-cli analysis report create --project-id <project_id> --report-name "Revenue and users" --model-type event --definition '{"time_particle_size":"day","time_range":{"mode":"previous","unit":"day","value":7},"metrics":[{"event":"<confirmed_purchase_event>","aggregation":"sum","property":"<confirmed_amount_property>"},{"event":"<confirmed_login_event>","aggregation":"user_count"}]}' --presentation '{"chart_type":"combo","series":[{"metric_index":1,"type":"bar","axis":"primary"},{"metric_index":2,"type":"line","axis":"secondary"}]}'
```

To change only metric 2 on the current saved report, after reading its exact metric order/version:

```bash
ae-cli analysis report update --project-id <project_id> --report-id <report_id> --report-version <current_version> --presentation '{"series":[{"metric_index":2,"type":"line","axis":"secondary"}]}'
```

Read `report get` after an explicitly requested display verification. Its presentation reports the effective chart and per-metric series; a successful mutation is not proof of data-query success or complete equivalence with every page setting.

To reset to pure line on the primary axis:

```bash
ae-cli analysis report update --project-id <project_id> --report-id <report_id> --report-version <current_version> --presentation '{"chart_type":"line"}'
```

## Card trend inheritance

`dashboard-report update --chart-type combo` is valid only when the source report already has combo series. It selects the card's trend display without changing source series. The board's trend/line button can display a source combo, so read the effective `chart_type` and inherited `series`, not only the button label.

A source combo cannot be made into a pure line on only one card through this contract. `--chart-type line` must not claim a pure-line outcome while source combo remains; the gateway rejects it with guidance to reset the source first. Resetting source series affects every other `L0` card of that source. Card updates do not accept a `series` input/flag.

Historical `table_layout` or `date_outside` can inherit browser settings. Missing values mean inherited/unknown, not date/false. For a deterministic table layout, explicitly set `--table-layout` and `--date-outside` in the scoped card update.
