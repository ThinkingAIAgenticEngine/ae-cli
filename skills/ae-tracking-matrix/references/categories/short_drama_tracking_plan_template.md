# Short Drama Product Tracking Plan


## #User ID System

| Product Type | Property Name | Property Display Name | Property Description | Assignment Description | Notes |
| --- | --- | --- | --- | --- | --- |
| Single account | #account_id | Account ID | System property | Set to the user's unique account ID | Choose this plan |
|  | #distinct_id | Anonymous Visitor ID | System property | Device-related ID or visitor ID within the business; if using ThinkingData client SDK, auto-generation can be selected |  |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- |
| user_register_time | Registration Time | time | Registration time; pass current time if not available |
| app_user_first_open_timestamp | First Launch Time | time | Time when the user first opened the application in the current version |
| is_overlap_user | Is Repeat User | bool | Pass true if the first login time is more than 1 day later than the registration time (defined as a repeat user), otherwise pass false |
| media_source | Media Channel | text | Attribution platform; pass empty if not available, pass the middle platform's srcplat according to the attribution result; for non-promotion source users, pass organic |
| first_cpm | First CPM | number | eCPM value of the user's first incentive video, unit: cents; pass -1 if not obtained |
| tag1 | User Value | text | User value group; pass the corresponding tag, see user grouping requirements for details |
| is_adb_enabled | Is ADB Enabled | bool | Whether ADB is enabled |
| is_vpn_enabled | Is VPN Enabled | bool | Whether VPN is enabled |
| active_days | Active Days | number | Which natural day the user is on; event time - registration time; cross-day errors allowed; pass -1 if abnormal |
| version_active_days | Active Days in Current Version | number | Which natural day the user is on in the current version; event time - app_user_first_open_timestamp |


## #Event Data

| Event Name | Event Display Name | Event Description | Event Tag | Property Name | Property Display Name | Property Type | Property Description |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install | Automatically reported after enabling client auto-collection |  |  |  |  | Auto-collected event, see official documentation; if common event properties need to be set or a custom visitor ID needs to be set, be sure to call setSuperProperties() or identify() before enabling auto-collection  https://docs.thinkingdata.cn/ta-manual/v3.6/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_autotrack.html#%E4%B8%80%E3%80%81%E8%87%AA%E5%8A%A8%E9%87%87%E9%9B%86%E4%BB%8B%E7%BB%8D |  |  |  |  |  |  |  |  |  |  |  |  |
| ta_app_start | App Launch | Automatically reported after enabling client auto-collection |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| ta_app_crash | App Crash | Automatically reported after enabling client auto-collection |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| ta_app_end | App Close | Automatically reported after enabling client auto-collection |  | #duration | Event Duration | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| cold_start | Process Launch | Reported when the process is launched fresh | Login |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| loginpage_show | Login Page Impression | Reported when the login page is displayed | Login |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| loginpage_privacy_click | Agreement Click | User clicks the service agreement and privacy terms in the login page agreement popup | Login |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| loginpage_click | Login Click | Click the login button | Login |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| loginpage_login_success | Login Success | Reported when login is successful and game resource loading begins | Login |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| loadingpage_end | Loading End | Reported when loading ends and the main page is entered | Login | #duration | Event Duration | number | Call method: https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_advanced/android_sdk_advanced.html#_2-6-%E8%AE%B0%E5%BD%95%E4%BA%8B%E4%BB%B6%E6%97%B6%E9%95%BF |  |  |  |  |  |  |  |  |  |  |  |  |
| new_user_reward_show | New User Reward Popup Impression | New user reward popup appears |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| new_user_reward_receive | New User Reward Claim | Reported when the new user reward is successfully claimed |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| playlet_start | Short Drama Playback Start | Reported when short drama playback starts |  | playlet_name |  | text | Short drama name |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_label |  | text | Short drama label |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_num |  | number | Short drama episode number |  |  |  |  |  |  |  |  |  |  |  |  |
| playlet_label_click | Short Drama Label Click | Reported when short drama label is clicked |  | playlet_label |  | text | Short drama's label name |  |  |  |  |  |  |  |  |  |  |  |  |
| playlet_end | Short Drama Playback End | Short drama playback ends, switches, or exits |  | playlet_name |  | text | Short drama name |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_num |  | number | Short drama episode number |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_time |  | number | Actual duration of the short drama, unit: s |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | play_time |  | number | Playback duration/s, playback end - playback start |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_label |  | text | Short drama label |  |  |  |  |  |  |  |  |  |  |  |  |
| playlet_actual_end | Short Drama 80% Played | Reported when 80% of an episode of the short drama has been played |  | playlet_name |  | text | Short drama name |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_num |  | number | Short drama episode number |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_time |  | number | Actual duration of the short drama, unit: s |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | play_time |  | number | Playback duration/s, playback end - playback start |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_balel |  | text | Short drama label |  |  |  |  |  |  |  |  |  |  |  |  |
| coin_receive | Receive Fake Line Amount | Reported when a fake line amount is received |  | reward_source |  | text | Reward source: {circle_redpackage: spinning red packet, unlock_playlet: unlock episode, new_user_reward: new user reward, daily_task: daily task} |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | coin_num |  | number | Reward amount, actual amount received in the app |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | coin_receive_befor |  | number | Cash amount before receiving the reward |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | con_receive_after |  | number | Cash amount after receiving the reward |  |  |  |  |  |  |  |  |  |  |  |  |
| exp_receive | Experience Change | Reported when experience changes |  | reward_source |  | text | Reward source: {circle_redpackage: spinning red packet free reward, unlock_playlet: unlock episode, exp_task: level-up task experience reward, daily_task: daily task} |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | exp_num |  | number | Experience value of the reward |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | exp_receive_befor |  | number | Cumulative experience value before gaining experience |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | exp_receive_after |  | number | Cumulative experience value after gaining experience |  |  |  |  |  |  |  |  |  |  |  |  |
| lottery_show | Lottery Wheel Impression | Reported when the lottery wheel is displayed |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| lottery_draw | Lottery Result | Reported when the lottery is drawn and a result is produced |  | daily_times |  | number | Which draw of today |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | reward_type |  | text | Reward type: {real: real line reward, fake: fake line reward, exp: experience} |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | reward_num |  | number | Reward value |  |  |  |  |  |  |  |  |  |  |  |  |
| reward_alert_show | Ad Popup Impression | Reported when the ad popup appears |  | ad_source |  | text | {circle_redpackage: spinning red packet, unlock_playlet: unlock episode} |  |  |  |  |  |  |  |  |  |  |  |  |
| reward_alert_click | Ad Reward Claim | Reported when the reward is clicked to be claimed; needs deduplication |  | ad_source |  | text | {circle_redpackage: spinning red packet, unlock_playlet: unlock episode} |  |  |  |  |  |  |  |  |  |  |  |  |
| reward_alert_cancel | Ad Popup Close | Reported when the close popup is clicked |  | ad_source |  | text | {circle_redpackage: spinning red packet, unlock_playlet: unlock episode} |  |  |  |  |  |  |  |  |  |  |  |  |
| withdraw_page_show | Withdrawal Popup Impression | Reported when the withdrawal popup is displayed |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| select_set_alert_show | Episode Selection Click | Click episode selection, episode selection popup appears |  | playlet_name |  | text | Short drama name |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_balel |  | text | Short drama label |  |  |  |  |  |  |  |  |  |  |  |  |
| withdraw_apply | Withdrawal Success | Reported when the withdrawal is successful |  | withdraw_type |  | text | {real: fake withdrawal, fake: real withdrawal} |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | lifetimes_count |  | number | Number of withdrawals within the user's lifetime, uses data returned by the server; since the interface is asynchronous, the actual report may be less than the true value |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | withdraw_value |  | number | Withdrawal amount |  |  |  |  |  |  |  |  |  |  |  |  |
| discovery_page_show | Discovery Page Impression | Reported when the discovery page is displayed |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| discovery_page_exchange | Discovery Page Switch | Reported when the discovery page is switched up or down |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| discovery_page_apply | Discovery Page Click Follow Drama | Reported when entering the playback page after clicking the follow drama button on the discovery page |  | playlet_name |  | text | Short drama name |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | playlet_balel |  | text | Short drama label |  |  |  |  |  |  |  |  |  |  |  |  |
| shortvideo_page_show | Short Video Tab Impression | Reported when the short video tab is displayed |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| task_page_show | Daily Task Page Impression | Reported when the daily task page is displayed |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| task_reward | Daily Task Claim Reward | Reported when the daily task reward popup appears |  | task_id |  | text | Task ID |  |  |  |  |  |  |  |  |  |  |  |  |
| rewardad_chance | Start Requesting Incentive Video | When starting to request incentive video |  | ad_source |  | text | {circle_redpackage: spinning red packet, unlock_playlet: unlock episode, daily_task: daily task} |  |  |  |  |  |  |  |  |  |  |  |  |
| rewardad_show | RV Playback Start | Reported when RV playback starts |  | ad_source |  | text | {circle_redpackage: spinning red packet, unlock_playlet: unlock episode, daily_task: daily task} |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | ecpm |  | number | Value per thousand impressions, unit: cents |  |  |  |  |  |  |  |  |  |  |  |  |
| rewardad_click | RV Playback Click Download | Reported when download is clicked during RV playback; deduplication |  | ad_source |  | text | {circle_redpackage: spinning red packet, unlock_playlet: unlock episode, daily_task: daily task} |  |  |  |  |  |  |  |  |  |  |  |  |
| rewardad_reward | RV Playback Success | RV playback success, callback |  | ad_source |  | text | {circle_redpackage: spinning red packet, unlock_playlet: unlock episode, new_user_reward: new user reward, sign_reward: check-in reward, withdraw: withdrawal ad} |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | reward_ecpm |  | number | Value per thousand impressions, unit: cents |  |  |  |  |  |  |  |  |  |  |  |  |
| interstitialad_chance | Interstitial Ad Request | Reported when the interstitial ad is requested; deduplication |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| interstitialad_show | Interstitial Ad Impression | Reported when the interstitial ad is displayed |  | ecpm |  | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| interstitialad_click | Interstitial Ad Click | Interstitial ad click report; deduplication |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| splashad_chance | Splash Request | Splash request report; deduplication |  | splashad_chance_source |  | text | Distinguish cold start, hot start (cold, hot) |  |  |  |  |  |  |  |  |  |  |  |  |
| splashad_show | Splash Impression | Splash impression report |  | splashad_chance_source |  | text | Distinguish cold start, hot start (cold, hot) |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | ecpm |  | number | Value per thousand impressions, unit: cents |  |  |  |  |  |  |  |  |  |  |  |  |
| splashad_click | Splash Click | Splash click report; deduplication |  | splashad_chance_source |  | text | Distinguish cold start, hot start (cold, hot) |  |  |  |  |  |  |  |  |  |  |  |  |
| acbads_get_mediasource_once | Attribution Result | At the end of attribution, report the attribution result |  | request_time_interval |  | number | This attribution time/s |  |  |  |  |  |  |  |  |  |  |  |  |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| device_id | Device ID | text | user_setOnce | Set at product launch/registration |  |  |  |  |  |  |  |  |  |  |  |  |  |
| channel | Registration Channel | text | user_setOnce | Set at product launch/registration; upload the user's channel information, such as app store, Yingyongbao, etc. |  |  |  |  |  |  |  |  |  |  |  |  |  |
| register_time | Registration Time | time | user_setOnce | Recorded when the user is added |  |  |  |  |  |  |  |  |  |  |  |  |  |
| is_overlap | Is Repeat | bool | user_setOnce | Recorded when the account is created |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_pay_amount | Cumulative Payment Amount | number | user_set | Overwritten each time recharge is completed |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_pay_times | Cumulative Payment Count | number | user_set | Incremented each time recharge is completed |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_login_day | Cumulative Active Days | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_login_day_version | Cumulative Active Days (Current Version) | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_coin | Current Amount | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_exp | Current Experience Value | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
