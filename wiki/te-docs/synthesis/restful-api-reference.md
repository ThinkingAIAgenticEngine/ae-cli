---
topic: RESTful API Reference
sources:
  - raw/data-ingestion-guide/restful-api-user-guide.md
  - raw/preparations-before-data-ingestion/data-rules.md
  - raw/preparations-before-data-ingestion/user-identification-rules.md
generated: 2026-06-16
---

# RESTful API Reference

This reference covers the ThinkingAnalytics (TA) data ingestion REST API: available endpoints, authentication, request formats, batch upload procedures, data structure rules, and common error codes. Use this as a quick look-up when integrating server-to-server data reporting without an SDK.

## 1. Endpoints

TA provides two HTTP POST endpoints for data ingestion. Both accept UTF-8-encoded JSON and return a JSON response with a `code` field (`0` = success).

| Endpoint | Content-Type | Best for |
|---|---|---|
| `/sync_data` | `application/x-www-form-urlencoded` | Simple curl / form-based integrations; request body carries `appid`, `data` (or `data_list`), plus optional `debug` and `client` |
| `/sync_json` | `application/json` | Programmatic integrations; request body is a JSON object or JSON array, each element wrapping `appid`, `data`, and optional `debug` |

**Base URLs:**

| Deployment | sync_data | sync_json |
|---|---|---|
| Cloud (global) | `https://global-receiver-ta.thinkingdata.cn/sync_data` | `https://global-receiver-ta.thinkingdata.cn/sync_json` |
| Private | `http://<data-acquisition-address>/sync_data` | `http://<data-acquisition-address>/sync_json` |

## 2. Authentication

Authentication is project-level: every request must include the **APPID** of the target TA project.

- **sync_data** -- pass `appid` as a form parameter in the URL-encoded body.
- **sync_json** -- include `"appid"` as a top-level key in the JSON payload.

There is no separate API key or token. The APPID alone authorizes data ingestion into the corresponding project.

## 3. Request Format

### 3.1 The TA Data Record (JSON)

Every piece of data is a single-line JSON object. The top-level keys (outside `properties`) carry metadata; the `properties` object carries the event or user properties.

**Event record (`#type: "track"`):**

```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track",
  "#time": "2017-12-18 14:37:28.527",
  "#event_name": "test",
  "#ip": "192.168.171.111",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "properties": {
    "argString": "abc",
    "argNum": 123,
    "argBool": true
  }
}
```

**User-property record (`#type: "user_set"` etc.):**

```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "user_set",
  "#time": "2017-12-18 14:37:28.527",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "properties": {
    "userArgString": "abc",
    "userArgNum": 123
  }
}
```

### 3.2 Metadata Fields (top-level, all start with `#`)

| Field | Required | Description |
|---|---|---|
| `#account_id` | Conditionally | Login-state user ID. At least one of `#account_id` or `#distinct_id` must be present. |
| `#distinct_id` | Conditionally | Anonymous / pre-login user ID. |
| `#type` | **Yes** | Data type: `track`, `user_set`, `user_setOnce`, `user_add`, `user_unset`, `user_append`, `user_uniq_append`, or `user_del`. |
| `#event_name` | Only when `#type` is `track` | Event name. Must start with a letter; max 50 chars; allowed characters: letters, digits, `_`. Case-sensitive. |
| `#time` | **Yes** | Event trigger time. Format: `yyyy-MM-dd HH:mm:ss.SSS` (millisecond) or `yyyy-MM-dd HH:mm:ss` (second). |
| `#ip` | No | Client IP address. TA geo-parses this; overridden by `#country`/`#province`/`#city` in `properties`. |
| `#uuid` | No | UUID v4 for deduplication (checks recent hours only, not the full data set). |

**User identification priority:** When both `#account_id` and `#distinct_id` are present, `#account_id` takes precedence for associating the record with a TE user ID.

### 3.3 `#type` Values

| `#type` | Meaning |
|---|---|
| `track` | Log a user-behavior event (goes to the event table). |
| `user_set` | Overwrite one or more user properties. |
| `user_setOnce` | Set user properties only if they have no existing value. |
| `user_add` | Accumulate numeric user properties (negative values subtract). |
| `user_unset` | Clear one or more user property values. |
| `user_append` | Append elements to a list-type user property. |
| `user_uniq_append` | Append elements and de-duplicate the entire list. |
| `user_del` | Delete the user from the user table (event data is not deleted). |

### 3.4 Property Value Types

Properties inside `properties` can be of these types. The first-seen type determines the property type permanently; subsequent mismatches cause the value to be discarded.

| TA Type | JSON Type | Example / Constraints |
|---|---|---|
| Numeric | `number` | `123`, `1.23` -- range: -9E15 to 9E15 |
| Text | `string` | Max 2 KB per value |
| Time | `string` | `"2019-01-01 00:00:00"` or `"2019-01-01 00:00:00.000"` |
| Boolean | `boolean` | `true` / `false` |
| List | `array` of strings | Max 500 elements; each element max 255 bytes |
| Object | `object` | Max 100 sub-properties; each sub-property has its own type |
| Array of Objects | `array` of objects | Max 500 objects; sub-properties typed individually |

**Naming rules:** Property names must start with a letter and may contain letters, digits, and `_` (max 50 chars). Only TA built-in/preset properties may start with `#`. Names are case-insensitive in the backend.

## 4. Single vs. Batch Upload

### 4.1 sync_data (form-urlencoded)

**Single record:**
```
POST /sync_data
Content-Type: application/x-www-form-urlencoded

appid=<YOUR_APPID>&data=<URL_ENCODED_JSON>&client=0&debug=0
```

**Multiple records (batch):**
```
POST /sync_data
Content-Type: application/x-www-form-urlencoded

appid=<YOUR_APPID>&data_list=<URL_ENCODED_JSON_ARRAY>&client=0&debug=0
```

With `client=1`, the server sets `#ip` to the reporting client's IP (overriding any `#ip` in the data).

**curl example (single record):**

First URL-encode the JSON:
```
%7b%22%23account_id%22%3a%22testing%22%2c%22%23time%22%3a%222019-01-01+10%3a00%3a00.000%22%2c%22%23type%22%3a%22track%22%2c%22%23event_name%22%3a%22testing%22%2c%22properties%22%3a%7b%22test%22%3a%22test%22%7d%7d
```

```bash
curl "http://receiver:9080/sync_data" \
  --data "appid=test-sdk-appid&data=%7b%22%23account_id%22%3a%22testing%22..."
```

> **Note:** Some HTTP libraries (Python `requests`, Postman) URL-encode automatically. Do not double-encode in those cases.

### 4.2 sync_json (JSON body)

**Single record:**

```json
{
  "appid": "debug-appid",
  "debug": 0,
  "data": {
    "#type": "track",
    "#event_name": "test",
    "#time": "2019-11-15 11:35:53.648",
    "#distinct_id": "1111",
    "properties": { "a": "123", "b": 2 }
  }
}
```

**Multiple records (batch):** send a JSON array -- each element is an `{appid, debug, data}` wrapper.

```json
[
  {
    "appid": "debug-appid",
    "debug": 0,
    "data": {
      "#type": "track",
      "#event_name": "test",
      "#time": "2019-11-15 11:35:53.648",
      "#distinct_id": "1111",
      "properties": { "a": "123", "b": 2 }
    }
  },
  {
    "appid": "debug-appid",
    "debug": 0,
    "data": {
      "#type": "track",
      "#event_name": "test",
      "#time": "2019-11-15 11:35:53.648",
      "#distinct_id": "1111",
      "properties": { "a": "456", "b": 3 }
    }
  }
]
```

### 4.3 Data Compression (sync_json only)

Add a `compress` header to the HTTP request. Supported algorithms:

| Header value | Algorithm |
|---|---|
| `gzip` | Gzip |
| `lzo` | LZO |
| `lz4` | LZ4 |
| `snappy` | Snappy |

Example: `compress: gzip`

### 4.4 Client IP Override (sync_json only)

Add `client=1` to the request header. The server will replace `#ip` in every record with the reporting client's IP.

## 5. Debug Mode

Add `debug=1` to any request to receive detailed error messages in the response instead of a silent failure.

**sync_data:** pass `&debug=1` as a form parameter.

**sync_json:** set `"debug": 1` in the JSON wrapper.

**Example error response:**
```json
{
  "code": -1,
  "msg": "The format of the #time field is incorrect, and the format of [yyyy-MM-dd HH:mm:ss] or [yyyy-MM-dd HH:mm:ss.SSS] needs to be passed"
}
```

> **Important:** Debug mode is for testing only. Do not enable it in production.

## 6. Data Constraints & Limits

| Constraint | Recommended Limit | Hard Limit |
|---|---|---|
| Event types per project | 100 | 500 |
| Event properties per project | 300 | 1000 |
| User properties per project | 100 | 500 |
| `#account_id` / `#distinct_id` length | -- | 128 chars (64 for pre-v3.1 projects) |
| Event name length | -- | 50 chars |
| Property name length | -- | 50 chars |
| Text property value | -- | 2 KB |
| Numeric property value | -- | -9E15 to 9E15 |
| List elements | -- | 500 |
| Object sub-properties | -- | 100 |
| Array-of-objects elements | -- | 500 |

**Time window for data reception:**

| Source | Window |
|---|---|
| Server-side upload | 3 years before to 3 days after server time |
| Client-side SDK | 10 days before to 3 days after server time |

Data outside these windows is rejected. Contact TA staff to import older historical data.

## 7. Common Error Codes & Troubleshooting

### 7.1 Data Not Received

| Symptom | Check |
|---|---|
| No data appears | Verify APPID and receiver URL (including port/suffix). |
| | Confirm each line is exactly one JSON record. |
| | Verify all metadata fields start with `#` and required fields are present (`#type`, `#time`, `#event_name` for track). |
| | Check `#time` format: must be `yyyy-MM-dd HH:mm:ss` or `yyyy-MM-dd HH:mm:ss.SSS`. |
| | Check `#event_name` does not contain spaces or non-ASCII characters. |
| | `properties` keys must NOT start with `#` (reserved for built-in fields). |
| | User-property data (`user_set` etc.) does not appear in behavior analysis -- use SQL or user-table views. |
| | Data older than 3 years is silently dropped; adjust query time range if importing historical data. |

### 7.2 Properties Missing or Values Dropped

| Symptom | Cause |
|---|---|
| Some properties absent | Property name contains spaces, non-ASCII characters, or starts with `#` (unless it is a known preset property). |
| Value is null / discarded | The value type does not match the property's first-seen type. Check the type in the metadata management page. |
| Inconsistent property types across events | Properties of the same name across different events share the same type. Ensure consistency. |

### 7.3 User Identification Issues

- A `#distinct_id` can be bound to at most one `#account_id`.
- An `#account_id` can be bound to multiple `#distinct_id` values.
- A TE user ID (`#user_id`) can be bound to at most one `#account_id`.
- When a new `#account_id` arrives with a `#distinct_id` that is already bound to a different `#account_id`, a brand-new TE user ID is created for the incoming `#account_id` -- the two accounts stay separate.

## 8. Quick Reference: Minimum Valid Request

**Track an event (sync_json):**
```json
{
  "appid": "<YOUR_APPID>",
  "data": {
    "#type": "track",
    "#event_name": "page_view",
    "#time": "2026-06-16 10:00:00.000",
    "#distinct_id": "device-abc-123",
    "properties": {
      "page": "/home"
    }
  }
}
```

**Set a user property (sync_json):**
```json
{
  "appid": "<YOUR_APPID>",
  "data": {
    "#type": "user_set",
    "#time": "2026-06-16 10:00:00.000",
    "#account_id": "user-456",
    "properties": {
      "vip_level": 3,
      "last_login_time": "2026-06-16 09:55:00"
    }
  }
}
```

**Batch two events (sync_json):**
```json
[
  {
    "appid": "<YOUR_APPID>",
    "data": {
      "#type": "track",
      "#event_name": "click_button",
      "#time": "2026-06-16 10:00:00.000",
      "#distinct_id": "device-abc-123",
      "properties": { "button_name": "signup" }
    }
  },
  {
    "appid": "<YOUR_APPID>",
    "data": {
      "#type": "track",
      "#event_name": "click_button",
      "#time": "2026-06-16 10:00:01.000",
      "#distinct_id": "device-abc-123",
      "properties": { "button_name": "cancel" }
    }
  }
]
```

## 9. Backend Processing Notes

- **First-seen type wins:** The type of each property is locked to the type of the first value ever received. Incompatible subsequent values are silently discarded.
- **New properties are auto-registered:** Uploading a new property key automatically adds it to the event model -- no separate schema registration is needed.
- **Common properties:** Properties with identical names across different events are treated as the same property and must share the same type.
- **User-table operations are commands:** `user_set`, `user_add`, etc. are processed in the order they are received on the server, regardless of the `#time` field.
- **UUID deduplication** only covers data received within the last few hours. It does not de-duplicate against the full historical data set.
- **Encoding:** All data must be UTF-8 encoded.
