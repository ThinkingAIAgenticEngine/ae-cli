# ae-cli `engage-flow flow save`

Create, edit, preview, or commit a flow canvas draft.

Mapped command: `ae-cli engage-flow flow save --project-id <projectId> --req '<req-json>'`

> **Protocol v2 (current).** `save_flow` is now **operation-based**. The `--req` object must carry an `operation` of `build`, `preview`, or `commit`. Do **not** use the old `nodeList` / `edgeList` field names -- send `nodes` / `edges` instead. Posting a legacy `nodeList`/`edgeList` payload (or omitting `operation`) makes the backend reject the call with `Unsupported save_flow operation: null`.

The outer Capability input uses `project_id` and `req`; fields inside `req` keep the native camelCase DTO shape documented below. Hermes uses the outer `--project-id` as authoritative. The CLI rejects missing/unsupported `operation` values, legacy `nodeList`/`edgeList` fields, and the removed `sourceFlowUuid` clone mode; otherwise it passes `req` through to Hermes.

---

## 1. General Principles

`engage-flow flow save` does not accept natural language or vague business descriptions directly. It accepts a **flow canvas request whose `req.operation` drives a three-step lifecycle**:

```text
build  ──► status = ready_to_preview ──► preview ──► commit ──► flow_uuid
   │                                                              │
   └──► status = need_input ──► (answer slot, build again)        └──► engage-flow flow get (verify)
```

You still organize user requirements into an intermediate intent first, then map the intent to `nodes` / `edges`, then run the lifecycle.

- `build`: assemble/edit a draft from `nodes` + `edges` (or topology-only `dsl`). `data.result` returns `ready_to_preview` with `draft_id`, `draft_version`, `confirm_token`, and `preview.main_path`, or `need_input` with one more slot required.
- `preview`: validate the draft; **re-issues** fresh `data.result.draft_version` and `data.result.confirm_token` values.
- `commit`: finalize the draft using preview's returned values, mapped back to request fields `draftVersion` and `confirmToken`; the final ID is `data.result.result.flow_uuid`.
- Always verify with `ae-cli engage-flow flow get --project-id <projectId> --flow-uuid <flow_uuid>`.
- To copy an existing flow, first call `engage-flow flow get`, convert `data.flow.node_list` / `data.flow.edge_list` into compact request fields `nodes` / `edges`, then call `operation=build` as normal creation input. Do not pass `sourceFlowUuid`.

---

## 2. Workflow

1. Identify the flow intent from the user input and produce a unified intent JSON.
2. Build a semantic condition request from `ae-analysis/references/user_cluster_models.md`, create the audience directly with `analysis user-cluster create`, and prefer its `cluster_name`/`clusterKey`. Read the saved server-authored definition with `analysis user-cluster get` only when an Engage node schema explicitly requires QP-derived fields; never assemble raw QP.
3. Run `ae-cli engage-setting channel list --project-id <projectId>` to get the available channels and match real `channel_id` values for touchpoint nodes. For `webhook_push`, also run `ae-cli engage-setting channel get` and use `data.item.config.params_list` to build request field `contentList`.
4. Query `ae-cli engage-flow node-config schema --project-id <project_id> --node-type <type>` before constructing each non-trivial node config, then run `ae-cli engage-flow node-config validate --project-id <project_id> --node-type <type> --operation-mode save_flow --config '<config-json-string>'` before placing the config into `nodes` or `nodeConfigs`.
5. Map the intent JSON to `nodes` and `edges` (compact form, see §7 / §8).
6. `build` → resolve any `need_input` slot → `preview` → `commit`, then verify with `engage-flow flow get`.

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

### Response shape

The Capability envelope is `data.result`, and every key below it is recursively snake_case. When
feeding a returned value into the next `req`, map it back to the camelCase request field shown in §3.
Common response paths include:

| Field | Meaning |
|---|---|
| `data.result.status` | Draft state, such as `need_input`, `ready_to_preview`, `previewed`, or `committed` |
| `data.result.draft_id` / `data.result.draft_version` | Server draft identity and version; use as request `draftId` / `draftVersion` |
| `data.result.selected_mode` | Server-selected authoring mode, such as structured build, wizard, or draft edit |
| `data.result.confidence` / `data.result.reason` | Router confidence and explanation for the selected mode |
| `data.result.next_slot` | One missing slot to answer when `status=need_input`; use as request `slotAnswer` |
| `data.result.preview` | Human-readable preview; use it for user confirmation |
| `data.result.confirm_token` | Token returned by preview; use as request `confirmToken` for commit |
| `data.result.warnings` / `data.result.errors` | Soft warnings and hard validation failures |
| `data.result.supported_operations` | Server-advertised `build`, `preview`, and `commit` contract |
| `data.result.result.flow_uuid` | Final flow UUID after commit |

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
| `sourceBranchId` | No | Branch ID for edges leaving a split/judge node, or a push action node with two branch outgoing edges |
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

### 5.1 Semantic Audience

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

Prefer the created cluster reference. Only when the node schema requires `targetClusterQp` or `triggerRule.events`, copy the corresponding server-authored fields returned by `user-cluster get`.

### 5.2 Project Channels

```bash
ae-cli engage-setting channel list --project-id <projectId>
```

Match a real `channel_id` for touchpoint nodes (priority: exact name match → keyword match → fallback by node/channel type), then place it in request field `channelId`. For `webhook_push`, also call `ae-cli engage-setting channel get` and drive request field `contentList` from `data.item.config.params_list`.

**The channel must be enabled.** A node referencing a disabled channel (`channel_status = 0`) fails with `disabled_channel: channelId must reference an enabled channel`, and `build` stalls on a `need_input` channel slot. Enable it first via `ae-cli engage-setting channel update-status --status 1` (write op — requires explicit user intent).

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
5. The backend normalizes some compatible input forms before validation: leading apostrophes on field names are stripped, property names are matched case-insensitively when unambiguous, `enableChannelTouchLimits` booleans become `1`/`0`, `targetClusterQp` relation strings `"0"`/`"1"` become numeric values inside the JSON string, and `clusterPredictCount: null` becomes `0`.

### 7.2 Common Node Types

`single_trigger`, `repeat_trigger`, `event_trigger`, `event_split_flow`, `feature_split_flow`, `ab_split_flow`, `event_judge`, `feature_judge`, `message_push`, `wechat_push`, `webhook_push`, `time_control`, `exit_flow`.

Before writing any config below, call `engage-flow node-config schema` for the exact node type. The backend schema is the source of truth for required fields, defaults, allowed enum values, submit-time requirements, and examples.

### 7.3 Common `config` Templates

#### `single_trigger`

```json
{ "targetUserType": 2, "triggerTime": "<YYYY-MM-DD HH:mm>", "flowEndDate": "<YYYY-MM-DD HH:mm>", "targetClusterName": "<existing clusterName>" }
```

For custom users, use `targetUserType=1` and fill `targetClusterQp` with the QP JSON string returned by the cluster QP workflow. For existing clusters (`targetUserType=2`), fill `targetClusterName` from a real current-project cluster list queried with the flow `tzOffset`; do not fill `targetClusterQp`. `clusterPredictCount` defaults to `0` and `clusterPredictTime` defaults to `""` when omitted.

#### `repeat_trigger`

```json
{ "targetUserType": 1, "startDate": "<YYYY-MM-DD>", "endDate": "<YYYY-MM-DD>", "flowEndDate": "<YYYY-MM-DD HH:mm>", "crontab": "0 00 09 * * ?", "entryControlLimits": { "enableMultEntry": false, "disableConcurrentEntry": false }, "targetClusterName": null, "targetClusterQp": "<JSON.stringify(qp)>" }
```

`entry.segment` → `targetClusterQp`; `entry.schedule` → `crontab` (common default `0 00 09 * * ?`). `clusterPredictCount` defaults to `0` and `clusterPredictTime` defaults to `""` when omitted. For existing clusters (`targetUserType=2`), fill `targetClusterName` from a real current-project cluster list queried with the flow `tzOffset`; do not fill `targetClusterQp`.

#### `event_trigger`

```json
{ "triggerType": 3, "targetUserType": 1, "startDate": "<YYYY-MM-DD HH:mm>", "endDate": "<YYYY-MM-DD HH:mm>", "flowEndDate": "<YYYY-MM-DD HH:mm>", "triggerRule": [ { "periodStart": "<startDate>", "periodEnd": "<endDate>", "periodTimeSymbol": "TS02", "eventTriggerType": 0, "events": [] } ], "entryControlLimits": { "enableMultEntry": false, "disableConcurrentEntry": false }, "targetClusterQp": "<JSON.stringify(qp) or null>" }
```

`entry.trigger_event` → `triggerRule[0].events`; generate `targetClusterQp` only when `entry.segment` exists. `triggerType` supports `3`, `4`, and `5`; `targetUserType=2` existing cluster is not supported for `event_trigger`; use `1` custom or `3` all users. For non-branch trigger rules, use `periodStart` / `periodEnd` / `periodTimeSymbol`. `realtime`, `clusterRefresh`, `clusterRefreshTime`, `clusterPredictTime`, and `triggerRule[].zoneoffset` can be omitted and are defaulted by the backend.

#### `event_split_flow`

```json
{ "splitFlowType": 1, "branchList": [ { "branchId": "<branchId>", "branchName": "<label>", "branchType": 1, "targetClusterType": 3, "triggerRule": [ { "delayTimeSymbol": "<minute|hour|day>", "delayTime": "<number>", "eventTriggerType": "<0|-1|1|2>", "events": [] } ] } ] }
```

`time_limit` → `delayTimeSymbol` + `delayTime`; `0` = happened, `-1` = not happened. For `branchType=1`, fill `targetClusterType`; use `3` for all users. If `targetClusterType` is not `3`, fill `clusterKey`. `occasionKeys` is optional, but each item must contain at least four colon-separated parts. Fallback branch keeps only `{ "branchId": "<branchId>", "branchType": 2 }` and must omit `triggerRule`.

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
{ "transferType": 1, "meetBranchId": "<meetBranchId>", "notMeetBranchId": "<notMeetBranchId>", "triggerRule": [ { "periodStart": "<YYYY-MM-DD HH:mm>", "periodEnd": "<YYYY-MM-DD HH:mm>", "periodTimeSymbol": "TS02", "eventTriggerType": 0, "events": [] } ] }
```

`event_judge` is a non-branch flow task. Use `periodStart`, `periodEnd`, and `periodTimeSymbol` in the A segment; use `delayTime` / `delayTimeSymbol` only for a B segment when the schema/example requires it. `eventTriggerType` supports `0`, `1`, and `2`.

#### `feature_judge`

```json
{ "transferType": 1, "meetBranchId": "<meetBranchId>", "notMeetBranchId": "<notMeetBranchId>", "clusterPredictCount": null, "clusterPredictTime": "", "targetClusterQp": "<JSON.stringify(qp)>" }
```

#### `message_push` / `webhook_push`

```json
{ "channelId": "<matched channelId>", "channelType": "<matched channelType>", "contentList": [ { "pushLanguageCode": "default", "content": [] } ] }
```

`channel_name` → real response `channel_id` → request `channelId`; `content` → the param that best matches body text. `processType` defaults to `1`, `enableChannelTouchLimits` defaults to `0`, and `isOccasionUp` defaults to `false`. `enableChannelTouchLimits` may be supplied as a boolean for compatibility, but `normalizedConfigObject` will convert it to `1` or `0`. When the param `type = TEXT`, also add `{ "config": "[{\"type\":\"paragraph\",\"children\":[{\"text\":\"<same as value>\"}]}]" }`. `contentList[].content` should be a JSON array; validation also accepts a JSON-stringified array for compatibility. When the param `type = OBJ_ARRAY`, `value` must be a JSON array, and the item must copy the complete child field definition from `data.item.config.params_list[].obj_array`. First `contentList` entry must use `"pushLanguageCode": "default"`; generate extra languages per `languages`.

#### `wechat_push`

```json
{ "channelId": "<matched channelId>", "enableChannelTouchLimits": false, "isOccasionUp": false, "contentList": [ { "pushLanguageCode": "default", "content": [ { "key": "lang", "type": "STRING", "required": true, "paramType": 2, "name": "Language", "value": "default" }, { "key": "page", "type": "STRING", "required": true, "paramType": 2, "name": "Destination Page", "value": "" }, { "key": "miniprogramState", "type": "STRING", "required": true, "paramType": 2, "name": "Version", "value": "" } ] } ], "processType": 1 }
```

#### `time_control`

```json
{ "controlType": 1, "timeUnit": "<minute|hour|day>", "timeUnitNum": "<number>" }
```

`controlType=1` requires `timeUnit` + `timeUnitNum`; `2` requires `timePointStr`; `3` requires `rollTimeDayNum` + `timePointStr`; `4` requires `fixedDay` + `timePointStr`; `5` requires `relativeMonthLastDayNum` + `timePointStr`.

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
| `message_push` / `wechat_push` / `webhook_push` | 1 or 2 | omit for 1 outgoing edge; for 2 outgoing edges, use the node config's `meetBranchId` and `notMeetBranchId` |
| `time_control` | 1 | do not provide |
| `exit_flow` | 0 | do not provide |

### 8.4 Rules

1. `source` / `target` must reference existing `node.id` values.
2. Edges leaving split/judge nodes carry `sourceBranchId`. Push action nodes (`message_push`, `wechat_push`, `webhook_push`) may also carry `sourceBranchId` when they have exactly two outgoing edges.
3. For push action nodes with one outgoing edge, omit `meetBranchId` / `notMeetBranchId`; if present, the backend ignores them.
4. For push action nodes with two outgoing edges, set both `config.meetBranchId` and `config.notMeetBranchId`, and make the two `edge.sourceBranchId` values match them.
5. The graph must be a DAG (no cycles).

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
    "eventDesc": "User active",
    "eventType": "event",
    "uceCalcuSymbol": "C030",
    "num": "1",
    "taPropQuota": { "analysis": "A200", "analysisDesc": "Count", "quota": "", "quotaDesc": "", "analysisParams": "" },
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
| `--project-id` / `-p` | number | Yes | Project ID |
| `--req` | json | Yes | operation-based request object |

The CLI injects `projectId` into both the top level and `req`; you do not write `req.projectId` yourself.

### 11.2 `need_input` Continuation

`need_input` is a **soft prompt**, not a hard error:

- **`data.result.errors` empty + `data.result.next_slot` present** → server needs one more node config (trigger / channel / targetCluster). Answer with request fields `operation=build` + `draftId` + `expectedVersion` + `slotAnswer`. If response `next_slot.target_node_id` is present, request `slotAnswer.nodeConfig` may contain only `config`; otherwise include `nodeId` or `id`.
- **`data.result.errors` non-empty** → hard validation failure. Fix `nodes`/`edges` and `build` again (a new `data.result.draft_id` is issued; the stale draft is cleaned by TTL).

### 11.3 Minimal Working Example

```bash
# 1) build
ae-cli engage-flow flow save --project-id 1 --req '{
  "operation": "build",
  "flowName": "Welcome Flow",
  "flowDesc": "New user welcome flow",
  "groupId": 0, "tzOffset": 8, "versionType": 1,
  "nodes": [
    { "id": "n1", "type": "single_trigger", "name": "Enter", "config": { "targetUserType": 2, "triggerTime": "2026-03-31 19:00", "flowEndDate": "2026-04-04 18:00", "targetClusterName": "cohort_20260331_182643" } },
    { "id": "n2", "type": "exit_flow", "name": "End", "config": {} }
  ],
  "edges": [ { "source": "n1", "target": "n2" } ]
}'
# → data.result: status = ready_to_preview, draft_id = D, draft_version = V0, confirm_token = T0

# 2) preview (response re-issues draft_version V1 + confirm_token T1)
ae-cli engage-flow flow save --project-id 1 --req '{ "operation": "preview", "draftId": "D", "expectedVersion": 0 }'

# 3) commit (map preview draft_version/confirm_token to request draftVersion/confirmToken)
ae-cli engage-flow flow save --project-id 1 --req '{ "operation": "commit", "draftId": "D", "draftVersion": 1, "confirmToken": "T1" }'
# → data.result.status = committed, data.result.result.flow_uuid = <flow_uuid>

# 4) verify
ae-cli engage-flow flow get --project-id 1 --flow-uuid <flow_uuid>
```

> ⚠️ `commit` must map preview's `data.result.draft_version` and `data.result.confirm_token` to request fields `draftVersion` and `confirmToken`. Build's values cause a token/version mismatch.

### 11.4 Output After Successful Commit

The committed flow has `status = 0` (draft) — `commit` only freezes the draft into a flow version, it does **not** start delivery. To actually run it, enable it separately via `ae-cli engage-flow flow manage` (with explicit user intent).

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
| `Flag --req.sourceFlowUuid is no longer supported` | Removed clone mode from an older protocol | Call `engage-flow flow get`, convert `data.flow.node_list`/`data.flow.edge_list` into compact request `nodes`/`edges`, then create with `operation=build` |
| operation rejected (`SAVE`/`DRAFT`/`SUBMIT`/`mode`/`action`…) | Wrong field or wrong enum | `operation` is at `req.operation`; enum is only `build`/`preview`/`commit` |
| `invalid_qp_relation: QP relation must be number 0 or 1` | `relation` sent as string | Use integer `0`/`1` |
| `invalid_qp_leaf: QP property leaf must contain columnType/columnDesc` | userCondition leaf missing fields | Add `columnType` + `columnDesc` |
| `required_by_minimal_valid` | `taPropQuota` missing fields | Add `quotaDesc` + `quota` + `analysisParams` |
| `invalid_preset_count_expression` | Event count condition (`A200`) with empty quota uses wrong operator/num | Use `uceCalcuSymbol = C030` + `num = "1"` (see §9.2) |
| `... branch must use its own dedicated exit ...` | Multiple paths share one `exit_flow` | Give every terminal branch its own `exit_flow` node (see §10.4) |
| `disabled_channel: channelId must reference an enabled channel` | Response `channel_status = 0` | `engage-setting channel update-status --status 1` first |
| commit token/version mismatch | Used build's `confirm_token`/`draft_version` | Use the values returned by **preview** |
| `flowDesc` rejected | Over 200 chars | Trim to ≤ 200 |
| `config` rejected as object where string expected | Wrong shape for `targetClusterQp` / TEXT rich-text | `JSON.stringify` those inner values |

---

## 13. Most Common Mistakes

1. **Legacy `nodeList`/`edgeList`** — use `nodes`/`edges` with `operation=build`.
2. **Removed clone mode** — do not pass `sourceFlowUuid`; copy flows via `engage-flow flow get` and a fresh `operation=build` request.
3. **Time units must be lowercase** — `day`, `hour`, `minute`, `week`, `month` (not `DAY`/`HOUR`).
4. **Do not invent `channelId`** — get it from `ae-cli engage-setting channel list`.
5. **Define branch IDs before referencing them** — `edge.sourceBranchId` must already exist in the upstream node `config`; for two-edge push action nodes, use `meetBranchId` and `notMeetBranchId`.
6. **`targetClusterQp` is usually a string** — `JSON.stringify` the QP object.
7. **TEXT rich-text `config` must also be a string** — not an object.
8. **`commit` uses preview's token/version** — not build's.
9. **Do not merge branches again when `splitFlowType = 2`**.

---

## 14. One-Sentence Summary

Drive `engage-flow flow save` as a state machine — `build` (`nodes`/`edges`, not `nodeList`/`edgeList` or `sourceFlowUuid`) → resolve any `need_input` slots → `preview` (map response `draft_version` + `confirm_token` to request `draftVersion` + `confirmToken`) → `commit` → verify with `engage-flow flow get`; keep QP `relation` integer, fill `columnType`/`columnDesc` on userCondition leaves and `quotaDesc`/`quota`/`analysisParams` on `taPropQuota`, and ensure touchpoint channels are enabled before referencing them.
