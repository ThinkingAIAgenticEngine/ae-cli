# te-common resource link completion (call te_common +get_resource_url)

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **cross-module post-write constraint**

## Use Cases
- After a `create_*` or `update_*` write operation succeeds in `te-analysis` / `te-meta` / `te-audience`, complete the clickable asset link.
- Supported resource types (resourceType): `dashboard`, `report`, `metric`, `alert`, `tag`, `cluster`, `data_table`, `super_event`, `super_prop_user`, `super_prop_event`, `virtual_event`, `user_virtual_prop`, `event_virtual_prop`.
- Key return fields: `markdown_link`, `raw_url`.

## Mandatory Rules (MUST)
- As long as `project_id + resource_type + resource_id` can be determined, this command must be called.
- The final response must output `markdown_link` directly (do not place it in a code block) so the user can click through.
- If resource link generation fails, keep the main write-operation success conclusion and add the failure reason.

## Command
```bash
te-cli te_common +get_resource_url --project_id 1 --resource_type dashboard --resource_id 1
te-cli te_common +get_resource_url --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--resource_type` | Yes | Resource type: dashboard/report/metric/alert/tag/cluster/data_table/super_event/super_prop_user/super_prop_event/virtual_event/user_virtual_prop/event_virtual_prop |
| `--resource_id` | Yes | Numeric resource ID |

## Recommended Chaining
- `+create_*` -> `te_common +get_resource_url`
- `+update_*` -> `te_common +get_resource_url`
