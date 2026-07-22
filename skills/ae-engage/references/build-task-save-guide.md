# ae-cli `engage-task task build-save-guide`

Build a scenario-specific guide for constructing `save_task.req`.

Mapped command: `ae-cli engage-task task build-save-guide`

This is a read-only helper. It does not save tasks, submit approvals, or trigger execution. Its job is to tell you how to build a valid `save_task` request for the current scenario.

---

## 1. Recommended Workflow

Use this sequence when creating or updating a task draft:

1. Query channels with `ae-cli engage-setting channel list --project-id <projectId>`.
2. Call `ae-cli engage-task task build-save-guide --project-id <projectId> --req '{...}'`.
3. If the guide says an audience or QP-derived fields are required, create the audience directly and read it back:

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

4. Build the final grouped `save_task.req`.
5. Submit with `ae-cli engage-task task save --project-id <projectId> --req '{...}'`.

Important:

- Do not treat audience creation as a fixed preflight step.
- Create/read the audience only when the guide indicates that you need to construct:
  - `targetConfig.qp`
  - `triggerConfig.triggerRule`
  - `clientConfig.clientQp`
  - `completionIndicatorDef.event`

---

## 2. CLI Shape

The CLI call shape is:

```bash
ae-cli engage-task task build-save-guide --project-id <projectId> --req '<req-json>'
```

This CLI requires `--req`, but `{}` is valid when you want a generic guide without scenario context.

Common request patterns:

```bash
ae-cli engage-task task build-save-guide --project-id 1 --req '{}'
ae-cli engage-task task build-save-guide --project-id 1 --req '{"context":{"triggerType":2,"channelId":"channel_123"}}'
ae-cli engage-task task build-save-guide --project-id 1 --req '{"draft":{"baseInfo":{"taskName":"Demo Task"}}}'
```

Supported request fields:

- `context`
  - a lightweight scenario selector
  - use it when you know key dimensions such as trigger type, audience type, channel, or experiment mode
- `draft`
  - a partial `save_task` request
  - use it when you already have part of the final payload and want missing fields, examples, or corrections
- `reqDraft`
  - alias of `draft`
- `detailLevel`
  - `brief`: core requirements only
  - `full`: includes enums, unsupported cases, examples, and self-check information

---

## 3. `context` and `draft`

### 3.1 `context`

Use `context` when you want scenario-specific guidance without writing a partial `save_task.req`.

Typical fields:

- `triggerType`
- `targetClusterType`
- `channelType`
- `channelId`
- `channelTemplateId`
- `enableExp`
- `expIndicatorBizType`

Example:

```json
{
  "context": {
    "triggerType": 2,
    "targetClusterType": 2,
    "channelId": "channel_123"
  }
}
```

### 3.2 `draft`

Use `draft` when you already have a partial `save_task.req` and want the guide to tell you:

- what is still missing
- what is invalid
- whether the payload is already close to submit-ready
- what template or schema to use to finish it

Example:

```json
{
  "draft": {
    "baseInfo": {
      "taskName": "Demo Task"
    },
    "triggerConfig": {
      "triggerType": 2
    }
  }
}
```

---

## 4. Output Structure

The guide returns structured metadata rather than free-form prose. The top-level sections are:

- `valid`
- `errors`
- `warnings`
- `missingInputs`
- `saveTaskContract`
- `scenario`
- `requiredInput`
- `fieldRules`
- `handoff`

### 4.1 `valid`

- `true` means the current scenario or draft has no structural blocking errors
- `false` means you should inspect `errors`, `missingInputs`, and `handoff.blockingPlaceholders`

### 4.2 `errors`

Use `errors` for hard blockers such as:

- invalid enum values
- unsupported combinations
- unsupported trigger types

The guide may expose invalid values separately so you can correct them instead of silently dropping them.

### 4.3 `warnings`

Use `warnings` for non-fatal guidance, for example:

- channel content schema is unavailable because no `channelId` was provided
- click-rate experiment setup still needs a channel context

### 4.4 `missingInputs`

Use `missingInputs` as the to-do list for fields you still need before you can submit `save_task`.

Typical examples:

- missing `baseInfo.taskName`
- missing `channelConfig.channelId`
- missing `channelConfig.groupContentList`
- missing `triggerConfig.triggerTime` for scheduled single tasks

### 4.5 `saveTaskContract`

This section describes the high-level contract:

- final tool is `save_task`
- required preflight is `query_channel_list -> build_task_save_guide`
- QP-derived fields require a server-authored audience: direct `analysis user-cluster create`, followed by `analysis user-cluster get`
- `save_task.req` must be a grouped JSON object

### 4.6 `scenario`

This section shows the resolved scenario, such as:

- create vs update draft
- trigger type
- audience type
- channel type / channel id
- whether the scenario is unsupported

### 4.7 `requiredInput`

This section tells you which grouped blocks and fields are required in the current scenario.

Use it to understand what must appear in:

- `baseInfo`
- `channelConfig`
- `targetConfig`
- `triggerConfig`
- `controlConfig`
- `expConfig` when experiment mode is enabled

### 4.8 `fieldRules`

This is the most important construction section.

It includes:

- grouped block rules
- structured conditional rules
- related-parameter rules
- unsupported fields / values / combinations
- `channelContentSchema`
- enum values and wrong examples when `detailLevel=full`

#### `fieldRules.channelContentSchema`

Treat this as the source of truth for channel content construction.

Use it to get:

- valid keys
- expected item shape
- channel-specific examples
- params that must be copied exactly, such as `paramType`

Do not invent free-form content items such as:

```json
[{"text":"hello"}]
```

Instead, use the valid item structure and put message text into `value`.

### 4.9 `handoff`

This is the final section before `save_task`.

Important fields:

- `reqTemplate`
  - a scenario-aware grouped request template
  - use it as a starting point, not as unquestioned final truth
- `readyToSubmit`
  - `true` means the current scenario or draft has no blocking placeholders
- `blockingPlaceholders`
  - unresolved placeholders that still block submission
- `selfCheckList`
  - a final checklist before calling `save_task`
- `successUrlRule`
  - after `save_task` succeeds, build the task detail URL from current page origin plus the relative hash
  - do not hardcode host, IP, or port

---

## 5. How to Use the Guide in Practice

Recommended usage pattern:

1. resolve a real `channelId` with `engage-setting channel list`
2. call `engage-task task build-save-guide`
3. read `fieldRules.channelContentSchema`
4. read `handoff.reqTemplate`
5. fix everything in `blockingPlaceholders`
6. if the guide points to an audience or QP-derived fields, call:

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

7. prefer the created cluster reference; only copy server-authored fields from `user-cluster get` when the guide explicitly requires QP-derived fields
8. call `engage-task task save`

---

## 6. Safety Notes

- `engage-task task build-save-guide` is read-only; it does not save a draft
- do not skip the guide and build `save_task.req` from memory alone
- do not treat the semantic cluster definition builder as mandatory for every task
- do not invent `channelId`, `clusterKey`, content keys, or QP structures
- if the guide exposes an unsupported scenario, correct it before calling `save_task`
