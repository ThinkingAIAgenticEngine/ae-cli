# Idle Game Tracking Plan


## #User ID System

| Game Type | Property Name | Property Display Name | Property Description | Assignment Description |  |  | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Single account, single role | #account_id | Account ID | System property | Set to the player's unique account ID |  |  | Choose this plan |
|  | #distinct_id | Visitor ID | System property | Device-related id or visitor id within the business; if using the client SDK, no need to worry about it |  |  |  |


## #Event Data

| Module | Event Name (required) | Event Display Name | Event Description | Event Tag | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Client SDK auto-collection events | ta_app_install | App Install |  |  |  |  |  |  |
|  | ta_app_start | App Start |  |  |  |  |  |  |
|  | ta_app_end | App Close |  |  |  |  |  |  |
|  | ta_app_crash | App Crash |  |  |  |  |  |  |
| Basic events | new_device | Device Activation | Reported on first activation of the device, using [first-event] |  |  |  |  |  |
|  | register | User/Account Registration | Reported after (account) registration completes |  |  |  |  |  |
|  | login | User/Account Login | Reported after (account) login succeeds |  | login_type | Login type | text | Phone, email, WeChat, etc. |
|  | logout | User/Account Logout | Reported after (account) logout succeeds |  |  |  |  |  |
|  | level_up | Level Up | Reported when player/role levels up |  | level | Level after level up | number |  |
|  | vip_levelup | VIP Level Up | Reported when VIP level is raised |  | vip_level | VIP level after level up | number |  |
|  | guide_complete | Complete New Player Guide | Reported each time a step of the new player guide is completed |  | guide_id | Guide category | text |  |
|  |  |  |  |  | guide_step | Guide step | number |  |
|  | monthpass_activate | Monthly Pass Activate | Reported when monthly pass is activated |  | monthpass_id | Monthly pass ID | text |  |
|  | pass_activate | Battle Pass Activate | Reported when battle pass is activated |  | pass_id | Battle pass ID | text |  |
| Recharge and Store | init_order | Initiate Recharge | Reported when a recharge is initiated |  | order_id | Order ID | text |  |
|  |  |  |  |  | pay_amount | Payment amount | number |  |
|  |  |  |  |  | payment_name | Purchased item name | text |  |
|  |  |  |  |  | payment_num | Purchased quantity | number |  |
|  |  |  |  |  | payment_type | Payment method | text | Alipay/WeChat |
|  | payment | Recharge Success | Reported when recharge succeeds |  | order_id | Order ID | text |  |
|  |  |  |  |  | pay_amount | Payment amount | number |  |
|  |  |  |  |  | currency_type | Payment currency | text | To use the [FX integration] feature, must conform to ISO 4217 (e.g., CNY, USD, EUR) |
|  |  |  |  |  | payment_name | Purchased item name | text |  |
|  |  |  |  |  | payment_num | Purchased quantity | number |  |
|  |  |  |  |  | payment_type | Payment method | text | Alipay/WeChat |
|  |  |  |  |  | is_first | Is first time | bool | Yes/No |
|  | payment_fail | Recharge Fail | Reported when recharge fails |  | order_id | Order ID | text |  |
|  |  |  |  |  | pay_amount | Payment amount | number |  |
|  |  |  |  |  | payment_name | Purchased item name | text |  |
|  |  |  |  |  | payment_num | Purchased quantity | number |  |
|  |  |  |  |  | payment_type | Payment method | text | Alipay/WeChat |
|  |  |  |  |  | fail_reason | Failure reason | text |  |
|  | shop_buy | Shop Purchase | Reported after purchasing an item in the shop |  | shop_id | Shop ID | text |  |
|  |  |  |  |  | item_id | Item ID | text |  |
|  |  |  |  |  | item_num | Item quantity | number |  |
|  |  |  |  |  | item_price | Item price | number |  |
|  | shop_refresh | Shop Refresh | Reported when "refresh shop" is clicked |  | shop_id | Shop ID | text |  |
| Ad Monetization Module | ad_request | Ad Request | Triggered when an ad is requested |  | ad_platform | Ad platform | text | e.g., Pangle, Tencent GDT, Kuaishou |
|  |  |  |  |  | ad_id | Third-party ad ID | text | e.g., 945816492 |
|  |  |  |  |  | ad_type | Ad type | text | e.g., full-screen video, rewarded video, interstitial |
|  |  |  |  |  | ad_placement_name | Internal ad placement name | text | e.g., home_feed |
|  |  |  |  |  | ad_placement_id | Internal ad placement ID | text | Physical ad placement id within the app |
|  |  |  |  |  | current_page | Current page | text | Physical ad placement name within the app, e.g., phone boosting, phone boost result page, return from phone boost result page, etc. |
|  |  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  | ad_response | Ad Response (Fill) | Triggered after an ad request returns |  | ad_platform | Ad platform | text | e.g., Pangle, Tencent GDT, Kuaishou |
|  |  |  |  |  | ad_id | Third-party ad ID | text | e.g., 945816492 |
|  |  |  |  |  | ad_type | Ad type | text | e.g., full-screen video, rewarded video, interstitial |
|  |  |  |  |  | ad_placement_name | Internal ad placement name | text | e.g., home_feed |
|  |  |  |  |  | ad_placement_id | Internal ad placement ID | text | Physical ad placement id within the app |
|  |  |  |  |  | current_page | Current page | text | Physical ad placement name within the app, e.g., phone boosting, phone boost result page, return from phone boost result page, etc. |
|  |  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  |  |  |  |  | is_filled_success | Is fill successful | bool |  |
|  |  |  |  |  | error_detail_info | Ad error info | text | Error info returned by the third-party platform's ad fill |
|  |  |  |  |  | error_detail_code | Ad error code | text | Error code returned by the third-party platform's ad fill |
|  | ad_show | Ad Show | Triggered when ad is shown, e.g., ad show success means fill success & show success; ad show fail means fill success & show fail or fill fail & show fail |  | ad_platform | Ad platform | text | e.g., Pangle, Tencent GDT, Kuaishou |
|  |  |  |  |  | ad_id | Third-party ad ID | text | e.g., 945816492 |
|  |  |  |  |  | ad_type | Ad type | text | e.g., full-screen video, rewarded video, interstitial |
|  |  |  |  |  | ad_placement_name | Internal ad placement name | text | e.g., home_feed |
|  |  |  |  |  | ad_placement_id | Internal ad placement ID | text | Physical ad placement id within the app |
|  |  |  |  |  | current_page | Current page | text | Physical ad placement name within the app, e.g., phone boosting, phone boost result page, return from phone boost result page, etc. |
|  |  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  |  |  |  |  | ad_app_name | Advertiser info | text | Advertiser info: specific ad brand; takes "unknown" if unavailable |
|  | ad_click | Ad Click | Triggered on ad click; if ad clicks cannot be captured, triggered when the ad platform returns click info |  | ad_platform | Ad platform | text | e.g., Pangle, Tencent GDT, Kuaishou |
|  |  |  |  |  | ad_id | Third-party ad ID | text | e.g., 945816492 |
|  |  |  |  |  | ad_type | Ad type | text | e.g., full-screen video, rewarded video, interstitial |
|  |  |  |  |  | ad_placement_name | Internal ad placement name | text | e.g., home_feed |
|  |  |  |  |  | ad_placement_id | Internal ad placement ID | text | Physical ad placement id within the app |
|  |  |  |  |  | current_page | Current page | text | Physical ad placement name within the app, e.g., phone boosting, phone boost result page, return from phone boost result page, etc. |
|  |  |  |  |  | ad_app_name | Advertiser info | text | Advertiser info: specific ad brand; takes "unknown" if unavailable |
|  |  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  | ad_close | Ad Close | Triggered when the ad is closed |  | ad_platform | Ad platform | text | e.g., Pangle, Tencent GDT, Kuaishou |
|  |  |  |  |  | ad_id | Third-party ad ID | text | e.g., 945816492 |
|  |  |  |  |  | ad_type | Ad type | text | e.g., full-screen video, rewarded video, interstitial |
|  |  |  |  |  | ad_placement_name | Internal ad placement name | text | e.g., home_feed |
|  |  |  |  |  | ad_placement_id | Internal ad placement ID | text | Physical ad placement id within the app |
|  |  |  |  |  | current_page | Current page | text | Physical ad placement name within the app, e.g., phone boosting, phone boost result page, return from phone boost result page, etc. |
|  |  |  |  |  | ad_app_name | Advertiser info | text | Advertiser info: specific ad brand; takes "unknown" if unavailable |
|  |  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  |  |  |  |  | ad_duration | Ad duration | number | Total duration of this ad |
|  |  |  |  |  | ad_play_duration | Ad watch duration | number | Actual watch duration of this ad |
|  |  |  |  |  | is_complete_play | Is complete play | bool | Whether this ad was watched completely |
| Economy System | resource_get | Resource Get | Reported when resources/currency/items are obtained ---------------------- Tip: Important currencies can be reported as independent events. Currencies and items can be split into independent events. ---------------------- |  | change_reason | Change reason | text | Battle win, etc. |
|  |  |  |  |  | change_detail | Change detail | text |  |
|  |  |  |  |  | resource_info | Asset info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  |  |  | resource_info.item_type | Item type | text |  |
|  |  |  |  |  | resource_info.change_num | Change amount | number |  |
|  |  |  |  |  | resource_info.after_num | Amount after change | number |  |
|  | resource_cost | Resource Consume | Reported when resources/currency/items are consumed ---------------------- Tip: Important currencies can be reported as independent events. Currencies and items can be split into independent events. ---------------------- |  | change_reason | Change reason | text | Upgrade hero, etc. |
|  |  |  |  |  | change_detail | Change detail | text |  |
|  |  |  |  |  | resource_info | Asset info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  |  |  | resource_info.item_type | Item type | text |  |
|  |  |  |  |  | resource_info.change_num | Change amount | number |  |
|  |  |  |  |  | resource_info.after_num | Amount after change | number |  |
| Tasks, Activities, Reward Collection | task_complete | Complete Task | Reported when the task is achieved and reward is claimed |  | task_type | Task type | text | Main storyline task, achievement task, daily/weekly task |
|  |  |  |  |  | task_id | Task ID | text |  |
|  |  |  |  |  | task_name | Task name | text |  |
|  |  |  |  |  | active | Activeness | number |  |
|  |  |  |  |  | achievement | Achievement value | number | Achievement value after an achievement task is completed (optional) |
|  | activity_attend | Attend Activity | Reported when the activity reward is claimed |  | activity_type | Activity type | text |  |
|  |  |  |  |  | activity_id | Activity ID | text |  |
|  |  |  |  |  | activity_name | Activity name | text |  |
|  |  |  |  |  | complete_rate | Completion rate | number | Activity completion rate (optional) |
| Gacha and Progression | draw_card | Gacha | Reported when gacha is performed |  | pond_id | Card pool ID | text |  |
|  |  |  |  |  | draw_type | Gacha type | text | Single pull / ten pull |
|  |  |  |  |  | draw_num | Gacha count | number | Single pull=1, ten pull=10 |
|  |  |  |  |  | card_list | Card list | list | List of cards obtained from gacha |
|  | buff_activate | Buff Activate | Reported when a buff is activated |  | buff_id | Buff ID | text | Gold boost / attack boost / time flow double |
|  |  |  |  |  | buff_level | Buff level | number |  |
|  |  |  |  |  | active_type | Activation method | text | Ad activation / diamond activation |
|  | ability_enhance | Ability Enhance | Reported when ability is enhanced |  | ability_id | Ability ID | text | Attack / HP / HP recovery / ... |
|  |  |  |  |  | ability_level | Ability level | number | Level after enhancement |
|  | hero_levelup | Hero Level Up | Reported when hero levels up |  | hero_id | Hero ID | text |  |
|  |  |  |  |  | hero_level | Hero level | number | Level after level up |
|  |  |  |  |  | hero_star | Hero star | number | Star after level up |
|  |  |  |  |  | hero_quality | Hero quality tier | text | Quality tier after level up |
|  |  |  |  |  | hero_power | Hero power | number | Power after level up |
|  | hero_starup | Hero Star Up | Reported when hero stars up |  | hero_id | Hero ID | text |  |
|  |  |  |  |  | hero_level | Hero level | number | Level after star up |
|  |  |  |  |  | hero_star | Hero star | number | Star after star up |
|  |  |  |  |  | hero_quality | Hero quality tier | text | Quality tier after star up |
|  |  |  |  |  | hero_power | Hero power | number | Power after star up |
|  | hero_qualityup | Hero Advance | Reported when hero advances in quality |  | hero_id | Hero ID | text |  |
|  |  |  |  |  | hero_level | Hero level | number | Level after advance |
|  |  |  |  |  | hero_star | Hero star | number | Star after advance |
|  |  |  |  |  | hero_quality | Hero quality tier | text | Quality tier after advance |
|  |  |  |  |  | hero_power | Hero power | number | Power after advance |
|  | equipment_levelup | Equipment Enhance | Reported when equipment is enhanced |  | equipment_id | Equipment ID | text |  |
|  |  |  |  |  | equipment_level | Equipment level | number | Level after enhancement |
| PVE Gameplay | main_start | Main Storyline Stage Battle Start | Reported when the main storyline stage battle begins |  | main_id | Stage ID | text | e.g., 12-1 |
|  |  |  |  |  | is_first | Is first time | bool | Yes/No |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  | main_win | Main Storyline Stage Battle Win | Reported after winning the main storyline stage battle |  | main_id | Stage ID | text | e.g., 12-1 |
|  |  |  |  |  | is_first | Is first time | bool | Yes/No |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  |  | duration | Duration | number | Unit: seconds |
|  | main_fail | Main Storyline Stage Battle Fail | Reported after losing the main storyline stage battle |  | main_id | Stage ID | text | e.g., 12-1 |
|  |  |  |  |  | is_first | Is first time | bool | Yes/No |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  |  | fail_reason | Failure reason | text |  |
|  |  |  |  |  | duration | Duration | number | Unit: seconds |
|  | battle_start | Dungeon Challenge Start | Reported when the dungeon challenge battle starts |  | battle_type | Battle type | text | Gold dungeon / diamond dungeon / item dungeon |
|  |  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  |  | boss_id | Boss ID | text |  |
|  |  |  |  |  | boss_power | Boss power | number |  |
|  |  |  |  |  | is_team | Is team challenge | bool |  |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  | battle_win | Dungeon Challenge Win | Reported after winning the dungeon challenge battle |  | battle_type | Battle type | text | Gold dungeon / diamond dungeon / item dungeon |
|  |  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  |  | boss_id | Boss ID | text |  |
|  |  |  |  |  | boss_power | Boss power | number |  |
|  |  |  |  |  | is_team | Is team challenge | bool |  |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  |  | duration | Duration | number | Unit: seconds |
|  | battle_fail | Dungeon Challenge Fail | Reported after losing the dungeon challenge battle |  | battle_type | Battle type | text | Gold dungeon / diamond dungeon / item dungeon |
|  |  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  |  | boss_id | Boss ID | text |  |
|  |  |  |  |  | boss_power | Boss power | number |  |
|  |  |  |  |  | is_team | Is team challenge | bool |  |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  |  | boss_left_hp | Boss remaining HP | number | Report a value between 0 and 1 representing percentage |
|  |  |  |  |  | fail_reason | Failure reason | text | Reported on battle loss |
|  |  |  |  |  | duration | Duration | number | Unit: seconds |
|  | mopping_up | Sweep | Reported when sweep completes |  | battle_type | Battle type | text | Gold dungeon / diamond dungeon / item dungeon |
|  |  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  |  | mop_num | Sweep count | number |  |
| PVP Gameplay | arena_start | Arena Challenge Start | Reported when arena or other PvP gameplay battle starts |  | battle_type | Battle type | text |  |
|  |  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  |  | rival_id | Rival ID | text |  |
|  |  |  |  |  | rival_rank | Rival rank | number |  |
|  |  |  |  |  | is_bot | Is bot | bool | Yes/No |
|  |  |  |  |  | arena_rank | Our rank | number |  |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  |  | rival_power | Rival power | number |  |
|  |  |  |  |  | rival_info | Rival hero info | object group | Example: "rival_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | rival_info.index | Rival hero position | text |  |
|  |  |  |  |  | rival_info.hero_id | Rival hero ID | text |  |
|  |  |  |  |  | rival_info.hero_level | Rival hero level | number |  |
|  |  |  |  |  | rival_info.hero_star | Rival hero star | number |  |
|  |  |  |  |  | rival_info.hero_quality | Rival hero quality tier | text |  |
|  |  |  |  |  | rival_info.hero_power | Rival hero power | number |  |
|  |  |  |  |  | rival_info.hero_equipment_list | Rival hero equipment list | list |  |
|  | arena_win | Arena Battle Win | Reported when arena or other PvP gameplay battle is won |  | battle_type | Battle type | text |  |
|  |  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  |  | rival_id | Rival ID | text |  |
|  |  |  |  |  | before_rival_rank | Current rival rank | number |  |
|  |  |  |  |  | before_rival_score | Current rival score | number |  |
|  |  |  |  |  | is_bot | Is bot | bool | Yes/No |
|  |  |  |  |  | before_arena_rank | Current our rank | number |  |
|  |  |  |  |  | before_arena_score | Current our score | number |  |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  |  | rival_power | Rival power | number |  |
|  |  |  |  |  | rival_info | Rival hero info | object group | Example: "rival_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | rival_info.index | Rival hero position | text |  |
|  |  |  |  |  | rival_info.hero_id | Rival hero ID | text |  |
|  |  |  |  |  | rival_info.hero_level | Rival hero level | number |  |
|  |  |  |  |  | rival_info.hero_star | Rival hero star | number |  |
|  |  |  |  |  | rival_info.hero_quality | Rival hero quality tier | text |  |
|  |  |  |  |  | rival_info.hero_power | Rival hero power | number |  |
|  |  |  |  |  | rival_info.hero_equipment_list | Rival hero equipment list | list |  |
|  |  |  |  |  | duration | Duration | number | Unit: seconds |
|  |  |  |  |  | rival_rank | Rival rank | number | Rival rank after battle |
|  |  |  |  |  | arena_rank | Our rank | number | Our rank after battle |
|  |  |  |  |  | rival_score | Rival score | number | Rival score after battle |
|  |  |  |  |  | arena_score | Our score | number | Our score after battle |
|  | arena_fail | Arena Battle Fail | Reported when arena or other PvP gameplay battle is lost |  | battle_type | Battle type | text |  |
|  |  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  |  | rival_id | Rival ID | text |  |
|  |  |  |  |  | before_rival_rank | Current rival rank | number |  |
|  |  |  |  |  | before_rival_score | Current rival score | number |  |
|  |  |  |  |  | is_bot | Is bot | bool | Yes/No |
|  |  |  |  |  | before_arena_rank | Current our rank | number |  |
|  |  |  |  |  | before_arena_score | Current our score | number |  |
|  |  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  |  | hero_info.hero_quality | Our hero quality tier | text |  |
|  |  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  |  | rival_power | Rival power | number |  |
|  |  |  |  |  | rival_info | Rival hero info | object group | Example: "rival_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  |  | rival_info.index | Rival hero position | text |  |
|  |  |  |  |  | rival_info.hero_id | Rival hero ID | text |  |
|  |  |  |  |  | rival_info.hero_level | Rival hero level | number |  |
|  |  |  |  |  | rival_info.hero_star | Rival hero star | number |  |
|  |  |  |  |  | rival_info.hero_quality | Rival hero quality tier | text |  |
|  |  |  |  |  | rival_info.hero_power | Rival hero power | number |  |
|  |  |  |  |  | rival_info.hero_equipment_list | Rival hero equipment list | list |  |
|  |  |  |  |  | fail_reason | Failure reason | text | Reported on battle loss |
|  |  |  |  |  | duration | Duration | number | Unit: seconds |
|  |  |  |  |  | rival_rank | Rival rank | number | Rival rank after battle |
|  |  |  |  |  | arena_rank | Our rank | number | Our rank after battle |
|  |  |  |  |  | rival_score | Rival score | number | Rival score after battle |
|  |  |  |  |  | arena_score | Our score | number | Our score after battle |
| Guild Gameplay (Alliance/Clan/Legion, etc.) | guild_create | Create Guild | Reported when a guild is created |  | guild_id | Guild ID | text |  |
|  |  |  |  |  | guild_name | Guild name | text |  |
|  | guild_join | Join Guild | Reported when joining a guild |  | guild_id | Guild ID | text |  |
|  |  |  |  |  | guild_name | Guild name | text |  |
|  |  |  |  |  | guild_level | Guild level | number |  |
|  |  |  |  |  | guild_member | Guild member count | number | Current guild member count |
|  |  |  |  |  | guild_power | Guild total power | number |  |
|  | guild_leave | Leave Guild | Reported when leaving a guild |  | guild_id | Guild ID | text |  |
|  |  |  |  |  | guild_name | Guild name | text |  |
|  |  |  |  |  | guild_level | Guild level | number |  |
|  |  |  |  |  | guild_member | Guild member count | number |  |
|  |  |  |  |  | guild_power | Guild total power | number |  |
|  |  |  |  |  | guild_position | Guild position | text | Guild position at the time of leaving |
|  | guild_manage | Guild Manage | Reported on guild management action |  | guild_id | Guild ID | text |  |
|  |  |  |  |  | guild_name | Guild name | text |  |
|  |  |  |  |  | guild_level | Guild level | number |  |
|  |  |  |  |  | guild_member | Guild member count | number |  |
|  |  |  |  |  | target_player_id | Target player ID | text |  |
|  |  |  |  |  | guild_position | Guild position | text | Target player's position after the action, e.g.: "kick out, vice-leader, leader", etc. |
|  | guild_game | Attend Guild Gameplay | Reported when participating in guild gameplay |  | guild_game_type | Guild gameplay type | text |  |
|  |  |  |  |  | guild_game_id | Guild gameplay ID | text |  |
|  |  |  |  |  | guild_id | Guild ID | text |  |
|  |  |  |  |  | guild_name | Guild name | text |  |
|  |  |  |  |  | guild_level | Guild level | number |  |
|  |  |  |  |  | guild_member | Guild member count | number |  |
|  |  |  |  |  | guild_position | Guild position | text |  |
| Idle Rewards, Email System, Exchange Code, Settings | hangup_award | Idle Reward | Reported when idle reward is claimed |  | hangup_time | Idle duration | number | Unit: seconds |
|  |  |  |  |  | start_time | Start time | time |  |
|  | get_email_reward | Get Email Reward | Reported when email reward is claimed |  | email_subject | Email subject | text |  |
|  |  |  |  |  | email_content | Email content | text |  |
|  |  |  |  |  | send_time | Send time | time |  |
|  | exchange_code | Redeem Exchange Code | Recorded when redeem is clicked |  | code_type | Exchange code type | text |  |
|  |  |  |  |  | code | Exchange code | text | Single-use code, multi-use code, etc. |
|  |  |  |  |  | return | Redemption result | text | Redeemed successfully, already used, etc. |
| Snapshot Events | rank | Leaderboard | Reported once per specific time interval. Set #distinct_id to a fixed value that does not conflict with player ids |  | rank_type | Leaderboard type | text |  |
|  |  |  |  |  | rank_sub_type | Leaderboard subtype | text |  |
|  |  |  |  |  | server_id | Server ID | text |  |
|  |  |  |  |  | rank_info | Ranking info | object group | Example: "rank_info": [ {"id":"1000125","rank":1,"score":12000},{"id":"1000236","rank":2,"score":11005} ] |
|  |  |  |  |  | rank_info.id | Player ID | text |  |
|  |  |  |  |  | rank_info.rank | Rank | number |  |
|  |  |  |  |  | rank_info.score | Score | number |  |
|  | current_online | Online Users | Reported once per specific time interval. Set #distinct_id to a fixed value that does not conflict with player ids |  | server_id | Server ID | text | Split one report per server; also report an overall one |
|  |  |  |  |  | online_user | Online user count | number |  |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- |
| channel | Channel | text | e.g. taptap, appstore |
| nick_name | Nickname | text |  |
| tmp_account_level | Current account level | number |  |
| tmp_vip_level | Current VIP level | number |  |
| tmp_ability_level | Current ability level list | list | ['Attack level','HP level','HP recovery speed level',...] |
| tmp_main_id | Current main storyline stage progress | text |  |
| tmp_power | Current battle power | number |  |
| tmp_guild | Current guild | text |  |
| tmp_diamond | Current diamond | number |  |
| tmp_gold | Current gold | number |  |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description |
| --- | --- | --- | --- | --- |
| device_id | Device ID | text | user_setOnce | Set at game start/registration |
| channel | Registration channel | text | user_setOnce | Set at game start/registration, uploads the user's channel info such as app store, Tencent MyApp, etc. |
| nick_name | Role nickname | text | user_set | Overwrite on update |
| current_level | Current level | number | user_set | Set on each login/logout |
| current_vip_level | Current VIP level | number | user_set | Set on each login/logout |
| current_power | Current total power | number | user_set | Set on each login/logout |
| current_main_id | Current main storyline stage progress | text | user_set | Set on each login/logout |
| current_pvp_rank | Current arena rank | number | user_set | Set on each login/logout |
| tmp_ability_level | Current ability level list | list | user_set | Set on each login/logout |
| hero_info | Hero/general/card details | object group | user_set | Set on each login/logout |
| hero_info.hero_id | Hero ID | text |  |  |
| hero_info.hero_level | Hero level | number |  |  |
| hero_info.hero_star | Hero star | number |  |  |
| hero_info.hero_quanlity | Hero quality tier | text |  |  |
| hero_info.hero_power | Hero power | number |  |  |
| hero_info.hero_equipment_list | Hero equipment list | list |  |  |
| guild_id | Current guild | text | user_set | Set on each change |
| bag_info | Bag details | object group | user_set | Set on each login/logout |
| bag_info.item_id | Bag item ID | text |  |  |
| bag_info.item_type | Bag item type | text |  |  |
| bag_info.item_num | Bag item quantity | number |  |  |
| register_time | User add time | time | user_setOnce | Set when user is added |
| first_login_time | First login time | time | user_setOnce | Set on each login |
| last_login_time | Last login time | time | user_set | Set on each login |
| first_pay_time | First payment time | time | user_setOnce | Set on each payment completion |
| last_pay_time | Last payment time | time | user_set | Set on each payment completion |
| total_pay_amount | Total payment amount | number | user_add | Accumulate on each payment completion |
| total_pay_times | Total payment count | number | user_add | Accumulate on each payment completion |
| total_login_day | Total login days | number | user_set | Set on each login/logout |
| total_adv_times | Total ads watched count | number | user_add | Accumulate when ad watch completes |
| total_adv_duration | Total ad watch duration | number | user_add | Accumulate when ad watch completes |
| current_diamond | Current diamond | number | user_set | Set on each login/logout |
| current_gold | Current gold | number | user_set | Set on each login/logout |
