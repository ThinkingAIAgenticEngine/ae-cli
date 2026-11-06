# MMO Web Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / MMO Web, 2026-09-28 cache. Cloud is the authoritative version.

## Event Data (#event-data)

| Event Module | Event Name | Event Display Name | Event Description | Property Name | Property Display Name | Property Type | Property Description |
|---|---|---|---|---|---|---|---|
| Basic Data | ta_app_install | Game Install | Collected automatically when client auto-collection is enabled |  |  |  |  |
|  | ta_app_start | Game Launch | Triggered when the game starts, timing begins (collected automatically when client auto-collection is enabled) |  |  |  |  |
|  | register | Account Register | After registration completes |  |  |  |  |
|  | account_login | Account Login | After login completes | account_type | Account Type | text | Phone number, ladder account |
|  | create_role | Create Role | Recorded when the user creates a role | role_name | Role Nickname | text |  |
|  | role_login | Role Login | Recorded when the role logs in | first_login | First Login | bool | Whether this is first login |
|  | ta_app_end | Game Logout | Recorded on game logout, ends timing (collected automatically when client auto-collection is enabled) | #duration | Online Duration | number | Collected automatically when client auto-collection is enabled |
|  | level_up | Role Level Up | Recorded when the role levels up | new_level | Level After Upgrade | number |  |
|  | vip_levelup | VIP Promotion | Recorded when VIP level is upgraded | new_level | Level After Upgrade | number |  |
| Recharge Module | order_init | Initiate Order | User initiates a recharge order | pay_enter | Payment Entry | text |  |
|  |  |  |  | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  | order_finish | Order Complete | Order completed | pay_enter | Payment Entry | text |  |
|  |  |  |  | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | text | WeChat, Alipay, etc. |
| Pet | get_pet | Acquire Pet | Recorded when a pet is acquired | pet_id | Pet ID | text |  |
|  |  |  |  | pet_name | Pet Name | text |  |
|  | pet_rankup | Pet Rank Up | Recorded when the pet rank changes | pet_id | Pet ID | text |  |
|  |  | Pet Rank Up |  | pet_name | Pet Name | text |  |
|  |  |  |  | new_rank | Rank After Upgrade | number |  |
| Task | task_completed | Complete Task | Recorded on click to claim | task_type | Task Type | text | Main, side, daily, weekly |
|  |  |  |  | task_ID | Task ID | text |  |
|  |  |  |  | task_name | Task Name | text |  |
| Backpack | compose_equip | Compose Equipment | Recorded on equipment composition completion | compose_type | Composition Type | text | Immortal battle compose, compose |
|  |  |  |  | equip_type | Equipment Type | text | Immortal battle equipment, comprehensive, activity, immortal seal, etc. |
|  |  |  |  | equip_id | Equipment ID | text |  |
|  |  |  |  | equip_name | Equipment Name | text | Immortal battle helmet, nvarhong, etc. |
|  | buy_market_item | Buy Market Item | Recorded on purchasing an item in the market | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
|  |  |  |  | cost_resource | Resource Consumed | text |  |
|  |  |  |  | cost_num | Amount Consumed | number |  |
|  | on_the_shelf | List Item | Recorded on listing an item in the market | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
|  |  |  |  | sale_price | Total Sale Price | number |  |
|  | off_the_shelf | Delist Item | Recorded on delisting an item in the market | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
|  |  |  |  | sale_price | Total Sale Price | number |  |
|  | recovery_equip | Recycle Equipment | Recorded on recycling equipment in backpack, including hotkey recycle | recovery_reward | Recycle Reward | number | Diamonds rewarded per recycle |
| Shop | buy_shop_item | Buy Shop Item | Recorded on purchasing an item in the shop | shop_type | Shop Type | text |  |
|  |  |  |  | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
|  |  |  |  | cost_resource | Resource Consumed | text |  |
|  |  |  |  | cost_num | Amount Consumed | number |  |
| Mount | unlock_mount | Activate Mount | Recorded on activating a mount | mount_name | Mount Name | text |  |
|  | mount_rankup | Mount Rank Up | Recorded when the mount ranks up | mount_name | Mount Name | text |  |
|  |  |  |  | new_rank | Rank After Upgrade | number |  |
|  | unlock_mount_skill | Activate Mount Skill | Recorded on activating a mount skill | mount_name | Mount Name | text |  |
|  |  |  |  | skill_name | Skill Name | text |  |
| Skill | get_skill | Learn Skill | Recorded after the role learns a skill | skill_id | Skill ID | text |  |
|  |  |  |  | skill_name | Skill Name | text |  |
|  | up_skill | Upgrade Skill | Recorded when a role skill is upgraded | skill_id | Skill ID | text |  |
|  |  |  |  | skill_name | Skill Name | text |  |
|  |  |  |  | new_level | Level After Upgrade | number |  |
| Transformation | unlock_skin | Activate Transformation | Recorded on activating a transformation | skin_id | Transformation ID | text |  |
|  |  |  |  | skin_name | Transformation Name | text |  |
|  |  |  |  | skin_type | Transformation Type | text |  |
|  |  |  |  | skin_rarity | Transformation Rarity | text |  |
| Realm | up_state | Realm Promotion | Recorded when the realm is promoted | new_state | Realm After Promotion | text | Foundation Building, etc. |
|  | up_title | Promote Title | Recorded on title promotion completion | new_title | Title After Promotion | text |  |
| Seven-Day Login | login_reward | Claim Login Reward | Recorded on claiming the seven-day login reward | login_day | Login Day Count | number |  |
| Forging | strengthen_equip | Equipment Enhancement | Recorded on completing enhancement of a piece of equipment | equip_id | Equipment ID | text |  |
|  |  |  |  | equip_nae | Equipment Name | text |  |
|  |  |  |  | new_level | Level After Enhancement | number |  |
| Server Opening Welfare | get_open_welfare | Claim Server Opening Welfare | Recorded on claiming server opening welfare | blessing_type | Blessing Type | text | Level blessing, recharge blessing |
|  |  |  |  | get_condition | Claim Condition | text | Reach level 200, etc. |
| Treasure Hunt | treasure_hunt | Join Treasure Hunt | Recorded after completing one treasure hunt | hunt_type | Hunt Type | text | Hunt once, hunt 10 times, etc. |
|  |  |  |  | reward_list | Rewards Obtained | list | List of reward item IDs uploaded |
|  | points_exchange | Points Exchange | Recorded after completing one points exchange | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
|  |  |  |  | cost_points | Points Spent | number |  |
| Prayer | pray | Join Prayer | Recorded on completing one prayer | pray_type | Prayer Type | text | Diamond prayer, experience prayer, military merit prayer |
|  |  |  |  | cost_num | Amount Spent This Time | number |  |
|  |  |  |  | get_num | Amount Received This Time | number |  |
| Trial Hall | enter_dungeon | Challenge Stage | Recorded when the player enters a dungeon or stage | dungeon_id | Stage ID | text |  |
|  |  |  |  | dungeon_name | Stage Name | text |  |
|  | dungeon_completed | Stage Cleared | Recorded when the player clears a dungeon or stage | dungeon_id | Stage ID | text |  |
|  |  |  |  | dungeon_name | Stage Name | text |  |
|  |  |  |  | resource_get | Clearance Reward Resources | list | Resource names |
|  |  |  |  | resource_num | Clearance Reward Quantities | list | Resource quantities |
|  | dungeon_fail | Stage Failed | Recorded when the player fails a dungeon or stage challenge | dungeon_id | Stage ID | text |  |
|  |  |  |  | dungeon_name | Stage Name | text |  |
|  | dungeon_mopup | Sweep Stage | Recorded when the player completes a sweep | dungeon_id | Stage ID | text |  |
|  |  |  |  | dungeon_name | Stage Name | text |  |
| Welfare Hall | sign | Daily Sign-in | Recorded when the player signs in | sign_type | Sign-in Type | text | Sign-in, retroactive sign-in, claim again |
|  |  |  |  | sign_day | Sign-in Day Count | number |  |
|  | online_reward | Online Reward | Recorded on claiming an online reward | online_time | Cumulative Online Duration | number | Unit: minutes |
|  | offline_reward | Claim Offline Experience | Recorded on claiming offline experience | privilege_level | Privilege Level | text | Basic reward, Gold privilege, King privilege |
|  | get_activation_reward | Claim Activation Code Reward | Recorded on claiming activation code reward | activation_code | Activation Code | text |  |
| Favorite Game | store_game | Favorite Game | Recorded on favoriting a game |  |  |  |  |
| Daily Cumulative Recharge | get_day_recharge | Claim Recharge Reward | Recorded on claiming daily recharge reward | recharge_num | Cumulative Gold Ingots Recharged | number |  |
| Super First Recharge | get_first_recharge | Claim First Recharge Reward | Recorded on claiming the first recharge reward | recharge_day | First Recharge Day | text | Day one, day two |
| Privilege Card | activate_privilege | Activate Privilege Card | Recorded on activating a privilege card | privilege_type | Privilege Card Type | text | Silver, Gold, King |
| Universal Celebration | worship | Worship | Recorded on clicking worship to receive reward |  |  |  |  |
|  | buy_discount | Buy Discount Item | Recorded on purchasing a discount item | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
|  |  |  |  | discount | Discount | number |  |
|  |  |  |  | cost_coin_num | Gold Ingots Spent | number |  |
| Idle | get_hungup | Claim Idle Reward | Recorded on claiming idle reward | get_diamond_num | Diamonds Received | number |  |
| boss Bounty | challenge_boss | Challenge boss | Recorded on entering boss challenge | boss_id | boss ID | text |  |
|  |  |  |  | boss_name | boss Name | text |  |
|  |  |  |  | boss_type | boss Type | text | Earth realm boss, Huangling boss, etc. |
|  | challenge_victory | Challenge boss Success | Recorded when challenging boss succeeds | boss_id | boss ID | text |  |
|  |  |  |  | boss_name | boss Name | text |  |
|  |  |  |  | boss_type | boss Type | text | Earth realm boss, Huangling boss, etc. |
|  | challenge_fail | Challenge boss Failure | Recorded when challenging boss fails | boss_id | boss ID | text |  |
|  |  |  |  | boss_name | boss Name | text |  |
|  |  |  |  | boss_type | boss Type | text | Earth realm boss, Huangling boss, etc. |
|  | get_boss_gift | Claim boss Gift Pack | Recorded after claiming the boss gift pack | reward_list | Reward Names | list |  |
|  |  |  |  | num_list | Reward Quantities | list |  |
| Guild | join_guild | Join Guild | Triggered on joining another guild | guild_level | Guild Level | number |  |
|  |  |  |  | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild Name | text |  |
|  |  |  |  | guild_position | Guild Position | text | Leader, member, etc. |
|  |  |  |  | owner_name | Guild Leader Name | text |  |
|  |  |  |  | guild_rank | Guild Rank | text |  |
|  | leave_guild | Leave Guild | Triggered on leaving the guild | guild_level | Guild Level | number |  |
|  |  |  |  | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild Name | text |  |
|  |  |  |  | guild_position | Guild Position | text | Leader, member, etc. |
|  |  |  |  | owner_name | Guild Leader Name | text |  |
|  |  |  |  | guild_rank | Guild Rank | text |  |
|  | create_guild | Create Guild | Triggered when self-creating a guild | guild_level | Guild Level | number |  |
|  |  |  |  | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild Name | text |  |
|  |  |  |  | owner_name | Guild Leader Name | text |  |
|  |  |  |  | guild_rank | Guild Rank | text |  |
|  | guild_sign | Guild Sign-in | Recorded after completing guild sign-in | sign_type | Sign-in Type | text | Normal sign-in, intermediate sign-in, etc. |
|  | guild_like | Like | Recorded on completing a like in the guild |  |  |  |  |
|  | open_guild_box | Open Guild Treasure Box | Recorded on opening guild treasure box | box_type | Box Type | text |  |
|  | open_party | Open Party | Recorded on opening a party |  |  |  |  |
|  | enter_battle | Enter Guild War | Recorded on entering guild war |  |  |  |  |
| Daily Goal | up_activity | Upgrade Activity | Recorded on upgrading activity | new_level | Level After Upgrade | number |  |
|  | get_daily_reward | Claim Daily Reward | Recorded on claiming daily reward | get_points | Points Claimed | number |  |
| Spirit Bead | submit_stone | Submit Spirit Stone | Recorded after submitting a spirit stone |  |  |  |  |
|  | set_bead | Inlay Spirit Bead | Recorded after completing spirit bead inlay | bead_id | Spirit Bead ID | text |  |
|  |  |  |  | bead_name | Spirit Bead Name | text |  |
| Fierce Battle boss | challenge_boss | Challenge boss | Recorded when starting to challenge boss in Fierce Battle boss | boss_id | boss ID | text |  |
|  |  |  |  | boss_name | boss Name | text |  |
|  |  |  |  | boss_type | boss Type | text | Earth realm boss, Huangling boss, etc. |
|  | challenge_victory | Challenge boss Success | Recorded when challenging boss succeeds in Fierce Battle boss | boss_id | boss ID | text |  |
|  |  |  |  | boss_name | boss Name | text |  |
|  |  |  |  | boss_type | boss Type | text | Earth realm boss, Huangling boss, etc. |
|  | challenge_fail | Challenge boss Failure | Recorded when challenging boss fails in Fierce Battle boss | boss_id | boss ID | text |  |
|  |  |  |  | boss_name | boss Name | text |  |
|  |  |  |  | boss_type | boss Type | text | Earth realm boss, Huangling boss, etc. |
| boss Battle Experience | get_experience | Gain Experience | Recorded on claiming boss battle experience | experience_num | Experience Claimed | number |  |
|  |  |  |  | times | Multiplier | number |  |
| Five Ring Reward | get_five_reward | Claim Five Ring Reward | Recorded on claiming Five Ring reward | times | Multiplier | number |  |
| Space-Time Mine | mining | Mining | Recorded when mining | diamond_type | Diamond Type Obtained | text |  |
|  | update | Refresh | Recorded on refresh |  |  |  |  |
|  | plunder_success | Plunder Success | Recorded on plunder success | get_diamond_num | Diamonds Obtained | number |  |
|  | plunder_fail | Plunder Failure | Recorded on plunder failure |  |  |  |  |
| WeChat Gift | get_wechat_gift | Claim WeChat Gift | Recorded on completing WeChat gift claim |  |  |  |  |
| Magic Dragon Arrival | get_recharge_reward | Claim Cumulative Recharge Reward | Recorded on claiming cumulative recharge reward | recharge_coin_num | Cumulative Gold Ingots Recharged | number |  |
| Rank-Up Special | get_rankup_reward | Claim Rank-Up Special Reward | Recorded on claiming rank-up special reward | discount_type | Special Type | text | Divine Wings, Divine Weapon, Battle Armor, Battle Formation |
|  |  |  |  | gift_name | Gift Pack Name | text |  |
| Big Discount Gifts | buy_discount_gift | Buy Big Discount Gift | Recorded on purchasing big discount gift | project_name | Purchase Item | text |  |
|  |  |  |  | cost_coin_num | Gold Ingots Spent | number |  |
| Combat Power Ascension | get_fight_promote | Claim Combat Power Ascension | Recorded on claiming combat power ascension | fight_level | Combat Power Tier | number |  |
|  | get_king_promote | Claim King Ascension | Recorded on claiming king ascension |  |  |  |  |
|  | buy_cultivation_gift | Buy Cultivation Gift Pack | Recorded on purchasing cultivation gift pack | gift_name | Gift Pack Name | text |  |
| Gold Ingot Welfare | recovery_coin | Recycle Gold Ingot | Recorded when the player completes gold ingot recycle | red_packet_name | Red Packet Name | text |  |
|  |  |  |  | get_coin_num | Gold Ingots Obtained | number |  |
| Death | role_die | Role Death | Recorded on role death | die_reason | Death Reason/Node | text | Record the node of death |
| Item Change | item_change | Item Change | Recorded when an item changes | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
|  |  |  |  | change_type | Change Type | text | Gain, consume |
|  |  |  |  | change_num | Change Amount | number |  |
|  |  |  |  | change_before | Amount Before Change | number |  |
|  |  |  |  | change_after | Amount After Change | number |  |
|  |  |  |  | change_reason | Change Reason | text |  |

## Common Event Properties (#common-event-properties)

| Property Name | Property Display Name | Property Type | Property Description |
|---|---|---|---|
| #app_version | App Version | text |  |
| sever | Server ID | text | Server the player belongs to when the event occurs |
| level | Role Level | number | Player's level when the event occurs |
| vip_level | VIP Level | number | Player's VIP level when the event occurs |
| fight | Combat Power | number | Player's combat power when the event occurs |
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

## User Properties (#user-id-system)

| Property Name | Property Display Name | Property Description | Assignment Description |
|---|---|---|---|
| #account_id | Account ID | System property | Set as the role ID; set the account ID the role belongs to as a custom property of the role |
| #distinct_id | Visitor ID | System property | Device-related ID or business visitor ID; no need to pay attention if there is no pre-login behavior |
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
