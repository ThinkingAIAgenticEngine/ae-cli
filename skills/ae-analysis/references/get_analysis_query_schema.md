# analysis +get_analysis_query_schema (Get Analysis Query Schema)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model schema queries**

> **CRITICAL - Step-by-Step Execution (BLOCKING)**
>
> **You MUST execute these steps in order. Do NOT skip any step.**
>
> | Step | Command | When to proceed |
> |------|---------|-----------------|
> | **Step 1 (MANDATORY)** | `--model_type <type>` **without `--segments`** | Always execute first. Review result. |
> | **Step 2 (OPTIONAL)** | Add `--segments 'filter_group'` | Only if Step 1 result lacks filter/groupBy structures AND you need them |
> | **Step 3 (OPTIONAL)** | Add `--segments 'examples'` | Only if Step 1+2 insufficient for multi-metric, time comparison, formulas |
>
> **WRONG:** `ae-cli analysis +get_analysis_query_schema --model_type distribution --segments 'examples'` ← **Never start here!**
> **RIGHT:** `ae-cli analysis +get_analysis_query_schema --model_type distribution` → review → add segments if needed

## Pre-call Checklist (Execute in Order)

1. ✓ **Step 1 completed?** → Review core schema
2. ✓ **Gap identified?** → Justify need (e.g., "need filter_group structure")
3. ✓ **Justified?** → Call again with specific segment

**Rule**: Uncertain → execute Step 1 first.

## Command (Execute in Order)

```bash
# Step 1: ALWAYS START HERE (no segments)
ae-cli analysis +get_analysis_query_schema --model_type event

# Step 2: Only after Step 1, if filter/groupBy needed
ae-cli analysis +get_analysis_query_schema --model_type event --segments 'filter_group' --include_core false

# Step 3: Only after Step 1/2, for complex scenarios
ae-cli analysis +get_analysis_query_schema --model_type event --segments 'examples' --include_core false

# Follow-up request (already have core from earlier step in same session)
ae-cli analysis +get_analysis_query_schema --model_type event --segments 'examples' --include_core false
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
| 简单 | 不传 `--segments` | **Step 1** - 单事件、单指标、无过滤、无分组 |
| 中等 | `--segments 'filter_group'` | **Step 2** - 有过滤或分组，需先完成 Step 1 |
| 复杂 | `--segments 'examples'` | **Step 3** - 多指标、时间对比、自定义公式，需先完成 Step 1 |

## Next Steps on Failure
- Verify model type and segment compatibility (e.g., aggregatetype not for funnel/path/interval/sql)