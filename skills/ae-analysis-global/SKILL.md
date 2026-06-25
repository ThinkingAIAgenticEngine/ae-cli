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

## Routing Rules

- In this overlay, **query cluster / service cluster / deployment cluster** means multi-cluster routing for analysis queries. **audience/user segment cluster** means audience membership assets under `analysis_audience`.
- If the user asks for cluster inventory or cluster info, call `ae-cli analysis +list_query_clusters --project_id <project_id>`. Localized examples include "集群信息" and "有哪些集群".
- Do not answer query-cluster inventory questions with `ae-cli analysis_audience +list_clusters` unless the user explicitly asks for audience clusters, cohorts, segments, user membership, or cluster definitions.
- If the user mentions country, region, server, shard, site, market, or deployment area semantics, call `ae-cli analysis +list_query_clusters --project_id <project_id>` before choosing query scope.
- Match slave cluster intent only against `slaveClusters[].clusterId`, `slaveClusters[].clusterName`, and `slaveClusters[].clusterDesc` returned by `+list_query_clusters`.
- If a matching accessible slave cluster exists, pass `--cluster_query_scope SLAVE --slave_cluster_id <clusterId>` to `+query_report_data`, `+query_dashboard_report_data`, or `+query_adhoc`.
- Use `--cluster_query_scope GLOBAL` only when the user clearly asks for global, all clusters, all servers, or cross-cluster aggregated data, and `permissions.canQueryGlobal=true`.
- If the user does not express global or slave-cluster intent, omit `--cluster_query_scope`.
- If requested global/slave scope is not allowed, explain `permissions.allowedClusterQueryParams` instead of guessing forbidden parameters.
- For `+query_adhoc --model_type sql`, never pass `--cluster_query_scope`; SQL model analysis only supports the current self cluster.

## Response Wording

- For `+list_query_clusters`, call the result "query clusters" and summarize `currentCluster`, `slaveClusters`, and `permissions.allowedClusterQueryParams`.
- For `analysis_audience +list_clusters`, call the result "audience clusters" or "user segments"; do not call those results query clusters.

## Commands Added By Multi-Cluster Mode

- `ae-cli analysis +list_query_clusters --project_id <project_id>`
- `ae-cli analysis +query_report_data ... --cluster_query_scope <GLOBAL|SLAVE> [--slave_cluster_id <id>]`
- `ae-cli analysis +query_dashboard_report_data ... --cluster_query_scope <GLOBAL|SLAVE> [--slave_cluster_id <id>]`
- `ae-cli analysis +query_adhoc ... --cluster_query_scope <GLOBAL|SLAVE> [--slave_cluster_id <id>]`
