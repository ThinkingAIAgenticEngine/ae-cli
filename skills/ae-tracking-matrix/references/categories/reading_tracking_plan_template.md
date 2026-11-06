# Reading Category_Tracking Plan Template.xlsx Tracking Plan


## #User ID System

| Property Name | Property Display Name | Property Description | Assignment Description |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #account_id | Account ID | System property | Set to the account ID |  |  |  |  |  |  |
| #distinct_id | Anonymous Visitor ID | System property | Device-related ID or visitor ID within the business; if using the client SDK, no need to worry about it |  |  |  |  |  |  |


## #Event Data

| Event Module | Event Name | Event Display Name | Event Description | Property Name | Property Display Name | Property Type | Property Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Module Initialization |  | Application Install | Can be collected after enabling client auto-collection |  |  |  |  |
|  | ta_app_start | Application Launch | Triggered when the game starts, timing needs to begin (can be collected after enabling client auto-collection) |  |  |  |  |
|  | ta_app_end | Application Logout | Recorded when the game logs out, timing ends (can be collected after enabling client auto-collection) | #duration | Online Duration | number | Can be collected after enabling client auto-collection |
|  | ta_app_crash | Application Crash | Auto-collected |  |  |  |  |
|  | first_device_add | Device Added | *Use first event* |  |  | Use first event / Used for device addition and retention analysis | https://docs.thinkingdata.cn/ta-manual/latest/installation/advanced_data_type/track_update_and_track_overwrite.html |
| User Basics | register | Account Registration | After registration is complete | invited_code | Invitation Code | string |  |
|  | account_login | Account Login | After login is complete | last_login_time | Last Login Time | time |  |
|  | interest_choose | Interest Selection | After initial login interest selection | interest_id_list | Interest ID List | list |  |
|  | account_logout | Account Logout | Recorded when the account logs out | online_duration | Account Online Duration | number |  |
| Tutorial | guide_complete | Complete Tutorial | Recorded upon completing each step of the tutorial | guide_step | Current Tutorial Step | number |  |
| Bottom Page Selection Module | home_click | Home Page Click | After home page control is clicked |  |  |  |  |
|  | classify_click | Category Click | After category control is clicked |  |  |  |  |
|  | my_click | My Click | After "My" control is clicked |  |  |  |  |
| Book Module | book_enter | Enter Book | After entering the book playback module | book_id | Book ID | string |  |
|  |  |  |  | position | Position | string | Position when entering the book, such as daily recommendation / latest release / book category / my favorites / related books, etc. |
|  |  |  |  | now_play_num | Current Play Count | number |  |
|  |  |  |  | now_comment_num | Current Comment Count | number |  |
|  | topic_enter | Enter Topic | After entering the book topic | topic_id | Topic ID | string |  |
|  |  |  |  | position | Position | string | Position when entering the topic |
|  | book_collection | Book Favorite | After favoriting a book | book_id | Book ID | string |  |
|  |  |  |  | position | Position | string |  |
|  | book_share | Book Share | After the bookmark share control is clicked | book_id | Book ID | string |  |
|  |  |  |  | position | Position | string | Position of the share control, such as bookmark/playback, etc. |
|  |  |  |  | share_path | Share Path | string | WeChat/QQ/Moments, etc. |
| Home Page Module | more_click | More Click | After the "More" control is clicked | position | Position | string | Position of the control, such as latest release / suitable for you / book topics, etc. |
|  | back_to_top | Back to Top | After the back to top control is clicked |  |  |  |  |
| Bookmark Module | create_picture | Generate Image | After the generate image control is clicked | book_id | Book ID | string |  |
|  | book_switch | Bookmark Switch | After swiping to switch to the next bookmark | before_book_id | Previous Book ID | string | Book ID before switching |
|  |  |  |  | after_book_id | Next Book ID | string | Book ID after switching |
| Category Module | search_enter | Enter Search | After clicking the search control to enter the search page |  |  |  |  |
|  | book_classify | Book Category | After clicking book category | type_id | Category ID | string | History/Psychology/Biography/Philosophy, etc. |
| Search Module | search_click | Perform Search | After entering content and clicking search | search_content | Search Content | string |  |
|  | search_history | History Search | After clicking historical search content | search_content | Search Content | string |  |
|  | clear_record | Clear Record | After clearing historical search records |  |  |  |  |
|  | search_hot | Hot Search | After clicking hot search content | search_content | Search Content | string |  |
|  |  |  |  | book_id | Book ID | string |  |
| My Module | news_click | News Click | After clicking the message control |  |  |  |  |
|  | mode_switch | Mode Switch | After switching day/night mode | before_mode | Mode Before Switch | string |  |
|  |  |  |  | after_mode | Mode After Switch | string |  |
|  | setup_click | Settings Click | After clicking the settings control |  |  |  |  |
|  | book_delete | Delete Book | After deleting a book | positon | Position | string | Delete favorites/downloads/subscriptions, etc. |
|  |  |  |  | subpositon | Sub-position | string |  |
|  |  |  |  | book_id_list | Book ID List | list |  |
|  | infomation_alter | Information Modification | After information modification is complete | before_name | Nickname Before Modification | string |  |
|  |  |  |  | before_sex | Gender Before Modification | string |  |
|  |  |  |  | before_birthday | Birthday Before Modification | string |  |
|  |  |  |  | before_region | Region Before Modification | string |  |
|  |  |  |  | before_sign | Signature Before Modification | string |  |
|  |  |  |  | before_background_id | Background ID Before Modification | string |  |
|  |  |  |  | after_name | Nickname After Modification | string |  |
|  |  |  |  | after_sex | Gender After Modification | string |  |
|  |  |  |  | after_birthday | Birthday After Modification | string |  |
|  |  |  |  | after_region | Region After Modification | string |  |
|  |  |  |  | after_sign | Signature After Modification | string |  |
|  |  |  |  | after_background_id | Background ID After Modification | string |  |
|  | lately_list | Recent List | Reported when the user logs out | positon | Position | string |  |
|  |  |  |  | subpositon | Sub-position | string |  |
|  |  |  |  | book_id_list | Book ID List | list |  |
|  | collection_list | Favorites List | Reported when the user logs out | positon | Position | string |  |
|  |  |  |  | subpositon | Sub-position | string |  |
|  |  |  |  | book_id_list | Book ID List | list |  |
|  | download_list | Download List | Reported when the user logs out | positon | Position | string |  |
|  |  |  |  | subpositon | Sub-position | string |  |
|  |  |  |  | book_id_list | Book ID List | list |  |
|  | subscribe_list | Subscription List | Reported when the user logs out | positon | Position | string |  |
|  |  |  |  | subpositon | Sub-position | string |  |
|  |  |  |  | book_id_list | Book ID List | list |  |
| Back Module | back_click | Back Click | After the back control "<" is clicked | control_position | Control Position | string | Book topic/bookmark/book category, etc. |
|  |  |  |  | duration | Duration | number | Page stay duration |
| Playback Module | book_download | Book Download | After the book download control is clicked | book_id | Book ID | string |  |
|  | download_complete | Download Complete | After the book download is complete | book_id | Book ID | string |  |
|  | timing_off | Timer Off | After setting the timer off | off_time | Off Time | number | Duration of the set off time |
|  | play_speed | Speed Play | After setting the playback speed | speed | Speed Multiple | number | 0.8/1/1.5 |
|  | create_poster | Generate Poster | After generate poster is clicked | book_id | Book ID | string |  |
|  |  |  |  | share_path | Share Path | string | WeChat/QQ/Moments, etc. |
|  | play_mode_switch | Playback Mode Switch | After playback mode switch | after_mode | Mode After Switch | string | Random play/sequential play, etc. |
|  | susband_play_switch | Pause Playback Switch | After clicking pause or play | is_susband | Pause | bool |  |
|  |  |  |  | play_duration | Playback Duration | number |  |
|  | view_comment | View Comment | When viewing comments | book_id | Book ID | string |  |
|  |  |  |  | comment_maker_id | Publisher ID | string |  |
|  |  |  |  | comment_content | Comment Content | string |  |
|  |  |  |  | comment_like_num | Comment Likes Count | number |  |
|  | make_comment | Make Comment | After making a comment | book_id | Book ID | string |  |
|  |  |  |  | comment_content | Comment Content | string |  |
|  | like_comment | Like Comment | After liking a comment | book_id | Book ID | string |  |
|  |  |  |  | comment_maker_id | Publisher ID | string |  |
|  |  |  |  | comment_content | Comment Content | string |  |
|  |  |  |  | comment_like_num | Comment Likes Count | number |  |
|  | play_book_switch | Playback Data Switch | After switching the book being played | before_book_id | Previous Book ID | string |  |
|  |  |  |  | after_book_id | Next Book ID | string |  |
|  |  |  |  | switch_type | Switch Type | string | Previous song/next song/current list/I have listened, etc. |
|  |  |  |  | play_duration | Playback Duration | number |  |
|  |  |  |  | is_complete_play | Is Complete Play | bool |  |
| Cost Event | cost | Buyer Cost | *Imported from third-party platform | #event_id | #Event ID | string | *Use updateable event*/Update order status, associate id with order number to avoid anomalies |
|  |  |  |  | adv_id | Ad ID | string |  |
|  |  |  |  | adv_type | Ad Type | string |  |
|  |  |  |  | channel_id | Channel ID | string |  |
|  |  |  |  | campaign_id | campaign_id | string |  |
|  |  |  |  | cost_amount | Buyer Amount | number | Unit: CNY |
|  |  |  |  | cost_action_amount | Effective Install Count | number |  |
| Snapshot Category | rank | Leaderboard | #account_id taken from assigned value; reported periodically (e.g. daily); clear common properties before reporting | rank_type | Leaderboard Type | number |  |
|  |  |  |  | rank_1_id | 1st Place User ID | string |  |
|  |  |  |  | rank_2_id | 2nd Place User ID | string |  |
|  |  |  |  | rank_x_id | …Nth Place User ID | string | *Depends on requirements |
|  |  |  |  | total_id_list | Total List | list | Upload user IDs by ranking list |
|  | concurrent_users | Online User Count | #account_id taken from assigned value; reported periodically (e.g. every minute/hour); clear common properties before reporting | channel_id | Channel | string |  |
|  |  |  |  | server_id | Server ID | string | Split and report 1 record per server, and additionally report 1 overall record |
|  |  |  |  | platform | Platform | string | iOS/Android |
|  |  |  |  | online_user | Online User Count | number | Online user count |


## #Common Event Properties

| Property Category | Property Name | Property Display Name | Property Type | Property Description |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System Preset Category | #device_id | Device ID | string | Device ID or device-related ID, such as uuid |  |  |
|  | #os | Operating System | string | iOS, Android |  |  |
|  | #os_version | Operating System Version | string | e.g. Android OS 9 |  |  |
|  | #app_version | App Version Number | string |  |  |  |
|  | Add as needed, see SDK integration documentation for details |  |  |  |  |  |
| Basic Information Category | listen_time | Listening Duration | number | User's listening duration at the time of the event |  |  |


## #User Data

| Property Category | Property Name | Property Display Name | Property Type | Update Method | Property Description |
| --- | --- | --- | --- | --- | --- |
| Basic Information Category | device_id | Device ID | string | user_setOnce |  |
|  | account_id | Login Account ID | string | user_setOnce |  |
|  | channel | Source Channel | string | user_setOnce |  |
|  | nick_name | Nickname | string | user_setOnce | Reported when the user is detected to exit the application |
| Time Category | register_time | Registration Time | time | user_setOnce |  |
|  | first_login | First Login Time | time | user_setOnce | Reported on login |
|  | last_login | Last Login Time | time | user_set | Reported on login |
| Cumulative Category | seies_login_days | Consecutive Login Days | number | user_set (use user_set if consecutive login days are recorded in the app, otherwise use user_add) | Reported on first login each day |
|  | acc_login_count | Cumulative Login Days | number | user_set (use user_set if cumulative login days are recorded in the app, otherwise use user_add) | Incremented and reported on first login each day |
|  | acc_listen_time | Cumulative Listening Duration | number | user_set (use user_set if cumulative listening duration is recorded in the app, otherwise use user_add) | Incremented and reported on logout |
| Progress Category | comment_num | Comments Published Count | number | user_set | Reported on logout |
|  | comment_like_num | Comment Likes Count | number | user_set | Reported on logout |
|  | lately_num | Recent Listening Count | number | user_set | Reported on logout |
|  | collection_num | Favorites Count | number | user_set | Reported on logout |
|  | download_num | Download Count | number | user_set | Reported on logout |
|  | subscribe_num | Subscription Count | number | user_set | Reported on logout |
