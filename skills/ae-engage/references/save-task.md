# ae-engage `+save_task`

Create or update a Hermes task draft.

Mapped command: `ae-cli engage +save_task`

This command is the final write step. Do not use it as the first step in task construction.

Recommended workflow:

1. `ae-cli engage +channel_list --project_id <projectId>`
2. `ae-cli engage +build_task_save_guide --project_id <projectId> --req '{...}'`
3. If the guide indicates an audience or QP-derived fields are needed, create the audience directly and read it back:

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

4. Build the final grouped `req`
5. `ae-cli engage +save_task --project_id <projectId> --req '{...}'`

Audience creation is not a fixed preflight step. Use direct create/get only when the guide indicates that you must construct:

- `targetConfig.qp`
- `triggerConfig.triggerRule`
- `clientConfig.clientQp`
- `completionIndicatorDef.event`

For the full guide contract, request format, return sections, and handoff usage, read:

- `references/build-task-save-guide.md`

---

## 1. General Principles

`+save_task` accepts only the final grouped draft-save payload that Hermes can validate and persist.

The command supports two modes:

- create mode: omit `req.taskId`
- update mode: include `req.taskId` for an existing draft task

Regardless of mode, this tool only saves a draft:

- it does not submit approval
- it does not start sending
- it does not register or start trigger execution

The CLI call shape is:

```bash
ae-cli engage +save_task --project_id <projectId> --req '<req-json>'
```

Notes:

- `projectId` is injected into top-level `req` by the CLI
- if the caller also passes `req.projectId`, the outer `--project_id` wins
- the whole `req` must be a JSON object, not a stringified JSON string
- for update mode, Hermes only allows modifying draft tasks
- in update mode, omitted fields are backfilled from the existing draft before validation, so partial draft updates are allowed

---

## 2. Required Workflow

### 2.1 Query Real Channels First

Run:

```bash
ae-cli engage +channel_list --project_id <projectId>
```

Purpose:

- get the real project channel list
- resolve the real `channelId`
- confirm the final `channelType`

Never invent a `channelId`.

### 2.2 Build the Scenario Guide

Run:

```bash
ae-cli engage +build_task_save_guide --project_id <projectId> --req '{...}'
```

Use the guide to determine:

- required grouped blocks
- required fields for the current trigger and audience mode
- unsupported combinations
- correct content schema
- current handoff template
- whether the current payload is already close to submit-ready

### 2.3 Create and Read the Audience Only When Needed

If the guide indicates that an audience or QP-derived fields are needed, run:

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

Prefer the returned `cluster_name`/`clusterKey`. Only when required, use the server-authored definition to build:

- `targetConfig.qp`
- `triggerConfig.triggerRule`
- `clientConfig.clientQp`
- `completionIndicatorDef.event`

Do not create an audience by default for every task. It is conditional, not mandatory.

### 2.4 Build Final `req` and Save

Only after the above steps should you construct the final grouped `req` and submit it with `+save_task`.

---

## 3. Final `req` Shape

The final object passed to `--req` should have this grouped shape:

```json
{
  "taskId": "<string, optional>",
  "baseInfo": {},
  "channelConfig": {},
  "targetConfig": {},
  "triggerConfig": {},
  "controlConfig": {},
  "expConfig": {},
  "activityConfig": {},
  "clientConfig": {}
}
```

Top-level notes:

- `taskId` is used only in update mode
- `baseInfo` / `channelConfig` / `targetConfig` / `triggerConfig` / `controlConfig` are the main blocks
- optional blocks should usually be omitted rather than filled with invented values
- use `build_task_save_guide` output as the source of truth for the current scenario

---

## 4. How To Build Major Blocks

### 4.1 `taskId`

Use `taskId` only when you are updating an existing draft task.

- create mode: omit `taskId`
- update mode: include `taskId`
- update mode can send only the fields that need changing
- update mode still fails if the referenced task is not in draft status

### 4.2 `channelConfig`

Core fields:

- `channelType`
- `channelId`
- `groupContentList`
- optional `channelTemplateId`

Rules:

- derive `channelType` and `channelId` from real channel metadata
- do not guess template IDs
- `groupContentList` maximum size is `5`
- `occasionKeys` are parsed from content automatically and are not accepted as input

Content guidance:

- do not invent channel-specific payload structures from memory
- use `fieldRules.channelContentSchema` from `build_task_save_guide`
- take valid keys, expected item shape, and examples from the guide
- when schema fields include `paramType`, copy it exactly
- do not use free-form content items such as `{"text":"..."}` as the primary pattern

### 4.3 `targetConfig`

Use the guide to decide which audience shape applies:

- `targetClusterType=1`: custom audience, requires `qp`
- `targetClusterType=2`: existing cluster, requires `clusterKey`
- `targetClusterType=3`: all users, forbids both `qp` and `clusterKey`

If `qp` is required, create/read a server-authored audience and copy the saved definition rather than building raw QP:

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

### 4.4 `triggerConfig`

Use the guide to determine the current trigger rule set:

- `triggerType=0`: requires `triggerTime`
- `triggerType=1`: requires `startDate`, `endDate`, `triggerCrontab`
- `triggerType=2`: manual, no `triggerRule`
- `triggerType=3/4/5`: requires `triggerRule`

Rules:

- `triggerType=6` is not supported
- use the guide for cron format and wrong-example checks
- if `triggerRule` is needed, copy it from the saved server-authored audience definition:

```bash
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

### 4.5 `controlConfig`

Minimum required field:

- `completionIndicatorDef`

When the guide points to event-based completion or experiment-driven main-goal rules, use the saved server-authored audience definition:

```bash
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

to build `completionIndicatorDef.event`.

Important constraints that still apply:

- `doNotDisturb.enableDoNotDisturb=true` requires `startTime` and `endTime` in `HH:mm`
- `pushDelay.enablePushDelay=true` requires valid `delayType`, and its dependent fields must match the selected mode
- `pushDelay.delayType=1` is only valid for `client_push`
- `pushDelay.delayUnit` must stay within `week`, `day`, `hour`, `minute`, `second`
- `timeoutControl.enableTimeoutControl=true` requires valid `time` and `unit`
- `timeoutControl.unit` must stay within `day`, `hour`, `minute`

### 4.6 `clientConfig`

Use this block only when client-side conditions are needed.

If `clientConfig.clientQp` is required, copy it from the saved server-authored audience definition:

```bash
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

Only call that schema query when the guide explicitly shows that the field is needed.

---

## 5. Final Self-Check Before `+save_task`

Before submission, verify:

1. `channelId` comes from a real channel query.
2. `build_task_save_guide` has already been called for the current scenario or partial draft.
3. `fieldRules.channelContentSchema` was used as the source of truth for content structure.
4. Any required QP-derived fields came from `analysis user-cluster get`, never from hand-built raw QP.
5. `targetClusterType` matches the presence or absence of `clusterKey` / `qp`.
6. `triggerType` matches the provided scheduling or event fields.
7. `completionIndicatorDef` is present and structurally valid for the current scenario.
8. `taskId` is omitted for create mode and present only for updating a draft.
9. No unsupported `triggerType=6` is used.
10. No placeholder IDs or fabricated resource names remain in the request.

---

## 6. Standard Example Flow

Use this style of workflow, rather than jumping directly to `+save_task`:

```bash
ae-cli engage +channel_list --project_id 1
ae-cli engage +build_task_save_guide --project_id 1 --req '{"context":{"triggerType":2,"channelId":"channel_123"}}'
ae-cli engage +save_task --project_id 1 --req '{...final grouped req...}'
```

If the guide indicates an audience or QP-derived fields are needed, insert direct create/get:

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

before building the final `req`.

---

## 7. Safety Constraints

This command is a write operation.

- Do not treat `save_task` as “submit and launch task”
- Do not bypass `build_task_save_guide`
- Do not pass the whole `req` as a JSON string
- Do not use `triggerType=6`
- Do not invent `channelId`, `clusterKey`, audience definitions, or content keys
- Do not use `taskId` for a non-draft task
- Do not pass `occasionKeys`; Hermes derives them from content
- Do not call the semantic cluster definition builder as a reflex; call it only when guide output says QP-derived fields are needed
