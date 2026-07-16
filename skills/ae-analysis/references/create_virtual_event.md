# analysis_meta +create_virtual_event (Create Virtual Event)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Use Cases
- When constructing real `events` / `filter`, you must first obtain the project's available event and property metadata.
- Create a virtual event that combines multiple events with filters.
- A virtual event is a composite event defined by combining multiple real events with optional filters.
- Key parameters:
- eventName: Unique name for the virtual event (must start with 'ta@'); the name after 'ta@' must start with a letter, and it can contain letters, numbers, and underscores, with a maximum of 60 characters.
- eventDesc: Display name/description
- events: JSON array of real events to combine, each with eventName and optional filter.

## MUST Prerequisites
- Before constructing `--events` / `--filter`, you must first read and follow these reference documents:
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not generate the final `events` / `filter` until the document review and prerequisite command calls above are complete.

## Prerequisite Call Chain (Required for Constructing events/filter)
1. Read `list_events.md`, then call `ae-cli analysis_meta +list_events --project_id <project_id>` to get available events.
2. Read `list_properties.md`, then call `ae-cli analysis_meta +list_properties --project_id <project_id>` to get properties available for filtering.
3. Build `events` / `filter` from the command payload shape and verified metadata, then call `+create_virtual_event`.
4. Example events JSON: `[{"eventName":"purchase"},{"eventName":"add_to_cart"}]`

## Commands
```bash
ae-cli analysis_meta +create_virtual_event --project_id <project_id> --event_name ta@demo --event_desc demo --events '[{"eventName":"purchase"}]'
ae-cli analysis_meta +create_virtual_event --project_id <project_id> --event_name ta@demo2 --event_desc demo --remark demo --events '[{"eventName":"add_to_cart"}]' --filter '{}' --override true
ae-cli analysis_meta +create_virtual_event --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--event_name` | Yes | Unique name for the virtual event (must start with 'ta@') |
| `--event_desc` | Yes | Display name/description |
| `--remark` | No | Optional remarks |
| `--events` | Yes | JSON array of events to combine. Event/property fields must come from `analysis_meta +list_events` / `analysis_meta +list_properties` in the same `project_id`. |
| `--filter` | No | Optional global filter JSON for all events. If provided, referenced fields must come from `analysis_meta +list_properties`. |
| `--override` | No | Whether to override if event already exists. Default: false |

## Decision Rules
- `events` / `filter` must not be handwritten by intuition alone: they must satisfy the command payload shape and the project's real metadata constraints.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- For the first run, pass only the required parameters (`--project_id`, `--event_name`, `--event_desc`, `--events`) to confirm the path works, then add optional parameters.
- Wrap JSON parameters in single quotes (for example `--events '{}'` and `--filter '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- This is an ordinary `write` operation and does not require CLI confirmation.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--event_name`, and `--event_desc`).
- If `Invalid JSON` appears, first check required fields, then verify whether the event and property names come from metadata query results in the same `project_id`.
- If the result after writing does not match expectations, immediately reread the corresponding list/get interfaces for before-and-after comparison.

## Recommended Chaining
- +list_events -> +create_virtual_event
