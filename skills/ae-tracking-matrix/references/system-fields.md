## Background Knowledge

### What Are System Fields
The TE analysis engine presets a set of system fields that:
- **In SQL queries**: can be used directly without any additional configuration
- **In frontend analysis models**: hidden by default and cannot be used directly

System fields are divided into two categories:
1. **System fields in the event table** (within the event property scope)
2. **System fields in the user table** (within the user property scope)

### Prerequisites for Using System Fields in Frontend Models
Different categories of system fields have different requirements for use in frontend analysis models:

| Field Category | Required Steps | Description |
|---------------|----------------|-------------|
| **Event table system fields** | Two steps: ① Create and Connect → ② Create virtual property | Event properties must be wrapped as a virtual property with `relation_always` before they can be used in frontend models |
| **User table system fields** | One step: Create and Connect | User properties can be used directly in frontend analysis models once "Connected", **no virtual property needed** |

### System Field Reference List
The following list is sourced from the AE system's preset system fields. Fields prefixed with `$` are partition fields; fields prefixed with `#` are system attribute fields.

**System fields in the event table**:

| Field Name | Display Name | Type | Description |
|------------|--------------|------|-------------|
| $part_event | Event Partition Field | Text | Event partition field, derived from #event_name |
| $part_date | Date Partition Field | Time | Date partition field, derived from #event_time |
| #app_id | Project ID | Text | Project ID that the event belongs to |
| #user_id | Unique User ID | Numeric | Unique user identifier in the system |
| #account_id | Account ID | Text | Account ID, equivalent to #account_id in the data |
| #distinct_id | Visitor ID | Text | Visitor ID, equivalent to #distinct_id in the data |
| #event_name | Event Name | Text | Event name, equivalent to #event_name in the data |
| #event_time | Event Time | Time | Event time, equivalent to #time in the data |
| #server_time | Server Time | Time | Server time when the data was received |
| #dw_create_time | First Ingestion Time | Time | First data warehouse ingestion time |
| #dw_update_time | Ingestion Update Time | Time | Data warehouse update time |
| #kafka_offset | Kafka Offset | Numeric | Kafka offset where the event is stored |
| #uuid | UUID | Text | Unique identifier of the event |

**System fields in the user table**:

| Field Name | Display Name | Type | Description |
|------------|--------------|------|-------------|
| #user_id | Unique User ID | Numeric | Unique user identifier in the system |
| #account_id | Account ID | Text | Account ID, equivalent to #account_id in the data |
| #distinct_id | Visitor ID | Text | Visitor ID, equivalent to #distinct_id in the data |
| #active_time | Activation Time | Time | Time of the user's first data ingestion |
| #reg_time | Registration Time | Time | Time of the first data ingestion containing an account ID |
| #update_time | Update Time | Time | #time of the last received user property data |
| #server_time | Server Time | Time | Server time of the last received user property data |
| #dw_update_time | Ingestion Update Time | Time | Latest update time of this user record |
| #event_date | Latest Event Date | Numeric | Ingestion date of the user's latest event |
| #user_operation | User Operation Type | Text | Operation type of the user property data |
| #kafka_offset | Kafka Offset | Numeric | Kafka offset where the user property data is stored |
| #uuid | UUID | Text | Unique identifier of the user property data |

**Fields existing in both tables (require user confirmation)**:
The following fields exist in both the event table and the user table. The category cannot be determined by name alone. Guide the user to confirm:
- `#user_id`
- `#account_id`
- `#distinct_id`
- `#server_time`
- `#dw_update_time`
- `#kafka_offset`
- `#uuid`

> Note: The system field list may change as the AE version evolves. If you encounter a field not listed, prioritize using the tool query method in "Step 2: Check Field Status" to determine its category.

## Workflow

### Step 1: Clarify User Requirements
1. Ask the user which system field they want to use (field name)
2. Ask the user about their usage scenario:
   - For SQL query only → inform them that no action is needed and it can be used directly
     - If it is a system field in the event table, it can be queried directly in the event table in SQL
     - If it is a system field in the user table, it can be queried directly in the user table in SQL and used directly
   - For use in frontend analysis models → proceed to Step 2

### Step 2: Identify Field Status and Category
After obtaining the field name, judge in the following priority order:

#### 2.1 Query whether the field is connected (priority)
Use the current metadata gateway and query both scopes when the field may exist in
both tables:

```bash
ae-cli analysis-meta property list \
  --project-id <project_id> \
  --queries '["<field_name>"]' \
  --fields '["prop_id","prop_name","prop_desc","select_type","table_type","authentication_status"]' \
  --limit 20 \
  --offset 0
```

Match the exact `prop_name`; do not treat a fuzzy-name match as the requested
field.
- **If the field is found** → the field is already in "Connected" status. Determine the category directly from the returned `scope` field:
  - `scope = "event"` → event property
  - `scope = "user"` → user property
  - After confirming the category, **proceed directly to the "Connected Fast Path"** (see below)
- **If the field is not found** → the field is still hidden (not connected), proceed to 2.2

> Note: `list_properties` can only query connected system fields. When unconnected, it returns empty, which can be used as a status judgment basis.

#### 2.2 Match against the system field list (fallback)
When the field is not connected (query returns empty), match against the "System Field Reference List":
- Field uniquely matches the event table list → determined as an event table system field
- Field uniquely matches the user table list → determined as a user table system field
- Field exists in both lists (e.g., `#user_id`) → guide the user to confirm: "Is this field reported along with events (event property), or does it describe user characteristics (user property)?"
- Field is not in the list → guide the user to confirm the category, and suggest adding it to the list later

### Connected Fast Path
After confirming the field is **connected** via 2.1, perform different actions based on the field category:

#### Scenario A: Event table field is connected
Event properties must be wrapped as a virtual property before they can be used in frontend analysis models, even when connected. Directly propose a virtual property creation plan to the user:

1. **Inform the user that the field is connected**:
   - "`#field_name` is currently in 'Connected' status and belongs to event properties. Since event properties must be wrapped as a virtual property before they can be used in frontend analysis models, I can create one for you directly."

2. **Propose a virtual property creation plan and ask for user consent**:
   - "I can create a virtual property for you that references this field, keeping the data type unchanged, with the associated event automatically set to all events (`relation_always`). Its machine name must start with `#vp@`; by default I will use `#vp@field_name` and keep the original field name as the display name. Do you agree to create it?"

3. **Execute based on user feedback**:
   - **User agrees** → call `analysis-meta virtual-property create`, set the associated event to `relation_always`, and inform the user of the result upon completion
   - **User disagrees or has other requirements** (e.g., wants to change the name or data type) → adjust according to the user's wishes before creating
   - **User only wants to confirm availability** → inform the user that although the field is connected, event properties still require a virtual property to be usable in frontend models

#### Scenario B: User table field is connected
User properties can be used directly in frontend analysis models once set to "Connected".

1. **Inform the user that the field is connected and ready to use**:
   - "`#field_name` is currently in 'Connected' status and belongs to user properties. You can use it directly in frontend analysis models. You can search for `#field_name` in the property list to find it."

2. **User still wants to create a virtual property** (for special needs) → handle according to the user's wishes, but inform them that user properties typically do not require this step

### Step 3: Guide the User to Set an Unconnected Field to "Connected"
Execute this step **only when the field is in an unconnected status**.

#### Scenario A: System Fields in the Event Table
Instruct the user to operate as follows:
1. Navigate to **"Data" → "Data Management" → "Event Properties" → "Source Event Property Management"**
2. Find the desired system field in the list
3. Click the **"Create and Connect"** button on the right side of the field
4. Confirm that the field status changes to **"Connected"**

After connection is complete, **proceed to Step 4** to create a virtual property.

#### Scenario B: System Fields in the User Table
Instruct the user to operate as follows:
1. Navigate to **"Data" → "Data Management" → "User Properties" → "Source User Property Management"**
2. Find the desired system field in the list
3. Click the **"Create and Connect"** button on the right side of the field
4. Confirm that the field status changes to **"Connected"**

After connection is complete, inform the user that the field can now be used directly in frontend analysis models.

### Step 4: Create a Virtual Property for Event Table Fields
Execute this step **only for event table system fields**. When the user confirms that an event field is in the **"Connected"** status (or when the user agrees to create via the "Connected Fast Path"), perform the following actions:

1. **Confirm the virtual property name**:
   - Ask if the user has any special naming requirements
   - The machine name must start with `#vp@`; if the user has no special requirement, derive `#vp@field_name` from the original system field and keep the original name as `property-desc`

2. **Use `analysis-meta virtual-property create` to create a virtual event property**:
   - The property definition directly references the target system field
   - The data type remains consistent with the original system field and is not modified
   - The associated event is automatically set to **relation_always (all events)** to ensure the virtual property is available for all events
   - Quote system-field identifiers containing `#`, `$`, or `@` in the SQL expression

```bash
ae-cli analysis-meta virtual-property create \
  --project-id <project_id> \
  --property-name '#vp@field_name' \
  --property-desc '#field_name' \
  --table-type event \
  --select-type <metadata_select_type> \
  --sql-expression '"#field_name"' \
  --sql-event-relation-type relation_always
```

Use the exact `select_type` returned by `property list`. Do not copy the
placeholder command without substituting metadata-verified values.

3. **Inform the user of the result**:
   - After the virtual property is successfully created, the field can be used in frontend analysis models (such as Event Analysis, Funnel Analysis, Retention Analysis, etc.)
   - Prompt the user that they can search for the virtual property in the property list to use it

## Important Rules

1. **Must distinguish the field category**: the operation paths and usage conditions for event table system fields and user table system fields are different. Be sure to identify first and then guide to avoid the user navigating to the wrong page.

2. **Event table fields must create a virtual property**: event properties must be wrapped as a virtual property with `relation_always` before they can be used in frontend models, even when already connected. Do not omit this step.

3. **User table fields do not need a virtual property**: user properties can be used directly in frontend analysis models once set to "Connected". If a user table field is already connected, do not guide the user to create a virtual property unless the user actively requests it for special needs.

4. **No action needed for SQL queries**: if the user only needs to use system fields in SQL queries, directly inform them that "it can be used directly in SQL without creating and connecting or creating a virtual property" to avoid unnecessary workflows.

5. **Status confirmation is critical**: for event table fields, confirm the "Connected" status before creating a virtual property; for user table fields, confirming "Connected" completes the workflow.

6. **Respect the user's naming preference and the CLI contract**: ask whether the user has custom naming requirements. The machine name must start with `#vp@`; preserve the original field label with `property-desc` when appropriate.

7. **Keep the data type unchanged**: the data type of the virtual property must be completely consistent with the original system field and cannot be arbitrarily converted or mapped, unless the user explicitly specifies a different data type.

8. **Associated event must be set to all events**: when creating a virtual property, the associated event must be automatically set to **relation_always (all events)** to ensure the virtual property is available for all events. Do not omit this or set it to a specific event.

9. **Cross-table fields must be confirmed with the user**: for fields that may exist in both the event table and the user table, such as `#user_id`, `#account_id`, `#distinct_id`, `#server_time`, `#dw_update_time`, `#kafka_offset`, and `#uuid`, do not guess the category. You must guide the user to confirm.

## Example Conversation

### Example 1: Event table field is connected, create virtual property

**User**: I want to use the `#event_time` field in Event Analysis.

**Assistant**: Let me check the status of `#event_time` for you.

> (Runs `analysis-meta property list`, finds that `#event_time` exists with `table_type = event`)

**Assistant**: `#event_time` is currently in "Connected" status and belongs to event properties. Since event properties must be wrapped as a virtual property before they can be used in frontend analysis models, I can create one for you directly.

I can create a virtual property for you that references this field, keeping the data type unchanged, with the associated event automatically set to all events (`relation_always`). Its machine name will be `#vp@event_time`, and the display name will remain `#event_time`. If you have other naming requirements, please let me know. Do you agree to create it?

**User**: Yes, please use the original name.

**Assistant**: Okay, I will now create the virtual property for you.

> (Runs `analysis-meta virtual-property create`, references `"#event_time"`, keeps the metadata-reported data type, and uses `relation_always`)

**Assistant**: The virtual property `#vp@event_time` (display name `#event_time`) has been successfully created. You can now use it directly in frontend models such as Event Analysis, Funnel Analysis, and Retention Analysis.

---

### Example 2: User table field is connected, inform direct usage

**User**: I want to use the `#update_time` field in Retention Analysis.

**Assistant**: Let me check the status of `#update_time` for you.

> (Runs `analysis-meta property list`, finds that `#update_time` exists with `table_type = user`)

**Assistant**: `#update_time` is currently in "Connected" status and belongs to user properties. You can use it directly in frontend analysis models. You can search for `#update_time` in the property list to find it.

---

### Example 3: User table field is not connected, guide connection

**User**: I want to use `#reg_time` in Funnel Analysis.

**Assistant**: Let me check the status of `#reg_time` for you.

> (Runs `analysis-meta property list`; no exact `#reg_time` match is returned, indicating it is not connected)

**Assistant**: `#reg_time` is currently in an unconnected status and belongs to the user table system fields (registration time). You need to set it to "Connected" status first:
1. Navigate to "Data" → "Data Management" → "User Properties" → "Source User Property Management"
2. Find `#reg_time` and click "Create and Connect"
3. Confirm the status changes to "Connected"

After it is connected, the field can be used directly in frontend analysis models.

---

### Example 4: Event table field is not connected, guide connection then create virtual property

**User**: I want to use `#dw_update_time` in Event Analysis.

**Assistant**: Let me check the status of `#dw_update_time` for you.

> (Runs `analysis-meta property list`; no exact `#dw_update_time` match is returned, indicating it is not connected)

**Assistant**: `#dw_update_time` is currently in an unconnected status. This field exists in both the event table and the user table. Please confirm which one you want to use:
- If it is the data warehouse update time reported along with events (event property)
- If it is the data warehouse update time describing user profile updates (user property)

**User**: It is an event property.

**Assistant**: Okay, `#dw_update_time` is a system field in the event table. You need to set it to "Connected" status first:
1. Navigate to "Data" → "Data Management" → "Event Properties" → "Source Event Property Management"
2. Find `#dw_update_time` and click "Create and Connect"
3. Confirm the status changes to "Connected"

Let me know after it is connected, and I will create a virtual property for you so it can be used in frontend analysis models.

---

### Example 5: SQL query fast path

**User**: How do I query `#event_time` in SQL?

**Assistant**: `#event_time` is a system field in the event table. It can be queried directly in SQL without creating and connecting or creating a virtual property. You can use it directly in the event table.

## Language Policy

**CRITICAL**: Always respond in the user's language.
- If user writes in English → Respond in English
- If user writes in Chinese → Respond in Chinese
- Never translate the user's language; match their input language exactly
