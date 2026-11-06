# Data Quality Validation SQL

Use the current `ae-cli analysis adhoc run` contract (inspect `--help` and the available analysis Skill reference first). The legacy `query_adhoc`, `query_event_details` and QP field names below are historical semantic examples, not callable tools or current request schemas. Translate the intended query to the verified CLI contract before execution. The SQL examples follow these historical constraints:

1. CTE (WITH clause) is prohibited
2. End with `LIMIT 100`
3. GROUP BY uses numeric positions (1,2,3), not aliases
4. In the QP, `events` is an **object** `{"sql": "..."}`, not an array; `eventView.requiredEvents` is filled with any event name involved
5. `"$part_date"` and `"$part_event"` must appear in the WHERE clause

When using, replace `{project_id}` with the actual project ID, and `{query_date}` with the date condition (e.g., `BETWEEN '2026-05-14' AND '2026-05-20'`).

---

## S1: Event trigger volume check

```sql
SELECT "#event_name", "#data_source", "#os", COUNT(1) AS "trigger_count",
  COUNT(DISTINCT "#user_id") AS "triggering_users"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1, 2, 3
ORDER BY 4 DESC
LIMIT 200
```

Check each event's data source, trigger count, and triggering user count. Pay attention to: whether the data source is single (e.g., all Restful_API with no SDK), and whether the OS field is empty.

---

## S2: Distinct ID null rate check

```sql
SELECT "#event_name", "#data_source",
  COUNT_IF("#distinct_id" IS NULL) AS "distinct_id_null_events",
  COUNT(1) AS "total_events",
  100.00 * COUNT_IF("#distinct_id" IS NULL) / COUNT(1) AS "distinct_id_null_pct"
FROM ta.v_event_{project_id}
WHERE "#data_source" IN ('Import_Tools', 'Server_SDK', 'Restful_API')
  AND "$part_date" {query_date}
GROUP BY 1, 2
HAVING COUNT_IF("#distinct_id" IS NULL) != 0
ORDER BY 5 DESC
LIMIT 100
```

Check the missing rate of `#distinct_id` in server-side reported events. An empty result means no problem.

---

## S3: No account_id field check

```sql
SELECT "#event_name", "#data_source",
  COUNT_IF("#account_id" IS NULL) AS "account_id_null_events",
  COUNT(1) AS "total_events",
  COUNT_IF("#account_id" IS NULL) * 100.00 / COUNT(1) AS "account_id_null_pct"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1, 2
HAVING COUNT_IF("#account_id" IS NULL) > 0
ORDER BY 5 DESC
LIMIT 100
```

Interpret S3 only after confirming account/no-account design and event applicability. In no-account or guest-only products (E1), 100% empty account_id with valid distinct_id is expected, not High. Pre-login/snapshot events may also be exempt. For confirmed post-login events requiring account_id, investigate missing IDs. Unknown design is TBC; both IDs missing is a distinct defect. SQL percentages alone do not assign severity.

---

## S4: No zone_offset field check

```sql
SELECT "#event_name", "#data_source",
  COUNT_IF("#zone_offset" IS NULL) AS "zone_offset_null_events",
  COUNT(1) AS "total_events",
  100.00 * COUNT_IF("#zone_offset" IS NULL) / COUNT(1) AS "zone_offset_null_pct"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1, 2
HAVING COUNT_IF("#zone_offset" IS NULL) != 0
ORDER BY 5 DESC
LIMIT 100
```

Focus on non-client data sources (Restful_API, Server_SDK, Import_Tools).

---

## S5: ta_app_start/end pairing validation

```sql
SELECT "#lib",
  COUNT_IF("$part_event" = 'ta_app_start') AS "app_start_count",
  COUNT_IF("$part_event" = 'ta_app_end') AS "app_end_count",
  ABS(COUNT_IF("$part_event" = 'ta_app_start') - COUNT_IF("$part_event" = 'ta_app_end')) * 100.00
    / GREATEST(COUNT_IF("$part_event" = 'ta_app_start'), COUNT_IF("$part_event" = 'ta_app_end')) AS "gap_pct"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
  AND "$part_event" IN ('ta_app_start', 'ta_app_end')
GROUP BY 1
LIMIT 100
```

Check whether the SDK preset start/end events appear in pairs. An empty result means there is no SDK data in the date range.

---

## S6: ta_app_install ordering validation

**Prerequisite**: First use `list_events` to confirm that the project has the `ta_app_install` event. Skip if it does not.

The original version was a 4-level CTE (dataset → app_install/app_start → joined → aggregation); The historical query contract does not support CTE, so a self JOIN is used to flatten it.

The timezone correction (`#event_time → event_time_utc0`) is omitted in the new version: two events from the same device within 5 seconds have the same `#zone_offset`, so the correction cancels out naturally in the time-difference calculation.

```sql
SELECT
  install."#os",
  COUNT(DISTINCT install."#user_id") AS "install_users",
  COUNT(1) AS "install_events",
  COUNT_IF(start."#distinct_id" IS NULL) AS "problem_installs",
  COUNT_IF(start."#distinct_id" IS NULL) * 100.00 / COUNT(1) AS "problem_install_pct"
FROM ta.v_event_{project_id} install
LEFT JOIN ta.v_event_{project_id} start
  ON install."#distinct_id" = start."#distinct_id"
  AND start."$part_event" = 'ta_app_start'
  AND start."$part_date" {query_date}
  AND DATE_DIFF('second', install."#event_time", start."#event_time") BETWEEN 0 AND 5
WHERE install."$part_date" {query_date}
  AND install."$part_event" = 'ta_app_install'
GROUP BY 1
LIMIT 100
```

Check whether a corresponding `ta_app_start` occurs within 5 seconds after `ta_app_install` is triggered. When `problem_install_pct > 1%`, investigate the SDK initialization timing.

---

## S7: IP information completeness

```sql
SELECT "#event_name", "#data_source",
  COUNT(1) AS "geo_null_events",
  COUNT_IF("#ip" IS NULL) AS "ip_null_events",
  COUNT_IF("#ip" IS NOT NULL AND TRY_CAST("#ip" AS IPADDRESS) IS NULL) AS "ip_invalid_events",
  COUNT_IF("#ip" IS NOT NULL AND TRY_CAST("#ip" AS IPADDRESS) IS NOT NULL) AS "ip_valid_but_unresolved"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
  AND ("#country" IS NULL OR "#province" IS NULL OR "#city" IS NULL)
GROUP BY 1, 2
ORDER BY 3 DESC
LIMIT 100
```

Note: It is normal for third-party data (ad attribution, etc.) not to carry IP. If server-side reporting requires geo analysis, the `#ip` field must be added.

---

## S8: Event latency distribution check

```sql
SELECT "#data_source", "#lib",
  COUNT(1) AS "event_count",
  MIN(DATE_DIFF('second', "#event_time", "#server_time")) AS "latency_min_seconds",
  APPROX_PERCENTILE(DATE_DIFF('second', "#event_time", "#server_time"), 0.25) AS "latency_p25_seconds",
  APPROX_PERCENTILE(DATE_DIFF('second', "#event_time", "#server_time"), 0.5) AS "latency_median_seconds",
  APPROX_PERCENTILE(DATE_DIFF('second', "#event_time", "#server_time"), 0.75) AS "latency_p75_seconds",
  MAX(DATE_DIFF('second', "#event_time", "#server_time")) AS "latency_max_seconds"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1, 2
ORDER BY 6 DESC
LIMIT 100
```

Latency = `#server_time` - `#event_time`. A negative value means the client clock is ahead of the server clock; a large positive value means data backlog.

---

## S9: Abnormal uid validation

```sql
SELECT "#account_id", "#distinct_id", COUNT(1) AS uid_cnt
FROM ta.v_user_{project_id}
GROUP BY 1, 2
HAVING COUNT(1) > 1
LIMIT 100
```

Check whether the same `#account_id` + `#distinct_id` combination maps to multiple `#user_id` values in the user table. An empty result means no anomaly.

---

## S10: ID mapping fragmentation initial check (simplified)

The historical SQL mode does not support CTE, so the full 7-level CTE fragmentation detection cannot run. Use the following simplified query for an initial screening:

```sql
SELECT "#distinct_id", "#account_id", COUNT(DISTINCT "#user_id") AS uid_cnt
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
  AND "#distinct_id" IS NOT NULL
  AND "#account_id" IS NOT NULL
GROUP BY 1, 2
HAVING COUNT(DISTINCT "#user_id") > 1
LIMIT 100
```

**If the result is non-empty**: fragmentation is suspected; guide the user to call the `te-user-id-debug` skill for deep investigation.

**The full fragmentation detection logic** must be run in the TE Web IDE (SQL > New Query); the original SQL is in the `id_mapping_split` query in `query_config.py`.

---

## Degradation strategies when columns are missing

Before running, first run the probe query `SELECT * FROM ta.v_event_{project_id} WHERE "$part_date" {query_date} LIMIT 1`, and make the following adjustments based on the returned column names:

### S1 — missing `#os`

Remove `"#os"` from SELECT and GROUP BY:

```sql
SELECT "#event_name", "#data_source", COUNT(1) AS "trigger_count",
  COUNT(DISTINCT "#user_id") AS "triggering_users"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1, 2
ORDER BY 3 DESC
LIMIT 200
```

### S4 — missing `#zone_offset`

Skip this item, and note in the report: "The event table has no #zone_offset column, skipped."

### S5 — missing `#lib`

Remove `"#lib"` from SELECT and GROUP BY, and remove ORDER BY (only one row of results):

```sql
SELECT
  COUNT_IF("$part_event" = 'ta_app_start') AS "app_start_count",
  COUNT_IF("$part_event" = 'ta_app_end') AS "app_end_count",
  ABS(COUNT_IF("$part_event" = 'ta_app_start') - COUNT_IF("$part_event" = 'ta_app_end')) * 100.00
    / GREATEST(COUNT_IF("$part_event" = 'ta_app_start'), COUNT_IF("$part_event" = 'ta_app_end')) AS "gap_pct"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
  AND "$part_event" IN ('ta_app_start', 'ta_app_end')
LIMIT 100
```

### S7 — missing `#ip` / `#country` / `#province` / `#city`

Skip this item, and note the reason in the report.

If only `TRY_CAST` is unavailable, simplify to a pure NULL check:

```sql
SELECT "#event_name", "#data_source",
  COUNT(1) AS "geo_null_events",
  COUNT_IF("#ip" IS NULL) AS "ip_null_events"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
  AND ("#country" IS NULL OR "#province" IS NULL OR "#city" IS NULL)
GROUP BY 1, 2
ORDER BY 3 DESC
LIMIT 100
```

### S8 — missing `#lib`

Remove `"#lib"` from SELECT and GROUP BY.

If `APPROX_PERCENTILE` is unavailable, keep only MIN/MAX/COUNT:

```sql
SELECT "#data_source",
  COUNT(1) AS "event_count",
  MIN(DATE_DIFF('second', "#event_time", "#server_time")) AS "latency_min_seconds",
  MAX(DATE_DIFF('second', "#event_time", "#server_time")) AS "latency_max_seconds"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1
ORDER BY 2 DESC
LIMIT 100
```

---

## S11: Event property null rate check (per property)

This is the most core differentiating capability in the reference validation report. Compute the null rate for each custom property of each event, and flag anomalies by threshold.

### Execution flow

1. **Collect the property list**: Call `list_properties` to obtain all event properties in the project and their associated events.
2. **Build the common property list**: Filter out the properties that actually exist in the project from the following "key common properties":
   - `device_id`, `ip`, `client_type`, `client_version`, `event_time`
   - `uid`, `geo_country`, `reg_country`, `traffic_source`
   - `device_timezone`, `device_model`, `device_carrier`, `device_network`
   - `device_language`, `device_version`, `log_unique_id`, `login_session_id`
   - `dt`, `install_source`, `campaign_source`
3. **Run S11a (common property cross-event scan)**: Concatenate the existing common properties into one SQL statement, grouped by event.
4. **Run S11b (event-specific property deep scan)**: For events with volume ≥ 100, use `list_properties` to look up their specific properties, and build SQL per event.

### S11a: Common property cross-event null rate scan

```sql
SELECT "#event_name",
  COUNT(1) AS "total_events"
{property_columns}
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1
ORDER BY 2 DESC
LIMIT 200
```

Where `{property_columns}` has the format (one property per line):
```sql
  , COUNT_IF("device_id" IS NULL) * 100.00 / GREATEST(COUNT(1), 1) AS "device_id_null_rate"
  , COUNT_IF("ip" IS NULL) * 100.00 / GREATEST(COUNT(1), 1) AS "ip_null_rate"
```

**Construction rules**:
1. From the property names returned by `list_properties`, match the common property list above.
2. Only include properties that actually exist in the project (otherwise the SQL errors because the column does not exist).
3. Skip system properties (columns starting with `#` such as `#event_name`, `#account_id`, `#distinct_id` — these are already checked in S2/S3).

### S11b: Event-specific property deep scan

**Run only for events that meet the following conditions**:
- S11a shows a property null rate > 50%
- Or event volume ≥ 1000 (lowered to ≥ 100 when the project data volume is small)

For each target event:

1. Call `list_properties` with `eventName` to obtain that event's property list.
2. Filter out custom properties (not starting with `#`).
3. Build a per-property SQL:

```sql
SELECT
  COUNT(1) AS "total_events"
{property_columns}
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
  AND "$part_event" = '{event_name}'
LIMIT 100
```

**Threshold judgment**:
- Null rate > 70%: 🔴 Anomalous, mark as "large-scale missing property"
- Null rate 30-70%: ⚠️ Needs confirmation (some events not carrying the property may be normal)
- Null rate < 30%: Usually normal

### S11 degradation strategy

**When most common properties are missing**: Skip S11a, and run S11b directly to deep-scan the Top 5 events.

**When list_properties returns empty or errors**: Skip S11, and note in the report: "Unable to obtain the event property list, property null rate check skipped."

**When a single event has too many properties (> 50)**: Check only the first 50 properties, in the order returned by `list_properties`.

---

## S12: Event data source distribution statistics

Extract the summary from S1 results; no additional SQL is needed. If all `#data_source` values in S1 are null, note: "All events have an empty data_source, unable to distinguish data sources."

If an independent query is needed (when S1 was not grouped by data_source):

```sql
SELECT "#data_source",
  COUNT(1) AS "event_count",
  COUNT(DISTINCT "#event_name") AS "event_type_count",
  COUNT(DISTINCT "#user_id") AS "user_count"
FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date}
GROUP BY 1
ORDER BY 2 DESC
LIMIT 100
```

---

## S0: Event sample data extraction

Use a bounded read-only CLI query to extract 1 sample per event and verify data format, field type, and property structure. Discover the supported event-detail capability with `ae-cli capability search`, then inspect its contract before use; do not invoke the historical `query_event_details` name directly.

### Execution method

For each event with volume > 0 in S1, call `query_event_details`:
- `eventName`: event name
- `startTime` / `endTime`: the query date range
- `limit`: 1

### Sample uses
- Verify whether the actual property data type matches the tracking plan
- Discover JSON nested properties (e.g., `usr_cost_info.match_card`)
- Check property value formats (timestamps, enum values, etc.)

### Degradation strategy
- When event count > 30: extract samples only for the Top 10 events by volume
- When `query_event_details` returns empty: note "This event has no data in the query range"
