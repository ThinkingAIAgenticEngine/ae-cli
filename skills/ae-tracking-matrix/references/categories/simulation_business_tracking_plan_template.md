# Simulation Business Game — Tracking Plan Template

> Translated from `simulation_business_tracking_plan_template.md` (Chinese source). For integration prerequisites, data-type principles, common-property setup, multi-end integration notes, multi-ID system guidance and ID-system FAQ, see the shared files under `../standard-base/`.

## Integration Must-Know

See [`../standard-base/integration_must_know.md`](../standard-base/integration_must_know.md). Key points: pick client/server/import-tool SDK per project needs; column type is fixed at first import — verify types up front; coordinate IDs when ingesting from multiple endpoints; manually clear super-properties on logout for client SDK.

---

## #User ID System

| Game Type | Property Name | Display Name | Description | Assignment Rule | Chosen |
| --- | --- | --- | --- | --- | --- |
| Single-account single-role | `#account_id` | Account ID | System property | Set to player account ID | ✅ |
|  | `#distinct_id` | Guest ID | System property | Device-related ID or in-business guest ID; ignore if client SDK is used |  |
| Single-account multi-role | `#account_id` | Account ID | System property | Set to role ID; account ID stored as custom role property (project-unique, no duplicates) | ✅ |
|  | `#distinct_id` | Guest ID | System property | Device-related ID or guest ID; ignore if client SDK is used |  |
| No account system | `#account_id` | Account ID | System property | NULL | ✅ |
|  | `#distinct_id` | Guest ID | System property | Device-related ID or guest ID; ignore if client SDK is used |  |

---

## #Event Data

### Standard Base Events

Shared across all game categories. See [`../standard-base/basic_event_data.md`](../standard-base/basic_event_data.md) for full details on:

| Event Name | Display Name | Tag | Notes |
| --- | --- | --- | --- |
| `ta_app_install` | App Install | Base | Client auto-collect |
| `ta_app_start` | App Start | Base | Client auto-collect |
| `ta_app_crash` | App Crash | Base | Client auto-collect |
| `ta_app_end` | App End | Base | Property: `#duration` (Online Duration, Number) |
| `new_device` | Device Activation | Base | Property: `device_activate_time` (Device Activation Time, Time) — first-time event |
| `register` | Account Register | Base | On account registration completion |
| `login` | Account Login | Base | On account login success |
| `logout` | Account Logout | Base | On account logout success |
| `create_role` | Create Role | Base | Properties: `gender` (Gender, Text), `career` (Career, Text), `diy_dress` (Face Customization, Object Group) |
| `role_login` | Role Login | Base | Properties: `is_first_login` (Is First Login, Boolean), `last_out_time` (Last Logout Time, Time) |
| `role_logout` | Role Logout | Base | Properties: `add_day` (Cumulative Login Days, Number), `online_time` (This Session Online Duration, Number — seconds), `add_time` (Role Cumulative Online Duration, Number — seconds) |
| `level_up` | Hero Level Up | Base | Property: `level` (Post-Levelup Level, Number) |
| `vip_levelup` | VIP Level Up | Base | Property: `vip_level` (Post-Levelup VIP Level, Number) |
| `monthpass_activate` | Monthly Pass Activate | Base | Property: `monthpass_id` (Monthly Pass Type, Text) |
| `pass_activate` | Battle Pass Activate | Base | Property: `pass_id` (Battle Pass ID, Text) |
| `repetition_work` | Daily/Weekly Task | Base | Properties: `reason` (Action, Text — claim task reward / claim active-point reward), `task_type` (Task Type, Text — daily/weekly), `task_name` (Task Name, Text), `task_id` (Task ID, Number), `get_item_info` (Items Gained, Object Group — `.item_id` Text, `.item_num` Number), `active` (Active Points After, Number) |
| `main_work` | Main Story / Tutorial Task | Base | Properties: `reason` (Action, Text — task completed / claim reward), `task_type` (Task Type, Text — main/branch), `task_name` (Task Name, Text), `task_id` (Task ID, Number), `get_item_info` (Items Gained, Object Group), `main_work_time` (Time Since Last Main-Task Completion, Number — seconds) |
| `achievement_unlock` | Achievement System | Base | Properties: `reason` (Action, Text — achievement reached / claim reward), `achievement_id` (Achievement Category, Text), `achievement_name` (Achievement Name, Text), `achievement_sub_id` (Achievement ID, Number), `get_item_info` (Items Gained, Object Group), `task_num` (Achievement Progress Value, Number), `honor_num` (Achievement Points, Number) |
| `open_system` | System Unlock | Base | Properties: `system_name` (System Name, Text), `system_id` (System ID, Number) |
| `guide_completed` | Guide Step Complete | Tutorial | Properties: `guide_step` (Guide Category, Text), `guide_id` (Guide Step ID, Number) |
| `order_init` | Payment Initiated | Payment | Properties: `order_id` (Order ID, Text), `currency_type` (Currency Type, Text — ISO 4217), `pay_amount` (Pay Amount, Number), `payment_name` (Payment Item Name, Text), `payment_id` (Payment Item ID, Number), `get_item_info` (Items Gained, Object Group), `pay_method` (Payment Method, Text) |
| `payment` | Payment Success | Payment | Same as `order_init` + `is_first_pay` (Is First Payment, Boolean) |
| `payment_fail` | Payment Fail | Payment | Same as `order_init` + `fail_reason` (Fail Reason, Text) |
| `resource_change` | Resource Change | Resource/Item | Properties: `reason` (Action, Text), `resource_id` (Resource ID/Name, Text), `change_type` (Change Type, Text — gain/consume), `change_num` (Change Amount, Number), `change_after` (Amount After Change, Number) |
| `item_change` | Item Change | Resource/Item | Properties: `reason` (Action, Text), `item_id` (Item ID, Text), `item_name` (Item Name, Text), `item_only_id` (Item Unique ID, Text), `change_type` (Change Type, Text), `change_num` (Change Amount, Number), `change_after` (Amount After Change, Number) |
| `shop_buy` | Shop Purchase | Shop | Properties: `shop_id` (Shop ID, Text), `item_id` (Item ID, Text), `item_name` (Item Name, Text), `item_num` (Item Count, Number), `cost_type` (Cost Currency Type, Text), `cost_amount` (Cost Amount, Number) |
| `shop_refresh` | Shop Refresh | Shop | Properties: `shop_id` (Shop ID, Text), `cost_type` (Cost Currency Type, Text), `cost_amount` (Cost Amount, Number) |
| `draw_card` | Gacha Draw | Gacha | Properties: `reason` (Action, Text — 1-draw / 10-draw / claim milestone reward), `pond_id` (Pool, Text), `add_num` (Current Pool Draw Count, Number), `get_item_info` (Items Gained, Object Group), `item_use` (Items Consumed, Object Group) |
| `activity_attend` | Operational Activity | Activity | Properties: `reason` (Action, Text), `activity_name` (Activity Name, Text), `task_id` (Task ID, Number), `task_name` (Task Name, Text), `get_item_info` (Items Gained, Object Group), `item_use` (Items Consumed, Object Group), `done_num` (Activity Progress, Number) |
| `get_email_reward` | Claim Email Reward | Email | Properties: `email_subject` (Email Subject, Text), `email_content` (Email Content, Text), `get_item_info` (Items Gained, Object Group), `send_time` (Send Time, Time) |
| `apply_friend` | Apply Friend | Social | Properties: `friend_id` (Friend ID, Text), `apply_friend_type` (Apply Type, Text — directed search / system recommend) |
| `add_friend` | Add Friend | Social | Property: `friend_id` (Friend ID, Text) |
| `delete_friend` | Delete Friend | Social | Property: `friend_id` (Friend ID, Text) |
| `give_gift` | Give Gift | Social | Properties: `friend_id` (Friend ID, Text), `gift_id` (Gift ID, Text) |
| `receive_gift` | Receive Gift | Social | Properties: `friend_id` (Friend ID, Text), `gift_id` (Gift ID, Text) |
| `chat` | Chat | Social | Properties: `channel_id` (Chat Channel, Text), `chat_content` (Chat Content, Text), `chat_server_id` (Private-Chat Target Server ID, Text), `chat_role_id` (Private-Chat Target Role ID, Text), `room_id` (Room ID, Text), `hold_up` (Violation Match, Text — mute/normal/fraud/vulgar/political) |
| `exchange_code` | Exchange Code | Code | Properties: `code` (Code, Text), `code_type` (Code Type ID, Text), `code_content_list` (Code Content, Object Group), `return` (Result, Text — success / already used / already-used-same-type), `use_count` (Role Cumulative Successful Redemptions, Number) |

### Advertising Events

See [`../standard-base/gameplay_event_data.md`](../standard-base/gameplay_event_data.md) for `ad_request`, `ad_response`, `ad_show`, `ad_click`, `ad_close` with properties `ad_platform`, `ad_id`, `ad_type`, `ad_placement_name`, `ad_placement_id`, `current_page`, `ad_ecpm`, `is_filled_success`, `error_detail_info`, `error_detail_code`, `ad_app_name`, `ad_duration`, `ad_play_duration`, `is_complete_play`.

### Simulation-Business–Specific Events

| Event Name | Display Name | Scenario | Tag | Key Properties |
| --- | --- | --- | --- | --- |
| `people` | Retainer / Talent (Card) | Gain retainer, level up, 10-level up, trait improve | Progression | `reason`, `all_people` (Retainer Count, Number), `people_id` (Retainer ID, Text), `people_name` (Retainer Name, Text), `people_quality` (Retainer Quality, Text — N/R/SR/SSR), `people_source` (Source, Text — fragment synthesis / gacha / promotion), `people_level` (Retainer Level, Number), `people_exp` (Retainer Total XP, Number), `people_power` (Retainer Power, Number), `people_detailed` (Retainer Attribute Details, Object Group), `people_skill` (Trait ID/Name, Text), `people_skill_lv` (Trait Level, Number), `people_skill_list` (Trait List, Object Group), `get_item_info`, `item_use` |
| `guild` | Clan / Guild | Clan actions | Gameplay | `reason` (Action, Text — create/apply/join/donate/leave/transfer/disband/claim-progress-chest/edit-info), `guild_id` (Clan ID, Text), `guild_name` (Clan Name, Text), `guild_level` (Clan Level, Number), `guild_member` (Clan Member Count, Number), `guild_exp` (Clan XP, Number), `guild_rank` (Clan Rank, Number), `guild_badge` (Clan Badge ID, Text), `guild_inform` (Clan Announcement, Text), `guild_manifesto` (Clan Manifesto, Text), `guild_strength` (Clan Influence, Number), `guild_role_num` (Clan Current Members, Number), `guild_patriarch` (Clan Leader Role ID, Number), `guild_fund` (Clan Funds, Number), `role_post` (Personal Position, Text), `donate_type` (Donation Type, Text), `donate_num` (Daily Donation Progress, Number), `contribution_change` (Contribution Change, Number), `contribution_left` (Remaining Contribution, Text), `object_role_id` (Target Role ID, Text), `get_item_info`, `item_use` |
| `arena` | Arena | Save lineup, challenge, be-challenged, buy challenges, refresh opponent | Gameplay | `reason`, `left_free_num` (Remaining Free Challenges, Number), `arena_apparel_power` (My Power, Number), `add_arena_score` (Points Gained, Number), `left_arena_score` (Remaining Points, Number), `arena_rank` (Current Rank, Number), `d_role_id` (Opponent Role ID, Text), `d_arena_apparel_power` (Opponent Power, Number), `d_arena_score` (Opponent Points Change, Number), `d_left_arena_score` (Opponent Remaining Points, Number), `d_arena_rank` (Opponent Current Rank, Number), `get_item_info`, `item_use` |
| `feast` | Feast / Banquet | Host feast, feast end, expand seats, attend feast, leave seat | Gameplay | `reason`, `feast_type` (Feast Type, Text), `feast_id` (Feast ID, Text), `feast_onil_id` (Feast Unique ID, Text), `feast_master` (Feast Host Role ID, Text), `feast_share` (Share Options, List), `feast_seat` (Seat Config, Object Group), `feast_add_seat` (Expanded Seats, Number), `feast_hot` (Feast Hotness, Number), `feast_score` (Feast Points, Number), `feast_level` (Feast Rating, Text), `feast_join_num` (Participants, Number), `feast_join_list` (Participant List, Object Group), `feast_lucky_man` (Lucky Guest Role ID, Text), `feast_have_seat` (Seat Taken, Text), `get_item_info`, `item_use` |
| `worship` | Ranking Worship | On ranking-list worship action | Gameplay | `reason`, `rank_id` (Ranking ID, Text), `rank_name` (Ranking Name, Text), `get_item_info` |
| `buildings` | Enterprise / Business | Build, upgrade, dispatch retainer, recruit staff | Progression | `reason`, `building_num` (Unlocked Buildings, Number), `building_id` (Building ID, Number), `building_name` (Building Name, Text), `building_earning` (Earning Rate per Second, Text), `building_people` (Dispatched Retainers, Object Group), `people_add` (Retainer Bonus, Number), `building_staff` (Staff Count, Number), `building_staff_level` (Staff Level, Number), `building_staff_earning` (Staff Earning Rate, Number), `building_capacity` (Total Capacity, Number), `get_item_info`, `item_use` |
| `school` | Academy / Accounting Office (Timed Dispatch) | Start/end dispatch, add desk, speed up | Gameplay | `reason`, `desk_num` (Unlocked Desks, Number), `desk_id` (Desk ID, Number), `desk_time` (Dispatch Duration, Number — seconds), `desk_people` (Dispatched Talent List, Object Group), `people_power_add` (Power Gain, Number), `people_talent_add` (Trait Gain, Number), `get_item_info`, `item_use` |
| `main` | Main Stage / Story | On main-stage completion | Gameplay | `reason` (Action, Text — complete main / challenge boss / claim idle reward / random event), `main_id` (Stage ID, Number), `node_id` (Node ID, Number), `boss_strength` (Boss Power, Number), `embattle_strength` (My Lineup Power, Number), `result` (Battle Result, Text — win/lose), `event_id` (Event ID, Number), `get_item_info`, `item_use` |
| `tour` | Travel / Expedition | Depart (×1 / ×10) | Gameplay | `reason`, `left_act` (Remaining Stamina, Number), `site_id` (Site ID, Text), `site_name` (Site Name, Text), `intimate_id` (Beauty NPC ID, Text), `intimate_quality` (Beauty Quality, Text — N/R/SR/SSR), `intimate_feel` (Beauty Affinity, Number), `get_item_info`, `item_use` |
| `fashion` | Avatar Fashion | On fashion adjustment | Progression | `reason` (Action, Text — gain outfit / save outfit), `fashion_location` (Operation Location, Text — avatar/costume/scene/title/avatar-frame), `fashion_id` (Fashion ID, Number), `valid_time` (Validity Duration, Number — seconds; -1 = permanent), `touxiang_id` (Current Avatar ID, Number), `shizhuang_id` (Current Costume ID, Number), `chenghao_id` (Current Title ID, Number), `changjin_id` (Current Scene ID, Number), `txkuang_id` (Current Avatar Frame ID, Number), `nielian_id` (Current Face-Customization ID, Object Group), `villa_id` (Current Villa ID, Number), `item_use` |
| `businessman` | Merchant Trade | On merchant trade / investment | Gameplay | `reason` (Action, Text — befriend / trade / one-key trade), `businessman_id` (Merchant ID, Number), `businessman_name` (Merchant Name, Text), `deal_num` (Remaining Trades Today, Number), `businessman_num` (Befriended Merchant Count, Number), `get_item_info`, `item_use` |
| `mansion` | Mansion (Apprentice Progression) | Apprentice training | Progression | `reason` (Action, Text — gain apprentice / name / rename / train / full-server propose / designated propose / cancel propose / marry), `trainee_id` (Apprentice ID, Number), `trainee_onil_id` (Apprentice Unique ID, Number), `trainee_sex` (Apprentice Gender, Text — boy/girl), `trainee_talent` (Apprentice Aptitude, Text), `trainee_name` (Apprentice Name, Text), `trainee_levle` (Apprentice Level, Number), `trainee_stage` (Apprentice Stage, Text), `trainee_money` (Apprentice Wealth, Number), `trainee_feel` (Apprentice Affinity, Number), `trainee_vitality` (Apprentice Vitality, Number), `trainee_mother` (Apprentice Mother, Text), `trainee_spouse` (Apprentice Spouse Info, Object Group), `trainee_num` (Current Apprentice Count, Number), `trainee_married_num` (Married Apprentice Count, Number), `trainee_add_money` (Total Apprentice Wealth, Number), `get_item_info`, `item_use` |
| `pet` | Pet / Mount Progression | Pet/mount training | Progression | `reason` (Action, Text — gain / interact / star-up / feed / skill-up / exclusive-skill-up), `pet_num` (Unlocked Pet/Mount Count, Number), `pet_id` (Pet/Mount ID, Number), `pet_name` (Pet/Mount Name, Text), `pet_people` (Equipped Retainer, Text), `pet_level` (Pet/Mount Level, Number), `pet_qianli` (Potential, Number), `pet_chengzhang` (Growth, Number), `pet_zizhi` (Aptitude, Number), `pet_exp` (Interact XP, Number), `pet_star` (Star Level, Number), `pet_skill` (Skill List, Text), `pet_jingli` (Energy, Number), `pet_add_skill` (Upgraded Skill ID, Number), `exclusive_skill_level` (Exclusive Skill Level, Number), `special_skill_id` (Trait Skill ID, Number), `special_skill_level` (Trait Skill Level, Number), `get_item_info`, `item_use` |
| `wealth_god` | Wealth God Palace / Ranking | On settling-in / worshipping wealth god | Activity | `reason` (Action, Text — settle in palace / welcome wealth god), `wealth_god_id` (Palace ID, Number), `wealth_god_name` (Palace Name, Text), `guild_id` (Clan ID, Text), `guild_name` (Clan Name, Text), `reside_role_list` (Palace Residents List, Object Group), `get_item_info`, `item_use` |
| `all_activity` | Universal Activity | Reskinnable activity with items → points → ranking → rewards | Activity | `reason` (Action, Text — gain item / use item / shop purchase / claim reward / ranking settle), `all_activity_name` (Activity Name, Text), `all_activity_id` (Activity ID, Number), `item_use`, `all_item_list` (Activity Inventory, Text), `all_taskId` (Task ID, Number), `all_item_change` (Items Gained List, Text), `all_shop_change` (Shop Point Change, Number), `all_shop_left` (Remaining Shop Points, Text), `all_integal` (Cumulative Activity Points, Text), `all_guild_integal` (Clan Cumulative Points, Text), `all_cross_rank` (Cross-Server Rank, Number), `all_local_rank` (Local-Server Rank, Number), `guild_rank` (Clan Rank, Number) |
| `pit_war` | Slot Siege War | Occupy a slot, generate tokens, siege/counter-siege | Gameplay | `reason` (Action, Text — scout / search / withdraw / seize / be-seized / shop buy / one-key claim), `pit_activity_id` (Activity ID, Number), `pit_activity_name` (Activity Name, Text), `pit_id` (Slot Category ID, Text), `naming_guild` (Naming Clan ID, Text), `seat_id` (Slot ID, Number), `is_add` (High-Yield Bonus, Number — e.g. 100 for +100%), `people_list` (Dispatched Retainers, Object Group), `people_poewr` (Total Retainer Power, Number), `is_search` (From Search, Text — yes/no), `d_role_id` (Opponent Role ID, Text), `d_poewr` (Opponent Retainer Power, Number), `result` (Battle Result, Text — win/lose), `have_cinema` (Owned Slots List, Object Group), `pit_score_change` (Point Change, Number), `pit_score` (Personal Points, Number), `pit_rank` (Personal Rank, Number), `guild_id` (Clan ID, Text), `pit_guild_score` (Clan Points, Number), `pit_guild_rank` (Clan Rank, Number), `pit_shop_score` (Shop Point Change, Number), `pit_rank_playerId` (Rank Player ID, Text), `pit_rank_num` (Player Rank, Number), `pit_rank_score` (Player Rank Points, Number), `left_pit_shop_score` (Remaining Shop Points, Number), `get_item_info`, `item_use` |
| `current_online` | Current Online Users | Scheduled uplink per time (00/05/10 min…) | Online Count | `online_users` (Current Online, Number — one event per server + total), `server_id` (Server ID, Number) |

---

## #Common Event Properties

See [`../standard-base/common_event_properties.md`](../standard-base/common_event_properties.md). Standard properties include: `#device_id`, `#os`, `#os_version`, `#app_version`, `#system_language`, `#device_model`, `#network_type`, `client_version`, `platform`, `channel`, `account`, `server_id`, `player_id`, `nick_name`, `tmp_level`, `tmp_level_exp`, `tmp_vip_level`, `tmp_vip_exp`, `tmp_main_id`, `tmp_power`, `tmp_guild`, `tmp_monthpass`, `tmp_pass`, `max_battle_id`, `tmp_diamond`, `tmp_gold`, `total_pay_amount`, `total_pay_num`, `total_ad_num`.

---

## #User Data

See [`../standard-base/user_data.md`](../standard-base/user_data.md). Standard user properties include:

| Property Name | Display Name | Type | Update Mode | Note |
| --- | --- | --- | --- | --- |
| `device_id` | Device ID | Text | user_setOnce | Base |
| `client_version` | Client Version | Text | user_set |  |
| `network_type` | Network Type | Text | user_set |  |
| `platform` | Platform | Text | user_set | android/iOS/harmonyOS/PC |
| `channel` | Channel | Text | user_setOnce |  |
| `account` | Account | Text | user_setOnce |  |
| `server_id` | Server | Text | user_setOnce |  |
| `current_level` | Current Level | Number | user_set |  |
| `current_vip_level` | Current VIP Level | Number | user_set |  |
| `current_vip_exp` | Current VIP XP | Number | user_set |  |
| `player_id` | Role ID | Text | user_setOnce |  |
| `nick_name` | Role Nickname | Text | user_set |  |
| `current_power` | Current Total Power | Number | user_set |  |
| `current_monthpass` | Current Monthly Pass Status | Text | user_set |  |
| `current_pass` | Current Battle Pass Status | Text | user_set |  |
| `guild_id` | Clan ID | Text | user_set |  |
| `main_task` | Current Main Task | Text | user_set |  |
| `current_main_id` | Current Main Story Stage | Text | user_set |  |
| `register_time` | Register Time | Time | user_setOnce | Key timepoint |
| `server_time` | Server Open Time | Time | user_setOnce |  |
| `first_login_time` | First Login Time | Time | user_setOnce |  |
| `last_login_time` | Last Login Time | Time | user_set |  |
| `first_pay_time` | First Pay Time | Time | user_setOnce |  |
| `last_pay_time` | Last Pay Time | Time | user_set |  |
| `total_pay_amount` | Cumulative Pay Amount | Number | user_set | Cumulative |
| `total_pay_num` | Cumulative Pay Count | Number | user_set |  |
| `total_ad_num` | Cumulative Ad Views | Number | user_set |  |
| `total_spin_times` | Cumulative Spin Count | Number | user_set |  |
| `continuous_login_day` | Continuous Login Days | Number | user_set |  |
| `total_login_day` | Cumulative Login Days | Number | user_set |  |
| `tmp_diamond` | Current Diamond Balance | Number | user_set | Resource |
| `tmp_gold` | Current Gold Balance | Number | user_set |  |

---

## Appendix

- Data Type Design Principles → [`../standard-base/data_type_design_principles.md`](../standard-base/data_type_design_principles.md)
- Common Event Property Setup → [`../standard-base/common_event_properties_setup.md`](../standard-base/common_event_properties_setup.md)
- Multi-End Integration Notes → [`../standard-base/multi_platform_integration_notes.md`](../standard-base/multi_platform_integration_notes.md)
- Multi-User-ID System Suggestions → [`../standard-base/multi_user_id_system_recommendations.md`](../standard-base/multi_user_id_system_recommendations.md)
- ID System FAQ → [`../standard-base/id_system_faq.md`](../standard-base/id_system_faq.md)
