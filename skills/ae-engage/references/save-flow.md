# ae-engage `+save_flow`

Create, edit, preview, or commit a flow canvas draft.

Mapped command: `ae-cli engage +save_flow --project_id <projectId> --req '<req-json>'`

> **Protocol v2 (current).** `save_flow` is now **operation-based**. The `--req` object must carry an `operation` of `build`, `preview`, or `commit`. Do **not** use the old `nodeList` / `edgeList` field names — send `nodes` / `edges` instead. Posting a legacy `nodeList`/`edgeList` payload (or omitting `operation`) makes the backend reject the call with `Unsupported save_flow operation: null`.

The CLI passes your `--req` straight through to the backend (it only injects `projectId`). So everything in this document is about building the correct `req` object.

---

## 1. General Principles

`+save_flow` does not accept natural language or vague business descriptions directly. It accepts a **flow canvas request whose `req.operation` drives a three-step lifecycle**:

```text
build  ──► status = ready_to_preview ──► preview ──► commit ──► flowUuid
   │                                                              │
   └──► status = need_input ──► (answer slot, build again)        └──► +flow_detail (verify)
```

You still organize user requirements into an intermediate intent first, then map the intent to `nodes` / `edges`, then run the lifecycle.

- `build`: assemble/edit a draft from `nodes` + `edges` (or `dsl`, or clone). Returns `ready_to_preview` (with `draftId`, `draftVersion`, `confirmToken`, `preview.mainPath`) or `need_input` (one more slot required).
- `preview`: validate the draft; **re-issues** a fresh `draftVersion` + `confirmToken`.
- `commit`: finalize the draft into a flow version using the **preview** `draftVersion` + `confirmToken`; returns the final `flowUuid`.
- Always verify with `ae-cli engage +flow_detail --project_id <projectId> --flow_uuid <flowUuid>`.

---

## 2. Workflow

1. Identify the flow intent from the user input and produce a unified intent JSON.
2. Run `ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition` to obtain the condition cluster definition schema for assembling condition-related fields later.
3. Run `ae-cli engage +channel_list --project_id <projectId>` to get the available channels and match real `channelId` values for touchpoint nodes. For `webhook_push`, also run `ae-cli engage +channel_detail` and use `data.config.paramsList` to build `contentList`.
4. Map the intent JSON to `nodes` and `edges` (compact form, see §7 / §8).
5. `build` → resolve any `need_input` slot → `preview` → `commit`, then verify with `+flow_detail`.

---

## 3. `req` Schema (authoritative)

`req` accepts these fields (only `operation` is hard-required):

| Field | Type | Used in | Notes |
|---|---|---|---|
| `operation` | string | all | **Required.** `build` \| `preview` \| `commit` |
| `flowName` | string | build | Flow name. If it is the only content, returns a `need_input` draft with no default nodes |
| `flowDesc` | string | build | Flow description, **max 200 characters** |
| `groupId` | int | build | Flow group ID, default `0` |
| `tzOffset` | number | build | Timezone offset in hours; defaults to server setting |
| `versionType` | int | build | `1=current, 2=update, 3=new, 4=test` |
| `nodes` | array | build | Compact nodes for structured build (see §7) |
| `edges` | array | build | Compact edges for structured build (see §8) |
| `dsl` | string | build | Topology-only: lines `node <id> <type>` and `edge <source> -> <target>` |
| `sourceFlowUuid` | string | build | Clone an existing flow into a new draft |
| `flowUuid` | string | build | Draft flow UUID for update-draft mode |
| `parentFlowUuid` | string | build | Base version flow UUID for new-version mode |
| `userIntent` | string | build | Natural-language intent (optional) |
| `nodeConfigs` | array | build (edit) | Declarative node config replacements; each item needs `nodeId` + `config` |
| `deleteNodeIds` | array | build (edit) | Node IDs to delete from the draft |
| `deleteEdges` | array | build (edit) | Edges to delete (by `edgeId` or `source`+`target`) |
| `slotAnswer` | object | build (continue) | Answer for the current server-requested slot when status is `need_input` |
| `draftId` | string | preview, commit, build(continue) | Server draft ID returned by `build` |
| `expectedVersion` | int | preview, build(edit) | Expected draft version for editing or preview |
| `draftVersion` | int | commit | Draft version returned by `preview` |
| `confirmToken` | string | commit | Opaque token returned by **preview** (not build) |

`flowUuid` and `parentFlowUuid` are mutually exclusive; when creating a brand-new draft, provide neither.

### Compact node (`nodes[]`)

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Request-local node ID, unique within the request |
| `type` | Yes | Flow node type (see §7.2) |
| `config` | No | Full node business config — JSON object or JSON string |
| `name` | No | Display name |
| `desc` | No | Node description |

### Compact edge (`edges[]`)

| Field | Required | Description |
|---|---|---|
| `source` | Yes | Upstream node ID |
| `target` | Yes | Downstream node ID |
| `edgeId` | No | Edge ID, unique within the canvas |
| `sourceBranchId` | No | Branch ID for edges leaving a split/judge node |
| `config` | No | Edge business config as JSON string |

---

## 4. Step One: Intent Identification

### 4.1 Information That Must Be Confirmed First

Before building, confirm at least these four categories:

| Item | Description |
|---|---|
| business scenario | new-user activation, churn win-back, paid conversion, etc. |
| target users | who can enter the flow |
| touchpoint method | Push, WeChat subscription, Webhook, etc. |
| branching conditions | whether grouped handling is needed, and the conditions |

If any is missing, do not build.

### 4.2 Intent Output Format

Organize the user requirement into an intermediate intent JSON (not the final `req`):

```json
{
  "flow_type": "<string>",
  "flow_name": "<string>",
  "flow_desc": "<string>",
  "entry": {
    "type": "<single_trigger|repeat_trigger|event_trigger>",
    "segment": "<string|null>",
    "schedule": "<string|null>",
    "start_date": "<YYYY-MM-DD|YYYY-MM-DD HH:mm|null>",
    "end_date": "<YYYY-MM-DD|YYYY-MM-DD HH:mm|null>",
    "trigger_event": { "event": "<string|null>", "op": "<string|null>", "count": "<number|null>", "property_filter": "<object|null>", "time_window": "<string|null>" }
  },
  "nodes": [
    {
      "nid": "n1",
      "node_type": "<split|judge|action|wait|end>",
      "type": "<specific semantic node type>",
      "name": "<string|null>",
      "content": "<string|null>",
      "channel_name": "<string|null>",
      "languages": ["default"],
      "condition": "<object|null>",
      "event": "<object|null>",
      "wait_time": "<string|null>",
      "split_flow_type": "<1|2|null>",
      "branches": [ { "bid": "b1", "label": "<string>", "condition": "<object|null>", "time_limit": "<string|null>", "percentage": "<number|null>" } ]
    }
  ],
  "edges": [ { "source": "n1", "target": "n2", "branch": "<branch label|null>" } ]
}
```

`channel_name` stays semantic here; match it to a real `channelId` later. `branches` later materialize into `node.config.branchList` and `edge.sourceBranchId`.

---

## 5. Step Two: Required CLI Queries

### 5.1 Cluster Definition Schema

```bash
ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition
```

Provides the basis for `targetClusterQp` and `triggerRule.events`.

### 5.2 Project Channels

```bash
ae-cli engage +channel_list --project_id <projectId>
```

Match a real `channelId` for touchpoint nodes (priority: exact name match → keyword match → fallback by node/channel type). For `webhook_push`, also call `ae-cli engage +channel_detail` and drive `contentList` from `data.config.paramsList`.

**The channel must be enabled.** A node referencing a disabled channel (`channelStatus = 2`) fails with `disabled_channel: channelId must reference an enabled channel`, and `build` stalls on a `need_input` channel slot. Enable it first via `ae-cli engage +update_channel_status --status 1` (write op — requires explicit user intent).

---

## 6. Step Three: Map Intent Nodes to Canvas Nodes

### 6.1 Entry Node Mapping

| Intent `entry.type` | Canvas node `type` |
|---|---|
| `single_trigger` | `single_trigger` |
| `repeat_trigger` | `repeat_trigger` |
| `event_trigger` | `event_trigger` |

There must be exactly one entry node.

### 6.2 Business Node Mapping

| Intent semantics | Canvas node `type` |
|---|---|
| Behavioral split | `event_split_flow` |
| Feature split | `feature_split_flow` |
| A/B split | `ab_split_flow` |
| Behavioral judgment | `event_judge` |
| Feature judgment | `feature_judge` |
| Push touchpoint | `message_push` |
| WeChat touchpoint | `wechat_push` |
| Webhook / external touchpoint | `webhook_push` |
| Wait | `time_control` |
| End | `exit_flow` |

### 6.3 Condition Field Mapping

| Semantic type | Target field |
|---|---|
| Audience segmentation / feature judgment / feature split branch | `targetClusterQp` |
| Event trigger / behavioral judgment / behavioral split branch | `triggerRule[].events[]` |

### 6.4 Touchpoint Node Mapping

Inside action nodes: `channel_name` → real `channelId`; `content` → `contentList`; `languages` → whether to generate multilingual `contentList` entries.

---

## 7. Step Four: Build `nodes`

### 7.1 Most Important Rules

1. `node.id` must be unique within the request.
2. Any `branchId` later referenced by `edge.sourceBranchId` must be declared in that node's `config` first.
3. Every path must eventually end at `exit_flow`.
4. `config` may be a JSON object or a JSON string. (`targetClusterQp` inside it is usually a `JSON.stringify`'d string — see §9.)

### 7.2 Common Node Types

`single_trigger`, `repeat_trigger`, `event_trigger`, `event_split_flow`, `feature_split_flow`, `ab_split_flow`, `event_judge`, `feature_judge`, `message_push`, `wechat_push`, `webhook_push`, `time_control`, `exit_flow`.

### 7.3 Common `config` Templates

#### `repeat_trigger`

```json
{ "targetUserType": 1, "startDate": "<YYYY-MM-DD>", "endDate": "<YYYY-MM-DD>", "flowEndDate": "<YYYY-MM-DD HH:mm>", "crontab": "0 00 09 * * ?", "entryControlLimits": { "enableMultEntry": false, "disableConcurrentEntry": false }, "targetClusterName": null, "clusterPredictCount": null, "clusterPredictTime": "<YYYY-MM-DD HH:mm:ss>", "targetClusterQp": "<JSON.stringify(qp)>" }
```

`entry.segment` → `targetClusterQp`; `entry.schedule` → `crontab` (common default `0 00 09 * * ?`).

#### `event_trigger`

```json
{ "triggerType": 3, "targetUserType": 1, "realtime": 0, "clusterRefresh": 12, "clusterRefreshTime": null, "startDate": "<YYYY-MM-DD HH:mm>", "endDate": "<YYYY-MM-DD HH:mm>", "flowEndDate": "<YYYY-MM-DD HH:mm>", "clusterPredictCount": null, "clusterPredictTime": "<YYYY-MM-DD HH:mm:ss>", "triggerRule": [ { "periodStart": "<startDate>", "periodEnd": "<endDate>", "periodTimeSymbol": "TS02", "dayStartTime": null, "startDay": null, "eventTriggerType": 0, "zoneoffset": 8, "events": [] } ], "entryControlLimits": { "enableMultEntry": false, "disableConcurrentEntry": false }, "targetClusterQp": "<JSON.stringify(qp) or null>" }
```

`entry.trigger_event` → `triggerRule[0].events`; generate `targetClusterQp` only when `entry.segment` exists.

#### `event_split_flow`

```json
{ "splitFlowType": 1, "branchList": [ { "branchId": "<branchId>", "branchName": "<label>", "branchType": 1, "triggerRule": [ { "delayTimeSymbol": "<minute|hour|day>", "delayTime": "<number>", "eventTriggerType": "<0 or -1>", "zoneoffset": 8, "events": [] } ] } ] }
```

`time_limit` → `delayTimeSymbol` + `delayTime`; `0` = happened, `-1` = not happened. Fallback branch keeps only `{ "branchId": "<branchId>", "branchType": 2 }`.

#### `feature_split_flow`

```json
{ "splitFlowType": 1, "branchList": [ { "branchId": "<branchId>", "branchName": "<label>", "branchType": 1, "realtime": 0, "clusterRefresh": 12, "clusterPredictCount": null, "clusterPredictTime": "<YYYY-MM-DD HH:mm:ss>", "targetClusterQp": "<JSON.stringify(qp)>" } ] }
```

Fallback branch keeps only `branchId` + `branchType: 2`.

#### `ab_split_flow`

```json
{ "branchList": [ { "branchId": "<branchId>", "branchName": "Control Group", "branchType": 1, "order": 1, "percentageInExperiment": 34 }, { "branchId": "<branchId>", "branchName": "Experiment Group A", "branchType": 2, "order": 2, "percentageInExperiment": 33 } ], "indicatorsDef": [], "activateIndicatorsDef": null }
```

#### `event_judge`

```json
{ "transferType": 1, "meetBranchId": "<meetBranchId>", "notMeetBranchId": "<notMeetBranchId>", "triggerRule": [ { "delayTimeSymbol": "<minute|hour|day>", "delayTime": "<number>", "eventTriggerType": 0, "zoneoffset": 8, "events": [] } ] }
```

`wait_time` → `delayTimeSymbol` + `delayTime` (default `30 minute` if unspecified).

#### `feature_judge`

```json
{ "transferType": 1, "meetBranchId": "<meetBranchId>", "notMeetBranchId": "<notMeetBranchId>", "clusterPredictCount": null, "clusterPredictTime": "", "targetClusterQp": "<JSON.stringify(qp)>" }
```

#### `message_push` / `webhook_push`

```json
{ "channelId": "<matched channelId>", "channelType": "<matched channelType>", "enableChannelTouchLimits": false, "isOccasionUp": false, "contentList": [ { "pushLanguageCode": "default", "content": [] } ], "processType": 1 }
```

`channel_name` → real `channelId`; `content` → the param that best matches body text. When the param `type = TEXT`, also add `{ "config": "[{\"type\":\"paragraph\",\"children\":[{\"text\":\"<same as value>\"}]}]" }`. First `contentList` entry must use `"pushLanguageCode": "default"`; generate extra languages per `languages`.

#### `wechat_push`

```json
{ "channelId": "<matched channelId>", "enableChannelTouchLimits": false, "isOccasionUp": false, "contentList": [ { "pushLanguageCode": "default", "content": [ { "key": "lang", "type": "STRING", "required": true, "paramType": 2, "name": "Language", "value": "default" }, { "key": "page", "type": "STRING", "required": true, "paramType": 2, "name": "Destination Page", "value": "" }, { "key": "miniprogramState", "type": "STRING", "required": true, "paramType": 2, "name": "Version", "value": "" } ] } ], "processType": 1 }
```

#### `time_control`

```json
{ "controlType": 1, "timeUnit": "<minute|hour|day>", "timeUnitNum": "<number>" }
```

`30 minutes` → `minute`+`30`; `2 hours` → `hour`+`2`; `1 day` → `day`+`1`.

#### `exit_flow`

Minimum usable `config`: `{}`.

---

## 8. Step Five: Build `edges`

### 8.1 Regular Edge

```json
{ "source": "node_1", "target": "node_2" }
```

### 8.2 Branch Edge

```json
{ "source": "node_split", "target": "node_a", "sourceBranchId": "branch_a" }
```

### 8.3 Standard Outgoing-Edge Rules

| node type | Outgoing edges | `sourceBranchId` |
|---|---|---|
| `single_trigger` / `repeat_trigger` / `event_trigger` | 1 | do not provide |
| `event_split_flow` / `feature_split_flow` / `ab_split_flow` | one per branch | the corresponding `branchList[].branchId` |
| `event_judge` / `feature_judge` | 2 | `meetBranchId` and `notMeetBranchId` |
| `message_push` / `wechat_push` / `webhook_push` / `time_control` | 1 | do not provide |
| `exit_flow` | 0 | do not provide |

### 8.4 Rules

1. `source` / `target` must reference existing `node.id` values.
2. Only edges leaving split/judge nodes carry `sourceBranchId`, and it must be a `branchId` already declared in the upstream node `config`.
3. The graph must be a DAG (no cycles).

---

## 9. QP Validation Rules (high-frequency pitfalls)

When a node config carries a QP (`targetClusterQp`, `triggerRule[].events[]`, etc.), the v2 backend validates it strictly:

1. **`relation` must be integer `0` or `1`** — not the string `"0"`/`"1"`. Applies to `totalCFilter.relation`, `eventCondition.relation`, `filts[].relation`. Error: `invalid_qp_relation: QP relation must be number 0 or 1`.
2. **`userCondition` leaves must include `columnType` and `columnDesc`** — `columnName`/`selectType`/`tableType`/`calcuSymbol`/`ftv` alone is not enough. Error: `invalid_qp_leaf: QP property leaf must contain columnType/columnDesc`. (Even legacy stored QPs that omit these now fail.)
3. **`taPropQuota` must include `quotaDesc`, `quota`, `analysisParams`** — giving only `analysis`/`analysisDesc` fails with `required_by_minimal_valid`. Minimal passing shape: `{ "analysis": ..., "analysisDesc": ..., "quota": "", "quotaDesc": "", "analysisParams": "" }`. Applies to both `triggerRule.events[].taPropQuota` and the entry node's `eventCondition.taPropQuota`.

`targetClusterQp` is usually a `JSON.stringify`'d string, e.g. `{ "targetClusterQp": "{\"totalCFilter\":{\"relation\":1,\"filts\":[]}}" }`.

### 9.1 Operator codes (`uceCalcuSymbol` / `calcuSymbol`)

Condition leaves use string operator codes, not literal operators:

| Code | Meaning | Value type |
|---|---|---|
| `C00` | equals | all |
| `C01` | not equals | all |
| `C02` / `C020` | less than / less than or equal | number |
| `C03` / `C030` | greater than / greater than or equal | number |
| `C04` / `C05` | has value / no value | all |
| `C06` / `C060` | range / date range | number / date |
| `C07` / `C08` | contains / does not contain | string |
| `C09` / `C10` | true / false | bool |
| `C11` / `C12` | regex match / not match | string |

### 9.2 Event-count condition (`A200`) — `invalid_preset_count_expression`

For an event condition that counts occurrences with an **empty `taPropQuota`** (analysis `A200`, the default "count" case), the backend treats it as a *preset count* and is strict:

- `uceCalcuSymbol` **must be `C030`** (greater-than-or-equal), and
- `num` **must be `"1"`** (string).

Any other operator/number with an empty quota fails with `invalid_preset_count_expression: A200 empty quota means preset count and must use C030 with num=1`.

A working event-condition leaf (used inside `triggerRule[].events[]` for `event_judge` / `event_trigger` / `event_split_flow`):

```json
{
  "conditionType": "event",
  "eventCondition": {
    "eventName": "ta@active_user",
    "eventDesc": "用户活跃",
    "eventType": "event",
    "uceCalcuSymbol": "C030",
    "num": "1",
    "taPropQuota": { "analysis": "A200", "analysisDesc": "次数", "quota": "", "quotaDesc": "", "analysisParams": "" },
    "recentDay": "0-30",
    "startTime": "",
    "endTime": "",
    "filts": [],
    "relation": 1
  }
}
```

Wrap the leaves with `{ "totalCFilter": { "filts": [ ... ], "relation": 1 } }`, then `JSON.stringify` for `targetClusterQp`.

---

## 10. Step Six: Graph Constraint Checks

Before `preview`/`commit`, self-check:

1. `nodes` is not empty; exactly one entry node; at least one `exit_flow`.
2. Each `exit_flow` has exactly one incoming edge and no outgoing edges.
3. Each `node.id` is unique; every edge references existing nodes; the graph is acyclic.
4. **Every terminal branch must use its own dedicated `exit_flow` node** — do not let multiple upstream nodes point at one shared `exit_flow`. A flow with N terminal paths needs N separate `exit_flow` nodes (otherwise the backend rejects the shared exit). Error: `... branch must use its own dedicated exit ...`.
5. If a split node uses `splitFlowType = 2`, different branches must not converge into the same node; each branch leads to its own `exit_flow`.

---

## 11. Step Seven: Run the Lifecycle (CLI)

### 11.1 Flags

| Flag | Type | Required | Description |
|---|---|---|---|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--req` | json | Yes | operation-based request object |

The CLI injects `projectId` into both the top level and `req`; you do not write `req.projectId` yourself.

### 11.2 `need_input` Continuation

`need_input` is a **soft prompt**, not a hard error:

- **`errors` empty + `nextSlot` present** → server needs one more node config (trigger / channel / targetCluster). Answer with `operation=build` + `draftId` + `expectedVersion` + `slotAnswer`. If `nextSlot.targetNodeId` is present, `slotAnswer.nodeConfig` may contain only `config`; otherwise include `nodeId` or `id`.
- **`errors` non-empty** → hard validation failure. Fix `nodes`/`edges` and `build` again (a new `draftId` is issued; the stale draft is cleaned by TTL).

### 11.3 Minimal Working Example

```bash
# 1) build
ae-cli engage +save_flow --project_id 1 --req '{
  "operation": "build",
  "flowName": "Welcome Flow",
  "flowDesc": "New user welcome flow",
  "groupId": 0, "tzOffset": 8, "versionType": 1,
  "nodes": [
    { "id": "n1", "type": "single_trigger", "name": "Enter", "config": {} },
    { "id": "n2", "type": "exit_flow", "name": "End", "config": {} }
  ],
  "edges": [ { "source": "n1", "target": "n2" } ]
}'
# → status = ready_to_preview, draftId = D, draftVersion = V0, confirmToken = T0

# 2) preview (re-issues draftVersion V1 + confirmToken T1)
ae-cli engage +save_flow --project_id 1 --req '{ "operation": "preview", "draftId": "D", "expectedVersion": 0 }'

# 3) commit (use the preview draftVersion + confirmToken)
ae-cli engage +save_flow --project_id 1 --req '{ "operation": "commit", "draftId": "D", "draftVersion": 1, "confirmToken": "T1" }'
# → status = committed, result = flowUuid

# 4) verify
ae-cli engage +flow_detail --project_id 1 --flow_uuid <flowUuid>
```

> ⚠️ `commit` must use the `draftVersion` **and** `confirmToken` returned by **preview**, not by build. Build's values cause a token/version mismatch.

### 11.4 Output After Successful Commit

The committed flow has `status = 0` (draft) — `commit` only freezes the draft into a flow version, it does **not** start delivery. To actually run it, enable it separately via `ae-cli engage +manage_flow` (with explicit user intent).

Show the user the canvas name and a **clickable Markdown link**:

- Standard Markdown link syntax, not inside a code block.
- URL starts with `/#/`, no domain prefix.
- Substitute the real `flowUuid` and `projectId`.

Template: `[Open Canvas](/#/hermes/flow/detail?flowUuid=<flowUuid>&currentProjectId=<projectId>)`

Correct example: `[Open Canvas](/#/hermes/flow/detail?flowUuid=0006_831135755&currentProjectId=1)`

Common mistakes: adding a domain placeholder; putting the link inside a code block; outputting a plain-text URL instead of `[text](URL)`.

### 11.5 Output After Failure

Output the complete `req` JSON for debugging plus a clear failure reason.

---

## 12. Common Validation Errors

| Symptom | Cause | Fix |
|---|---|---|
| `Unsupported save_flow operation: null` | Legacy `nodeList`/`edgeList` payload, or `operation` missing | Put `operation` = `build`/`preview`/`commit` in `req`, use `nodes`/`edges` |
| operation rejected (`SAVE`/`DRAFT`/`SUBMIT`/`mode`/`action`…) | Wrong field or wrong enum | `operation` is at `req.operation`; enum is only `build`/`preview`/`commit` |
| `invalid_qp_relation: QP relation must be number 0 or 1` | `relation` sent as string | Use integer `0`/`1` |
| `invalid_qp_leaf: QP property leaf must contain columnType/columnDesc` | userCondition leaf missing fields | Add `columnType` + `columnDesc` |
| `required_by_minimal_valid` | `taPropQuota` missing fields | Add `quotaDesc` + `quota` + `analysisParams` |
| `invalid_preset_count_expression` | Event count condition (`A200`) with empty quota uses wrong operator/num | Use `uceCalcuSymbol = C030` + `num = "1"` (see §9.2) |
| `... branch must use its own dedicated exit ...` | Multiple paths share one `exit_flow` | Give every terminal branch its own `exit_flow` node (see §10.4) |
| `disabled_channel: channelId must reference an enabled channel` | Channel status = 2 | `+update_channel_status --status 1` first |
| commit token/version mismatch | Used build's `confirmToken`/`draftVersion` | Use the values returned by **preview** |
| `flowDesc` rejected | Over 200 chars | Trim to ≤ 200 |
| `config` rejected as object where string expected | Wrong shape for `targetClusterQp` / TEXT rich-text | `JSON.stringify` those inner values |

---

## 13. Most Common Mistakes

1. **Legacy `nodeList`/`edgeList`** — use `nodes`/`edges` with `operation=build`.
2. **Time units must be lowercase** — `day`, `hour`, `minute`, `week`, `month` (not `DAY`/`HOUR`).
3. **Do not invent `channelId`** — get it from `ae-cli engage +channel_list`.
4. **Define branch IDs before referencing them** — `edge.sourceBranchId` must already exist in the upstream node `config`.
5. **`targetClusterQp` is usually a string** — `JSON.stringify` the QP object.
6. **TEXT rich-text `config` must also be a string** — not an object.
7. **`commit` uses preview's token/version** — not build's.
8. **Do not merge branches again when `splitFlowType = 2`**.

---

## 14. One-Sentence Summary

Drive `+save_flow` as a state machine — `build` (`nodes`/`edges`, not `nodeList`/`edgeList`) → resolve any `need_input` slots → `preview` (take its fresh `draftVersion` + `confirmToken`) → `commit` → verify with `+flow_detail`; keep QP `relation` integer, fill `columnType`/`columnDesc` on userCondition leaves and `quotaDesc`/`quota`/`analysisParams` on `taPropQuota`, and ensure touchpoint channels are enabled before referencing them.
