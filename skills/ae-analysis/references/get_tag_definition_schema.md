# analysis_audience +get_tag_definition_schema (Get Tag Definition Schema)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Schema Query**

## Use Cases
- Support tool positioning: the current command provides the structure definition (schema) and should be used as a prerequisite step.
- Recommended sequence: first call this schema tool to get the structure, then call specific business tools.
- Typical downstream tools: `+create_tag`, `+update_tag`
- Get the tag definition schema. Supports tag type + response mode + condition subtype.

## Commands
```bash
ae-cli analysis_audience +get_tag_definition_schema --type condition
ae-cli analysis_audience +get_tag_definition_schema --type metric
ae-cli analysis_audience +get_tag_definition_schema --type condition --response_mode examples --condition_subtype behavior_seq
ae-cli analysis_audience +get_tag_definition_schema --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--type` | Yes | Tag type. Supported values: `condition`, `metric`, `first_last`, `sql`. |
| `--response_mode` | No | Schema response mode. Supported values: `base`, `examples`, `full`. Default: `base`. |
| `--condition_subtype` | No | Only effective when `--type condition`. Supported values: `core`, `behavior_seq`, `all`. Default: `core`. |

## Progressive Loading Strategy
- Use the smallest response that can solve the current task. Large schemas consume context and can make the follow-up definition construction less reliable.
- Start with `--response_mode base` or omit `--response_mode` for simple `condition`, `metric`, and `sql` tags.
- Request `--response_mode examples` only when the base schema is not enough to build or validate the target `definition`.
- `first_last` tags have a more specialized structure; use base first when the requested shape is simple, and escalate to `examples` when the field mapping or event/property role is unclear.
- Request `--response_mode full` only for complex, ambiguous, or repeatedly failing definition construction. Do not use `full` by default.
- For normal condition tags, use the default `--condition_subtype core`.
- Use `--condition_subtype behavior_seq` only when the user specifically needs behavior sequence conditions.
- Use `--condition_subtype all` only when comparing condition subtypes or when the exact subtype cannot be determined after reading the user request. Avoid `all` for simple creation/update tasks.

## Decision Rules
- `--type` is required and must match the target tag type.
- It is recommended to run `--dry-run` first to inspect the request mapping before making the actual call.
- Prefer `--response_mode base` first; request `examples` only when needed; request `full` only as a last resort.

## Next Step on Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.
- If the schema does not match expectations, confirm whether the correct schema interface was used (filter/groupby/query/tag/cluster).

## Recommended Chain
- +get_tag_definition_schema -> (first build/update in session or refresh) analysis_meta +list_events -> analysis_meta +list_properties -> +create_tag
- +get_tag_definition_schema -> (first build/update in session or refresh) analysis_meta +list_events -> analysis_meta +list_properties -> +update_tag
