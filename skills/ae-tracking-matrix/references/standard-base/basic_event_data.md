# Standard Base - Basic Event Data

> Source: Feishu sheets `M71zsVFKihDEKXtZJjZcOkAvn5b` / sheet "Basic Event Data", cached on 2026-09-20. The cloud copy is the authoritative version; the cloud takes precedence on conflict.

| Event Name (Required) | Event Display Name | Event Description | Event Tag | Property Name (Required) | Property Display Name | Property Type (Required) | Property Description |
|---|---|---|---|---|---|---|---|
| ta_app_install | APP Install | Automatically collected by client-side SDK | Android |  |  |  |  |
| ta_app_start | APP Start | Automatically collected by client-side SDK | Android |  |  |  |  |
| ta_app_end | APP Close | Automatically collected by client-side SDK | Android | #duration | Online Duration | Number |  |
| ta_app_crash | APP Crash | Automatically collected by client-side SDK | Android |  |  |  |  |
| ta_mp_launch | Mini Program Initialization | Automatically collected by client-side SDK | uni-app |  |  |  |  |
| ta_mp_show | Mini Program Start | Automatically collected by client-side SDK | uni-app |  |  |  |  |
| ta_mp_hide | Mini Program Hide | Automatically collected by client-side SDK | uni-app |  |  |  |  |
| ta_mp_view | Mini Program Page View | Automatically collected by client-side SDK | uni-app |  |  |  |  |
| ta_mp_share | Mini Program Page Forward and Share | Automatically collected by client-side SDK | uni-app |  |  |  |  |
| new_device | New Device | Reported via first-time event when the device first starts | Basic Event | device_active_time | Device Activation Time | Datetime | First-time event; see https://doc.thinkingdata.cn/ta-manual/latest/installation/advanced_data_type/first_check_id.html#%E9%A6%96%E6%AC%A1%E4%BA%8B%E4%BB%B6%E6%A0%A1%E9%AA%8C for details |
| acc_register | Account Registration | Triggered on account registration | Basic Event | register_type | Registration Method | Text | Phone number / one-click registration / email, etc. |
| acc_login | Account Login | Triggered on account login | Basic Event | last_login_time | Last Login Time | Datetime |  |
| acc_login | Account Login | Triggered on account login | Basic Event | this_offline_time | This Offline Duration (s) | Number |  |
| acc_login | Account Login | Triggered on account login | Basic Event | continuous_login_day | Continuous Login Days | Number |  |
| acc_login | Account Login | Triggered on account login | Basic Event | total_login_day | Total Login Days | Number |  |
| acc_logout | Account Logout | Triggered on account logout | Basic Event | last_logout_time | Last Logout Time | Datetime |  |
| acc_logout | Account Logout | Triggered on account logout | Basic Event | this_online_time | This Online Duration (s) | Number |  |
| role_create | Create Role | Triggered on role creation | Basic Event | is_roll | Is Server-Rolling | Boolean |  |
| role_login | Role Login | Recorded on role login | Basic Event | last_login_time | Last Login Time | Datetime |  |
| role_login | Role Login | Recorded on role login | Basic Event | this_offline_time | This Offline Duration (s) | Number |  |
| role_login | Role Login | Recorded on role login | Basic Event | continuous_login_day | Continuous Login Days | Number |  |
| role_login | Role Login | Recorded on role login | Basic Event | total_login_day | Total Login Days | Number |  |
| role_logout | Role Logout | Recorded on role logout | Basic Event | last_logout_time | Last Logout Time | Datetime |  |
| role_logout | Role Logout | Recorded on role logout | Basic Event | this_online_time | This Online Duration (s) | Number |  |
| level_up | Level Up | Reported when the player/role levels up | Basic Event | level | Level After Leveling Up | Number |  |
| vip_levelup | VIP Level Up | Reported when VIP levels up | Basic Event | vip_level | VIP Level After Leveling Up | Number |  |
| pass_activate | Battle Pass Activation | Reported when the battle pass is activated | Basic Event | pass_id | Battle Pass ID | Text |  |
| guide_complete | Complete Tutorial | Reported when each tutorial step is completed | Basic Event | guide_id | Tutorial Category | Text |  |
| guide_complete | Complete Tutorial | Reported when each tutorial step is completed | Basic Event | guide_step | Tutorial Step | Number |  |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | order_id | Order ID | Text | Payment order ID (unique) |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | click_position | Click Position | Text | Which button or page the order was placed from |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | currency_type | Currency Type | Text | Must comply with ISO 4217 (e.g., CNY, USD, EUR); be careful during tracking |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | pay_amount | Payment Amount | Number |  |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | payment_id | Payment Item ID | Number | ID corresponding to monthly card, weekly card, diamonds, etc. |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | payment_name | Payment Item Name | Text | Monthly card, weekly card, diamonds, etc. |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | pay_method | Payment Method | Text | WeChat, Alipay, PayPal, etc. |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | is_first | Is First Time | Boolean | true/false |
| payment_submit | Submit Payment Order | Triggered when a payment is initiated | Payment and Cost | get_item_detail | Obtained Item Details | ObjectGroup | [{item_id:1001,item_name:"Diamond",item_num:60},{..}..] |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | order_id | Order ID | Text | Payment order ID (unique) |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | click_position | Click Position | Text | Which button or page the order was placed from |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | currency_type | Currency Type | Text | Must comply with ISO 4217 (e.g., CNY, USD, EUR); be careful during tracking |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | pay_amount | Payment Amount | Number |  |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | payment_id | Payment Item ID | Number | ID corresponding to monthly card, weekly card, diamonds, etc. |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | payment_name | Payment Item Name | Text | Monthly card, weekly card, diamonds, etc. |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | pay_method | Payment Method | Text | WeChat, Alipay, PayPal, etc. |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | is_first | Is First Time | Boolean | true/false |
| pay_success | Payment Success | Triggered on successful payment | Payment and Cost | get_item_detail | Obtained Item Details | ObjectGroup | [{item_id:1001,item_name:"Diamond",item_num:60},{..}..] |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | order_id | Order ID | Text | Payment order ID (unique) |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | click_position | Click Position | Text | Which button or page the order was placed from |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | currency_type | Currency Type | Text | Must comply with ISO 4217 (e.g., CNY, USD, EUR); be careful during tracking |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | pay_amount | Payment Amount | Number |  |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | payment_id | Payment Item ID | Number | ID corresponding to monthly card, weekly card, diamonds, etc. |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | payment_name | Payment Item Name | Text | Monthly card, weekly card, diamonds, etc. |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | pay_method | Payment Method | Text | WeChat, Alipay, PayPal, etc. |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | is_first | Is First Time | Boolean | true/false |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | get_item_detail | Obtained Item Details | ObjectGroup | [{item_id:1001,item_name:"Diamond",item_num:60},{..}..] |
| pay_fail | Payment Failure | Triggered on failed payment | Payment and Cost | fail_reason | Failure Reason | Text |  |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | change_type | Change Type | Text | Battle victory, etc. |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | change_reason | Change Reason | Text | Battle victory, etc. |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | change_detail | Change Detail | Text |  |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | resource_info | Resource Information | ObjectGroup | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | resource_info.item_id | Item ID | Text | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | resource_info.item_type | Item Type | Text | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | resource_info.change_num | Change Amount | Number | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_change | Resource Change | Triggered when resources change<br>(For important token resources / item changes, record each item as a separate event; gain and consumption can also be split into two separate events. Avoid making a single event too large and hurting query performance.) | Resource Change | resource_info.after_num | Amount After Change | Number | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_get | Resource Gain | Reported when resources / currency / items are obtained<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | change_reason | Change Reason | Text | Battle victory, etc. |
| resource_get | Resource Gain | Reported when resources / currency / items are obtained<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | change_detail | Change Detail | Text |  |
| resource_get | Resource Gain | Reported when resources / currency / items are obtained<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info | Resource Information | ObjectGroup | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_get | Resource Gain | Reported when resources / currency / items are obtained<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.item_id | Item ID | Text | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_get | Resource Gain | Reported when resources / currency / items are obtained<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.item_type | Item Type | Text | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_get | Resource Gain | Reported when resources / currency / items are obtained<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.change_num | Change Amount | Number | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_get | Resource Gain | Reported when resources / currency / items are obtained<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.after_num | Amount After Change | Number | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_cost | Resource Consumption | Reported when resources / currency / items are consumed<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | change_reason | Change Reason | Text | Hero upgrade, etc. |
| resource_cost | Resource Consumption | Reported when resources / currency / items are consumed<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | change_detail | Change Detail | Text |  |
| resource_cost | Resource Consumption | Reported when resources / currency / items are consumed<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info | Resource Information | ObjectGroup | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_cost | Resource Consumption | Reported when resources / currency / items are consumed<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.item_id | Item ID | Text | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_cost | Resource Consumption | Reported when resources / currency / items are consumed<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.item_type | Item Type | Text | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_cost | Resource Consumption | Reported when resources / currency / items are consumed<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.change_num | Change Amount | Number | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| resource_cost | Resource Consumption | Reported when resources / currency / items are consumed<br>----------------------<br>Tip:<br>Important currencies can be reported as independent events<br>Currencies and items can be split into independent events | Resource Change | resource_info.after_num | Amount After Change | Number | Example:<br>"resource_info":<br>[<br>{"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"},<br>{"item_id":"5","item_type":"2","change_num":10,"after_num":"70"}<br>] |
| open_shop | Open Shop | Reported when the shop is opened | Shop | shop_id | Shop ID | Text |  |
| open_shop | Open Shop | Reported when the shop is opened | Shop | click_position | Click Position | Text | Which button or page the shop was opened from |
| shop_refresh | Shop Refresh | Reported when the shop is refreshed | Shop | shop_id | Shop ID | Text |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | cost_type | Cost Currency ID | Text |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | cost_num | Cost Amount | Number |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | shop_id | Shop ID | Text |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | shop_type | Shop Type | Text |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | item_id | Item ID | Text |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | item_num | Item Quantity | Number |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | item_price | Item Price | Number |  |
| shop_buy | Buy Item | Triggered when an item is purchased | Shop | item_name | Item Name | Text |  |
| task_start | Task Start | Reported on task start | Task Start | task_id | Task ID | Text |  |
| task_start | Task Start | Reported on task start | Task Start | task_type | Task Type | Text |  |
| task_completed | Complete Task | Triggered when task completion is clicked to claim | Task Module | task_type | Task Type | Text | Daily, challenge, achievement, weekly, etc. |
| task_completed | Complete Task | Triggered when task completion is clicked to claim | Task Module | task_id | Task ID | Text |  |
| task_completed | Complete Task | Triggered when task completion is clicked to claim | Task Module | task_name | Task Name | Text |  |
| task_completed | Complete Task | Triggered when task completion is clicked to claim | Task Module | get_items | Obtained Items | ObjectGroup |  |
| activity_box | Activity Chest | Triggered when claiming daily task - activity chest | Task Module | active_score | Activity Score | Number |  |
| activity_box | Activity Chest | Triggered when claiming daily task - activity chest | Task Module | get_item_detail | Obtained Item Details | ObjectGroup |  |
| activity_attend | Participate in Activity | Reported when participating in an activity | Benefit Activity | activity_id | Activity ID | Text |  |
| activity_attend | Participate in Activity | Reported when participating in an activity | Benefit Activity | activity_type | Activity Type | Text | New-player activity / daily activity / weekly activity / festival activity, etc. |
| sign_in | Daily Sign-in | Triggered when sign-in is clicked | Benefit Activity | sign_type | Sign-in Type | Text | 7-day sign-in |
| sign_in | Daily Sign-in | Triggered when sign-in is clicked | Benefit Activity | sign_day | Sign-in Days | Number | Which day of sign-in / completion |
| sign_in | Daily Sign-in | Triggered when sign-in is clicked | Benefit Activity | get_item_detail | Obtained Item Details | ObjectGroup |  |
| get_mail | Mail Claim | Triggered when claim is clicked | Mail Module | mail_message | Mail Information | ObjectGroup |  |
| get_mail | Mail Claim | Triggered when claim is clicked | Mail Module | mail_message.message_id | Mail ID | Text |  |
| get_mail | Mail Claim | Triggered when claim is clicked | Mail Module | mail_message.sender_item | Attached Items | Text |  |
| delete_mail | Mail Delete | Triggered when delete is clicked | Mail Module | message_id | Deleted Mail ID | Text |  |
| ad_request | Ad Request | Triggered on ad request | Ad Monetization Module | ad_platform | Ad Platform | Text | e.g., Pangle, Youlianghui, Kuaishou |
| ad_request | Ad Request | Triggered on ad request | Ad Monetization Module | ad_id | Third-Party Ad ID | Text | e.g., 945816492 |
| ad_request | Ad Request | Triggered on ad request | Ad Monetization Module | ad_type | Ad Type | Text | e.g., full-screen video, rewarded video, interstitial |
| ad_request | Ad Request | Triggered on ad request | Ad Monetization Module | ad_placement_name | Internal Ad Placement Name | Text | e.g., home_feed |
| ad_request | Ad Request | Triggered on ad request | Ad Monetization Module | ad_placement_id | Internal Ad Placement ID | Text | Physical ad placement ID inside the app |
| ad_request | Ad Request | Triggered on ad request | Ad Monetization Module | current_page | Current Page | Text | Physical ad placement name inside the app, e.g., Phone Accelerating, Phone Accelerate Result Page, Return from Phone Accelerate Result Page, etc. |
| ad_request | Ad Request | Triggered on ad request | Ad Monetization Module | ad_ecpm | Ad eCPM | Number | Price from third-party ad platform waterfall/bidding |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | ad_platform | Ad Platform | Text | e.g., Pangle, Youlianghui, Kuaishou |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | ad_id | Third-Party Ad ID | Text | e.g., 945816492 |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | ad_type | Ad Type | Text | e.g., full-screen video, rewarded video, interstitial |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | ad_placement_name | Internal Ad Placement Name | Text | e.g., home_feed |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | ad_placement_id | Internal Ad Placement ID | Text | Physical ad placement ID inside the app |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | current_page | Current Page | Text | Physical ad placement name inside the app, e.g., Phone Accelerating, Phone Accelerate Result Page, Return from Phone Accelerate Result Page, etc. |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | ad_ecpm | Ad eCPM | Number | Price from third-party ad platform waterfall/bidding |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | is_filled_success | Is Filled Successfully | Boolean |  |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | error_detail_info | Ad Error Information | Text | Error information returned by third-party platform ad fill |
| ad_response | Ad Response (Fill) | Triggered after an ad request returns | Ad Monetization Module | error_detail_code | Ad Error Code | Text | Error code returned by third-party platform ad fill |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | ad_platform | Ad Platform | Text | e.g., Pangle, Youlianghui, Kuaishou |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | ad_id | Third-Party Ad ID | Text | e.g., 945816492 |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | ad_type | Ad Type | Text | e.g., full-screen video, rewarded video, interstitial |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | ad_placement_name | Internal Ad Placement Name | Text | e.g., home_feed |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | ad_placement_id | Internal Ad Placement ID | Text | Physical ad placement ID inside the app |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | current_page | Current Page | Text | Physical ad placement name inside the app, e.g., Phone Accelerating, Phone Accelerate Result Page, Return from Phone Accelerate Result Page, etc. |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | ad_ecpm | Ad eCPM | Number | Price from third-party ad platform waterfall/bidding |
| ad_show | Ad Show | Triggered when an ad is shown, e.g.:<br>Ad shown successfully means: filled successfully & shown successfully<br>Ad show failed means: filled successfully & show failed, or fill failed & show failed | Ad Monetization Module | ad_app_name | Advertiser Information | Text | Advertiser information: specific ad brand; if unavailable, take "unknown" |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | ad_platform | Ad Platform | Text | e.g., Pangle, Youlianghui, Kuaishou |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | ad_id | Third-Party Ad ID | Text | e.g., 945816492 |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | ad_type | Ad Type | Text | e.g., full-screen video, rewarded video, interstitial |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | ad_placement_name | Internal Ad Placement Name | Text | e.g., home_feed |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | ad_placement_id | Internal Ad Placement ID | Text | Physical ad placement ID inside the app |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | current_page | Current Page | Text | Physical ad placement name inside the app, e.g., Phone Accelerating, Phone Accelerate Result Page, Return from Phone Accelerate Result Page, etc. |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | ad_app_name | Advertiser Information | Text | Advertiser information: specific ad brand; if unavailable, take "unknown" |
| ad_click | Ad Click | Triggered on ad click; if the click cannot be obtained from the ad, triggered when the ad platform returns click information | Ad Monetization Module | ad_ecpm | Ad eCPM | Number | Price from third-party ad platform waterfall/bidding |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_platform | Ad Platform | Text | e.g., Pangle, Youlianghui, Kuaishou |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_id | Third-Party Ad ID | Text | e.g., 945816492 |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_type | Ad Type | Text | e.g., full-screen video, rewarded video, interstitial |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_placement_name | Internal Ad Placement Name | Text | e.g., home_feed |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_placement_id | Internal Ad Placement ID | Text | Physical ad placement ID inside the app |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | current_page | Current Page | Text | Physical ad placement name inside the app, e.g., Phone Accelerating, Phone Accelerate Result Page, Return from Phone Accelerate Result Page, etc. |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_app_name | Advertiser Information | Text | Advertiser information: specific ad brand; if unavailable, take "unknown" |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_ecpm | Ad eCPM | Number | Price from third-party ad platform waterfall/bidding |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_duration | Ad Duration | Number | Total duration of this ad |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | ad_play_duration | Ad Watch Duration | Number | Actual watch duration of this ad |
| ad_close | Ad Close | Triggered when the ad is closed | Ad Monetization Module | is_complete_play | Is Complete Play | Boolean | Whether the ad was fully watched |
| The following events need to be reported with a separately bound #account_id, which can be virtual, e.g., 0000000; be careful not to conflict with real #account_id |  |  |  |  |  |  |  |
| rank | rank | rank | rank | rank | rank | rank | rank |
|  |  |  |  | rank_info | Ranking Information | ObjectGroup | Example:<br>"rank_info":<br>[<br>{"id":"1000125","rank":1,"score":12000},{"id":"1000236","rank":2,"score":11005}<br>] |
|  |  |  |  | rank_info.id | Player ID | Text |  |
|  |  |  |  | rank_info.rank | Rank | Number |  |
|  |  |  |  | rank_info.score | Score | Number |  |
|  |  |  |  | server_id | Server ID | Text |  |
|  |  |  |  | platform | Platform | Text | iOS / Android |
|  |  |  |  | online_user | Online Users | Number | Online users |
|  |  |  |  | channel | Channel | Text | Determine property field based on actual situation; break down by dimension |
|  |  |  |  | campaign | campaign | Text |  |
|  |  |  |  | source | source | Text |  |
|  |  |  |  | platform | Ad Platform | Text |  |
|  |  |  |  | creative | Ad Creative | Text |  |
|  |  |  |  | cost | Cost | Number |  |
|  |  |  |  | platform | Platform | Text | Distinguish revenue per platform; determine property field based on actual situation; break down by dimension |
|  |  |  |  | income | Revenue | Number |  |
