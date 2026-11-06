# Music App Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / Music App, 2026-09-28 cache. Cloud is the authoritative version.

## Event Data (#event-data)

| Event Name (required) | Event Display Name | Event Description | Event Tag | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
|---|---|---|---|---|---|---|---|
| ta_app_install | App Install | Reported automatically when client auto-collection is enabled | Basic Event |  |  |  |  |
| ta_app_start | App Launch | Reported automatically when client auto-collection is enabled | Basic Event |  |  |  |  |
| ta_app_end | App Close | Reported automatically when client auto-collection is enabled | Basic Event | #duration | Online Duration | number |  |
| device_activite | Device Activation | Reported on first device activation | Basic Event | device_activate_time | Device Activation Time | time |  |
| register | User Register | Reported after user registers an account | Basic Event | register_type | Registration Method | text |  |
| login | User Login | Reported after user logs into account | Basic Event |  |  |  |  |
| logout | User Logout | Reported after user logs out of account | Basic Event |  |  |  |  |
| vip_level_up | Membership Upgrade | Reported when membership is upgraded | Basic Event | vip_up_reason | Upgrade Reason | text | New user claim, recharge obtained |
| guide_complete | Complete Tutorial | Recorded on completing each small stage of the newbie tutorial | Newbie Tutorial | guide_step | Current Tutorial Step | number |  |
|  |  |  |  | guide_id | Current Tutorial Name | text |  |
| recharge | Initiate Recharge | Recorded on initiating recharge | Payment Module | order_id | Order ID | text |  |
|  |  |  |  | pay_type | Payment Currency | text | If using the [Exchange Rate Integration] feature, must comply with the ISO 4217 standard (such as CNY, USD, EUR, etc.) |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item Name | text | **Membership, **Music Coin |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | text | WeChat, Alipay, etc. |
| recharge_success | Recharge Success | Recorded on recharge payment success | Payment Module | order_id | Order ID | text |  |
|  |  |  |  | pay_type | Payment Currency | text | If using the [Exchange Rate Integration] feature, must comply with the ISO 4217 standard (such as CNY, USD, EUR, etc.) |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item Name | text | **Membership, **Music Coin |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | text | WeChat, Alipay, etc. |
| recharge_fail | Recharge Failure | Recorded on recharge failure | Payment Module | order_id | Order ID | text |  |
|  |  |  |  | pay_type | Payment Currency | text | If using the [Exchange Rate Integration] feature, must comply with the ISO 4217 standard (such as CNY, USD, EUR, etc.) |
|  |  |  |  | pay_amount | Payment Amount | number |  |
|  |  |  |  | pay_reason | Payment Item Name | text | **Membership, **Music Coin |
|  |  |  |  | is_first_pay | Is First Recharge | bool |  |
|  |  |  |  | pay_method | Payment Method | text | WeChat, Alipay, etc. |
|  |  |  |  | fail_reason | Recharge Failure Reason | text |  |
| resource_change | Resource Change | Recorded when a resource changes | Resource/Item Change | reason | Operation Behavior | text |  |
|  |  |  |  | resource_id | Resource ID | text | Music Coin |
|  |  |  |  | change_type | Change Type | text | Gain, consume |
|  |  |  |  | change_num | Change Amount | number |  |
|  |  |  |  | change_after | Amount After Change | number |  |
| item_change | Item Change | Recorded when an item changes | Resource/Item Change | reason | Operation Behavior | text |  |
|  |  |  |  | item_id | Item ID | text |  |
|  |  |  |  | change_type | Change Type | text | Gain, consume |
|  |  |  |  | change_num | Change Amount | number |  |
|  |  |  |  | change_after | Amount After Change | number |  |
| play_music | Play Music | Recorded when music is played | Music | reason | Operation Behavior | text | Start playing, end playing, exit |
|  |  |  |  | song_name | Track Name | text |  |
|  |  |  |  | song_id | Track ID | text |  |
|  |  |  |  | song_type | Track Category | text | Western style, folk, etc. |
|  |  |  |  | song_label | Track Label | text | E, A, F ... |
|  |  |  |  | song_author | Track Author | text |  |
|  |  |  |  | is_collect | Is Favorited | bool | Whether the track has been favorited |
|  |  |  |  | song_time | Track Duration (seconds) | number |  |
|  |  |  |  | play_time | Playback Duration (seconds) | number | Recorded on end playing or exit |
| share_music | Share Music | Recorded on music share start and share completion | Music | reason | Operation Behavior | text | Start sharing, share complete |
|  |  |  |  | song_name | Track Name | text |  |
|  |  |  |  | song_id | Track ID | text |  |
|  |  |  |  | song_type | Track Category | text | Western style, folk, etc. |
|  |  |  |  | song_label | Track Label | text | E, A, F ... |
|  |  |  |  | song_author | Track Author | text |  |
|  |  |  |  | share_type | Share Method | text |  |
| news | Message Notification | Recorded on reading a message notification | Other | subject | Message Subject | text | Message subject |
|  |  |  |  | content | Message Content | text | Message content |
| page | Page Click | This event has very high volume; only track pages with analytical value; set up dedicated events for key pages | Other | reason | Operation Behavior | text | Enter page, exit page |
|  |  |  |  | page_name | Page Name | text |  |
|  |  |  |  | page_details | Page Details | text |  |
|  |  |  |  | page_source | Source Page | text | Record which page the user came from, e.g. entered a track from search / entered a track from the home page |
|  |  |  |  | page_time | Dwell Time | number | Recorded on leaving this page, the dwell time of this session, unit: seconds |
| help | Feedback and Help | Recorded on entering a question and submitting feedback | Other | reason | Operation Behavior | text | Enter question, submit feedback |
|  |  |  |  | query_type | Question Type | text | FAQ, hardware device |
|  |  |  |  | query_name | Question Description | text |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
| Upload Instructions (please delete before uploading the file) |  |  |  |  |  |  |  |
| To ensure the tracking plan uploads successfully, please fill in according to the following rules and do not omit fields marked as "required" |  |  |  |  |  |  |  |
| Event Name: must start with a letter, can only contain digits, upper/lowercase letters, and underscore "_"; max length is 50 characters |  |  |  |  |  |  |  |
| Event Display Name: max length is 60 characters |  |  |  |  |  |  |  |
| Event Description: records when the event is triggered, no more than 200 characters |  |  |  |  |  |  |  |
| Event Tag: used to classify and manage events; separate multiple tags with "," |  |  |  |  |  |  |  |
| Property Name: must start with a letter, can contain digits, letters and underscore "_"; max length is 50 characters (only system-preset properties support starting with #) |  |  |  |  |  |  |  |
| Property Display Name: max length is 60 characters (if the same property has different display names under different events, only the first uploaded display name is kept as the property display name) |  |  |  |  |  |  |  |
| Property Type: possible values are number, text, time, bool, list, object, object group. See [Data Type Design Rules] table for value rules |  |  |  |  |  |  |  |
| Property Description: no more than 200 characters (if the same property has different descriptions under different events, only the first uploaded description is kept as the property description) |  |  |  |  |  |  |  |

## Common Event Properties (#common-event-properties)

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
|---|---|---|---|
| channel | Registration Channel | text |  |
| user_name | User Nickname | text |  |
| vip_level | Current Membership Level | number |  |
| vip_time | Membership Expiry Date | time |  |
| gold | Current Music Coin Amount | number |  |
| revenue | Current Payment Amount | number |  |
| revenue_times | Current Payment Count | number |  |
|  |  |  |  |
| Upload Instructions (please delete before uploading the file) |  |  |  |
| To ensure the tracking plan uploads successfully, please fill in according to the following rules and do not omit fields marked as "required" |  |  |  |
| Common event properties apply to every event and do not need to be filled into [#event-data]. Common event properties need to be set manually; see [Common Event Property Setup] table for setup methods |  |  |  |
| Property Name: must start with a letter, can contain digits, letters and underscore "_"; max 50 characters; only preset properties support starting with #. |  |  | (See the manual for preset properties and system fields) |
| Property Display Name: max length is 60 characters |  |  |  |
| Property Type: possible values are number, text, time, bool, list, object, object group |  |  |  |
| Property Description: no more than 200 characters |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## User Properties (#user-id-system)

| Game Type | Property Name | Property Display Name | Property Description | Assignment Description |
|---|---|---|---|---|
| Single Account Single Role | #account_id | Account ID | System property | Set to the player's account ID |
|  | #distinct_id | Visitor ID | System property | Device-related ID or in-business visitor ID; if using the client SDK, no need to pay attention |
| Single Account Multiple Roles | #account_id | Account ID | System property | Set to the role ID; set the account ID the role belongs to as a custom property of the role |
|  | #distinct_id | Visitor ID | System property | Device-related ID or in-business visitor ID; if using the client SDK, no need to pay attention |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
