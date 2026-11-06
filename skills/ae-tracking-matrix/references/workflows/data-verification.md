# TE Data Integration Quality Validation

Runs systematic data integration quality checks on a TE project, covering event completeness, user identification, ID binding, latency distribution, and other dimensions, and finally generates a Feishu document report.

## Prerequisites

The tool names and QP/SQL examples below are historical interface notes, not permission to guess current capability fields. Load the current official analysis/capability contract; use targeted `--help` or discovery + `inspect` when unknown. Verify schema/auth before querying, and stop repeated failures rather than probing indefinitely. In local-only work, perform no remote query or report creation.

- **ae-cli analysis / capability**: Executes read-only queries and retrieves project/event/property metadata through the current CLI contract. Names such as `list_projects`, `get_project_config`, `list_events` and `query_event_details` below describe historical operations, not callable tools. Resolve them with targeted CLI help or capability search and inspect before execution.
- **lark-doc skill**: Generates the Feishu document report (optional, only if the user needs an online report)
- **te-user-id-debug skill**: Deep investigation of ID identification fragmentation (guide the user to it when anomalies are found; this skill does not re-implement it)

---

## Validation Workflow

Execute the following 5 steps in order:

### Step 1: Locate the project and date

1. If the user has not specified a project, call `list_projects` to let the user choose.
2. Call `get_project_config` to obtain the timezone configuration.
3. Date range: default to the last 7 days. **In SQL mode**: replace `{query_date}` with `BETWEEN 'yyyy-MM-dd' AND 'yyyy-MM-dd'` (computed from the current date). The `relativeDateRange` parameter may not take effect under the SQL `modelType`; do not rely on it.
4. Call `list_events` to confirm which events are available in the project (this affects the feasibility of subsequent checks).
5. **Column existence pre-check**: Run a probe query to obtain the actual column names of the event table, to avoid subsequent SQL failing in bulk because columns do not exist:

```sql
SELECT * FROM ta.v_event_{project_id} WHERE "$part_date" {query_date} LIMIT 1
```

From the returned column names, check whether the following key columns exist, and trim subsequent SQL accordingly:

| Missing column | Affected check | Handling |
|--------|--------|------|
| `#os` | S1 | Remove `"#os"` from S1's SELECT and GROUP BY |
| `#lib` | S5, S8 | Remove `"#lib"` from S5/S8 and adjust GROUP BY accordingly |
| `#ip` | S7 | Skip S7 |
| `#country`, `#province`, `#city` | S7 | Skip S7 |
| `#zone_offset` | S4 | Skip S4 |
| `TRY_CAST` not recognized | S7 | Keep only the `#ip IS NULL` check in S7 and drop the type validation part |
| `APPROX_PERCENTILE` not recognized | S8 | Keep only MIN/MAX/COUNT in S8 and drop the percentile rows |

**Note**: An empty sample does not establish the schema. Prefer one targeted metadata discovery through the verified interface; if schema remains unavailable, skip dependent checks with a concrete reason rather than running guessed SQL or repeatedly probing other tables.

### Step 2: Run SQL quality validation

Run each validation SQL one by one. The detailed definitions and historical query adaptation notes for all SQL are in `references/data-verification/sql_checks.md`.

**Historical SQL constraints (verify against the current CLI contract)**:
- **CTE (WITH clause) is not supported** — all queries must be rewritten as subqueries or flattened
- SQL must end with `LIMIT 100`
- In the QP, `events` is an **object** `{"sql": "..."}`, not an array — `"events": {"sql": "SELECT ..."}`
- The QP must include `eventView.requiredEvents` (fill in any event name involved)
- GROUP BY must use numeric positions (`GROUP BY 1,2,3`), not aliases
- Column names must be wrapped in double quotes (`"#event_name"`)
- `"$part_date"` and `"$part_event"` are partition fields and must be used in WHERE

**Execution method**: Use `query_adhoc` with `modelType: "sql"`, and obtain `zoneOffset` from `get_project_config`.

There are 13 available validation items, divided into two phases:

**Phase A: System-level validation (S1-S10)**

| # | Validation item | Reference SQL | Dependent optional column | Description |
|---|--------|---------|-----------|------|
| 0 | Event sample data extraction | `references/data-verification/sql_checks.md#S0` | None | Use query_event_details to fetch 1 sample per event |
| 1 | Event trigger volume check | `references/data-verification/sql_checks.md#S1` | `#os` (removable) | Count volume by event/data source/OS |
| 2 | Distinct ID null rate | `references/data-verification/sql_checks.md#S2` | None | Missing `#distinct_id` in server-side events |
| 3 | No account_id | `references/data-verification/sql_checks.md#S3` | None | Which events do not carry `#account_id` |
| 4 | No zone_offset | `references/data-verification/sql_checks.md#S4` | `#zone_offset` (skip if missing) | Timezone field missing rate |
| 5 | ta_app_start/end pairing | `references/data-verification/sql_checks.md#S5` | `#lib` (removable) | Whether the two preset events appear in pairs |
| 6 | ta_app_install ordering | `references/data-verification/sql_checks.md#S6` | None | Run only when the project has this event |
| 7 | IP information completeness | `references/data-verification/sql_checks.md#S7` | `#ip`, `#country`, etc. (skip if missing) | IP null / invalid / resolution failed |
| 8 | Event latency distribution | `references/data-verification/sql_checks.md#S8` | `#lib` (removable) | server_time vs event_time |
| 9 | Abnormal uid validation | `references/data-verification/sql_checks.md#S9` | None | One aid/did mapping to multiple uids |
| 10 | ID mapping fragmentation initial check | `references/data-verification/sql_checks.md#S10` | None | **The historical contract does not support CTE; use the simplified version** |

**Phase B: Property-level validation (S11-S12)**

| # | Validation item | Reference SQL | Dependency | Description |
|---|--------|---------|------|------|
| 11 | Event property null rate check | `references/data-verification/sql_checks.md#S11` | `list_properties` | **Core addition**: compute null rate per event per property and flag by threshold |
| 12 | Data source distribution statistics | `references/data-verification/sql_checks.md#S12` | None (can be extracted from S1) | Report volume, event type count, and user count distribution per data source |

**Execution strategy**:
- **S0** can be launched in parallel with other SQL (uses query_event_details, non-SQL mode)
- **S1-S5, S7-S9** can be launched in parallel (independent of each other)
- **S6** first confirm the event exists, then run
- **S10** use the simplified SQL for an initial screening; if there are anomalies → 🚩 guide the user to call the `te-user-id-debug` skill for deep investigation
- **S11** depends on S1 results (to obtain the event list) and `list_properties` (to obtain the property list); run after S1 completes
- **S12** can be extracted directly from S1 results, no additional query needed

After each check, record: validation name, whether it succeeded, and the result summary (row count, key values).

### Step 3: Tracking plan comparison (conditional)

**Run this step only when the user has provided a tracking plan document**. If the user has not provided any plan document, skip this step and note in the report: "No tracking plan provided, comparison skipped."

The user may provide:
- A local Excel/CSV file path
- A Feishu document/sheet link
- An online document URL

See `references/data-verification/tracking_plan_comparison.md` for the specific parsing and comparison method.

### Step 4: Result diagnosis

For the anomalous results of each validation item, match diagnostic suggestions from the knowledge base in `references/data-verification/diagnosis_kb.md`.

Diagnosis output format:
```
Validation item: <name>
Anomaly found: <specific values>
Possible cause: <matched from the knowledge base>
Suggested fix: <matched from the knowledge base>
```

**Special rules for S11 property null rate diagnosis**:
1. First determine the event's data source (from S1/S12): it is normal for a purely server-side event not to carry client-side properties (`device_id`, `client_type`, `device_model`, etc.), so do not flag it as anomalous.
2. If the same property is null across multiple events → it may be an overall integration problem (e.g., the server did not pass through `ip`).
3. If only a specific event's property is null → it may be an omission in that event's reporting logic.

**Severity rules**:
- **Identity prerequisite (S2/S3)**: first confirm whether the product has accounts, which events are post-login, and the expected visitor/account ID assignment. For a no-account / guest-only product (including E1), 100% empty `#account_id` is expected when a valid `#distinct_id` is present; mark S3 not applicable/expected, not High. Unknown identity design is TBC, not an automatic severity verdict. If both IDs are absent, investigate separately as an identification defect.
- **High**: `#account_id` 100% missing on events confirmed to require a logged-in account; abnormal uid is non-empty; IP entirely null where required; median latency > 1 hour; required event-property null rate > 90%. Apply business applicability before thresholds.
- **Medium**: distinct_id missing rate > 10%, zone_offset missing rate > 50%, start/end gap > 20%, event property null rate 70-90%
- **Low**: zone_offset missing rate < 50%, latency percentiles in the minute range, a few events missing the OS field, event property null rate 30-70%

**Property null rate thresholds (S11-specific)**:
- **> 70%**: 🔴 Anomalous — "large-scale missing property"; investigate whether the reporting logic omitted it
- **30-70%**: ⚠️ Needs confirmation — some events not carrying the property may be a normal business difference (e.g., server-side events have no client-side properties)
- **< 30%**: Usually normal, not flagged
- **Special case**: A purely server-side event not carrying client-side properties such as `device_id`, `client_type` is **normal design**, and is not flagged as anomalous even at a 100% null rate.

### Step 5: Generate the Feishu document report

Use the `lark-doc` skill to create a Feishu document and output a structured validation report.

**Note**: Feishu document callout blocks do not support tables, code blocks, or images. Anomaly details involving tables (such as S8 latency distribution) must be converted to list format inside the callout.

**Report template**:

```
# <project name> Data Integration Quality Validation Report

## Basic Information
- Project: <project_name> (ID: <project_id>)
- Validation time: <current time>
- Data range: <start_date> ~ <end_date>
- Timezone: UTC+<offset>
- Total event volume: <total_events> rows (<N> days)
- Total event types: <event_type_count>

## Validation Result Overview
| Validation item | Status | Key findings |
|--------|------|---------|
| S0 Event sample data | ... | ... |
| S1 Event trigger volume check | ... | ... |
| S2 Distinct ID null rate | ... | ... |
| ... one row per item ... |
| S11 Event property null rate | ... | ... |
| S12 Data source distribution | ... | ... |

## Anomaly Details (sorted by severity)

### High
<list one by one, with diagnostic suggestions>

### Medium
<list one by one, with diagnostic suggestions>

### Low
<list one by one>

## Event Property Null Rate Details

<Output this section only when S11 finds anomalous properties>

Group by event, and list properties with null rate > 70%:

### <event name 1> (total event volume: <N>)
| Property name | Null rate | Verdict |
|--------|--------|------|
| property_a | 85% | 🔴 Anomalous |
| property_b | 72% | 🔴 Anomalous |

### <event name 2>
...

Also list a cross-event coverage summary of key properties:
| Property name | Events with value | Total events | Overall null rate |
|--------|-----------|---------|-----------|
| device_id | 3 | 20 | 85% |
| ip | 5 | 20 | 75% |
| client_type | 8 | 20 | 60% |

## Event Sample Data

<1 JSON sample per event, only show the Top 10 events>

### <event name 1>
```json
{...}
```

## Skipped Items
- List the checks that were not executed because conditions were not met, and the reasons

## Diagnostic Suggestions Summary
<List all issues that need fixing, sorted by priority>

## Notes
- This report is auto-generated by the TE data integration quality validation tool
- For deep investigation of ID identification fragmentation, use /te-user-id-debug
- TE's built-in data acceptance (OriChecker/tracking plan acceptance) must be run by logging into the TE console
```

Also suggest to the user:
- If needed, use the `te-user-id-debug` skill for deep ID fragmentation investigation
- TE's built-in data acceptance feature requires logging into the TE console → Data Management → Data Validation → New Validation

---

## Notes

- **Privacy data**: Do not display specific values of user identifiers such as `#account_id`, `#user_id`, `#ip`; only show statistical aggregates.
- **Large projects**: When data volume exceeds 10 million/day, remind the user to narrow the date range.
- **Empty results**: An empty result for a validation item is usually good news (meaning no anomalies); explain this in the report.
- **SQL errors**: If the CLI SQL query reports an error, first check whether any of the query constraints above were violated; if it is a column-not-exist error (e.g., `column "#os" does not exist`), degrade handling per the column existence pre-check table in Step 1; do not simply abandon that check.
- **te-user-id-debug**: For ID fragmentation-related issues, only do an initial check; always guide deep investigation to the `te-user-id-debug` skill.
- **S11 property null rate**: A purely server-side event missing client-side properties (device_id, client_type, etc.) is normal design, not flagged as anomalous. Check the event's data source before judging anomalies.
- **S0 sample data**: Fields involving user privacy (`#account_id`, `ip`, etc.) must be masked before display.
