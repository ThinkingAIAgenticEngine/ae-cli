# Config strategy audience (custom cluster)

> Applies to: **配置中心 → 运营策略 → 目标受众 → 目标用户 → 自定义人群**.  
> Strategy payload: [`scene-strategy.md`](scene-strategy.md).  
> Audience **logic** uses the same semantic model as ae-analysis [`user_cluster_models.md`](../../ae-analysis/references/user_cluster_models.md) + [`audience_models.md`](../../ae-analysis/references/audience_models.md).

Webhook / client config strategies store audience on `ConfigStrategyAddDTO`:

| UI | Payload field | Notes |
|---|---|---|
| 全部用户 | `targetClusterType: 0` | `targetClusterQp: null` |
| 自定义人群 | `targetClusterType: 1` | `targetClusterQp`: **JSON string** (mix QP) |
| 目标环境 (Webhook) | `envConfig` | Mutually exclusive with user audience on Webhook |

## Default workflow (Agent) — direct strategy, no new cluster

**Unless the user explicitly asks to use an existing / named user cluster**, do **not** call `analysis user-cluster create`. Create the strategy directly:

1. **Preflight** — verify every user/event property and enum value exists (see [Preflight](#preflight--mandatory-stop)).
2. **Design** — express audience in natural language: **用户满足** block + optional **用户行为** block + relation between them.
3. **Assemble** — build mix QP (`totalCFilter`, optional `totalOutCFilter`) per [QP shape](#mix-qp-shape-ui--backend) below; `JSON.stringify` into `targetClusterQp`.
4. **Create / update** — `engage-scene strategy create|update`.

```bash
# Preflight
ae-cli analysis-meta property list --project-id <pid> --table-type user
ae-cli analysis-meta property get --project-id <pid> --table-type user --prop-name <prop>
ae-cli analysis-meta event list --project-id <pid>
ae-cli analysis-meta event get --project-id <pid> --event-name <event>
ae-cli analysis +load_filters --project_id <pid> --table_type user --quot <prop>

# Create / update
ae-cli engage-scene strategy create --project-id <pid> --payload '{
  "configId":"<config_id>",
  "templateId":"<enabled_template_id>",
  "strategyName":"<name>",
  "tzOffset":8.0,
  "targetClusterType":1,
  "targetClusterQp":"<stringified mix QP>",
  "envConfig":null,
  "templateParamConfig":"[...]",
  "content":"{...}",
  "triggerType":0,
  "onlineTime":"1",
  "offlineTime":"1"
}'
```

Align `tzOffset` with the strategy timezone.

---

## Mix QP shape (UI ↔ backend)

Config-strategy custom audience uses **mix QP** (same as Hermes `formatTriggerConditionForBack` / `formatTriggerConditionFromQp`, mix version `4.3`).

### Top-level object

```json
{
  "totalCFilter": { "relation": "<userEventRelation>", "filts": [ /* block 0 */, /* block 1 */ ] },
  "totalOutCFilter": { "relation": "0", "filts": [] }
}
```

| Field | UI label | Meaning |
|---|---|---|
| `totalCFilter.relation` | 用户满足 **与/或** 用户行为 | `"1"` = 且, `"0"` = 或 (`userEventRelation`) |
| `totalCFilter.filts[0]` | **用户满足** | User/tag/cluster conditions only |
| `totalCFilter.filts[1]` | **用户行为** | Event / behavior-sequence conditions only (omit block if no events) |
| `totalOutCFilter` | **排除用户** | Optional exclude block; empty `filts` when unused |

### Hard structural rules

1. **Two-block layout** — when both user attrs and events exist, `totalCFilter.filts` has **exactly two** group objects:
   - `[0]` = 用户满足 (`filts[].conditionType` is `user` / `tag` / `cluster`, or nested `filterType:"COMPOUND"`)
   - `[1]` = 用户行为 (`filts[].conditionType` is `event` / `behaviorSeq`)
2. **Never nest `event` inside 用户满足** — do not put `conditionType:"event"` under user-side `filterType:"COMPOUND"`. The UI cannot parse that shape.
3. **Group vs leaf** — compound groups use `{ "relation": 0|1, "filts": [...] }` or `{ "filterType": "COMPOUND", "relation": 0|1, "filts": [...] }` inside 用户满足. Event block uses `{ "relation": 0|1, "filts": [ event leaves ] }` without `filterType`.
4. **`relation` values** — `"1"` = 且, `"0"` = 或 (string at group level is accepted; backend may normalize to number).

### ASCII layout (typical case: 用户满足 且 用户行为)

```
totalCFilter
├── relation: "1"                    ← userEventRelation (且)
├── filts[0]  用户满足
│   ├── relation: "0"|"1"            ← OR/AND among user conditions
│   └── filts[]
│       ├── filterType:"COMPOUND" …    ← nested AND/OR groups
│       └── conditionType:"user" …     ← leaf
└── filts[1]  用户行为
    ├── relation: "0"|"1"            ← OR/AND among events
    └── filts[]
        └── conditionType:"event" …
```

---

## 用户满足 — QP definition

**UI:** 目标受众 → 自定义人群 → **用户满足**  
**JSON:** `totalCFilter.filts[0]`

### Group

```json
{
  "relation": "0",
  "filts": [ /* leaves and COMPOUND groups */ ]
}
```

- `relation: "0"` — 或 (any branch matches)
- `relation: "1"` — 且 (all branches match)

### Nested AND/OR (COMPOUND)

Use inside `filts[0].filts` when one OR branch is itself an AND (or deeper nesting):

```json
{
  "filterType": "COMPOUND",
  "relation": 1,
  "filts": [
    { "conditionType": "user", "userCondition": { /* leaf A */ } },
    { "conditionType": "user", "userCondition": { /* leaf B */ } }
  ]
}
```

### User property leaf (`userCondition`)

Every leaf must use fields from **`analysis-meta property get`** — never guess names or enum values.

| Semantic operator | `calcuSymbol` |
|---|---|
| equals | `C00` |
| not equals | `C01` |
| less than / ≤ | `C02` / `C020` |
| greater than / ≥ | `C03` / `C030` |
| contains / not contains | `C07` / `C08` |
| regex / not regex | `C11` / `C12` |

Minimal string leaf:

```json
{
  "conditionType": "user",
  "userCondition": {
    "calcuSymbol": "C00",
    "columnName": "device_brand",
    "columnDesc": "device_brand",
    "columnType": "string",
    "selectType": "string",
    "tableType": "1",
    "ftv": ["苹果"],
    "timeRelative": "",
    "timeUnit": ""
  }
}
```

Datetime leaf (e.g. birth date after a year — confirm `columnType`/`selectType` from property get):

```json
{
  "conditionType": "user",
  "userCondition": {
    "calcuSymbol": "C030",
    "columnName": "birthdate",
    "columnDesc": "birthdate",
    "columnType": "timestamp",
    "selectType": "datetime",
    "tableType": "1",
    "ftv": ["2001-01-01 00:00:00"],
    "timeRelative": "",
    "timeUnit": ""
  }
}
```

### 用户满足-only audience

When there is **no** 用户行为, `totalCFilter.filts` has **one** block (用户满足 only). Set `totalCFilter.relation` to `"1"` (default 且 with empty event side is not used — simply omit `filts[1]`).

---

## 用户行为 — QP definition

**UI:** 目标受众 → 自定义人群 → **用户行为**  
**JSON:** `totalCFilter.filts[1]`

### Group

```json
{
  "relation": "1",
  "filts": [
    { "conditionType": "event", "eventCondition": { /* … */ } }
  ]
}
```

- Multiple events: `relation: "1"` = 且 (all), `"0"` = 或 (any).

### Event count leaf (`eventCondition`)

Preset **总次数** (empty `taPropQuota.quota`) rules — see [`save-flow.md`](save-flow.md) §9.2:

| Meaning | `uceCalcuSymbol` | `num` (string) |
|---|---|---|
| at least once (≥ 1) | `C030` | `"1"` |
| at least N times (≥ N) | `C030` | `"N"` |
| greater than N (> N) | `C03` | `"N"` |

Always include full `taPropQuota`:

```json
"taPropQuota": {
  "analysis": "A200",
  "analysisDesc": "Count",
  "quota": "",
  "quotaDesc": "",
  "analysisParams": ""
}
```

### Time window (`recentDay`)

| UI wording | Typical `recentDay` |
|---|---|
| 最近 N 天（含今天） | `"0-N"` |
| 过去 N 天（不含今天） | `"1-N"` |

Confirm against project convention if validation fails.

### Event leaf template

```json
{
  "conditionType": "event",
  "eventCondition": {
    "eventName": "login",
    "eventDesc": "login",
    "eventType": "event",
    "uceCalcuSymbol": "C030",
    "num": "2",
    "recentDay": "0-3",
    "startTime": "",
    "endTime": "",
    "taPropQuota": {
      "analysis": "A200",
      "analysisDesc": "Count",
      "quota": "",
      "quotaDesc": "",
      "analysisParams": ""
    },
    "filts": [],
    "relation": 1
  }
}
```

### Event property filters

Put filters on the event inside `eventCondition.filts[]` (`tableType: "0"`). Preflight with `analysis-meta event get` + event-scoped property list. Example: `os_version` regex on `login` — see worked example B below.

---

## Preflight — mandatory stop

### 用户满足 (user-table properties)

1. **`analysis-meta property get`** for each `columnName` — exact match required.
2. **Never invent** — do not map natural language to property names without confirmation (e.g. “在中国” → `country`, not `nation`, until verified).
3. **Never silently drop** — missing property → stop; do not create/update strategy.
4. **Report** — name missing fields; run **`analysis-meta property list --table-type user`** and present available properties (`prop_name`, `prop_desc`, `select_type`); ask user to choose.

```bash
ae-cli analysis-meta property get --project-id <pid> --table-type user --prop-name <prop_name>
ae-cli analysis-meta property list --project-id <pid> --table-type user
ae-cli analysis +load_filters --project_id <pid> --table_type user --quot <prop_name>
```

Enum/`ftv` values must come from `+load_filters` or property metadata — never invent labels.

### 用户行为 (events)

```bash
ae-cli analysis-meta event list --project-id <pid>
ae-cli analysis-meta event get --project-id <pid> --event-name <event_name>
```

Same stop/report rules if event name or event property is missing.

---

## Worked example A — 用户满足 + 用户行为 (full strategy)

**Natural language:**

- **用户满足:** (苹果用户 且 在中国) **或** (出生日期在 2000 年之后)
- **用户行为:** 最近 3 天登录 ≥ 2 次 **且** 最近 1 天购买 > 1 次
- **Relation:** 用户满足 **且** 用户行为

**Preflight (example project):** `device_brand`/`country`/`birthdate` exist; `device_brand` enum has `"苹果"`; `country` enum has `"中国"`; events `login`, `purchase` exist.

**UI mapping:**

```
用户满足 OR [ AND(苹果, 中国), birthdate≥2001-01-01 ]
        且
用户行为 AND [ login≥2 / 最近3天, purchase>1 / 最近1天 ]
```

**`targetClusterQp`** (stringify for payload):

```json
{
  "totalCFilter": {
    "relation": "1",
    "filts": [
      {
        "relation": "0",
        "filts": [
          {
            "filterType": "COMPOUND",
            "relation": 1,
            "filts": [
              {
                "conditionType": "user",
                "userCondition": {
                  "calcuSymbol": "C00",
                  "columnName": "device_brand",
                  "columnDesc": "device_brand",
                  "columnType": "string",
                  "selectType": "string",
                  "tableType": "1",
                  "ftv": ["苹果"],
                  "timeRelative": "",
                  "timeUnit": ""
                }
              },
              {
                "conditionType": "user",
                "userCondition": {
                  "calcuSymbol": "C00",
                  "columnName": "country",
                  "columnDesc": "country",
                  "columnType": "string",
                  "selectType": "string",
                  "tableType": "1",
                  "ftv": ["中国"],
                  "timeRelative": "",
                  "timeUnit": ""
                }
              }
            ]
          },
          {
            "conditionType": "user",
            "userCondition": {
              "calcuSymbol": "C030",
              "columnName": "birthdate",
              "columnDesc": "birthdate",
              "columnType": "timestamp",
              "selectType": "datetime",
              "tableType": "1",
              "ftv": ["2001-01-01 00:00:00"],
              "timeRelative": "",
              "timeUnit": ""
            }
          }
        ]
      },
      {
        "relation": "1",
        "filts": [
          {
            "conditionType": "event",
            "eventCondition": {
              "eventName": "login",
              "eventDesc": "login",
              "eventType": "event",
              "uceCalcuSymbol": "C030",
              "num": "2",
              "recentDay": "0-3",
              "startTime": "",
              "endTime": "",
              "taPropQuota": {
                "analysis": "A200",
                "analysisDesc": "Count",
                "quota": "",
                "quotaDesc": "",
                "analysisParams": ""
              },
              "filts": [],
              "relation": 1
            }
          },
          {
            "conditionType": "event",
            "eventCondition": {
              "eventName": "purchase",
              "eventDesc": "purchase",
              "eventType": "event",
              "uceCalcuSymbol": "C03",
              "num": "1",
              "recentDay": "0-1",
              "startTime": "",
              "endTime": "",
              "taPropQuota": {
                "analysis": "A200",
                "analysisDesc": "Count",
                "quota": "",
                "quotaDesc": "",
                "analysisParams": ""
              },
              "filts": [],
              "relation": 1
            }
          }
        ]
      }
    ]
  },
  "totalOutCFilter": {
    "relation": "0",
    "filts": []
  }
}
```

Notes:

- `"2000年之后"` interpreted as `birthdate >= 2001-01-01`; confirm with user if they mean inclusive of year 2000.
- `purchase > 1` → `C03` + `num: "1"`; `login ≥ 2` → `C030` + `num: "2"`.

---

## Worked example B — 用户满足 OR + 用户行为 with event filter

**Natural language:** (苹果设备 且 login 的 iOS>26) **或** 非苹果设备 — with login/iOS on **用户行为**.

**UI mapping:**

```
用户满足 OR [ AND(苹果), 非苹果 ]
        且
用户行为 login (os_version 匹配 iOS 主版本 > 26)
```

Only **`filts[0]`** carries user attrs; **`filts[1]`** carries the event (with `eventCondition.filts[]` for `os_version`):

```json
{
  "totalCFilter": {
    "relation": "1",
    "filts": [
      {
        "relation": "0",
        "filts": [
          {
            "filterType": "COMPOUND",
            "relation": 1,
            "filts": [
              {
                "conditionType": "user",
                "userCondition": {
                  "calcuSymbol": "C00",
                  "columnName": "device_brand",
                  "columnDesc": "device_brand",
                  "columnType": "string",
                  "selectType": "string",
                  "tableType": "1",
                  "ftv": ["苹果"]
                }
              }
            ]
          },
          {
            "conditionType": "user",
            "userCondition": {
              "calcuSymbol": "C01",
              "columnName": "device_brand",
              "columnDesc": "device_brand",
              "columnType": "string",
              "selectType": "string",
              "tableType": "1",
              "ftv": ["苹果"]
            }
          }
        ]
      },
      {
        "relation": "1",
        "filts": [
          {
            "conditionType": "event",
            "eventCondition": {
              "eventName": "login",
              "eventDesc": "login",
              "eventType": "event",
              "uceCalcuSymbol": "C030",
              "num": "1",
              "recentDay": "0-3650",
              "taPropQuota": {
                "analysis": "A200",
                "analysisDesc": "Count",
                "quota": "",
                "quotaDesc": "",
                "analysisParams": ""
              },
              "filts": [
                {
                  "calcuSymbol": "C11",
                  "columnName": "os_version",
                  "columnDesc": "os_version",
                  "columnType": "string",
                  "selectType": "string",
                  "tableType": "0",
                  "ftv": ["^(iOS )?(2[7-9]|[3-9][0-9])(\\.[0-9]+)*$"]
                }
              ],
              "relation": 1
            }
          }
        ]
      }
    ]
  },
  "totalOutCFilter": { "relation": "0", "filts": [] }
}
```

---

## Worked example C — 用户满足 only

**Natural language:** `country = 中国`

```json
{
  "totalCFilter": {
    "relation": "1",
    "filts": [
      {
        "relation": "1",
        "filts": [
          {
            "conditionType": "user",
            "userCondition": {
              "calcuSymbol": "C00",
              "columnName": "country",
              "columnDesc": "country",
              "columnType": "string",
              "selectType": "string",
              "tableType": "1",
              "ftv": ["中国"]
            }
          }
        ]
      }
    ]
  },
  "totalOutCFilter": { "relation": "0", "filts": [] }
}
```

---

## Common pitfalls

| Mistake | Why it fails |
|---|---|
| Put `conditionType:"event"` inside 用户满足 `COMPOUND` | UI/backend expect events only in `filts[1]`; structure breaks in editor |
| Only one top-level `filts` block when both user + event exist | `formatTriggerConditionFromQp` mis-parses user vs event |
| Guess `columnName` from Chinese description | Property may not exist; must preflight and list available props |
| Drop missing condition and continue | Violates mandatory stop; audience silently wrong |
| `A200` empty quota with `uceCalcuSymbol` other than `C030`/`C03` rules | Backend `invalid_preset_count_expression` |
| Invent enum values (`"Apple"` vs `"苹果"`) | Filter never matches real data |

---

## Existing cluster reference (exception path)

When the user supplies an existing `cluster_name`:

```json
"targetClusterQp": "{\"totalCFilter\":{\"relation\":\"1\",\"filts\":[{\"relation\":\"1\",\"filts\":[{\"conditionType\":\"cluster\",\"clusterCondition\":{\"calcuSymbol\":\"C20\",\"columnName\":\"<existing_cluster_name>\",\"columnDesc\":\"<existing_cluster_name>\",\"columnType\":\"boolean\",\"selectType\":\"bool-s\",\"tableType\":\"2\",\"subTableType\":\"cluster_by_result\",\"specifiedClusterDate\":\"<YYYY-MM-DD>\",\"ftv\":[]}}]}]}}"
```

Discover names: `ae-cli analysis user-cluster list --project-id <pid>`.

---

## Webhook constraints

- **Cannot** set both `envConfig` and `targetClusterType` on Webhook channels.
- Must set one of: user audience (`targetClusterType`) or environment audience (`envConfig`).
- Client channel may combine `envConfig` + user audience.

---

## Related surfaces (different rules)

| Surface | Default audience path |
|---|---|
| **Config strategy** (this doc) | Direct `targetClusterQp`; **no** new `user-cluster create` unless user asks for existing cluster |
| Task `save` | [`save-task.md`](save-task.md) |
| Flow `save` | [`save-flow.md`](save-flow.md) |
| Activity topic | [`activity-topic.md`](activity-topic.md) |

For reusable Analysis clusters, use ae-analysis [`user_cluster_create.md`](../../ae-analysis/references/user_cluster_create.md).

---

## Audience size estimate (预估人数)

**UI:** 策略编辑 → 目标受众 → **重新预估**  
**Backend:** `POST /v1/hermes/config/strategy/predictEntityCount?projectId=<pid>`

Request body (`ConfigClusterPredictEntityReqDTO`):

| Field | Required | Notes |
|---|---|---|
| `requestId` | Yes | Client-generated UUID (UI uses `getUuid()`) |
| `zoneOffset` | Yes | Strategy timezone, e.g. `8.0` |
| `qp` | Yes | **`targetClusterQp` string** (mix QP JSON string, same as saved on strategy) |
| `strategyUuid` | No | Pass when refreshing an existing strategy; server persists `clusterUserNum` on strategy |

Response (`ConfigClusterPredictEntityResDTO`):

- `predictNumList[0].entityNum` — estimated user count
- `predictNumList[0].realAvailable` — whether count is within realtime/scheduled limits
- `refreshTime` — estimate timestamp

The UI formats the saved QP with `formatTriggerConditionForBack` before sending; when calling the API directly, pass the **same mix QP string** already stored in `targetClusterQp` (the backend shape in examples A/B/C above).

### CLI

```bash
ae-cli engage-scene strategy predict \
  --project-id <pid> \
  --qp '<targetClusterQp mix QP string>' \
  --zone-offset 8 \
  --strategy-uuid <optional_strategy_uuid>
```

- `--qp`: same mix QP JSON string stored in `targetClusterQp` (see examples A/B/C above).
- `--zone-offset`: strategy timezone (match `tzOffset` on the strategy).
- `--strategy-uuid`: optional; when set, server persists `clusterUserNum` on the strategy (same as UI re-estimate on a saved draft).
- `--request-id`: optional; auto-generated when omitted.

Response: `data.entity_num` (count), `data.real_available`, `data.predict_num_list`, `data.refresh_time`.

Example using an existing strategy's saved QP:

```bash
QP=$(ae-cli engage-scene strategy get --project-id 1 --config-id yx_0723_01 \
  --strategy-uuid 4028f0716dfe0b3e5f992f82e19c3e74 \
  --jq '.data.item.target_cluster_qp')

ae-cli engage-scene strategy predict \
  --project-id 1 \
  --qp "$QP" \
  --zone-offset 8 \
  --strategy-uuid 4028f0716dfe0b3e5f992f82e19c3e74
```

Capability id: `engage-scene.strategy.predict` (gateway → `HermesConfigStrategyService.predictEntity`).

### UI alternative

**UI:** 策略编辑 → 目标受众 → **重新预估** (same backend endpoint).

After UI or CLI predict with `--strategy-uuid`, `strategy get` returns `cluster_user_num` / `cluster_user_refresh_time`.

Do **not** guess counts from QP semantics alone — always run predict or read a prior `cluster_user_num`.
