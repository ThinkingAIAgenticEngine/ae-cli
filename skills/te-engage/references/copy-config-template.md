# te-engage +copy_config_template

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Copy a template from the source config item to the target config item.

Mapped command: `ae-cli engage +copy_config_template`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--source_project_id` | number | Yes | source Project ID |
| `--source_config_id` | string | Yes | source config item ID |
| `--source_template_id` | string | Yes | source template ID |
| `--project_id` / `-p` | number | Yes | target Project ID |
| `--config_id` | string | Yes | target config item ID |

## Safety Constraints

This command is a **write operation** and and copies the template and dependent resources.

## Examples

```bash
ae-cli engage +copy_config_template \
  --source_project_id 1 --source_config_id src_cfg --source_template_id tpl_1 \
  --project_id 2 --config_id dst_cfg
```
