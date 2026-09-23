---
name: dataops-backfill
version: 1.0.0
description: "Backfill job lifecycle: discover eligible PROD flows, create or update drafts, delete jobs, run jobs, inspect plans, stop running jobs, and rerun complete jobs."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Backfill Jobs

> **Prerequisites:** Read [`ae-dataops/SKILL.md`](../SKILL.md) for authentication, output, and safety rules.

A backfill job is a persistent operations object that runs one PROD task flow for multiple base dates. It is not a single manual flow execution and is not a retry of an existing failed flow instance.

## Lifecycle

### 1. Discover an eligible PROD flow

```bash
ae-cli dataops_operations +list_backfill_flows --spaceCode "${spaceCode}"
```

Use only a returned flow whose `completeDataInfo.canRun` is true. When `completeDataInfo.hasSt` is true, pass `--stTime` while creating the job. ST dependency checks use published PROD flow parameters throughout discovery, job detail, create/update, run, and rerun. An unpublished DEV change from `p=${bd}` to `p=${st}` does not make the PROD job require `stTime`; a published ST dependency still does.

### 2. Create a draft

Always pass the backfill date range. For manual selection, also pass `--completeDates`; every selected date must be inside that inclusive range.

```bash
# Range mode
ae-cli dataops_operations +create_backfill_job --spaceCode "${spaceCode}" \
  --jobName "August backfill" --flowCode ${flowCode} \
  --startDate "2026-08-01" --endDate "2026-08-07"

# Custom-date mode
ae-cli dataops_operations +create_backfill_job --spaceCode "${spaceCode}" \
  --jobName "Selected dates" --flowCode ${flowCode} \
  --startDate "2026-08-01" --endDate "2026-08-07" \
  --completeDates '["2026-08-01","2026-08-03"]'
```

Creation returns a `DRAFT` job and does not run it. In the default CLI JSON, retain `data.result.id` as `jobId` and check `data.result.jobStatus`; search results expose IDs at `data.jobList[].id`. Defaults are `jobType=TASK_ALL`, `failureStrategy=END`, `parallel=true`, `reverse=false`, `step=1`, and `unit=DAY`. For `TASK_ONLY`, `TASK_PRE`, or `TASK_POST`, discover the target task in the PROD flow overview and pass its `taskCode` as `--startNode`.

### 3. Update a draft when needed

Update is a complete replacement, not a partial patch. Inspect the DRAFT job first, then pass `--jobId`, `--jobName`, `--flowCode`, and the complete date and strategy configuration just as for creation. Updating does not run the job.

```bash
ae-cli dataops_operations +update_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId} --jobName "Revised August backfill" --flowCode ${flowCode} \
  --startDate "2026-08-01" --endDate "2026-08-10" \
  --failureStrategy END --parallel true --reverse false
```

### 4. Run the draft explicitly

Inspect the draft's saved dates, scope, and strategies first. Run only when execution is within the user's request; a request to prepare a draft ends without running it.

```bash
ae-cli dataops_operations +run_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId}
```

### 5. Search jobs and inspect plans

```bash
ae-cli dataops_operations +search_backfill_jobs --spaceCode "${spaceCode}" \
  --status "RUNNING,FAIL,SUCCESS" --pageNum 1 --pageSize 20

ae-cli dataops_operations +get_backfill_job_detail --spaceCode "${spaceCode}" \
  --jobId ${jobId}
```

Detail returns the job and its plans together. A draft has an empty plan list. The default CLI JSON exposes `data.job.jobStatus`, `data.plans[].bd`, `data.plans[].status`, `data.planCount`, and `data.planStatusStats`. The run/rerun action's `data.result=true` means the request was accepted, not that the dates completed.

When completion is requested, query the same `jobId` within a finite deadline. Report successful backfill only when `data.job.jobStatus=SUCCESS`, the saved job scope matches the request, and the plans cover the requested dates with `SUCCESS` states. `FAIL` or `STOP` is terminal without success; `RUNNING` and `READY_STOP` are unfinished. On a terminal failure, actionable error, or deadline, return the job ID and observed job/plan states. Do not create another job or repeat run/rerun because a response timed out or completion is not yet visible; inspect the existing job first.

### 6. Stop, rerun, or delete

Stopping affects every unfinished plan in the running job. Inspect the job, preview the request, obtain explicit confirmation, and then pass `--yes`.

```bash
ae-cli dataops_operations +stop_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId} --dry-run
# After explicit user confirmation, execute the same target.
ae-cli dataops_operations +stop_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId} --yes
```

Read the job again after stopping; `READY_STOP` is not yet `STOP`. Rerun applies to every plan only when the job is `FAIL` or `STOP`. A `SUCCESS` job cannot be rerun. Rerun reuses the same job and does not create a new backfill job. The CLI does not support rerunning only failed plans or only failed nodes of a historical instance; do not replace either request with a whole-job rerun.

```bash
ae-cli dataops_operations +rerun_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId} --dry-run
ae-cli dataops_operations +rerun_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId}
```

Deletion is high-risk. The server accepts only supported `DRAFT`, `FAIL`, or `SUCCESS` jobs. Inspect the exact target and preview the scoped request before confirmation; the CLI sends only `spaceCode` and `jobId` and does not pre-query or guess state.

```bash
ae-cli dataops_operations +delete_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId} --dry-run
# After explicit user confirmation, delete the inspected job.
ae-cli dataops_operations +delete_backfill_job --spaceCode "${spaceCode}" \
  --jobId ${jobId} --yes
```

## Command Reference

| Command | Purpose | Risk | Flags |
|---|---|---|---|
| `ae-cli dataops_operations +list_backfill_flows` | List eligible PROD flows | read | `--spaceCode` |
| `ae-cli dataops_operations +create_backfill_job` | Create a draft | write | `--spaceCode` `--jobName` `--flowCode` `--startDate` `--endDate`; optional in-range `--completeDates`, scope, failure, parallel, order, and ST flags |
| `ae-cli dataops_operations +update_backfill_job` | Replace a DRAFT job's complete configuration | write | `--spaceCode` `--jobId` `--jobName` `--flowCode` and the same complete configuration as create |
| `ae-cli dataops_operations +delete_backfill_job` | Delete a supported job | high-risk-write | `--spaceCode` `--jobId`; requires confirmation or `--yes` |
| `ae-cli dataops_operations +run_backfill_job` | Run a draft | write | `--spaceCode` `--jobId` |
| `ae-cli dataops_operations +search_backfill_jobs` | Search jobs | read | `--spaceCode` plus optional keyword, date, type, status, owner, sort, and paging filters |
| `ae-cli dataops_operations +get_backfill_job_detail` | Get job and plans | read | `--spaceCode` `--jobId` |
| `ae-cli dataops_operations +stop_backfill_job` | Stop a running job | high-risk-write | `--spaceCode` `--jobId`; requires confirmation or `--yes` |
| `ae-cli dataops_operations +rerun_backfill_job` | Rerun the complete job | write | `--spaceCode` `--jobId` |

Statuses are `DRAFT`, `RUNNING`, `STOP`, `FAIL`, `SUCCESS`, and `READY_STOP`. Range units are `DAY`, `WEEK`, and `MONTH`. Custom dates must be a non-empty JSON array of unique `yyyy-MM-dd` strings inside the configured date range.

## Transport Status

Transition status: transitional

Owning module: Gaia operations

Current transport: DataOps CLI REST

Covered tools: `operations_list_backfill_flows`, `operations_create_backfill_job`, `operations_update_backfill_job`, `operations_delete_backfill_job`, `operations_run_backfill_job`, `operations_search_backfill_jobs`, `operations_get_backfill_job_detail`, `operations_stop_backfill_job`, and `operations_rerun_backfill_job`

Gateway target: TBD after the DataOps operations Capability Gateway schema review

Review after: 2026-11-20

Exit condition: Migrate these commands after Gaia exposes equivalent capabilities and the command contract tests pass against the Capability Gateway transport.
