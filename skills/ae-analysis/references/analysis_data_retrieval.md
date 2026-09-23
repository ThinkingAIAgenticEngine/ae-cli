# Analysis query results

Use this reference for analysis query results: ad-hoc, saved reports/boards, BI charts, detail, drilldown and member data. Asset lists, metadata catalogs and configuration commands use their own references.

## Run or export

Use `run` for bounded results. For full, unknown-size, over-limit, long-running or timed-out data, select the matching `export --output <file>` and read [export handling](analysis_data_export.md). A complete `run` result saved for local calculation does not need an export.

Normally pass `--preview-rows 100`; omit it to use the model's configured synchronous limit. An explicit value must fit that runtime limit. Member list commands are the exception: omission returns at most 1000 rows. Summary rows do not consume business-row slots. Detail, drilldown and member previews have no row pagination; `has_more=true` requires export when complete data is needed. Use returned `has_more`, not the number of rows alone, to decide completeness.

Saved history-tag reports allow at most 1000 tag-value groups per preview. Their native result keeps `x`, `y`, and `union_groups`; `returned_rows` counts the returned tag-value groups, excluding the total-user record, and `has_more` compares that count with the exact total `group_num`.

## Preserve and interpret results

Use the tool response directly for bounded query data and small metadata search results. Save original JSON only when the user requests a file or necessary local processing requires one.

Keep stderr attached to the tool and use the CLI exit status reported by the tool. Do not append `; echo "EXIT:$?"`: the shell would report echo's exit status. Process saved JSON only after the CLI command succeeds. A failure already contains its structured error; correct the reported input before resubmitting. Request IDs, progress and errors are stderr, not JSON data.

If result files already exist, the optional reader can inspect all needed files together, including event and retention:

```bash
python3 <skill-directory>/scripts/read_results.py event.json retention.json
```

`<skill-directory>` is the directory of the `ae-analysis/SKILL.md` already loaded. Result paths are relative to the current working directory. The reader reports status, scope, warnings, resolved bindings, titles, values and row/column metadata together; use that view directly.

- The view defaults to 40 rows and 40 columns per file. It already bounds output; keep its complete JSON output so the truncation indicators remain visible.
- `data.rows[i]` pairs with `data.row_metadata[i]`; an array cell is `data.rows[i][j]`. Preserve column indexes and repeated titles. Event totals and comparison blocks are described in [event results](ai_models/event.md#event-totals-and-comparison-columns); retention row types and Dn columns in [retention results](ai_models/retention.md#returned-rows).
- `local_view.rows_omitted` and `local_view.truncations` mean the local display omitted content. Increase `--rows`/`--columns` or read the required cells from the same original file. This is separate from upstream `data.has_more`; changing the display needs no new business query.
- For non-tabular results, use `local_view.structure` and `omitted_data_keys` to read the needed paths from the original file. The reader's exit status reports file-reading success; each `ok`/`error` reports query success.

CLI `--jq` starts at the business payload (`--jq '.rows'`); external jq starts at the saved envelope (`jq '.data.rows' query.json`). A null projection alone does not establish empty data. On `OUTPUT_PROJECTION_FAILED`, stdout retains the original `data` and `meta` in an error envelope and the CLI exits non-zero. Fix the local projection using that returned data.

## Local calculation

Compute only the missing requested values, together, and print them. Select measure cells by the actual titles, dates and scope; keep labels and IDs as strings. For JSON numeric literals and numeric strings:

```python
import json
from decimal import Decimal

# Set response_json to the actual returned JSON text before running this example.
data = json.loads(response_json, parse_float=Decimal)["data"]
# Select the measure cell from the returned row/column structure.
value = Decimal(str(data["rows"][row_index][column_index]))
```

Convert selected cells before summing or dividing; handle missing values and a zero denominator. The reader displays decimal numbers as strings; calculate from the original JSON. Print Decimal output with `json.dumps(..., default=str)`. Correct a local calculation using the same data and reuse completed values.

## Cache policy for report and ad-hoc data

Apply this policy only to commands that expose `--use-cache`. `dashboard-report-data export` uses native full download and has no cache-selection flag.

For an ordinary query, omit `--use-cache`; the default permits cache reads but does not prove a cache hit. Use `--use-cache false` for an explicit request for fresh data, refresh or recomputation, bypass/disable cache, newly updated data, or comparison with a freshly refreshed analysis UI. “Latest” or “current” only implies this when it means data freshness, not a time window.

If the user reports that the result differs from the analysis UI, repeat the same semantic query exactly once with `--use-cache false`. Keep the project, definition, filters, time range, timezone and cluster route. Explain that cache policy or refresh timing may account for a difference. Claim a cache hit or miss only from explicit backend evidence.

## Follow-up

When the user needs a follow-up action advertised in synchronous `sources[]`, read [the drilldown contract](analysis_drilldown_contract.md). Use the returned `query_context_id` and original project ID. An export file provides data, not selectable drilldown coordinates.
