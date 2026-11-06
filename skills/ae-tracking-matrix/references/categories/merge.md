# Merge Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / Merge, cached 2026-09-28. Cloud is the authoritative version.

## Event Data (#Event Data)

| Event Module | Event Name | Event Display Name | Event Description | Trigger Timing | Property Name | Property Display Name | Property Type | Property Description |
|---|---|---|---|---|---|---|---|---|
| Basic Data | ta_app_install | Game Install | Auto-collected by SDK | Triggered on install or uninstall/reinstall |  |  |  |  |
|  | ta_app_start | Game Launch | Auto-collected by SDK | Triggered when game launches |  |  |  |  |
|  | ta_app_end | Game Logout | Auto-collected by SDK | Triggered when game logs out | #duration | Online Duration | number |  |
|  | account_register | Account Register | Logged on successful player registration | Logged on successful player registration |  |  |  |  |
|  | account_login | Account Login | Logged on successful player login | Logged on successful player login |  |  |  |  |
|  | nu_guide | New User Guide | New user tutorial | On completing each tutorial step | type | Type | string | Guide step type |
|  |  |  |  |  | step | Tutorial Step | string |  |
|  | level_up | Level Up | Logged when leveling up | Logged when leveling up | old_level | Level Before Upgrade | number |  |
|  |  |  |  |  | new_level | Level After Upgrade | number |  |
| Merge Gameplay | order_create | Merge Order Created | When merge order is created | When merge order is created | order_id | Order ID | string |  |
|  |  |  |  |  | type | Type | string | Order type |
|  |  |  |  |  | rounds | Rounds | number |  |
|  |  |  |  |  | real_difficulty | Probability Difficulty (calculated by generator probability) | string |  |
|  |  |  |  |  | difficulty | Order's Expected Difficulty | string |  |
|  |  |  |  |  | difficulty_type | Difficulty Tier | string |  |
|  |  |  |  |  | difficulty_stage | Difficulty Stage | number |  |
|  |  |  |  |  | open_space | Unlocked Space | number |  |
|  |  |  |  |  | occupied_space | Occupied Space | number |  |
|  | order_delivery | Merge Order Delivery | When order is clicked to deliver merge | When order is clicked to deliver merge | order_id | Order ID | string |  |
|  |  |  |  |  | flag | Flag | string |  |
|  |  |  |  |  | type | Type | string | Order type |
|  |  |  |  |  | rounds | Rounds | number |  |
|  |  |  |  |  | difficulty_type | Difficulty Tier | string |  |
|  |  |  |  |  | difficulty_stage | Difficulty Stage | number |  |
|  |  |  |  |  | energy | Energy | number | Energy cost to deliver order items |
|  |  |  |  |  | energy_pd | Total energy consumed by the generator from start to finish for this order | number |  |
|  |  |  |  |  | difficulty | Order's Expected Difficulty | string |  |
|  |  |  |  |  | real_difficulty | Probability Difficulty (calculated by generator probability) | string |  |
|  |  |  |  |  | open_space | Unlocked Space | number |  |
|  |  |  |  |  | occupied_space | Occupied Space | number |  |
|  |  |  |  |  | reward | Reward Items | list |  |
|  |  |  |  |  | create_give_sec | Duration from creation to completion (in-game time) | number |  |
|  | cbgrid_unlock | Board Grid Unlock | Board grid unlock progress | Sent when board grid is unlocked after merge | valid_cbspace | Effective board space after successful unlock | string |  |
|  |  |  |  |  | lock1 | Remaining grids locked at level 1 | number |  |
|  |  |  |  |  | lock2 | Remaining grids locked at level 2 | number |  |
| Storyline Module | drama_unlock | Storyline Unlock | Storyline unlock progress | Sent when fog is successfully unlocked | drama_id | Storyline ID | string | Unlocked storyline ID |
|  |  |  |  |  | drama_name | Unlocked Storyline Name | string |  |
|  |  |  |  |  | conditions | Unlock Conditions | list |  |
|  | drama_stats | Storyline Stats | Statistics on the storyline page after each storyline page is closed | From storyline popup display to close | build_id | Building ID | string |  |
|  |  |  |  |  | drama_id | Storyline ID | string |  |
|  |  |  |  |  | process | Storyline Progress | number |  |
|  |  |  |  |  | total_process | Total progress of this storyline segment | number |  |
|  |  |  |  |  | source | Source | string |  |
|  |  |  |  |  | skip | Whether skip was clicked | number |  |
|  |  |  |  |  | cost_time | Time from dialog display to close | number |  |
|  |  |  |  |  | timing | Trigger timing of this storyline segment | string |  |
| Economy System | hp_buy_pop | Buy Energy Popup | Reported after popup is closed | Reported after popup is closed | opportunity | Popup Timing | string |  |
|  |  |  |  |  | click_to_jump | Whether player clicked purchase jump | bool |  |
|  |  |  |  |  | product_id | Product ID player clicked to jump to | string |  |
|  | diamond_consume | Diamond Consume | Reported on successful consumption | Reported on successful consumption | subreason | Change Detail | string |  |
|  |  |  |  |  | change_reason | Change Channel | string |  |
|  |  |  |  |  | incr_after | Amount After Change | number |  |
|  |  |  |  |  | incr_consume | Change Amount | number |  |
|  |  |  |  |  | change_result | Change Result | string |  |
|  | diamond_get | Diamond Get | Reported on successful acquisition | Reported on successful acquisition | subreason | Change Detail | string |  |
|  |  |  |  |  | change_reason | Change Channel | string |  |
|  |  |  |  |  | hangup_time | Idle Duration | number |  |
|  |  |  |  |  | incr_after | Amount After Change | number |  |
|  |  |  |  |  | incr_consume | Change Amount | number |  |
|  | gold_consume | Gold Consume | Reported on successful consumption | Reported on successful consumption | subreason | Change Detail | string |  |
|  |  |  |  |  | change_reason | Change Channel | string |  |
|  |  |  |  |  | incr_after | Amount After Change | number |  |
|  |  |  |  |  | incr_consume | Change Amount | number |  |
|  |  |  |  |  | change_result | Change Result | string |  |
|  | gold_get | Gold Get | Reported on successful acquisition | Reported on successful acquisition | subreason | Change Detail | string |  |
|  |  |  |  |  | change_reason | Change Channel | string |  |
|  |  |  |  |  | hangup_time | Idle Duration | number |  |
|  |  |  |  |  | incr_after | Amount After Change | number |  |
|  |  |  |  |  | incr_consume | Change Amount | number |  |
|  | props_consume | Item Consume | Reported on successful consumption | Reported on successful consumption | subreason | Change Detail | string | Item consume may include other non-currency resource consumption, such as energy, activity participation count, challenge points, etc. |
|  |  |  |  |  | change_reason | Change Channel | string |  |
|  |  |  |  |  | incr_after | Amount After Change | number |  |
|  |  |  |  |  | incr_consume | Change Amount | number |  |
|  |  |  |  |  | item_type | Item Type | string |  |
|  |  |  |  |  | item_id | Item ID | string |  |
|  |  |  |  |  | change_result | Change Result | string |  |
|  | props_get | Item Get | Reported on successful acquisition (including shop purchases) | Reported on successful acquisition (including shop purchases) | subreason | Change Detail | string |  |
|  |  |  |  |  | change_reason | Change Channel | string |  |
|  |  |  |  |  | hangup_time | Idle Duration | number |  |
|  |  |  |  |  | incr_after | Amount After Change | number |  |
|  |  |  |  |  | incr_consume | Change Amount | number |  |
|  |  |  |  |  | item_type | Item Type | string |  |
|  |  |  |  |  | item_id | Item ID | string |  |
|  |  |  |  |  | first_get_ok | First-time acquisition of specified item flag | string | 1 for first-time acquisition, 2 for non-first-time acquisition |
| Payment Module | goods_click | Click Product | On product click | Triggered on product click | goods_id | Product ID | string |  |
|  |  |  |  |  | item_name | Product Name | string |  |
|  |  |  |  |  | source | Source | string |  |
|  | purchase | Order Payment | On order payment result | On order payment result | order_id | Order ID | string |  |
|  |  |  |  |  | order_type | Order Type | string |  |
|  |  |  |  |  | pay_result | Payment Result | string |  |
|  |  |  |  |  | goods_id | Product ID | string |  |
|  |  |  |  |  | item_name | Product Name | string |  |
|  |  |  |  |  | is_first | Whether first successful purchase | string |  |
|  |  |  |  |  | order_amount | Order Amount | number |  |
|  |  |  |  |  | currency_type | Currency Unit | string |  |
|  |  |  |  |  | trigger_pack | Popup Timing | string |  |
| Ad Module | show_button | Ad Button Display | Logged when ad play button pops up |  | ad_id | Ad ID | string |  |
|  |  |  |  |  | ad_time | Ad Duration | number |  |
|  |  |  |  |  | view_reason | View Entry | string |  |
|  | click_button | Click Play Button | Logged when ad play button is clicked |  | ad_id | Ad ID | string |  |
|  |  |  |  |  | ad_time | Ad Duration | number |  |
|  |  |  |  |  | view_reason | View Entry | string |  |
|  | ad_start | Ad Start | Ad starts playing, timer starts counting |  | ad_id | Ad ID | string |  |
|  |  |  |  |  | ad_time | Ad Duration | number |  |
|  |  |  |  |  | view_reason | View Entry | string |  |
|  | ad_end | Ad End | Ad stops playing, timer ends, uploads duration field ad_duration |  | ad_id | Ad ID | string |  |
|  |  |  |  |  | ad_time | Ad Duration | number |  |
|  |  |  |  |  | ad_duration | Ad View Duration | number |  |
|  |  |  |  |  | view_reason | View Entry | string |  |
|  |  |  |  |  | view_complete | Whether watched completely | bool |  |
|  | tap_ad | Click Ad | Logged when ad page button is clicked |  | ad_id | Ad ID | string |  |
| Task & Activity | task_completed | Complete Task | Logged on task completion |  | task_type | Task Type | string |  |
|  |  |  |  |  | task_id | Task ID | string |  |
|  |  |  |  |  | task_name | Task Name | string |  |
|  |  |  |  |  | task_status | Task Stage | string |  |
|  | activity_completed | Complete Activity | Logged on activity completion |  | activity_type | Activity Type | string |  |
|  |  |  |  |  | activity_id | Activity ID | string |  |
|  |  |  |  |  | activity_name | Activity Name | string |  |
|  |  |  |  |  | activity_status | Activity Stage | string |  |
|  | sign | Complete Sign-in | Logged when sign-in is clicked |  | sign_day | Sign-in Days | number |  |
| Friend Module | add_friend | Add Friend Request | Logged when add request is sent | Logged when add request is sent | friend_id | Target ID | string |  |
|  |  |  |  |  | scene | Add Channel/Scene | string |  |
|  | delete_friend | Delete Friend | Reported after successfully deleting a friend | Reported after successfully deleting a friend | friend_id | Target ID | string |  |
|  | respond_friend | Respond to Add | Reported after successfully handling received friend request | Reported after successfully handling received friend request | friend_id | Target ID | string |  |
|  |  |  |  |  | if_pass_friend | Whether approved | bool |  |
| Other Gameplay | battlepass_progress | Battle Pass Progress | Battle pass progress event | When items are claimed/unlocked/purchased in the battle pass | bp_name | Season Battle Pass Name | string |  |
|  |  |  |  |  | bp_id | Season Battle Pass Unique ID | string |  |
|  |  |  |  |  | reward | Reward Items | list |  |
|  |  |  |  |  | bp_level | Battle Pass Level at Unlock or Claim | number |  |
|  |  |  |  |  | bp_status | Battle Pass Status User Owns at This Moment | number |  |
|  |  |  |  |  | bp_type | Season Battle Pass Config | number |  |
|  |  |  |  |  | rw_status | Reward Item Status | number |  |
|  |  |  |  |  | info | Other Info | string |  |
|  | book_action | Codex Unlock | Codex unlock | Player codex unlock, claim reward |  |  |  |  |
|  |  |  |  |  | unlock_item_processs | Unlock progress for the corresponding item | number |  |
|  |  |  |  |  | receive_item_id | Claimed item_id | string |  |
|  |  |  |  |  | receive_item_processs | Claimed item progress | number |  |
|  |  |  |  |  | total_processs | Merged item count | number |  |
|  |  |  |  |  | if_get_super_gem | Whether gem is claimed | number |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |

## Common Event Properties (#Common Event Properties)

| Property Category | Property Name | Display Name | Property Type | Property Description |
|---|---|---|---|---|
| System Preset | #device_id | Device ID | string | Device ID or device-related ID, e.g. uuid |
|  | #os | Operating System | string | ios, android |
|  | #os_version | OS Version | string | e.g. Android OS 9 |
|  | #app_version | App Version | string |  |
|  | System preset properties are auto-collected; preset properties vary slightly by SDK, see SDK integration docs for details |  |  |  |
| Basic Info | channel | Channel | string | Channel info |
|  | level | Current Level | number | User's level at event time |
|  | ab_test | Experiment Label | list | Experiment group the user is in at event time |
|  | total_login | Cumulative Login Days | number | Player's cumulative login days at event time |
|  | total_pay | Cumulative Payment Total | number | Player's cumulative payment amount at event time |
| Resources | gold | Gold Amount | number | Player's gold amount at event time |
|  | diamond | Diamond Amount | number | Player's diamond amount at event time |
|  | energy | Energy | number | Player's energy amount at event time |
|  | tmp_items_detail | Current Owned Items Detail | object group | Player's item details at event time |
|  | chapter | Chapter | number | Current chapter at event time |
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
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## User Properties (User ID System)

| Property Name | Display Name | Property Description | Assignment Description |
|---|---|---|---|
| #account_id | Account ID | System Property | Set as player's account ID |
| #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID; auto-generated when using client SDK |
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
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
