# SLG Game Tracking Plan


## #User ID System

| Game Type | Property Name | Display Name | Description | Assignment Notes |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Single Account Single Role | #account_id | Account ID | Preset property | Set to the player account ID |  |  |  |  |  |  |
|  | #distinct_id | Visitor ID | Preset property | Device-related ID or in-business visitor ID; no need to worry about it if using the client SDK |  |  |  |  |  |  |
| Single Account Multi-Role | #account_id | Account ID | Preset property | Set to role ID; set the account ID to which the role belongs as a custom property of the role (unique across the entire project, no duplicates) |  |  |  |  |  |  |
|  | #distinct_id | Visitor ID | Preset property | Device-related ID or in-business visitor ID; no need to worry about it if using the client SDK |  |  |  |  |  |  |


## #Event Data

| Event Name | Event Display Name | Event Description | Event Tag | Property Name | Display Name | Property Type | Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | APP Install | Auto-collected after game install |  |  |  |  |  |
| ta_app_start | APP Start | Auto-collected after game start |  |  |  |  |  |
| ta_app_end | APP End | Auto-collected after game exit |  | #duration | Event Duration | number |  |
| device_active | Device Activation | After device activation |  |  |  |  |  |
| create_account | Create Account | When the player creates an account |  | account_type | Account Type | text | Phone number, email, account+password |
| create_role | Create Role | When the player creates a role |  | is_first_role | Is First Role Creation | bool | 0.8 |
|  |  |  |  | choose_country | Chosen Country | text | Han, Zhao, Wei, Chu, Yan, Qi, Qin |
| login_account | Login Account | When the player logs into the account |  |  |  |  |  |
| login | Login Role | When the player logs into the role |  |  |  |  |  |
| logout | Logout Role | When the user logs out of the role |  |  |  |  |  |
| logout_account | Logout Account | When the user logs out of the account |  |  |  |  |  |
| guide | Newbie Guide Event | Reported when the player reaches a specific checkpoint |  | guide_id | Guide ID | number |  |
| exchange_code | Redeem Code | |  | code | Redeem Code | number |  |
| game_share | Game Share | |  | share_id | Share Position | number |  |
| mail_receive | Receive Mail | After receiving a mail |  | mail_id | Mail ID | text |  |
| mainlevel_up | Main City Level Up | After the player's main city level increases |  | current_level | Current Level | number |  |
|  |  |  |  | current_reputation | Current Reputation | number |  |
|  |  |  |  | current_power | Current Power | number |  |
| viplevel_up | VIP Level Up | After VIP level increases |  | current_vip_level | Current VIP Level | number |  |
| titlelevel_up | Title Level Up | After title level increases |  | current_title_id | Current Title ID | number |  |
| order_init | Initiate Order | When an order is initiated |  | order_id | Order ID | text |  |
|  |  |  |  | payment_name | Purchased Product Name | text | Newbie Gift Pack, Activity Gift Pack, Activity Grand Gift Pack, Holiday Gift Pack, Weekly Gift Pack, Monthly Pass, Battle Pass, 6-yuan Diamond, 30-yuan Diamond, 98-yuan Diamond, 198-yuan Diamond, 328-yuan Diamond, 648-yuan Diamond, Speed-up Gift Pack |
|  |  |  |  | pay_amount | Payment Amount | number | {"Newbie Gift Pack":6,"Weekly Gift Pack":12,"Activity Gift Pack":18,"Monthly Pass":30,"Battle Pass":68,"Holiday Gift Pack":88,"Activity Grand Gift Pack":128,"6-yuan Diamond":6,"30-yuan Diamond":30,"98-yuan Diamond":98,"198-yuan Diamond":198,"328-yuan Diamond":328,"648-yuan Diamond":648,"Speed-up Gift Pack":30} |
| order_pay_success | Payment Success | After the user completes payment |  | order_id | Order ID | text |  |
|  |  |  |  | payment_name | Purchased Product Name | text |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_way | Payment Channel | text | WeChat, Alipay, UnionPay |
|  |  |  |  | is_first | Is First Time | bool |  |
| order_pay_fail | Payment Fail | After the user completes payment |  | order_id | Order ID | text |  |
|  |  |  |  | payment_name | Purchased Product Name | text |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_way | Payment Channel | text | WeChat, Alipay, UnionPay |
|  |  |  |  | fail_reason | Fail Reason | text | Cancelled by user, order timeout |
| mission_finish | Mission Complete | After the mission is completed |  | mission_type | Mission Type | text | Main, Side |
|  |  |  |  | mission_id | Mission ID | number |  |
| award_get | Claim Reward | After an activity reward is claimed |  | award_type | Reward Type | text | PVE Reward, PVP Reward, Check-in Activity, Cumulative Recharge Activity, Online Reward, Rank Boost Activity |
|  |  |  |  | award_id | Reward ID | number |  |
|  |  |  |  | award_detail | Reward Detail | object group |  |
|  |  |  |  | award_detail.item_id | Reward Item ID | number |  |
|  |  |  |  | award_detail.item_number | Reward Item Quantity | number |  |
| shop_buy | Shop Purchase | After a shop purchase |  | shop_type | Shop Type | text | Activity Shop, Regular Shop, General Shop |
|  |  |  |  | shop_goods_id | Shop Item ID | number |  |
|  |  |  |  | shop_goods_price | Shop Item Price | number |  |
|  |  |  |  | get_item_number | Purchase Quantity | number |  |
|  |  |  |  | cost_item_id | Consumed Item ID | text | Gold, Copper |
| general_recruit | General Recruit | After recruitment completes |  | recruit_id | Gacha Pool ID | text | Regular Pool, Activity Pool, Newbie Pool |
|  |  |  |  | recruit_number | Gacha Count | number |  |
|  |  |  |  | recruit_detail | Recruit Detail | object group |  |
|  |  |  |  | recruit_detail.general_id | Recruited General ID | number |  |
|  |  |  |  | recruit_detail.general_number | Recruited General Quantity | number |  |
|  |  |  |  | cost_item_id | Consumed Item ID | text | Gold, Copper, Recruit Ticket |
|  |  |  |  | cost_item_number | Consumed Item Quantity | number |  |
| gold_increase | Gold Increase | After an increase event occurs |  | change_number | Change Amount | number |  |
|  |  |  |  | reasons | Change Reason | number |  |
| gold_decrease | Gold Decrease | After a decrease event occurs |  | change_number | Change Amount | number |  |
|  |  |  |  | reasons | Change Reason | number |  |
| copper_increase | Copper Increase | After an increase event occurs |  | change_number | Change Amount | number |  |
|  |  |  |  | reasons | Change Reason | number |  |
| copper_decrease | Copper Decrease | After a decrease event occurs |  | change_number | Change Amount | number |  |
|  |  |  |  | reasons | Change Reason | number |  |
| item_increase | Item Gained | After an increase event occurs |  | item_id | Item ID | number |  |
|  |  |  |  | change_number | Change Amount | number |  |
|  |  |  |  | reasons | Change Reason | number |  |
| item_decrease | Item Lost | After a decrease event occurs |  | item_id | Item ID | number |  |
|  |  |  |  | change_number | Change Amount | number |  |
|  |  |  |  | reasons | Change Reason | number |  |
| occupy_event | Occupation Event | Reported after an occupation action is completed |  | land_type | Land Type | text | Grain, Wood, Stone, Iron, Bandit, Rebel |
|  |  |  |  | land_id | Land Coordinates | list |  |
|  |  |  |  | land_level | Land Level | number |  |
|  |  |  |  | run_duration | March Duration | number |  |
|  |  |  |  | army_detail | Army Detail | object group |  |
|  |  |  |  | army_detail.general_id | General ID | number |  |
|  |  |  |  | army_detail.general_level | General Level | number |  |
|  |  |  |  | army_detail.soldier_type | Soldier Type | text | Cavalry, Spearman, Infantry, Archer, Shield Soldier |
|  |  |  |  | army_detail.soldier_number | Soldier Count | number |  |
|  |  |  |  | army_detail.army_power | Army Power | number |  |
|  |  |  |  | is_win | Is Win | bool |  |
|  |  |  |  | item_id | Item ID | number | {"Grain":1,"Wood":2,"Stone":3,"Iron":4,"Bandit":5,"Rebel":6} |
|  |  |  |  | change_number | Change Amount | number |  |
| building_unlock | Building Unlock | After the building starts unlocking |  | building_id | Building ID | text | Farmland, Lumber Mill, Quarry, Iron Mine, Barracks, Interior Ministry, Conscription Office, Foreign Ministry |
| building_levelup | Building Level Up | After the building starts upgrading |  | building_id | Building ID | text | Farmland, Lumber Mill, Quarry, Iron Mine, Barracks, Interior Ministry, Conscription Office, Foreign Ministry |
|  |  |  |  | after_building_level | Building Level After Upgrade | number |  |
|  |  |  |  | up_duration | Upgrade Duration | number |  |
|  |  |  |  | is_speed_up | Is Speed Up | bool |  |
| resource_harvest | Harvest Resource | After harvesting resource is completed |  | resource_id | Resource ID | text | Grain, Wood, Stone, Iron, Copper, Gold |
|  |  |  |  | resource_number | Resource Quantity | number |  |
| cure_wounded | Cure Wounded Soldiers | After wounded soldiers start being treated |  | cure_detail | Cure Detail | object group |  |
|  |  |  |  | cure_detail.soldier_type | Cured Soldier Type | text | Cavalry, Spearman, Infantry, Archer, Shield Soldier |
|  |  |  |  | cure_detail.soldier_number | Cured Soldier Count | number |  |
|  |  |  |  | cure_duration | Cure Duration | number |  |
| soldiers_training | Train Soldiers | After soldiers start training |  | soldier_type | Soldier Type | text | Cavalry, Spearman, Infantry, Archer, Shield Soldier |
|  |  |  |  | training_id | Training Project ID | number |  |
|  |  |  |  | after_training_level | Training Level After Upgrade | number |  |
|  |  |  |  | training_duration | Training Duration | number |  |
|  |  |  |  | is_speed_up | Is Speed Up | bool |  |
| soldiers_recruit | Soldier Recruitment | After soldier recruitment starts |  | soldier_id | Soldier Type ID | text | Cavalry, Spearman, Infantry, Archer, Shield Soldier |
|  |  |  |  | recruit_number | Recruitment Count | number |  |
|  |  |  |  | recruit_duration | Recruitment Duration | number |  |
|  |  |  |  | is_speed_up | Is Speed Up | bool |  |
| decree_issue | Issue Decree | Issue decree |  | issue_id | Decree ID | text |  |
| technique_levelup | Technique Level Up | After technique level up completes |  | building_id | Building ID | text | Farmland, Lumber Mill, Quarry, Iron Mine, Barracks, Interior Ministry, Conscription Office, Foreign Ministry |
|  |  |  |  | technique_id | Technique ID | number |  |
|  |  |  |  | after_technique_level | Technique Level After Upgrade | number |  |
|  |  |  |  | up_duration | Upgrade Duration | number |  |
|  |  |  |  | is_speed_up | Is Speed Up | bool |  |
| general_level_up | General Level Up | After general levels up |  | general_id | General ID | number |  |
|  |  |  |  | general_current_level | General Current Level | number |  |
| general_star_up | General Star Up | After general stars up |  | general_id | General ID | number |  |
|  |  |  |  | general_current_star | General Current Star | number |  |
| general_skill_up | General Skill Level Up | After general skill levels up |  | general_id | General ID | number |  |
|  |  |  |  | skill_id | Skill ID | number |  |
|  |  |  |  | general_skill_level | Skill Current Level | number |  |
| siege_began | Siege Start | After starting siege |  | land_id | Land Coordinates | list |  |
|  |  |  |  | enemy_power | Enemy Power | number |  |
|  |  |  |  | army_detail | Army Detail | object group |  |
|  |  |  |  | army_detail.general_id | General ID | number |  |
|  |  |  |  | army_detail.general_level | General Level | number |  |
|  |  |  |  | army_detail.soldier_type | Soldier Type | text | Cavalry, Spearman, Infantry, Archer, Shield Soldier |
|  |  |  |  | army_detail.soldier_number | Soldier Count | number |  |
|  |  |  |  | army_detail.army_power | Army Power | number |  |
| siege_end | Siege End | After siege ends |  | land_id | Land Coordinates | list |  |
|  |  |  |  | enemy_power | Enemy Power | number |  |
|  |  |  |  | army_detail | Army Detail | object group |  |
|  |  |  |  | army_detail.general_id | General ID | number |  |
|  |  |  |  | army_detail.general_level | General Level | number |  |
|  |  |  |  | army_detail.soldier_type | Soldier Type | text |  |
|  |  |  |  | army_detail.soldier_number | Soldier Count | number |  |
|  |  |  |  | army_detail.army_power | Army Power | number |  |
|  |  |  |  | enemy_detail | Enemy Detail | object group |  |
|  |  |  |  | enemy_detail.general_id | Enemy General ID | number |  |
|  |  |  |  | enemy_detail.general_level | Enemy General Level | number |  |
|  |  |  |  | enemy_detail.soldier_type | Enemy Soldier Type | text | Cavalry, Spearman, Infantry, Archer, Shield Soldier |
|  |  |  |  | enemy_detail.soldier_number | Enemy Soldier Count | number |  |
|  |  |  |  | enemy_detail.army_power | Enemy Army Power | number |  |
|  |  |  |  | run_duration | March Duration | number |  |
|  |  |  |  | get_score | Score Gained | number |  |
|  |  |  |  | current_score | Current Score | number |  |
|  |  |  |  | is_win | Is Win | bool |  |
|  |  |  |  | item_detail | Item Detail | object group |  |
|  |  |  |  | item_detail.item_id | Item ID | number |  |
|  |  |  |  | item_detail.item_number | Item Quantity | number |  |
| defense_end | Defense End | After defense ends |  | land_id | Land Coordinates | list |  |
|  |  |  |  | enemy_power | Enemy Power | number |  |
|  |  |  |  | army_detail | Army Detail | object group |  |
|  |  |  |  | army_detail.general_id | General ID | number |  |
|  |  |  |  | army_detail.general_level | General Level | number |  |
|  |  |  |  | army_detail.soldier_type | Soldier Type | text |  |
|  |  |  |  | army_detail.soldier_number | Soldier Count | number |  |
|  |  |  |  | army_detail.army_power | Army Power | number |  |
|  |  |  |  | enemy_detail | Enemy Detail | object group |  |
|  |  |  |  | enemy_detail.general_id | Enemy General ID | number |  |
|  |  |  |  | enemy_detail.general_level | Enemy General Level | number |  |
|  |  |  |  | enemy_detail.soldier_type | Enemy Soldier Type | text | Cavalry, Spearman, Infantry, Archer, Shield Soldier |
|  |  |  |  | enemy_detail.soldier_number | Enemy Soldier Count | number |  |
|  |  |  |  | enemy_detail.army_power | Enemy Army Power | number |  |
|  |  |  |  | run_duration | March Duration | number |  |
|  |  |  |  | get_score | Score Gained | number |  |
|  |  |  |  | current_score | Current Score | number |  |
|  |  |  |  | is_win | Is Win | bool |  |
|  |  |  |  | item_detail | Item Detail | object group |  |
|  |  |  |  | item_detail.item_id | Item ID | number |  |
|  |  |  |  | item_detail.item_number | Item Quantity | number |  |
| create_corps | Create Corps | After corps is created |  | corps_id | Corps ID | number |  |
|  |  |  |  | corps_name | Corps Name | text |  |
| join_corps | Join Corps | After joining corps |  | corps_id | Corps ID | number |  |
|  |  |  |  | corps_name | Corps Name | text |  |
|  |  |  |  | corps_level | Corps Level | number |  |
| corps_activity | Participate in Corps Activity | After participating in corps gameplay |  | corps_id | Corps ID | number |  |
|  |  |  |  | corps_name | Corps Name | text |  |
|  |  |  |  | activity_type | Activity Type | text | Tribute, Guild War, Check-in, Lottery, Gift Pack |
| leave_corps | Leave Corps | After leaving corps |  | corps_id | Corps ID | number |  |
|  |  |  |  | corps_name | Corps Name | text |  |
|  |  |  |  | corps_level | Corps Level | number |  |
|  |  |  |  | leave_reason | Leave Reason | text | Left voluntarily, Kicked, Disbanded |
|  |  |  |  | corps_duty | Position Before Leaving | text | Leader, Deputy Leader, Deputy Leader, Captain, Captain, Captain, Member, Member, Member, Member, Member, Member, Member, Member, Member, Member, Member, Member, Member, Member, Member, Member |
| add_friend | Add Friend | Reported upon friend request approval |  | friend_id | Friend ID | text |  |
|  |  |  |  | site_id | Request Position | text |  |
|  |  |  |  | nick_name | Nickname | text |  |
| apply_friend | Apply for Friend | Reported when applying to add a friend |  | friend_id | Friend ID | text |  |
|  |  |  |  | nick_name | Nickname | text |  |
| delete_friend | Delete Friend | Reported when deleting a friend |  | friend_id | Friend ID | text |  |
|  |  |  |  | nick_name | Nickname | text |  |
| give_gift | Give Gift | Reported when giving a gift |  | friend_id | Friend ID | text |  |
|  |  |  |  | gift_id | Gift ID | number |  |
|  |  |  |  | nick_name | Nickname | text |  |
| achievement_finish | Achievement Finished | After an achievement is completed |  | achievement_id | Achievement ID | text |  |
| cost | Cost Event |  |  | media_source | Channel | text |  |
|  |  |  |  | campaign | Campaign | text | ThinkingData CN General, ThinkingData US General, ThinkingData EU General, Default |
|  |  |  |  | ad_id | Ad | text | Second-level real-time query response, break down data silos, speed up workflow & reduce communication cost, 9 major analytics models, intelligent operations, highly customizable, drill-down of table data, model result segmentation, template center, intelligent alerts |
|  |  |  |  | total_cost | Total Cost | number |  |


## #Common Event Properties

| Property Name | Display Name | Property Type | Description |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| main_level | Main City Level | number |  |  |  |  |  |  |  |
| title | VIP Level | number |  |  |  |  |  |  |  |
| food | Grain Stock | number |  |  |  |  |  |  |  |
| wood | Wood Stock | number |  |  |  |  |  |  |  |
| stone | Stone Stock | number |  |  |  |  |  |  |  |
| iron | Iron Stock | number |  |  |  |  |  |  |  |
| copper | Copper Stock | number |  |  |  |  |  |  |  |
| gold | Gold Stock | number |  |  |  |  |  |  |  |
| power | Power | number |  |  |  |  |  |  |  |
| reputation | Reputation | number |  |  |  |  |  |  |  |
| is_avoid_war | Is War Avoidance | bool |  |  |  |  |  |  |  |
| main_account | Login Account | text |  |  |  |  |  |  |  |
| current_mission | Current Mission Stage | number |  |  |  |  |  |  |  |


## #User Data

| Property Name | Display Name | Property Type | Update Method | Description |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #appsflyer_media_source | AppsFlyer Media Source | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| #appsflyer_campaign | AppsFlyer Campaign Name | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| #appsflyer_adset | AppsFlyer Ad Set Name | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| #appsflyer_ad | AppsFlyer Creative Name | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| role_name | Role Name | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_pay_amount | Current Cumulative Payment Amount | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| title | Current Title ID | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| food | Grain Stock | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| wood | Wood Stock | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| stone | Stone Stock | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| iron | Iron Stock | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| copper | Copper Stock | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| gold | Gold Stock | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| power | Current Power | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| country | Country | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| reputation | Reputation | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| main_level | Main City Level | number | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| corps_id | Corps ID | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| corps_duty | Current Corps Position | text | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| channel_id | Channel ID | text | user_setOnce |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| server_id | Server ID | number | user_setOnce |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| is_first | First Role Creation | bool | user_setOnce |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| account_type | Account Type | text | user_setOnce |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| register_time | New User Time | time | user_setOnce |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| first_login_time | First Login Time | time | user_setOnce |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| last_login_time | Last Login Time | time | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| first_pay_time | First Recharge Time | time | user_setOnce |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| last_pay_time | Last Recharge Time | time | user_set |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
