# Tower Defense Development Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / Tower Defense Development, cached 2026-09-28. Cloud version is authoritative.

## Event Data (#Event Table)

| Custom Event Table Collection Notes |  |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|
| 1. Event name: string type, can start with a digit or letter, may contain digits, letters and underscores "\_", with a maximum length of 50 characters, case-insensitive. |  |  |  |  |  |  |  |
| Event Module | Event Name | Event Display Name | Event Trigger Timing | Property Name | Property Display Name | Property Type | Property Description |
| Basic Data | ta_app_install | App Install | Auto-reported when client auto-collection is enabled |  |  |  |  |
|  | ta_app_start | App Start | Auto-reported when client auto-collection is enabled |  |  |  |  |
|  | ta_app_crash | App Crash | Auto-reported when client auto-collection is enabled |  |  |  |  |
|  | ta_app_end | App Close | Auto-reported when client auto-collection is enabled | #duration | Online Duration | number |  |
|  | device_activiate | Device Activation | Reported on first device activation | device_activate_time | Device Activation Time | time | First-time event; see https://doc.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_8-1-首次事件 |
|  | register | Account Registration | Reported on user registration completion |  |  |  |  |
|  | login | User Login | After login completion | is_first_login | Is First Login | bool | May be omitted depending on actual needs |
|  | logout | User Logout | Reported on account switching | #duration | Online Duration | number | Example for Android SDK: https://doc.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_3-4-记录事件时长 |
|  | level_up | Role Level Up | Reported on role level up | new_level | Level After Upgrade | number |  |
|  | vip_level_up | VIP Level Up | Reported on VIP level up | new_vip_level | VIP Level After Upgrade | number |  |
|  | monthpass_activate | Weekly/Monthly Pass Activation | Reported on weekly/monthly pass activation | monthpass_id | Lord Privilege Type | string | Weekly card, monthly card |
| Tutorial | guide_complete | Complete Tutorial | Recorded upon completion of each small stage of the tutorial | guide_step | Current Tutorial Step | number |  |
|  |  |  |  | guide_id | Current Tutorial Name | string |  |
| Activities & Tasks Module | seven_login | 7-Day Newbie Login | Reported when claiming rewards for 7-day newbie login | day_num | Number of Login Days | number |  |
|  | task_completed | Task Completion / Reward Claim | Recorded on claim click | task_type | Task Type | string | Daily, weekly, main, hero trial, growth fund, etc. |
|  |  |  |  | task_id | Task ID | string |  |
| Payment Module | recharge | Initiate Recharge | Recorded on recharge initiation | order_id | Order ID | string |  |
|  |  |  |  | pay_type | Payment Currency | string |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item | string | Soul crystal, gift pack, etc. |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | string | WeChat, Alipay, etc. |
|  | recharge_success | Recharge Successful | Recorded on successful recharge payment | order_id | Order ID | string |  |
|  |  |  |  | pay_type | Payment Currency | string |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item | string | Soul crystal, gift pack, etc. |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | string | WeChat, Alipay, etc. |
|  | recharge_fail | Recharge Failed | Recorded on failed recharge | order_id | Order ID | string |  |
|  |  |  |  | pay_type | Payment Currency | string |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item | string | Soul crystal, gift pack, etc. |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | string | WeChat, Alipay, etc. |
|  |  |  |  | fail_reason | Recharge Failure Reason | string |  |
| Resource / Item Changes | Plan A |  |  |  |  |  |  |
|  | soul_diamond_get | Soul Crystal Acquired | Reported on asset/item acquisition (can be split into multiple reports when multiple assets/items are obtained) | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | soul_diamond_cost | Soul Crystal Consumption | Reported on asset/item consumption (can be split into multiple reports when multiple assets/items are consumed) | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | star_diamond_get | Star Diamond Acquired | Reported on asset/item acquisition (can be split into multiple reports when multiple assets/items are obtained) | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | star_diamond_cost | Star Diamond Consumption | Reported on asset/item consumption (can be split into multiple reports when multiple assets/items are consumed) | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | coin_get | Gold Acquired | Reported on asset/item acquisition (can be split into multiple reports when multiple assets/items are obtained) | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | coin_cost | Gold Consumption | Reported on asset/item consumption (can be split into multiple reports when multiple assets/items are consumed) | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | item_get | Asset Acquired | Reported on asset/item acquisition (can be split into multiple reports when multiple assets/items are obtained) | asset_id | Asset ID | string |  |
|  |  |  |  | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | item_cost | Asset Consumption | Reported on asset/item consumption (can be split into multiple reports when multiple assets/items are consumed) | asset_id | Asset ID | string |  |
|  |  |  |  | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | num_after | Quantity After Change | number |  |
|  | Plan B |  |  |  |  |  |  |
|  | resource_change | Resource Change | Recorded when a resource changes | resource_id | Resource ID | string | Gold, soul crystal, star diamond, etc. |
|  |  |  |  | change_type | Change Type | string | Acquire, consume |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | change_after | Quantity After Change | number |  |
|  |  |  |  | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
|  | item_change | Item Change | Recorded when an item changes | item_id | Item ID | string |  |
|  |  |  |  | change_type | Change Type | string | Acquire, consume |
|  |  |  |  | change_num | Change Quantity | number |  |
|  |  |  |  | change_after | Quantity After Change | number |  |
|  |  |  |  | change_reason | Change Reason | string | Check-in / activity reward / task reward, etc. |
| Store Module | store_buy | Purchase Item | Reported after purchasing an item in the store | store_type | Store Type | string | Travel store, honor store, guild store, etc. |
|  |  |  |  | goods_id | Item ID | string |  |
|  |  |  |  | goods_num | Quantity | number |  |
|  |  |  |  | cost_type | Cost Type | string | Star diamond, gold, etc. |
|  |  |  |  | cost_num | Cost Quantity | number |  |
|  | store_refresh | Store Refresh | Reported after refreshing in the store | store_type | Store Type | string | Can be omitted depending on requirements |
|  |  |  |  | store_refresh_cost_type | Store Refresh Consumed Item Type | string |  |
|  |  |  |  | store_refresh_cost_num | Store Refresh Consumed Item Quantity | number |  |
| Draw Module | draw_hero | Hero Summon | Reported on hero summon | pond_id | Pool ID | string |  |
|  |  |  |  | draw_type | Draw Type | string | Single / Ten-pull / Free |
|  |  |  |  | draw_num | Number of Draws | number | Used for aggregate calculation |
|  |  |  |  | draw_list | Draw Result List | list |  |
|  |  |  |  | is_baodi | Is Guaranteed | bool |  |
| Development Module | hero_get | New Hero Acquired | Reported on new hero acquisition | hero_id | Hero ID | string |  |
|  |  |  |  | get_type | Acquisition Method | string | Draw / Task Reward |
|  | hero_training | Hero Mastery | Reported on hero mastery advancement | hero_id | Hero ID | string |  |
|  |  |  |  | training_progress | Mastery Main Progress | string | Tier-1 Mastery |
|  |  |  |  | training_sub_progress | Mastery Sub Progress | string | A specific node of this tier of mastery |
|  | hero_levelup | Hero Level Up | Reported on hero level up | hero_id | Hero ID | string |  |
|  |  |  |  | after_point | Score After Level Up | number |  |
|  | hero_reroll | Hero Reroll | Reported on hero reroll | hero_id | Hero ID | string |  |
|  |  |  |  | reroll_result | Reroll Score | string |  |
|  |  |  |  | is_keep | Is Kept | bool |  |
|  | hero_gongxun | Hero Merit | Reported on hero merit advancement | hero_id | Hero ID | string |  |
|  |  |  |  | gongxun_progress | Merit Main Progress | string | Tier-1 Merit |
|  |  |  |  | gongxun_sub_progress | Merit Sub Progress | string | A specific node of this tier of merit |
|  | hero_starup | Hero Quality Up | Reported on hero quality up | hero_id | Hero ID | string |  |
|  |  |  |  | after_star | Quality After Star Up | string |  |
|  |  |  |  | hero_starup_cost_num | Hero Star Up Consumed Item Quantity | number | Four-leaf clover |
|  | special_item_get | New Rune Acquired | Reported on new rune acquisition | special_item_id | Rune ID | string |  |
|  |  |  |  | get_type | Acquisition Method | string |  |
|  | special_item_strengthen | Rune Enhancement | Reported on rune enhancement | special_item_id | Rune ID | string |  |
|  |  |  |  | after_strengthen_level | Level After Enhancement | number |  |
|  | special_item_decompose | Rune Decomposition | Reported on rune decomposition | special_item_id | Rune ID | string |  |
|  |  |  |  | compose_get_list | List of Items Obtained After Decomposition | list |  |
|  | item_compose | Material Synthesis | Reported on material synthesis | item_id | Item ID | string |  |
|  |  |  |  | get_item_id | Item Obtained from Synthesis | string |  |
|  |  |  |  | compose_cost_num | Synthesis Consumed Item Quantity | number |  |
|  |  |  |  | compose_get_num | Synthesis Obtained Item Quantity | number |  |
|  | achievement_unlock | Codex Unlock | Reported on codex unlock | achievement_id | Codex ID | string | Hero book, bond book |
|  |  |  |  | achievement_sub_id | Codex Sub ID | string |  |
| PVE Module | rift_start | Map Battle Start | Reported on map battle start | rift_id | Rift ID | string |  |
|  |  |  |  | rift_mode | Rift Mode | string | Story, rift |
|  |  |  |  | is_first_start | Is First Attempt | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list |  |
|  |  |  |  | hero_position_list | Battle Hero Position List | list |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  | rift_finish | Map Battle End | Reported on map battle end | rift_id | Rift ID | string |  |
|  |  |  |  | rift_mode | Rift Mode | string | Story, rift |
|  |  |  |  | is_first_start | Is First Attempt | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list |  |
|  |  |  |  | hero_position_list | Battle Hero Position List | list |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | is_clear | Is Success | bool |  |
|  |  |  |  | is_mop | Is Sweep | bool |  |
|  |  |  |  | battle_wave | Battle Wave | number |  |
|  |  |  |  | hero_lost_num | Number of Hero Deaths | number |  |
|  |  |  |  | hero_reborn_num | Number of Hero Revivals | number |  |
|  |  |  |  | battle_treasure_times | Chest Open Times | number |  |
|  |  |  |  | battle_treasure_list | Chest Effect List | list |  |
|  |  |  |  | item_list | List of Items Obtained | list |  |
|  | rift_battle_hero | Map Battle Participating Hero | Reported for each hero individually at map battle start | hero_id | Hero ID | string | This is fine-grained battle hero detail. If coarser aggregated data is acceptable, this event can be omitted to save event volume |
|  |  |  |  | hero_fight | Hero Combat Power | number |  |
|  |  |  |  | hero_quality | Hero Quality | string |  |
|  |  |  |  | hero_gongxun | Hero Merit | string |  |
|  |  |  |  | Other necessary battle hero fields can be added if available |  |  |  |
|  | Samsara Tower Module Plan A |  |  |  |  |  |  |
|  | tower_start | Samsara Tower Start | Reported on Samsara Tower battle start | tower_id | Samsara Tower Layer | number |  |
|  |  |  |  | is_first_start | Is First Attempt | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list | Position-to-position correspondence |
|  |  |  |  | hero_lunhui_armor_list | Battle Hero Samsara Equipment List | list |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  | tower_finish | Samsara Tower End | Reported on Samsara Tower end | tower_id | Samsara Tower Layer | number |  |
|  |  |  |  | is_first_start | Is First Attempt | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list | Position-to-position correspondence |
|  |  |  |  | hero_lunhui_armor_list | Battle Hero Samsara Equipment List | list |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | is_clear | Is Success | bool |  |
|  |  |  |  | hero_lost_num | Number of Hero Deaths | number |  |
|  |  |  |  | hero_reborn_num | Number of Hero Revivals | number |  |
|  |  |  |  | beat_num | Number of Monsters Defeated | number |  |
|  |  |  |  | item_list | List of Items Obtained | list |  |
|  | tower_battle_hero | Samsara Tower Battle Participating Hero | Reported for each hero individually at Samsara Tower start | hero_id | Hero ID | string | This is fine-grained battle hero detail. If coarser aggregated data is acceptable, this event can be omitted to save event volume |
|  |  |  |  | hero_fight | Hero Combat Power | number |  |
|  |  |  |  | hero_quality | Hero Quality | string |  |
|  |  |  |  | hero_gongxun | Hero Merit | string |  |
|  |  |  |  | Other necessary battle hero fields can be added if available |  |  |  |
|  | Samsara Tower Module Plan B |  |  |  |  |  |  |
|  | tower_climb | Samsara Tower Gameplay | Reported on Samsara Tower settlement | tower_id | Samsara Tower Layer | number |  |
|  |  |  |  | is_first_start | Is First Attempt | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list | Position-to-position correspondence |
|  |  |  |  | hero_lunhui_armor_list | Battle Hero Samsara Equipment List | list |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | is_clear | Is Success | bool |  |
|  |  |  |  | hero_lost_num | Number of Hero Deaths | number |  |
|  |  |  |  | hero_reborn_num | Number of Hero Revivals | number |  |
|  |  |  |  | beat_num | Number of Monsters Defeated | number |  |
|  |  |  |  | item_list | List of Items Obtained | list |  |
|  | Samsara Tower Common |  |  |  |  |  |  |
|  | tower_mop | Samsara Tower Sweep | Reported on Samsara Tower sweep | tower_id | Samsara Tower Layer | number |  |
|  |  |  |  | item_list | List of Items Obtained | list |  |
|  | tower_reset | Samsara Tower Reset | Reported on Samsara Tower reset |  |  |  |  |
|  | team_task | Team Dispatch | Reported on team dispatch settlement | team_task_id | Team Dispatch ID | string |  |
|  |  |  |  | team_task_level | Team Dispatch Level | string |  |
|  |  |  |  | is_boost | Is Boosted | bool |  |
|  |  |  |  | reward_percent | Reward Bonus | number |  |
|  |  |  |  | hero_list | Battle Hero List | list |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | item_list | List of Items Obtained | list |  |
| PVP Module | pvp_start | Martial Arts Tournament Battle Start | Reported on Martial Arts Tournament battle start | pvp_id | Martial Arts Tournament Battle ID | string | Qualifier, semi-final, final, etc. |
|  |  |  |  | rival_id | Opponent ID | string |  |
|  |  |  |  | rival_fight | Opponent Combat Power | number |  |
|  |  |  |  | rival_hero_list | Opponent Battle Hero List | list |  |
|  |  |  |  | rival_rank | Opponent Rank | number |  |
|  |  |  |  | is_bot | Is Bot | bool |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | our_rank | Our Rank | number |  |
|  |  |  |  | pvp_treasure_list | Treasure List | list |  |
|  |  |  |  | is_upper_challenge | Is Upper-Rank Challenge | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list |  |
|  | pvp_finish | Martial Arts Tournament Battle End | Reported on Martial Arts Tournament battle end | pvp_id | Martial Arts Tournament Battle ID | string | Qualifier, semi-final, final, etc. |
|  |  |  |  | rival_id | Opponent ID | string |  |
|  |  |  |  | rival_fight | Opponent Combat Power | number |  |
|  |  |  |  | rival_hero_list | Opponent Battle Hero List | list |  |
|  |  |  |  | rival_rank | Opponent Rank | number |  |
|  |  |  |  | is_bot | Is Bot | bool |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | our_rank | Our Rank | number |  |
|  |  |  |  | pvp_treasure_list | Treasure List | list |  |
|  |  |  |  | is_upper_challenge | Is Upper-Rank Challenge | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list |  |
|  |  |  |  | rival_beat_num | Number of Monsters Defeated by Opponent | number |  |
|  |  |  |  | beat_num | Number of Monsters Defeated | number |  |
|  |  |  |  | pvp_result | Martial Arts Tournament Battle Result | string |  |
|  |  |  |  | rank_change | Rank Change | number |  |
|  |  |  |  | after_rank | Rank After Change | number |  |
|  | pvp_hero | Martial Arts Tournament Participating Hero | Reported for each hero individually at Martial Arts Tournament battle start | hero_id | Hero ID | string | This is fine-grained battle hero detail. If coarser aggregated data is acceptable, this event can be omitted to save event volume |
|  |  |  |  | hero_fight | Hero Combat Power | number |  |
|  |  |  |  | hero_quality | Hero Quality | string |  |
|  |  |  |  | hero_gongxun | Hero Merit | string |  |
|  |  |  |  | Other necessary battle hero fields can be added if available |  |  |  |
|  | arena_battle_start | Arena Battle Start | Reported on arena battle start | rival_id | Opponent ID | string |  |
|  |  |  |  | rival_fight | Opponent Combat Power | number |  |
|  |  |  |  | rival_rank | Opponent Rank | number |  |
|  |  |  |  | is_bot | Is Bot | bool |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | our_rank | Our Rank | number |  |
|  |  |  |  | is_upper_challenge | Is Upper-Rank Challenge | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list |  |
|  | arena_battle_finish | Arena Battle End | Reported on arena battle end | rival_id | Opponent ID | string |  |
|  |  |  |  | rival_fight | Opponent Combat Power | number |  |
|  |  |  |  | rival_rank | Opponent Rank | number |  |
|  |  |  |  | is_bot | Is Bot | bool |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
|  |  |  |  | our_rank | Our Rank | number |  |
|  |  |  |  | is_upper_challenge | Is Upper-Rank Challenge | bool |  |
|  |  |  |  | hero_list | Battle Hero List | list |  |
|  |  |  |  | rival_beat_num | Number of Monsters Defeated by Opponent | number |  |
|  |  |  |  | beat_num | Number of Monsters Defeated | number |  |
|  |  |  |  | arena_battle_result | Arena Battle Result | string |  |
|  |  |  |  | rank_change | Rank Change | number |  |
|  |  |  |  | after_rank | Rank After Change | number |  |
|  | arena_battle_hero | Arena Participating Hero | Reported for each hero individually at arena battle start | hero_id | Hero ID | string | This is fine-grained battle hero detail. If coarser aggregated data is acceptable, this event can be omitted to save event volume |
|  |  |  |  | hero_fight | Hero Combat Power | number |  |
|  |  |  |  | hero_quality | Hero Quality | string |  |
|  |  |  |  | hero_gongxun | Hero Merit | string |  |
|  |  |  |  | Other necessary battle hero fields can be added if available |  |  |  |
|  | set_defense_team | Set Defense Team | Reported on saving defense team | hero_list | Battle Hero List | list |  |
|  |  |  |  | total_fight | Total Battle Power | number |  |
| Guild Module | guild_create | Create Guild | Reported on guild creation | guild_id | Guild ID | string |  |
|  |  |  |  | guild_name | Guild Name | string |  |
|  |  |  |  | guild_level | Guild Level | number |  |
|  | guild_join | Join Guild | Reported on joining a guild | guild_id | Guild ID | string |  |
|  |  |  |  | guild_name | Guild Name | string |  |
|  |  |  |  | guild_level | Guild Level | number |  |
|  |  |  |  | apply_position | Apply Position | string | The touchpoint location where the user applied to join the guild |
|  |  |  |  | guild_create_time | Guild Creation Time | time |  |
|  | guild_manage | Guild Management | Reported on completion of guild personnel management | The account id reported for this event is the managed party |  |  |  |
|  |  |  |  | guild_id | Guild ID | string |  |
|  |  |  |  | guild_name | Guild Name | string |  |
|  |  |  |  | guild_level | Guild Level | number |  |
|  |  |  |  | guild_create_time | Guild Creation Time | time |  |
|  |  |  |  | guild_manage_type | Change Type | string | Expel player / position change |
|  | guild_donation | Guild Donation | Reported on guild donation | guild_id | Guild ID | string |  |
|  |  |  |  | guild_name | Guild Name | string |  |
|  |  |  |  | guild_level | Guild Level | number |  |
|  |  |  |  | guild_create_time | Guild Creation Time | time |  |
|  |  |  |  | donation_type | Donation Type | string | Basic donation, generous donation |
|  |  |  |  | donation_cost_id | Donation Consumed Item Type | string |  |
|  |  |  |  | donation_cost_num | Donation Consumed Item Quantity | number |  |
|  | guild_leave | Leave Guild | Reported on leaving guild | guild_id | Guild ID | string |  |
|  |  |  |  | guild_name | Guild Name | string |  |
|  |  |  |  | guild_level | Guild Level | number |  |
|  |  |  |  | guild_occupation | Position at Leaving | string |  |
|  |  |  |  | guild_create_time | Guild Creation Time | time |  |
| Mail | get_email_reward | Claim Mail Reward | Recorded on mail reward claim completion | email_reward_id | Mail Reward ID | string |  |
|  |  |  |  | reward_list | Reward List | list |  |
| Friends Module | apply_friend | Apply Friend | Reported on friend application | friend_id | Friend ID | string |  |
|  |  |  |  | get_friend_type | Friend Application Type | string | Directed search, system recommendation, etc. |
|  | add_friend | Add Friend | Reported on approving a friend application | friend_id | Friend ID | string |  |
|  | delete_friend | Delete Friend | Reported on deleting a friend | friend_id | Friend ID | string |  |
|  | give_gift | Give Gift | Reported on giving a gift | friend_id | Friend ID | string |  |
|  | receive_gift | Receive Gift | Reported on clicking to receive a gift | friend_id | Friend ID | string |  |
| Redemption Code | exchange_code | Code Redemption | Recorded after correctly entering a redemption code and redeeming it successfully | code | Redemption Code | string |  |
|  |  |  |  | code_id | Redemption Code Type ID | string | Single-use code, multi-use code, etc. |
|  |  |  |  | code_content_list | Redemption Code Content | list | Restore the scene |
| Each of the following events requires a virtual account id for reporting |  |  |  |  |  |  |  |
| Current Online Users | current_online | Current Online Users | Reported once per specific time interval | current_online_num | Current Online Users | number | Report one event per server, then report one event for the total online count |
|  |  |  |  | server_id | Server ID | number |  |
| Leaderboard Snapshot | rank_event | Leaderboard Event | Report the leaderboard snapshot at a specific time each day, in one json record | rank_type | Leaderboard Type | string | Level, adventure, trial tower, etc. |
|  |  |  |  | rank_sub_type | Leaderboard Sub Type | string | Elder Forest, Abandoned Mine, etc. |
|  |  |  |  | server_id | Server ID | number |  |
|  |  |  |  | rank1 | Rank 1 | string |  |
|  |  |  |  | rank2 | Rank 2 | string |  |
|  |  |  |  | rank3 | Rank 3 | string |  |
|  |  |  |  | rank4 | Rank 4 | string |  |
|  |  |  |  | rank5 | Rank 5 | string |  |
|  |  |  |  | rank_list | Rank List | list |  |
| Ad Purchase Module | cost | Ad Purchase Cost | Uploaded via API or after downloading detail data, usually daily | #event_id | Event ID | string | Updatable event identifier id |
|  |  |  |  | advertisement_id | Ad Purchase Ad ID | string | Updatable event; see manual: https://doc.thinkingdata.cn/ta-manual/latest/installation/advanced_data_type/track_update_and_track_overwrite.html#可更新事件 |
|  |  |  |  | advertisement_type | Ad Purchase Ad Type | string |  |
|  |  |  |  | advertisement_group_id | Ad Purchase Ad Group ID | string |  |
|  |  |  |  | campaign_id | campaign | string |  |
|  |  |  |  | spend | Spend | number |  |
|  |  |  |  | Other necessary channel fields can be added if available |  |  |  |

## Common Event Properties (Common Event Properties)

|  |  |
|---|---|
|  | Common event properties are properties that all (or most) events have |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |

## User Properties (#User ID and Common Properties)

| User ID Description |  |  |  |  |  |  |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |  |  |
| Property Name |  | Property Display Name |  | Property Description |  | Assignment Description |  |  |  |  |  |  |
| #account_id |  | Account ID |  | System Property |  | Role ID |  |  |  |  |  |  |
| #distinct_id |  | Visitor ID |  | System Property |  | Device-related ID or in-business visitor ID. No action needed if using the client SDK |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |
| Common Event Property Description |  |  |  |  |  |  |  |  |  |  |  |  |
| Common event properties are properties that must be included in all custom events. If the property has no value at the time of the event trigger, leave it blank. |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |
| Property Name |  | Property Display Name |  | Property Type |  | Assignment Description |  |  |  |  |  |  |
| #device_id |  | Device ID |  | string |  | Device-related ID (ThinkingData SDK has its own logic for collecting device-associated IDs, so if you want to record a project-specific device ID, it is recommended to record it as a custom property) |  |  |  |  |  | Preset property in client SDK. Server side needs to obtain from client and set. |
| #os |  | Operating System |  | string |  | ios, android |  |  |  |  |  |  |
| #os_version |  | OS Version |  | string |  | e.g., Android OS 9 |  |  |  |  |  |  |
| #app_version |  | App Version |  | string |  |  |  |  |  |  |  |  |
| channel |  | Channel |  | string |  | e.g., taptap, appstore, etc. |  |  |  |  |  |  |
| account |  | Account |  | string |  |  |  |  |  |  |  |  |
| sever |  | Server |  | string |  |  |  |  |  |  |  |  |
| level |  | Level |  | number |  |  |  |  |  |  |  |  |
| tmp_vip_level |  | Current VIP Level |  | number |  |  |  |  |  |  |  |  |
| tmp_monthpass |  | Current Weekly/Monthly Pass Status |  | string |  |  |  |  |  |  |  |  |
| tmp_buff |  | Current Season Buff |  | string |  |  |  |  |  |  |  |  |
| tmp_guild |  | Current Guild |  | number |  |  |  |  |  |  |  |  |
| tmp_coin |  | Current Gold |  | number |  |  |  |  |  |  |  |  |
| tmp_soul_diamond |  | Current Soul Crystal |  | number |  |  |  |  |  |  |  |  |
| tmp_star_diamond |  | Current Star Diamond |  | number |  |  |  |  |  |  |  |  |
| tmp_revenue |  | Current Payment Amount |  | number |  |  |  |  |  |  |  |  |
| tmp_revenue_times |  | Current Payment Times |  | number |  |  |  |  |  |  |  |  |
