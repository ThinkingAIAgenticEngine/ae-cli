# project role upsert

Use when the user needs to create or update a project role.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

Command:

```bash
ae-cli project role upsert --project-id <project_id> --payload <payload>
ae-cli project role upsert --validate --project-id <project_id> --payload <payload>
ae-cli project role upsert --dry-run --project-id <project_id> --payload <payload>
```

Capability id: `project.role.upsert`.

Input sends `project_id`, `payload`. Payload keys must use snake_case.

## Payload contract

`role_func_list` is required and must be a non-empty array of objects. Every item requires:

- `function_name`: non-empty string. Resolve valid values with `ae-cli project function list` instead of guessing IDs or sending numeric function IDs.
- `has_power`: integer `0` or `1` only. Use `1` to select the function and `0` to leave it unselected.

For role creation, omit `role_name` and provide `role_desc` with 1 to 80 characters. For an update, provide the existing `role_name`; `role_desc` may remain omitted for compatibility.

Functions omitted from `role_func_list` are completed by the service with their permission metadata and `has_power=0`. Do not attempt to replace an object item with a number or string.

Create example:

```bash
ae-cli project role upsert \
  --project-id 196 \
  --payload '{"role_desc":"Data analyst","role_func_list":[{"function_name":"viewReport","has_power":1}]}'
```

Update example:

```bash
ae-cli project role upsert \
  --project-id 196 \
  --payload '{"role_name":"custom_role","role_func_list":[{"function_name":"viewReport","has_power":1}]}'
```

Run with `--validate` first when constructing the payload dynamically. Invalid item types, missing fields, an empty list, or a `has_power` value outside `0` and `1` return a validation error before the role is saved.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | Role payload with a non-empty `role_func_list` object array; each item contains `function_name` and `has_power` (`0` or `1`). |
