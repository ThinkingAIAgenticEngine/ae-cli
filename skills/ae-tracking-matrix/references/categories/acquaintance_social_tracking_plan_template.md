# Acquaintance Social Tracking Plan


## #User ID System

| Property Name | Property Display Name | Property Description | Assignment Description |
| --- | --- | --- | --- |
| #account_id | Account ID | System Property | Set to account ID |
| #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID; if using the client SDK, the visitor ID can be auto-generated |


## #Event Data

| Event Name (required) | Event Display Name | Event Description | Property Name (required) | Property Display Name | Property Type (required) | Property Description |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install |  |  |  |  |  |  |
| ta_app_start | App Start |  |  |  |  |  |  |
| ta_app_end | App Logout |  | #duration | Online Duration | number | Collected automatically once client auto-collection is enabled |  |
| ta_app_crash | App Crash |  |  |  |  |  |  |
| new_device | Device Added | Use First Event |  |  |  | See: https://docs.thinkingdata.cn/ta-manual/latest/installation/advanced_data_type/track_update_and_track_overwrite.html |  |
| register | Account Register |  |  |  |  |  |  |
| login | Account Login |  | last_login_time | Last Login Time | time | Used to compute returning users |  |
| levelup | Account Level Up |  | after_level | Level After Level Up | number |  |  |
| vip_levelup | VIP Purchase |  | vip_type | VIP Type | string | Monthly/Yearly, etc. |  |
|  |  |  | is_renew | Is Renewal Purchase | bool |  |  |
| logout | Account Logout |  | account_duration | Account Online Duration | number | Unit: seconds |  |
| guide_complete | Complete Tutorial |  | guide_step | Tutorial Step | number |  |  |
| init_order | Initiate Order |  | order_id | Order ID | string |  |  |
|  |  |  | click_position | Click Position | string | From which button or page the order was initiated |  |
|  |  |  | goods_id | Purchased Product ID | string |  |  |
|  |  |  | goods_num | Purchase Quantity | number |  |  |
|  |  |  | goods_single_price | Product Unit Price | number |  |  |
| payment | Payment Complete | Report an asset gain event at the same time | order_id | Order ID | string |  |  |
|  |  |  | click_position | Click Position | string | From which button or page the order was initiated |  |
|  |  |  | is_first_pay | Is First Payment | bool | Server-side determines whether this is the first payment |  |
|  |  |  | order_time | Order Initiation Time | time |  |  |
|  |  |  | goods_id | Purchased Product ID | string |  |  |
|  |  |  | goods_num | Purchase Quantity | number |  |  |
|  |  |  | goods_single_price | Product Unit Price | number |  |  |
|  |  |  | pay_method | Payment Method | string | Alipay/WeChat |  |
|  |  |  | currency_type | Currency | string | See: https://docs.thinkingdata.cn/ta-manual/latest/user_guide/advanced_analysis/currency.html#%E9%99%84%E5%BD%95 |  |
|  |  |  | pay_amount | Payment Amount | number |  |  |
| resource_get | Resource Gain | Reported when resources/currency/items are gained ---------------------- Tip: important currencies can be reported as independent events; currencies and items can be split into independent events | change_reason | Change Reason | string | Check-in reward/Friend gift, etc. |  |
|  |  |  | change_detail | Change Details | text |  |  |
|  |  |  | resource_info | Asset Info | object array | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |  |
|  |  |  | resource_info.item_id | Item ID | text |  |  |
|  |  |  | resource_info.item_type | Item Type | text |  |  |
|  |  |  | resource_info.change_num | Change Amount | number |  |  |
|  |  |  | resource_info.after_num | Amount After Change | number |  |  |
| resource_cost | Resource Consume | Reported when resources/currency/items are consumed ---------------------- Tip: important currencies can be reported as independent events; currencies and items can be split into independent events | change_reason | Change Reason | string | Shop purchase/Gift sending, etc. |  |
|  |  |  | change_detail | Change Details | text |  |  |
|  |  |  | resource_info | Asset Info | object array | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |  |
|  |  |  | resource_info.item_id | Item ID | text |  |  |
|  |  |  | resource_info.item_type | Item Type | text |  |  |
|  |  |  | resource_info.change_num | Change Amount | number |  |  |
|  |  |  | resource_info.after_num | Amount After Change | number |  |  |
| open_shop | Open Shop |  | shop_id | Shop ID | string |  |  |
|  |  |  | click_position | Click Position | string | From which button or page the shop was opened |  |
| shop_buy | Purchase Item | Report asset gain and consume events at the same time | shop_id | Shop ID | string |  |  |
|  |  |  | item_id | Item ID | string |  |  |
|  |  |  | item_num | Item Amount | number |  |  |
|  |  |  | item_price | Item Price | number |  |  |
|  |  |  | cost_type | Currency Type | string | Asset/item type consumed to buy the item |  |
| recruit | Draw Outfit |  | pond_id | Card Pool ID | string |  |  |
|  |  |  | recruit_type | Draw Type | string | Single pull / 10-pull |  |
|  |  |  | recruit_num | Draw Count | number | Used for aggregate calculation |  |
| activity_attend | Attend Activity |  | activity_id | Activity ID | string |  |  |
|  |  |  | activity_type | Activity Type | string | New user activity/daily activity/weekly activity/holiday activity, etc. |  |
| activity_end | Activity Settlement | Report an asset gain event at the same time | activity_id | Activity ID | string |  |  |
|  |  |  | activity_type | Activity Type | string | New user activity/daily activity/weekly activity/holiday activity, etc. |  |
|  |  |  | complete_rate | Completion Rate | number | The way completion is computed can be customized; for example, a check-in activity may be defined as: actual check-in days / available check-in days |  |
| apply_friend | Apply as Friend |  | friend_id | Friend ID | string |  |  |
| add_friend | Add Friend |  | friend_id | Friend ID | string |  |  |
| delete_friend | Delete Friend |  | friend_id | Friend ID | string |  |  |
| block_friend | Block Friend |  | friend_id | Friend ID | string |  |  |
| send_message | Send Message |  | friend_id | Friend ID | string | Private chat only |  |
|  |  |  | group_id | Group Chat ID | string | Group chat only |  |
|  |  |  | chat_type | Chat Type | string | Private chat/Group chat |  |
|  |  |  | message_type | Message Type | string | Text/Voice/Image/Video/File, etc. |  |
|  |  |  | message_content | Message Content |  |  |  |
| give_envelope | Send Red Envelope |  | friend_id | Friend ID | string | Private chat only |  |
|  |  |  | group_id | Group Chat ID | string | Group chat only |  |
|  |  |  | envelope_num | Red Envelope Count | number |  |  |
|  |  |  | money_num | Red Envelope Amount | number |  |  |
|  |  |  | cover_id | Red Envelope Cover ID | string |  |  |
| receive_envelope | Receive Red Envelope |  | friend_id | Friend ID | string | Private chat only |  |
|  |  |  | group_id | Group Chat ID | string | Group chat only |  |
|  |  |  | money_num | Red Envelope Amount | number |  |  |
| give_gift | Give Gift | Report an asset consume event at the same time | gift_id | Gift ID | string |  |  |
|  |  |  | gift_num | Gift Count | number |  |  |
|  |  |  | friend_id | Friend ID | string |  |  |
| receive_gift | Receive Gift | Report an asset gain event at the same time | gift_id | Gift ID | string |  |  |
|  |  |  | gift_num | Gift Count | number |  |  |
|  |  |  | friend_id | Friend ID | string |  |  |
| send_voice_call | Initiate Voice Call |  | friend_id | Friend ID | string |  |  |
| voice_call_end | Voice Call End |  | friend_id | Friend ID | string |  |  |
|  |  |  | #duration | Interval Duration | number | Client uses SDK's TimeEvent to time / server needs to time it itself |  |
| send_vidio_call | Initiate Video Call |  | friend_id | Friend ID | string |  |  |
| vicdio_call_end | Video Call End |  | friend_id | Friend ID | string |  |  |
|  |  |  | #duration | Interval Duration | number | Client uses SDK's TimeEvent to time / server needs to time it itself |  |
| issue_note | Publish Post |  | note_id | Post ID | string |  |  |
|  |  |  | note_type | Post Type | string | Plain text/Image/Video, etc. |  |
|  |  |  | note_content | Post Content | string |  |  |
| send_heart | Send Heart |  | player_id | Player ID | string | Post publisher ID |  |
|  |  |  | note_id | Post ID | string |  |  |
|  |  |  | note_type | Post Type | string | Plain text/Image/Video, etc. |  |
|  |  |  | note_content | Post Content | string |  |  |
| send_gold | Send Coin | Report an asset consume event at the same time | player_id | Player ID | string | Post publisher ID |  |
|  |  |  | note_id | Post ID | string |  |  |
|  |  |  | note_type | Post Type | string | Plain text/Image/Video, etc. |  |
|  |  |  | note_content | Post Content | string |  |  |
| make_comment | Comment |  | player_id | Player ID | string | Post publisher ID |  |
|  |  |  | note_id | Post ID | string |  |  |
|  |  |  | note_type | Post Type | string | Plain text/Image/Video, etc. |  |
|  |  |  | note_content | Post Content | string |  |  |
|  |  |  | comment_content | Comment Content | string |  |  |
| face_complete | Face Customization Complete |  | face_info | Face Info | object | Example: {"face_type":"Oval face","eyes_type":"Phoenix eyes","eyes_color":"Blue",...} |  |
|  |  |  | face_info.face_type | Face Shape | string |  |  |
|  |  |  | face_info.eyes_type | Eye Shape | string |  |  |
|  |  |  | face_info.eyes_color | Eye Color | string |  |  |
|  |  |  | ...... |  |  |  |  |
| change_cloth | Change Outfit |  | before_cloth_info | Outfit Info Before Change | object array | Example: [{"cloth_id":"1","cloth_type":"Top"},{"cloth_id":"2","cloth_type":"Bottom"},...] |  |
|  |  |  | before_cloth_info.cloth_id | Outfit ID Before Change | string |  |  |
|  |  |  | before_cloth_info.cloth_type | Outfit Type Before Change | string |  |  |
|  |  |  | after_cloth_info | Outfit Info After Change | object array | Example: [{"cloth_id":"1","cloth_type":"Top"},{"cloth_id":"2","cloth_type":"Bottom"},...] |  |
|  |  |  | after_cloth_info.cloth_id | Outfit ID After Change | string |  |  |
|  |  |  | after_cloth_info.cloth_type | Outfit Type After Change | string |  |  |
| send_heart | Send Heart |  | player_id | Player ID | string | Contestant ID |  |
|  |  |  | theme_id | Theme ID | string |  |  |
| send_gold | Send Coin | Report an asset consume event at the same time | player_id | Player ID | string | Contestant ID |  |
|  |  |  | theme_id | Theme ID | string |  |  |
| give_score | Score |  | player_id | Player ID | string | Contestant ID |  |
|  |  |  | theme_id | Theme ID | string |  |  |
|  |  |  | score_num | Score | number |  |  |
| attend_match | Join Match |  | theme_id | Theme ID | string |  |  |
|  |  |  | match_cloth_info | Match Outfit Info | object array | Example: [{"cloth_id":"1","cloth_type":"Top"},{"cloth_id":"2","cloth_type":"Bottom"},...] |  |
|  |  |  | match_cloth_info.cloth_id | Match Outfit ID | string |  |  |
|  |  |  | match_cloth_info.cloth_type | Match Outfit Type | string |  |  |
| match_end | Match Settlement | Report an asset gain event at the same time | theme_id | Theme ID | string |  |  |
|  |  |  | match_cloth_info | Match Outfit Info | object array | Example: [{"cloth_id":"1","cloth_type":"Top"},{"cloth_id":"2","cloth_type":"Bottom"},...] |  |
|  |  |  | match_cloth_info.cloth_id | Match Outfit ID | string |  |  |
|  |  |  | match_cloth_info.cloth_type | Match Outfit Type | string |  |  |
|  |  |  | match_score | Score Earned | number |  |  |
|  |  |  | match_rank | This Match's Rank | number |  |  |
| enter_page | Enter Page |  | enter_page_id | Target Page ID | string | VIP page, etc. |  |
| back_button_click | Back Button Click |  | #duration | Interval Duration | number | Client uses SDK's TimeEvent to time / server needs to time it itself |  |
| share_page | Share Page |  |  |  |  |  |  |
| task_complete | Complete Task | Report an asset gain event at the same time | task_id | Task ID | string |  |  |
| sign_complete | Complete Check-in |  | sign_days | Check-in Days | number |  |  |
| award_get | Claim Reward |  | award_id | Reward ID | string | IDs of various rewards, such as online reward/achievement reward/first-recharge reward/cumulative recharge reward, etc. |  |
| cost | User Acquisition Cost | Imported from third-party platform | #event_id | #Event ID | string | *Use updatable event*/update order status; id is tied to the order number to avoid anomalies |  |
|  |  |  | media_source | Ad Channel | text |  |  |
|  |  |  | campaign | Ad Campaign | text |  |  |
|  |  |  | ad_group | Ad Group | text |  |  |
|  |  |  | ad_id | Ad ID | text |  |  |
|  |  |  | ad_type | Ad Type | text |  |  |
|  |  |  | total_cost | User Acquisition Amount | number | Unit: Yuan |  |
|  |  |  | impressions | Impressions | number |  |  |
|  |  |  | clicks | Clicks | number |  |  |
|  |  |  | installs | Installs | number |  |  |
| ad_request | Ad Request | Triggered on ad request |  | ad_platform | Ad Platform | string | e.g., Pangle, YouLiangHui, Kuaishou |
|  |  |  |  | ad_id | Third-party Ad ID | string | e.g., 945816492 |
|  |  |  |  | ad_type | Ad Type | string | e.g., Fullscreen video, rewarded video, interstitial |
|  |  |  |  | ad_placement_name | Internal Ad Placement Name | string | e.g., home_feed |
|  |  |  |  | ad_placement_id | Internal Ad Placement ID | string | In-app physical ad placement ID |
|  |  |  |  | current_page | Current Page | string | In-app physical ad placement name, such as: phone boosting, phone boost result page, returning from phone boost result page, etc. |
|  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
| ad_response | Ad Response (Fill) | Triggered when the ad request returns |  | ad_platform | Ad Platform | string | e.g., Pangle, YouLiangHui, Kuaishou |
|  |  |  |  | ad_id | Third-party Ad ID | string | e.g., 945816492 |
|  |  |  |  | ad_type | Ad Type | string | e.g., Fullscreen video, rewarded video, interstitial |
|  |  |  |  | ad_placement_name | Internal Ad Placement Name | string | e.g., home_feed |
|  |  |  |  | ad_placement_id | Internal Ad Placement ID | string | In-app physical ad placement ID |
|  |  |  |  | current_page | Current Page | string | In-app physical ad placement name, such as: phone boosting, phone boost result page, returning from phone boost result page, etc. |
|  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  |  |  |  | is_filled_success | Is Filled Successfully | bool |  |
|  |  |  |  | error_detail_info | Ad Error Info | string | Error info returned from the third-party platform ad fill |
|  |  |  |  | error_detail_code | Ad Error Code | string | Error code returned from the third-party platform ad fill |
| ad_show | Ad Impression | Triggered when an ad is shown, e.g.: ad shown successfully = fill success & show success; ad shown failed = fill success & show failure, or fill failure & show failure |  | ad_platform | Ad Platform | string | e.g., Pangle, YouLiangHui, Kuaishou |
|  |  |  |  | ad_id | Third-party Ad ID | string | e.g., 945816492 |
|  |  |  |  | ad_type | Ad Type | string | e.g., Fullscreen video, rewarded video, interstitial |
|  |  |  |  | ad_placement_name | Internal Ad Placement Name | string | e.g., home_feed |
|  |  |  |  | ad_placement_id | Internal Ad Placement ID | string | In-app physical ad placement ID |
|  |  |  |  | current_page | Current Page | string | In-app physical ad placement name, such as: phone boosting, phone boost result page, returning from phone boost result page, etc. |
|  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  |  |  |  | ad_app_name | Advertiser Info | string | Advertiser info: the specific ad brand; if not obtainable, use "unknown" |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be captured, triggered when the ad platform returns click info |  | ad_platform | Ad Platform | string | e.g., Pangle, YouLiangHui, Kuaishou |
|  |  |  |  | ad_id | Third-party Ad ID | string | e.g., 945816492 |
|  |  |  |  | ad_type | Ad Type | string | e.g., Fullscreen video, rewarded video, interstitial |
|  |  |  |  | ad_placement_name | Internal Ad Placement Name | string | e.g., home_feed |
|  |  |  |  | ad_placement_id | Internal Ad Placement ID | string | In-app physical ad placement ID |
|  |  |  |  | current_page | Current Page | string | In-app physical ad placement name, such as: phone boosting, phone boost result page, returning from phone boost result page, etc. |
|  |  |  |  | ad_app_name | Advertiser Info | string | Advertiser info: the specific ad brand; if not obtainable, use "unknown" |
|  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
| ad_close | Ad Close | Triggered on ad close |  | ad_platform | Ad Platform | string | e.g., Pangle, YouLiangHui, Kuaishou |
|  |  |  |  | ad_id | Third-party Ad ID | string | e.g., 945816492 |
|  |  |  |  | ad_type | Ad Type | string | e.g., Fullscreen video, rewarded video, interstitial |
|  |  |  |  | ad_placement_name | Internal Ad Placement Name | string | e.g., home_feed |
|  |  |  |  | ad_placement_id | Internal Ad Placement ID | string | In-app physical ad placement ID |
|  |  |  |  | current_page | Current Page | string | In-app physical ad placement name, such as: phone boosting, phone boost result page, returning from phone boost result page, etc. |
|  |  |  |  | ad_app_name | Advertiser Info | string | Advertiser info: the specific ad brand; if not obtainable, use "unknown" |
|  |  |  |  | ad_ecpm | Ad eCPM | number | Price from third-party ad platform waterfall/bidding |
|  |  |  |  | ad_duration | Ad Duration | number | The total duration of this ad |
|  |  |  |  | ad_play_duration | Ad Watch Duration | number | The actual watch duration of this ad |
|  |  |  |  | is_complete_play | Is Fully Played | bool | Whether this ad was fully watched |
| rank | Leaderboard | #account_id reports a custom value that does not conflict with players; clear common properties before reporting | rank_type | Leaderboard Type | string | e.g., level/online duration, etc. |  |
|  |  |  | rank_info | Rank Info | object array |  |  |
|  |  |  | rank_info.id | Player ID | string |  |  |
|  |  |  | rank_info.rank | Rank | number |  |  |
|  |  |  | rank_info.grades | Score | number |  |  |
| current_onlines | Online Users | #account_id reports a custom value that does not conflict with players; clear common properties before reporting | channel | Source Channel | string |  |  |
|  |  |  | platform | Platform | string | iOS/Android |  |
|  |  |  | ... | Other Dimensions | string |  |  |
|  |  |  | online_user | Online Users | number | Online users count |  |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- |
| #device_id | Device ID | string | Device ID or device-related ID, such as uuid/android_id/idfv, etc. |
| #os | OS | string | iOS/Android |
| #os_version | OS Version | string | e.g., Android OS 9 |
| #app_version | App Version | string | Client app version |
| Add as needed; see the SDK integration docs for details |  |  | https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu.html |
| nick_name | Account Nickname | string |  |
| level | Account Level | number | Player's level at the time of the event |
| vip_level | VIP Level | number | Player's VIP level at the time of the event |
| vip_left_time | VIP Time Left | number | Player's remaining VIP duration at the time of the event |
| tmp_gold | Coin Amount | number | Player's cheese amount at the time of the event |
| tmp_diamond | Diamond Amount | number | Player's diamond amount at the time of the event |
| ... | ... | ... | Amount of other resources at the time of the event (add as needed) |
| page_id | Page ID | string | The page the player is on at the time of the event |
| sub_page_id | Sub-Page ID | string | The sub-page the player is on at the time of the event |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description |
| --- | --- | --- | --- | --- |
| channel | Source Channel | string | user_setOnce | Reported on register |
| current_level | Level | number | user_set | Reported when player is detected to exit the game |
| current_vip_level | VIP Level | number | user_set | Reported when player is detected to exit the game |
| ranking | Current Rank | number | user_set | Reported when player is detected to exit the game |
| head_id | Avatar ID | string | user_set | Reported when player is detected to exit the game |
| nick_name | Username | string | user_set | Reported when player is detected to exit the game |
| birthday | Birthday | time | user_set | Reported when player is detected to exit the game |
| sex | Gender | string | user_set | Reported when player is detected to exit the game |
| age | Age | number | user_set | Reported when player is detected to exit the game |
| phone_number | Phone Number | string | user_set | Reported when player is detected to exit the game |
| register_time | Registration Time | time | user_setOnce | Reported on register |
| first_login_time | First Login Time | time | user_setOnce | Reported on login |
| last_login_time | Last Login Time | time | user_set | Reported on login |
| first_pay_time | First Payment Time | time | user_setOnce | Reported on successful payment |
| total_login_day | Cumulative Login Days | number | user_add | Reported on each day's first login |
| total_pay_amount | Cumulative Payment Amount | number | user_add | Reported after payment (unit: Yuan) |
| asset_left | Asset Balance | object array | user_set | Reported when player is detected to exit the game |
