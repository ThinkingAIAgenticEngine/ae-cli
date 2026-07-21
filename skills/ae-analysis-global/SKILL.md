---
name: ae-analysis-global
version: 1.0.0
description: "Use when AE/TE analysis requests mention query/current/service/deployment clusters, current cluster (当前集群), cluster info (集群信息/有哪些集群), global or multi-cluster data, all clusters/all servers, GLOBAL/SLAVE, list_query_clusters, cluster_query_scope, slave_cluster_id, country/region/server/shard/site/market routing, sw_cfg_enable_global_query, or when cluster may mean query cluster rather than audience/user segment."
---

# ae-analysis-global


Load this skill based on user intent first. After loading, run `ae-cli config cluster-mode status`; the status gates whether these overlay rules apply, not whether this skill should be loaded.

This is an overlay for `ae-analysis`. First use the normal `ae-analysis` rules and matching command references. Apply the rules below only when local multi-cluster mode is enabled (`ae-cli config cluster-mode status`):

```bash
ae-cli config cluster-mode status
```

The result must contain:

```json
{"sw_cfg_enable_global_query": true}
```

If the mode is not enabled, do not use this overlay.

For commands added only by this overlay, read this skill's matching reference file before composing commands. Example: `+list_query_clusters` -> `references/list_query_clusters.md`.

Every command accepts `--host <url>` to override the active AE host, and it may be placed after the subcommand (e.g. `ae-cli analysis +list_query_clusters --project_id <id> --host <url>`). Host selection is independent of `--cluster_query_scope`: `--host` chooses which AE instance to call, while `--cluster_query_scope` / `--slave_cluster_id` choose which cluster within global mode.

**CRITICAL — Host compat (do this first):** After each `ae-cli` run, check stderr and `_notice.host_compat`. If either is present, open the user reply with a short ⚠️ version warning and **quote the `npm i -g` / `npx skills add` (or update-cluster) lines verbatim**, then present the business result. Soft tip; `ok: true` can still carry the notice. (Also covered by `ae-analysis` Global Rules when both skills are loaded.)

## Routing Rules

- In this overlay, **query cluster / service cluster / deployment cluster** means multi-cluster routing for analysis queries. **audience/user segment cluster** means user membership assets under `analysis user-cluster`.
- If the user asks for cluster inventory or cluster info, call `ae-cli analysis +list_query_clusters --project_id <project_id>`. Localized examples include "集群信息" and "有哪些集群".
- Do not answer query-cluster inventory questions with `ae-cli analysis user-cluster list` unless the user explicitly asks for audience clusters, cohorts, segments, user membership, or cluster definitions.
- If the user mentions country, region, server, shard, site, market, or deployment area semantics, call `ae-cli analysis +list_query_clusters --project_id <project_id>` before choosing query scope.
- Match slave cluster intent only against `slaveClusters[].clusterId`, `slaveClusters[].clusterName`, and `slaveClusters[].clusterDesc` returned by `+list_query_clusters`.
- Unified ad-hoc gateway commands (`analysis adhoc run/export`) do not expose `cluster_query_scope`. If the user explicitly needs global/slave ad-hoc analysis, state that the new ad-hoc gateway contract does not support cluster routing yet and stop instead of adding hidden flags or removed ad-hoc commands.
- Report/dashboard data gateway commands (`analysis report-data run/export`, `analysis dashboard-report-data run/export`) also do not expose `cluster_query_scope`; do not add hidden cluster flags to them.
- Use `--cluster_query_scope GLOBAL` only when the user clearly asks for global, all clusters, all servers, or cross-cluster aggregated data, and `permissions.canQueryGlobal=true`.
- If the user does not express global or slave-cluster intent, omit `--cluster_query_scope`.
- If requested global/slave scope is not allowed, explain `permissions.allowedClusterQueryParams` instead of guessing forbidden parameters.
- For SQL model analysis, never pass `cluster_query_scope`; SQL model analysis only supports the current self cluster in the current gateway contract.

## Response Wording

- For `+list_query_clusters`, call the result "query clusters" and summarize `currentCluster`, `slaveClusters`, and `permissions.allowedClusterQueryParams`.
- For `analysis user-cluster list`, call the result "audience clusters" or "user segments"; do not call those results query clusters.

## Commands Added By Multi-Cluster Mode

- `ae-cli analysis +list_query_clusters --project_id <project_id>`
