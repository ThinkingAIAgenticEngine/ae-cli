---
name: ae-generate-tracking-plan
description: Interactive generation of an AE tracking plan and upload. Trigger words: 埋点方案、埋点模板、tracking plan、AE 方案生成、create tracking plan、トラッキングプラン、트래킹 플랜. Follows anchor → draft → refine → token → upload five-phase workflow. Deliverable is a real tracking plan created in the AE platform.
---

# ae-generate-tracking-plan

> **Conversation language**: This skill document is in English, but **all output to the user MUST be in the user's input language**.
> English input → English reply; Chinese input → Chinese reply; Japanese input → Japanese reply.
> If uncertain, default to English.
> This applies to all output: section titles, phase names, template prompts, example text, option lists, etc.
> **⚠️ CRITICAL: Templates and some reference documents are in Chinese. When working with Chinese templates/material for an English/Japanese user, you MUST translate all user-facing content (display_name, event_desc, event_tag, descriptions, etc.) to the user's language. The source material's language is NOT the user's language. Use the Terminology Glossary above to map terms accurately.**
> Do NOT copy Chinese text verbatim from this document into English/Japanese replies.

## Terminology Glossary

| 中文 | English | Notes |
|------|---------|-------|
| 埋点方案 | Tracking Plan | AE project-level event & property definitions |
| 埋点模板 | Tracking Plan Template | Pre-built industry/genre xlsx templates |
| 方案名称 | Plan Name | User-facing plan identifier |
| 应用场景 | Application Scenario | One-sentence description of what the app does |
| 素材来源 | Source Material Type | prd / chat / codebase / template |
| 业务维度 | Business Dimension | Revenue model, core loop, functional entries, currency system |
| 收入模型 | Revenue Model | IAA / IAP / mixed / subscription / commission |
| 核心循环 | Core Loop | Core gameplay loop (e.g. "grind stages → earn coins → gacha for heroes") |
| 功能入口 | Functional Entry | Stage, shop, guild, leaderboard, task, achievement, etc. |
| 货币体系 | Currency System | Hard currency (diamonds), soft currency (gold), etc. |
| 事件 | Event | Named user action or system occurrence (`event_name`) |
| 事件属性 | Event Property | Data attached to an event (`prop_names`) |
| 公共事件属性 | Common/Super Property | Property attached to every event automatically |
| 用户属性 | User Property | Property on the user profile (persistent state) |
| 预置属性 | Preset Property | System property prefixed with `#` (`#device_id`, `#time`, etc.) |
| 自动采集事件 | Auto-track Event | SDK auto-collected events (`ta_app_start`, `ta_page_show`, etc.) |
| 系统事件 | System Event | Auto-track event tag category |
| 业务事件 | Business Event | Custom business event tag category |
| SDK 集成模式 | SDK Integration Mode | `client_only` / `server_only` / `both` / `none` |
| 客户端平台 | Client Platform | Android, iOS, Web, Unity, Mini-program, etc. |
| 服务端语言 | Server Language | Java, Python, Go, Node.js, PHP, etc. |
| 用户体系 | User Identity System | distinct_id strategy + account_id source |
| 访客 ID | Visitor ID / Distinct ID | Anonymous identity before login |
| 账号 ID | Account ID | Identified user after login |
| 插入 | Insert | Direct code injection into project |
| 片段 | Snippet | Code delivered as standalone files |
| 对象组 | Object Array (`array_row`) | `[{...}]` — variable-length list of related entities |
| 对象 | Object (`object`) | `{...}` — fixed-structure single entity |
| 校验 | Validation | Draft rule checking before xlsx generation |
| 上传 | Upload | Pushing the xlsx tracking plan to AE |
| 追加 | Append | Adding new events/properties to an existing plan |
| 替换 | Replace | Deleting existing plan and uploading a new one |
| 冲突检测 | Conflict Detection | Detecting type mismatches and duplicate events before upload |
| 归档 | Archive | Copying final draft.xlsx to `plans/` directory |
| xlsx 格式契约 | xlsx Format Contract | Column rules for AE-compatible Excel generation |
| draft.json | draft.json | Internal intermediate representation (JSON) of the tracking plan |
| display_name | Display Name | Human-readable name in the user's language |
| event_tag | Event Tag | Category label for grouping events |
| snake_case | snake_case | Canonical naming format: `lowercase_with_underscores` |

## When to Trigger

Trigger when user mentions: "tracking plan / tracking template / AE plan / help me create tracking" etc.
App types covered: H5 / Web / iOS / Android / Mini-program / Unity. Follow strictly
Phase 0 → 1 → 2 → 3 → 4, do not skip steps.

> Phase 1 / 3 / 4 are executed via `ae-cli tracking` CLI (`ae-cli tracking plan draft`
> / `ae-cli auth login` / `ae-cli tracking plan upload` / `ae-cli tracking plan delete`).
> **All CLI commands must be prefixed with `AE_LANG=<user_lang>`** (e.g. `AE_LANG=en ae-cli tracking plan draft ...`),
> ensuring CLI output messages and generated xlsx headers match the user's language.
> 
> **Language rules**: All user-facing fields in draft.json (`display_name`, `event_desc`, `event_tag`,
> property `display_name`, property `desc`, etc.) must be generated in the **user's input language**.
> Content extracted from Chinese templates/PRDs must be translated to the user's language when written to draft.json.
> Only identifier fields like `event_name`, `prop_name` remain in English snake_case (canonical format).
> This skill only cares about command behavior, not internal implementation.

---

## Phase 0 — Anchor (one question per message)

> **Step 1: Language initialization**
> 
> Determine `<user_lang>` from user's input language: Chinese→`zh`, English→`en`, Japanese→`ja`, Korean→`ko`. Other languages default to `en`.
> All subsequent CLI commands must be prefixed with `AE_LANG=<user_lang>` to ensure CLI output and generated xlsx headers match the user's language.

Collect the following **5 items** sequentially, **do NOT ask all at once**:

### Item 1 — Application Scenario

Ask: **"What is your application's business scenario? One sentence summary, e.g.: An e-commerce website where users browse products and place orders"**

After user responds, record to `meta.scenario` and generate `meta.plan_name`.

### Item 2 — Source Material + Business Dimension (combined)

Before asking, decide whether the current runtime is an agent sandbox. The agent may judge this from runtime context such as sandbox-provisioned `cli-token.json`, restricted filesystem access, or absence of the user's local files. Do not ask the user just to decide sandbox visibility.

Product document is available in sandbox environments **only for files that are readable inside the sandbox workspace**, including files the user attaches/uploads into the conversation workspace. It cannot read arbitrary local paths outside the sandbox unless those files are mounted or attached. Codebase is a local-material option and must be hidden in sandbox environments unless the codebase is already present in the readable workspace. When options are hidden, renumber the visible list contiguously from 1; never show skipped numbers.

If **not** in a sandbox environment, ask exactly:

```text
Choose your source material (up to 2):

1 - Product document (local path, image file, or folder) — Extract events and properties from product docs; supports md/pdf/docx/URL/images (png/jpg/jpeg/webp)
2 - Detailed description (conversational) — Describe app business flow, core features, user behaviors, monetization model, etc.
3 - Codebase (local project path; hidden in sandbox) — Analyze source code to extract events and properties
4 - Pre-built template (built-in industry and game genre templates) — Select a built-in template

Reply with number(s), e.g. 1 or 1,4. Select up to 2.
```

If in a sandbox environment, ask exactly:

```text
Choose your source material (up to 2):

1 - Product document (sandbox workspace path, uploaded attachment, URL, image file, or folder) — Extract events and properties from product docs; supports md/pdf/docx/URL/images (png/jpg/jpeg/webp). You can attach/upload relevant files here.
2 - Detailed description (conversational) — Describe app business flow, core features, user behaviors, monetization model, etc.
3 - Pre-built template (built-in industry and game genre templates) — Select a built-in template

Reply with number(s), e.g. 1 or 1,3. Select up to 2.
```

Do not rewrite this source material list as unnumbered bullets, cards, or prose. The user must be able to reply with the visible numbers.

User can multi-select (max 2). Interpret numbers by the **visible list shown to the user**, not by the non-sandbox canonical list.

Canonical source material options:

- **Product document** (local path, sandbox workspace path, uploaded attachment, URL, image file, or folder) — Extract events and properties from product docs; supports md/pdf/docx/URL/images (png/jpg/jpeg/webp)
- **Detailed description** (conversational) — Describe app business flow, core features, user behaviors, monetization model, etc.
- **Codebase** (local project path; hidden in sandbox) — Analyze source code to extract events and properties
- **Pre-built template** (built-in industry and game genre templates) — Select a built-in template (run `AE_LANG=<user_lang> ae-cli tracking plan list-templates --json` to see available templates)

Based on user selection, determine source material type and record to `meta.source_type`:

| Selection | source_type | Handling |
|---|---|---|
| Product doc only | `prd` | Read product docs (text/images), extract events and properties |
| Description only | `chat` | Construct events in Draft phase based on description |
| Codebase only | `codebase` | Scan source code, extract events/properties from business logic |
| Template only | `template` | Provide built-in template selection |
| Any two-item combo | Join two types with `_` | First as baseline, second as supplement (priority: template → codebase → prd → chat) |

**Follow-up questions** (ask in selection order):
- Product doc → if not in a sandbox environment, ask **"What is the product document path? You can provide one or more paths, separated by commas or newlines (local paths, URLs, image files, or folders)"**
- Product doc → if in a sandbox environment, ask **"What is the product document path? You can provide one or more sandbox workspace paths, uploaded attachment paths, URLs, image files, or folders. You can also attach/upload relevant files here, and I will read them from the sandbox workspace if available."**
- Detailed description → If too vague, follow up on core features, user behaviors, business flows, monetization
- Codebase → ask **"What is the project directory path?"**, then scan source to extract business logic
- Pre-built template → display matching templates for user confirmation

**Codebase analysis flow** (when source_type includes `codebase`):

1. User provides project directory path
2. Scan directory structure, identify tech stack (engine/framework/language)
3. Read core business modules (game logic, scene management, UI interaction, state/data models, networking/payment, etc.)
4. Extract from code:
   - **Events**: Player interaction actions (click/swipe/trigger), scene transitions, game state changes (start/pause/end), business flow nodes (purchase/upgrade/unlock)
   - **Event Properties**: Action parameters (bullet type/enemy level/item ID), state values (score/HP/coins), context (level ID/difficulty/mode)
   - **User Properties**: Persistent state (level/experience/VIP/cumulative spend)
5. Map extracted results to AE naming conventions (`snake_case` event names + `display_name` in user's language)
6. Confirm extracted results with user, supplement missing items

**Business Dimension Confirmation**:

After source material is confirmed, **must** process business dimension info based on source_type. User must explicitly confirm before proceeding.

| source_type | Handling |
|---|---|
| `template` | Directly display template's inherited business dimensions; skip detailed inference |
| `prd` / `codebase` / `chat` | Infer business dimensions → follow up on missing items → event injection preview |

**If source_type = template**:

Display template's preset business dimensions:

```
Business Dimension (inherited from template: <template name>)

Revenue Model: <revenue_model>
Core Loop: <core_loop>
Functional Entries: <functional_entries>
Currency System: <currency_system>

Confirm using these business dimensions? ok / modify
```

- User `ok` → proceed to next step
- User says "modify" → switch to prd/chat flow for user to supplement

**If source_type is prd / codebase / chat**:

1. **Inference display**: Format inference results as a summary, using `business-dimension-mapping.md` as the mapping baseline
2. **Follow up missing**: Only ask about missing items or items inferred as "simple"
3. **Event injection preview**: Show suggested injected event modules; user `ok` to proceed

Platform validation: Use `business-dimension-mapping.md` Chapter 5 decision rules to check if injected events' platform assignments are reasonable.

**Template matching** (prd / codebase / chat scenarios, optional):

After business dimension confirmation, auto-detect matching templates based on app type:
```bash
AE_LANG=<user_lang> ae-cli tracking plan list-templates --json
```

Show matching templates to user for confirmation. Confirmed templates serve as baseline and participate in Phase 1 event merging.

**Record business dimension info to `meta.business_dimension`**:
```json
"business_dimension": {
  "revenue_model": "<model>",
  "core_loop": "<description>",
  "functional_entries": ["<entry list>"],
  "currency_system": { ... },
  "ad_scenes": [],
  "iap_items": []
}
```

### Item 3 — SDK Integration Config (client + server combined)

Ask: **"What is your client platform? (multi-select OK, e.g. Android + iOS) Will you integrate a server-side SDK?"**

After asking this Item 3 question, **stop and wait for the user's answer**. Do not display Item 4 in the same response.

> **Language filter**: The following SDKs have Chinese-only documentation and are **visible to Chinese users only**: `Mini-program`, `Mini-game`, `OpenHarmony`, `LayaAir`, `Egret`, `Cocos2d-Lua`. Do not show these to non-Chinese users.

**Client integration** (multi-select OK):

| Option | Client SDK Type |
|---|---|
| H5/Web App | JavaScript SDK |
| Mobile Game - Android Native | Android SDK |
| Mobile Game - iOS Native | iOS SDK |
| Mobile Game - Unity | Unity SDK |
| Mobile Game - CocosCreator | CocosCreator SDK |
| Mobile Game - Cocos2d-x | Cocos2d-x SDK |
| Mobile Game - Cocos2d-Lua | Cocos2d-Lua SDK |
| Mobile Game - LayaAir | LayaAir SDK |
| Mobile Game - Egret | Egret SDK |
| Mobile Game - Unreal | Unreal SDK |
| Mobile App - Android Native | Android SDK |
| Mobile App - iOS Native | iOS SDK |
| Mobile App - React Native | React Native SDK |
| Mobile App - Flutter | Flutter SDK |
| Mobile App - uni-app | uni-app SDK |
| Mobile App - OpenHarmony | OpenHarmony SDK |
| Mini-game | Mini-game SDK (unified, supports WeChat/QQ/TikTok/Baidu, etc.) |
| Mini-program | Mini-program SDK (unified, supports WeChat/TikTok/Alipay/Baidu, etc.) |
| PC Game - Unreal | Unreal SDK |
| PC Game - Unity | Unity SDK |
| PC App - C++ | C++ SDK |
| PC App - C# | C# SDK |
| PC App - macOS Native | macOS SDK |
| PC App - OpenHarmony | OpenHarmony SDK |
| No client SDK | None (`sdk_integration_mode: "server_only"`) |

**Programming language** (Android / iOS SDK only):

| SDK Type | Supported Languages |
|---|---|
| Android SDK | Java / Kotlin (can multi-select) |
| iOS SDK | Objective-C / Swift (can multi-select) |
| Other SDKs | Fixed language, no selection needed |

Follow-up: chose Android SDK → ask **"Which programming language? Java / Kotlin / both"**
Follow-up: chose iOS SDK → ask **"Which programming language? Objective-C / Swift / both"**

Record to `client_platform_languages`:
```json
"client_platform_languages": {
  "android": ["java", "kotlin"],
  "openharmony": ["typescript"]
}
```

> ⚠️ **Multi-platform meta field rules**: When ≥2 client platforms are selected, Draft meta **must** use `client_platforms` (array) + `client_platform_languages` (dictionary). Do NOT use only `client_sdk_type` (single value) + `client_language` (single value), which would only record one platform. Single-platform scenarios use `client_sdk_type` + `client_language`.

**Server integration**:

| Option | Server SDK Type | sdk_integration_mode |
|---|---|---|
| Java | Java SDK | `both` |
| Python | Python SDK | `both` |
| Go | Go SDK | `both` |
| Node.js | Node SDK | `both` |
| PHP | PHP SDK | `both` |
| C# / .NET | C# SDK | `both` |
| C++ | C++ SDK | `both` |
| Erlang | Erlang SDK | `both` |
| Lua | Lua SDK | `both` |
| Ruby | Ruby SDK | `both` |
| Other | Follow up on specific language; check wiki for SDK availability | `both` |
| No server SDK | None | `client_only` or `none` |

**SDK integration mode auto-detection**:

| Client Integration | Server Integration | sdk_integration_mode |
|---|---|---|
| Yes | Yes | `both` |
| Yes | No | `client_only` |
| No | Yes | `server_only` |
| No | No | `none` (RESTful / LogBus / DataX data ingestion) |

`none` mode: Suitable for historical data import, batch data sync, third-party system integration, etc. Refine phase does not inject SDK auto-track events.

**Item 3 confirmation gate**:

After the user answers Item 3, normalize the SDK configuration and ask only the missing follow-up questions (for Android/iOS programming language or `Other` server language).

Then summarize the normalized SDK config and ask: **"Confirm this SDK integration config? Reply ok to continue to Item 4, or describe changes."**

Do not display Item 4 or ask identity questions until the user explicitly confirms this SDK integration config.

### Item 4 — User Identity System (visitor ID + account ID combined)

Ask: **"What is the visitor ID generation strategy?"**

Options:
- `auto` — SDK auto-generates (default, suitable for most scenarios)
- `device_id` — Use device ID (iOS IDFV / Android AndroidID)
- `custom` — Custom visitor ID (must call `identify()` immediately after SDK init)

Follow-up: chose `custom` → ask **"What value should the visitor ID use? e.g.: device ID / UUID / guest temp ID"**

---

Ask: **"What is the account ID source?"**

Options:
- `user_account` — User account ID (unique identifier after login)
- `role_id` — Role ID (game-specific; one account may have multiple roles)
- `none` — No account system (pure guest mode)

Follow-up:
- chose `user_account` → ask **"What specific value for account ID? e.g.: user_id (user ID), phone (phone number), email (email address)"**
- chose `role_id` → explain **"Role ID is suitable for games — one account can create multiple roles, enabling finer-grained per-role behavior analysis"**

Record to `meta.user_identity`:

---

## Phase 1 — Draft

### 1.1 Construct Canonical Draft

Draft conceptual structure (**internal JSON; users do not view directly**):

```
Draft
├── meta:
│   ├── app_type:                   App type
│   ├── sdk_integration_mode:       SDK integration mode: client_only / server_only / both
│   ├── client_platforms?:          Client SDK type list (required when multi-platform, e.g. ["android","ios"])
│   ├── client_sdk_type?:           Primary client SDK type (single platform, backward compatible)
│   ├── client_platform_languages?: Per-platform languages (required when multi-platform, e.g. {"android":["kotlin"],"ios":["swift"]})
│   ├── client_language?:           Client dev language (single platform, backward compatible)
│   ├── server_language?:           Server dev language (only when server_only or both)
│   ├── project_id?:                AE project ID (filled in Phase 3)
│   ├── host?:                      AE web address (filled in Phase 3)
│   ├── plan_name:                  Plan name
│   ├── lang:                       xlsx output language (zh/en/ja/ko), based on user's current language; controls generated xlsx headers/sheet names
│   ├── scenario:                   Business scenario description
│   ├── source_type:                Source material type
│   ├── user_identity:              User identity config
│   │   ├── account_id_source:      Account ID source: user_account / role_id / none
│   │   ├── account_id_field?:      Account ID field name (only when user_account, e.g. user_id / phone / email)
│   │   ├── distinct_id_strategy:   Visitor ID strategy: auto / device_id / custom
│   │   └── distinct_id_custom_value?: Custom visitor ID value
│   └── business_dimension:         Business dimension config (injected in Phase 1.3)
│       ├── revenue_model:          Revenue model: IAA / IAP / mixed / subscription / commission
│       ├── core_loop:              Core gameplay loop description
│       ├── functional_entries:     Functional entry list
│       ├── currency_system:        Currency system
│       ├── ad_scenes:              Ad scenes (IAA / mixed only)
│       └── iap_items:              IAP items (IAP / mixed only)
├── events:                         Event array, each with platform field
├── event_properties:               Global event property pool (deduplicated)
├── common_event_properties:        Common/super properties (attached to every event)
└── user_properties:                User properties
```

**SDK integration mode fields**:

```json
// Multi-platform example (Android + iOS)
{
  "sdk_integration_mode": "both",       // client_only / server_only / both
  "client_platforms": ["android", "ios"],   // Required for multi-platform
  "client_platform_languages": {            // Required for multi-platform; per-platform languages
    "android": ["kotlin"],
    "ios": ["swift"]
  },
  "server_language": "java"                // Only when server_only or both
}

// Single platform example (backward compatible)
{
  "sdk_integration_mode": "client_only",
  "client_sdk_type": "android",            // Single platform
  "client_language": "kotlin"              // Single platform
}
```

**Event platform tag (`events[].platform`)**:

```json
{
  "event_name": "order_create",
  "display_name": "Order Create",
  "platform": "server",    // client / server / both
  "prop_names": ["order_id", "order_amount", "payment_method"],
  "source": "prd"
}
```

- `platform: "client"` — Client-side upload (user behavior events)
- `platform: "server"` — Server-side upload (business data events)
- `platform: "both"` — Both sides upload (timestamps must be synced)

**Property object format (`event_properties` / `common_event_properties` pool entries)**:

```json
{
  "name": "order_amount",
  "display_name": "Order Amount",
  "type": "number",
  "desc": "Order total in cents",
  "source": "prd"
}
```

> ⚠️ Field names: use `name` (NOT `prop_name`), `display_name`, `type`, `desc`, `source`. Events reference properties by `prop_names: ["order_amount", ...]` — this is an array of property `name` references (string array), NOT property objects.

**User property format (`user_properties` pool entries)**:

```json
{
  "name": "vip_level",
  "display_name": "VIP Level",
  "type": "number",
  "desc": "Current VIP level of the user",
  "source": "chat",
  "update_type": "user_set"
}
```

> `update_type` is one of: `user_set` (overwrite), `user_setOnce` (first-set-only), `user_add` (numeric accumulate).

**User identity fields (`meta.user_identity`)**:

```json
{
  "account_id_source": "user_account", // Account ID source: user_account / role_id / none
  "account_id_field": "user_id",       // Account ID field name (only when user_account)
  "distinct_id_strategy": "auto",      // Visitor ID strategy: auto / device_id / custom
  "distinct_id_custom_value": null     // Custom visitor ID value description (only when strategy=custom)
}
```

**Property types** (enum): `string` / `number` / `bool` / `datetime` /
`object` (single object, with sub-properties) / `array_row` (object array, supports `parent.child` nesting) / `array_string` (string array)

**Naming rules**: Event names / property names must be `snake_case`; use `display_name` field for human-readable names.

### 1.2 Merge Source Materials

Priority from low to high: **template → codebase → prd → chat → autotrack**

- **template**: User-selected industry template (see "Template Lookup Convention" below) as baseline; each item marked `source: "template"`
  - Templates are resolved by ae-cli from the ae-cli package root and user template directory
  - Import command: `AE_LANG=<user_lang> ae-cli tracking code import-template --template-name "<template name>" --out .ae-cli/draft.json`
  - ⚠️ **Must validate immediately after template import** (see Phase 1.6); template content may not be fully correct
  - ⚠️ **Template content is in Chinese; must translate after import**: Read draft.json, translate `display_name`, `event_desc`, `event_tag`, and property `display_name`/`desc` to user's language, then write back. Only `event_name`, property `name`, `type` identifiers remain as-is.
  - ⚠️ **event_tag also needs translation**: `业务事件`→user's language (e.g. EN: `Business Event`), `系统事件`→user's language (e.g. EN: `System Event`; autotrack events are handled automatically by CLI, no need to re-translate)
- **codebase**: Scan project source directory, extract events/properties from business logic; **same-name events merge prop_names without overwriting existing fields**; new items `source: "codebase"`
- **prd**: Read all user-provided product documents (md / pdf / docx / URL / images), extract events and properties from each file; **same-name events merge prop_names without overwriting existing fields**; image files analyzed via multimodal interpretation of UI elements and interaction flows; all new items `source: "prd"`
  - **prd path is a folder**: Recursively scan all files in the directory:
    - md/pdf/docx → read text content, extract events/properties
    - png/jpg/jpeg/webp → multimodal interpretation, analyze UI elements and interaction flows
    - subdirectories → recurse
    - other files → skip
  - **prd path is a URL**: Fetch URL content directly, process by the same rules above
- **chat**: Anchor phase business scenario + refine phase edit instructions, `source: "chat"`
- **autotrack**: Auto-inject SDK auto-track events based on `meta.client_sdk_type` (only for `client_only` or `both` mode), `source: "autotrack"`

### 1.3 Inject Business Dimension Events

Based on `meta.business_dimension` collected in Phase 0, inject corresponding events by the following rules.

**Revenue model → Required events**:

| Revenue Model | Injected Events | Description |
|---|---|---|
| `IAA` | `ad_show`, `ad_click`, `ad_reward_get` | Ad impression / click / reward claim |
| `IAP` | `payment`, `payment_fail` | Payment success / failure |
| `mixed` | All IAA + IAP events | |
| `subscription` | `subscription_start`, `subscription_renew`, `subscription_cancel` | Subscription start / renew / cancel |
| `commission` | `order_create`, `order_paid`, `commission_settled` | Order create / payment / commission settlement |

**Core loop → Event sequence**:

Parse node actions from user's `core_loop` description, map to events:

Example: "Players repeatedly clear stages to earn coins, use coins to gacha for heroes"
→ Stage module: `stage_start` (stage begin), `stage_complete` (stage clear), `stage_fail` (stage fail)
→ Resource gain: `token_get` (coin gain, props: `token_type=diamond`, `token_amount`)
→ Gacha module: `gacha_draw` (gacha pull), `pool_type` (pool type), `draw_count` (draw count)
→ Hero gain: `hero_get` (hero acquired), `hero_id`

**Functional entries → Module event groups**:

| Functional Entry | Event Examples | Description |
|---|---|---|
| Stage | `stage_start`, `stage_complete`, `stage_fail`, `stage_id` | Stage start / complete / fail |
| Gacha | `gacha_draw`, `pool_type`, `draw_count`, `hero_get` | Gacha pull / pool / count / acquire |
| Shop | `shop_open`, `shop_buy`, `token_balance` | Shop open / buy / balance |
| Guild | `guild_join`, `guild_donate`, `guild_boss_start` | Guild join / donate / boss fight |
| Leaderboard | `rank_view`, `rank_refresh`, `rank_click` | Ranking view / refresh / click |
| Tasks | `task_accept`, `task_complete`, `task_reward_claim` | Task accept / complete / reward claim |
| Achievements | `achieve_unlock`, `achieve_reward_claim` | Achievement unlock / reward claim |
| Daily Check-in | `daily_sign`, `sign_reward_claim` | Daily sign-in / reward claim |

**Currency system → Property design**:

| Currency Type | Event | Properties |
|---|---|---|
| Hard currency (diamonds) gain | `token_get` | `token_type=diamond`, `token_amount`, `token_balance`, `source` |
| Soft currency (gold) gain | `token_get` | `token_type=gold`, `token_amount`, `token_balance`, `source` |
| Hard currency spend | `token_consume` | `token_type`, `token_amount`, `token_balance`, `consume_type` |
| Soft currency spend | `token_consume` | `token_type`, `token_amount`, `token_balance`, `consume_type` |

**Injection rules**:
1. Business dimension events marked `source: "business_dimension"`
2. When merging with source material events, **same-name events keep the source material version, do not overwrite**
3. When revenue model is `none` (no monetization), skip revenue-related event injection

### 1.4 Auto-inject SDK Auto-track Events

Based on SDK integration mode collected in Phase 0, decide whether to inject auto-track events:

**Injection conditions**:
- `sdk_integration_mode === "client_only"` → inject auto-track events
- `sdk_integration_mode === "both"` → inject auto-track events (client side only)
- `sdk_integration_mode === "server_only"` → **do NOT inject** (server SDKs have no auto-track)
- `sdk_integration_mode === "none"` → **do NOT inject** (no SDK; data ingestion via other methods)

**Injection rules**:
1. **Only inject recommended events**; optional events are not auto-injected (prompted in Refine phase for optional enablement)
2. Auto-track events placed at the end of `events` array, marked `source: "autotrack"`
3. Auto-track event `event_tag` set to `"System Event"`
4. Auto-track events only carry preset properties (`prop_names` is empty or contains only preset property names)
5. Preset properties prefixed with `#` are not added to `event_properties` pool (auto-collected by SDK)
6. **Deduplication**: Templates may already contain same-name auto-track events (e.g. `ta_app_start` marked `source: "template"`); CLI deduplicates by event name globally and will not inject duplicates

**SDK type → Recommended events** (see `references/autotrack-events.md` for details):

| SDK Type | Recommended (auto-inject) | Optional (Refine prompt) |
|---|---|---|
| Android / iOS | `ta_app_install`, `ta_app_start`, `ta_app_end` | `ta_app_view`, `ta_app_click`, `ta_app_crash` |
| JavaScript | `ta_page_show`, `ta_page_hide` | `ta_pageview` |
| WeChat Mini-program | `ta_mp_launch`, `ta_mp_show`, `ta_mp_hide`, `ta_mp_view`, `ta_mp_share` | `ta_page_leave`, `ta_add_favorite`, `ta_mp_click` |
| WeChat Mini-game | `ta_mp_launch`, `ta_mp_show`, `ta_mp_hide` | — |
| Unity | `ta_app_install`, `ta_app_start`, `ta_app_end` | `ta_scene_loaded`, `ta_scene_unloaded` |
| Unity WeChat Mini-game | `ta_mg_launch`, `ta_mg_show`, `ta_mg_hide` | `ta_scene_loaded`, `ta_scene_unloaded` |
| Other game engines | `ta_app_install`, `ta_app_start`, `ta_app_end` | — |

**Auto-track event purpose notes**:
- Auto-track events are the SDK's built-in auto-reporting mechanism; **you do not need to manually define same-name events**
- Example: JavaScript SDK's `ta_page_show` auto-collects page views; no need to define `home_page_show`, `about_page_show` etc.
- If templates already contain auto-track events (e.g. `ta_app_install` in industry templates), CLI will not inject duplicates
- These events require **enabling corresponding switches** during SDK initialization in the `ae-generate-tracking-code` phase

**Draft JSON example**:

```json
{
  "event_name": "ta_app_install",
  "display_name": "App Install",
  "event_desc": "Triggered on first app install; upgrades do not trigger; reinstall after deletion triggers",
  "event_tag": "System Event",
  "platform": "client",
  "prop_names": [],
  "source": "autotrack"
}
```

**Note**: Auto-track event `platform` is always `"client"`, because only client SDKs have auto-track capability.

### 1.5 Persist + Generate xlsx

**Must write draft.json first, then run draft command. Do not skip this step and run ae-cli tracking plan draft directly.**

- Save draft to `.ae-cli/draft.json`
- ⚠️ **Write `meta.lang`**: Set `draft.meta.lang` based on user's current language (`zh`/`en`/`ja`/`ko`), ensuring generated xlsx headers / sheet names / type values match the AE platform language
- **Must verify file was updated after writing** (check file modification time or content); only generate xlsx after confirming new content
- Generate upload-ready xlsx:

```bash
AE_LANG=<user_lang> ae-cli tracking plan draft --in .ae-cli/draft.json --out .ae-cli/draft.xlsx
```

### 1.6 Rule Validation (must execute)

Auto-validate during xlsx generation to ensure compliance with AE tracking plan rules:

```bash
AE_LANG=<user_lang> ae-cli tracking plan draft --in .ae-cli/draft.json --out .ae-cli/draft.xlsx --fix
```

**Validation rules**:

| Rule | Description | Auto-fix |
|---|---|---|
| Display name uniqueness | Within same property pool, `display_name` must not repeat | ✅ Add distinguishing prefix |
| Object array consistency | Same `array_row` across different events must have identical sub-properties | ✅ Fill missing sub-properties |
| snake_case | Event/property names must match `^[a-z][a-z0-9_]*$` | ❌ Manual fix needed |
| Property name uniqueness | Property names must not repeat | ❌ Manual fix needed |
| Event name uniqueness | Event names must not repeat | ✅ Remove later duplicates |

**Validation flow**:

1. CLI auto-validates draft.json
2. Fixable issues found → auto-fix → update draft.json → generate xlsx
3. Non-fixable issues found → error; manual fix of draft.json needed
4. No issues → proceed to Phase 1.7

**Note**: Display names can be the same across different property pools (e.g. `vip_level` can be both an event property and a user property).

### 1.7 Show Summary

Display to user via markdown table: event count / event property pool size / super property count / user property count; show deliverable paths.

After displaying, tell user:

```
Phase 1 complete.
Next: Phase 2 — Refine to confirm the plan.
```

### 📁 Template Lookup Convention

Run the following command to dynamically discover available templates:

```bash
AE_LANG=<user_lang> ae-cli tracking plan list-templates --json
```

**Language rules**: Template file names are in Chinese. When displaying to users, **must translate to user's current language**; **do NOT** include the original Chinese name (e.g. show only "Card Game v1", not "Card Game (卡牌游戏) v1").

Built-in templates are resolved by ae-cli from the ae-cli package root. User templates are resolved from the ae-cli user template directory. Do **not** manually construct `./tracking-plan-template/...` paths from the user's current workspace.

Search directories in order:

1. `<ae-cli package root>/tracking-plan-template/` — bundled templates
2. `~/.ae-cli/templates/` — user-provided template directory

Each template prefers `.md` distilled file (if same-name `.md` exists, return md path; otherwise return xlsx path).
Display translated template names to the user, but keep the original `name` from the JSON result for import. Auto-detect format on import:

```bash
AE_LANG=<user_lang> ae-cli tracking code import-template --template-name "<template name>" --out .ae-cli/draft.json
```

---

## Phase 2 — Refine (5-segment loop)

In order, one conversation round per segment:

1. **sdk_config (SDK config + User identity, combined)** — Show SDK integration mode, platform/language, visitor ID strategy, account ID source, corresponding SDK calls
2. **business (Business dimension + Business events, combined)** — Show revenue model, core loop, functional entries, injected event modules (grouped by platform)
3. **autotrack (Auto-track events)** — Show SDK auto-track events in a separate table, note enablement method
4. **common_props (Super properties)** — Show all super properties, note usage scenarios and considerations
5. **props (Event properties + User properties)** — Show event property pool grouped by event + user properties table

Per-segment flow:

1. Display corresponding section of current draft
2. Ask a segment-specific confirmation question. Always include the current segment number, current segment key, and next segment key:
   ```text
   Segment <n>/5 <segment_key> confirmed? Reply ok to continue to Segment <n+1>/5 <next_segment_key>, or describe changes.
   ```
   For Segment 5:
   ```text
   Segment 5/5 props confirmed? Reply ok to archive the plan and continue to Phase 3, or describe changes.
   ```
3. User gives natural language instructions → update `.ae-cli/draft.json` → re-run:
   ```bash
   AE_LANG=<user_lang> ae-cli tracking plan draft --in .ae-cli/draft.json --out .ae-cli/draft.xlsx
   ```
4. User `ok` → proceed to next segment

`ok` is a refine state-machine input, not a repeated-message error. If the user replies `ok` multiple times in a row, advance exactly one segment per `ok` in order. Before each confirmation prompt, print the new segment heading first, so consecutive confirmations do not look like the same question repeated.

User may say **"Go back to segment N"** at any time to jump to any segment (N = 1-5).

---

### sdk_config (Phase 2 Segment 1)

Show SDK integration config + user identity system:

```
SDK Integration Config:
- Integration mode: <client_only / server_only / both / none>
- Client: <platform> (<language>)
- Server: <language>

User Identity Config:
- Account ID source: <user_account / role_id / none>
- Account ID field: <specific field>
- Visitor ID strategy: <auto / device_id / custom>

```

User ok / modify.

---

### business (Phase 2 Segment 2)

Show business dimensions + business events:

```
Business Dimensions:
- Revenue model: <IAA / IAP / mixed / subscription / commission>
- Core loop: <description>
- Functional entries: <list>
- Currency system: <hard currency / soft currency>

Injected Event Modules (grouped by platform):

Client events (platform=client):
- <event>: <display_name> — <event_desc>
- ...

Server events (platform=server):
- <event>: <display_name> — <event_desc>
- ...

Both-platform events (platform=both):
- <event>: <display_name> — <event_desc>
```

**Conflict detection**: If business dimensions contradict source materials, prominently flag for user confirmation.

User ok / modify.

---

### autotrack (Phase 2 Segment 3)

Only shown for `client_only` or `both` mode.

Display SDK auto-track event list, with notes:
- These events are auto-collected by the SDK; **no manual track() calls needed** during code generation — just enable corresponding switches during SDK init
- `display_name` or `event_desc` can be adjusted; event names cannot be changed

User ok / modify.

---

### common_props (Phase 2 Segment 4)

Show all super properties (`name` / `display_name` / `type` / `desc`).

Notes:
- Super properties are attached to every event; ideal for **business-wide global dimensions**
- Common super properties (by app type):
  - H5/Web: `channel` (source channel), `referrer_domain` (referring domain)
  - Mobile App: `channel`, `app_version`, `platform`
  - Game: `channel`, `vip_level`, `server_id`
  - Mini-program: `channel`, `scene`
- **Prohibited**: Do NOT set SDK preset properties (`#` prefix) as super properties

User ok / modify.

---

### props (Phase 2 Segment 5)

Show event property pool (grouped by event) + user properties table:

- Event properties: `name` / `display_name` / `type` / `desc`, grouped by `event_tag`
- User properties: `name` / `display_name` / `type` / `update_type` / `desc`

**User property update methods**:
| Update Method | Description | Use Case |
|---|---|---|
| `user_setOnce` | Only set on first occurrence; subsequent updates ignored | First registration time, first payment time, first channel |
| `user_set` | Overwrite update; always takes latest value | Current level, current balance, nickname, VIP status |
| `user_add` | Numeric accumulation; suitable for cumulative values | Total recharge amount, total login days, total ads watched |

User ok → **immediately execute archive command**, then proceed to Phase 3.

---

### Refine Phase Heuristic Suggestions

- **Super properties vs Event properties**: Property appears on 3+ events → promote to super property; super properties are suitable for business-wide global dimensions (`channel`, `vip_level`, `ab_test_group`)
- **Prohibited**: Do NOT set SDK preset properties (`#` prefix) as super properties
- **Events must have properties**: Every event must have at least one semantically meaningful, describable property
- **Nested properties**: `array_row` parent properties have `parent.child` sub-properties describing a group of objects

---

## Post-Phase 2 — Pre-delivery Self-check

**⚠️ Before uploading to AE, must complete the following self-check. Fix any issues before uploading.**

### Naming Convention Check

- [ ] Do event/property names start with a letter?
- [ ] Do event/property names contain only letters, digits, and underscores (no Chinese, no spaces)?
- [ ] Are there duplicate event names or synonymous events coexisting (e.g. `order_create` and `create_order`)?
- [ ] Does the same property name map to multiple display names or types?

### Revenue Model Required Events Check

| Revenue Model | Must Include Events | Check |
|---|---|---|
| IAA | `ad_show`, `ad_click`, `ad_reward_get` | [ ] |
| IAP | `payment`, `payment_fail` | [ ] |
| `mixed` | All IAA + IAP events | [ ] |
| `subscription` | `subscription_start`, `subscription_renew`, `subscription_cancel` | [ ] |
| commission | `order_create`, `order_paid`, `commission_settled` | [ ] |

### Paired Event Consistency Check

**Start/end paired events** (e.g. `battle_start`/`battle_end`) must carry **same-name, same-structure** object arrays:
- Object array sub-properties reported by start event must be same name and same type in end event
- Check: stage pairs (`stage_start`/`stage_complete`), battle pairs (`battle_start`/`battle_end`), gacha pairs (`gacha_draw`/`hero_get`), etc.

### Unit Description Check

- [ ] Are monetary fields annotated with unit (cents/USD)?
- [ ] Are duration fields annotated with unit (seconds/milliseconds)?
- [ ] Are balance fields annotated as post-recharge balance or pre-operation balance?

### Enum Value Check

- [ ] Are enum values listed in event description (≤ 10 values)?
- [ ] For > 10 values, is there a note to use a dimension table?
- [ ] Is the null-value fallback strategy documented (e.g. "unknown channel → use `unknown`")?

### Object Array Usage Check

Only use object arrays (`array_row`) when ALL THREE conditions are met; otherwise use object or plain properties:

1. An event property has multiple same-type entities to record
2. Each entity needs ≥ 2 properties recorded
3. Entity count is variable

### Object Usage Check

Use object (`object`) when the following condition is met; distinguish from object arrays:

- **One-to-one** relationship → use `object`: e.g. user's current "equipment" details, player's "current deployed hero" (only one)
- **One-to-many** relationship → use `array_row`: e.g. "backpack items" list, "lineup heroes" list (multiple)

Quick rule: **data shaped like `{...}` → use `object`; data shaped like `[{...}]` → use `array_row`**.

---

## Post-Phase 2 — Archive

After all 5 Refine segments are confirmed (user `ok` on Segment 5), **archive immediately; do not skip or delay**:

```bash
AE_LANG=<user_lang> ae-cli tracking plan archive --draft .ae-cli/draft.json --xlsx .ae-cli/draft.xlsx --name "<plan_name>"
```

| Parameter | Description | Example |
|---|---|---|
| `--draft` | draft.json path (required) | `.ae-cli/draft.json` |
| `--xlsx` | draft.xlsx path (required) | `.ae-cli/draft.xlsx` |
| `--name` | Plan name used as output filename prefix (required) | `"AI SaaS Website Tracking Plan"` |

Output lands at `plans/<date>-<plan_name>.xlsx`; `draft.json` is updated with `meta.archived_at`.

After archiving, tell user:

```
✅ Archive complete
File path: plans/<date>-<plan_name>.xlsx

Next: Phase 3 — Upload to AE:
1. Login to AE to get token
2. Get AE project ID
3. Upload plan to AE
```

**⚠️ Hard rule**: Archive must complete before entering Phase 3. Before Phase 3.1's first question, must confirm `meta.archived_at` exists.

---

## Phase 3 — Token & projectId

At the start of Phase 3, tell user:

```
## Phase 3 — Upload Preparation
Next steps:
1. Check active AE host and login status
2. Login to AE to get token if needed
3. AE project ID
```

### 3.1 Check Active AE Host and Login Status

Do not ask for the AE web address first. ae-cli stores an active AE host, and auth commands can use it directly.

First check current auth/host status:

```bash
ae-cli auth status
```

If an active host is configured, save that host to `.ae-cli/draft.json` `meta.host`. If `auth status` reports `authenticated: true`, skip login and continue to project ID.

Only if ae-cli reports no active host / no AE host configured, ask the user:

**"What is the AE web address?"**

After user responds, configure it and save the same value to `.ae-cli/draft.json` `meta.host`:

```bash
ae-cli config set-host <host>
```

If `auth status` reports unauthenticated, use the agent split-flow. Do **not** run blocking `ae-cli auth login` directly from an AI agent.

Step 1 — request an authorization URL and return control to the user:

```bash
ae-cli auth login --no-wait
```

Show the returned `verification_url` to the user and ask them to complete authorization. Keep the returned `device_code` for the next step.

Step 2 — after the user says authorization is complete, finish login:

```bash
ae-cli auth login --device-code <device_code>
ae-cli auth status
```

Do not retry with `ae-cli auth login --host <host>` unless the previous command explicitly failed because no active host was configured. In that case, configure the host first, then restart the split-flow with `--no-wait`.

Common error tips and self-recovery:

| Error | Cause | What to Tell the User |
|---|---|---|
| `Device authorize request failed` | The agent runtime cannot reach the authorization service | Report that no device code was created and include the exact error |
| `not_mac` | A legacy browser-token flow was attempted | Retry the split-flow device-code login; do not ask the user for browser tokens |
| `NO_TAB_FOUND` | A legacy browser-token flow was attempted | Retry the split-flow device-code login; do not ask the user to open Chrome |

Token cached for 20 hours; same host avoids re-auth.

### 3.2 Get AE Project ID and Update Draft

Ask user: **"What is the AE project ID? Go to AE Admin → 'Project Settings' → 'Integration Config' → copy 'Project ID', or check the AE system URL parameter currentProjectId=<id>"**

After user provides projectId, update `.ae-cli/draft.json` `meta.project_id`.

---

## Phase 4 — Upload

At the start of Phase 4, tell user:

```
## Phase 4 — Upload to AE
Checking project's existing plan...
```

### 4.1 Check Project's Existing Plan

Before uploading, check if the project already has a tracking plan:

```bash
AE_LANG=<user_lang> ae-cli tracking plan fetch --project <projectId> > .ae-cli/existing-plan.json
```

Do not add `--host` here unless the user explicitly provides a reachable override for this command. In agent sandboxes, ae-cli can resolve the request host from the sandbox-provisioned `cli-token.json`; passing a stale Kubernetes internal host can bypass that fallback.

**Result assessment**:
- File empty or command error `404` → project has no plan; upload directly
- File has content → project has an existing plan; show summary + **conflict detection**

**When existing plan exists, display**:
```
Project already has a tracking plan:
- Events: XX
- Event properties: YY
- Super properties: ZZ
- User properties: WW

Choose upload mode:
1. Append (keep existing plan, add new events/properties)
2. Replace (delete existing plan, upload new plan)

Append / Replace?
```

---

### 4.2 Append Mode Conflict Detection

When user chooses "Append", **must detect conflicts** (AE merge-by-name has silent discard risk):

**Read two files**:
- Existing plan: `.ae-cli/existing-plan.json`
- New plan: `.ae-cli/draft.json`

**Detect two types of conflicts**:

#### Conflict Type A: Same-name property type mismatch (severe)

AE rule: Same-name properties must have the same type, otherwise reported data will be discarded.

**Detection logic**:

Compare `event_properties` / `common_event_properties` / `user_properties` three property pools:
- For each property in the new plan, find same-name property in existing plan
- If same name but different type → record as `property_type_conflict` (severe error)

**Conflict display**:
```
⚠️ Severe conflict: Same-name property type mismatch

The following properties have different types in the existing plan vs. new plan.
Appending will cause reported data to be discarded:

| Property Name | Existing Type | New Plan Type |
|---|---|---|
| order_amount | number | string |
| vip_level | string | number |

Suggestions:
1. Modify the new plan's property types to match the existing plan
2. Or choose "Replace" mode to redefine types

Continue append (without fixing) / Modify draft / Switch to replace?
```

#### Conflict Type B: Same-name events (advisory)

AE merge-by-name: Same-name events are not overwritten; new-name events are added.

**Detection logic**:

For each event in the new plan, find same-name event in existing plan:
- If same-name event exists → record as `event_exists` (advisory, not an error)

**Conflict display** (advisory only):
```
⚠️ Advisory: The following events already exist in the project (append mode will not overwrite)

- user_login (existing: 2 properties, new plan: 3 properties)
- order_create (existing: 5 properties, new plan: 5 properties)

After append:
- Existing event property associations will not change
- New properties for existing events will not be added
- New events will be added normally

Continue append? yes / no
```

---

### 4.3 Upload Flow

Decide based on conflict detection results:

| Detection Result | Action |
|---|---|
| No conflicts | Upload directly |
| Advisory only (Type B) | Upload after user confirmation |
| Severe conflict (Type A) | User fixes or switches to replace |

Upload command:
```bash
AE_LANG=<user_lang> ae-cli tracking plan upload --project <projectId> --xlsx .ae-cli/draft.xlsx --draft .ae-cli/draft.json [--replace]
```

- **With `--replace`**: Delete existing project plan first then upload (when user chooses "Replace", or severe conflict switches to replace)
- **Without `--replace`**: AE merge-by-name merge (no conflicts, or advisory only with user confirmation to append)

Upload language is controlled locally by `AE_LANG`, `--lang`, or `draft.meta.lang`. Do not call AE user language config APIs and do not use `--switch-lang`. If the xlsx language is wrong, regenerate the xlsx with the intended language before uploading:
```bash
AE_LANG=<user_lang> ae-cli tracking plan draft --in .ae-cli/draft.json --out .ae-cli/draft.xlsx
AE_LANG=<user_lang> ae-cli tracking plan upload --project <projectId> --xlsx .ae-cli/draft.xlsx --draft .ae-cli/draft.json [--replace]
```

On successful upload, prompt user to verify in AE Admin. **Provide the full URL** (tracking plan page URL format: `https://<host>/#/data/plan`).

---

### 4.4 Upload Failure Handling and Auto-fix

Use `--auto-fix` option on upload (enabled by default); CLI auto-detects and fixes errors:

```bash
AE_LANG=<user_lang> ae-cli tracking plan upload --project <projectId> --xlsx .ae-cli/draft.xlsx --draft .ae-cli/draft.json [--replace]
```

#### AE API Error Types

| Error Type | Description | Auto-fix |
|---|---|---|
| `event_prop_display_duplicate` | Event property display name duplicate | ✅ Add distinguishing prefix |
| `complex_event_property_should_has_same_child_property` | Object array sub-property inconsistency | ✅ Fill missing sub-properties |
| `event_name_duplicate` | Event name duplicate | ✅ Remove later duplicates |
| `property_type_conflict` | Property type mismatch (append mode) | ❌ Switch to replace mode |

#### Auto-fix Flow

CLI auto-executes:
1. Upload xlsx to TE
2. Check if `eventErrorMap` has errors
3. Fixable errors → auto-fix draft.json → regenerate xlsx → re-upload
4. Loop up to 3 times; prompt user for manual intervention if exceeded

**Example output**:
```
🔧 Auto-fixing upload errors (attempt 1/3)...
Fixed: Fixed object array sub-property inconsistency, Fixed display name duplicate
[plan-upload] regenerated: .ae-cli/draft.xlsx
```

---

### 4.5 Post-success Actions

After successful upload, prompt user to verify in AE Admin. **Provide the full URL** (tracking plan page URL format: `https://<host>/#/data/plan`)

**Ask about generating tracking code**:

The tracking plan has been uploaded successfully. Would you like to generate tracking code next?

- **Yes** → guide user to use the `ae-generate-tracking-code` skill
- **No** → inform user of plan archive location: `plans/<date>-<plan_name>.xlsx`; can continue anytime

## Prohibitions

- Asking all anchor questions at once
- Skipping Phase 3 and uploading directly
- Manually assembling xlsx bypassing `.ae-cli/draft.json`
- Calling `fetch` AE API directly within the skill — all AE communication must go through project scripts / CLI

---

## Internal Reference (contributor use; not skill usage paths)

- `skills/ae-generate-tracking-plan/references/te-api.md` — AE backend endpoint capture documentation
- `skills/ae-generate-tracking-plan/references/xlsx-schema.md` — xlsx format contract (writer rules + reader compatibility)
- `skills/ae-generate-tracking-plan/references/autotrack-events.md` — SDK auto-track event definitions (per-platform event lists + SDK type mapping)
- `skills/ae-generate-tracking-plan/references/business-dimension-mapping.md` — Business dimension → event/property mapping table (revenue model / functional entries / currency system → injected events)
- `src/plan/types.ts` — Draft TypeScript type definitions
