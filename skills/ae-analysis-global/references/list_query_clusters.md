# analysis +list_query_clusters (Query Cluster Options)

> **Prerequisite:** Use this reference only after `ae-analysis-global` confirms local multi-cluster mode is enabled. This command is added by the global overlay, not by the base `ae-analysis` skill.

Domain: **Multi-Cluster Query Routing**

## Use Cases

- List the query cluster options accessible to the current account in the project.
- Answer user questions such as "cluster info", "available query clusters", or "current cluster". Localized examples include "集群信息" and "有哪些集群".
- Decide whether a later report/dashboard/ad-hoc query should use the current self cluster, global aggregated data, or one specific slave cluster.
- Resolve country, region, game server, service shard, site, market, or deployment area wording to an accessible slave cluster before passing `cluster_query_scope=SLAVE`.

This command is not for audience/user segment clusters. For cohort, audience, or segment assets, use `analysis user-cluster list`.

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
- Unified ad-hoc gateway commands (`analysis adhoc run/export`) do not expose `cluster_query_scope`; if a global/slave ad-hoc query is requested, report that the gateway contract does not support it yet instead of using removed ad-hoc commands or hidden flags.
- For SQL model analysis, never pass `cluster_query_scope`; SQL model analysis only supports the current self cluster in the current gateway contract.

## Recommended Chains

- Cluster inventory / cluster info -> `analysis +list_query_clusters`
- Query DAU for Japan server -> `analysis +list_query_clusters` -> match JP/Japan slave cluster -> use only commands that explicitly expose cluster routing; the current report/dashboard/ad-hoc gateway data commands do not.
- Query all-cluster aggregated DAU -> `analysis +list_query_clusters` -> if `permissions.canQueryGlobal=true`, use only commands that explicitly expose cluster routing; otherwise stop and report the capability gap.
- View audience cohorts or user segments -> `analysis user-cluster list` instead

## Response Wording

- Use "current query cluster" for `currentCluster`.
- Use "accessible slave query clusters" for `slaveClusters`.
- Use "allowed query-scope parameters" for `permissions.allowedClusterQueryParams`.
- Do not call `analysis user-cluster list` results query clusters; those are audience clusters or user segments.
