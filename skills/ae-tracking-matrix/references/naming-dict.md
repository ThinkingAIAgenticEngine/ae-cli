# Naming Dictionary & Validation Matrix

> Purpose: prevent one concept from having multiple names, and eliminate one-to-many conflicts across property name ↔ display name ↔ type.
> Before adding a property/event, consult this table; existing mappings must be reused — do not coin synonyms.
> Legacy names, legacy types and legacy display names in the industry template assets are reference-only; this file is authoritative.

---

## 1. Standard Event Verb Table

| Verb Suffix | Meaning | Correct Example | Forbidden Form |
| ------------- | --------- | -------------------------------- | ---------------------------------- |
| `_show`       | Page/dialog impression | `shop_show` | `shop_display`, `shop_view` |
| `_click`      | User click | `hero_click` | `hero_tap`, `hero_press` |
| `_start`      | Flow start | `battle_start` | `battle_begin`, `battle_launch` |
| `_end`        | Flow end | `battle_end` | `battle_finish`, `battle_over` |
| `_win`        | Battle victory | `battle_win` | `battle_success`, `battle_victory` |
| `_fail`       | Battle loss / flow failure | `battle_fail` | `battle_lose`, `battle_defeat` |
| `_levelup`    | Level up | `hero_levelup` | `hero_upgrade`, `hero_level_up` |
| `_get`        | Gain asset/item | `asset_get`, `item_get` | `asset_receive`, `item_gain` |
| `_consume`    | Consume asset/item | `asset_consume`, `token_consume` | `asset_use`, `token_spend` |
| `_buy`        | Shop purchase | `shop_buy` | `shop_purchase`, `item_buy` |
| `_claim`      | Claim reward | `reward_claim` | `reward_receive`, `reward_get` |
| `_open`       | Open page/entry | `shop_open` | `shop_enter`, `shop_visit` |
| `_enter`      | Enter gameplay scene | `season_enter` | `season_join`, `season_start` |
| `_complete`   | Task/tutorial completion | `guide_complete` | `guide_finish`, `guide_done` |
| `_settlement` | Settlement | `season_points_settlement` | `season_points_settle` |

---

## 2. Reusable Property Mappings — Scope Must Be Confirmed

> Reuse a mapping only for the same business meaning. This is not a mandatory global common-property list: promote a field only when it applies to nearly all events, is stable at trigger time, and is a global analysis dimension. Display-name examples here are English; use one consistent user-language display name per validation domain. Event + common properties share a domain; user properties are validated independently, with semantic cross-domain checks during review.
> Attribution fields (`media_source`, `campaign`, `first_media_source`, `first_campaign`) default to attribution-event properties or user properties, **not global common event properties**. Preserve the distinction between first-touch, current attribution and per-event campaign snapshots.

| Property Name | Standard Display Name | Type | Description/Unit |
| -------------- | ------- | --- | ----------------- |
| `channel`      | Channel | Text | Acquisition channel |
| `media_source` | Media Source | Text | Attribution-event source snapshot (AF/Adjust); not a first-touch synonym or global common field |
| `campaign` | Campaign | Text | Attribution-event campaign snapshot; not first campaign |
| `first_media_source` | First Media Source | Text | First confirmed attribution, user_setOnce; E2 required |
| `first_campaign` | First Campaign | Text | First confirmed campaign, user_setOnce; E2 required |
| `current_media_source` | Current Media Source | Text | Latest confirmed attribution, user_set if needed |
| `current_campaign` | Current Campaign | Text | Latest confirmed campaign, user_set if needed |
| `active_days`  | Active Days | Number | Cumulative days since registration |
| `server_id`    | Server ID | Text | Server the player is on |
| `tmp_level`    | Player Level | Number | Current level |
| `nick_name`    | Nickname | Text | Character nickname |
| `tmp_diamond`  | Diamond Balance | Number | Current paid-currency balance |
| `tmp_gold`     | Gold Balance | Number | Current soft-currency balance |
| `season_id`    | Season ID | Text | Current season identifier |
| `first_cpm`    | First Ad CPM | Number | First-value user property if a real callback supplies it; currency/unit confirmed, otherwise TBC; not globally common |
| `tag1`         | Ad Tag 1 | Text | IAA product tiering tag |

---

## 3. Standard Custom Property Dictionary

> Cross-event reused properties (e.g. `battle_type`, `item_id`) must follow the table below; do not rename across events.

### 3.1 General Properties

| Property Name | Standard Display Name | Type | Description |
| --------------- | ----- | --- | ------------------------------ |
| `is_first`      | Is First Time | Boolean | True on first trigger |
| `duration`      | Event Duration | Number | Unit: seconds (use `duration_ms` for milliseconds) |
| `level`         | Current Level | Number | Level snapshot at trigger |
| `level_before`  | Level Before | Number | Levelup events only |
| `fail_reason`   | Fail Reason | Text | Failure/error description |
| `order_id`      | Order ID | Text | Recharge/transaction order number |
| `pay_amount`    | Pay Amount | Number | Unit: fen (CN) / cents (overseas) |
| `currency_type` | Currency Type | Text | ISO 4217 code, e.g. CNY/USD |
| `payment_name`  | Payment Method | Text | WeChat Pay / Alipay / AppStore, etc. |
| `payment_type`  | Payment Type | Text | Monthly card / gift pack / direct purchase, etc. |
| `activity_type` | Activity Type | Text | Enum of activity categories |
| `activity_id`   | Activity ID | Text | Suggest linking to a dimension table |

### 3.2 Game Battle

| Property Name | Standard Display Name | Type | Description |
| ------------------- | ------ | --- | ------------------------------------------ |
| `battle_type`       | Battle Type | Text | Enum: main / pvp / dungeon / event, etc. |
| `battle_id`         | Battle ID | Text | Unique id of this battle |
| `stage_id`          | Stage ID | Text | Suggest linking to a dimension table |
| `battle_result`     | Battle Result | Text | win / fail / draw |
| `battle_duration`   | Battle Duration | Number | Unit: seconds |
| `enemy_power`       | Enemy Power | Number |  |
| `my_power`          | My Power | Number |  |
| `lineup_info`       | My Lineup Info | Object Group | Sub-properties: hero_id / troop_type / power, etc.; include only where semantically needed. Paired events share a key, not a forced lineup schema |
| `enemy_lineup_info` | Enemy Lineup Info | Object Group | Same as above |

### 3.3 Game Resources / Items

| Property Name | Standard Display Name | Type | Description |
| ---------------- | ------ | --- | -------------------------------- |
| `token_type`     | Currency Type (in-game) | Text | Enum: diamond / gold / alliance_point, etc. |
| `token_amount`   | Currency Amount | Number | Amount gained/consumed this time |
| `token_balance`  | Currency Balance | Number | Balance after the operation |
| `item_id`        | Item ID | Text | Suggest linking to a dimension table |
| `item_num`       | Item Count | Number |  |
| `get_item_info`  | Items Gained Detail | Object Group | Sub-properties: item_id, item_num; required when multiple items involved |
| `cost_item_info` | Items Consumed Detail | Object Group | Sub-properties: item_id, item_num; required when multiple items involved |
| `source`         | Source | Text | Enum of currency/item source channels |
| `consume_type`   | Consume Purpose | Text | Enum of currency/item consumption purposes |

### 3.4 Game Heroes / Characters

| Property Name | Standard Display Name | Type | Description |
| ------------ | ----- | --- | ---------------------------- |
| `hero_id`    | Hero ID | Text | Unique hero id within an object group |
| `hero_level` | Hero Level | Number |  |
| `hero_star`  | Hero Star | Number |  |
| `hero_power` | Hero Power | Number |  |
| `troop_type` | Troop Type | Text | Enum: infantry / cavalry / archer, etc. |
| `troop_num`  | Dispatched Troops | Number | Number of soldiers dispatched this time |
| `pool_type`  | Pool Type | Text | Enum of gacha / construction pool types |
| `draw_count` | Draw Count | Number | Draws this round (1-draw / 10-draw) |

### 3.5 Game Season

| Property Name | Standard Display Name | Type | Description |
| ----------------- | ----- | --- | ---------------------- |
| `season_id`       | Season ID | Text | Common property; auto-carried by all season events |
| `season_rank`     | Season Rank | Number | Current / final rank this season |
| `season_points`   | Season Points | Number | Current / settlement points |
| `match_id`        | Match ID | Text | Unique id of this match |
| `settlement_type` | Settlement Type | Text | Enum: daily / final |

### 3.6 Ad (IAA)

| Property Name | Standard Display Name | Type | Description |
| --------------- | ----- | --- | --------------------------------------------- |
| `ad_type`       | Ad Type | Text | Enum: rewarded / interstitial / banner / splash / native |
| `ad_placement`  | Ad Placement | Text | Ad placement identifier |
| `ad_network`    | Ad Network | Text | admob / facebook / unity, etc. |
| `reward_type`   | Reward Type | Text | Content type of the rewarded-ad reward |
| `reward_amount` | Reward Amount | Number |  |
| `revenue_value` | Ad Revenue | Number | Unit: cents |
| `ecpm`          | eCPM | Number | Unit: cents |
| `is_filled`     | Is Filled | Boolean | Whether the ad request was filled |

---

## 4. Forbidden Synonym Table

> The pairs below are synonym pairs that historically caused conflicts. **The right column is the forbidden form**; use the left column.

| Standard Word (must use) | Forbidden Synonyms |
| ----------------- | -------------------------------------------------------------------------- |
| `battle_win`      | `battle_success`, `battle_victory`, `battle_pass` |
| `battle_fail`     | `battle_lose`, `battle_defeat`, `battle_defeat_result` |
| `item_get`        | `item_receive`, `item_gain`, `item_add` |
| `item_consume`    | `item_use`, `item_spend`, `item_cost` |
| `token_get`       | `token_receive`, `currency_get`, `coin_receive` (except for legacy plans that already have `coin_receive`) |
| `token_consume`   | `token_use`, `currency_consume`, `coin_consume` |
| `reward_claim`    | `reward_receive`, `reward_get`, `reward_collect` |
| `shop_open`       | `shop_enter`, `shop_visit`, `mall_open` |
| `activity_attend` | `activity_join`, `activity_participate`, `festival_activities`, `activity` |
| `guide_complete`  | `guide_finish`, `guide_done`, `guide_step_complete` |
| `levelup` (suffix) | `_upgrade`, `_level_up`, `_upgrade_level` |

---

## 5. Property Name — Display Name — Type Validation Matrix (Established Mappings)

> This table is the authoritative source for "confirmed mappings". Before adding a new property, check whether an entry already exists; if so, reuse it; otherwise add a new row.

| Property Name | Unique Display Name | Unique Type | Note |
| ------------------- | ------ | ---- | ---------------------------------------- |
| `is_first`          | Is First Time | Boolean |  |
| `level`             | Current Level | Number |  |
| `level_before`      | Level Before | Number |  |
| `order_id`          | Order ID | Text |  |
| `pay_amount`        | Pay Amount | Number | Unit: fen / cents |
| `currency_type`     | Currency Type | Text | ISO 4217 |
| `payment_name`      | Payment Method | Text |  |
| `payment_type`      | Payment Type | Text |  |
| `battle_type`       | Battle Type | Text |  |
| `battle_id`         | Battle ID | Text |  |
| `battle_result`     | Battle Result | Text |  |
| `battle_duration`   | Battle Duration | Number | Seconds |
| `stage_id`          | Stage ID | Text |  |
| `token_type`        | Currency Type (in-game) | Text | Note the distinction from currency_type: token_type refers to in-game virtual currency |
| `token_amount`      | Currency Amount | Number |  |
| `token_balance`     | Currency Balance | Number |  |
| `item_id`           | Item ID | Text |  |
| `item_num`          | Item Count | Number |  |
| `source`            | Source | Text |  |
| `consume_type`      | Consume Purpose | Text |  |
| `hero_id`           | Hero ID | Text | Object-group sub-property |
| `hero_level`        | Hero Level | Number |  |
| `hero_star`         | Hero Star | Number |  |
| `hero_power`        | Hero Power | Number |  |
| `troop_type`        | Troop Type | Text |  |
| `troop_num`         | Dispatched Troops | Number |  |
| `pool_type`         | Pool Type | Text |  |
| `draw_count`        | Draw Count | Number |  |
| `season_id`         | Season ID | Text |  |
| `season_rank`       | Season Rank | Number |  |
| `season_points`     | Season Points | Number |  |
| `match_id`          | Match ID | Text |  |
| `settlement_type`   | Settlement Type | Text |  |
| `ad_type`           | Ad Type | Text |  |
| `ad_placement`      | Ad Placement | Text |  |
| `ad_network`        | Ad Network | Text |  |
| `reward_type`       | Reward Type | Text |  |
| `reward_amount`     | Reward Amount | Number |  |
| `revenue_value`     | Ad Revenue | Number | Cents |
| `ecpm`              | eCPM | Number | Cents |
| `is_filled`         | Is Filled | Boolean |  |
| `activity_type`     | Activity Type | Text |  |
| `activity_id`       | Activity ID | Text |  |
| `fail_reason`       | Fail Reason | Text |  |
| `channel`           | Channel | Text |  |
| `media_source`      | Media Source | Text | Attribution-event snapshot, not globally common |
| `campaign` | Campaign | Text | Attribution-event snapshot |
| `first_media_source` | First Media Source | Text | First-touch user_setOnce; E2 |
| `first_campaign` | First Campaign | Text | First-touch user_setOnce; E2 |
| `current_media_source` | Current Media Source | Text | Latest confirmed user_set if needed |
| `current_campaign` | Current Campaign | Text | Latest confirmed user_set if needed |
| `active_days`       | Active Days | Number |  |
| `server_id`         | Server ID | Text |  |
| `tmp_level`         | Player Level | Number |  |
| `nick_name`         | Nickname | Text |  |
| `lineup_info`       | My Lineup Info | Object Group |  |
| `enemy_lineup_info` | Enemy Lineup Info | Object Group |  |
| `get_item_info`     | Items Gained Detail | Object Group |  |
| `cost_item_info`    | Items Consumed Detail | Object Group |  |

---

## 6. How to Use This File

1. **Before adding a property**: search Section 5 first to see whether a property with the same business meaning already exists
  - Yes → reuse it directly; do not create a synonym
  - No → add a row; fill property name / display name / type all together; all future plans follow it
2. **Self-check for conflicts**: via script or manually, cross-check every property name in the plan against Section 5 to confirm no one-to-many
3. **Category adaptation**: when swapping category-specific words such as hero / warship / general, **only change the display name**; keep the property name in a general form (e.g. `hero_id` in Azur Lane corresponds to "Warship ID"; display name becomes "Warship ID", but the property name stays as `hero_id`)
