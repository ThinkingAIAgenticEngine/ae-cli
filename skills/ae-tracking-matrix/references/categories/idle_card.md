# Idle Card Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / Idle Card, cached 2026-09-28. Cloud is the authoritative version.

> **Known cache gap (v2.0.1):** this file contains only common-property and identity tables, not an event list or a user-property list. It is not an independently complete Idle Card template. Compose the [Idle template](idle_game_tracking_plan_template.md) + [Card template](card_game_tracking_plan_template.md), select only user-confirmed modules, and record missing business facts as TBC; do not fabricate an Idle Card event catalog.

## Common Event Properties (cached source content)

| Property Name (Required) | Display Name | Property Type (Required) | Property Description |
|---|---|---|---|
| channel | Channel | text | e.g. taptap, appstore, etc. |
| nick_name | Nickname | text |  |
| tmp_account_level | Current Account Level | number |  |
| tmp_vip_level | Current VIP Level | number |  |
| tmp_ability_level | Current Ability Level List | list | ['Attack Level','HP Level','HP Recovery Speed Level',...] |
| tmp_main_id | Current Main Storyline Stage Progress | text |  |
| tmp_power | Current Combat Power | number |  |
| tmp_guild | Current Guild | text |  |
| tmp_diamond | Current Diamonds | number |  |
| tmp_gold | Current Gold | number |  |

## User ID System (cached source content)

| Game Type | Property Name | Display Name | Property Description | Assignment Description |  |  | Remarks |
|---|---|---|---|---|---|---|---|
| Single Account Single Role | #account_id | Account ID | System Property | Set as player's unique account ID |  |  | ✅ Choose this option |
|  | #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID. If using client SDK, no action needed |  |  |  |
