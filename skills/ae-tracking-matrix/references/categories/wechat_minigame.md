# WeChat Mini Game Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / WeChat Mini Game, cached 2026-09-28. Cloud version is authoritative.

## Event Data (#Event Data)

| Event Module | Event Name | Event Display Name | Event Description | Property Name | Property Display Name | Property Type | Property Description |
|---|---|---|---|---|---|---|---|
| Basic Data | ta_mp_launch | Mini Program Initialization | Collected when client auto-collection is enabled |  |  |  |  |
|  | ta_mp_show | Mini Program Launch | Triggered when the game starts, timing begins (collected when client auto-collection is enabled) |  |  |  |  |
|  | ta_mp_hide | Mini Program Exit | Recorded on game logout, ending the timer (collected when client auto-collection is enabled) | #duration | Online Duration | number | Collected when client auto-collection is enabled |
|  | ta_mp_share | Mini Program Share | Collected when client auto-collection is enabled |  |  |  |  |
| Add Mini Program & Redirect | tap_addapp | Click Add to Mini Program | Recorded on clicking Add to My Mini Programs | button_id | Button ID | string |  |
|  | tap_otherapp | Click Other Game | Recorded on clicking another game icon | button_id | Button ID | string |  |
|  |  |  |  | other_appid | Other Game ID | string |  |
|  |  |  |  | other_appname | Other Game Name | string |  |
| Tutorial | guide_complete | Complete Tutorial | Recorded upon completion of each tutorial step | guide_step | Current Tutorial Step | number |  |
| Tasks & Benefits | task_completed | Complete Daily Task | Recorded on clicking to claim daily task | task_ID | Task ID | string |  |
|  |  |  |  | task_name | Task Name | string |  |
|  | sign | Complete Check-in | Recorded on clicking check-in | sign_day | Check-in Days | number |  |
|  | reward | Claim Daily Benefit | Recorded on clicking to claim | reward_name | Reward Name | string | First time |
|  | lucky_draw | Lucky Draw | Recorded upon completing a lucky draw | reward_name | Reward Name | string |  |
|  | change | Galaxy Exchange | Recorded upon completing galaxy exchange | resource_name | Exchanged Resource Name | string | Exchange 1000 gold, etc. |
|  | qa_sign | Customer Service Check-in | Recorded upon completing customer service check-in |  |  |  |  |
| Hero Development | equip_level_up | Equipment Level Up | Recorded on equipment level up | hero_id | Hero ID | string |  |
|  |  |  |  | hero_name | Hero Name | string |  |
|  |  |  |  | equip_name | Equipment Name | string |  |
|  |  |  |  | new_level | Level After Upgrade | number |  |
|  |  |  |  | new_fight | Combat Power After Upgrade | number |  |
|  | unlock_hero | Hero Unlock | Recorded on unlocking a hero | hero_id | Hero ID | string |  |
|  |  |  |  | hero_name | Hero Name | string |  |
|  | unlock_equip | Equipment Unlock | Recorded on unlocking equipment | hero_id | Hero ID | string |  |
|  |  |  |  | hero_name | Hero Name | string |  |
|  |  |  |  | equip_name | Equipment Name | string |  |
|  | unlock_skill | Skill Unlock | Recorded on unlocking a skill | hero_id | Hero ID | string |  |
|  |  |  |  | hero_name | Hero Name | string |  |
|  |  |  |  | skill_name | Skill Name | string |  |
|  |  |  |  | skill_type | Skill Type | string | Normal, melee, ranged, etc. |
| Battle Module | game_start | Start Battle | Recorded on starting a battle | enemy_id | Opponent ID | string |  |
|  |  |  |  | enemy_fight | Opponent Combat Power | number |  |
|  |  |  |  | game_type | Battle Type | string |  |
|  | game_end | Battle End | Recorded on natural battle end | enemy_id | Opponent ID | string |  |
|  |  |  |  | enemy_fight | Opponent Combat Power | number |  |
|  |  |  |  | game_type | Battle Type | string |  |
|  |  |  |  | game_result | Battle Result | string |  |
|  |  |  |  | resource_name | Resource Type Obtained | string | Diamond, gold |
|  |  |  |  | resource_num | Resource Quantity Obtained | number |  |
|  | game_quit | Quit Battle | Recorded on exiting battle midway | enemy_id | Opponent ID | string |  |
|  |  |  |  | enemy_fight | Opponent Combat Power | string |  |
|  |  |  |  | game_type | Battle Type | string |  |
| Other Gameplay | get_gift | Claim Gift Pack | Recorded after claiming gift pack |  |  |  |  |
|  | get_play_reward | Claim Trial Play Reward | Recorded after claiming trial play reward | game_name | Trial Play Game Name | string |  |
|  | complete_friend | Friend Boost | On completion of gifting to friend |  |  |  |  |
|  | rank_event | Leaderboard Event | Scheduled report every day at midnight for the previous day's leaderboard snapshot, as a single json record | server_id | Server | string |  |
|  |  |  |  | rank_type_one | Leaderboard Main Category | string | Personal, alliance |
|  |  |  |  | rank_type_two | Leaderboard Sub Category | string | Lord level, military merit, etc. |
|  |  |  |  | rank1 | Rank 1 | string |  |
|  |  |  |  | rank2 | Rank 2 | string |  |
|  |  |  |  | rank3 | Rank 3 | string |  |
|  |  |  |  | rank4 | Rank 4 | string |  |
|  |  |  |  | rank5 | Rank 5 | string |  |
|  |  |  |  | rank6 | Rank 6 | string |  |
|  |  |  |  | rank7 | Rank 7 | string |  |
|  |  |  |  | rank8 | Rank 8 | string |  |
|  |  |  |  | rank9 | Rank 9 | string |  |
|  |  |  |  | rank10 | Rank 10 | string |  |
|  |  |  |  | rank_list | Rank List | list |  |
| Ad Module | show_button | Ad Button Display | Recorded on ad play button pop-up | ad_id | Ad ID | string |  |
|  |  |  |  | ad_time | Ad Duration | number | Total duration of this ad |
|  |  |  |  | view_reason | Viewing Entry | string | Double revenue, lucky wheel, etc. |
|  | click_button | Click Play Button | Recorded on clicking the ad's play button | ad_id | Ad ID | string |  |
|  |  |  |  | ad_time | Ad Duration | number | Total duration of this ad |
|  |  |  |  | view_reason | Viewing Entry | string | Double revenue, lucky wheel, etc. |
|  | ad_start | Ad Start | Ad starts playing, and timer starts | ad_id | Ad ID | string |  |
|  |  |  |  | ad_time | Ad Duration | number | Total duration of this ad |
|  |  |  |  | view_reason | Viewing Entry | string | Double revenue, lucky wheel, etc. |
|  | ad_end | Ad End | Ad stops playing, timer ends, upload duration field ad_duration | ad_id | Ad ID | string |  |
|  |  |  |  | ad_time | Ad Duration | number | Total duration of this ad |
|  |  |  |  | ad_duration | Ad Watch Duration | number | Actual watch duration of this ad |
|  |  |  |  | view_reason | Viewing Entry | string | Double revenue, lucky wheel, etc. |
|  |  |  |  | view_complete | Is Fully Watched | bool | Whether the user fully watched this ad |
|  | tap_ad | Click Ad | Recorded on clicking ad page button | ad_id | Ad ID | string | Whether "Download Now" was clicked |
| Cost Event | cost_event | Cost Event | Upload cost as an event with a custom unchanging ID | channel | Channel | string |  |
|  |  |  |  | cost_money | Cost Spend | number |  |

## Common Event Properties (#Common Event Properties)

| Property Category | Property Name | Property Display Name | Property Type | Property Description |
|---|---|---|---|---|
| System Preset | #device_id | Device ID | string | Device ID or device-related ID, such as uuid |
|  | #os | Operating System | string | ios, android |
|  | #os_version | OS Version | string | e.g., Android OS 9 |
|  | #app_version | App Version | string |  |
|  | Properties automatically collected by the Mini Game SDK; see the SDK integration documentation for details. |  |  |  |
| Resource | fight | Combat Power | number | Player's combat power at the time of the event |
|  | gold | Gold Quantity | number | Player's gold quantity at the time of the event |
|  | diamond | Diamond Quantity | number | Player's star quantity at the time of the event |
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
| #account_id | Account ID | System Property | Set as the WeChat openID |
| #distinct_id | Visitor ID | System Property | Do not configure |
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
