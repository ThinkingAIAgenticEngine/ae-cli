# te-engage `+save-flow`

创建或更新流程画布草稿。

映射命令：`te-cli te-engage +save-flow`

这份文档目标不是只解释 `save_flow` 接口本身，而是提供一条**从用户需求到 CLI 入参**的完整路径：

1. 先做意图识别
2. 再把意图映射成流程画布 `req`
3. 最后调用 CLI 提交

---

## 1. 总原则

`+save-flow` 直接接收的不是自然语言，也不是模糊业务描述，而是**最终可提交的流程画布请求体**。

因此，必须先把用户需求整理成一个统一的中间意图结构，再根据映射规则生成：

- `flowName`
- `flowDesc`
- `nodeList`
- `edgeList`
- 以及可选的 `groupId`、`tzOffset`、`flowUuid`、`parentFlowUuid`、`versionType`

最终再用 CLI 调用：

```bash
te-cli te-engage +save-flow --project-id <projectId> --req '<req-json>'
```

---

## 2. 工作流

推荐按下面 5 步执行：

1. 从用户输入中识别流程意图，生成统一的意图 JSON。
2. 调用 `te-cli te_audience +get_cluster_definition_schema --cluster_type condition`，拿到 condition cluster definition schema，用于后续拼装条件相关字段。
3. 调用 `te-cli te-engage +channel-list --project-id <projectId>`，拿到项目下可用通道，为触达节点匹配真实 `channelId`。
4. 将意图 JSON 映射成最终 `req`：`flowName`、`flowDesc`、`nodeList`、`edgeList`。
5. 调用 `te-cli te-engage +save-flow --project-id <projectId> --req '<req-json>'` 提交。

---

## 3. 第一步：意图识别

### 3.1 必须先确认的信息

在生成任何 `req` 之前，至少要确认这 4 类信息：

| 信息 | 说明 |
|---|---|
| 业务场景 | 这是一个什么流程，比如新用户激活、流失召回、付费转化 |
| 目标用户 | 谁能进入流程，比如最近 14 天未登录用户、今日注册用户 |
| 触达方式 | 用什么渠道触达，比如 Push、微信订阅、Webhook |
| 分流条件 | 是否需要分组处理；如果需要，要知道按什么条件分组 |

如果这 4 类信息有缺失，不要直接构建 `req`。

### 3.2 意图识别输出格式

先把用户需求整理成如下意图 JSON。这个 JSON 是中间表示，不是最终 `save_flow.req`。

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
      "type": "<具体节点语义类型>",
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

### 3.3 字段含义

- `entry`
  描述用户如何进入流程。
- `nodes`
  描述业务语义节点，还不是最终画布节点。
- `edges`
  描述业务语义上的连接关系。
- `channel_name`
  先保留为语义字段，后面再去项目通道列表里匹配真实 `channelId`。
- `branches`
  只描述分支语义；后面落地到 `node.config.branchList` 和 `edge.sourceBranchId`。

---

## 4. 第二步：前置 CLI 查询

### 4.1 查询 cluster definition schema

调用：

```bash
te-cli te_audience +get_cluster_definition_schema --cluster_type condition
```

作用：
- 为条件节点、分群节点、入口节点准备 QP 构造依据
- 帮助生成 `targetClusterQp`
- 帮助生成 `triggerRule.events`

这一步不是直接返回最终节点，而是提供“怎样把条件表达成 QP / 事件条件”的规则基础。

### 4.2 查询项目通道

调用：

```bash
te-cli te-engage +channel-list --project-id <projectId>
```

作用：
- 获取项目下可用通道
- 根据意图中的 `channel_name` 为触达节点匹配真实 `channelId`
- 根据通道类型判断是 `message_push`、`wechat_push` 还是 `webhook_push`

如果 `channel_name` 没有精确匹配，应优先：

1. 名称精确匹配
2. 名称关键词匹配
3. 按节点类型兜底匹配通道类型

---

## 5. 第三步：把意图映射成 `req`

### 5.1 `req` 顶层结构

最终传给 `--req` 的对象结构如下：

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

说明：
- `projectId` 不需要手写进 `--req`，CLI 会从 `--project-id` 自动注入
- `flowUuid` 和 `parentFlowUuid` 互斥
- 创建新草稿时，这两个字段都不传

### 5.2 顶层字段来源

| `req` 字段 | 来源 |
|---|---|
| `flowName` | 意图 `flow_name` |
| `flowDesc` | 意图 `flow_desc`，没有就给空串或简短描述 |
| `groupId` | 默认 `0`，除非业务要求指定分组 |
| `tzOffset` | 用户时区或项目默认时区，常见为 `8` |
| `nodeList` | 由意图 `entry` + `nodes` 映射生成 |
| `edgeList` | 由意图 `edges` 和分支结构生成 |

---

## 6. 第四步：意图节点到画布节点的映射

### 6.1 入口节点映射

| 意图 `entry.type` | 画布节点 `type` |
|---|---|
| `single_trigger` | `single_trigger` |
| `repeat_trigger` | `repeat_trigger` |
| `event_trigger` | `event_trigger` |

入口节点始终要成为 `nodeList` 中唯一的入口节点。

### 6.2 业务节点映射

| 意图节点语义 | 画布节点 `type` |
|---|---|
| 行为分流 | `event_split_flow` |
| 特征分流 | `feature_split_flow` |
| A/B 分流 | `ab_split_flow` |
| 行为判断 | `event_judge` |
| 特征判断 | `feature_judge` |
| Push 触达 | `message_push` |
| 微信触达 | `wechat_push` |
| Webhook / 其他外部触达 | `webhook_push` |
| 等待 | `time_control` |
| 结束 | `exit_flow` |

### 6.3 条件字段映射

条件类语义不能直接原样放进 `req`，要按下面方式落地：

| 语义类型 | 目标字段 |
|---|---|
| 受众分群条件 | `targetClusterQp` |
| 特征判断条件 | `targetClusterQp` |
| 特征分流分支条件 | `targetClusterQp` |
| 事件触发条件 | `triggerRule[].events[]` |
| 行为判断条件 | `triggerRule[].events[]` |
| 行为分流分支条件 | `triggerRule[].events[]` |

简单理解：
- “按人群 / 属性判断”的，多数落到 `targetClusterQp`
- “按事件是否发生 / 发生几次判断”的，多数落到 `triggerRule.events`

### 6.4 触达节点映射

动作语义节点里的这些字段：

- `channel_name`
- `content`
- `languages`

需要落地到 push 节点 `config`：

- `channel_name` -> 匹配成真实 `channelId`
- `content` -> 放进 `contentList`
- `languages` -> 决定是否生成多语言 `contentList`

---

## 7. 第五步：`nodeList` 怎么写

`nodeList` 中每一项结构如下：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 请求内唯一节点 ID |
| `name` | string | 是 | 节点显示名 |
| `type` | string | 是 | 节点类型 |
| `config` | string | 是 | **JSON 字符串**，顶层必须是 JSON 对象 |
| `desc` | string | 否 | 节点描述 |

### 7.1 最关键的规则

1. `config` 必须是字符串，不是对象。
2. `node.id` 必须唯一。
3. 分支节点、判断节点里会被 `edge.sourceBranchId` 用到的 branchId，必须先定义在 `config` 里。
4. 所有路径最终都要落到 `exit_flow`。

### 7.2 常见节点类型

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

### 7.3 示例：最简单节点

```json
{
  "id": "node_1",
  "name": "定时单次进入",
  "type": "single_trigger",
  "config": {
    "triggerTime": "2026-04-10 06:35",
    "flowEndDate": "2026-04-11 06:35"
  }
}
```

### 7.4 常用 `config` 模板

下面这些模板是“直接拼 `req`”时最该优先参考的部分。使用时先按对象构造，再整体 `JSON.stringify` 放进 `nodeList[].config`。

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

规则：
- `entry.segment` -> `targetClusterQp`
- `entry.schedule` -> `crontab`
- 常见默认值可用 `0 00 09 * * ?`

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
  "targetClusterQp": "<JSON.stringify(qp) 或 null>"
}
```

规则：
- `entry.trigger_event` -> `triggerRule[0].events`
- `entry.segment` 存在时再生成 `targetClusterQp`
- 没有 `segment` 时，`targetClusterQp` 可为 `null`

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
          "eventTriggerType": "<0 或 -1>",
          "zoneoffset": 8,
          "events": []
        }
      ]
    }
  ]
}
```

规则：
- `branch.condition` 是行为条件时，落到 `triggerRule[].events[]`
- `time_limit` -> `delayTimeSymbol` + `delayTime`
- “发生”用 `0`，“未发生”用 `-1`
- 兜底分支只保留：

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

规则：
- 属性 / 标签条件 -> `targetClusterQp`
- 兜底分支同样只保留 `branchId` + `branchType: 2`

#### `ab_split_flow`

```json
{
  "branchList": [
    {
      "branchId": "<branchId>",
      "branchName": "对照组",
      "branchType": 1,
      "order": 1,
      "percentageInExperiment": 34
    },
    {
      "branchId": "<branchId>",
      "branchName": "实验组 A",
      "branchType": 2,
      "order": 2,
      "percentageInExperiment": 33
    }
  ],
  "indicatorsDef": [],
  "activateIndicatorsDef": null
}
```

规则：
- 用户没给比例时可均分
- 3 组时可用 `34/33/33`

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

规则：
- `node.event` -> `triggerRule[].events[]`
- `wait_time` -> `delayTimeSymbol` + `delayTime`
- 未指定等待时长时，可默认 `30 minute`

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

规则：
- `channel_name` -> 匹配真实 `channelId`
- `content` -> 优先填入最像“正文 / 内容 / 消息”的参数
- 当参数 `type = TEXT` 时，额外补：

```json
{
  "config": "[{\"type\":\"paragraph\",\"children\":[{\"text\":\"<与 value 相同>\"}]}]"
}
```

多语言规则：
- 第一条始终是 `"pushLanguageCode": "default"`
- 后续按 `languages` 生成其他语言版本
- 每种语言的 `content[]` 结构相同，只替换 `value`

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
          "name": "语言",
          "value": "default"
        },
        {
          "key": "page",
          "type": "STRING",
          "required": true,
          "paramType": 2,
          "name": "跳转页面",
          "value": ""
        },
        {
          "key": "miniprogramState",
          "type": "STRING",
          "required": true,
          "paramType": 2,
          "name": "版本",
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

常见解析：
- `30分钟` -> `minute` + `30`
- `2小时` -> `hour` + `2`
- `1天` -> `day` + `1`

#### `exit_flow`

最小可用 `config`：

```json
{}
```

---

## 8. 第六步：`edgeList` 怎么写

`edgeList` 中每一项结构如下：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `source` | string | 是 | 上游节点 ID |
| `target` | string | 是 | 下游节点 ID |
| `edgeId` | string | 否 | 连线 ID |
| `sourceBranchId` | string | 否 | 分支/判断节点出边时使用 |
| `config` | string | 否 | JSON 字符串 |

### 8.1 普通连线

```json
{
  "source": "node_1",
  "target": "node_2"
}
```

### 8.2 分支连线

```json
{
  "source": "node_split",
  "target": "node_a",
  "sourceBranchId": "branch_a"
}
```

### 8.3 最关键的规则

1. `source` 和 `target` 必须引用真实存在的 `node.id`
2. 只有分支节点 / 判断节点的出边才需要 `sourceBranchId`
3. 图必须是 DAG，不能有环
4. 分支节点的 `sourceBranchId` 必须来自对应节点 `config` 里已经声明过的 branchId

### 8.4 标准出边规则

| 节点类型 | 出边数 | `sourceBranchId` 规则 |
|---|---|---|
| `single_trigger` / `repeat_trigger` / `event_trigger` | 1 | 不传 |
| `event_split_flow` / `feature_split_flow` / `ab_split_flow` | 每分支 1 条 | 对应 `branchList[].branchId` |
| `event_judge` / `feature_judge` | 2 | 分别使用 `meetBranchId` / `notMeetBranchId` |
| `message_push` / `wechat_push` / `webhook_push` / `time_control` | 1 | 不传 |
| `exit_flow` | 0 | 不传 |

---

## 9. 第七步：图约束检查

在提交前必须自检：

1. `nodeList` 非空
2. 入口节点必须且只能有一个
3. 至少有一个 `exit_flow`
4. 每个 `exit_flow` 恰好一条入边，且没有出边
5. 每个 `node.id` 唯一
6. 每条边引用的节点都存在
7. 整张图无环

如果分流节点使用 `splitFlowType = 2`，还要额外保证：
- 不同分支后续路径不要再次汇合到同一个节点
- 每条分支应独立走到自己的 `exit_flow`

---

## 10. 第八步：CLI 提交

### 10.1 顶层 flags

| Flag | 类型 | 必填 | 说明 |
|---|---|---|---|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--req` | json | 是 | 最终请求体对象 |

### 10.2 CLI 实际提交结构

CLI 会把输入整理成：

```json
{
  "projectId": 1,
  "req": {
    "projectId": 1,
    "...": "..."
  }
}
```

也就是说：
- 顶层 `projectId` 来自 `--project-id`
- `req.projectId` 也会由 CLI 自动注入

### 10.3 最小可用示例

```bash
te-cli te-engage +save-flow \
  --project-id 1 \
  --req '{
    "flowName": "Welcome Flow",
    "flowDesc": "New user welcome flow",
    "groupId": 0,
    "tzOffset": 8,
    "nodeList": [
      {
        "id": "node_1",
        "name": "进入流程",
        "type": "single_trigger",
        "config": "{}"
      },
      {
        "id": "node_2",
        "name": "结束",
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

### 10.4 创建成功后的输出要求

前置条件：
- 创建流程画布成功，返回了新创建的流程画布 `flowUuid`

成功时必须：
- 向用户展示创建结果，至少包含画布名称等关键信息
- 必须输出一个**可点击的 Markdown 链接**

链接生成规则：
- 使用标准 Markdown 链接语法，禁止放在代码块中
- URL 必须以 `/#/` 开头，禁止添加域名或任何域名占位符
- 将 `save_flow` 返回的 `flowUuid` 和本次创建使用的 `projectId` 替换到 URL 中

输出模板：

[点击查看画布](/#/hermes/flow/detail?flowUuid=<替换为实际flowUuid>&currentProjectId=<替换为实际projectId>)

正确示例：

[点击查看画布](/#/hermes/flow/detail?flowUuid=0006_831135755&currentProjectId=1)

常见错误：
- `❌ {域名}/#/hermes/flow/...`：不要加域名占位符
- `❌` 把链接放在代码块 ````` 中：代码块内的链接不可点击
- `❌ /#/hermes/flow/detail?flowUuid=...`：不要输出纯文本 URL，必须使用 `[文字](URL)` 格式

### 10.5 创建失败后的输出要求

失败时必须：
- 输出完整请求体 JSON，供用户调试
- 明确说明失败原因

建议输出结构：

```json
{
  "projectId": "<实际 projectId>",
  "req": {
    "...": "完整 save_flow 请求体"
  }
}
```

---

## 11. 最容易写错的地方

### 11.1 `--req` 是对象，但 `node.config` / `edge.config` 是字符串

正确：

```json
{
  "id": "node_1",
  "name": "entry",
  "type": "single_trigger",
  "config": "{}"
}
```

错误：

```json
{
  "id": "node_1",
  "name": "entry",
  "type": "single_trigger",
  "config": {}
}
```

### 11.2 时间单位必须小写

像 `time_control` 里，应使用：

- `day`
- `hour`
- `minute`
- `week`
- `month`

不要写成 `DAY`、`HOUR`、`MINUTE`。

### 11.3 不要凭空写 `channelId`

`message_push`、`wechat_push`、`webhook_push` 这类节点的 `channelId`，必须来自：

```bash
te-cli te-engage +channel-list --project-id <projectId>
```

### 11.4 分支 ID 必须先定义再引用

如果某条边用了：

```json
{ "sourceBranchId": "branch_a" }
```

那么 `"branch_a"` 必须已经存在于对应上游节点的 `config` 中。

### 11.5 `targetClusterQp` 本身通常也是字符串

虽然 `targetClusterQp` 出现在节点 `config` 的 JSON 对象里，但它的值通常也不是原始对象，而是 QP 对象再做一次 `JSON.stringify` 后的字符串。

示意：

```json
{ "targetClusterQp": "{\"totalCFilter\":{\"relation\":\"1\",\"filts\":[]}}" }
```

### 11.6 `TEXT` 参数的富文本 `config` 也必须是字符串

push 参数如果是 `TEXT`，它内部那个富文本 `config` 不是对象，而是字符串化 JSON。这个点很容易漏。

### 11.7 `splitFlowType = 2` 时不要让分支重新汇合

“满足条件即进入”表示用户可能同时进入多个分支，这时后续路径不要共用同一个节点，否则语义容易冲突。

---

## 12. 一句话总结

要稳定构建 `+save-flow` 的入参，不能直接从自然语言跳到 `req`，而应该遵循这条链路：

**用户需求 -> 意图 JSON -> schema / 通道补全 -> `nodeList` / `edgeList` -> `te-cli te-engage +save-flow`。**
