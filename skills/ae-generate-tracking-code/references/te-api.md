# AE Plan Query API (captured 2026-04-15)

## Endpoint

- **Method**: GET
- **URL**: `https://web-ta-demo.thinkingdata.cn/v1/ta/bury/manage/program/query?@t={timestamp}&projectId={projectId}`
- **Auth**: header `authorization: bearer {token}` — token value read from `localStorage['ACCESS_TOKEN']` (JSON-encoded string) on the AE web app, also cached in `~/.ae-cli/tokens.json`
- **Additional required headers**:
  - `x-requested-with: XMLHttpRequest`
  - `accept: application/json`
- **Request body**: none (GET)

### URL parameters

| Param | Required | Notes |
|---|---|---|
| `@t` | yes (de-facto) | Unix timestamp ms — cache-buster; the server likely accepts any value |
| `projectId` | yes | AE project ID, e.g. `1603` |

---

## Response shape (truncated to 2 events / 2 props each)

```json
{
  "return_code": 0,
  "return_message": "ok",
  "showStackMessage": null,
  "data": {
    "projectId": 1603,
    "createTime": "2026-04-15 15:45:17",

    "events": [
      {
        "eventName": "admin_skill_review",
        "displayName": "管理员审核",
        "eventDesc": "管理员通过/驳回/归档 skill",
        "eventTag": "admin",
        "creator": "周津",
        "createTime": "2026-04-15 15:45:17",
        "lastUpdateAuth": "周津",
        "lastUpdateTime": "2026-04-15 15:45:17",
        "hasReported": false,
        "props": ["review_action", "review_reason", "skill_id", "skill_name"],
        "propInfosOnEvent": [
          { "name": "review_action", "hasReported": false },
          { "name": "review_reason", "hasReported": false }
        ]
      },
      {
        "eventName": "page_view",
        "displayName": "页面浏览",
        "eventDesc": "任意页面打开",
        "eventTag": "common",
        "creator": "周津",
        "createTime": "2026-04-15 15:45:17",
        "lastUpdateAuth": "周津",
        "lastUpdateTime": "2026-04-15 15:45:17",
        "hasReported": false
        // props / propInfosOnEvent absent when event has no bound properties
      }
    ],

    "eventProps": [
      {
        "name": "login_method",
        "displayName": "登录方式",
        "type": "string",
        "desc": "feishu_sso",
        "creator": "周津",
        "createTime": "2026-04-15 15:45:17",
        "lastUpdateAuth": "周津",
        "lastUpdateTime": "2026-04-15 15:45:17"
        // NOTE: no hasReported field on eventProps items
      },
      {
        "name": "session_duration_ms",
        "displayName": "会话时长毫秒",
        "type": "number",
        "desc": "登出时本次会话累计时长",
        "creator": "周津",
        "createTime": "2026-04-15 15:45:17",
        "lastUpdateAuth": "周津",
        "lastUpdateTime": "2026-04-15 15:45:17"
      }
    ],

    "commonEventProps": [
      {
        "name": "is_embed",
        "displayName": "是否嵌入模式",
        "type": "bool",
        "desc": "是否在 CRM iframe 嵌入中访问",
        "creator": "周津",
        "createTime": "2026-04-15 15:45:17",
        "lastUpdateAuth": "周津",
        "lastUpdateTime": "2026-04-15 15:45:17",
        "hasReported": false
      },
      {
        "name": "page_name",
        "displayName": "页面名称",
        "type": "string",
        "desc": "当前页面标识，如 home/submit/detail/admin",
        "creator": "周津",
        "createTime": "2026-04-15 15:45:17",
        "lastUpdateAuth": "周津",
        "lastUpdateTime": "2026-04-15 15:45:17",
        "hasReported": false
      }
    ],

    "userProps": [
      {
        "name": "admin_review_count",
        "displayName": "审核处理数",
        "type": "number",
        "desc": "管理员累计审核的 skill 数",
        "updateType": "user_add",
        "updateTypeName": "user_add",
        "propTag": "",
        "creator": "周津",
        "createTime": "2026-04-15 15:45:17",
        "lastUpdateAuth": "周津",
        "lastUpdateTime": "2026-04-15 15:45:17",
        "hasReported": false
      }
    ]
  }
}
```

---

## Field mapping to Draft

The planned `normalize()` function assumes `data.event_properties[]`, `data.common_event_properties[]`, `data.user_properties[]`. **Reality differs** — see caveats below.

| AE response field | Draft field (src/plan/types.ts) | Notes |
|---|---|---|
| `data.events[].eventName` | `events[].event_name` | camelCase → snake_case |
| `data.events[].displayName` | `events[].display_name` | camelCase → snake_case |
| `data.events[].eventDesc` | `events[].event_desc` | camelCase → snake_case |
| `data.events[].eventTag` | `events[].event_tag` | camelCase → snake_case |
| `data.events[].props[]` | `events[].properties[]` | array of property name strings |
| `data.events[].propInfosOnEvent[]` | `events[].property_infos[]` | array of `{name, hasReported}` |
| `data.eventProps[].name` | `event_properties[].name` | key rename: `eventProps` → `event_properties` |
| `data.eventProps[].type` | `event_properties[].type` | same |
| `data.eventProps[].displayName` | `event_properties[].display_name` | camelCase → snake_case |
| `data.eventProps[].desc` | `event_properties[].description` | key rename |
| `data.commonEventProps[].name` | `common_event_properties[].name` | key rename: `commonEventProps` → `common_event_properties` |
| `data.userProps[].name` | `user_properties[].name` | key rename: `userProps` → `user_properties` |
| `data.userProps[].updateType` | `user_properties[].update_type` | user property specific |
| `data.userProps[].propTag` | `user_properties[].prop_tag` | user property specific |
| `return_code` | — | top-level; `0` = success |
| `return_message` | — | top-level; `"ok"` on success |

---

## Caveats

1. **Key naming is camelCase throughout** — all field names in the response use camelCase (`eventName`, `displayName`, `eventProps`, etc.). The draft plan assumed snake_case keys like `event_name`. `normalize()` must do a full camelCase → snake_case conversion, or map fields explicitly.

2. **Array key name mismatches vs plan assumption**:
   - Response uses `eventProps` (not `event_properties`)
   - Response uses `commonEventProps` (not `common_event_properties`)
   - Response uses `userProps` (not `user_properties`)

3. **`eventProps` are global, not scoped per event** — all event properties live in one flat `data.eventProps[]` array. Per-event bindings are in `data.events[].props` (name strings) and `data.events[].propInfosOnEvent` (`{name, hasReported}` objects). Events with no bound properties omit both `props` and `propInfosOnEvent` fields entirely.

4. **`hasReported` field inconsistency** — `commonEventProps` and `userProps` items include `hasReported`; `eventProps` items do NOT include this field.

5. **`@t` cache-buster** — the `@t` query param is a Unix timestamp in milliseconds. It appears to be required (the page always sends it) but likely just busts CDN/proxy caching. Use `Date.now()` when constructing requests.

6. **No pagination observed** — the single request returns all 17 events, 21 event props, 6 common props, 9 user props in one shot. No pagination headers or page/limit params were observed.

7. **`userProps[].updateType` and `updateTypeName`** — both fields are present on user properties (e.g., `"user_add"`). The xlsx schema's `更新方式` column maps to this.

8. **`propTag`** — present on `userProps` items (maps to xlsx `属性标签` column), absent on event/common props.

9. **`eventProps` lack `hasReported`** — unlike events and common/user props, individual event property definitions in `eventProps[]` do not carry `hasReported`. The flag does appear inside `propInfosOnEvent[]` on the event object itself.
