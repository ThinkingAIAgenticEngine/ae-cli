# Casual Game Tracking Plan


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
| ta_app_install | App Install | Auto-reported when client auto-collection is enabled |  |  |  | ThinkingData client SDK auto-collect event, primarily for mobile; web can use custom events with similar logic reported under this name |
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
| resource_cost | Resource Consume | Reported when resources/currency/items are consumed ---------------------- Tip: important currencies can be reported as independent events; currencies and items can be split into independent events | change_reason | Change Reason | text | Upgrading hero, etc. |
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
| prop_upgrade | Attribute Upgrade | Reported when the player finishes attribute upgrade after an adventure ends and chooses to restart | prop_detail | Attribute Details | object array | Example: "prop_detail": [ {"type":"atk","change_num":"10","change_after":100}, {"type":"health","change_num":"15","change_after":75} ] |
|  |  |  | prop_detail.type | Attribute Detail Type | text |  |
|  |  |  | prop_detail.change_num | Attribute Change Value | number |  |
|  |  |  | prop_detail.change_after | Attribute Value After Change | number |  |
| booklet_levelup | Adventure Booklet Upgrade | Reported when eggs, weapons, or monsters in the adventure booklet are upgraded | booklet_id | Adventure Booklet ID | text | Egg, weapon, monster |
|  |  |  | booklet_sub_id | Adventure Booklet Sub-ID | text | Corresponding entry ID within the booklet |
|  |  |  | after_level | Level After Operation | number |  |
| achievement_unlock | Achievement Unlock | Reported when an achievement is unlocked | achievement_id | Achievement ID | text |  |
| memory_unlock | Memory Unlock | Reported when a memory is unlocked | memory_id | Memory ID | text |  |
| enter_stage | Enter Stage | Reported when entering a stage | is_first | Is First Time | bool |  |
|  |  |  | is_boss | Is Boss Stage | bool |  |
|  |  |  | stage_id | Stage ID | text |  |
|  |  |  | stage_type | Stage Type | text | Battle, different gameplay, etc. |
| finish_stage | Stage Settlement | Reported at stage settlement | is_first | Is First Time | bool |  |
|  |  |  | is_boss | Is Boss Stage | bool |  |
|  |  |  | stage_id | Stage ID | text |  |
|  |  |  | stage_type | Stage Type | text | Battle, different gameplay, etc. |
|  |  |  | #duration | Duration | number |  |
|  |  |  | result | Result | text | Success, death, game failure, game abandoned, etc. |
| stage_choice | In-Stage Choice | Reported each time an in-stage choice is completed | is_first | Is First Time | bool |  |
|  |  |  | is_boss | Is Boss Stage | bool |  |
|  |  |  | stage_id | Stage ID | text |  |
|  |  |  | stage_type | Stage Type | text | Battle (explicit enemy), camping, box pushing, different events, etc. |
|  |  |  | cost_action_point | Action Points Consumed | number |  |
|  |  |  | change_type | Change Type | text | Increase, decrease, no change |
|  |  |  | prop_type | Attribute Type | text | Attack, health, gold, etc. |
|  |  |  | change_amount | Change Value | number |  |
|  |  |  | result | Result | text | Success, death, game failure, game abandoned, etc. |
| special_event | Special Event | Reported when a special event is triggered | special_event_id | Special Event ID | text |  |
| camp | Camping | Reported when entering camping | is_initiative | Is Entered Actively | bool |  |
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
| progress | Max Progress | number | user_set | Set each time the max progress changes |
| skin_list | Unlocked Skin List | list | user_append | Set each time a skin is unlocked |
| achievement_unlock | Achievement Unlock List | list | user_append | Set each time an achievement is unlocked |
| is_ad_free | Is Ad-Free | bool | user_set | Set each time the state changes |
| collection_detail | Collection Details | object array | user_set | Set the entire object array each time the state changes |
| collection_detail.collection_id | Collection Category ID | string |  |  |
| collection_detail.collection_sub_id | Collection Category Sub-ID | string |  |  |
| collection_detail.level | Collection Level | number |  |  |
| collection_improve_atk | Collection Attack Bonus | number | user_set | Set each time it changes |
| collection_improve_health | Collection Health Bonus | number | user_set | Set each time it changes |
| collection_improve_critical | Collection Crit Rate Bonus | number | user_set | Set each time it changes |
| collection_improve_hitrate | Collection Hit Rate Bonus | number | user_set | Set each time it changes |
| register_time | User Added Time | time | user_setOnce | Recorded when the user is added (activation/registration/role-creation time, consistent with the user ID system) |
| first_login_time | First Login Time | time | user_setOnce | Recorded on first login |
| last_login_time | Last Login Time | time | user_set | Overwrites the previous record on each login |
| first_pay_time | First Payment Time | time | user_setOnce | Recorded on first payment |
| last_pay_time | Last Payment Time | time | user_set | Overwrites the previous record on each payment |
| total_pay_amount | Cumulative Payment Amount | number | user_add | Accumulated on each payment completion |
| total_pay_times | Cumulative Payment Times | number | user_add | Accumulated on each payment completion |
| total_ad_times | Cumulative Ad Impressions | number | user_add | Reported after each ad playback completes |
| total_login_day | Cumulative Login Days | number | user_add | Accumulated on each login |
| current_coin | Current Silver | number | user_set | Set each time it changes |
| current_diamond | Current Diamond | number | user_set | Set each time it changes |


## #Common Event Properties

| Property Name | Property Display Name | Property Type | Property Description |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| channel | Channel | text | e.g., TapTap, App Store, etc. |  |  |  |  |  |  |  |  |
| tmp_level | Current Level | number |  |  |  |  |  |  |  |  |  |
| tmp_vip_level | Current VIP Level | number |  |  |  |  |  |  |  |  |  |
| stage | Stage ID | number |  |  |  |  |  |  |  |  |  |
| tmp_coin | Current Silver | number |  |  |  |  |  |  |  |  |  |
| tmp_diamond | Current Diamond | number |  |  |  |  |  |  |  |  |  |
| ab_test | A/B Test Group | string |  |  |  |  |  |  |  |  |  |
