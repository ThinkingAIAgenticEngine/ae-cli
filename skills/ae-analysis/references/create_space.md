# analysis +create_space (Create Space)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Space Management**

## Use Cases
- Create a new space in a project to organize dashboards and assets under a named container.
- Returns basic space information (ID, name, avatar settings).

## Commands
```bash
ae-cli analysis +create_space --project_id <project_id> --space_name "My Space"
ae-cli analysis +create_space --project_id <project_id> --space_name "Team Space" --space_desc "Team dashboards"
ae-cli analysis +create_space --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--space_name` | Yes | Space name (1-64 characters) |
| `--space_desc` | No | Optional space description (max 200 characters) |

## Decision Rules
- `--space_name` must be between 1 and 64 characters.
- Write operations keep the confirmation prompt by default; use `--yes` only for automation.

## Next Steps After Failure
- If `SPACE_NAME_TOO_LONG` appears, shorten `--space_name` to 64 characters or fewer.
- If the result after writing is not as expected, use `analysis +list_dashboards` to inspect the space context.

## Recommended Chaining
- `+create_space` → `+create_dashboard` (create dashboard inside the new space using `--space_id`)
