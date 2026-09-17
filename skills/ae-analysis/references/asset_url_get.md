# analysis-meta asset url-get

Use when the user needs to get a clickable resource link through the capability gateway, including post-write resource link completion.

Do not use it to discover assets or query asset data; resolve a real asset first, then use this command only to turn its governance identity or resource ID into a link.

Command:

```bash
ae-cli analysis-meta asset url-get --project-id <project_id> --node-id <node_id>
ae-cli analysis-meta asset url-get --project-id <project_id> --resource-type dashboard --resource-id 1
```

Capability id: analysis_meta.asset_url.get.

Input sends project_id, node_id, resource_id, resource_type, link_info. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` identifies the normalized asset and returns `raw_url` plus `markdown_link` when the resource type supports a link. ae-cli rewrites relative URL/link fields into absolute URLs using the current host. `status=ok` without a URL means no URL mapping was available.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-id | No | Poseidon asset node ID. |
| --resource-id | No | Asset business resource ID. |
| --resource-type | No | Asset resource type. |
| --link-info | No | link_info JSON from asset governance results. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
