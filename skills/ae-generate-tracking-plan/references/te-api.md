# AE Backend API (internal reference)

> **Terminology**: 认证 = authentication | Token = bearer token from localStorage `ACCESS_TOKEN` | 端点 = endpoint | 抓包 = traffic capture | 埋点方案 = tracking plan | 上传 = upload | 删除 = delete | 查询 = query/fetch

> This file is the implementation basis for `src/client.ts`, maintained for internal contributors.
> **Skill body should not reference this document** — skill users interact via CLI commands and do not need to know underlying endpoints.
> xlsx format contract is in `xlsx-schema.md`, not here.

Capture environment: `https://web-ta-demo.thinkingdata.cn`. If endpoints change, re-run the
chrome-devtools capture flow from `docs/superpowers/plans/2026-04-15-ae-tracking-skill.md` Task 3.

## 认证

### Token
- localStorage key：`ACCESS_TOKEN`
- 存储形态：**JSON 编码字符串**（带双引号），使用前须 `replace(/^["']|["']$/g, '')`

### 两种传 token 方式（按端点区分）
- **GET/JSON 类接口**：Header `authorization: bearer <token>`（全小写）
- **Excel 上传接口**：**form field `access_token`**，裸 UUID，**不用** Authorization header

## 响应统一包装

```json
{ "return_code": 0, "return_message": "success", "showStackMessage": false, "data": ... }
```
- `return_code === 0` 为成功；非 0 抛错，取 `return_message`
- 某些端点（如 `excel-save` / 空项目 `query`）成功时无 `data`

## 端点

### 1. GET `/v1/ta/bury/manage/program/query`

获取项目唯一的埋点方案。

- Query：`projectId` 必填 number
- Header：`authorization: bearer <token>`
- Response `data` 结构（事件池 / 事件属性池 / 公共属性 / 用户属性）：

```jsonc
{
  "projectId": 1603,
  "events": [
    { "eventName": "...", "displayName": "...", "eventDesc": "...", "eventTag": "...",
      "props": ["prop_name", "parent.child"], "propInfosOnEvent": [{"name":"...","hasReported":false}] }
  ],
  "eventProps": [ { "name": "...", "displayName": "...", "type": "string", "desc": "..." } ],
  "commonEventProps": [ /* 同 eventProps */ ],
  "userProps": [
    { "name": "...", "displayName": "...", "type": "datetime",
      "propTag": "时间类", "updateType": "user_setOnce" }
  ]
}
```

空项目：`data` 不存在，直接 `{ return_code: 0, return_message: "success" }`。

### 2. GET `/v1/ta/bury/manage/program/delete?projectId=<id>`

一次清空整个项目的方案（事件 / 事件属性 / 公共属性 / 用户属性）。

### 3. POST `/v1/ta/bury/manage/program/excel-save`

批量上传 xlsx。

- Content-Type：`multipart/form-data`
- Form fields（全必填）：
  - `file` — xlsx 二进制
  - `projectId` — 文本
  - `access_token` — 文本，裸 UUID
- **无** Authorization header
- Response：`{ return_code: 0, return_message: "success" }`（无 data）

**合并语义**：对事件走 **merge-by-name**（同名不覆盖、新名新增）。若要完全替换，
必须先调 `delete` 端点清空再上传。

## 类型枚举（AE 后端接受值）

### PropType（事件属性 / 公共属性 / 用户属性 `type` 字段）
| canonical | 说明 |
|---|---|
| `string` | 文本 |
| `number` | 数值 |
| `bool` | 布尔 |
| `datetime` | 日期时间 |
| `object` | 对象（单对象，含子属性） |
| `array_row` | 对象数组（允许 `父名.子名` 嵌套子属性） |
| `array_string` | 字符串数组 |

### UpdateType（用户属性 `updateType` 字段）
| canonical | 语义 |
|---|---|
| `user_set` | 覆盖赋值 |
| `user_setOnce` | 仅首次赋值 |
| `user_add` | 数值累加 |

## v2（暂未实现）

- UI「逐个添加」通向单事件 CRUD 接口（`POST /v1/ta/bury/manage/event/*` 族），v1 走 excel-save 统一入口
- 列项目、校验错误响应等见 plan 文档的"未抓端点"清单
