# te_analysis +load_filters (load filter candidate values)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Model Analysis**

## Use Cases
- Load candidate values for a property. Queries the available enum values of the specified property (quot), which is useful when building filter conditions.
- tableType values:
- event: event property
- user: user property
- clusterDatePolicy is only used when tableType=user and user clusters are involved. Supported values: LATEST, AUTO, SPECIFIED.
- Load candidate values for a property.

## Commands
```bash
te-cli te_analysis +load_filters --project_id 1 --quot demo --table_type event
te-cli te_analysis +load_filters --project_id 1 --quot demo --table_type event --event_name demo --inputdata demo --zone_offset 8 --cluster_date_policy SPECIFIED --specified_cluster_date 2026-04-08 --is_report true
te-cli te_analysis +load_filters --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--quot` | Yes | Property identifier (field name). This is the property whose candidate values will be loaded. |
| `--table_type` | Yes | Table type: event for event properties, user for user properties |
| `--event_name` | No | Optional event name. When tableType=event, this can limit the query scope to a specific event. |
| `--inputdata` | No | Optional input prefix used for fuzzy filtering of candidate values. If omitted, all candidate values are returned. |
| `--zone_offset` | No | Time zone offset in hours. For example, UTC+8 is 8 |
| `--cluster_date_policy` | No | Cluster date policy: LATEST, AUTO, or SPECIFIED |
| `--specified_cluster_date` | No | Specified cluster date in yyyy-MM-dd format. Effective only when clusterDatePolicy=SPECIFIED. |
| `--is_report` | No | Whether this is report mode. Default: false |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--quot`, `--table_type`) and add optional parameters after confirming the chain works.
- When dates/time ranges are involved, validate with a short range first and then expand gradually.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--quot`, `--table_type`).

## Recommended Chaining
- +load_filters
