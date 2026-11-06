# Stranger Social Tracking Plan


## #User ID System

| Property Name | Property Display Name | Property Description | Assignment Description |
| --- | --- | --- | --- |
| #account_id | Account ID | System property | Set to the player's account ID |
| #distinct_id | Visitor ID | System property | Device-related ID or in-business visitor ID. If using the client SDK, you can choose to auto-generate the visitor ID |


## #Event Data

| Event Tag | Event Name (required) | Event Display Name | Event Description | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Module Initialization | ta_app_install | App Install | Reported when the APP is actually installed and started |  |  |  | Auto-collected event. See official docs. If you need to set common event properties or set a custom visitor ID, be sure to call setSuperProperties() or identify() before enabling auto-collection |
|  | ta_app_start | App Start | Triggered when the app starts, timing begins | #resume_from_background | Whether resumed from background | bool |  |
|  | ta_app_end | App Logout | Recorded when the app logs out, timing ends | #duration | Event Duration | number |  |
|  | ta_app_crash | App Crash | Reports APP crash events |  |  |  |  |
|  | first_device_add | Device Add | *Use the first event to determine whether the device is newly added |  |  |  | First event. See details at https://doc.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_8-1-first-event |
| Account Basic Module | register | User/Account Registration | Reported when (account) registration completes | reg_type | Registration Method | text |  |
|  | login | User/Account Login | Reported after (account) login succeeds | first_login | First Login | bool | Determines whether it is the first login |
|  | logout | User/Account Logout | Reported after (account) logout succeeds | account_duration | Account Online Duration | number | Unit: seconds |
|  | level_up | Level Up | Reported when the account levels up | level | Level After Upgrade | number |  |
|  | vip_subscription | VIP Subscription | Reported when VIP subscription succeeds | vip_type | VIP Type | text | Unit: seconds |
| Task and Reward Module | task_complete | Complete Task | Reported upon completion of daily/weekly tasks, or main-line/beginner task completion, or claiming task rewards | task_id | Task ID | text |  |
|  |  |  |  | task_name | Task Name | text |  |
|  |  |  |  | task_type | Task Type | text | Daily task / Beginner task |
|  |  |  |  | item_gain | Items Gained | object group | [{"id":'111',"name":"Diamond","amount":10},...] |
|  |  |  |  | item_gain.id | Item ID | text |  |
|  |  |  |  | item_gain.name | Item Name | text |  |
|  |  |  |  | item_gain.amount | Item Quantity | number |  |
|  | sign_complete | Complete Check-in | Reported when clicking check-in | sign_days | Check-in Days | number |  |
| Activity Module | activity_in | Enter Activity | Reported when entering an activity | click_location | Click Location | text | Reports the routing location |
|  |  |  |  | activity_url | Activity URL | text |  |
|  |  |  |  | activity_title | Activity Name | text |  |
|  | activity_load_fail | Activity Load Failure | Reported when loading fails | activity_url | Activity URL | text |  |
|  |  |  |  | activity_title | Activity Name | text |  |
|  |  |  |  | fail_reason | Failure Reason | text |  |
|  | activity_load_finish | Activity Load Complete | Reported when loading completes | activity_url | Activity URL | text | Boundary is first-screen load completion. |
|  |  |  |  | activity_title | Activity Name | text |  |
|  | activity_out | Exit Activity | Reported when leaving an activity | activity_url | Activity URL | text |  |
|  |  |  |  | activity_title | Activity Name | text |  |
| Recharge and Shop | init_order | Initiate Recharge | Reported when initiating a recharge | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | currency_type | Payment Currency | text | If using the [Exchange Rate Integration] feature, must conform to ISO 4217 standard (e.g., CNY, USD, EUR, etc.) |
|  |  |  |  | payment_name | Purchased Item Name | text |  |
|  |  |  |  | payment_num | Purchase Quantity | number |  |
|  |  |  |  | payment_type | Payment Method | text | Alipay / WeChat |
|  | payment | Recharge Success | Reported when recharge succeeds | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | currency_type | Payment Currency | text | If using the [Exchange Rate Integration] feature, must conform to ISO 4217 standard (e.g., CNY, USD, EUR, etc.) |
|  |  |  |  | payment_name | Purchased Item Name | text |  |
|  |  |  |  | payment_num | Purchase Quantity | number |  |
|  |  |  |  | payment_type | Payment Method | text | Alipay / WeChat |
|  |  |  |  | is_first | Is First Time | bool | Yes / No |
|  | payment_fail | Recharge Failure | Reported when recharge fails | order_id | Order ID | text |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | currency_type | Payment Currency | text | If using the [Exchange Rate Integration] feature, must conform to ISO 4217 standard (e.g., CNY, USD, EUR, etc.) |
|  |  |  |  | payment_name | Purchased Item Name | text |  |
|  |  |  |  | payment_num | Purchase Quantity | number |  |
|  |  |  |  | payment_type | Payment Method | text | Alipay / WeChat |
|  |  |  |  | fail_reason | Failure Reason | text |  |
|  | shop_buy | Shop Purchase | Reported after purchasing items in the shop | shop_id | Shop ID | text |  |
|  |  |  |  | item_id | Item ID | text |  |
|  |  |  |  | item_num | Item Quantity | number |  |
|  |  |  |  | item_price | Item Price | number |  |
|  |  |  |  | cost_type | Consumed Currency Type | text |  |
|  |  |  |  | cost_amount | Consumed Currency Amount | number |  |
|  | shop_refresh | Shop Refresh | Reported when clicking "Refresh Shop" | shop_id | Shop ID | text |  |
| Asset Module | resource_get | Asset Gain | Reported when assets/currency/items are gained ---------------------- Tip: Important currencies can be reported as independent events. Currencies and items can be split into separate events. | change_reason | Change Reason | text |  |
|  |  |  |  | resource_info | Asset Info | object group |  |
|  |  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  |  | resource_info.change_num | Change Amount | number |  |
|  |  |  |  | resource_info.after_num | Amount After Change | number |  |
|  | resource_cost | Asset Consumption | Reported when assets/currency/items are consumed ---------------------- Tip: Important currencies can be reported as independent events. Currencies and items can be split into separate events. | change_reason | Change Reason | text |  |
|  |  |  |  | resource_info | Asset Info | object group |  |
|  |  |  |  | resource_info.item_id | Item ID | text |  |
|  |  |  |  | resource_info.change_num | Change Amount | number |  |
|  |  |  |  | resource_info.after_num | Amount After Change | number |  |
| Voice Chat Room/Live Room Module | enter_liveroom | Enter Voice Chat Room | Reported when entering a voice chat room | enter_type | Entry Method | text |  |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | current_online | Current Online Count | number |  |
|  | leave_liveroom | Exit Voice Chat Room | Reported when exiting a voice chat room. If there are multiple exit methods, distinguish via exit_type. If the room can be minimized, you can report minimize as a separate event, or as a type of exit. | leave_type | Exit Method | text |  |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | current_online | Current Online Count | number |  |
|  |  |  |  | #duration | Event Duration | number | The client can call timeEvent for duration tracking, unit (seconds). Here it represents online duration in the voice chat room |
|  | minimize_liveroom | Voice Chat Room Minimize | Recorded when the voice chat room is minimized/exited | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | current_online | Current Online Count | number |  |
|  |  |  |  | #duration | Event Duration | number | Here refers to the duration from entering the voice chat room to minimizing |
|  | minimize_enter_liveroom | Minimize Re-entry | Recorded when re-entering from the minimized state | liveroom_type | Voice Chat Room Type | text | Can also be merged into the enter_liveroom event as an entry method |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | #duration | Event Duration | number | Here refers to the duration of this minimize session |
|  | follow_anchor | Follow Host in Voice Chat Room | Recorded when a user follows the room host/anchor in the voice chat room | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | current_online | Current Online Count | number |  |
|  | share_liveroom | Voice Chat Room Share | Records the viral sharing behavior of the voice chat room, recorded when clicking share | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | current_online | Current Online Count | number |  |
|  |  |  |  | share_destination | Share Channel | text | Refers to the destination of the share |
|  | liveroom_mic_take | Voice Chat Room Take Mic | Records the user's mic-taking behavior. Use type/position fields to distinguish different mic-taking data | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | mic_position | Mic Position | text | Records different mic-taking position sources |
|  |  |  |  | mic_take_type | Mic Taking Type | text | E.g., active mic-taking / invited mic-taking |
|  |  |  |  | is_mic_success | Mic Taking Success | bool | Can also only record successful mic-taking user behavior data |
|  | liveroom_mic_drop | Voice Chat Room Drop Mic | Records voice chat room mic-dropping behavior data | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | mic_drop_type | Mic Dropping Type | text | E.g., active / passive mic-dropping |
|  |  |  |  | #duration | Event Duration | number | Here refers to the online duration during this mic-taking session |
|  | liveroom_gift_send | Voice Chat Room Send Gift | Reported when gift sending succeeds in the voice chat room | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | receiver_id | Gift Receiver ID | text |  |
|  |  |  |  | gift_type | Gift Type | text |  |
|  |  |  |  | gift_id | Gift ID | text |  |
|  |  |  |  | gift_num | Gift Quantity | number |  |
|  |  |  |  | gift_amount | Gift Amount | number |  |
|  |  |  |  | gift_source | Gift Sending Source | text |  |
|  | liveroom_comment | Voice Chat Room Comment | Recorded when posting a comment in the voice chat room | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | comment_type | Comment Type | text | Text/emoji, can also be omitted |
|  | liveroom_set | Voice Chat Room Settings | Various user operation settings behaviors | set_action | Operation Action | text |  |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  | click_liveroom_game | Click Voice Chat Room Game | Reported when clicking a game within the voice chat room (records click behavior) | game_id | Game ID | text |  |
|  |  |  |  | game_name | Game Name | text |  |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  | leave_liveroom_game | Exit Voice Chat Room Game | Reported when exiting a game within the voice chat room | game_id | Game ID | text |  |
|  |  |  |  | game_name | Game Name | text |  |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | #duration | Event Duration | number | Here refers to the duration of this game participation |
|  | liveroom_popup_expose | Voice Chat Room Popup Impression | Records popup impression events within the voice chat room | expose_position | Impression Position | text |  |
|  |  |  |  | popup_window_id | Popup ID | text |  |
|  |  |  |  | popup_type | Popup Type | text | Records popup information |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  | liveroom_popup_click | Voice Chat Room Popup Click | Records popup click (button) behavior within the voice chat room | expose_position | Impression Position | text |  |
|  |  |  |  | popup_window_id | Popup ID | text |  |
|  |  |  |  | popup_type | Popup Type | text |  |
|  |  |  |  | button_type | Button Type | text |  |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  | liveroom_popup_close | Voice Chat Room Popup Close | Recorded when a popup is closed in the voice chat room | expose_position | Impression Position | text |  |
|  |  |  |  | popup_window_id | Popup ID | text |  |
|  |  |  |  | popup_type | Popup Type | text |  |
|  |  |  |  | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | #duration | Event Duration | number | Here refers to popup impression duration |
|  | liveroom_current_online | Voice Chat Room Current Online Count | To observe concurrent online count trends in the live room, the backend can report snapshot events. #account_id is directly defined as the host ID. The only difference is the reporting timing is every 5/10 minutes | liveroom_type | Voice Chat Room Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | liveroom_id | Host ID / Room ID | text |  |
|  |  |  |  | current_online | Current Online Count | number |  |
| Host Module | sign_anchor | Host Signing | Signing info is generally recorded on the server side and can be uploaded in real-time or periodically. #account_id is the host ID (theoretically the same as the account ID) | sign_type | Signing Type | text |  |
|  |  |  |  | anchor_type | Host Type | text |  |
|  |  |  |  | agent | Agent | text |  |
|  |  |  |  | sign_level | Signing Level | number |  |
| Match Module | enter_matching | Click to Enter Match Screen | Triggered when entering (or clicking) the match screen |  |  |  |  |
|  | start_matching | Start Match | Triggered when clicking to start matching |  |  |  |  |
|  | close_matching | Close Match | Triggered when clicking to close matching |  |  |  |  |
|  | slide_page | Swipe Page | Triggered when swiping the page (e.g., left/right swipe scenarios) | slide_type | Swipe Type | text | Left swipe / Right swipe |
|  | matching_click | Match Screen Click Operation | Reported when the main click operations are triggered on the match screen. Can also be split into separate events as follows | click_type | Click Type | text | Like / Dislike / Super Like |
|  | macthing_click_like | Match Screen Click Like | Reported when the main click operation on the match screen is triggered (active user click) |  |  |  |  |
|  | macthing_click_unlike | Match Screen Click Dislike | Reported when the main click operation on the match screen is triggered (active user click) |  |  |  |  |
|  | macthing_click_superlike | Match Screen Click Super Like | Reported when the main click operation on the match screen is triggered (active user click) |  |  |  |  |
|  | matching_success | Match Success | Triggered when swipe operation shows match success (records scenarios where user active behavior triggers match success) | friend_id | Friend ID | text | Records the user ID that was successfully matched. Can be used later for switching analysis entities to find the corresponding match success record |
|  |  |  |  | friend_label | Friend Label | text | Records info of the matched friend. Can be used to analyze match success rates between different types of users across user profiles |
|  |  |  |  | friend_type | Friend Type | text |  |
|  | matching_failure | Match Failure | If there is a match failure reminder, record it; otherwise, do not record |  |  |  |  |
|  | matching_popup_expose | Match Screen Popup Impression | Different social products have different popup designs on the match screen. Core popups of interest (e.g., unlocking advanced features) can be reported as a separate impression event, or a general impression tracking event can be used, distinguishing scenarios via page info | popup_type | Popup Type | text | Can also be another field that distinguishes page info, e.g., Unlock Super Like, Received Like, Received Super Like |
|  | matching_popup_click | Match Screen Popup Click | Same as above, records the behavior from page impression to click | popup_type | Popup Type | text | Can also be another field that distinguishes page info, e.g., Unlock Super Like, Received Like, Received Super Like |
|  |  |  |  | popup_window_id | Popup ID | text |  |
|  |  |  |  | button_type | Button Type | text | E.g., Exit, Agree |
|  | set_label | Set Label | Users typically set their own labels and match labels before matching. The set label behavior records user preference info | mine_label | My Label List | list |  |
|  |  |  |  | matching_label | Match Label List | list |  |
|  | leave_matching | Leave Match Screen | Recorded when leaving the match screen (including exiting the app) | #duration | Event Duration | number | Here refers to the duration of stay on the match screen |
| Chat / Message Module | click_address_book | Click Contacts / Friends List | Click behavior record |  |  |  |  |
|  | enter_chat | Enter Chat Screen | Click to enter screen generates an impression behavior record |  |  |  |  |
|  | send_message | Send Message | Recorded when the user sends a message | send_user | Recipient | text | (Can also be omitted) |
|  |  |  |  | message_type | Message Type | text | Image, emoji, text, etc. |
|  | receive_message | Receive Message | Recorded when a message is successfully delivered (received) | receiver_user | Source Object | text | (Can also be omitted) |
|  |  |  |  | message_source | Message Source | text |  |
|  |  |  |  | message_type | Message Type | text |  |
|  | start_voice_message | Initiate Voice Message | Recorded when initiating a voice call in a private chat |  |  |  |  |
|  | end_voice_message | Voice Message End | Recorded when a private voice call ends | #duration | Event Duration | number | Here represents the voice call duration |
|  | chat_send_gift | Private Chat Send Gift | Specifically refers to sending a gift to the other party in the private chat screen. Can also be a category scenario of a [Send Gift] event | send_type | Send Type | text | Active / Return |
|  |  |  |  | gift_type | Gift Type | text |  |
|  |  |  |  | gift_num | Gift Quantity | number |  |
|  |  |  |  | gift_send_user | Gift Recipient | text |  |
|  | add_friend | Add Friend | Recorded when clicking add friend | add_type | Add Method | text |  |
|  |  |  |  | is_add_success | Add Success | bool |  |
|  | follow_friend | Follow User | Recorded when following an individual user (distinct from the host-follow behavior). Can be used to analyze mutual-follow success rates | be_concerned_id | Followed User ID | text |  |
|  |  |  |  | connect_id | Related ID | text | If the follow type is active follow, record "my own ID + followed user ID" (concatenated field). Conversely, if the follow type is reciprocal follow, record "followed user ID + my own ID" (concatenated field, ensuring consistency with the related ID of the active follow) |
|  |  |  |  | scene_name | Current Scene | text | The scene info where the follow click occurred |
|  |  |  |  | follow_type | Follow Type | text | Active follow / Reciprocal follow |
|  | block_friend | Block Friend | Recorded when clicking to block a friend | block_friend_id | Blocked User ID | text | Counts the number of times a blocked user ID was blocked. Can be used for risk control analysis |
|  |  |  |  | current_friend_num | Current Friend Count | number | Records the friend count before blocking |
|  | leave_chat | Leave Chat Screen | Recorded when switching away from the chat screen | #duration | Event Duration | number | Here refers to chat duration statistics |
| Family Module | build_family | Create Family | Recorded when clicking to create a family | family_id | Family ID | text |  |
|  |  |  |  | is_bulid_success | Success | bool | If the creation process is relatively simple, you can record the creation behavior directly. If the process is detailed, it can be split into multiple events |
|  | build_failure_popup_expose | Create Family Failure Popup Impression | Recorded when a failure popup appears during family creation | popup_type | Popup Type | text |  |
|  | join_family | Join Family | Recorded when clicking to join a family | family_id | Family ID | text |  |
|  |  |  |  | is_bulid_success | Success | bool |  |
|  | invite_family | Family Invite | Recorded when clicking to send a family invite | family_id | Family ID | text |  |
|  |  |  |  | is_bulid_success | Success | bool |  |
|  | sign_family | Family Check-in | Recorded when clicking family check-in | family_id | Family ID | text |  |
|  |  |  |  | sign_source | Check-in Source | text |  |
|  | speak_in_family | Family Speak | Recorded when clicking to send a message in family group chat | family_id | Family ID | text |  |
|  | family_muted | Family Mute | Recorded when an admin mutes someone | family_id | Family ID | text |  |
|  |  |  |  | muted_user_id | Muted User ID | text |  |
|  | family_send_gift | Family Send Gift | Recorded when gift sending succeeds in family group chat | muted_user_id | Muted User ID | text |  |
|  |  |  |  | receiver_id | Gift Receiver ID | text |  |
|  |  |  |  | gift_source | Gift Sending Source | text |  |
| Posts / Content Creation Module | publish_news | Publish Post | Recorded when a post is successfully published | content_type | Content Type | text |  |
|  |  |  |  | topic_type | Topic Type | text | Recorded if a topic is attached, otherwise not recorded |
|  | enter_news | Enter Posts Page | Recorded when clicking to enter the posts page | enter_type | Entry Method | text |  |
|  | exit_news | Exit Posts Page | Recorded when switching away from the exit screen | #duration | Event Duration | number | Here refers to the duration of stay on the posts page |
|  | click_news_likes | Like | Reported when liking someone else's post | content_type | Content Type | text |  |
|  |  |  |  | topic_type | Topic Type | text | Recorded if a topic is attached, otherwise not recorded |
|  | cancel_news_likes | Cancel Like | Reported when canceling a like | content_type | Content Type | text |  |
|  |  |  |  | topic_type | Topic Type | text | Recorded if a topic is attached, otherwise not recorded |
|  | click_news_comment | Comment | Reported when commenting on someone else's post | content_type | Content Type | text |  |
|  |  |  |  | topic_type | Topic Type | text | Recorded if a topic is attached, otherwise not recorded |
|  | share_news | Share Post | Recorded when clicking to share post content | content_type | Content Type | text |  |
|  |  |  |  | topic_type | Topic Type | text | Recorded if a topic is attached, otherwise not recorded |
|  |  |  |  | share_destination | Share Channel | text |  |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #device_id | Device ID | text | Device-related ID (the ThinkingData SDK has its own logic for collecting device-associated IDs. If you want to record a project-specified device ID, it is recommended to record it as a custom property) |  |  |  |  |  |  |
| #os | Operating System | text | iOS, Android |  |  |  |  |  |  |
| #os_version | OS Version | text | E.g., Android OS 9 |  |  |  |  |  |  |
| #app_version | App Version | text | The version of your APP |  |  |  |  |  |  |
| #device_model | Device Model | text | The user's device model, such as iPhone 8 |  |  |  |  |  |  |
| #network_type | Network Type | text | The network state when the event occurred, such as WiFi, 4G, etc. |  |  |  |  |  |  |
| #carrier | Carrier | text | The user's device network carrier, such as China Mobile, China Telecom, etc. |  |  |  |  |  |  |
| #zone_offset | Timezone Offset | text | The offset hours of the data time relative to UTC time |  |  |  |  |  |  |
| #ram | Device RAM State | text | The user's device current free memory and total memory, in GB, e.g., 1.4/2.4 |  |  |  |  |  |  |
| #disk | Device Storage State | text | The user's device current free storage and total storage, in GB, e.g., 30/200 |  |  |  |  |  |  |
| #screen_height | Screen Height | text | The user's device screen height, e.g., 1920 |  |  |  |  |  |  |
| #screen_width | Screen Width | text | The user's device screen width, e.g., 1080 |  |  |  |  |  |  |
| client_version | Client Version Number | text | Client version number |  |  |  |  |  |  |
| choose_country | Country (User Selected) | text | The country selected by the user when the event occurred |  |  |  |  |  |  |
| nick_name | Nickname | text | The user's nickname when the event occurred |  |  |  |  |  |  |
| sex | Gender | text | The user's gender when the event occurred |  |  |  |  |  |  |
| age | Age | number | The user's age when the event occurred |  |  |  |  |  |  |
| type | User Type | text | The user's type when the event occurred |  |  |  |  |  |  |
| is_official_talent | Is Signed Host | bool | The user's host status when the event occurred |  |  |  |  |  |  |
| current_gold | Current Resource Value | number | The resource value here is a general reference. Corresponding resources can be added according to the actual product situation, e.g., diamonds/coins, etc. |  |  |  |  |  |  |
| user_level | Current User Level | number | The user's level when the event occurred |  |  |  |  |  |  |
| talent_level | Current Host Level | number | The user's host level status when the event occurred |  |  |  |  |  |  |
| friends | Friend Count | number | The user's friend count when the event occurred |  |  |  |  |  |  |
| follows | Follow Count | number | The user's follow count when the event occurred |  |  |  |  |  |  |
| followeds | Follower Count | number | The user's follower count when the event occurred |  |  |  |  |  |  |
| vip_type | VIP Type | text | The user's VIP type when the event occurred |  |  |  |  |  |  |
| vip_left_duration | VIP Remaining Duration | number | The user's VIP remaining duration when the event occurred |  |  |  |  |  |  |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description | Property Tag |
| --- | --- | --- | --- | --- | --- |
| device_id | Device ID | text | user_setOnce | Recorded at registration | Basic Property |
| client_version | Client Version Number | text | user_set | Overwrite on update |  |
| network_type | Network Type | text | user_set | Overwrite on update |  |
| platform | Platform Identifier | text | user_set | Overwrite on update. Platform identifier: android, iOS, harmonyOS, PC |  |
| channel_id | Registration Channel | text | user_setOnce | Set at game launch. Upload the user's channel info, e.g., app store, Yingyongbao, etc. |  |
| name | Nickname | text | user_set | Reported on logout / exit screen / change |  |
| sex | Gender | text | user_set | Reported on logout / exit screen / change |  |
| age | Age | number | user_set | Reported on logout / exit screen / change |  |
| birth | Birthday | text | user_set | Reported on logout / exit screen / change |  |
| choose_country | Country (User Selected) | text | user_set | Reported on logout / exit screen / change |  |
| user_level | Current User Level | number | user_set | Set every time the user level changes |  |
| talent_level | Current Host Level | number | user_set | Set every time the host level changes |  |
| is_official_talent | Is Signed Host | bool | user_set | Overwrite on update |  |
| phone_number | User Phone Number | text | user_set | Overwrite on update |  |
| email | Email | text | user_set | Overwrite on update |  |
| create_time | Registration Time | time | user_setOnce | Recorded at registration | Key Time Point |
| last_active_time | Last Active Time | time | user_set | Reported at logout |  |
| first_pay_time | First Payment Time | time | user_setOnce | Recorded at first recharge |  |
| last_pay_time | Last Payment Time | time | user_set | Overwrite the original record each time there is a recharge |  |
| total_revenue | Cumulative Payment Amount | number | user_set | Update and overwrite each time payment completes | Cumulative Value |
| revenue_times | Cumulative Payment Count | number | user_set | Update and overwrite each time payment completes |  |
| total_active_day | Cumulative Active Days | number | user_set | Update and overwrite each time active days increase |  |
| current_gold | Current Coins | number | user_set | Reported on logout / exit screen | Resources |
| current_gems | Current Diamonds | number | user_set | Reported on logout / exit screen |  |
| current_beans | Current Gold Beans | number | user_set | Reported on logout / exit screen |  |
| follows | Follow Count | number | user_set | Reported on logout / exit screen |  |
| followeds | Follower Count | number | user_set | Reported on logout / exit screen |  |
| friends | Friend Count | number | user_set | Reported on logout / exit screen |  |
| vip_type | VIP Type | text | user_set | Reported on each purchase |  |
| vip_duration | VIP Remaining Duration | number | user_set | Reported on each purchase |  |


## Data Type Design Principles

|  | The TA system currently supports the following data types. The field type in the system is determined by the type of the field when it is first imported. Therefore, it is recommended to carefully confirm field types when designing tracking |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  | TA Data Type | Value Example | Value Description | JSON Data Type | Recommended Scenarios |
|  | number | 123, 1.23 | Data range is -9E15 to 9E15, with up to 3 decimal places | Number | 1. Properties with numeric calculation scenarios (sum, median, mean, etc.), such as recharge amount, diamond consumption, level completion time (seconds), level..... 2. ID-related properties where the sequential relationship of IDs correlates positively with numeric size, such as level ID, server ID, etc. If such IDs are not pure numeric, they are treated as strings 3. Continuing from above, for user-related IDs such as role ID, although they may consist of all digits, they have no inherent numeric meaning, and may have very long digits, so it is recommended to treat them as strings |
|  | string | "ABC","Shanghai" | The default character limit is 2KB | String | Properties that are not suitable for other types can be considered to use string type, including some complex types currently unsupported by TA, such as map type |
|  | time | "2019-01-01 00:00:00", "2019-01-01 00:00:00.000" | "yyyy-MM-dd HH:mm:ss.SSS" or "yyyy-MM-dd HH:mm:ss". To represent a date, you can use "yyyy-MM-dd 00:00:00" | String | Such as registration time, first recharge time, monthly card expiration time, etc. |
|  | bool | true, false | - | Boolean | Such as whether it is the first level clear, whether it is a paid user, etc. |
|  | list | ["a","1","true"] | Elements in the list are all converted to string type | Array(String) | Such as battle card IDs ["Guan Yu", "Zhang Fei", "Zhao Yun"], user tags ["High Pay User", "Potential Churn User"] |
|  | object | {"item_name":"Hero Shard","item_num":5} | Must comply with the value rules of sub-properties. If the sub-property is a string, the sub-property's value must comply with the default character limit of 2KB | Object | / |
|  | object group | [ {"item_name":"Hero Shard","item_num":5}, {"item_name":"Skin Shard","item_num":2}, {"item_name":"Glory Points","item_num":10} ] | Must comply with the value rules of sub-properties. If the sub-property is a string, the sub-property's value must comply with the default character limit of 2KB | Array(Object) | For example, in a battle with multiple characters, object type properties can contain multiple sub-properties of different types to describe a hero's name, star rating, combat power, etc.; object group type can express multiple object types in the form of an array in a single field to describe the entire battle lineup. |


## Common Event Property Setting Methods

|  | Common event properties are properties that all (or most) events have |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | When reporting data using the server-side SDK or the data import tool, manually set the user's common event properties.  When reporting data using the client-side SDK: For common properties that may change, such as level, current maximum level, etc., it is recommended to use "dynamic common properties" to ensure the correctness of the property values when reporting.  Common event properties will be saved to the cache, and do not need to be called each time the App is launched. If setSuperProperties: is called to set a common event property that has been previously set, the previous property will be overwritten. If a common event property has the same Key as a property uploaded by track:properties:, the property of the event will overwrite the common event property.  Note that after the user logs out, in addition to calling the logout method, it may also be necessary to clear the currently set common event properties that have account dependencies. To delete a common event property, you can call the unsetSuperProperty method. To clear all common event properties, you can call clearSuperProperties.  Android SDK Setup: https://doc.thinkingdata.cn/tdamanual/installation/android_sdk_installation.html#b%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  iOS SDK Setup: https://doc.thinkingdata.cn/tdamanual/installation/ios_sdk_installation.html#b-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  JS SDK Setup: https://doc.thinkingdata.cn/tdamanual/installation/javascript_sdk_installation.html#c-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  Unity SDK Setup: https://doc.thinkingdata.cn/tdamanual/installation/unity_sdk_installation.html#33-%E8%AE%BE%E7%BD%AE%E5%8A%A8%E6%80%81%E5%85%AC%E5%85%B1%E5%B1%9E%E6%80%A7  Flutter SDK Setup: https://doc.thinkingdata.cn/tdamanual/installation/flutter_sdk_installation.html#32-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  Mini Program/Mini Game SDK Setup: https://doc.thinkingdata.cn/tdamanual/installation/mp_sdk_installation.html#332-%E8%AE%BE%E7%BD%AE%E5%8A%A8%E6%80%81%E5%85%AC%E5%85%B1%E5%B1%9E%E6%80%A7 |  |  |  |  |  |  |  |  |  |  |  |  |  |


## Multi-end Integration Considerations

|  | The TA system supports multi-end data integration, including client, server, and third-party data, and can integrate data from multiple endpoints into the same project to solve the data silo problem. However, there are some considerations in the process. Please pay attention to the following before integration |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | 1. ID Matching: |  |  |  |  |  |  |  |  |  |
|  | Client-side data must have visitor ID uploaded. It is recommended that server-side uploads also include the visitor ID to ensure the data on both sides can be matched (if the ID is included when reporting, the system will map it during ETL) |  |  |  |  |  |  |  |  |  |
|  | Because it is uncertain whether the first record where both [#account_id and #distinct_id] appear is from the client or the server, the safest approach is: when both IDs can be obtained, both ends should include and report them |  |  |  |  |  |  |  |  |  |
|  | 2. Overseas Multi-region Publishing (with time-order issues) |  |  |  |  |  |  |  |  |  |
|  | 2.1 Recommended approach: Report using local time + timezone |  |  |  |  |  |  |  |  |  |
|  | 2.2 Client SDK: By default uses the local time + timezone as the event occurrence time for reporting; can also specify an offset to a certain timezone before reporting data, refer to the SDK documentation for configuration; |  |  |  |  |  |  |  |  |  |
|  | 2.3 Server SDK: Need to set the timezone field manually; |  |  |  |  |  |  |  |  |  |
|  | (If the server cannot obtain the client's local time, report using the server's timezone) |  |  |  |  |  |  |  |  |  |
|  | 3. Server-side Reporting Notes |  |  |  |  |  |  |  |  |  |
|  | 3.1 When the server reports data, the #time field should be set to the event occurrence time, and #ip should take the client's IP |  |  |  |  |  |  |  |  |  |
|  | // Set the user's IP address. The TA system will parse the user's geographic location info based on the IP address. If not set, by default no reporting |  |  |  |  |  |  |  |  |  |
|  | properties.put("#ip", "192.168.1.1"); |  |  |  |  |  |  |  |  |  |
|  | 3.2 In the production environment, it is recommended to use the server SDK + logbus method for reporting (LoggerConsumer method). If using the batch method for reporting, there is a risk of data loss in case of long-term network interruption. |  |  |  |  |  |  |  |  |  |
|  | 4. Server-side Property Issues |  |  |  |  |  |  |  |  |  |
|  | 4.1 Issue with the server-side being unable to obtain preset properties: |  |  |  |  |  |  |  |  |  |
|  | a. For events reported by the server, if these preset properties are not needed for analysis, the server can choose not to report these properties |  |  |  |  |  |  |  |  |  |
|  | b. If events reported by the server need to use some common properties (preset properties) for analysis, these properties must be obtained via communication from the client before reporting |  |  |  |  |  |  |  |  |  |
|  | 4.2 ThinkingData does not automatically fill in common event properties on both ends, so both front-end and back-end need to pay attention to carrying the necessary common event properties |  |  |  |  |  |  |  |  |  |
