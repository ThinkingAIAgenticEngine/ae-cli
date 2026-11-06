# Roguelike Game Tracking Plan (Local Cache)

> Source: Feishu "Roguelike tracking plan template", translated 2026-10-14. Cloud original is authoritative.

## Sheet1 — Property Dictionary

| Property Name (required) | Property Display Name | Property Type (required) |
| --- | --- | --- |
| guild_boss_lv | Boss Level | Number |
| guild_boss_type | Boss Type | Text |
| active | Active Points After Operation | Number |
| online_time | This-Session Online Duration | Number |
| ad_num | Ads Watched This Battle | Number |
| item_id | Changed Item ID | Text |
| item_name | Changed Item Name | Text |
| item_only_id | Changed Item Unique ID | Text |
| change_type | Change Type | Text |
| change_num | Change Count | Number |
| change_after | Count After Change | Number |
| reason | Operation Action | Text |
| reason | Operation Reason | Text |
| achievement_sub_id | Achievement ID | Number |
| achievement_id | Achievement Category | Text |
| honor_num | Achievement Points | Number |
| achievement_name | Achievement Name | Text |
| fail_reason | Recharge Failure Reason | Text |
| skills.arise_num | Appearance Count | Number |
| skill_select.skill_id | Appearing Skill ID | Text |
| skill_select.skill_lv | Appearing Skill Level | Number |
| initiative_skills | Ultimate Skill Usage Count | Number |
| ad_income | Single Ad Revenue | Number |
| add_num | Current Pool Draw Count | Number |
| pagoda_rank | Current Rank | Number |
| current_online_num | Current Online Players | Number |
| guild_position | Current Position | Text |
| item_gain.item_id | Item ID | Text |
| item_gain.item_num | Item Count | Number |
| foe_num | Enemy Count | Number |
| foe_power | Enemy Power | Number |
| order_id | Order ID | Text |
| code | Redemption Code | Text |
| code_content_list | Redemption Code Content | Object Group |
| code_id | Redemption Code Type ID | Text |
| send_time | Send Time | Time |
| home_id | Room ID | Text |
| pagoda_type | Spirit Tower Type | Text |
| task_num | Achievement Value Reached | Number |
| guild_rolle_hot | Personal Total Activity | Number |
| guild_id | Guild ID | Text |
| guild_level | Guild Level | Number |
| guild_name | Guild Name | Text |
| guild_role_num | Guild Member Count | Number |
| guild_power | Guild Power | Number |
| map_id | Stage ID | Number |
| card_type | Stage Mode | Text |
| map_max | Stage Max Wave | Number |
| ad_id | Ad ID | Text |
| ad_id_date | Ad Identifier ID | Text |
| ad_positon | Ad Position | Text |
| ad_type | Ad Type | Text |
| friend_id | Friend ID | Text |
| guild_master | Guild Master ID | Text |
| activity_name | Activity Name | Text |
| done_num | Activity Total Progress | Number |
| item_gain | Items Gained List | Object Group |
| skill_id | Skill ID | Text |
| skill_type | Skill Category | Text |
| skill_lv | Skill Level | Number |
| use_count | Role Cumulative Successful Code Redemptions | Number |
| add_time | Role Cumulative Online Duration | Number |
| level_up_time | Online Duration Since Last Levelup | Number |
| main_work_time | Online Duration Since Last Main Quest | Number |
| lottery_id | Gacha Pool | Text |
| add_day | Cumulative Login Days | Number |
| all_output | Cumulative Damage Dealt | Number |
| gift_id | Gift ID | Text |
| chatting_content | Chat Content | Text |
| chatting_channel | Chat Channel | Text |
| diy_dress | Character Customization | Object Group |
| server_id | Server ID | Number |
| task_id | Task ID | Number |
| task_type | Task Type | Text |
| task_name | Task Name | Text |
| skill_select | Three-Choice Skill Selection | Object Group |
| all_output_rank | Damage Rank | Number |
| store_type | Shop Type | Text |
| store_refresh_cost_num | Shop Refresh Item Cost Count | Number |
| store_refresh_cost_type | Shop Refresh Item Cost Type | Text |
| goods_id | Goods ID | Text |
| goods_name | Goods Name | Text |
| last_out_time | Last Game Exit Time | Time |
| device_activate_time | Device Activation Time | Time |
| get_friend_type | Friend Request Type | Text |
| fail_wave | Wave When Failed | Number |
| return | Use Result | Text |
| use_stamina | Stamina Used | Number |
| hold_up | Matched Forbidden Word Library | Text |
| is_first_pay | Is First Recharge | Boolean |
| is_first_login | Is First Login | Boolean |
| skip | Is Skipped | Boolean |
| skill_select.isChoose | Is Chosen | Text |
| voluntarily | Is Auto Battle | Text |
| goods_num | Quantity | Number |
| reload_num | Skill Reroll Count | Text |
| reload_type | Reroll Type | Text |
| chat_server_id | Private Chat Partner Server ID | Text |
| chat_role_id | Private Chat Partner Player ID | Text |
| now_wave | Current Room | Number |
| pagoda_level | Challenge Floor | Number |
| pass_wave | Pass Wave | Number |
| pass_id | Battle Pass ID | Text |
| system_id | System ID | Number |
| system_name | System Name | Text |
| cost_type | Consumed Item Type | Text |
| item_use | Items Consumed List | Object Group |
| cost_num | Consumption Count | Number |
| skills.skill_id | Carried Skill ID | Text |
| skills.lv | Carried Skill Level | Number |
| skills | Carried Skill Info | Object Group |
| result_star | Star Rating | Number |
| gender | Gender | Text |
| skills.select_num | Selection Count | Number |
| guide_id | Tutorial Step | Number |
| guide_step | Tutorial Category | Text |
| hero_id | Hero ID | Text |
| hero_state | Hero Current Attributes | Object Group |
| hero_level | Hero Level | Number |
| hero_gian | Hero Acquisition Method | Text |
| hero_skill | Hero Skill List | Object Group |
| hero_name | Hero Name | Text |
| hero_type | Hero Attribute | Text |
| hero_only_id | Hero Unique ID | Text |
| hero_rarity | Hero Rarity | Text |
| hero_star | Hero Star | Number |
| hero_power | Hero Power | Number |
| hero_equip | Hero Equipment | Object Group |
| have_hero | Owned Hero Count | Number |
| subject | Mail Subject | Text |
| content | Mail Content | Text |
| monthpass_id | Monthly Card Type | Text |
| #duration | Online Duration | Number |
| fight_id | Battle ID | Number |
| combat_time | Battle Duration (sec) | Number |
| result | Battle Result | Text |
| chapter_id | Chapter ID (World Map) | Number |
| currency_type | Payment Currency | Text |
| pay_method | Payment Method | Text |
| pay_amount | Payment Amount | Number |
| payment_id | Payment Item ID | Number |
| payment_name | Payment Item Name | Text |
| career | Career/Class | Text |
| equip_id | Equipment ID | Text |
| equip_level | Equipment Level | Number |
| equip_gian | Equipment Acquisition Method | Text |
| equip_name | Equipment Name | Text |
| equip_quality | Equipment Quality | Text |
| equip_add | Equipment Attributes | Object Group |
| equip_only_id | Equipment Unique ID | Text |
| resource_id | Resource ID/Name | Text |

## Integration Must-Know

See [`../standard-base/integration_must_know.md`](../standard-base/integration_must_know.md).

## Tracking Notes

See [`../standard-base/tracking_notes.md`](../standard-base/tracking_notes.md).

## #User ID System

| Game Type | Property Name | Display Name | Note | Assignment |
| --- | --- | --- | --- | --- |
| Single Account Single Role | #account_id | Account ID | System property | Set as player account ID |
|  | #distinct_id | Distinct ID | System property | Device-related ID or in-business distinct ID. Not needed when using the client SDK. |
| Single Account Multi Role | #account_id | Account ID | System property | Set as role ID. The role's parent account ID is stored as a role custom property (unique across the whole project). |
|  | #distinct_id | Distinct ID | System property | Same as above. |

## #Event Data

| Event Name (required) | Event Display Name | Event Description | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install | Auto-reported after client auto-collection is enabled. See official docs. If you need to set common properties or a custom distinct ID, call setSuperProperties() or identify() before enabling auto-collection. |  |  |  |  |
| ta_app_start | App Start | Auto-reported after client auto-collection is enabled |  |  |  |  |
| ta_app_crash | App Crash | Auto-reported after client auto-collection is enabled |  |  |  |  |
| ta_app_end | App End | Auto-reported after client auto-collection is enabled | #duration | Online Duration | Number |  |
| new_device | Device Activation | Reported on first device activation | device_activate_time | Device Activation Time | Time | First-event time; see docs. |
| register | User/Account Register | Reported on (account) registration complete |  |  |  |  |
| login | User/Account Login | Reported after (account) login success |  |  |  |  |
| logout | User/Account Logout | Reported after (account) logout success |  |  |  |  |
| create_role | User Register (Role) | Reported when the user completes role creation | gender | Gender | Text | Omit if not applicable |
|  |  |  | career | Career/Class | Text | Class chosen at registration |
|  |  |  | diy_dress | Character Customization | Object Group | Dress/customization list at registration |
| role_login | User Login | Reported after login complete | is_first_login | Is First Login | Boolean | Optional |
|  |  |  | add_day | Cumulative Login Days | Number |  |
|  |  |  | last_out_time | Last Game Exit Time | Time |  |
| role_logout | User Logout | Recorded on exiting the game / server disconnect | add_day | Cumulative Login Days | Number |  |
|  |  |  | online_time | This-Session Online Duration | Number | Seconds |
|  |  |  | add_time | Role Cumulative Online Duration | Number | Seconds since role creation |
| level_up | Main Character Levelup | Reported on main character levelup | level_up_time | Online Duration Since Last Levelup | Number | Seconds |
| vip_levelup | VIP Levelup | Reported on VIP levelup |  |  |  |  |
| monthpass_activate | Monthly Card Activation | Reported on monthly-card activation | monthpass_id | Monthly Card Type | Text |  |
| pass_activate | Battle Pass Activation | Reported on battle-pass activation | pass_id | Battle Pass ID | Text |  |
| repetition_work | Daily/Weekly Task | Reported on daily/weekly task completion | reason | Operation Action | Text | claim task reward, claim activity reward (record if there is an active-points gift) |
|  |  |  | task_type | Task Type | Text | Daily task, weekly task |
|  |  |  | task_name | Task Name | Text |  |
|  |  |  | task_id | Task ID | Number |  |
|  |  |  | item_gain | Items Gained List | Object Group | [{item_id:1001, item_num:1}, {..}..] |
|  |  |  | item_gain.item_id | Item ID | Text | Sub-property of the object group |
|  |  |  | item_gain.item_num | Item Count | Number | Sub-property of the object group |
|  |  |  | active | Active Points After Operation | Number |  |
| main_work | Main / Beginner Quest | On quest achieved or reward claimed | reason | Operation Action | Text | task_achieved, task_reward_claim |
|  |  |  | task_type | Task Type | Text | Main, Side |
|  |  |  | task_name | Task Name | Text | e.g. "Role reaches level 2" |
|  |  |  | task_id | Task ID | Number |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | main_work_time | Online Duration Since Last Main Quest | Number | Main and side counted separately, seconds |
| achievement_unlock | Achievement System | Achievement reached / reward claimed | reason | Operation Action | Text | achievement_reached, reward_claim |
|  |  |  | achievement_id | Achievement Category | Text | Cumulative login, cumulative spend, etc. |
|  |  |  | achievement_name | Achievement Name | Text | e.g. "2-day cumulative level", "spend 100 ingots" |
|  |  |  | achievement_sub_id | Achievement ID | Number |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | task_num | Achievement Value Reached | Number | e.g. for the "spend 100 ingots" achievement, if the player has spent 500 total, the value reached is 500. |
|  |  |  | honor_num | Achievement Points | Number | Total achievement points; omit if not applicable |
| open_system | System Unlock | Reported on unlocking a system (not on tutorial completion) | system_name | System Name | Text | e.g. equipment, pet, forging systems |
|  |  |  | system_id | System ID | Number |  |
| guide_completed | Complete Tutorial | Reported on completing each small tutorial step | guide_step | Tutorial Category | Text | e.g. pet-system tutorial |
|  |  |  | guide_id | Tutorial Step | Number | Step 1, step 2 of that tutorial |
| order_init | Initiate Recharge | Reported on recharge initiation | order_id | Order ID | Text |  |
|  |  |  | currency_type | Payment Currency | Text | ISO 4217 (CNY/USD/EUR) |
|  |  |  | pay_amount | Payment Amount | Number |  |
|  |  |  | payment_name | Payment Item Name | Text | ingot, gift pack, etc. |
|  |  |  | payment_id | Payment Item ID | Number |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | pay_method | Payment Method | Text | WeChat, Alipay, etc. |
| payment | Recharge Success | Reported on recharge success | order_id | Order ID | Text |  |
|  |  |  | currency_type | Payment Currency | Text | ISO 4217 |
|  |  |  | pay_amount | Payment Amount | Number |  |
|  |  |  | payment_name | Payment Item Name | Text |  |
|  |  |  | payment_id | Payment Item ID | Number |  |
|  |  |  | is_first_pay | Is First Recharge | Boolean |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | pay_method | Payment Method | Text |  |
| payment_fail | Recharge Fail | Reported on recharge failure | order_id | Order ID | Text |  |
|  |  |  | currency_type | Payment Currency | Text | ISO 4217 |
|  |  |  | pay_amount | Payment Amount | Number |  |
|  |  |  | payment_name | Payment Item Name | Text |  |
|  |  |  | payment_id | Payment Item ID | Number |  |
|  |  |  | pay_method | Payment Method | Text |  |
|  |  |  | fail_reason | Recharge Failure Reason | Text |  |
| resource_change | Resource Change | On resource change | reason | Operation Action | Text | sign_in / activity_reward / task_reward |
|  |  |  | resource_id | Resource ID/Name | Text | ingot, silver, gold, gameplay token, etc. |
|  |  |  | change_type | Change Type | Text | gain, consume |
|  |  |  | change_num | Change Count | Number |  |
|  |  |  | change_after | Count After Change | Number |  |
| item_change | Item Change | On item change | reason | Operation Action | Text | sign_in / activity_reward / task_reward |
|  |  |  | item_id | Changed Item ID | Text |  |
|  |  |  | item_name | Changed Item Name | Text |  |
|  |  |  | item_only_id | Changed Item Unique ID | Text | Record 0 for stackable items without special attributes; record a unique id for equipment/pets with distinct attributes (used for deduction). |
|  |  |  | change_type | Change Type | Text | gain, consume |
|  |  |  | change_num | Change Count | Number |  |
|  |  |  | change_after | Count After Change | Number |  |
| store_buy | Buy Goods | Reported after buying goods in shop | store_type | Shop Type | Text |  |
|  |  |  | goods_id | Goods ID | Text |  |
|  |  |  | goods_name | Goods Name | Text |  |
|  |  |  | goods_num | Quantity | Number |  |
|  |  |  | cost_type | Consumed Item Type | Text | ingot, silver, etc. |
|  |  |  | cost_num | Consumption Count | Number |  |
| store_refresh | Shop Refresh | Reported on shop refresh | store_type | Shop Type | Text | Optional based on need |
|  |  |  | store_refresh_cost_type | Shop Refresh Item Cost Type | Text |  |
|  |  |  | store_refresh_cost_num | Shop Refresh Item Cost Count | Number |  |
| draw_card | Gacha | Single draw, 10-draw, stage-reward claim | reason | Operation Action | Text | single_draw, ten_draw, stage_reward (e.g. chest at 30 draws) |
|  |  |  | lottery_id | Gacha Pool | Text | Paid pool, friendship pool, etc. |
|  |  |  | add_num | Current Pool Draw Count | Number |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | item_use | Items Consumed List | Object Group |  |
| activity_attend | Activity | On claiming an activity reward | reason | Operation Action | Text | claim_activity_task_reward, claim_activity_total_progress_chest |
|  |  |  | activity_name | Activity Name | Text | Daily login, 7-day beginner, festival, return activity, etc. |
|  |  |  | task_id | Task ID | Number | e.g. "Login 1 day" task |
|  |  |  | task_name | Task Name | Text |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | item_use | Items Consumed List | Object Group | e.g. activity shops that cost items |
|  |  |  | done_num | Activity Total Progress | Number | Only required for progress-based activities |
| get_email_reward | Claim Mail Reward | Reported on claiming a mail reward | subject | Mail Subject | Text |  |
|  |  |  | content | Mail Content | Text |  |
|  |  |  | item_gain | Items Gained List | Object Group | Attached items |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | send_time | Send Time | Time | When the mail was sent to the player |
| apply_friend | Apply Friend | Reported on friend request | friend_id | Friend ID | Text |  |
|  |  |  | get_friend_type | Friend Request Type | Text | Direct search, system recommended, etc. |
| add_friend | Add Friend | Reported on accepting a friend request | friend_id | Friend ID | Text |  |
| delete_friend | Delete Friend | Reported on deleting a friend | friend_id | Friend ID | Text |  |
| give_gift | Send Gift | Reported on sending a gift (omit if N/A) | friend_id | Friend ID | Text |  |
|  |  |  | gift_id | Gift ID | Text | Red packet, friendship points |
| receive_gift | Receive Gift | Reported on claiming a gift (omit if N/A) | friend_id | Friend ID | Text |  |
|  |  |  | gift_id | Gift ID | Text |  |
| chat | Chat | Reported on chat message sent | chatting_channel | Chat Channel | Text |  |
|  |  |  | chatting_content | Chat Content | Text |  |
|  |  |  | chat_server_id | Private Chat Partner Server ID | Text | Only for private chat |
|  |  |  | chat_role_id | Private Chat Partner Player ID | Text | Only for private chat; leave empty on other channels |
|  |  |  | home_id | Room ID | Text | For chat in a player-opened room; otherwise empty |
|  |  |  | hold_up | Matched Forbidden Word Library | Text | muted, normal, fraud, obscene, political; varies by company |
| exchange_code | Redeem Code | Reported on clicking redeem | code | Redemption Code | Text |  |
|  |  |  | code_id | Redemption Code Type ID | Text | Single-use, multi-use, etc. |
|  |  |  | code_content_list | Redemption Code Content | Object Group |  |
|  |  |  | return | Use Result | Text | Success, already used, already used a code of this type, etc. |
|  |  |  | use_count | Role Cumulative Successful Code Redemptions | Number |  |
| advertisement_request | Ad Request | Reported on ad request | ad_id | Ad ID | Text |  |
|  |  |  | ad_positon | Ad Position | Text |  |
|  |  |  | ad_type | Ad Type | Text |  |
|  |  |  | ad_income | Single Ad Revenue | Number |  |
|  |  |  | ad_id_date | Ad Identifier ID | Text | date + id |
| advertisement_show | Ad Impression | Reported on ad impression | ad_id | Ad ID | Text |  |
|  |  |  | ad_positon | Ad Position | Text |  |
|  |  |  | ad_type | Ad Type | Text |  |
|  |  |  | ad_income | Single Ad Revenue | Number |  |
|  |  |  | ad_id_date | Ad Identifier ID | Text | date + id |
| advertisment_click | Ad Click | Reported on ad click | ad_id | Ad ID | Text |  |
|  |  |  | ad_positon | Ad Position | Text |  |
|  |  |  | ad_type | Ad Type | Text |  |
|  |  |  | ad_income | Single Ad Revenue | Number |  |
|  |  |  | ad_id_date | Ad Identifier ID | Text | date + id |
| card_start | Battle Start | Triggered on battle start | chapter_id | Chapter ID (World Map) | Number |  |
|  |  |  | fight_id | Battle ID | Number | Can be a UUID; same for the matching end event |
|  |  |  | map_id | Stage ID | Number |  |
|  |  |  | map_max | Stage Max Wave | Number | 0 on first challenge; otherwise the max wave/room reached in prior attempts |
|  |  |  | card_type | Stage Mode | Text |  |
|  |  |  | use_stamina | Stamina Used | Number |  |
|  |  |  | skills | Carried Skill Info | Object Group | [{"skill_id":123, "lv":1231}, ...] |
|  |  |  | skills.skill_id | Carried Skill ID | Text |  |
|  |  |  | skills.lv | Carried Skill Level | Number |  |
| card_select | Three-Choice Skill Selection | Triggered on the three-choice phase, including select and reroll | reason | Operation Action | Text | select_skill, reroll_skill |
|  |  |  | chapter_id | Chapter ID (World Map) | Number |  |
|  |  |  | fight_id | Battle ID | Number |  |
|  |  |  | map_id | Stage ID | Number |  |
|  |  |  | card_type | Stage Mode | Text |  |
|  |  |  | now_wave | Current Room | Number | Current room / monster batch |
|  |  |  | skill_select | Three-Choice Skill Selection | Object Group | [{skill_id:123,skill_lv:1,isChoose:yes}, ...]; all no on reroll |
|  |  |  | skill_select.skill_id | Appearing Skill ID | Text |  |
|  |  |  | skill_select.skill_lv | Appearing Skill Level | Number |  |
|  |  |  | skill_select.isChoose | Is Chosen | Boolean |  |
|  |  |  | reload_type | Reroll Type | Text | Record on reroll: item reroll, free reroll, ad reroll |
|  |  |  | item_use | Items Consumed List | Object Group | Record on item reroll |
| card_end | Stage Settlement | Triggered on stage settlement | chapter_id | Chapter ID (World Map) | Number |  |
|  |  |  | fight_id | Battle ID | Number |  |
|  |  |  | map_id | Stage ID | Number |  |
|  |  |  | card_type | Stage Mode | Text |  |
|  |  |  | initiative_skills | Ultimate Skill Usage Count | Number | Omit when not applicable |
|  |  |  | fail_wave | Wave When Failed | Number | 0 on success |
|  |  |  | pass_wave | Pass Wave | Number |  |
|  |  |  | ad_num | Ads Watched This Battle | Number |  |
|  |  |  | skills | Carried Skill Info | Object Group | [{"skill_id":123,"lv":12,"arise_num":5,"select_num":2}, ...] |
|  |  |  | skills.skill_id | Carried Skill ID | Text |  |
|  |  |  | skills.lv | Carried Skill Level | Number |  |
|  |  |  | skills.arise_num | Appearance Count | Number | Times this skill appeared |
|  |  |  | skills.select_num | Selection Count | Number | Times this skill was selected |
|  |  |  | combat_time | Battle Duration (sec) | Number | Start → end duration |
|  |  |  | result | Battle Result | Text | win, fail, abandon |
|  |  |  | foe_num | Enemy Count | Number | Enemies defeated |
|  |  |  | reload_num | Skill Reroll Count | Text |  |
|  |  |  | skip | Is Skipped | Boolean |  |
|  |  |  | voluntarily | Is Auto Battle | Text |  |
| skills | Skill Operation | Levelup skill | reason | Operation Action | Text | gain_skill, levelup_skill |
|  |  |  | skill_id | Skill ID | Text |  |
|  |  |  | skill_type | Skill Category | Text | e.g. offensive, defensive — adjust per game |
|  |  |  | skill_lv | Skill Level | Number |  |
| hero | Hero Progression | Hero gain, levelup, breakthrough, star-up, soul, equipment | reason | Operation Action | Text | gain, levelup, breakthrough, star_up, soul, equip |
|  |  |  | have_hero | Owned Hero Count | Number |  |
|  |  |  | hero_id | Hero ID | Text |  |
|  |  |  | hero_gian | Hero Acquisition Method | Text | gacha, shard synthesis, etc. |
|  |  |  | hero_name | Hero Name | Text |  |
|  |  |  | hero_type | Hero Attribute | Text | wind, fire, etc. |
|  |  |  | hero_rarity | Hero Rarity | Text | r, sr, ssr |
|  |  |  | hero_skill | Hero Skill List | Object Group | [{skill_id:100, skill_lv:1}, ...] |
|  |  |  | hero_level | Hero Level | Number |  |
|  |  |  | hero_star | Hero Star | Number |  |
|  |  |  | hero_state | Hero Current Attributes | Object Group | [{attr:HP, val:100}, {attr:ATK, val:200}, ...] |
|  |  |  | hero_equip | Hero Equipment | Object Group | [{slot:weapon, equip_id:100, equip_level:5}, ...] |
|  |  |  | hero_power | Hero Power | Number |  |
|  |  |  | item_gain | Items Gained List | Object Group | e.g. items obtained from equipment decomposition |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | item_use | Items Consumed List | Object Group | e.g. gold and items consumed in equipment levelup |
| equip | Equipment Progression | Gain, enhance, equip, decompose, reforge | reason | Operation Action | Text | gain, enhance, equip, reforge |
|  |  |  | equip_id | Equipment ID | Text |  |
|  |  |  | equip_only_id | Equipment Unique ID | Text |  |
|  |  |  | equip_name | Equipment Name | Text |  |
|  |  |  | equip_level | Equipment Level | Number |  |
|  |  |  | equip_gian | Equipment Acquisition Method | Text |  |
|  |  |  | equip_quality | Equipment Quality | Text | white, green, etc. |
|  |  |  | equip_add | Equipment Attributes | Object Group |  |
|  |  |  | hero_id | Hero ID | Text | Hero currently carrying the equipment; empty if none |
|  |  |  | hero_only_id | Hero Unique ID | Text |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
|  |  |  | item_use | Items Consumed List | Object Group |  |
| pagoda | Tower Gameplay | Record on tower start and end | reason | Operation Action | Text | battle_start, battle_end |
|  |  |  | pagoda_type | Spirit Tower Type | Text | Main tower, Verdant Shade, etc. |
|  |  |  | pagoda_rank | Current Rank | Number |  |
|  |  |  | pagoda_level | Challenge Floor | Number | Floor challenged this attempt |
|  |  |  | foe_power | Enemy Power | Number |  |
|  |  |  | result_star | Star Rating | Number |  |
|  |  |  | result | Battle Result | Text | win, fail, abandon |
|  |  |  | all_output | Cumulative Damage Dealt | Number |  |
|  |  |  | item_use | Items Consumed List | Object Group |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
| world_boss | World Boss | World-boss challenge events | reason | Operation Action | Text | battle_start, battle_end |
|  |  |  | guild_boss_type | Boss Type | Text |  |
|  |  |  | guild_boss_lv | Boss Level | Number |  |
|  |  |  | result | Battle Result | Text | win, fail, abandon |
|  |  |  | all_output | Cumulative Damage Dealt | Number |  |
|  |  |  | all_output_rank | Damage Rank | Number |  |
|  |  |  | item_use | Items Consumed List | Object Group |  |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
| caln | Guild | Create / join / leave guild | reason | Operation Action | Text | create, join, leave, claim_guild_task, expedition_dispatch |
|  |  |  | guild_id | Guild ID | Text |  |
|  |  |  | guild_name | Guild Name | Text |  |
|  |  |  | guild_level | Guild Level | Number |  |
|  |  |  | guild_power | Guild Power | Number |  |
|  |  |  | guild_rolle_hot | Personal Total Activity | Number |  |
|  |  |  | guild_position | Current Position | Text |  |
|  |  |  | guild_master | Guild Master ID | Text |  |
|  |  |  | guild_role_num | Guild Member Count | Number |  |
|  |  |  | item_use | Items Consumed List | Object Group | e.g. upgrading guild features |
|  |  |  | item_gain | Items Gained List | Object Group |  |
|  |  |  | item_gain.item_id | Item ID | Text |  |
|  |  |  | item_gain.item_num | Item Count | Number |  |
| current_online | Current Online Count | Reported at specific intervals (e.g. :00, :05, :10) | current_online_num | Current Online Players | Number | One event per server, plus one for the total. Report under a dedicated virtual account_id (e.g. 0000000). |
|  |  |  | server_id | Server ID | Number |  |

Upload notes (delete before upload):
- Event name: must start with a letter, allow digits/letters/underscore, max 50 chars.
- Event display name: max 60 chars.
- Event description: trigger timing, max 200 chars.
- Property name: start with digit/letter, allow digits/letters/underscore, max 50 chars (only preset properties may start with #).
- Property display name: max 60 chars (if the same property has different display names across events, only the first-uploaded display name is kept).
- Property type: Number, Text, Time, Boolean, List. See the data-type design principles.

## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- |
| #device_id | Device ID | Text | Device-related ID (TA SDK has its own device-ID collection logic; use a custom property for the project-specific device ID). Preset property — can be ignored when using the client SDK. The server side must get preset properties from the client to report them. |
| #os | OS | Text | iOS, Android |
| #os_version | OS Version | Text | e.g. Android OS 9 |
| #app_version | App Version | Text |  |
| #system_language | System Language | Text |  |
| #device_model | Device Model | Text | e.g. iPhone 8 |
| #network_type | Network Type | Text | WIFI, 3G, 4G, etc. |
| client_version | Client Version | Text |  |
| platform | Platform ID | Text | Android, iOS, harmonyOS, PC |
| channel | Channel | Text | TapTap, App Store, Huawei, etc. |
| account | Account | Text | Player login account, can be hashed |
| sever_id | Server | Text |  |
| tmp_level | Role Level | Number | Player level at event time |
| tmp_level_exp | Role Level XP | Number |  |
| player_id | Role ID | Text |  |
| nick_name | Role Nickname | Text |  |
| power | Power | Number |  |
| tmp_vip_level | Current VIP Level | Number |  |
| tmp_vip_exp | Current VIP XP | Number |  |
| tmp_monthpass | Current Monthly-Card Status | Number | Usually remaining days |
| tmp_pass | Current Battle-Pass Status | Text | Usually "activated premium pass" + pass level |
| tmp_main_id | Current Main-Quest Progress | Number | Record task_id |
| max_battle_id | Current Max Stage | Number | Record stage_id |
| tmp_diamond | Current Diamond Count | Number | Primary paid currency |
| tmp_gold | Current Gold | Number |  |
| total_pay_amount | Current Total Pay Amount | Number | For payment events, record the amount after this payment completes |
| total_pay_num | Current Pay Count | Number | For payment events, record the count after this payment completes |
| total_ad_num | Cumulative Ads Watched | Number | Omit if ads are not applicable |
| tmp_stamina | Current Stamina | Number |  |

See [`../standard-base/common_event_properties.md`](../standard-base/common_event_properties.md) for the standard baseline.

## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description | Tag |
| --- | --- | --- | --- | --- | --- |
| device_id | Device ID | Text | user_setOnce | Recorded at registration | Basic property |
| client_version | Client Version | Text | user_set | Overwritten on update |  |
| network_type | Network Type | Text | user_set | Overwritten on update |  |
| platform | Platform ID | Text | user_set | Overwritten on update: Android, iOS, harmonyOS, PC |  |
| channel | Channel | Text | user_setOnce | Set at game launch; reports channel such as App Store, Tencent MyApp |  |
| account | Account | Text | user_setOnce | Recorded on first login |  |
| server_id | Server | Text | user_setOnce | Recorded on first login |  |
| current_vip_level | Current VIP Level | Number | user_set | Set on each VIP level change |  |
| current_vip_exp | Current VIP XP | Number | user_set | Set on each VIP XP change |  |
| current_level | Current Level | Text | user_set | Overwritten on update |  |
| player_id | Role ID | Text | user_setOnce | Recorded on first login |  |
| nick_name | Role Nickname | Text | user_set | Overwritten on update |  |
| power | Power | Number | user_set | Overwritten on update |  |
| current_monthpass | Current Monthly-Card Status | Text | user_set | Set on each status change |  |
| current_pass | Current Battle-Pass Status | Text | user_set | Set on each status change |  |
| main_task | Current Main-Quest Column | Text | user_set | Set on each main-quest progress change |  |
| max_battle_id | Current Max Stage | Text | user_set | Set on each main-quest progress change |  |
| register_time | Role Registration Time | Time | user_setOnce | Recorded on registration | Key timestamp |
| server_time | Server Open Time | Time | user_setOnce | Recorded on registration; the open time of the role's server |  |
| first_login_time | First Login Time | Time | user_setOnce | Recorded on first login |  |
| last_login_time | Last Login Time | Time | user_set | Overwritten each login (field named "last_login_time"; note the source says "at each recharge" but convention is login) |  |
| first_pay_time | First Pay Time | Time | user_setOnce | Recorded on first recharge |  |
| last_pay_time | Last Pay Time | Time | user_set | Overwritten on each recharge |  |
| total_pay_amount | Cumulative Pay Amount | Number | user_set | Overwritten on each pay complete | Cumulative value |
| total_pay_num | Cumulative Pay Count | Number | user_set | Overwritten on each pay complete |  |
| total_ad_num | Cumulative Ads Watched | Number | user_set | Overwritten after watching an ad; omit if no ads |  |
| total_spin_times | Cumulative Wheel Spins | Number | user_set | Overwritten after wheel use (can create period-based properties, or overwrite) |  |
| continuous_login_day | Consecutive Login Days | Number | user_set | Set at each login |  |
| total_login_day | Cumulative Login Days | Number | user_set | Overwritten at each login |  |
| tmp_diamond | Current Diamond Count | Number | user_set | Set at each logout | Resource |
| tmp_gold | Current Gold | Number | user_set | Set at each logout |  |

## Data Type Design Principles

See [`../standard-base/data_type_design_principles.md`](../standard-base/data_type_design_principles.md).

## Common Event Property Setup

See [`../standard-base/common_event_properties_setup.md`](../standard-base/common_event_properties_setup.md).

## Multi-Platform Integration Notes

See [`../standard-base/multi_platform_integration_notes.md`](../standard-base/multi_platform_integration_notes.md).

## Multi User ID System Recommendations

See [`../standard-base/multi_user_id_system_recommendations.md`](../standard-base/multi_user_id_system_recommendations.md).

## ID System FAQ

See [`../standard-base/id_system_faq.md`](../standard-base/id_system_faq.md).
