# Card Game Tracking Plan


## Integration Must-Know

|  |  | Data Collection Requirements Document |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | Sheets prefixed with # in the document are the tracking design sections; other sheets cover the design principles or things to watch out for during tracking - you can browse them according to your actual business needs. |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Integration guide: it is recommended to read the following related documents before integration |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Integration Must-Know |  | User Definition |  |  | User identification rules: how a user is defined within the TA system |  |  |  |  |  |  |  |  |
|  |  |  |  | Data Specification |  |  | Data rules: data format specification of the TA system |  |  |  |  |  |  |  |  |
|  |  |  |  | Preset Fields and System Fields |  |  | Preset fields and system fields |  |  |  |  |  |  |  |  |
|  |  | Integration Tools |  | TA offers data integration solutions for all platforms. Main integration methods include: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Client SDK |  |  | Can collect device information and user behavior data that doesn't communicate with the server |  |  |  |  |  |  |  |  |
|  |  |  |  | Server SDK |  |  | Collection is more accurate; suitable for collecting core business data |  |  |  |  |  |  |  |  |
|  |  |  |  | Data Import Tool |  |  | Usually used for historical data import; the Server SDK combined with LogBus is also a widely used server-side data collection solution |  |  |  |  |  |  |  |  |
|  |  |  |  | For general apps and Web development, we provide: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Native SDK |  |  | Android SDK |  | iOS SDK |  |  |  |  |  |  |
|  |  |  |  | Third-party frameworks |  |  | Flutter | RN Android | RN iOS | Weex Android | Weex iOS |  |  |  |  |
|  |  |  |  | H5 development |  |  | JavaScript SDK |  | Integration between H5 and native SDK |  |  |  |  |  |  |
|  |  |  |  | Mainstream mini program / quick app platforms |  |  | Mini Program SDK |  |  |  |  |  |  |  |  |
|  |  |  |  | For mini game development, we provide: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Support for mainstream game engines |  |  | LayaBox | Egret | Cocos Creator |  |  |  |  |  |  |
|  |  |  |  | Support for mainstream mini game / quick game platforms |  |  | Mini Game SDK |  |  |  |  |  |  |  |  |
|  |  |  |  | For mobile game development, we provide: |  |  | Unity SDK |  | Unreal Engine 4 SDK |  |  |  |  |  |  |
|  |  |  |  | For server-side collection solutions, we recommend: |  |  | Server SDK + | Logbus solution |  |  |  |  |  |  |  |
|  |  |  |  | This solution performs well in terms of data import stability, timeliness, and efficiency. |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | If you have some heterogeneous historical data that needs to be imported, or if some data needs to be supplemented to the TA system, consider using |  |  |  |  |  |  | DataX |  |  |  |  |
|  |  |  |  | Unlike the Logbus solution, DataX is not a resident service and cannot monitor new data generation and import in a timely manner, so it cannot guarantee real-time data. The advantage of DataX is that it supports heterogeneous data imports from multiple data sources and is easy to operate. |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | If you use Filebeat and Logstash to collect logs and want to import log data into the TA system, you can use: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Filebeat + Logstash solution |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Integration Essentials |  | 1. Project APP ID: when creating a project in the TA backend, the project's APP ID will be generated; you can also view it on the project management page. 2. Determine the data receiver address.   If using the cloud service, the receiver address is: https://receiver.ta.thinkingdata.cn   For private deployments, bind a domain on the private cluster (or integration endpoint) and configure the SSL certificate. 3. Verify the receiver address: browse https://YOUR_RECEIVER_URL/health-check; a page returning "ok" indicates correct configuration. 4. Data collection plan should include:   The data integration method: Client SDK, Server SDK, data import tool, or a combination of several;   The content and triggering timing of the data to be integrated. |  |  |  |  |  |  |  |  |  |  |  |
|  |  | For the integration methods above, choose according to your actual business situation. If you have any questions, contact ThinkingData service personnel for assistance with selection. |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Key points to focus on: the following items directly affect tracking availability, please pay attention |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Data type design principles: the property type within the TA analytics system is determined by the type at the first ingestion of that property, so it is recommended to confirm the type of related properties when tracking to avoid subsequent modification and migration |  |  |  |  |  |  | Data Type Design Principles |  |  |  |  |  |  |
|  |  | If you want to integrate both server-side and client-side data, please refer to the document on the right |  |  |  |  |  |  | Multi-end Integration Notes |  |  |  |  |  |  |
|  |  | If multiple user ID systems need attention in the project, such as role id, account id, device id, etc., it is recommended to prioritize sorting out the user id strategy before tracking |  |  |  |  |  |  | Tracking Recommendations for Multi-User-ID Systems |  |  |  |  |  |  |
|  |  | Common event properties are properties that all (or most) events have. If you use the client SDK to upload data, note that after the user logs out, you need to manually clear the currently set common event properties |  |  |  |  |  |  | How to Set Common Event Properties |  |  |  |  |  |  |


## #User ID System

| Game Type | Property Name | Property Display Name | Property Description | Assignment Description |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Single account, single role | #account_id | Account ID | System property | Set to the player account ID |  |  |  |  |  |  |
|  | #distinct_id | Visitor ID | System property | Device-related id or visitor id within the business; if using the client SDK, no need to worry about it |  |  |  |  |  |  |
| Single account, multiple roles | #account_id | Account ID | System property | Set to the role id; the account id the role belongs to is set as a custom property of the role |  |  |  |  |  |  |
|  | #distinct_id | Visitor ID | System property | Device-related id or visitor id within the business; if using the client SDK, no need to worry about it |  |  |  |  |  |  |


## #Event Data

| Event Name (required) | Event Display Name | Event Description | Event Tag | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install |  | Basic Event |  |  |  |  |
| ta_app_start | App Start |  | Basic Event |  |  |  |  |
| ta_app_end | App Close |  | Basic Event |  |  |  |  |
| ta_app_crash | App Crash |  | Basic Event |  |  |  |  |
| new_device | Device Activation | Reported via first-event when the device is first started | Basic Event |  |  |  |  |
| register | User Registration | Reported after user registers an account | Basic Event | register_type | Registration method | text |  |
| login | User Login | Reported after user logs in | Basic Event |  |  |  |  |
| logout | User Logout | Reported after user logs out | Basic Event |  |  |  |  |
| create_role | Create Role | Reported after user creates a role | Basic Event | is_roll | Is server-migrated role | bool |  |
| role_login | Role Login | Reported after user logs into a role | Basic Event |  |  |  |  |
| role_logout | Role Logout | Reported after user logs out of a role | Basic Event | #duration | Online duration | number |  |
| guide_complete | Complete New Player Guide | Reported each time a step of the new player guide is completed |  | guide_id | Guide category | text |  |
|  |  |  |  | guide_step | Guide step | number |  |
| current_online | Online Users | Reported once per specific time interval; interval can be 1 min, 5 min, 1 hour, etc. Set #distinct_id to a fixed value that does not conflict with player ids | Basic Event | online_user | Online users count | number |  |
|  |  |  |  | server_id | Server ID | number |  |
| rank | Leaderboard | Reported once per specific time interval. Set #distinct_id to a fixed value that does not conflict with player ids |  | rank_type | Leaderboard type | text |  |
|  |  |  |  | rank_sub_type | Leaderboard subtype | text |  |
|  |  |  |  | server_id | Server ID | text |  |
|  |  |  |  | rank_info | Ranking info | object group | Example: "rank_info": [{"id":"1000125","rank":1,"score":12000},{"id":"1000236","rank":2,"score":11005}] |
|  |  |  |  | rank_info.id | Player ID | text |  |
|  |  |  |  | rank_info.rank | Rank | number |  |
|  |  |  |  | rank_info.score | Score | number |  |
| level_up | Role Level Up | Recorded when the role levels up | Basic Event | level | Level after level up | number | Player's level when the event occurred |
|  |  |  |  | level_before | Level before level up | number |  |
| vip_levelup | VIP Level Up | Reported when the role's VIP level is raised | Basic Event | vip_level | VIP level after level up | number | Player's VIP level when the event occurred |
|  |  |  |  | vip_level_before | VIP level before level up | number |  |
| init_order | Initiate Recharge | Reported when a recharge is initiated |  | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment amount | number |  |
|  |  |  |  | currency_type | Payment currency | text | To use the [FX integration] feature, must conform to ISO 4217 (e.g., CNY, USD, EUR) |
|  |  |  |  | payment_name | Purchased item name | text |  |
|  |  |  |  | payment_num | Purchased quantity | number |  |
|  |  |  |  | payment_type | Payment method | text | Alipay/WeChat |
| payment | Recharge Success | Reported when recharge succeeds |  | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment amount | number |  |
|  |  |  |  | currency_type | Payment currency | text | To use the [FX integration] feature, must conform to ISO 4217 (e.g., CNY, USD, EUR) |
|  |  |  |  | payment_name | Purchased item name | text |  |
|  |  |  |  | payment_num | Purchased quantity | number |  |
|  |  |  |  | payment_type | Payment method | text | Alipay/WeChat |
|  |  |  |  | is_first | Is first time | bool | Yes/No |
| payment_fail | Recharge Fail | Reported when recharge fails |  | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment amount | number |  |
|  |  |  |  | currency_type | Payment currency | text | To use the [FX integration] feature, must conform to ISO 4217 (e.g., CNY, USD, EUR) |
|  |  |  |  | payment_name | Purchased item name | text |  |
|  |  |  |  | payment_num | Purchased quantity | number |  |
|  |  |  |  | payment_type | Payment method | text | Alipay/WeChat |
|  |  |  |  | fail_reason | Failure reason | text |  |
| activity_attend | Attend Activity | Reported after attending an activity | Task and Activity | activity_type | Activity type | text | New player activity, etc. |
|  |  |  |  | activity_id | Activity ID | text |  |
|  |  |  |  | activity_name | Activity name | text |  |
| task_complete | Complete Task | Reported after completing a task | Task and Activity | task_type | Task type | text |  |
|  |  |  |  | task_id | Task ID | text |  |
|  |  |  |  | task_name | Task name | text |  |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [{"item_id":"1","item_num":100},{"item_id":"2","item_num":200}] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |
| achievement_finish | Achievement Finished | Reported after achieving an achievement | Task and Activity | achievement_type | Achievement type | text |  |
|  |  |  |  | achievement_id | Achievement ID | text |  |
|  |  |  |  | achievement_name | Achievement name | text |  |
| battle_start | Battle Start | Reported after starting a battle | Gameplay | battle_type | Battle type | text | Main storyline, dungeon |
|  |  |  |  | main_id | Stage ID | text |  |
|  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  | is_first | Is first time | bool |  |
|  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
| battle_win | Battle Win | Reported after winning a battle | Gameplay | battle_type | Battle type | text |  |
|  |  |  |  | main_id | Stage ID | text |  |
|  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [ {"item_id":"1","item_num":100},{"item_id":"2","item_num":200} ] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |
|  |  |  |  | duration | Duration | number |  |
|  |  |  |  | result | Battle result | text |  |
|  |  |  |  | is_first | Is first time | bool |  |
|  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
| battle_fail | Battle Fail | Reported after losing a battle | Gameplay | battle_type | Battle type | text |  |
|  |  |  |  | main_id | Stage ID | text |  |
|  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  | duration | Duration | number |  |
|  |  |  |  | result | Battle result | text |  |
|  |  |  |  | fail_reason | Failure reason | text |  |
|  |  |  |  | is_first | Is first time | bool |  |
|  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
| mopping_up | Game Sweep | Reported after game sweep | Gameplay | battle_type | Battle type | text |  |
|  |  |  |  | main_id | Stage ID | text |  |
|  |  |  |  | battle_id | Battle ID | text |  |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [{"item_id":"1","item_num":100},{"item_id":"2","item_num":200}] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |
|  |  |  |  | mop_num | Sweep count | number |  |
|  |  |  |  | cost_type | Consumed currency type | text |  |
|  |  |  |  | cost_amount | Consumed currency amount | number |  |
| tower_challenge_start | Tower Climb Start | Reported after starting tower climb gameplay | Gameplay | tower_level_id | Tower stage ID | text |  |
| skill_choose | Skill Choice | Reported after choosing a skill | Gameplay | skill_id | Skill ID | text |  |
|  |  |  |  | choosed_skill_list | Chosen skill list | list |  |
| tower_battle_end | Tower Battle End | Reported after a single-floor battle ends | Gameplay | tower_level_id | Tower stage ID | text |  |
|  |  |  |  | is_success | Is win | bool |  |
|  |  |  |  | choosed_skill_list | Chosen skill list | list |  |
|  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  | duration | Duration | number |  |
| tower_challenge_end | Tower Challenge End | Reported after tower climb challenge ends | Gameplay | final_tower_level_id | Final tower stage ID | text |  |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [{"item_id":"1","item_num":100},{"item_id":"2","item_num":200}] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |
|  |  |  |  | choosed_skill_list | Chosen skill list | list |  |
|  |  |  |  | hero_info | Our hero info | object group | Example: "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  | duration | Duration | number |  |
| attend_arena | Attend Arena | Reported after an arena battle ends | Gameplay | battle_type | Battle type | text |  |
|  |  |  |  | rival_id | Rival ID | text |  |
|  |  |  |  | rival_power | Rival power | number |  |
|  |  |  |  | total_power | Total battle power | number |  |
|  |  |  |  | before_rival_rank | Current rival rank | number |  |
|  |  |  |  | before_rival_score | Current rival score | number |  |
|  |  |  |  | is_bot | Is bot | bool | Yes/No |
|  |  |  |  | before_arena_rank | Current our rank | number |  |
|  |  |  |  | before_arena_score | Current our score | number |  |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [ {"item_id":"1","item_num":100},{"item_id":"2","item_num":200} ] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |
|  |  |  |  | hero_info | Our hero info | object group | Example:  "hero_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  | hero_info.index | Our hero lineup position | text |  |
|  |  |  |  | hero_info.hero_id | Our hero ID | text |  |
|  |  |  |  | hero_info.hero_level | Our hero level | number |  |
|  |  |  |  | hero_info.hero_star | Our hero star | number |  |
|  |  |  |  | hero_info.hero_power | Our hero power | number |  |
|  |  |  |  | hero_info.hero_equipment_list | Our hero equipment list | list |  |
|  |  |  |  | rival_info | Rival hero info | object group | Example:   "rival_info": [ {"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500}, {"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400} ] |
|  |  |  |  | rival_info.index | Rival hero position | text |  |
|  |  |  |  | rival_info.hero_id | Rival hero ID | text |  |
|  |  |  |  | rival_info.hero_level | Rival hero level | number |  |
|  |  |  |  | rival_info.hero_star | Rival hero star | number |  |
|  |  |  |  | rival_info.hero_power | Rival hero power | number |  |
|  |  |  |  | rival_info.hero_equipment_list | Rival hero equipment list | list |  |
|  |  |  |  | duration | Duration | number |  |
|  |  |  |  | result | Battle result | text | Win, lose, etc. |
|  |  |  |  | rival_rank | Rival rank | number | Rival rank after battle |
|  |  |  |  | arena_rank | Our rank | number | Our rank after battle |
|  |  |  |  | rival_score | Rival score | number | Rival score after battle |
|  |  |  |  | arena_score | Our score | number | Our score after battle |
| hero_starup | Hero Star Up | Reported after hero star up | Hero Progression | hero_id | Hero ID | number |  |
|  |  |  |  | hero_level | Hero level | number |  |
|  |  |  |  | hero_star | Hero star | number |  |
|  |  |  |  | hero_power | Hero power | number |  |
| hero_levelup | Hero Level Up | Reported after hero levels up | Hero Progression | hero_id | Hero ID | number |  |
|  |  |  |  | hero_level | Hero level | number |  |
|  |  |  |  | hero_star | Hero star | number |  |
|  |  |  |  | hero_power | Hero power | number |  |
| hero_skill_levelup | Hero Skill Level Up | Reported after hero skill levels up | Hero Progression | hero_id | Hero ID | number |  |
|  |  |  |  | hero_level | Hero level | number |  |
|  |  |  |  | hero_star | Hero star | number |  |
|  |  |  |  | hero_skill_id | Hero skill ID | number |  |
|  |  |  |  | hero_skill_level | Hero skill level | number |  |
|  |  |  |  | hero_power | Hero power | number |  |
| shop_buy | Shop Purchase | Reported after shop purchase | Resource | cost_amount | Total currency consumed | number |  |
|  |  |  |  | cost_type | Consumed currency type | text |  |
|  |  |  |  | shop_id | Shop ID | text |  |
|  |  |  |  | item_num | Item quantity | number |  |
|  |  |  |  | item_id | Item ID | number |  |
| draw_card | Gacha Event | Reported when gacha completes | Resource | pond_id | Card pool ID | text |  |
|  |  |  |  | draw_type | Gacha type | text | Single pull / ten pull |
|  |  |  |  | draw_num | Gacha count | number | Single pull=1, ten pull=10 |
|  |  |  |  | card_list | Card list | list | List of cards obtained from gacha |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [{"item_id":"1","item_num":100},{"item_id":"2","item_num":200}] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |
| item_get | Item Get | Reported when an item is produced | Resource | resource_info | Asset info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  |  | resource_info.item_id | Resource ID | text |  |
|  |  |  |  | resource_info.item_type | Item type | text |  |
|  |  |  |  | resource_info.change_num | Change amount | number |  |
|  |  |  |  | resource_info.after_num | Amount after change | number |  |
|  |  |  |  | change_reason | Change reason | text |  |
| item_consume | Item Consume | Reported when an item is consumed | Resource | resource_info | Asset info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  |  | resource_info.item_id | Resource ID | text |  |
|  |  |  |  | resource_info.item_type | Item type | text |  |
|  |  |  |  | resource_info.change_num | Change amount | number |  |
|  |  |  |  | resource_info.after_num | Amount after change | number |  |
|  |  |  |  | change_reason | Change reason | text |  |
| token_consume | Currency Consume | Reported when currency is consumed | Resource | token_id | Currency ID | text |  |
|  |  |  |  | change_reason | Change reason | text |  |
|  |  |  |  | token_change_after | Currency before change | number |  |
|  |  |  |  | token_change_before | Currency after change | number |  |
|  |  |  |  | token_consume_amount | Currency consumed amount | number |  |
| token_get | Currency Get | Reported when currency is obtained | Resource | token_id | Currency ID | text |  |
|  |  |  |  | change_reason | Change reason | text |  |
|  |  |  |  | token_change_after | Currency before change | number |  |
|  |  |  |  | token_change_before | Currency after change | number |  |
|  |  |  |  | token_get_amount | Currency obtained amount | number |  |
| guild_create | Create Guild | Reported after creating a guild | Social | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild name | text |  |
| guild_join | Join Guild | Reported after joining a guild | Social | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild name | text |  |
| guild_game | Attend Guild Gameplay | Reported after completing guild gameplay | Social | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild name | text |  |
|  |  |  |  | activity_type | Activity type | text |  |
| guild_leave | Leave Guild | Reported when leaving a guild | Social | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild name | text |  |
| dissolve_guild | Dissolve Guild | Reported when dissolving a guild | Social | guild_id | Guild ID | text |  |
|  |  |  |  | guild_name | Guild name | text |  |
| share | Game Share | Reported when player clicks share button | Social | share_id | Share position | text |  |
| apply_friend | Friend Request | Reported when sending a friend request | Social | friend_id | Friend ID | text |  |
|  |  |  |  | apply_friend_type | Friend request type | text |  |
| add_friend | Add Friend | Reported when a friend request is accepted | Social | friend_id | Friend ID | text |  |
| delete_friend | Delete Friend | Reported when deleting a friend | Social | friend_id | Friend ID | text |  |
| chat | Chat | Reported during chat, channel/room/private, etc. | Social | channel_id | Channel ID | text |  |
|  |  |  |  | room_id | Room ID | text |  |
|  |  |  |  | target_player_id | Target player ID | text |  |
|  |  |  |  | chat_content | Chat content | text |  |
|  |  |  |  | hold_up | Whether matched violation keyword library | text | Muted, normal, fraud lexicon, obscene lexicon, political lexicon, etc. Record according to actual situation |
| give_gift | Give Gift | Reported when giving a gift | Social | friend_id | Friend ID | text |  |
|  |  |  |  | gift_id | Gift ID | text |  |
| receive_gift | Receive Gift | Reported when clicking to receive a gift | Social | friend_id | Friend ID | text |  |
|  |  |  |  | gift_id | Gift ID | text |  |
| get_email_reward | Get Email Reward | Reported when claiming email reward | System | email_subject | Email subject | text |  |
|  |  |  |  | email_content | Email content | text |  |
|  |  |  |  | send_time | Send time | time |  |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [ {"item_id":"1","item_num":100},{"item_id":"2","item_num":200} ] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |
| exchange_code | Redeem Exchange Code | Recorded when clicking redeem | System | code_type | Exchange code type | text |  |
|  |  |  |  | code | Exchange code | text | Single-use code, multi-use code, etc. |
|  |  |  |  | return | Redemption result | text | Redeemed successfully, already used, etc. |
|  |  |  |  | get_item_info | Item details received | object group | Example: "get_item_info": [ {"item_id":"1","item_num":100},{"item_id":"2","item_num":200} ] |
|  |  |  |  | get_item_info.item_id | Item ID | text |  |
|  |  |  |  | get_item_info.item_num | Item quantity | number |  |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- |
| channel | Channel | text | e.g. taptap, appstore |
| account | Game account | text |  |
| server_id | Server | text |  |
| nick_name | Nickname | text |  |
| tmp_level | Current level | number |  |
| tmp_vip_level | Current VIP level | text |  |
| tmp_main_id | Current main storyline stage progress | text |  |
| tmp_power | Current battle power | number |  |
| tmp_guild | Current guild | text |  |
| tmp_diamond | Current diamond | number |  |
| tmp_gold | Current gold | number |  |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description | Property Tag |
| --- | --- | --- | --- | --- | --- |
| channel | Source channel | string | user_setOnce | Set at game start/registration, uploads user channel info (e.g. app store, Tencent MyApp) |  |
| account | Account | text | user_setOnce | Recorded on registration |  |
| server_id | Server ID | text | user_setOnce | Recorded on role creation |  |
| current_level | Current level | number | user_set | Reported when player level changes |  |
| current_vip_level | Current VIP level | number | user_set | Reported when player VIP level changes |  |
| current_diamond | Current diamond | number | user_set | Reported when player diamond changes |  |
| current_gold | Current gold | number | user_set | Reported when player gold changes |  |
| is_roll | Is server-migrated role | bool | user_setOnce | Reported on role creation |  |
| first_pay_time | First payment time | time | user_setOnce | Reported on first payment |  |
| guild_id | Current guild ID | text | user_set | Reported on guild change |  |
| last_login_time | Last login time | time | user_set | Reported on each login |  |
| current_main_id | Current main storyline stage progress | text | user_set | Recorded each time a new main storyline stage is cleared |  |
| register_time | User add time | time | user_setOnce | Set when account or role is added |  |
| total_pay_amount | Total payment amount | number | user_add | Reported on each recharge |  |
| hero_info | Hero/general/card details | object group | user_set | Set on each login/logout |  |
| hero_info.hero_id | Hero ID | text |  |  |  |
| hero_info.hero_level | Hero level | number |  |  |  |
| hero_info.hero_star | Hero star | number |  |  |  |
| hero_info.hero_power | Hero power | number |  |  |  |
| hero_info.hero_equipment_list | Hero equipment list | list |  |  |  |
| bag_info | Bag details | object group | user_set | Set on each login/logout |  |
| bag_info.item_id | Bag item ID | text |  |  |  |
| bag_info.item_num | Bag item quantity | number |  |  |  |


## Data Type Design Principles

|  | The TA system currently supports the following data types. The type of a field in the system is determined at the time of first import, so it is recommended to carefully confirm the type of related fields when tracking |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  | TA Data Type | Example Values | Value Description | JSON Data Type | Recommended Scenarios |
|  | number | 123, 1.23 | Range: -9E15 to 9E15 | Number | 1. Properties that involve numeric operations (sum, median, mean, etc.), such as recharge amount, consumed diamonds, clear time (seconds), level, etc. 2. ID-related properties where the sequence of IDs correlates positively with numeric size, such as stage id, server id, etc. If these ids are not pure numbers, treat as string. 3. Continuing above, for user-related ids such as role id, even if composed of all digits, they have no numeric meaning in themselves and may have many digits; it is recommended to treat as string. |
|  | string | "ABC", "Shanghai" | Default character limit is 2KB | String | For any property not suited to other types, consider using the string type, including some complex types TA currently doesn't support, such as map type |
|  | time | "2019-01-01 00:00:00", "2019-01-01 00:00:00.000" | "yyyy-MM-dd HH:mm:ss.SSS" or "yyyy-MM-dd HH:mm:ss"; to represent a date, use "yyyy-MM-dd 00:00:00" | String | Such as registration time, first recharge time, monthly card expiration time, etc. |
|  | bool | true, false | - | Boolean | Such as is first stage clear, is paid user, etc. |
|  | list | ["a", "1", "true"] | All elements in the list will be converted to string type | Array | Such as participating card ids ["Guan Yu", "Zhang Fei", "Zhao Yun"], user tags ["high-value user", "potentially churning user"] |
|  | object | {"item_name":"Hero fragment","item_num":5} | Must comply with sub-property value rules; e.g., if a sub-property is a string, its value must comply with the default 2KB character limit | Object | / |
|  | object group | [ {"item_name":"Hero fragment","item_num":5}, {"item_name":"Skin fragment","item_num":2}, {"item_name":"Honor points","item_num":10} ] | Must comply with sub-property value rules; e.g., if a sub-property is a string, its value must comply with the default 2KB character limit | Array(Object) | For example, when multiple characters are deployed in a battle, an object type property can contain multiple different sub-properties to describe a hero's name, star, power, etc. The object group type can express multiple object types in array form in a single field to describe the entire deployed lineup. |


## How to Set Common Event Properties

|  | Common event properties are properties that all (or most) events have |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | When uploading data using the Server SDK or data import tool, manually set the user's common event properties. When uploading data using the Client SDK: for common properties that will change, such as level, current max stage, etc., it is recommended to use the "dynamic common property" approach to ensure the correctness of property values at upload time. Common event properties are saved to the cache; there is no need to call them each time the App starts. If setSuperProperties: is called to set a common event property that has already been set, it will overwrite the previous property. If a common event property has the same key as a property uploaded via track:properties:, that event's property will override the common event property. Note: after a user logs out, besides calling the logout method, you may also need to clear the currently set common event properties that depend on the account; to remove a specific common event property, call the unsetSuperProperty method; to clear all common event properties, call clearSuperProperties. Android SDK setup: https://doc.thinkingdata.cn/tdamanual/installation/android_sdk_installation.html#b%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7 iOS SDK setup: https://doc.thinkingdata.cn/tdamanual/installation/ios_sdk_installation.html#b-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7 JS SDK setup: https://doc.thinkingdata.cn/tdamanual/installation/javascript_sdk_installation.html#c-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7 Unity SDK setup: https://doc.thinkingdata.cn/tdamanual/installation/unity_sdk_installation.html#33-%E8%AE%BE%E7%BD%AE%E5%8A%A8%E6%80%81%E5%85%AC%E5%85%B1%E5%B1%9E%E6%80%A7 Flutter SDK setup: https://doc.thinkingdata.cn/tdamanual/installation/flutter_sdk_installation.html#32-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7 Mini Program / Mini Game SDK setup: https://doc.thinkingdata.cn/tdamanual/installation/mp_sdk_installation.html#332-%E8%AE%BE%E7%BD%AE%E5%8A%A8%E6%80%81%E5%85%AC%E5%85%B1%E5%B1%9E%E6%80%A7 |  |  |  |  |  |  |  |  |  |  |  |  |  |


## Multi-end Integration Notes

|  | The TA system supports data integration from multiple ends, such as the client, server, and third-party data, and can integrate multi-end data into one project to solve the data silo problem. There are a few considerations during the process; please pay attention before integration |
| --- | --- |
|  | 1. User ID matching:        During multi-end data integration (taking server + client as an example), we need to ensure that a user's data from multiple ends can be accurately associated. This involves the user ID association issue. Generally, client data tends to use the device ID while the server uses the account ID to mark users. When data from both ends is imported into the system according to the above logic, the two IDs follow different naming rules, which causes two new users to be created on receipt, so the multi-end behaviors of the same user cannot be associated. Based on the TA system's user identification rules, it is recommended to design user IDs when tracking as follows: a. Record only user behaviors after login, because after login the account ID exists; regardless of whether the data is from client or server, set #account_id to the account ID to complete the association of multi-end user behavior. b. Users will also generate behavior without being logged in, and if the business cares about these, TA supports association between visitor behavior and login behavior. However, because during multi-end tracking the order in which data arrives from different tracking ends cannot theoretically be guaranteed, special design is needed: set #account_id to the business id after login (such as account id/role id), and set #distinct_id to a device-based id (such as device id, custom visitor id, etc.). Regardless of whether the data is client or server, ensure #distinct_id always has a value. Since the server has definitely communicated with the client when it generates data, you can pass back the device id of the user (the client's #distinct_id) to the server for assignment when the server triggers tracking data. |
|  | 2. Time ordering issues:        During multi-end tracking, time across different ends may be inconsistent. For example, client tracking takes the local time, while the server takes the server time. Due to time differences across ends, data that factually has a sequential relationship may become ordered incorrectly when it ultimately lands as data because it was generated on client and server separately—for example, Initiate Recharge (client) later than Recharge Success (server). For the above cases, besides recommending to track consecutive events on one end, we also recommend the following solutions: a. No multi-timezone issue: it is recommended that the client, at initialization, request the current server time from the server and use that as the standard time for client data collection, avoiding client-server time differences. In addition, if the server involves multiple machines, there may be clock drift between servers themselves; you can use clock-sync components to synchronize time. b. Client cross-timezone issue: in such scenarios, the client and server may be in different timezones, causing time inconsistency when both ends collect data. In such cases, if analysis across timezones is sensitive, it is recommended that server data follows the client's timezone, i.e., the server tries to obtain the client's timezone and set the #time field to the current timestamp in that timezone. |
|  | 3. Design of events and common event properties: Unless there is a special need, it is not recommended that multiple ends collect events with the same meaning simultaneously, to avoid data redundancy. For common event properties, such as level, channel, server, etc., it is recommended to include them on all ends; if only one end sets these common event properties, the TA system will not automatically fill in the gaps, leading to property misalignment in subsequent analyses. |


## Tracking Recommendations for Multi-User-ID Systems

|  | In game analysis scenarios, users often need to be analyzed from multiple angles, such as role, account, device, or some third-party ID. Therefore, the design of IDs directly affects subsequent use of the TA system |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | The following uses a basic scenario to explain how to design the user ID system when tracking in the TA system. For more complex scenarios, feel free to communicate with ThinkingData service personnel |  |  |  |  |  |  |  |
|  | Suppose the current project has the following ID system: role id, account id, device-related id (including device id or some third-party device-based id such as adjust_id) |  |  |  |  |  |  |  |
|  | In the TA system, #account_id is used as the primary standard for identifying a single user; different #account_id values must correspond to different #user_id values, and #user_id is the basis for user identification in the TA system |  |  |  |  |  |  |  |
|  | It is generally recommended to use the smallest indivisible business id as #account_id—in the above scenario, the role id—and to use a device-related id as #distinct_id, such as device id, the visitor id generated by the ThinkingData client SDK, or a custom visitor id |  |  |  |  |  |  |  |
|  | Other ids are recommended to be recorded as common event properties (such as device id if it has a many-to-many relationship with roles) or user properties. Based on the above logic, the recommended tracking is as follows (the visitor id below is the default visitor id of the ThinkingData client SDK; it can be custom-set in actual scenarios) |  |  |  |  |  |  |  |
|  | #account_id | #distinct_id | account id (custom property) | device id (custom property) | other ids (custom property) |  |  |  |
|  | role id | visitor id | account id | device id | platform id, adjust_id, etc. |  |  |  |
|  | Of course, in actual tracking, some ids may not exist; for example, at device activation there is no role id, in which case you can leave it blank. However, the visitor id should theoretically always exist in any scenario |  |  |  |  |  |  |  |
|  | The following uses actual business scenarios to illustrate the id settings for each scenario |  |  |  |  |  |  |  |
|  | Tracking scenario | #account_id | #distinct_id | account id (custom property) | device id (custom property) |  |  |  |
|  | Device activation | - | visitor id1 | - | device id1 |  |  |  |
|  | Account registration | - | visitor id1 | account id1 | device id1 |  |  |  |
|  | Role creation | role id1 | visitor id1 | account id1 | device id1 |  |  |  |
|  | Battle start | role id1 | visitor id1 | account id1 | device id1 |  |  |  |
|  | Therefore, overall, follow the logic of "fill in when present, leave empty when absent." Based on the above tracking, data from before and after user login can be associated, and the TA system will also provide the corresponding functionality |  |  |  |  |  |  |  |
|  | Analyze users from different angles, such as device retention, account funnel conversion, etc. |  |  |  |  |  |  |  |
