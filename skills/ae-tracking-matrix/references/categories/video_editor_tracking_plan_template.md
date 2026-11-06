# Video Editor Category_Tracking Plan Template.xlsx Tracking Plan


## #User ID System

| Property Name | Property Display Name | Property Description | Assignment Description |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #account_id | Account ID | System property | Set to the account ID |  |  |  |  |  |  |
| #distinct_id | Anonymous Visitor ID | System property | Device-related ID or visitor ID within the business; if using the client SDK, no need to worry about it |  |  |  |  |  |  |


## #Event Data

| Module | Event Name | Event Display Name | Property Name | Property Display Name | Event Description |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Registration, Login and Retention Behavior | ta_app_install | Application Install (auto-collected) |  |  | Auto-collection has no other properties; if you need to write other custom properties, you need to implement the installation event logic yourself |  |  |  |  |
|  | ta_app_start | Enter Application (auto-collected) |  |  |  |  |  |  |  |
|  | ta_app_end | Leave Application (auto-collected) | #duration | Event Duration (call timeEvent to time) |  |  |  |  |  |
|  | ta_app_crash | App Crash Event (auto-collected) | crash_type | Crash Type |  |  |  |  |  |
|  | create_account | Create Account | app_store_source | Store Source |  |  |  |  |  |
|  |  |  | channel_source | Channel Source |  |  |  |  |  |
|  |  |  | inviter_id | Which node user referred the user |  |  |  |  |  |
|  | app_login | Login to Application | last_login_time | Last Login Time |  |  |  |  |  |
|  | change_account | Switch Account |  |  |  |  |  |  |  |
|  | quit_account | Logout of Account |  |  |  |  |  |  |  |
|  | other_crash | Other Crash (interface/page) | crash_url/id | Crash page url/id |  |  |  |  |  |
| Page Path Analysis / Within-Page User Behavior Analysis / Single User Behavior Analysis | ta_app_view | Page View (optional auto-collection) | #screen_name | Page Name |  |  |  |  |  |
|  |  |  | #title | Page Title |  |  |  |  |  |
|  |  |  | #url | Page URL |  |  |  |  |  |
|  |  |  | #referrer | Previous URL |  |  |  |  |  |
|  |  |  |  |  | Other custom properties can be added |  |  |  |  |
|  | ta_app_click | App Control Click (optional auto-collection) | #screen_name | Page Name |  |  |  |  |  |
|  |  |  | #title | Page Title |  |  |  |  |  |
|  |  |  | #element_id | Element ID |  |  |  |  |  |
|  |  |  | #element_type | Element Type |  |  |  |  |  |
|  |  |  | #element_type | Element Type |  |  |  |  |  |
|  |  |  | #element_selector | Element Selector |  |  |  |  |  |
|  |  |  | #element_position | Element Position |  |  |  |  |  |
|  |  |  | #element_content | Element Content |  |  |  |  |  |
|  | leave_page | Leave Page | page | Current Page |  |  |  |  |  |
|  |  |  | #duration | Event Duration (call timeEvent to time) |  |  |  |  |  |
|  |  |  | page_type | Page Type (Android/iOS/H5) |  |  |  |  |  |
| Album Page | camera_active | Camera Activate | camera_id | Camera ID |  |  |  |  |  |
|  | quit_video_export | Exit Video Export Interface | video_id | Video ID |  |  |  |  |  |
|  |  |  | #duration | Event Duration (call timeEvent to time) |  |  |  |  |  |
|  | use_delete | Use Cleanup Function | content_id_list | List of content IDs cleaned up |  |  |  |  |  |
|  |  |  | content_type_list | List of content types cleaned up |  |  |  |  |  |
|  | page/works_share | Page Share/Works Share | page/works_id | Page/Works ID |  |  |  |  |  |
|  | page/function_appear | Page/Function Impression | page/function_id | Page/Function ID |  |  |  |  |  |
|  | use_function | (First) Use Function | function_id | Function ID |  |  |  |  |  |
|  |  |  | is_first_use | Is First Use |  |  |  |  |  |
|  | click_ad | Launch Page Ad Click | ad_name | Ad Name |  |  |  |  |  |
|  |  |  | ad_id | Ad ID |  |  |  |  |  |
|  | watch_video | Watch Video | video_id | Video ID |  |  |  |  |  |
|  |  |  | video_name | Video Name |  |  |  |  |  |
|  |  |  | total_duration | Total Duration |  |  |  |  |  |
|  |  |  | watch_duration | Watched Duration |  |  |  |  |  |
|  |  |  | watch_start_time | When Watching Started |  |  |  |  |  |
|  |  |  | video_type | Video Type |  |  |  |  |  |
|  |  |  | belong_to | Current Page |  |  |  |  |  |
|  | quit_watch_video | Exit Video Watching Page | video_id | Video ID |  |  |  |  |  |
|  |  |  | video_name | Video Name |  |  |  |  |  |
|  |  |  | total_duration | Total Duration |  |  |  |  |  |
|  |  |  | watch_duration | Watched Duration |  |  |  |  |  |
|  |  |  | watch_start_time | When Watching Started |  |  |  |  |  |
|  |  |  | watch_start_time | When Watching Started |  |  |  |  |  |
|  |  |  | watch_start_time | When Watching Started |  |  |  |  |  |
|  |  |  | video_type | Video Type |  |  |  |  |  |
|  |  |  | belong_to | Current Page |  |  |  |  |  |
|  | wifi_connect_success | WiFi Connect Success |  |  |  |  |  |  |  |
|  | wifi_connect_fail | WiFi Connect Fail | fail_reason | Failure Reason |  |  |  |  |  |
|  | wifi_help_page_open | Open WiFi Connection Help Page |  |  |  |  |  |  |  |
|  | quit_wifi_help_page | Exit WiFi Connection Help Page | #duration | Event Duration (call timeEvent to time) |  |  |  |  |  |
|  | follow | Follow | follow_user_id | Followed User ID | Which page follow happened on |  |  |  |  |
|  |  |  | follow_user_name | Followed User Name |  |  |  |  |  |
|  |  |  | is_follow_myself | Whether they followed me back |  |  |  |  |  |
|  | new_post | Publish Post | post_id | Post ID |  |  |  |  |  |
|  |  |  | from_app | Which app the post was uploaded from |  |  |  |  |  |
|  | like | Like | post_id | Post ID |  |  |  |  |  |
|  |  |  | from_app | Which app the post was uploaded from |  |  |  |  |  |
|  |  |  | publisher_id | Author ID |  |  |  |  |  |
|  |  |  | publisher_name | Author Name |  |  |  |  |  |
|  |  |  | publish_time | Post Publish Time |  |  |  |  |  |
|  | comment | Comment | post_id | Post ID |  |  |  |  |  |
|  |  |  | from_app | Which app the post was uploaded from |  |  |  |  |  |
|  |  |  | publisher_id | Author ID |  |  |  |  |  |
|  |  |  | publisher_name | Author Name |  |  |  |  |  |
|  |  |  | publish_time | Post Publish Time |  |  |  |  |  |
|  |  |  | comment_content | Comment Content |  |  |  |  |  |
|  | transmit | Forward | post_id | Post ID |  |  |  |  |  |
|  |  |  | from_app | Which app the post was uploaded from |  |  |  |  |  |
|  |  |  | publisher_id | Author ID |  |  |  |  |  |
|  |  |  | publisher_name | Author Name |  |  |  |  |  |
|  |  |  | publish_time | Post Publish Time |  |  |  |  |  |
|  | new_material | Material Added | file_name | File Name |  |  |  |  |  |
|  |  |  | total_duration | Total Duration |  |  |  |  |  |
|  |  |  | create_time | Creation Time |  |  |  |  |  |
|  |  |  | fps | Frame Rate |  |  |  |  |  |
|  |  |  | file_use_space | File Size |  |  |  |  |  |
|  |  |  | camera_id | Camera ID |  |  |  |  |  |
|  |  |  | camera_type | Camera Type |  |  |  |  |  |
|  |  |  | file_nums | Existing Video File Count |  |  |  |  |  |
|  |  |  | old_encoding | Original Encoding Format |  |  |  |  |  |
|  | edit_material | Material Enters Edit State |  |  | Refer to material add properties |  |  |  |  |
|  | download_trim | Trim Download |  |  | Refer to material add properties |  |  |  |  |
|  | download_trim_fail | Trim Download Fail |  |  | Refer to material add properties |  |  |  |  |
|  | download_trim_success | Trim Download Complete |  |  | Refer to material add properties |  |  |  |  |
| Shoot Page | filming_start | Start Video Shooting | file_name | File Name |  |  |  |  |  |
|  |  |  | create_time | Creation Time |  |  |  |  |  |
|  |  |  | fps | Frame Rate |  |  |  |  |  |
|  |  |  | camera_id | Camera ID |  |  |  |  |  |
|  |  |  | camera_type | Camera Type |  |  |  |  |  |
|  |  |  | shoot_mode | Shoot Mode |  |  |  |  |  |
|  |  |  | shoot_gear | Shoot Gear |  |  |  |  |  |
|  |  |  | anti_shake_open | Whether low-light anti-shake is enabled |  |  |  |  |  |
|  |  |  | file_nums | Existing Video File Count |  |  |  |  |  |
|  |  |  | old_encoding | Original Encoding Format |  |  |  |  |  |
|  | filming_complete | Video Shooting Complete |  |  | Refer to start video shooting |  |  |  |  |
|  | take_photo | Take Photo |  |  | Refer to start video shooting |  |  |  |  |
|  | enter_film_page | Enter Shoot Page |  |  | Refer to start video shooting |  |  |  |  |
|  | quit_film_page | Exit Shoot Page |  |  | Refer to start video shooting |  |  |  |  |
| Player | guide_start | Tutorial Start |  |  |  |  |  |  |  |
|  | guide_end | Tutorial End | duration | Elapsed Duration |  |  |  |  |  |
|  |  |  | is_quit | Is Quit |  |  |  |  |  |
|  | enter_player_page | Enter Player Page |  |  |  |  |  |  |  |
|  | quit_player_page | Leave Player Page | #duration | Event Duration (call timeEvent to time) |  |  |  |  |  |
|  | enter_effect_page | Enter Effect Edit Page | effect_page_id | Effect Page ID |  |  |  |  |  |
|  | click_effect | Effect Click | effect_id | The effect of this click |  |  |  |  |  |
|  |  |  | effect_1_status | Current status of other effects |  |  |  |  |  |
|  |  |  | effect_2_status | Current status of other effects |  |  |  |  |  |
|  |  |  | #duration | Event Duration (call timeEvent to time) |  |  |  |  |  |
|  | quit_effect | Exit Effect Edit |  |  | Refer to effect click properties |  |  |  |  |
|  | effect_complete | Effect Edit Complete | speed | Speed Used |  |  |  |  |  |
|  |  |  | filter | Filter Used |  |  |  |  |  |
|  |  |  | color | Color Adjustment Used |  |  |  |  |  |
|  |  |  | music | Music Used |  |  |  |  |  |
|  |  |  | file_name | File Name |  |  |  |  |  |
|  |  |  | total_duration | Total Duration |  |  |  |  |  |
|  |  |  | create_time | Creation Time |  |  |  |  |  |
|  |  |  | fps | Frame Rate |  |  |  |  |  |
|  |  |  | camera_id | Camera ID |  |  |  |  |  |
|  |  |  | camera_type | Camera Type |  |  |  |  |  |
|  |  |  | shoot_mode | Shoot Mode |  |  |  |  |  |
|  |  |  | shoot_gear | Shoot Gear |  |  |  |  |  |
|  |  |  | anti_shake_open | Whether low-light anti-shake is enabled |  |  |  |  |  |
|  |  |  | file_nums | Existing Video File Count |  |  |  |  |  |
|  |  |  | old_encoding | Original Encoding Format |  |  |  |  |  |
|  | AI_edit_start | AI Smart Recognition Start |  |  | Properties refer to effect edit complete |  |  |  |  |
|  | AI_edit_end | AI Smart Recognition Complete |  |  | Properties refer to effect edit complete |  |  |  |  |
|  | AI_material_use | Use AI Smart Recognition Material |  |  | Properties refer to effect edit complete |  |  |  |  |
|  | play_material | Play Material |  |  | Properties refer to effect edit complete |  |  |  |  |
|  | material_export | Material Export |  |  | Properties refer to effect edit complete |  |  |  |  |
|  | export_again | Re-export |  |  | Properties refer to effect edit complete |  |  |  |  |
|  | export_stop | Stop Export |  |  | Properties refer to effect edit complete |  |  |  |  |
|  | export_complete | Export Success |  |  | Properties refer to effect edit complete |  |  |  |  |
| Firmware Upgrade | start_firmware_level_up | Firmware Upgrade Start | level_up_type | Upgrade Method |  |  |  |  |  |
|  |  |  | old_firmware_version | Old Firmware Version |  |  |  |  |  |
|  |  |  | new_firmware_version | New Firmware Version |  |  |  |  |  |
|  | cancel__firmware_level_up | Firmware Upgrade Cancel |  |  | Refer to firmware upgrade start |  |  |  |  |
|  | complete_firmware_level_up | Firmware Upgrade Complete |  |  | Refer to firmware upgrade start |  |  |  |  |
|  | download_firmware | Firmware Download Start |  |  | Refer to firmware upgrade start |  |  |  |  |
|  | download_firmware_success | Firmware Download Success |  |  | Refer to firmware upgrade start |  |  |  |  |
|  | upload_firmware | Firmware Upload Start |  |  | Refer to firmware upgrade start |  |  |  |  |
|  | upload_firmware_success | Firmware Upload Success |  |  | Refer to firmware upgrade start |  |  |  |  |
|  | upexpected_error | Error Occurred | process_type | In which process it occurred |  |  |  |  |  |
|  |  |  | error_content | Error Content |  |  |  |  |  |


## #Common Event Properties

| Property Category | Property Name | Property Display Name | Property Type | Property Description |
| --- | --- | --- | --- | --- |
| System Preset Category | #device_id | Device ID | string | Device ID or device-related ID, such as uuid |
|  | #os | Operating System | string | iOS, Android |
|  | #os_version | Operating System Version | string | e.g. Android OS 9 |
|  | #app_version | App Version Number | string |  |
|  | Add as needed, see SDK integration documentation for details |  |  |  |
| Basic Information Category | listen_time | Listening Duration | number | User's listening duration at the time of the event |


## #User Data

| Property Category | Property English Name | Property Name | Setting Method | Property Type | Reporting Timing | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Identifier ID of the behavior subject. | #account_id | Account ID | user_set | character | Required for every report | Account ID. When it appears alongside other IDs, ignore the other IDs and use this one as the reference |
|  | #distinct_id | Anonymous Visitor ID | user_set | character | Required for every report | Anonymous visitor ID. The anonymous visitor ID when the account is not registered; the client SDK can generate it automatically |
|  | device_id | Phone Device ID | user_set | character | Reported on user login | ID identifying a unique device; the client SDK can automatically collect it |
|  | other_id | Other Platform Account | user_setOnce | character | Reported on binding |  |
| Entry point for behavior analysis. Used to observe its impact on user behavior. May serve as a filter and grouping item for any behavior, and changes frequently | gender | Gender | user_set | character |  |  |
|  | birthday | Date of Birth | user_set | date |  |  |
|  | firmware_version_list | Firmware Version List | user_set | list |  |  |
|  | camera_id_list | Camera Identifier List | user_set | list |  |  |
|  | medal_list | Existing Medal List | user_set | list |  |  |
|  | follow_nums | Number of users the current player follows | user_set | number |  |  |
|  | integral_nums | Current Total Points | user_set | number |  |  |
|  | fans_nums | Current Follower Count | user_set | number |  |  |
|  | active_days | Cumulative Total Days Logged In | user_add | number |  | Need to determine if it is the first login of the day; can also be omitted and calculated via distribution analysis |
|  | post_nums | Total Number of Posts Sent | user_add | number |  | Use user_add to report; the change value is reported each time, the property will automatically accumulate; negative values can be reported |
|  | like_nums | Cumulative Like Count | user_add | number |  |  |
|  | comment_nums | Cumulative Comment Count | user_add | number |  |  |
| Moment when key behavior occurs | account_create_time | Account Registration Time | user_setOnce | time | Reported on account creation |  |
|  | first_cost_time | First Payment Time | user_setOnce | time | Reported on payment |  |
|  | last_login_time | Last Login Time | user_set | time | Reported on each login |  |
|  | last_recost_time | Most Recent Consumption Time | user_set | time | Reported on each successful consumption |  |
| Properties that never change | channel_id | Channel ID | user_setOnce | character | Reported on account creation | Use user_setOnce to report; the property only retains the value from the first report |
|  | inviter_id | Inviter ID | user_setOnce | character | Reported on account creation |  |
|  | app_store_source_id | App Store Identifier ID | user_setOnce | character | Reported on account creation |  |
|  | first_cost_amount | First Payment Amount | user_setOnce | number | Reported on first recharge |  |
|  | reg_ip | Registration IP | user_setOnce | character | Reported on registration |  |
|  | reg_area | Region | user_setOnce | character | Reported on registration |  |
|  | first_login_app_version | App Version at First Entry | user_setOnce | character | Reported after install/on registration |  |
