---
name: ae-dataops
version: 2.2.0
description: "Use ae-cli for DataOps warehouse tables/views and fields, recycling, workflow configuration and release, execution troubleshooting, backfill, SQL queries, and data integration."
metadata:
  requires:
    bins: ["ae-cli"]
---

# ae-dataops

## Cross-skill collaboration

When remaining work is outside this skill's scope, or a necessary prerequisite needs another capability, follow [the collaboration protocol](references/collaboration.md). Choose from the skills available in this run by capability, preserve verified context, and continue the remaining task. Reuse this protocol if already loaded.

> **CRITICAL - This skill is self-contained.** Use the Global AE CLI Rules below; do not require a separate shared skill for DataOps-side tasks.

Start with the user's intended outcome, then read only the matching reference below. These are files in this skill, not separately installed skills. Use the installed command's `--help` for exact flags; if it differs from this reference, report the version mismatch instead of inventing aliases.

---


## Global AE CLI Rules

Use `ae-cli` and these references for DataOps tasks. Preserve an explicitly selected host and space across a workflow.

Global parameters:

| Parameter | Description |
|---|---|
| `--format <json\|table>` | Output format. Default is JSON. |
| `--jq <expr>` | jq over the command payload before wrapping; use `.flowInstance.status`, not `.data.flowInstance.status`. External jq over default CLI JSON includes `.data`. |
| `--host <url>` | Override the active AE host. Available on every command and may be placed after the subcommand, e.g. `ae-cli dataops_ide +<command> --host <url>`. |

Output and errors:
- JSON results use an outer `ok` and `data`; command errors use `ok:false` with `error.type/message/hint` on stderr and exit non-zero. Inspect both streams.
- **`ok:true` is not a business completion check.** Legacy commands can return `REJECTED`, `FAILED`, or `CHECK_FAILED` inside `data`. Check the specific result fields described by the reference before proceeding. Reading a failed task's status successfully is different from successfully executing that task.
- For asynchronous work, preserve the returned ID and query that same operation. Submission is not completion; do not submit again because it is still running. Use bounded polling with backoff; when the wait budget is exhausted, report the ID and current state rather than claiming success or restarting work.
- For an actual `_notice.host_compat` or explicit version-compatibility warning, briefly report it and quote the supplied upgrade commands accurately. Unrelated stderr output is not a version warning.

Preview semantics:
- Table-field mutations and entity recycle/delete use server semantic `--dry-run`; inspect the returned blockers and planned changes.
- Other current DataOps `--dry-run` implementations show a local request only. They do not validate server permissions, connections, SQL, or business state. For flow release differences use `+preview_release_flow`.
- Current DataOps commands do not implement the global `--validate` server check. Do not treat its informational response as successful validation.

Safety constraints:
- Read commands can execute directly after required IDs and references are verified.
- Ordinary `write` commands execute without `--yes`; use `--yes` only for a `high-risk-write` command after explicit user confirmation.
- Reuse trusted IDs and context already provided; otherwise discover the exact resource using the matching reference. Refine searches or paginate when truncated; an incomplete list cannot prove absence. Ask only when the target or a consequential choice remains ambiguous.
- For existing resources, never invent IDs, fields, or parameter values. For creation, a new name is expected: use the requested name or propose one, check collisions, and do not mistake its absence for a blocker.
- Stop at the requested outcome: saving DEV does not authorize release, release does not authorize a manual run, and recycling does not authorize permanent deletion. Do not substitute a broader operation for an unsupported narrower request.

Domains for DataOps: `dataops_repo`, `dataops_datatable`, `dataops_flow`, `dataops_operations`, `dataops_ide`, `dataops_integration`

---

## Core Concepts and Rules

You must understand the following key concepts before use, otherwise errors are highly likely.

### Environment and Defaults

| Scenario | Default Environment | Description |
|----------|---------------------|-------------|
| Table creation/field edits and workflow definitions | `DEV` | Release separately when requested |
| `dataops_datatable +entity_recycle` / `+recycle_bin_delete` | Existing DEV and PRODUCT mappings | Entity lifecycle operations; not DEV-only edits awaiting release |
| Manual flow execution, operations and backfill | `PROD` | Inspect the exact flow/job/instance |
| SQL query | Determined by the SQL's discovered tables | Do not choose DEV or PROD solely from a sample query |

### Responsibility Boundaries

| Operation | Correct Tool | Prohibited |
|-----------|--------------|------------|
| Execute SELECT queries | `dataops_ide` | — |
| Create tables/views or mutate table fields | `dataops_datatable` | `dataops_ide` |
| Recycle or permanently delete a table/view | `dataops_datatable +entity_recycle` / `+recycle_bin_delete` | `dataops_ide` |

### Flow Lifecycle

```
Create DEV Flow → Configure Parameters/Tasks/Dependencies/Schedule → Preview and Release to PROD when requested → Manual Execution / Operations Troubleshooting when requested
```

Custom flow parameters: use `+get_flow_params`, `+create_flow_param`, `+update_flow_param`, and `+delete_flow_param` in `dataops_flow`; see [the flow reference](references/dataops-flow-create.md#custom-flow-parameters). Writes configure DEV definitions and may stop DEV debug executions. Value, type, name, and deletion changes require release for PROD; a remark update without renaming also synchronizes an existing PROD parameter remark.

Backfill lifecycle: Discover eligible PROD flow → Create or fully update DRAFT job → Run explicitly → Search / inspect plans → Stop or rerun the complete job; delete only after target inspection

---

## Scenario Routing

| User intent | Command group | Reference | Completion boundary |
|---|---|---|---|
| Discover or select a space | `dataops_repo` | [Space discovery](#1-space-discovery) | Resolve the intended `spaceCode`; reuse trusted context |
| Create tables/views or change a field type/comment | `dataops_datatable` | [Table workflows](references/dataops-table.md) | Verify DEV state; publish only when requested |
| Delete a table/view; inspect or empty one recycle-bin entry | `dataops_datatable` | [Entity lifecycle](references/dataops-table.md#entity-lifecycle-scope-and-safety) | Ordinary deletion stops at recycling; permanent deletion needs separate authorization |
| Create/configure a flow; add/update/delete tasks and parameters; schedule or release | `dataops_flow` | [Flow configuration](references/dataops-flow-create.md) | Read back the requested DEV or PROD definition; do not add a manual run |
| Execute, inspect, or stop a run; troubleshoot failed work | `dataops_flow`, `dataops_operations` | [Execution and monitoring](references/dataops-flow-monitor.md) | Match the exact instance; whole-flow execution is not failed-node retry |
| Fill multiple historical business dates | `dataops_operations` | [Backfill jobs](references/dataops-backfill.md) | Draft creation, job start, and completed plans are different outcomes |
| Create/test a datasource or configure/run a sync | `dataops_integration` | [Data integration](references/dataops-integration.md) | Verify saved config or the exact run, according to the request |
| Schedule a sync and publish it without running now | `dataops_integration`, `dataops_flow` | [Data integration](references/dataops-integration.md), then [Flow configuration](references/dataops-flow-create.md) | Confirm the PROD node and schedule; no manual execution |
| Browse schemas/tables or answer a data question | `dataops_datatable`, `dataops_ide` | [Query workflow](references/dataops-query.md) | Read the actual result and answer the question, not merely return a download task ID |

---

## 1. Space Discovery

`dataops_repo` exposes only one read command. Use it to discover a valid `spaceCode` before calling DataOps commands that require one. It returns `createTime`, `spaceCode`, and `spaceDisplayName`.

- If the user already provided a trusted `spaceCode`, reuse it.
- If `spaceCode` is unknown, run `+list_spaces` first.
- If exactly one space is returned, use its `spaceCode`.
- If multiple spaces are returned and the user intent does not identify one, ask the user which space to use. Do not guess.

```bash
# List spaces accessible to the current user
ae-cli dataops_repo +list_spaces
```

---

## 2. Data Table and View Management

Detailed workflow, command flags, examples, and parameter notes live in [`references/dataops-table.md`](references/dataops-table.md).

Key constraints:
- Start with `dataops_datatable +dict_search_tables` for visible DataOps catalog discovery.
- Use `dataops_ide +search_tables` only for raw engine metadata, and `dataops_ide +ide_list_tables` only for known catalog/schema browsing.
- Create tables/views with `dataops_datatable`, not `dataops_ide`; creation is DEV-only. Use `+publish_entity` when publication is requested.
- Add, modify, or delete one ordinary table field at a time in DEV; preview first, never mutate partition fields, and publish PROD separately.
- An ordinary "delete table/view" request means recycle only with `dataops_datatable +entity_recycle`. Permanent deletion is a separate workflow using `+recycle_bin_list` and `+recycle_bin_delete`; read the table reference before either workflow. Both writes affect DEV and PRODUCT and require an exact entity ID plus name, semantic `--dry-run`, and explicit confirmation before `--yes`. Never automatically delete an old same-name recycled entity to bypass `RECYCLE_NAME_CONFLICT`.
- After confirmed actual recycling, the Agent may ask whether to permanently delete the entity, warning that this is irreversible and may delete internal table data. Stop until a new explicit confirmation. This is an Agent reply, not a CLI prompt or JSON field. A preview, `FAILED`, `PARTIAL`, or unverified state must not trigger this offer; reconcile the same entity ID first.
- DDL follows Trino syntax; current-space view DDL should keep the literal `${env}` placeholder.

---

## 3. Flow Orchestration

Flow references cover **creation and configuration**, **execution and monitoring**, and **backfill jobs**.

**Lifecycle: DEV configuration → Requested release → Requested execution or troubleshooting. Stop at the user's boundary.**

Detailed creation/configuration commands live in [`references/dataops-flow-create.md`](references/dataops-flow-create.md). Detailed execution, monitoring, operation instance, task log, and stop commands live in [`references/dataops-flow-monitor.md`](references/dataops-flow-monitor.md). Persistent multi-date backfill jobs live in [`references/dataops-backfill.md`](references/dataops-backfill.md).

Key constraints:
- Create and update tasks in DEV, preview/release before PROD execution.
- Use `+get_flow_overview` for custom `flowParams` and each task's `dag.tasks[].taskParams`; DEV is the default, PROD is supported, and both require `dwWorkflowEdit`. Definitions preserve expression text and code-parsed references whose source/value fields are null or omitted.
- Instance details require `dwOMInstanceView`; inspect historical values in `flowInstance.instanceParamMap` or task `log.params` with `--includeLog true`.
- Treat `+delete_task` as high-risk: verify the target with `+get_flow_overview`, preview with `--dry-run`, and use `--yes` only after explicit user confirmation. Deletion affects DEV; release the flow to apply it to PROD.
- `+execute_flow` always runs PROD; it returns `executeId` for early stop.
- Prefer `flowInstanceId` from operations search for stable inspection and troubleshooting.
- A backfill job is persistent and batches multiple base dates; do not emulate it by looping `+execute_flow`.
- Create a draft with `+create_backfill_job` and run it as a separate step. `+rerun_backfill_job` reruns the complete job, not only failed plans.
- `+update_backfill_job` replaces a DRAFT job's complete configuration; inspect the job first and do not treat it as a partial patch. Treat `+delete_backfill_job` as high-risk and preview it with `--dry-run` before confirmation.
- Reference flow or workspace parameters in task SQL as `${paramKey}`. Inspect parameter sources in the overview before release.

---

## 4. IDE SQL Queries

Detailed metadata browsing, SQL query, async download, and cancel workflows live in [`references/dataops-query.md`](references/dataops-query.md).

Key constraints:
- IDE is query-only; create/modify tables and recycle/delete entities with `dataops_datatable`.
- Prefer `dataops_datatable +dict_search_tables` for table discovery unless raw engine metadata or schema browsing is required.
- Submit exactly one read-only SQL query. It creates a platform-bounded download task; rows are not returned inline and the result is not an unlimited or full export.

---

## 5. Data Integration

Detailed datasource, metadata browsing, sync solution, execution, and monitoring workflows live in [`references/dataops-integration.md`](references/dataops-integration.md).

Key constraints:
- Generate `sourceConfig`, `sinkConfig`, `channelConfig`, and `fieldsMapping` from the reference templates; do not invent keys.
- MySQL Source read partitioning uses `sourceConfig.splitColumn`; `fieldsMapping.shardingKey` is column metadata and must not be used for it.
- `+save_sync_solution` is not a partial patch. Current `+get_sync_detail --withParams true` returns a summary plus used parameters, not complete editable configs. Do not reconstruct missing settings from it; see the integration reference's update boundary. `syncName` is accepted for compatibility but ignored.
- Preset repository sync uses `te_etl@TASK_ENGINE_TRINO`; the server supplies gateway routing from the selected space. Do not copy sample company or space IDs into configuration.
- Use `+list_sync_runs` to get `taskId` before stopping a running sync.

---

## Reference Documentation

For detailed command flags and usage, please refer to the command documentation in the [`references/`](references/) directory.
