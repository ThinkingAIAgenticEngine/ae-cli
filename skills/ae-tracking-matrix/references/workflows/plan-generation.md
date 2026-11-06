# Tracking Plan Generator

## Use This Skill When

- The user wants to create a new tracking plan, add tracking, refactor tracking, unify naming, or fill in common properties / user properties.
- The user mentions tracking plan, tracking design, tracking plan, event tracking, behavior analysis plan, or the 11-sheet template.
- The user wants to reference internal industry templates, but still produce a unified, standard, importable, and analyzable plan.

## Directory Guide

- Main workflow and hard rules: `references/plan-generation/reference.md`
- Authoritative source for naming and property mapping: `references/naming-dict.md`
- Internal industry template index: `references/plan-generation/template-catalog.md`
- Baseline of universal game base modules: `references/plan-generation/module-baseline.md`
- Excel export input format: `references/plan-generation/export-schema.md`
- Internal experience template assets: `references/categories/*.md`
- Template index generation script: `scripts/build_template_catalog.py`
- Primary Excel path: `scripts/finalize_plan.py`; synchronized delivery: `scripts/prepare_delivery.py`; compatibility alias: `scripts/export_tracking_plan.py`

## Non-Negotiable Rules

1. Any final decision on event name, property name, display name, or type must follow `references/naming-dict.md`.
2. `references/categories/*.md` are internal experience assets, not hard standards. When a template conflicts with the naming dictionary or hard rules, the naming dictionary and hard rules take precedence.
3. DO NOT guess when key business information is missing, especially the revenue model, account system, platform carrier, core gameplay loop, main entry points, and currency system.
4. Present the plan online in the conversation first, so the user can review it in-session. Render it with `scripts/prepare_delivery.py --conversation-only` from the canonical JSON; Markdown is a real conversational deliverable. At this stage do not create an XLSX, an Excel lint log, or a hidden temporary workbook.
5. After the overview review, ask the user to choose exactly one delivery branch: **sync directly to Tracking Management** or **generate a local Excel file**. Do not generate both by default.
6. For the Excel branch only, generate the complete **11-sheet** xlsx from that same JSON using the repaired v2.0.1 `assets/埋点模版.xlsx`: `#用户ID体系`, `#公共事件属性`, `#事件数据`, `#用户数据` plus seven unchanged instruction sheets. Use `scripts/finalize_plan.py --plan <plan.json> --template assets/埋点模版.xlsx --output <NEW.xlsx>` and strict read-only lint. Keep Chinese sheet names, headers and type labels; replies and authored business descriptions follow the user's language.
7. For the direct-sync branch, keep the conversation-only delivery and use `scripts/sync_plan.py` through [Validated Upload](validated-upload.md): inspected `tracking.plan.save_items`, read-only baseline, dry-run, semantic/conflict review and one explicit target/scope confirmation. Never create an Excel intermediate. The [15 manual/model semantic checks](../business-semantic-checks.md) apply to both branches; fixes require confirmation and originals stay unchanged.

## Workflow

### 1. First Determine the Task Type

- New plan: generate a complete 11-sheet plan from scratch.
- Iterate an existing plan: first obtain the current state, then decide whether to add, correct, or rename.

### 2. Information to Complete When Creating a New Plan

If any of the following items is missing, a complete plan cannot be generated directly. **First determine the category, then confirm each item against the corresponding checklist.**

---

#### Games

- **Development carrier / SDK type**: Android, iOS, Unity, Cocos, WeChat mini game, Douyin mini game, etc. (determines the auto-collected event mapping)
- **Account system**: whether it is "single account with multiple roles"; whether `#account_id` uses the role ID or the account ID;
- **Revenue model**: IAA / IAP / hybrid / subscription (determines the mandatory event set)
- **Core gameplay loop**: one sentence on "what the player repeatedly does and what they gain" (determines whether battle / resource / quest modules are mandatory)
- **Currency / resource system**: which soft/hard currencies and key items exist, how each is obtained and consumed, and the change-reason enum
- **Core system entry list**: enumerate the product's main functional modules (e.g. stages, gacha, shop, quests, guild, etc.; list as many as exist)

If the user cannot provide a complete path, at minimum require:

- 1 to 3 analysis scenarios
- The core metric for each scenario

Then break it down as "scenario -> metric -> event/property -> common property" and ask the user to confirm.

> If the user provides too few entries (fewer than 3), proactively ask: "What other core feature entries are there?"

---

#### Non-game Products

- **Development carrier / SDK type**: Android, iOS, WeChat mini program, Web / H5, etc. (determines the auto-collected event mapping)
- **Account system**: no account / single account; the account definition of `#account_id`;
- **Revenue model**: ads (IAA) / subscription / in-app purchase / transaction commission / hybrid (determines the mandatory event set)
- **Core business loop**: one sentence on "the user's path from entry to completing the core value" (e.g. search -> browse -> add to cart -> pay)
- **Main interface key entries**: enumerate the product's main feature pages or entries (e.g. home / search / detail / list / profile, etc.; list as many as exist)

If the user cannot provide a complete path, at minimum require:

- 1 to 3 analysis scenarios
- The core metric for each scenario

Then break it down as "scenario -> metric -> event/property -> common property" and ask the user to confirm.

> If the user provides too few entries (fewer than 3), proactively ask: "What other main feature pages or entries are there?"

### 3. How to Supplement Information for Launched Products

Information priority is:

1. Directly provided by the user
2. Search official sites, app stores, TapTap, Wiki, and other public materials, then relay back to the user for confirmation
3. Reference internal templates to propose candidate modules
4. Industry-general inference

### 4. First Confirm SDK Auto-Collected Events

Using the SDK platform mapping table in `references/plan-generation/reference.md`, first determine the platform group, then list the auto-collected events supported by that platform for the user to confirm. The confirmed auto events:

- Are written out separately in `#事件数据`
- Set `platform` to `client` in the official Chinese `采集端` column E
- By default do not add custom properties, unless the user explicitly requests additional descriptions

### 5. Select Business Modules

First read the category modules, mandatory revenue-model events, and add/remove rules in `references/plan-generation/reference.md`, then decide the module set.

If the user's category is clear:

- First read `references/plan-generation/template-catalog.md`
- Open only the 1 to 2 closest `references/categories/*.md`
- Extract modules, common properties, and representative events
- Then return to `references/naming-dict.md` to normalize naming and types

If the user's category is unclear but it can be judged as a game:

- First use `references/plan-generation/module-baseline.md` to build the base modules
- Then add or remove modules according to the closest industry template

If the user provides a historical plan:

- First reuse existing stable fields
- Then correct obvious conflicts using this skill's conventions

Notes:
1. Even after the user provides content directly, still supplement the user-provided information via method 2; when information conflicts, the user-uploaded content takes precedence.
2. Method 4 must be explicitly marked as "inferred, pending confirmation".
3. DO NOT infer and add module content that the user did not provide based on the product type.

### 6. Extract User Properties

Reference the user-property generation module in `references/plan-generation/reference.md`, and summarize and generate user-property content from the already-generated events and properties.

### 7. How to Handle Iterating an Existing Plan

First obtain the current plan, then classify into three types:

- New event: add a new business action
- New property: add fields to an existing event
- New value: add values to an existing enum property

For these three "extension actions", first output a change-confirmation list and make changes only after confirmation.

The following "non-extension actions" also require an explained change list and explicit confirmation before save-as, accompanied by:

- A before/after mapping of the change
- A compatibility strategy
- Risk warnings

Non-extension actions include:

- Renaming
- Type correction
- Merging or splitting events
- Unifying synonymous properties

### 8. Conversation Review and Delivery Choice

1. Organize the canonical JSON using `references/plan-generation/export-schema.md`; keep confirmed facts distinct from TBC, record Notes/Timezone, metric mapping and provenance.
2. Run `python3 scripts/prepare_delivery.py --plan plan.json --output-dir NEWDIR --language zh --conversation-only` (or `en`) and **show the complete conversation overview**. It writes normalized JSON, conversation Markdown, validation and a pending semantic-review template—no `plan.xlsx` and no `lint.txt`.
3. After the user reviews the overview, ask: “直接同步至数数埋点管理页面，还是生成本地 Excel 文件？” Use equivalent wording in the user's language. Do not assume a default and do not produce both.
4. **Direct sync:** keep the same conversation-only directory and enter `references/workflows/validated-upload.md` with `scripts/sync_plan.py`. Build the structured payload from canonical JSON, inspect the deployed contract, read the baseline and dry-run before semantic/conflict review. No Excel is generated at any step.
5. **Local Excel:** only after this choice, generate the full 11-sheet workbook with `scripts/finalize_plan.py --plan <plan.json> --template assets/埋点模版.xlsx --output <NEW.xlsx>` and run strict read-only lint. A machine pass is not a semantic pass.
6. If repair is needed, show a before/after diff and await confirmation. Propagate approved corrections to canonical JSON and regenerate the conversation plus the selected branch artifacts to prevent drift. Return actual counts, first/final validation results and remaining TBC. Remote writes always require the later explicit target/scope confirmation.

## Design Rules

### Event And Property Naming

- Event names and property names are uniformly `snake_case`
- Event names are globally unique; do not create multiple synonymous names for the same business action
- Event names start with a letter and may contain only: letters (case-sensitive), digits, and underscores "_", with a maximum length of 50 characters
- Properties must start with a letter and may contain only: letters (case-insensitive), digits, and underscores "_", with a maximum length of 50 characters
- Properties reused across events must reuse the same property name
- Check `references/naming-dict.md` first; if an existing mapping exists, reuse it directly

### Type And Object Rules

- Property name, display name, and type must correspond one-to-one
- Amounts and durations must state their unit

**When to use an object group (all three conditions must be met; otherwise use a list or a plain property)**

1. An event property / user property needs to record multiple entities of the same kind
2. Each entity needs to record >= 2 properties (otherwise a list suffices)
3. The number of entities is not fixed (when it is fixed at 1, use a plain property)

> For the sub-property type restrictions of object groups, the writing format (parent row / child row / dot separation), reporting constraints (empty-value handling, prefix rules, ID as Value), and TE system quantity limits, see `references/plan-generation/reference.md §6 Object Group Rules`, and follow them when generating.

**When the three conditions are met, an object group must be used; it cannot be replaced by the following:**

- DO NOT concatenate multiple entities into a text string (e.g. `"hero_ids": "001,002,003"`)
- DO NOT split multiple detail rows into multiple events (e.g. `item_get_1` / `item_get_2`)

**Paired events require correlation, not forced isomorphism:**

- Start/result events share a stable correlation key (e.g. `stage_attempt_id`) and relevant context. They do not need identical object-group structures or every property copied to both events.
- Reuse the same parent name only when its meaning and child schema genuinely match. Different business structures use different parent names; never invent filler fields to force reuse.

### Collection Side Rules

Use `platform` in canonical JSON and the existing official `采集端` column E, with `client` / `server` / `client,server`. Never append an English Collection Platform column. Preserve remarks in existing description/assignment fields.

- SDK auto-collection, device activation and pure UI behavior: normally `client`.
- Payment/economy/settlement: the confirmed authoritative source, normally `server` when a server exists. Do not invent a server for a client-only game.
- Dual-side collection is exceptional: confirm one authoritative business fact plus `#uuid`/request-ID dedup and retry semantics. Related but different start/result facts need correlation, not duplicate reporting.

## Output Contract

### Final Deliverable

- Always provide the reviewable conversation overview first. `python3 scripts/prepare_delivery.py --plan plan.json --output-dir NEWDIR --language en --conversation-only` (or `zh`) produces normalized JSON, conversation Markdown, validation and a pending semantic-review template, with no workbook or Excel lint.
- After overview Q&A, deliver **only the user's selected branch**: direct structured sync with no Excel, or a complete local 11-sheet workbook from the same JSON. The renderer supports zh/en interface labels; authored business text is preserved, not automatically translated.
- Recommended Excel name: `{product or project name}_tracking_plan_{YYYYMMDD}.xlsx`; `scripts/finalize_plan.py` is the direct template-fill path and `scripts/export_tracking_plan.py` is its compatibility alias. `scripts/sync_plan.py` owns the no-Excel structured branch.
- Review actual conversation content in-session, not merely a download link. Keep Notes/Timezone, actual counts, change log and TBC visible. Pending semantic review is not remote-write ready.

### 1. `#用户ID体系`

- Provide the account-system choice
- Clarify the assignment logic for `#account_id` and `#distinct_id`
- For multi-role game scenarios, prefer "role ID as `#account_id`"

### 2. `#公共事件属性`

- Keep only fields carried by most events
- Align with the common property dictionary in `references/naming-dict.md`
- For scenario fields such as ad attribution, level, server, and balance, note when they are mandatory

### 3. `#事件数据`

Each event must at least clearly state:

- Event name
- Event display name
- Precise trigger timing
- Owning module (event tag column)
- Collection-side responsibility (`platform`: `client` / `server` / `client,server`; Chinese `采集端` column E)
- Custom properties and types

When there are 10 or fewer enum values, write the enum directly in the description; when there are more than 10, suggest attaching a dimension table.

### 4. `#用户数据`

- `user_setOnce`: first registration, first payment, first channel, etc.
- `user_set`: current level, current balance, last login time, etc.
- `user_add` or `user_set`: cumulative values must state the update rule

## Template Usage Rules

Template assets are positioned as "industry knowledge" and "ready-made experience samples", not standard answers. Usage:

1. First read `references/plan-generation/template-catalog.md` to pick a template; do not blindly open all Excel files.
2. Only extract modules, common properties, and event families highly relevant to the current product.
3. Legacy field names, legacy types, and legacy collection-side labels in templates must be re-validated against `references/naming-dict.md` and `references/plan-generation/reference.md`.
4. If multiple templates are close, prefer the one closest to the revenue model and core loop; use the other template only to fill missing modules.
5. When outputting, distinguish "template borrowing" from "user-confirmed requirements"; do not disguise template content as confirmed facts.

Recommended priority:

- User-confirmed facts
- User's existing historical plan
- `references/naming-dict.md`
- `references/plan-generation/reference.md`
- `references/plan-generation/module-baseline.md`
- `references/categories/*.md`

## Final Self-Check

Before delivery, at least check:

- Whether any event name or property name still contains Chinese, spaces, or a non-letter leading character
- Whether duplicate event names or synonymous events coexist
- Whether the same property name maps to multiple display names or multiple types
- Whether the mandatory IAA and IAP events are complete
- Whether paired events have stable correlation keys without forced business-schema isomorphism
- E1: explicit `ad_fail` and ad revenue marked requires ad-platform callback / TBC if unavailable
- E2: `first_media_source` / `first_campaign` use first-touch semantics, distinct from current/campaign snapshots
- Actual event counts agree between JSON, Excel and report; replies/business explanations follow the user's language
- Whether amount, duration, and balance fields state their unit
- Whether enum values, abnormal values, and empty-value fallbacks are clearly written
- Whether the user-property update methods are executable

## When To Open Which File

- When SDK auto-collection, types, object groups, or revenue-model rules are needed: `references/plan-generation/reference.md`
- When unifying event names, property names, display names, and types: `references/naming-dict.md`
- When picking an industry template: `references/plan-generation/template-catalog.md`
- When a starting point of "games get a base first, then expand by category" is needed: `references/plan-generation/module-baseline.md`
- For conversation and delivery choice: `references/plan-generation/export-schema.md` + `scripts/prepare_delivery.py --conversation-only`; then `scripts/sync_plan.py` for direct sync or `scripts/finalize_plan.py` for the selected Excel branch
- Only after a template has been selected, open the corresponding `references/categories/*.md`
