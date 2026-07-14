# analysis +get_analysis_query_schema (Get Analysis Query Schema)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model schema queries**

> **CRITICAL - Builder-supported ad hoc models**
>
> Do **not** use this tool for natural-language non-SQL ad hoc requests.
> All ten non-SQL models have matching QP builders; use the builder first, then `+query_adhoc`.
>
> If a builder returns `need_clarification`, `invalid_argument`, `unsupported_feature`, or `validation_error`, stop and ask the user or report the structured error. Do not fall back to this schema tool.

> **CRITICAL - Step-by-Step Execution (BLOCKING)**
>
> This blocking sequence applies only to the SQL manual path.
> **You MUST execute these steps in order. Do NOT skip any step.**
>
> | Step | Command | When to proceed |
> |------|---------|-----------------|
> | **Step 1 (MANUAL PATH ONLY)** | `--model_type sql` **without `--segments`** | Execute first only for SQL. Review result. |
> | **Step 2 (OPTIONAL)** | Add `--segments 'filter_group'` | Only if Step 1 result lacks filter/groupBy structures AND you need them |
> | **Step 3 (OPTIONAL)** | Add `--segments 'examples'` | Only if Step 1+2 insufficient for multi-metric, time comparison, formulas |
>
> **WRONG:** `ae-cli analysis +get_analysis_query_schema --model_type sql --segments 'examples'` ← **Never start here!**
> **RIGHT:** `ae-cli analysis +get_analysis_query_schema --model_type sql` → review → add segments if needed

## Pre-call Checklist (Execute in Order)

0. ✓ **Builder-supported model?** → If non-SQL, stop using this tool and use the matching builder.
1. ✓ **Step 1 completed?** → Review core schema
2. ✓ **Gap identified?** → Justify need (e.g., "need filter_group structure")
3. ✓ **Justified?** → Call again with specific segment

**Rule**: For SQL, uncertain → execute Step 1 first. For non-SQL models, uncertain → read the matching builder reference first.

## Command (Execute in Order)

```bash
# Step 1: start here only for SQL (no segments)
ae-cli analysis +get_analysis_query_schema --model_type sql

# Step 2: Only after Step 1, if filter/groupBy needed
ae-cli analysis +get_analysis_query_schema --model_type sql --segments 'filter_group' --include_core false

# Step 3: Only after Step 1/2, for complex scenarios
ae-cli analysis +get_analysis_query_schema --model_type sql --segments 'examples' --include_core false

# Follow-up request (already have core from earlier step in same session)
ae-cli analysis +get_analysis_query_schema --model_type sql --segments 'examples' --include_core false
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--model_type` | Yes | Model type: event, retention, funnel, distribution, sql, interval, path, attribution, prop_analysis, rank_list, heat_map |
| `--segments` | No | `core` (default), `filter_group`, `calctype`, `aggregatetype`, `examples`, `full`. Empty → core only. |
| `--include_core` | No | Default: true. Set false for follow-up requests when core already retrieved. |

## 场景分级

| 场景 | 参数 | 执行顺序 |
|---|---|---|
| Builder 支持模型 | 不适用 | 所有非 SQL 模型禁止用此工具作为 QP 准备步骤，改用 builder |
| 简单 | 不传 `--segments` | **Step 1** - SQL manual path |
| 中等 | `--segments 'filter_group'` | **Step 2** - SQL manual path，有过滤或分组，需先完成 Step 1 |
| 复杂 | `--segments 'examples'` | **Step 3** - SQL manual path，需先完成 Step 1 |

## Next Steps on Failure
- Verify model type and segment compatibility (e.g., aggregatetype not for funnel/path/interval/sql)
