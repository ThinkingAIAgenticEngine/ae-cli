# analysis +list_bi_panels (list BI panels)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **BI panel management**

## Use Cases
- Discover BI panels accessible to the current MCP user in a project.
- Search BI panels by name before asking for structure or data.
- Get lightweight panel metadata such as `panelId`, `name`, `pageCount`, and `hasSummary`.

## Command
```bash
ae-cli analysis +list_bi_panels --project_id <project_id>
ae-cli analysis +list_bi_panels --project_id <project_id> --query "history" --fields '["panelId","name","pageCount","hasSummary"]' --limit 20 --offset 0
ae-cli analysis +list_bi_panels --project_id <project_id> --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy matches BI panel names. |
| `--fields` / `-f` | No | Optional returned fields. Supported values: `panelId`, `name`, `spaceId`, `spaceName`, `ownerName`, `updatedAt`, `pageCount`, `hasSummary`. |
| `--limit` / `-l` | No | Optional page size. Default: 20, maximum: 10000. |
| `--offset` / `-o` | No | Optional page offset. Default: 0. |

## Decision Rules
- Use this before `+get_bi_panel_detail` unless the target `panel_id` is already verified in the same project and host.
- Do not use this command to inspect pages, charts, controls, raw config, SQL, or permission rules.
- Do not pass `userId` or `openId`; the service uses the current MCP user.
- If no panel is found by keyword, broaden the keyword or list accessible panels and ask the user to choose.

## Recommended Chaining
- `+list_bi_panels` -> `+get_bi_panel_detail` -> `+query_bi_panel_data`
