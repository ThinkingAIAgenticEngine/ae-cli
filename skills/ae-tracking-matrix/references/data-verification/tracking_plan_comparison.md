# Tracking Plan Comparison

**Run this step only when the user proactively provides a tracking plan document. If there is no plan document, skip it and note in the report: "No tracking plan provided, comparison skipped."**

---

## Accepted Plan Formats

The user may provide the tracking plan in the following ways:

### Method 1: Feishu online document/sheet

The user provides a Feishu link. Use the `lark-doc` skill's `+fetch` to read the content, or use `lark-sheets` to read the sheet.

Common plan formats:
- Table in a Feishu document: Event name | Property name | Property type | Required | Description
- Feishu Bitable (multi-dimensional table)

### Method 2: Local file

The user provides a local Excel (.xlsx) or CSV file path. Read it with the Read tool or pandas.

### Method 3: Online URL

The user provides an online document link. Read it with the WebFetch tool or the corresponding skill.

---

## Plan Parsing

Regardless of the format, try to extract the following structured information:

```json
{
  "events": [
    {
      "event_name": "payment",
      "properties": [
        {"prop_name": "pay_amount", "prop_type": "number", "required": true},
        {"prop_name": "item_id", "prop_type": "string", "required": true}
      ]
    }
  ]
}
```

If the plan format is non-standard or cannot be parsed automatically, confirm with the user before continuing.

---

## Comparison Dimensions

### Dimension 1: Event existence

**Comparison content**: Events defined in the plan vs. events actually reported.

**Execution method**:
1. Extract all event names from the plan document.
2. Use SQL to query the events actually reported:
```sql
SELECT DISTINCT "#event_name" FROM ta.v_event_{project_id}
WHERE "$part_date" {query_date} LIMIT 1000
```
3. Classify the comparison results into three categories:
   - **In plan, not in data** → tracking not triggered or not integrated
   - **In data, not in plan** → redundant events not defined in the plan
   - **Consistent** → as expected

### Dimension 2: Property name consistency

**Comparison content**: Properties defined for each event in the plan vs. properties in the actual data.

**Execution strategy (tiered by event count)**:
- **≤10 events**: sample-compare each event one by one using `query_event_details`
- **>10 events**: pick 3-5 representative events (Top N by trigger volume, or core business events) for sample comparison; the remaining events only get an existence check
- When the plan has 50+ events, prioritize the event existence comparison (Dimension 1); property comparison covers only core events

**Execution method**:
For each selected event, use `query_event_details` to sample and view the actual property list:
```
query_event_details(projectId, eventName, startTime, endTime, limit: 10)
```
Extract property names from the returned field list and compare with the plan:
- In plan, not in data → property not reported
- In data, not in plan → undefined extra property
- Consistent → as expected

### Dimension 3: Property type consistency

**Comparison content**: Property types defined in the plan vs. actual data types.

**Execution method**:
For key properties (especially numeric ones), use `query_event_details` + the `properties` parameter to view the actual value format, and compare with the type definition in the plan.

For example: the plan defines `pay_amount` as number, but the actual value is the string `"9.99"` → type mismatch.

---

## Comparison Result Output

After the comparison, output a table:

```
## Tracking Plan Comparison Results

### Event Comparison
| Event name | In plan | Actually reported | Status |
|--------|---------|---------|------|
| payment | Yes | Yes | Consistent |
| share   | Yes | No | Missing |
| ad_click | No | Yes | Redundant |

### Property Comparison (payment as an example)
| Property name | Plan type | Actually reported | Status |
|--------|---------|---------|------|
| pay_amount | number | number | Consistent |
| currency | string | Missing | Not reported |
| extra_data | - | string | Redundant property |
```

---

## Notes

- The plan document may contain comment rows, merged cells, etc.; be as fault-tolerant as possible when parsing.
- The actually reported property list may include TE system properties (`#event_name`, `#user_id`, etc.); when comparing, automatically exclude system fields starting with `#` or `$`.
- If the plan document format is completely unrecognizable, show the user the raw content you read and ask them to confirm the format.
- The comparison results only flag differences, without making correctness judgments (some differences may be reasonable, e.g., the plan was not updated in time).
