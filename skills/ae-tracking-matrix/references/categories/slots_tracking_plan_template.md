# Slots Game Tracking Plan


## #User ID System

| Game Type | Property Name | Display Name | Property Description | Assignment Description |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| Single account single role | #account_id | Account ID | System property | Set to player account ID |  |  |
|  | #distinct_id | Visitor ID | System property | Device-related ID or in-business visitor ID; if using client SDK, visitor ID can be auto-generated |  |  |


## #Event Data

| Event Name | Event Display Name | Event Description | Property Name (required) | Display Name | Type (required) | Property Description |
| --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install | Auto-collected by client SDK |  |  |  | ThinkingData client SDK auto-collected event, mainly for mobile; web can define similar custom events reported with this name |
| ta_app_start | App Start | Auto-collected by client SDK |  |  |  |  |
| ta_app_end | App Close | Auto-collected by client SDK |  |  |  |  |
| ta_app_crash | App Crash | Auto-collected by client SDK | #duration | Duration | number |  |
| new_device | Device Added | Reported on first device activation, uses [First Event] |  |  |  | Reference: https://docs.thinkingdata.cn/ta-manual/latest/installation/advanced_data_type/track_update_and_track_overwrite.html |
| start_loading | Start Loading | Reported when loading begins |  |  |  |  |
| finish_loading | Finish Loading | Reported when loading completes | #duration | Duration | number |  |
| register | Account Register | Reported when account registers | invite_code | Referral code | text | For invited users / null for non-invited users |
|  |  |  | inviter_id | Inviter ID | text | For invited users / null for non-invited users |
| login | Account Login | Reported when account logs in |  |  |  |  |
| level_up | Level Up | Reported when player levels up | level | Level after up | number |  |
| vip_levelup | VIP Level Up | Reported when VIP levels up | vip_level | VIP level after up | number |  |
| logout | Account Logout | Reported when account logs out |  |  |  |  |
| guide_complete | Complete Novice Guide | Reported when each step of novice guide completes | guide_id | Guide category | text |  |
|  |  |  | guide_step | Guide step | number |  |
| init_order | Initiate Payment | Reported when payment initiated | order_id | Order ID | text |  |
|  |  |  | pay_amount | Payment amount | number |  |
|  |  |  | currency_type | Payment currency | text | To use [Currency Rate Integration], must follow ISO 4217 standard (e.g. CNY, USD, EUR) |
|  |  |  | payment_name | Purchased item name | text |  |
|  |  |  | payment_num | Purchase quantity | number |  |
|  |  |  | payment_type | Payment method | text | Alipay/WeChat |
| payment | Payment Success | Reported when payment succeeds | order_id | Order ID | text |  |
|  |  |  | pay_amount | Payment amount | number |  |
|  |  |  | currency_type | Payment currency | text | To use [Currency Rate Integration], must follow ISO 4217 standard (e.g. CNY, USD, EUR) |
|  |  |  | payment_name | Purchased item name | text |  |
|  |  |  | payment_num | Purchase quantity | number |  |
|  |  |  | payment_type | Payment method | text | Alipay/WeChat |
|  |  |  | is_first | Is first time | bool | Yes/No |
| payment_fail | Payment Fail | Reported when payment fails | order_id | Order ID | text |  |
|  |  |  | pay_amount | Payment amount | number |  |
|  |  |  | currency_type | Payment currency | text | To use [Currency Rate Integration], must follow ISO 4217 standard (e.g. CNY, USD, EUR) |
|  |  |  | payment_name | Purchased item name | text |  |
|  |  |  | payment_num | Purchase quantity | number |  |
|  |  |  | payment_type | Payment method | text | Alipay/WeChat |
|  |  |  | fail_reason | Payment failure reason | text |  |
| resource_get | Resource Gained | Reported when resource/currency/item is gained ---------------------- Tips: Important currencies can be reported as separate events. Currencies and items can be split into separate events | change_reason | Change reason | text | Shop purchase, etc. |
|  |  |  | change_detail | Change detail | text |  |
|  |  |  | resource_info | Resource info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  | resource_info.item_type | Item type | text |  |
|  |  |  | resource_info.change_num | Change quantity | number |  |
|  |  |  | resource_info.after_num | Quantity after change | number |  |
| resource_cost | Resource Consumed | Reported when resource/currency/item is consumed ---------------------- Tips: Important currencies can be reported as separate events. Currencies and items can be split into separate events | change_reason | Change reason | text | Hero upgrade, etc. |
|  |  |  | change_detail | Change detail | text |  |
|  |  |  | resource_info | Resource info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |
|  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  | resource_info.item_type | Item type | text |  |
|  |  |  | resource_info.change_num | Change quantity | number |  |
|  |  |  | resource_info.after_num | Quantity after change | number |  |
| ad_request | Ad Request | Triggered when ad is requested | ad_platform | Ad platform | text |  |
|  |  |  | ad_id | Third-party ad ID | text |  |
|  |  |  | ad_type | Ad type | text |  |
|  |  |  | ad_placement_name | Internal ad placement name | text |  |
|  |  |  | ad_placement_id | Internal ad placement ID | text |  |
|  |  |  | current_page | Current page | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
| ad_response | Ad Response (Fill) | Triggered after ad request returns | ad_platform | Ad platform | text |  |
|  |  |  | ad_id | Third-party ad ID | text |  |
|  |  |  | ad_type | Ad type | text |  |
|  |  |  | ad_placement_name | Internal ad placement name | text |  |
|  |  |  | ad_placement_id | Internal ad placement ID | text |  |
|  |  |  | current_page | Current page | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
|  |  |  | is_filled_success | Is fill successful | bool |  |
|  |  |  | error_detail_info | Ad error info | text |  |
|  |  |  | error_detail_code | Ad error code | text |  |
| ad_show | Ad Impression | Triggered when ad is shown, e.g.: ad show success means fill success & show success; ad show fail means fill success & show fail, or fill fail & show fail | ad_platform | Ad platform | text |  |
|  |  |  | ad_id | Third-party ad ID | text |  |
|  |  |  | ad_type | Ad type | text |  |
|  |  |  | ad_placement_name | Internal ad placement name | text |  |
|  |  |  | ad_placement_id | Internal ad placement ID | text |  |
|  |  |  | current_page | Current page | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
|  |  |  | ad_app_name | Advertiser info | text |  |
| ad_click | Ad Click | Triggered on ad click; if click cannot be captured, triggered when ad platform returns click info | ad_platform | Ad platform | text |  |
|  |  |  | ad_id | Third-party ad ID | text |  |
|  |  |  | ad_type | Ad type | text |  |
|  |  |  | ad_placement_name | Internal ad placement name | text |  |
|  |  |  | ad_placement_id | Internal ad placement ID | text |  |
|  |  |  | current_page | Current page | text |  |
|  |  |  | ad_app_name | Advertiser info | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
| ad_close | Ad Close | Triggered when ad is closed | ad_platform | Ad platform | text |  |
|  |  |  | ad_id | Third-party ad ID | text |  |
|  |  |  | ad_type | Ad type | text |  |
|  |  |  | ad_placement_name | Internal ad placement name | text |  |
|  |  |  | ad_placement_id | Internal ad placement ID | text |  |
|  |  |  | current_page | Current page | text |  |
|  |  |  | ad_app_name | Advertiser info | text |  |
|  |  |  | ad_ecpm | Ad eCPM | number |  |
|  |  |  | ad_duration | Ad duration | number |  |
|  |  |  | ad_play_duration | Ad watch duration | number |  |
|  |  |  | is_complete_play | Is complete play | bool |  |
| shop_buy | Shop Purchase | Reported on shop purchase | shop_id | Shop ID | text |  |
|  |  |  | item_id | Item ID | text |  |
|  |  |  | item_num | Item quantity | number |  |
|  |  |  | item_price | Item price | number |  |
| unlock_machine | Unlock Machine | Reported when machine is unlocked | machine_id | Machine ID | number |  |
|  |  |  | machine_name | Machine English name | text |  |
| enter_machine | Enter Machine | Reported when entering machine | machine_id | Machine ID | number |  |
|  |  |  | machine_name | Machine English name | text |  |
|  |  |  | if_first_enter | Is first entry | bool |  |
| leave_machine | Leave Machine | Reported when leaving machine | machine_id | Machine ID | number |  |
|  |  |  | machine_name | Machine English name | text |  |
|  |  |  | if_first_enter | Is first entry | bool |  |
|  |  |  | #duration | Duration | number | Unit: seconds |
| spin_start | Spin Start | Reported when spin starts | machine_id | Machine ID | number |  |
|  |  |  | machine_name | Machine English name | text |  |
|  |  |  | enter_machine_time | Time of entering machine | time |  |
|  |  |  | if_first_enter | Is first entry | bool |  |
|  |  |  | machine_gid | Game ID | text | Unique ID of one spin round |
|  |  |  | total_bet | Bet size | number |  |
|  |  |  | total_bet_lv | Bet tier | number |  |
|  |  |  | total_bet_value | Bet USD value | number |  |
|  |  |  | use_rtp | Reel set RTP | text | Which reel set the bet belongs to |
|  |  |  | is_auto | Is AUTO | bool |  |
|  |  |  | is_maxbet | Is Maxbet | bool | Whether it is maximum bet |
|  |  |  | positive_cistern | Positive pool balance | number |  |
|  |  |  | negative_cistern | Negative pool balance | number |  |
| spin_end | Spin End | Reported when result is returned | machine_id | Machine ID | number |  |
|  |  |  | machine_name | Machine English name | text |  |
|  |  |  | enter_machine_time | Time of entering machine | time |  |
|  |  |  | if_first_enter | Is first entry | bool |  |
|  |  |  | machine_gid | Game ID | text | Unique ID of one spin round |
|  |  |  | total_bet | Bet size | number |  |
|  |  |  | total_bet_lv | Bet tier | number |  |
|  |  |  | total_bet_value | Bet USD value | number |  |
|  |  |  | win | Win amount | number |  |
|  |  |  | win_value | Win USD value | number |  |
|  |  |  | win_mul | Win multiplier | number |  |
|  |  |  | feature_type | Feature type | list |  |
|  |  |  | jackpot_win | Jackpot win amount | number |  |
|  |  |  | jackpot_win_value | Jackpot win USD value | number |  |
|  |  |  | jackpot_win_mul | Jackpot win multiplier | number |  |
|  |  |  | use_rtp | Reel set RTP | text | Which reel set the bet belongs to |
|  |  |  | is_auto | Is AUTO | bool |  |
|  |  |  | is_maxbet | Is Maxbet | bool | Whether it is maximum bet |
|  |  |  | machine_cistern | Pool balance | number |  |
| bankrupt | Bankrupt | Reported when bankrupt | machine_id | Machine ID | number |  |
|  |  |  | total_bet | Bet size | number |  |
|  |  |  | total_bet_lv | Bet tier | number |  |
|  |  |  | total_bet_value | Bet USD value | number |  |
| apply_friend | Apply Friend | Reported when applying for friend | friend_id | Friend ID | text |  |
|  |  |  | apply_friend_type | Apply friend type | text | Targeted search, system recommendation, etc. |
| add_friend | Add Friend | Reported when adding friend | friend_id | Friend ID | text |  |
| invite_friend | Invite Friend | Reported when inviting friend | friend_id | Friend ID | text |  |
|  |  |  | invite_type | Invite method | text |  |
|  |  |  | invite_code | Invite referral code | text |  |
| del_friend | Delete Friend | Reported when deleting friend | friend_id | Friend ID | text |  |
|  |  |  | friendship | Friendship points | number |  |
| give_gift | Give Gift | Reported when giving gift | gift_id | Gift ID | text |  |
|  |  |  | gift_num | Gift quantity | number |  |
|  |  |  | friend_id | Friend ID | text |  |
|  |  |  | friendship_change | Friendship points change | number |  |
|  |  |  | after_friendship | Friendship points after change | number |  |
| receive_gift | Claim Gift | Reported when claiming gift | gift_id | Gift ID | text |  |
|  |  |  | gift_num | Gift quantity | number |  |
|  |  |  | friend_id | Friend ID | text |  |
|  |  |  | friendship_change | Friendship points change | number |  |
|  |  |  | after_friendship | Friendship points after change | number |  |
| task_start | Quest Start | Reported when quest starts | task_id | Quest ID | text |  |
|  |  |  | task_type | Quest type | text |  |
| task_complete | Complete Quest | Reported when quest completes | task_id | Quest ID | text |  |
|  |  |  | task_type | Quest type | text |  |
| sign_complete | Complete Check-in | Reported when check-in completes | sign_type | Check-in type | text | Daily check-in / event check-in, etc. |
|  |  |  | sign_days | Check-in days | number |  |
| award_get | Claim Reward | Reported when reward is claimed | award_id | Reward ID | text | IDs of various rewards |
|  |  |  | award_type | Reward type | text |  |
| rank | Leaderboard | #distinct_id reports a custom value that does not conflict with players; clear common properties before reporting; report once every specific time period | rank_type | Leaderboard type | text | Such as level/online duration, etc. |
|  |  |  | rank_info | Rank info | object group | Example: "rank_info": [ {"id":"1000125","rank":1,"score":12000},{"id":"1000236","rank":2,"score":11005} ] |
|  |  |  | rank_info.id | Player ID | text |  |
|  |  |  | rank_info.rank | Rank | number |  |
|  |  |  | rank_info.score | Score | number |  |
| current_online | Online Users | #distinct_id reports a custom value that does not conflict with players; clear common properties before reporting; report once every specific time period | server_id | Server ID | text | Split by server, each reports 1 record; also report 1 overall record |
|  |  |  | platform | Platform | text | iOS/Android |
|  |  |  | online_user | Online users | number | Number of online users |


## #Common Event Properties

| Property Name (required) | Display Name | Type (required) | Property Description |
| --- | --- | --- | --- |
| channel | Channel | text | Such as taptap, appstore, etc. |
| tmp_level | Current level | number |  |
| tmp_vip_level | Current VIP level | number |  |
| tmp_vip_points | Current VIP points | number |  |
| big_win_times | BIGWIN count | number |  |
| jackpot_times | JACKPOT count | number |  |
| tmp_coin | Current coins | number |  |
| tmp_gem | Current gems | number |  |


## #User Data

| Property Name (required) | Display Name | Type (required) | Update Method | Property Description |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| device_id | Device ID | text | user_setOnce | Set at game start/registration |  |  |  |  |  |  |  |  |  |  |  |  |  |
| channel | Registration channel | text | user_setOnce | Set at game start/registration; records user channel info such as app store, Tencent MyApp, etc. |  |  |  |  |  |  |  |  |  |  |  |  |  |
| inviter_id | Inviter ID | text | user_setOnce | Recorded at registration |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_level | Current level | number | user_set | Recorded when player level changes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_vip_level | Current VIP level | number | user_set | Recorded when player VIP level changes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_vip_points | Current VIP points | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| register_time | User added time | time | user_setOnce | Recorded when user is added (activation/registration/character creation time, aligned with user ID system) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| first_login_time | First login time | time | user_setOnce | Recorded at first login |  |  |  |  |  |  |  |  |  |  |  |  |  |
| last_login_time | Last login time | time | user_set | Overwritten on each login |  |  |  |  |  |  |  |  |  |  |  |  |  |
| first_pay_time | First payment time | time | user_setOnce | Recorded on first successful payment |  |  |  |  |  |  |  |  |  |  |  |  |  |
| last_pay_time | Last payment time | time | user_set | Overwritten on each successful payment |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_pay_amount | Total payment amount | number | user_set | Overwritten on each successful payment |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_pay_times | Total payment count | number | user_set | Overwritten on each successful payment |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_login_day | Total login days | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| bet_count | Total bet count | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| big_win_times | BIGWIN count | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| jackpot_times | JACKPOT count | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| machine_count | Number of spun machines | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_coin | Current coin amount | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_coin_value | Current coin USD value | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_gem | Current gem amount | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
