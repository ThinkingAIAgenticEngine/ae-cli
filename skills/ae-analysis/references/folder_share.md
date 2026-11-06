# analysis folder share (L3)

This is a `high-risk-write` operation because it changes access, ownership, or authentication policy. Preview the affected scope with `--dry-run`, obtain explicit user confirmation, then use global `--yes` for non-interactive execution. Validation and dry-run do not apply the change.

Use when the user wants to modify folder sharing members.

Do not use to inspect members only. Use `analysis.folder.members` via `capability search/inspect/run`; see [`analysis_gateway_assets.md`](analysis_gateway_assets.md) L3 members section.

This capability has no curated `ae-cli analysis` command. Read [`ae-capability`](../../ae-capability/SKILL.md) (on-demand validate/dry-run table), then:

```bash
ae-cli capability inspect analysis.folder.share
ae-cli capability run analysis.folder.share --input '{"project_id":1,"folder_id":1001,"payload":{...}}' --yes
```

| command | capability | risk |
| --- | --- | --- |
| `ae-cli capability run analysis.folder.share` | `analysis.folder.share` | high-risk-write |

Compose nested `payload` from the inspected `input_schema`.

Input uses snake_case JSON. Common fields:

| field | type | required | description |
| --- | --- | --- | --- |
| `project_id` | integer | yes | Project ID. |
| `folder_id` | integer | yes | Folder ID. |
| `payload` | object | no | Optional snake_case share/member update payload. Inspect the capability schema before composing it. |

Output is the gateway envelope. `data` contains the share update result.
