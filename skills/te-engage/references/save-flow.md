# te-engage `+save_flow`

Create or update a flow canvas draft.

Mapped command: `ae-cli engage +save_flow`

This document is not only meant to explain the `save_flow` interface itself. It provides a complete path **from user requirements to CLI arguments**:

1. Identify intent first
2. Then map the intent to the flow canvas `req`
3. Finally submit through the CLI

---

## 1. General Principles

`+save_flow` does not accept natural language or vague business descriptions directly. It accepts the **final flow canvas request payload that is ready to submit**.

Therefore, you must first organize user requirements into a unified intermediate intent structure, and then generate the payload according to the mapping rules:

- `flowName`
- `flowDesc`
- `nodeList`
- `edgeList`
- and optional `groupId`、`tzOffset`、`flowUuid`、`parentFlowUuid`、`versionType`

Then call the CLI:

```bash
ae-cli engage +save_flow --project_id <projectId> --req '<req-json>'
```

---

## 2. Workflow

Use the following five-step workflow:

1. Identify the flow intent from the user input and produce a unified intent JSON.
2. Run `ae-cli te_audience +get_cluster_definition_schema --cluster_type condition` to obtain the condition cluster definition schema for assembling condition-related fields later.
3. Run `ae-cli engage +channel_list --project_id <projectId>` to get the available channels in the project and match real `channelId` values for touchpoint nodes.
4. Map the intent JSON to the final `req`: `flowName`, `flowDesc`, `nodeList`, and `edgeList`.
5. Run `ae-cli engage +save_flow --project_id <projectId> --req '<req-json>'` to submit.

---

## 3. Step One: Intent Identification

### 3.1 Information That Must Be Confirmed First

Before generating any `req`, confirm at least these four categories of information:

| Item | Description |
|---|---|
| business scenario | What kind of flow this is, for example new-user activation, churn win-back, or paid conversion |
| target users | Who can enter the flow, for example users inactive for the last 14 days or users registered today |
| touchpoint method | Which channel will be used for outreach, for example Push, WeChat subscription, or Webhook |
| branching conditions | Whether grouped handling is needed; if so, which conditions define the groups |

If any of these four categories is missing, do not build `req` directly.

### 3.2 Intent Output Format

First organize the user requirement into the following intent JSON. This JSON is an intermediate representation, not the final `save_flow.req`.

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
    "trigger_event": {
      "event": "<string|null>",
      "op": "<string|null>",
      "count": "<number|null>",
      "property_filter": "<object|null>",
      "time_window": "<string|null>"
    }
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
      "duration": "<string|null>",
      "split_flow_type": "<1|2|null>",
      "branches": [
        {
          "bid": "b1",
          "label": "<string>",
          "condition": "<object|null>",
          "time_limit": "<string|null>",
          "percentage": "<number|null>"
        }
      ]
    }
  ],
  "edges": [
    {
      "source": "n1",
      "target": "n2",
      "branch": "<branch label|null>"
    }
  ]
}
```

### 3.3 Field Meaning

- `entry`
  Describes how users enter the flow.
- `nodes`
  Describes business-semantic nodes; they are not yet final canvas nodes.
- `edges`
  Describes the connection relationships at the business-semantics level.
- `channel_name`
  Keep it as a semantic field first, then match a real `channelId` from the project channel list later.
- `branches`
  Only describes branch semantics; later it will be materialized into `node.config.branchList` and `edge.sourceBranchId`.

---

## 4. Step Two: Required CLI Queries

### 4.1 Query the Cluster Definition Schema

Run:

```bash
ae-cli te_audience +get_cluster_definition_schema --cluster_type condition
```

Purpose:
- Prepare the basis for building QP for condition nodes, audience nodes, and entry nodes
- Help generate `targetClusterQp`
- Help generate `triggerRule.events`

This step does not return final nodes directly. It provides the rule foundation for expressing conditions as QP or event conditions.

### 4.2 Query Project Channels

Run:

```bash
ae-cli engage +channel_list --project_id <projectId>
```

Purpose:
- Get the available channels in the project
- Match a real `channelId` for touchpoint nodes based on `channel_name` in the intent
- Determine whether the node should be `message_push`, `wechat_push`, or `webhook_push` based on the channel type

If `channel_name` does not have an exact match, use this priority:

1. exact name match
2. name keyword match
3. fallback match by node type and channel type

---

## 5. Step Three: Map the Intent to `req`

### 5.1 Top-Level `req` Structure

The object passed to `--req` should have the following structure:

```json
{
  "flowName": "<string>",
  "flowDesc": "<string>",
  "groupId": 0,
  "tzOffset": 8,
  "flowUuid": "<string, optional>",
  "parentFlowUuid": "<string, optional>",
  "versionType": 1,
  "nodeList": [],
  "edgeList": []
}
```

Notes:
- `projectId` does not need to be written into `--req` manually; the CLI injects it from `--project_id`
- `flowUuid` and `parentFlowUuid` are mutually exclusive
- When creating a new draft, neither of these fields should be provided

### 5.2 Sources of Top-Level Fields

| `req` Field | Source |
|---|---|
| `flowName` | Intent field `flow_name` |
| `flowDesc` | Intent field `flow_desc`; use an empty string or a short description if absent |
| `groupId` | Default `0`, unless the business requirement specifies a group |
| `tzOffset` | User timezone or project default timezone; a common value is `8` |
| `nodeList` | Generated from intent `entry` plus `nodes` |
| `edgeList` | Generated from intent `edges` and branch structure |

---

## 6. Step Four: Map Intent Nodes to Canvas Nodes

### 6.1 Entry Node Mapping

| Intent `entry.type` | Canvas node `type` |
|---|---|
| `single_trigger` | `single_trigger` |
| `repeat_trigger` | `repeat_trigger` |
| `event_trigger` | `event_trigger` |

The entry node must always be the only entry node in `nodeList`.

### 6.2 Business Node Mapping

| Intent-node semantic meaning | Canvas node `type` |
|---|---|
| Behavioral split | `event_split_flow` |
| Feature split | `feature_split_flow` |
| A/B split | `ab_split_flow` |
| Behavioral judgment | `event_judge` |
| Feature judgment | `feature_judge` |
| Push touchpoint | `message_push` |
| WeChat touchpoint | `wechat_push` |
| Webhook / other external touchpoint | `webhook_push` |
| Wait | `time_control` |
| End | `exit_flow` |

### 6.3 Condition Field Mapping

Condition-related semantics cannot be copied into `req` as-is. They must be materialized in the following way:

| Semantic type | Target field |
|---|---|
| Audience segmentation condition | `targetClusterQp` |
| Feature judgment condition | `targetClusterQp` |
| Feature split branch condition | `targetClusterQp` |
| Event trigger condition | `triggerRule[].events[]` |
| Behavioral judgment condition | `triggerRule[].events[]` |
| Behavioral split branch condition | `triggerRule[].events[]` |

In short:
- Conditions that judge by audience or property usually map to `targetClusterQp`
- Conditions that judge whether an event happened, or how many times it happened, usually map to `triggerRule.events`

### 6.4 Touchpoint Node Mapping

These fields inside action-semantic nodes:

- `channel_name`
- `content`
- `languages`

need to be materialized into the push-node `config`:

- `channel_name` -> match to a real `channelId`
- `content` -> place into `contentList`
- `languages` -> determine whether multilingual `contentList` entries should be generated

---

## 7. Step Five: How to Build `nodeList`

Each item in `nodeList` has the following structure:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique node ID within the request |
| `name` | string | Yes | Display name of the node |
| `type` | string | Yes | Node type |
| `config` | string | Yes | **JSON string** whose top level must be a JSON object |
| `desc` | string | No | Node description |

### 7.1 Most Important Rules

1. `config` must be a string, not an object.
2. `node.id` must be unique.
3. Any `branchId` later referenced by `edge.sourceBranchId` in split or judgment nodes must be defined in `config` first.
4. Every path must eventually end at `exit_flow`.

### 7.2 Common Node Types

- `single_trigger`
- `repeat_trigger`
- `event_trigger`
- `event_split_flow`
- `feature_split_flow`
- `ab_split_flow`
- `event_judge`
- `feature_judge`
- `message_push`
- `wechat_push`
- `webhook_push`
- `time_control`
- `exit_flow`

### 7.3 Example: Simplest Node

```json
{
  "id": "node_1",
  "name": "One-Time Scheduled Entry",
  "type": "single_trigger",
  "config": {
    "triggerTime": "2026-04-10 06:35",
    "flowEndDate": "2026-04-11 06:35"
  }
}
```

### 7.4 Common `config` Templates

The templates below are the most important references when you assemble `req` directly. Build them as objects first, then wrap them with `JSON.stringify` before placing them into `nodeList[].config`.

#### `repeat_trigger`

```json
{
  "targetUserType": 1,
  "startDate": "<YYYY-MM-DD>",
  "endDate": "<YYYY-MM-DD>",
  "flowEndDate": "<YYYY-MM-DD HH:mm>",
  "crontab": "0 00 09 * * ?",
  "entryControlLimits": {
    "enableMultEntry": false,
    "disableConcurrentEntry": false
  },
  "targetClusterName": null,
  "clusterPredictCount": null,
  "clusterPredictTime": "<YYYY-MM-DD HH:mm:ss>",
  "targetClusterQp": "<JSON.stringify(qp)>"
}
```

Rules: 
- `entry.segment` -> `targetClusterQp`
- `entry.schedule` -> `crontab`
- Common default value: `0 00 09 * * ?`

#### `event_trigger`

```json
{
  "triggerType": 3,
  "targetUserType": 1,
  "realtime": 0,
  "clusterRefresh": 12,
  "clusterRefreshTime": null,
  "startDate": "<YYYY-MM-DD HH:mm>",
  "endDate": "<YYYY-MM-DD HH:mm>",
  "flowEndDate": "<YYYY-MM-DD HH:mm>",
  "clusterPredictCount": null,
  "clusterPredictTime": "<YYYY-MM-DD HH:mm:ss>",
  "triggerRule": [
    {
      "periodStart": "<startDate>",
      "periodEnd": "<endDate>",
      "periodTimeSymbol": "TS02",
      "dayStartTime": null,
      "startDay": null,
      "eventTriggerType": 0,
      "zoneoffset": 8,
      "events": []
    }
  ],
  "entryControlLimits": {
    "enableMultEntry": false,
    "disableConcurrentEntry": false
  },
  "targetClusterQp": "<JSON.stringify(qp) or null>"
}
```

Rules: 
- `entry.trigger_event` -> `triggerRule[0].events`
- Generate `targetClusterQp` only when `entry.segment` exists
- When `segment` is absent, `targetClusterQp` may be `null`

#### `event_split_flow`

```json
{
  "splitFlowType": 1,
  "branchList": [
    {
      "branchId": "<branchId>",
      "branchName": "<label>",
      "branchType": 1,
      "triggerRule": [
        {
          "delayTimeSymbol": "<minute|hour|day>",
          "delayTime": "<number>",
          "eventTriggerType": "<0 or -1>",
          "zoneoffset": 8,
          "events": []
        }
      ]
    }
  ]
}
```

Rules: 
- When `branch.condition` is an event condition, map it to `triggerRule[].events[]`
- `time_limit` -> `delayTimeSymbol` + `delayTime`
- Use `0` for happened and `-1` for not happened
- For the fallback branch, keep only: 

```json
{
  "branchId": "<branchId>",
  "branchType": 2
}
```

#### `feature_split_flow`

```json
{
  "splitFlowType": 1,
  "branchList": [
    {
      "branchId": "<branchId>",
      "branchName": "<label>",
      "branchType": 1,
      "realtime": 0,
      "clusterRefresh": 12,
      "clusterPredictCount": null,
      "clusterPredictTime": "<YYYY-MM-DD HH:mm:ss>",
      "targetClusterQp": "<JSON.stringify(qp)>"
    }
  ]
}
```

Rules: 
- Property or tag condition -> `targetClusterQp`
- For the fallback branch, also keep only `branchId` plus `branchType: 2`

#### `ab_split_flow`

```json
{
  "branchList": [
    {
      "branchId": "<branchId>",
      "branchName": "Control Group",
      "branchType": 1,
      "order": 1,
      "percentageInExperiment": 34
    },
    {
      "branchId": "<branchId>",
      "branchName": "Experiment Group A",
      "branchType": 2,
      "order": 2,
      "percentageInExperiment": 33
    }
  ],
  "indicatorsDef": [],
  "activateIndicatorsDef": null
}
```

Rules: 
- If the user does not provide percentages, you may split them evenly
- For three groups, you can use `34/33/33`

#### `event_judge`

```json
{
  "transferType": 1,
  "meetBranchId": "<meetBranchId>",
  "notMeetBranchId": "<notMeetBranchId>",
  "triggerRule": [
    {
      "delayTimeSymbol": "<minute|hour|day>",
      "delayTime": "<number>",
      "eventTriggerType": 0,
      "zoneoffset": 8,
      "events": []
    }
  ]
}
```

Rules: 
- `node.event` -> `triggerRule[].events[]`
- `wait_time` -> `delayTimeSymbol` + `delayTime`
- If no wait duration is specified, you may default to `30 minute`

#### `feature_judge`

```json
{
  "transferType": 1,
  "meetBranchId": "<meetBranchId>",
  "notMeetBranchId": "<notMeetBranchId>",
  "clusterPredictCount": null,
  "clusterPredictTime": "",
  "targetClusterQp": "<JSON.stringify(qp)>"
}
```

#### `message_push` / `webhook_push`

```json
{
  "channelId": "<matched channelId>",
  "channelType": "<matched channelType>",
  "enableChannelTouchLimits": false,
  "isOccasionUp": false,
  "contentList": [
    {
      "pushLanguageCode": "default",
      "content": []
    }
  ],
  "processType": 1
}
```

Rules: 
- `channel_name` -> match a real `channelId`
- `content` -> fill the parameter that best matches body text, content, or message
- When the parameter `type = TEXT`, also add: 

```json
{
  "config": "[{\"type\":\"paragraph\",\"children\":[{\"text\":\"<same as value>\"}]}]"
}
```

Multilingual Rules:
- The first entry must always use `"pushLanguageCode": "default"`
- Generate additional language versions according to `languages`
- Each language uses the same `content[]` structure; only `value` changes

#### `wechat_push`

```json
{
  "channelId": "<matched channelId>",
  "enableChannelTouchLimits": false,
  "isOccasionUp": false,
  "contentList": [
    {
      "pushLanguageCode": "default",
      "content": [
        {
          "key": "lang",
          "type": "STRING",
          "required": true,
          "paramType": 2,
          "name": "Language",
          "value": "default"
        },
        {
          "key": "page",
          "type": "STRING",
          "required": true,
          "paramType": 2,
          "name": "Destination Page",
          "value": ""
        },
        {
          "key": "miniprogramState",
          "type": "STRING",
          "required": true,
          "paramType": 2,
          "name": "Version",
          "value": ""
        }
      ]
    }
  ],
  "processType": 1
}
```

#### `time_control`

```json
{
  "controlType": 1,
  "timeUnit": "<minute|hour|day>",
  "timeUnitNum": "<number>"
}
```

Common parsing examples: 
- `30 minutes` -> `minute` + `30`
- `2 hours` -> `hour` + `2`
- `1 day` -> `day` + `1`

#### `exit_flow`

Minimum usable `config`: 

```json
{}
```

---

## 8. Step Six: How to Build `edgeList`

Each item in `edgeList` has the following structure:

| Field | Type | Required | Description |
|---|---|---|---|
| `source` | string | Yes | upstream node ID |
| `target` | string | Yes | downstream node ID |
| `edgeId` | string | No | edge ID |
| `sourceBranchId` | string | No | used for edges leaving split or judgment nodes |
| `config` | string | No | JSON string |

### 8.1 Regular Edges

```json
{
  "source": "node_1",
  "target": "node_2"
}
```

### 8.2 Branch Edges

```json
{
  "source": "node_split",
  "target": "node_a",
  "sourceBranchId": "branch_a"
}
```

### 8.3 Most Important Rules

1. `source` and `target` must reference existing `node.id` values
2. Only edges leaving split or judgment nodes need `sourceBranchId`
3. The graph must be a DAG and cannot contain cycles
4. For split nodes, `sourceBranchId` must come from a branchId already declared in the corresponding node `config`

### 8.4 Standard Outgoing-Edge Rules

| node type | Number of outgoing edges | `sourceBranchId` rule |
|---|---|---|
| `single_trigger` / `repeat_trigger` / `event_trigger` | 1 | do not provide |
| `event_split_flow` / `feature_split_flow` / `ab_split_flow` | one per branch | use the corresponding `branchList[].branchId` |
| `event_judge` / `feature_judge` | 2 | use `meetBranchId` and `notMeetBranchId` respectively |
| `message_push` / `wechat_push` / `webhook_push` / `time_control` | 1 | do not provide |
| `exit_flow` | 0 | do not provide |

---

## 9. Step Seven: Graph Constraint Checks

Before submitting, you must self-check:

1. `nodeList` is not empty
2. There must be exactly one entry node
3. There must be at least one `exit_flow`
4. Each `exit_flow` must have exactly one incoming edge and no outgoing edges
5. Each `node.id` must be unique
6. Every edge must reference existing nodes
7. The entire graph must be acyclic

If a split node uses `splitFlowType = 2`, also ensure:
- Paths from different branches must not converge again into the same node
- Each branch should independently lead to its own `exit_flow`

---

## 10. Step Eight: CLI Submission

### 10.1 Top-Level Flags

| Flag | Type | Required | Description |
|---|---|---|---|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--req` | json | Yes | final request-body object |

### 10.2 Actual CLI Submission Structure

The CLI will organize the input as:

```json
{
  "projectId": 1,
  "req": {
    "projectId": 1,
    "...": "..."
  }
}
```

In other words:
- The top-level `projectId` comes from `--project_id`
- `req.projectId` is also injected automatically by the CLI

### 10.3 Minimum Working Example

```bash
ae-cli engage +save_flow \
  --project_id 1 \
  --req '{
    "flowName": "Welcome Flow",
    "flowDesc": "New user welcome flow",
    "groupId": 0,
    "tzOffset": 8,
    "nodeList": [
      {
        "id": "node_1",
        "name": "Enter Flow",
        "type": "single_trigger",
        "config": "{}"
      },
      {
        "id": "node_2",
        "name": "End",
        "type": "exit_flow",
        "config": "{}"
      }
    ],
    "edgeList": [
      {
        "source": "node_1",
        "target": "node_2"
      }
    ]
  }'
```

### 10.4 Output Requirements After Successful Creation

Prerequisite:
- The flow canvas was created successfully and returned the new canvas `flowUuid`

On success, you must:
- Show the creation result to the user, including at least key information such as the canvas name
- Output a **clickable Markdown link**

Link-generation Rules:
- Use standard Markdown link syntax and do not place it inside a code block
- The URL must start with `/#/`
- Do not add a domain name or any domain placeholder
- Replace the `flowUuid` returned by `save_flow` and the `projectId` used for this creation into the URL

Output template:

[Open Canvas](/#/hermes/flow/detail?flowUuid=<replace-with-actual-flowUuid>&currentProjectId=<replace-with-actual-projectId>)

Correct example:

[Open Canvas](/#/hermes/flow/detail?flowUuid=0006_831135755&currentProjectId=1)

Common mistakes:
- `❌ {domain}/#/hermes/flow/...`: do not add a domain placeholder
- `❌` putting the link inside a code block ````` : links inside code blocks are not clickable
- `❌ /#/hermes/flow/detail?flowUuid=...`: do not output a plain-text URL; you must use the `[text](URL)` format

### 10.5 Output Requirements After Failed Creation

On failure, you must:
- Output the complete request-body JSON for debugging
- Clearly describe the failure reason

Suggested output structure:

```json
{
  "projectId": "<actual projectId>",
  "req": {
    "...": "complete save_flow request body"
  }
}
```

---

## 11. Most Common Mistakes

### 11.1 `--req` Is an Object, but `node.config` / `edge.config` Are Strings

Correct:

```json
{
  "id": "node_1",
  "name": "entry",
  "type": "single_trigger",
  "config": "{}"
}
```

Incorrect:

```json
{
  "id": "node_1",
  "name": "entry",
  "type": "single_trigger",
  "config": {}
}
```

### 11.2 Time Units Must Be Lowercase

Inside `time_control`, use:

- `day`
- `hour`
- `minute`
- `week`
- `month`

Do not write `DAY`, `HOUR`, or `MINUTE`.

### 11.3 Do Not Invent `channelId`

For node types such as `message_push`, `wechat_push`, and `webhook_push`, `channelId` must come from:

```bash
ae-cli engage +channel_list --project_id <projectId>
```

### 11.4 Define branch IDs Before Referencing Them

If an edge uses:

```json
{ "sourceBranchId": "branch_a" }
```

then `"branch_a"` must already exist in the corresponding upstream node `config`.

### 11.5 `targetClusterQp` Is Usually Also a String

Although `targetClusterQp` appears inside the JSON object of node `config`, its value is usually not a raw object. It is typically the QP object converted into a string with `JSON.stringify`.

Illustration:

```json
{ "targetClusterQp": "{\"totalCFilter\":{\"relation\":\"1\",\"filts\":[]}}" }
```

### 11.6 Rich-Text `config` for `TEXT` Parameters Must Also Be a String

If a push parameter uses `TEXT`, the inner rich-text `config` must not be an object. It must be stringified JSON. This is easy to miss.

### 11.7 Do Not Merge Branches Again When `splitFlowType = 2`

"Enter whenever conditions are met" means users may enter multiple branches at the same time. In that case, later paths should not share the same downstream node, otherwise the semantics easily conflict.

---

## 12. One-Sentence Summary

To build `+save_flow` input parameters reliably, do not jump directly from natural language to `req`. Follow this path instead:

**User requirement -> intent JSON -> schema and channel completion -> `nodeList` / `edgeList` -> `ae-cli engage +save_flow`.**
