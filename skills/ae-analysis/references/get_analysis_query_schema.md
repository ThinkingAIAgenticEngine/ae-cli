# analysis +get_analysis_query_schema (Get Analysis Query Schema)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model schema queries**

> **CRITICAL - Builder-supported ad hoc models**
>
> Do **not** use this tool for natural-language ad hoc requests whose target model is `event`, `retention`, `funnel`, or `prop_analysis`.
> For those four models, use the matching QP builder first:
> `+build_event_analysis_qp`, `+build_retention_analysis_qp`, `+build_funnel_analysis_qp`, or `+build_prop_analysis_qp`, then `+query_adhoc`.
>
> If a builder returns `need_clarification`, `invalid_argument`, `unsupported_feature`, or `validation_error`, stop and ask the user or report the structured error. Do not fall back to this schema tool.

> **CRITICAL - Step-by-Step Execution (BLOCKING)**
>
> This blocking sequence applies only to non-builder/manual model paths such as `distribution`, `attribution`, `heat_map`, `interval`, `path`, `rank_list`, or `sql`.
> **You MUST execute these steps in order. Do NOT skip any step.**
>
> | Step | Command | When to proceed |
> |------|---------|-----------------|
> | **Step 1 (MANUAL PATH ONLY)** | `--model_type <type>` **without `--segments`** | Execute first only for non-builder/manual models. Review result. |
> | **Step 2 (OPTIONAL)** | Add `--segments 'filter_group'` | Only if Step 1 result lacks filter/groupBy structures AND you need them |
> | **Step 3 (OPTIONAL)** | Add `--segments 'examples'` | Only if Step 1+2 insufficient for multi-metric, time comparison, formulas |
>
> **WRONG:** `ae-cli analysis +get_analysis_query_schema --model_type distribution --segments 'examples'` ← **Never start here!**
> **RIGHT:** `ae-cli analysis +get_analysis_query_schema --model_type distribution` → review → add segments if needed

## Pre-call Checklist (Execute in Order)

0. ✓ **Builder-supported model?** → If `event`/`retention`/`funnel`/`prop_analysis`, stop using this tool and use the matching builder.
1. ✓ **Step 1 completed?** → Review core schema
2. ✓ **Gap identified?** → Justify need (e.g., "need filter_group structure")
3. ✓ **Justified?** → Call again with specific segment

**Rule**: For non-builder/manual models, uncertain → execute Step 1 first. For `event`, `retention`, `funnel`, or `prop_analysis`, uncertain → read the matching builder reference first.

## Command (Execute in Order)

```bash
# Step 1: start here only for non-builder/manual models (no segments)
ae-cli analysis +get_analysis_query_schema --model_type distribution

# Step 2: Only after Step 1, if filter/groupBy needed
ae-cli analysis +get_analysis_query_schema --model_type distribution --segments 'filter_group' --include_core false

# Step 3: Only after Step 1/2, for complex scenarios
ae-cli analysis +get_analysis_query_schema --model_type distribution --segments 'examples' --include_core false

# Follow-up request (already have core from earlier step in same session)
ae-cli analysis +get_analysis_query_schema --model_type distribution --segments 'examples' --include_core false
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
| Builder 支持模型 | 不适用 | `event`/`retention`/`funnel`/`prop_analysis` 禁止用此工具作为 QP 准备步骤，改用 builder |
| 简单 | 不传 `--segments` | **Step 1** - 非 builder/manual 模型 |
| 中等 | `--segments 'filter_group'` | **Step 2** - 非 builder/manual 模型，有过滤或分组，需先完成 Step 1 |
| 复杂 | `--segments 'examples'` | **Step 3** - 非 builder/manual 模型，需先完成 Step 1 |

## Next Steps on Failure
- Verify model type and segment compatibility (e.g., aggregatetype not for funnel/path/interval/sql)
