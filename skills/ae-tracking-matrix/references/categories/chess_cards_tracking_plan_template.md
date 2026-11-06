# Chess & Cards Game Tracking Plan


## #User ID System

| ID System Type | Property Name | Property Display Name | Property Description | Assignment Description |
| --- | --- | --- | --- | --- |
| No Account System | #account_id | Account ID | System Property | Do not set #account_id |
|  | #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID; no action needed if using the client SDK |
| Single Account Single Role | #account_id | Account ID | System Property | Set to the player's unique account ID |
|  | #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID; no action needed if using the client SDK |
| Single Account Multiple Roles | #account_id | Account ID | System Property | Set to role ID; the account ID that the role belongs to is set as a custom property of the role |
|  | #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID; no action needed if using the client SDK |


## #Event Data

| Event Name | Event Display Name | Event Description | Property Name | Property Display Name | Property Type | Property Description |
| --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install | Auto-reported when client auto-collection is enabled |  |  |  |  |
| ta_app_start | App Start | Auto-reported when client auto-collection is enabled |  |  |  |  |
| ta_app_crash | App Crash | Auto-reported when client auto-collection is enabled |  |  |  |  |
| ta_app_end | App Close | Auto-reported when client auto-collection is enabled | #duration | Duration | number |  |
| new_device | Device Added | Reported when the device is first activated; use [First Event] |  |  |  | First event, see https://doc.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_8-1-first-event |
| start_loading | Start Loading | Reported when loading starts |  |  |  |  |
| finish_loading | Finish Loading | Reported when loading finishes | #duration | Duration | number | Taking Android SDK as an example, see: https://doc.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_3-4-record-event-duration |
| register | Account Register | Reported when a user creates an account |  |  |  |  |
| login | User Login | After login completes | is_first | Is First Time | bool |  |
| level_up | Level Up | Reported when a player/role levels up | level | Level After Level Up | number |  |
| vip_levelup | VIP Level Up | Reported when VIP levels up | vip_level | VIP Level After Level Up | number |  |
| get_free_coin | Get Free Coins | Reported after receiving free coins | get_times | Collection Count | number | Today's collection count |
| enter_questionnaire | Enter Questionnaire | Reported when entering a questionnaire |  |  |  |  |
| finish_questionnaire | Finish Questionnaire Question | Reported when finishing a question | question_id | Question ID | number |  |
|  |  |  | choice | Choice | number |  |
| guide_complete | Complete Tutorial | Recorded at the completion of each sub-stage of the tutorial | guide_step | Tutorial Step | number |  |
|  |  |  | guide_id | Tutorial Name | text |  |
| seven_login | New User 7-Day Login | Reported when a new user claims the 7-day login reward | day_num | Login Day Count | number |  |
| daily_sign_up | Daily Check-in | Reported on daily check-in | day_num | Login Day Count | number | Cumulative number of check-ins |
| task_complete | Complete Task | Reported when a task is completed and rewards are claimed | task_type | Task Type | text | Main quest, achievement task, daily/weekly task |
|  |  |  | task_id | Task ID | text |  |
|  |  |  | task_name | Task Name | text |  |
|  |  |  | get_item_info | Obtained Item Details | object array | Example: "get_item_info": [ {"item_id":"1","item_num":100},{"item_id":"2","item_num":200} ] |
|  |  |  | get_item_info.item_id | Obtained Item ID | text |  |
|  |  |  | get_item_info.item_num | Obtained Item Amount | number |  |
| init_order | Initiate Recharge | Reported when initiating a recharge | order_id | Order ID | text |  |
|  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  | currency_type | Payment Currency | text | To use the [Currency Integration] feature, it must comply with the ISO 4217 standard (such as CNY, USD, EUR, etc.) |
|  |  |  | payment_name | Purchased Product Name | text |  |
|  |  |  | payment_num | Purchase Quantity | number |  |
|  |  |  | payment_type | Payment Method | text | Alipay/WeChat |
| payment | Recharge Success | Reported when recharge succeeds | order_id | Order ID | text |  |
|  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  | currency_type | Payment Currency | text | To use the [Currency Integration] feature, it must comply with the ISO 4217 standard (such as CNY, USD, EUR, etc.) |
|  |  |  | payment_name | Purchased Product Name | text |  |
|  |  |  | payment_num | Purchase Quantity | number |  |
|  |  |  | payment_type | Payment Method | text | Alipay/WeChat |
|  |  |  | is_first | Is First Time | bool | Yes/No |
| payment_fail | Recharge Fail | Reported when recharge fails | order_id | Order ID | text |  |
|  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  | currency_type | Payment Currency | text | To use the [Currency Integration] feature, it must comply with the ISO 4217 standard (such as CNY, USD, EUR, etc.) |
|  |  |  | payment_name | Purchased Product Name | text |  |
|  |  |  | payment_num | Purchase Quantity | number |  |
|  |  |  | payment_type | Payment Method | text | Alipay/WeChat |
|  |  |  | fail_reason | Recharge Failure Reason | text |  |
| resource_get | Resource Gain | Reported when resources/currency/items are gained ---------------------- Tip: important currencies can be reported as independent events; currencies and items can be split into independent events | change_reason | Change Reason | text | Shop purchase, etc. |
|  |  |  | change_detail | Change Details | text |  |
|  |  |  | resource_info | Asset Info | object array | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  | resource_info.item_type | Item Type | text |  |
|  |  |  | resource_info.change_num | Change Amount | number |  |
|  |  |  | resource_info.after_num | Amount After Change | number |  |
| resource_cost | Resource Consume | Reported when resources/currency/items are consumed ---------------------- Tip: important currencies can be reported as independent events; currencies and items can be split into independent events | change_reason | Change Reason | text | Table fee, etc. |
|  |  |  | change_detail | Change Details | text |  |
|  |  |  | resource_info | Asset Info | object array | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  | resource_info.item_type | Item Type | text |  |
|  |  |  | resource_info.change_num | Change Amount | number |  |
|  |  |  | resource_info.after_num | Amount After Change | number |  |
| shop_buy | Shop Purchase | Reported after purchasing an item in the shop | shop_id | Shop ID | text |  |
|  |  |  | item_id | Item ID | text |  |
|  |  |  | item_num | Item Amount | number |  |
|  |  |  | item_price | Item Price | number |  |
|  |  |  | cost_type | Consumed Currency Type | text |  |
|  |  |  | cost_amount | Consumed Currency Amount | number |  |
| bankrupt | Bankruptcy | Reported when the player's bankable asset (chips, gold, etc.) drops to zero | bankrupt_type | Bankruptcy Type | text | Chips, gold, etc. |
|  |  |  | bankrupt_amount | Bankrupt Amount | number |  |
| chinese_chess_start | Start Chinese Chess Match | Reported on starting a Chinese chess match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Match, ranked, friend battle, AI battle |
|  |  |  | match_mode | Match Mode | text | Normal, blitz, lightning |
|  |  |  | opponent_id | Opponent ID | text |  |
|  |  |  | opponent_level | Opponent Level | number |  |
| chinese_chess_end | End Chinese Chess Match | Reported on settlement of a Chinese chess match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Match, ranked, friend battle, AI battle |
|  |  |  | match_mode | Match Mode | text | Normal, blitz, lightning |
|  |  |  | opponent_id | Opponent ID | text |  |
|  |  |  | opponent_level | Opponent Level | number |  |
|  |  |  | #duration | Duration | number |  |
|  |  |  | result | Result | text | Win, lose, draw, abandoned |
|  |  |  | round_num | Round Count | number |  |
| gobang_start | Start Gobang Match | Reported on starting a Gobang match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Match, ranked, friend battle, AI battle |
|  |  |  | match_mode | Match Mode | text | Normal, blitz, lightning |
|  |  |  | opponent_id | Opponent ID | text |  |
|  |  |  | opponent_level | Opponent Level | number |  |
| gobang_end | End Gobang Match | Reported on settlement of a Gobang match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Match, ranked, friend battle, AI battle |
|  |  |  | match_mode | Match Mode | text | Normal, blitz, lightning |
|  |  |  | opponent_id | Opponent ID | text |  |
|  |  |  | opponent_level | Opponent Level | number |  |
|  |  |  | #duration | Duration | number |  |
|  |  |  | result | Result | text | Win, lose, draw, abandoned |
|  |  |  | round_num | Round Count | number |  |
| landlord_start | Start Landlord Match | Reported on starting a Landlord match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Classic, bidding, bonus, tournament |
|  |  |  | match_mode | Match Mode | text | Normal, double-score, triple-score |
|  |  |  | room_id | Room ID | text |  |
|  |  |  | base_score | Base Score | number |  |
|  |  |  | is_landlord | Is Landlord | bool |  |
| landlord_end | End Landlord Match | Reported on settlement of a Landlord match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Classic, bidding, bonus, tournament |
|  |  |  | match_mode | Match Mode | text | Normal, double-score, triple-score |
|  |  |  | room_id | Room ID | text |  |
|  |  |  | base_score | Base Score | number |  |
|  |  |  | is_landlord | Is Landlord | bool |  |
|  |  |  | #duration | Duration | number |  |
|  |  |  | result | Result | text | Win, lose, abandoned |
|  |  |  | multiplier | Multiplier | number |  |
|  |  |  | win_score | Score Won/Lost | number | Positive for a win, negative for a loss |
|  |  |  | bomb_num | Number of Bombs | number |  |
|  |  |  | round_num | Round Count | number |  |
| fast_run_start | Start Fast Run Match | Reported on starting a Fast Run match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Classic, tournament |
|  |  |  | match_mode | Match Mode | text | Normal, double-score |
|  |  |  | room_id | Room ID | text |  |
|  |  |  | base_score | Base Score | number |  |
| fast_run_end | End Fast Run Match | Reported on settlement of a Fast Run match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Classic, tournament |
|  |  |  | match_mode | Match Mode | text | Normal, double-score |
|  |  |  | room_id | Room ID | text |  |
|  |  |  | base_score | Base Score | number |  |
|  |  |  | #duration | Duration | number |  |
|  |  |  | result | Result | text | 1st, 2nd, 3rd, abandoned |
|  |  |  | multiplier | Multiplier | number |  |
|  |  |  | win_score | Score Won/Lost | number | Positive for a win, negative for a loss |
|  |  |  | bomb_num | Number of Bombs | number |  |
|  |  |  | round_num | Round Count | number |  |
| mahjong_start | Start Mahjong Match | Reported on starting a Mahjong match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Classic, tournament |
|  |  |  | match_mode | Match Mode | text | Blood battle to end, bloody battle, two-player mahjong |
|  |  |  | room_id | Room ID | text |  |
|  |  |  | base_score | Base Score | number |  |
| mahjong_end | End Mahjong Match | Reported on settlement of a Mahjong match | match_id | Match ID | text |  |
|  |  |  | match_type | Match Type | text | Classic, tournament |
|  |  |  | match_mode | Match Mode | text | Blood battle to end, bloody battle, two-player mahjong |
|  |  |  | room_id | Room ID | text |  |
|  |  |  | base_score | Base Score | number |  |
|  |  |  | #duration | Duration | number |  |
|  |  |  | result | Result | text | Self-draw win, discard win, lose, draw, abandoned |
|  |  |  | multiplier | Multiplier | number |  |
|  |  |  | win_score | Score Won/Lost | number | Positive for a win, negative for a loss |
|  |  |  | gang_num | Number of Kongs | number |  |
|  |  |  | round_num | Round Count | number |  |
| enter_room | Enter Room | Reported when entering a game room | room_id | Room ID | text |  |
|  |  |  | room_type | Room Type | text |  |
|  |  |  | game_type | Game Type | text | Chinese chess, Gobang, Landlord, Fast Run, Mahjong, etc. |
| leave_room | Leave Room | Reported when leaving a game room | room_id | Room ID | text |  |
|  |  |  | room_type | Room Type | text |  |
|  |  |  | game_type | Game Type | text | Chinese chess, Gobang, Landlord, Fast Run, Mahjong, etc. |
|  |  |  | #duration | Duration | number |  |
| achievement_unlock | Achievement Unlock | Reported when an achievement is unlocked | achievement_id | Achievement ID | text |  |
| share | Share | Reported on successful share | share_type | Share Type | text | Image, text |
|  |  |  | share_channel | Share Channel | text | WeChat, QQ, Weibo, etc. |
| share_click | Share Click | Reported when a shared item is clicked; #account_id is the initiator of the share. See light instance reporting method: https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_multi-appid.html#_3-create-light-instance | share_type | Share Type | text | Image, text |
|  |  |  | share_channel | Share Channel | text | WeChat, QQ, Weibo, etc. |
| share_install | Share Install | Reported on install after share; #account_id is the initiator of the share. See light instance reporting method: https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_multi-appid.html#_3-create-light-instance | share_type | Share Type | text | Image, text |
|  |  |  | share_channel | Share Channel | text | WeChat, QQ, Weibo, etc. |
| ad_request | Ad Request | Triggered on ad request | ad_platform | Ad Platform | text |  |
|  |  |  | ad_id | Third-party Ad ID | text |  |
|  |  |  | ad_type | Ad Type | text |  |
|  |  |  | ad_placement_name | Internal Ad Placement Name | text |  |
|  |  |  | ad_placement_id | Internal Ad Placement ID | text |  |
|  |  |  | current_page | Current Page | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
| ad_response | Ad Response (Fill) | Triggered when the ad request returns | ad_platform | Ad Platform | text |  |
|  |  |  | ad_id | Third-party Ad ID | text |  |
|  |  |  | ad_type | Ad Type | text |  |
|  |  |  | ad_placement_name | Internal Ad Placement Name | text |  |
|  |  |  | ad_placement_id | Internal Ad Placement ID | text |  |
|  |  |  | current_page | Current Page | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
|  |  |  | is_filled_success | Is Filled Successfully | bool |  |
|  |  |  | error_detail_info | Ad Error Info | text |  |
|  |  |  | error_detail_code | Ad Error Code | text |  |
| ad_show | Ad Impression | Triggered when an ad is shown, e.g.: ad shown successfully = fill success & show success; ad shown failed = fill success & show failure, or fill failure & show failure | ad_platform | Ad Platform | text |  |
|  |  |  | ad_id | Third-party Ad ID | text |  |
|  |  |  | ad_type | Ad Type | text |  |
|  |  |  | ad_placement_name | Internal Ad Placement Name | text |  |
|  |  |  | ad_placement_id | Internal Ad Placement ID | text |  |
|  |  |  | current_page | Current Page | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
|  |  |  | ad_app_name | Advertiser Info | text |  |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be captured, triggered when the ad platform returns click info | ad_platform | Ad Platform | text |  |
|  |  |  | ad_id | Third-party Ad ID | text |  |
|  |  |  | ad_type | Ad Type | text |  |
|  |  |  | ad_placement_name | Internal Ad Placement Name | text |  |
|  |  |  | ad_placement_id | Internal Ad Placement ID | text |  |
|  |  |  | current_page | Current Page | text |  |
|  |  |  | ad_app_name | Advertiser Info | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
| ad_close | Ad Close | Triggered on ad close | ad_platform | Ad Platform | text |  |
|  |  |  | ad_id | Third-party Ad ID | text |  |
|  |  |  | ad_type | Ad Type | text |  |
|  |  |  | ad_placement_name | Internal Ad Placement Name | text |  |
|  |  |  | ad_placement_id | Internal Ad Placement ID | text |  |
|  |  |  | current_page | Current Page | text |  |
|  |  |  | ad_app_name | Advertiser Info | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
|  |  |  | ad_duration | Ad Duration | number |  |
|  |  |  | ad_play_duration | Ad Watch Duration | number |  |
|  |  |  | is_complete_play | Is Fully Played | bool |  |
| oceanengine_cost | Oceanengine Ad Data | Imported from third-party platform | #event_id | #Event ID | text | *Use updatable event*/update order status; id is tied to the order number to avoid anomalies |
|  |  |  | media_source | Ad Channel | text |  |
|  |  |  | campaign | Ad Campaign | text |  |
|  |  |  | ad_group | Ad Group | text |  |
|  |  |  | ad_id | Ad ID | text |  |
|  |  |  | ad_type | Ad Type | text |  |
|  |  |  | total_cost | Media Spend Amount | number | Unit: Yuan |
|  |  |  | impressions | Impressions | number |  |
|  |  |  | clicks | Clicks | number |  |
|  |  |  | installs | Installs | number |  |
| facebook_cost | Facebook Ad Data | Imported from third-party platform | #event_id | #Event ID | text | *Use updatable event*/update order status; id is tied to the order number to avoid anomalies |
|  |  |  | media_source | Ad Channel | text |  |
|  |  |  | campaign | Ad Campaign | text |  |
|  |  |  | ad_group | Ad Group | text |  |
|  |  |  | ad_id | Ad ID | text |  |
|  |  |  | ad_type | Ad Type | text |  |
|  |  |  | total_cost | Media Spend Amount | number | Unit: USD |
|  |  |  | impressions | Impressions | number |  |
|  |  |  | clicks | Clicks | number |  |
|  |  |  | installs | Installs | number |  |
| ironsource_revenue | Ironsource Ad Revenue | Imported from third-party platform | ad_platform | Ad Platform | text |  |
|  |  |  | ad_unit_name | Ad Unit Name | text |  |
|  |  |  | ad_unit_type | Ad Unit Type | text | Rewarded video, interstitial, banner |
|  |  |  | country | Country | text |  |
|  |  |  | revenue_value | Ad Revenue | number | Unit: USD |
|  |  |  | impressions | Impressions | number |  |
| current_online | Current Online Users | Reported at a specific time granularity; it is recommended to bind multiple #account_id to prevent data skew at ingestion. However, do not set too many #account_id | online_user | Online Users | number |  |
|  |  |  | server_id | Server ID | number | Set one ID per server; set a separate ID for the total count |


## #User Data

| Property Name | Property Display Name | Property Type | Update Method | Property Description |
| --- | --- | --- | --- | --- |
| device_id | Device ID | string | user_setOnce | Recorded on register |
| server_id | Server | number | user_setOnce | Recorded on first login |
| player_id | Player ID | string | user_setOnce | Recorded on first login |
| current_level | Current Level | number | user_set | Recorded when player level changes |
| current_vip_level | Current VIP Level | number | user_set | Recorded when player VIP level changes |
| #appsflyer_media_source | Channel | string | user_set | Provided by third-party data; AppsFlyer is used as an example here |
| #appsflyer_campaign | Campaign | string | user_set | Provided by third-party data; AppsFlyer is used as an example here |
| #appsflyer_adset | Ad Set | string | user_set | Provided by third-party data; AppsFlyer is used as an example here |
| #appsflyer_ad | Ad | string | user_set | Provided by third-party data; AppsFlyer is used as an example here |
| ab_test | A/B Test Group | list | user_append | Set each time a new group is added |
| achievement_unlock | Achievement Unlock List | list | user_append | Set each time an achievement is unlocked |
| is_ad_free | Is Ad-Free | bool | user_set | Set each time the state changes |
| register_time | User Added Time | time | user_setOnce | Recorded when the user is added (activation/registration/role-creation time, consistent with the user ID system) |
| first_login_time | First Login Time | time | user_setOnce | Recorded on first login |
| last_login_time | Last Login Time | time | user_set | Overwrites the previous record on each login |
| first_pay_time | First Payment Time | time | user_setOnce | Recorded on first payment |
| last_pay_time | Last Payment Time | time | user_set | Overwrites the previous record on each payment |
| total_pay_amount | Cumulative Payment Amount | number | user_add | Accumulated on each payment completion |
| total_pay_times | Cumulative Payment Times | number | user_add | Accumulated on each payment completion |
| total_ad_times | Cumulative Ad Impressions | number | user_add | Reported after each ad playback completes |
| total_login_day | Cumulative Login Days | number | user_add | Accumulated on each login |
| total_chinese_chess_times | Chinese Chess Match Count | number | user_add | Accumulated on each match end |
| total_chinese_chess_win | Chinese Chess Wins | number | user_add | Accumulated on each win |
| total_gobang_times | Gobang Match Count | number | user_add | Accumulated on each match end |
| total_gobang_win | Gobang Wins | number | user_add | Accumulated on each win |
| total_landlord_times | Landlord Match Count | number | user_add | Accumulated on each match end |
| total_landlord_win | Landlord Wins | number | user_add | Accumulated on each win |
| total_fast_run_times | Fast Run Match Count | number | user_add | Accumulated on each match end |
| total_fast_run_win | Fast Run Wins | number | user_add | Accumulated on each win |
| total_mahjong_times | Mahjong Match Count | number | user_add | Accumulated on each match end |
| total_mahjong_win | Mahjong Wins | number | user_add | Accumulated on each win |
| current_coin | Current Silver | number | user_set | Set each time it changes |
| current_diamond | Current Diamond | number | user_set | Set each time it changes |
| current_chip | Current Chips | number | user_set | Set each time it changes |


## #Common Event Properties

| Property Name | Property Display Name | Property Type | Property Description |
| --- | --- | --- | --- |
| channel | Channel | text | e.g., TapTap, App Store, etc. |
| tmp_level | Current Level | number |  |
| tmp_vip_level | Current VIP Level | number |  |
| tmp_coin | Current Silver | number |  |
| tmp_diamond | Current Diamond | number |  |
| tmp_chip | Current Chips | number |  |
| ab_test | A/B Test Group | string |  |
