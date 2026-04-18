---
name: te-common
version: 1.0.0
description: "TE cross-module common constraints: define the post-write flow after create/update operations (resource link completion, output conventions, failure fallback). Triggered when requirements involve shared rules across te-analysis/te-meta/te-audience."
metadata:
  requires:
    bins: ["ae-cli"]
---

# te-common

> **CRITICAL - Before starting, MUST first read [`../te-shared/SKILL.md`](../te-shared/SKILL.md)**: authentication, host configuration, global parameters, and write-operation confirmation rules are all in there.
> **CRITICAL - Before executing any `+<tool_name>` command, MUST first read the corresponding reference document `./references/<tool-name>.md`** For example: before executing `+get_resource_url`, you must first read [`./references/get-resource-url.md`](./references/get-resource-url.md)

## When to Use

When the requirement belongs to the unified execution constraints across `te-analysis` / `te-meta` / `te-audience`, you must use `te-common` first:

- Post-write actions, such as resource link completion
- Unified output conventions and fallback policies
- Future cross-module common constraints

## Execution Sequence (AI Agent Must Follow)

```
[Start] → [Read command reference document] → [Execute write operation] → [Succeeded?]
                                          ↓ Yes
                              [Pause immediately, review the "write-operation post-link completion" section of this document]
                                          ↓
                              [Call +get_resource_url]
                                          ↓
                              [Output complete result + link]
                                          ↓
                                      [End]
```

**Key point**: after a write operation succeeds → immediately go back to te-common, do not skip it.

---

## Current Mandatory Constraints (MUST)

### A. PROJECT_ID_GATE (preflight gate, no guessing)

- For any command about to be executed, you must first confirm whether that command requires `project_id` (per the corresponding `references/<tool-name>.md` document).
- **Regardless of whether the user provided a project name or project_id, you must first call `+list_projects` to retrieve the project list for verification.**
- Verification rules:
  - If the user provided a number, you must find the matching project_id in the list
  - If the user provided a name, you must find the matching project name in the list and obtain the corresponding project_id
  - If no match is found, you must tell the user and show the available project list so they can choose again
- Before verification passes and the correct `project_id` is confirmed, do not call the target command.

Recommended interaction flow:

**Scenario 1: The user did not provide project information**
```text
This step requires project_id.
I will first list the available projects for you to choose from:

[Call +list_projects to display the project list]

Please choose one from the projects above (for example, reply with the project ID or the project name).
I will not execute the target command before you confirm.
```

**Scenario 2: The user provided a project name or ID**
```text
The project you mentioned is "xxx".
I will first verify whether this project exists:

[Call +list_projects to get the project list]

Verification result:
- ✅ Project "xxx" exists, project_id = 123
- Or ❌ Project "xxx" was not found, available projects are listed below: [display list]

Please confirm whether to use this project (project_id = 123) for the next operation.
```

### B. Write-operation post-link completion (mandatory closed loop)

**Trigger condition**: When any of the following commands succeeds, MUST enter the link completion flow:

| resource_type | Create command | Update command |
|---|---|---|
| `dashboard` | `+create_dashboard` | `+update_dashboard` |
| `report` | `+create_report` | - |
| `metric` | `+create_metric` | `+update_metric` |
| `alert` | `+create_alert` | `+update_alert` |
| `tag` | `+create_tag` | `+update_tag` |
| `cluster` | `+create_cluster`, `+create_result_cluster` | `+update_cluster` |
| `virtual_event` | `+create_virtual_event` | - |
| `event_virtual_prop` | `+create_virtual_property` (`--table_type event`) | - |
| `user_virtual_prop` | `+create_virtual_property` (`--table_type user`) | - |
| `super_event` | `+batch_create_metadata` (creating events) | `+batch_edit_metadata --type event` |
| `super_prop_event` | `+batch_create_metadata` (creating event_properties) | `+batch_edit_metadata --type event_property` |
| `super_prop_user` | `+batch_create_metadata` (creating user_properties) | `+batch_edit_metadata --type user_property` |

**Closed loop execution (must be completed)**:
1. ✅ Write operation succeeded → immediately check whether the return value contains `resource_id`
2. ✅ Has `resource_id` → call `+get_resource_url` (using the verified `project_id`)
3. ✅ Link generated successfully → output the complete response including the clickable link
4. ⚠️ Link generation failed → output the main result + explicitly state "link completion failed: [reason]"

**Multi-resource result handling (for batch metadata only)**:
- `+batch_create_metadata` / `+batch_edit_metadata` may return multiple resources at once (events/properties).
- For each resource from which `resource_id` can be extracted, you must call `+get_resource_url` separately.
- The final output must provide links for each resource one by one; if some fail, mark the failed items and the reasons, while the successful items are returned normally.

**Prohibited behaviors**:
- ❌ End the response immediately after a write operation succeeds (you must complete link completion or explain the failure)
- ❌ Treat a write operation as failed because link completion failed (the write result is independently valid)

**Closed-loop check template** (must explicitly confirm each step):
```
[Write operation result]
→ Check resource_id: [yes/no]
→ Call get_resource_url: [called / skipped (no ID)]
→ Link completion status: [successful link / failure reason / skipped]
→ Closed loop complete ✅
```

If the ID cannot be extracted or link generation fails, you must explain the failure reason, but you cannot roll back or judge the main write operation as failed.

## Execution Template

1. Execute the main write-operation command.
2. Extract `project_id`, `resource_type`, `resource_id` from the input or return value.
3. Call `ae-cli analysis_common +get_resource_url --project_id <id> --resource_type <type> --resource_id <id>`.
4. Output the main result + `markdown_link` (clickable) / `raw_url`.

## Unified Command Entry

- `+list_projects` ([documentation](./references/list-projects.md))
- `+get_resource_url` ([documentation](./references/get-resource-url.md))
