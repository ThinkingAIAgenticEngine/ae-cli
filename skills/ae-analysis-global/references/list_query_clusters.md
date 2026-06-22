# analysis +list_query_clusters (Query Cluster Options)

> **Prerequisite:** Use this reference only after `ae-analysis-global` confirms local multi-cluster mode is enabled. This command is added by the global overlay, not by the base `ae-analysis` skill.

Domain: **Multi-Cluster Query Routing**

## Use Cases

- List the query cluster options accessible to the current account in the project.
- Answer user questions such as "cluster info", "available query clusters", or "current cluster". Localized examples include "集群信息" and "有哪些集群".
- Decide whether a later report/dashboard/ad-hoc query should use the current self cluster, global aggregated data, or one specific slave cluster.
- Resolve country, region, game server, service shard, site, market, or deployment area wording to an accessible slave cluster before passing `cluster_query_scope=SLAVE`.

This command is not for audience/user segment clusters. For cohort, audience, or segment assets, use `analysis_audience +list_clusters`.

## Commands

```bash
ae-cli analysis +list_query_clusters --project_id <project_id>
ae-cli analysis +list_query_clusters --dry-run
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID used to resolve the current account's cluster query permissions. |

## Output Shape

The result data follows the server DTO used by `list_query_clusters`:

| Field | Description |
|---|---|
| `globalQueryEnabled` | Whether global query is enabled by server config. |
| `currentCluster` | The current self query cluster. Fields: `clusterId`, `clusterName`, `clusterDesc`. |
| `slaveClusters` | Accessible slave query clusters for this account and project. Each item has `clusterId`, `clusterName`, `clusterDesc`. |
| `permissions` | Permission summary for choosing query scope. |
| `permissions.canQueryCurrent` | Whether the user can query the current self cluster. Usually true. |
| `permissions.canQueryGlobal` | Whether `cluster_query_scope=GLOBAL` is allowed. |
| `permissions.canQueryAllSlaveClusters` | Whether any enabled slave cluster may be queried. |
| `permissions.allowedSlaveClusterIds` | Slave cluster IDs this account may use. |
| `permissions.allowedClusterQueryParams` | Human-readable allowed query parameter combinations, e.g. `omit clusterQueryScope`, `clusterQueryScope=GLOBAL`, or `clusterQueryScope=SLAVE, slaveClusterId in [...]`. |

## Decision Rules

- For query-cluster inventory or cluster-info questions, call this command and answer with "query clusters", not "audience clusters".
- Default query behavior is to omit `cluster_query_scope`, which queries the current self cluster or follows the tool-specific default.
- Pass `--cluster_query_scope GLOBAL` only when the user clearly asks for global, all clusters, all servers, cross-cluster aggregation, or equivalent aggregate wording, and `permissions.canQueryGlobal=true`.
- Pass `--cluster_query_scope SLAVE --slave_cluster_id <clusterId>` only after this command confirms a requested country, region, server, site, market, or deployment maps to an accessible `slaveClusters[]` item.
- Match slave intent only against `slaveClusters[].clusterId`, `slaveClusters[].clusterName`, and `slaveClusters[].clusterDesc`.
- If the requested scope is not allowed, do not guess forbidden parameters. Explain `permissions.allowedClusterQueryParams`.
- For `+query_adhoc --model_type sql`, never pass `cluster_query_scope`; SQL model analysis only supports the current self cluster.

## Recommended Chains

- Cluster inventory / cluster info -> `analysis +list_query_clusters`
- Query DAU for Japan server -> `analysis +list_query_clusters` -> match JP/Japan slave cluster -> query report/dashboard/ad-hoc with `--cluster_query_scope SLAVE --slave_cluster_id <clusterId>`
- Query all-cluster aggregated DAU -> `analysis +list_query_clusters` -> if `permissions.canQueryGlobal=true`, query with `--cluster_query_scope GLOBAL`
- View audience cohorts or user segments -> `analysis_audience +list_clusters` instead

## Response Wording

- Use "current query cluster" for `currentCluster`.
- Use "accessible slave query clusters" for `slaveClusters`.
- Use "allowed query-scope parameters" for `permissions.allowedClusterQueryParams`.
- Do not call `analysis_audience +list_clusters` results query clusters; those are audience clusters or user segments.
