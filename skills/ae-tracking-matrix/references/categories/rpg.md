# RPG Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / RPG, cached 2026-09-28. Cloud version is authoritative.

## Event Data (#Event Data)

| Event Module | Event Name | Event Display Name | Event Description | Property Name | Property Display Name | Property Type | Property Description |
|---|---|---|---|---|---|---|---|
| Basic Data |  |  |  |  |  |  |  |
|  | ta_app_start | Game Start | Triggered when the game starts, timing begins (automatically collected when client auto-collection is enabled) |  |  |  |  |
|  | ta_app_end | Game Logout | Recorded on game logout, ending the timer (automatically collected when client auto-collection is enabled) | #duration | Online Duration | number |  |
|  | user_account_register | Account Registration | Recorded when a new player account is added |  |  |  |  |
|  | user_account_login | Account Login | Recorded when a player logs into the game |  |  |  |  |
|  | create_role | Create Role | Recorded when a user creates a role |  |  |  |  |
|  | role_login | Role Login | Recorded when a role logs in |  |  |  |  |
| Tutorial | guide_complete | Complete Tutorial | Recorded upon completion of each tutorial step | guide_step | Current Tutorial Step | number | If the tutorial step id is numeric with a size relationship, number is recommended; other forms can use string |
| Payment Module (RMB Consumption) | order_init | Initiate Order | A user initiates a recharge order | order_id | Order ID | string |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item | string | Gift pack, monthly card, 60 diamonds, etc. |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  | order_finish | Order Completed | Order completed | order_id | Order ID | string |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item | string | Monthly card, 60 diamonds, etc. |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | string | WeChat, Alipay, etc. |
| Economy System | buy_item | Item Purchase | Triggered on token purchase | goods_id | Item ID | string | Limited-time gift pack, items, etc. |
|  |  |  |  | goods_num | Item Quantity | number |  |
|  |  |  |  | cost_type | Currency Type | string | Diamond, etc. |
|  |  |  |  | cost_num | Cost Quantity | number |  |
|  | diamond_get | Diamond Acquired | Triggered when diamonds (or tokens pegged to actual currency) are acquired | diamond_get_amount | Diamond Acquisition Amount | number | Changes of key resource tokens such as diamonds and gold can be recorded using independent events or combined into a resource change event |
|  |  |  |  | diamond_change_after | Diamond Amount After Change | number |  |
|  |  |  |  | change_reason | Acquisition/Consumption Reason | string |  |
|  | diamond_consume | Diamond Consumption | Triggered when diamonds (or tokens pegged to actual currency) are consumed | diamond_cost_amount | Diamond Consumption Amount | number |  |
|  |  |  |  | diamond_change_after | Diamond Amount After Change | number |  |
|  |  |  |  | change_reason | Acquisition/Consumption Reason | string |  |
| Resource & Item Changes | resource_change | Resource Change | Recorded when a resource or item changes | item_id | Resource ID | string |  |
|  |  |  |  | item_type | Resource Type | string |  |
|  |  |  |  | change_type | Change Type | string | Acquire, consume |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | change_after | Quantity After Change | number |  |
|  |  |  |  | change_reason | Change Reason | string |  |
| Main Stage | start_dungeon | Stage Challenge | Recorded upon stage challenge settlement | dungeon_id | Stage ID | number | Used to identify and distinguish stages |
|  |  |  |  | is_first_try | Is First Attempt | bool |  |
|  |  |  |  | enemy_fight | Enemy Combat Power | number |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | fairy_id | Carried Fairy | string |  |
|  |  |  |  | holy_id | Carried Holy Relic | string |  |
|  |  |  |  | fight_duration | Battle Duration | number |  |
|  |  |  |  | is_win | Is Victory | bool |  |
| Trial Gameplay | ice_cave | Ice Crystal Cave | Recorded upon Ice Crystal Cave challenge settlement | layers_num | Layer Count | number |  |
|  |  |  |  | is_first_try | Is First Attempt | bool |  |
|  |  |  |  | enemy_fight | Enemy Combat Power | number |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | fairy_id | Carried Fairy | string |  |
|  |  |  |  | holy_id | Carried Holy Relic | string |  |
|  |  |  |  | fight_duration | Battle Duration | number |  |
|  |  |  |  | is_win | Is Victory | bool |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  | is_first_try | Is First Attempt | bool |  |
|  |  |  |  | enemy_fight | Enemy Combat Power | number |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | fairy_id | Carried Fairy | string |  |
|  |  |  |  | holy_id | Carried Holy Relic | string |  |
|  |  |  |  | fight_duration | Battle Duration | number |  |
|  |  |  |  | is_win | Is Victory | bool |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | is_win | Is Victory | bool |  |
|  |  |  |  | score | Own Score Change | number | Change value per match |
|  | speed_hunting | Mage Tower Challenge - Speed Hunting | Reported upon completion of the final stage in each area | area_name | Area Name | string |  |
|  |  |  |  | last_enemy_fight | Enemy Combat Power of Final Stage | number |  |
|  |  |  |  | last_own_fight | Own Combat Power of Final Stage | number |  |
|  |  |  |  | last_fairy_id | Fairy Carried in Final Stage | string |  |
|  |  |  |  | last_holy_id | Holy Relic Carried in Final Stage | string |  |
|  |  |  |  | total_duration | Total Battle Duration | number |  |
|  | mystery | Mage Tower Challenge - Cain's Mystery | Reported upon battle end | dungeon_id | Stage ID | string |  |
|  |  |  |  | enemy_fight | Enemy Combat Power | number |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | fairy_id | Carried Fairy | string |  |
|  |  |  |  | holy_id | Carried Holy Relic | string |  |
|  |  |  |  | fight_duration | Battle Duration | number |  |
|  |  |  |  | damage_value | Cumulative Damage Dealt | number | Damage value in this match |
|  | dragon_des | Dragon Descendants | Reported upon battle end | dungeon_id | Stage ID | string |  |
|  |  |  |  | is_first_try | Is First Attempt | bool |  |
|  |  |  |  | enemy_fight | Enemy Combat Power | number |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | fairy_id | Carried Fairy | string |  |
|  |  |  |  | holy_id | Carried Holy Relic | string |  |
|  |  |  |  | fight_duration | Battle Duration | number |  |
|  |  |  |  | is_win | Is Victory | bool |  |
| Role-Related | role_level_up | Role Level Up | Reported when role level changes | new_level | Role Level Change | number | Level after leveling up |
|  | equipment_up | Equipment Enhancement | Reported upon equipment enhancement upgrade | equipment_part | Enhancement Part | string |  |
|  |  |  |  | equipment_level | Enhancement Level | number | Level after upgrade |
|  | contract_up | Contract Upgrade | Reported upon contract upgrade | contract_level | Contract Level Change | number | Level after upgrade |
|  | holy_active | Holy Relic Activation | Reported upon holy relic activation | holy_id | Holy Relic ID | string |  |
|  | holy_up | Holy Relic Upgrade | Reported upon holy relic upgrade | holy_id | Holy Relic ID | string |  |
|  |  |  |  | holy_level | Holy Relic Level Change | number |  |
|  |  |  |  | holy_total_level | Holy Relic Total Level | number | Combined level of 4 holy relics |
|  | position_change | Class Change | Recorded upon role class change | position_name | New Position | string | Wizard, Archmage, etc. |
|  | gift_up | Talent Upgrade | Reported upon talent upgrade | gift_type | Talent Type | string | 7 types of upgradable talents |
|  |  |  |  | gift_level | Talent Level Change | number |  |
|  |  |  |  | gift_total_level | Talent Total Level | number |  |
|  | magical_unlock | Transfiguration Unlock | Reported upon transfiguration unlock | magical_name | Name of Unlocked Transfiguration | string |  |
|  | rune_up | Rune | Rune level up | rune_name | Rune Name | string | Currently 14 types of runes |
|  |  |  |  | rune_level | Total Level Change of Same Rune Type | number |  |
|  |  |  |  | rune_total_level | Current Total Level of All Runes | number |  |
| Fairy Development | fairy_get | Fairy Acquired | Reported upon obtaining a fairy | fairy_id | Fairy ID | string |  |
|  | fairy_level_up | Fairy Level Up | Reported upon fairy level-up completion; consecutive level-ups may be reported one or multiple times | fairy_id | Fairy ID | string |  |
|  |  |  |  | fairy_level_before | Level Before Upgrade | number |  |
|  |  |  |  | fairy_level_after | Level After Upgrade | number |  |
|  | fairy_train | Fairy Training | Recorded when the fairy training stage advances | fairy_id | Fairy ID | string |  |
|  |  |  |  | train_stage | Training Stage Reached | string | Lower, Middle, Upper, Demon God |
|  | fairy_gift_get | Fairy Exclusive Activation | Reported upon fairy exclusive activation | fairy_id | Fairy ID | string |  |
|  |  |  |  | fairy_gift_name | Exclusive Activation | string |  |
|  | fairy_evolution | Fairy Evolution | Recorded when a fairy evolves and unlocks a new form | fairy_id | Fairy ID | string |  |
|  |  |  |  | image_name | Evolution Completed | string | Newly unlocked form |
| Guild Module (Common) | guild_deed | Guild Action | Recorded upon action; types include join, create, leave | opt | Action Type | number | 1 join / 2 create / 3 leave / 4 position change, etc. |
|  |  |  |  | guild_level | Guild Level | number |  |
|  |  |  |  | guild_id | Guild ID | string |  |
|  |  |  |  | guild_position | Guild Position | string |  |
| Guild Module (Personal) | guild_tech | Guild Technology | Recorded upon upgrade | guild_level | Guild Level | number |  |
|  |  |  |  | tech_id | Technology ID | string |  |
|  |  |  |  | tech_level | Technology Level Change | number |  |
|  | warcraft | Warcraft Invasion | Reported upon Warcraft Invasion challenge end | enemy_fight | Enemy Combat Power | number |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | fairy_id | Carried Fairy | string |  |
|  |  |  |  | holy_id | Carried Holy Relic | string |  |
|  |  |  |  | fight_duration | Battle Duration | number |  |
|  |  |  |  | warcraft_blood | Warcraft HP at Entry | number |  |
|  |  |  |  | damage_value | Cumulative Damage Dealt | number |  |
| World BOSS | colossus | Otherworld Colossus | Reported upon battle end | enemy_fight | Enemy Combat Power | number |  |
|  |  |  |  | own_fight | Own Combat Power | number |  |
|  |  |  |  | fairy_id | Carried Fairy | string |  |
|  |  |  |  | holy_id | Carried Holy Relic | string |  |
|  |  |  |  | fight_duration | Battle Duration | number |  |
|  |  |  |  | damage_value | Cumulative Damage Dealt | number |  |
| Main Quest | main_task | Main Quest | Reported upon main quest completion | task_id | Quest ID | string |  |
| Leaderboard Snapshot | rank_event | Leaderboard Event | Scheduled report every day at midnight for the previous day's leaderboard snapshot, reporting data of the top 100 users in the current leaderboard, one record per user (server-side report) | server_id | Server | string |  |
|  |  |  |  | rank_name | Leaderboard Name | string | Stage ranking, arena score ranking, fairy temple exploration ranking, ice crystal cave layer ranking, speed hunting area ranking, Cain's Mystery damage ranking |
|  |  |  |  | guild_id | Guild ID | string |  |
|  |  |  |  | sort | Rank | number |  |
|  |  |  |  | current_dungeon | Current Stage | number | Recorded for stage ranking |
|  |  |  |  | current_layer | Current Layer | number | Recorded for ice crystal cave layer ranking |
|  |  |  |  | current_score | Current Score | number | Recorded for arena score ranking |
|  |  |  |  | Other leaderboards are similar, use one field to record the score of the current ranking, etc. |  |  |  |

## Common Event Properties (#Common Event Properties)

| Property Category | Property Name | Property Display Name | Property Type | Property Description |
|---|---|---|---|---|
| System Preset | #device_id | Device ID | string | Device ID or device-related ID, such as uuid |
|  | #os | Operating System | string | ios, android |
|  | #os_version | OS Version | string | e.g., Android OS 9 |
|  | #app_version | App Version | string |  |
|  | System preset properties are automatically collected. Preset properties vary slightly across SDKs; see the SDK integration documentation for details. |  |  |  |
| Basic Info | sever_id | Server ID | string | The server to which the player belongs at the time of the event |
|  | user_account | Player Account | string | The player account the role belongs to |
|  | role_level | Role Level | number | Role level at the time of the event |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## User Properties (#User ID System)

| Property Name | Property Display Name | Property Description | Assignment Description |
|---|---|---|---|
| #account_id | Account ID | System Property | In-game role ID, set to the player's role ID under different servers. |
| #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID. No action needed if using the client SDK. |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
