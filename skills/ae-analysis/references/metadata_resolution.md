# Analysis metadata resolution

Reuse verified assets, canonical names and business meanings in the current project. Use this workflow for missing definitions or metadata; discovery is complete when the requested measure can be constructed or a specific business choice needs the user's reply.

## Find a reusable definition

For an unknown business measure, search relevant saved metrics and reports. A named asset needs only its own family; already known definitions go directly to execution. Read the selected [metric](metric_list.md) and [report](report_list.md) command references together, then issue independent searches in the same model turn:

```bash
ae-cli analysis-meta metric list \
  --project-id <project_id> \
  --queries '["<user phrase>","<related English term>"]'

ae-cli analysis report list \
  --project-id <project_id> \
  --queries '["<user phrase>","<related English term>"]'
```

Use the user's business terms and a few relevant English terms in the same `--queries` array. These are literal, case-insensitive keyword searches, not automatic translation. Deduplicate related words; the array accepts 1–20 non-empty strings. Split only when the actual required terms exceed that limit.

Read metrics from `data.metrics`. With `--queries` and no `--fields`, the response includes `metric_events` and `metric_params` as JSON strings. Inspect those returned definitions directly; use `metric get` only for missing details. Field projection cannot select these two definition fields. A verified saved metric is referenced by `metric_name` in `metrics[].event` and supplies its own aggregation and property.

Read report summaries from `data.items`. Report search matches names and descriptions. For a suitable candidate, use `analysis report get --project-id <project_id> --report-id <report_id>` to read `data.model_type` and `data.definition`; reuse a definition already read.

Compare the candidate's events, aggregation, filters, groups and time semantics with the request. An applicable report goes directly to [report-data run](report_data_run.md) with the supported requested overrides. A custom combination reuses suitable definitions in an AI-facing model. Saved metric JSON describes its measure; it is not itself a complete ad-hoc definition. Discover only the pieces still missing below.

## Fill missing metadata

For an unknown event, use [event list](event_list.md) with the related terms. For a property missing from a selected event's measure or filter, use [property list](property_list.md) scoped to that event:

```bash
ae-cli analysis-meta event list \
  --project-id <project_id> \
  --queries '["<event phrase>","<related English term>"]' \
  --fields '["event_name","event_desc","remark"]'

ae-cli analysis-meta property list \
  --project-id <project_id> \
  --scope event \
  --event-name <verified_event_name> \
  --fields '["prop_name","prop_desc","prop_remark","select_type"]'
```

Event rows are `data.items`; property rows are `data.properties`. List pages default to 50, with `--limit` up to 200. Continue with the returned `next_offset` while `has_more` is true only when another page is needed for the unresolved choice. Stop discovery once the required definitions are available.

For a lookup spanning several metadata types, choose [catalog list](catalog_list.md) for those missing types. Reuse an already exported catalog locally. A bounded no-match can mean the chosen words did not match; refine a useful term or inspect the relevant directory when needed. Export via [catalog export](catalog_export.md) only for a task that requires the complete directory, including an explicit complete no-match check. A failed request is an error, not an empty catalog.

If the compiler reports a metadata error, reuse its candidates and all reported `path`, `raw_value`, `slot_kind`, `allowed_resource_types`, `search_targets` and `next_action` together. Apply `search_targets[].constraints` to the remaining lookups; suitable verified choices stay resolved.

## One file in the current conversation

Use the Agent host's current working directory, configured CLI environment and current project ID. The catalog export command produces one JSONL and returns `complete: true` with an absolute `output_path`. Keep that successful command's project and path in conversation context and reuse the file.

A new project uses its own filename. An explicit environment/account change or a requested refresh requires a new export; use `--force` when intentionally replacing the existing file. The CLI publishes the completed download and reports failures. No model-managed hash, sidecar or directory validation is needed.

## Confirm and bind

Confirm a selected business mapping once, even if only one candidate is suitable. Present its meaning and any unresolved semantics. Reuse mappings already confirmed in this task. User confirmation selects the business definition; it does not verify an unknown asset formula. If the confirmation tool cannot obtain a reply, present the same choices in text and wait. A failed tool call is not confirmation. Rejected candidates are discarded; seek a different candidate for that choice using the relevant search above.

After the reply, fill the confirmed canonical name, aggregation, property and other required model parameters, then execute the complete definition. Use `--resolutions` only when binding unresolved wording retained at a compiler-reported path. Bindings select metadata; they do not fill model parameters. Their `raw_value` must match the wording at that path.

For example, a compiler may have received `{"event":"<requested amount metric>"}`. After the user confirms it means the sum of a verified event's numeric property, submit the complete definition and event binding together:

```bash
ae-cli analysis adhoc run \
  --project-id <project_id> \
  --model-type event \
  --definition '{"time_range":{"mode":"previous","unit":"day","value":7},"metrics":[{"event":"<requested amount metric>","aggregation":"sum","property":"<confirmed amount property>"}]}' \
  --resolutions '{"request.metrics[0].event":{"raw_value":"<requested amount metric>","resource_type":"event","resource_key":"<confirmed event key>"}}'
```

Use the requested time range. The event key and amount property in this example must come from the current project's verified metadata and confirmed meaning. Adding `aggregation` and `property` leaves the bound `event` wording intact. A confirmed saved metric supplies its own measure definition instead.

The flag value is the path-keyed object; the CLI adds the outer `resolutions` field. The server checks the bound path, `raw_value`, allowed resource type and accessible key.

Reuse confirmed names and meanings according to the target model's resource types. Retention initial and return events use the underlying verified event names from those definitions. A resolution path belongs to its current definition, so copy the confirmed meaning rather than a different query's path mapping.

Execute the confirmed command. `RESOLUTION_STALE`, `RESOLUTION_TYPE_NOT_ALLOWED` and `RESOLUTION_PATH_INVALID` identify fields to correct; do not resend them unchanged. If the user changes the business definition itself, update that definition and its dependent queries instead of binding the old wording to a different meaning.
