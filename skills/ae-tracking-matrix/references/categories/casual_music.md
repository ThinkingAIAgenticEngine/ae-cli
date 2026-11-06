# Casual Music Game Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Plan Templates" / Casual Music, cached 2026-09-28. Cloud is the authoritative version.

## Event Data (#Event Data)

| Event Module | Event Name | Event Display Name | Event Description | Property Name | Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| Basic Data | ta_app_install | Game Install | Collected automatically once client auto-collection is enabled |  |  |  |  |
|  | ta_app_start | Game Start | Triggered when game starts; timer starts (collected automatically once client auto-collection is enabled) |  |  |  |  |
|  | login | User Login | User login |  |  |  |  |
|  | ta_app_end | Game Logout | Recorded when game logs out; timer ends (collected automatically once client auto-collection is enabled) | #duration | Online duration | number | Collected automatically once client auto-collection is enabled |
| Resource & Item Changes | resource_change | Resource Change | Recorded when a resource or item changes | resource_id | Resource ID | string |  |
|  |  |  |  | resource_name | Resource name | string |  |
|  |  |  |  | change_type | Change type | string | Gain, consume |
|  |  |  |  | change_num | Change quantity | number |  |
|  |  |  |  | change_before | Quantity before change | number |  |
|  |  |  |  | change_after | Quantity after change | number |  |
|  |  |  |  | change_reason | Change reason | string | Watch ad, unlock song, clear song, etc. |
| Ad Module | ad_start | Ad Start | Ad starts playing; start timer | ad_id | Ad ID | string |  |
|  |  |  |  | ad_time | Ad duration | number | Total duration of this ad |
|  |  |  |  | view_reason | View entry | string | Double rewards, lucky wheel, etc. |
|  | ad_end | Ad End | Ad stops playing; end timer; upload duration field ad_duration | ad_id | Ad ID | string |  |
|  |  |  |  | ad_time | Ad duration | number | Total duration of this ad |
|  |  |  |  | ad_duration | Ad watch duration | number | Actual watch duration of this ad |
|  |  |  |  | view_reason | View entry | string | Double rewards, lucky wheel, etc. |
|  |  |  |  | view_complete | Is watched completely | bool | Whether the ad was watched completely |
|  | tap_ad | Tap Ad | Recorded when tapping a button on the ad page | ad_id | Ad ID | string | Whether "Download Now" was tapped |
| Game Module | game_start | Start Game | Recorded when a game round begins | song_id | Song ID | string |  |
|  |  |  |  | song_name | Song name | string |  |
|  |  |  |  | song_time | Song duration | number | Total song duration |
|  |  |  |  | start_entrance | Start entry | string | Today's gift, current popular, recommended for you, uncleared, etc. |
|  |  |  |  | song_type | Song category | string | Love songs, rock, Chinese style, etc. |
|  |  |  |  | cost_type | Cost category | string | Ad song, diamond song |
|  | game_faile | Stage Fail | Recorded when a game round fails; not reported when clicking revive | song_id | Song ID | string |  |
|  |  |  |  | song_name | Song name | string |  |
|  |  |  |  | song_time | Song duration | number | Total song duration |
|  |  |  |  | challenge_time | Challenge duration | number | Actual time spent in this challenge |
|  |  |  |  | start_entrance | Start entry | string | Today's gift, current popular, recommended for you, uncleared, etc. |
|  |  |  |  | song_type | Song category | string | Love songs, rock, Chinese style, etc. |
|  |  |  |  | cost_type | Cost category | string | Ad song, diamond song |
|  | game_win | Stage Clear | Recorded when a game round is cleared successfully | song_id | Song ID | string |  |
|  |  |  |  | song_name | Song name | string |  |
|  |  |  |  | song_time | Song duration | number | Total song duration |
|  |  |  |  | challenge_time | Challenge duration | number | Actual time spent in this challenge |
|  |  |  |  | start_entrance | Start entry | string | Today's gift, current popular, recommended for you, uncleared, etc. |
|  |  |  |  | song_type | Song category | string | Love songs, rock, Chinese style, etc. |
|  |  |  |  | cost_type | Cost category | string | Ad song, diamond song |
|  |  |  |  | star_num | Stars obtained | string |  |
|  |  |  |  | diamond_get | Diamonds obtained | number |  |
|  | tap_reborn | Tap Revive | Recorded when tapping revive | song_id | Song ID | string |  |
|  |  |  |  | song_name | Song name | string |  |
|  |  |  |  | song_time | Song duration | number | Total song duration |
|  |  |  |  | challenge_time | Challenge duration | number | Challenge duration at revive time |
|  |  |  |  | start_entrance | Start entry | string | Today's gift, current popular, recommended for you, uncleared, etc. |
|  |  |  |  | song_type | Song category | string | Love songs, rock, Chinese style, etc. |
|  |  |  |  | cost_type | Cost category | string | Ad song, diamond song |
| Other Content | like_song | Favorite Song | Recorded when favoriting a song | song_id | Song ID | string |  |
|  |  |  |  | song_name | Song name | string |  |
|  |  |  |  | song_type | Song category | string | Love songs, rock, Chinese style, etc. |
|  | unlock_scene | Unlock Scene | Recorded after a scene is unlocked | sence_id | Scene ID | string |  |
|  |  |  |  | sence_name | Scene name | string |  |
|  | click_gift | Click Today's Gift | Recorded when clicking the today's gift button and the today's gift page is shown |  |  |  |  |
|  | get_gift | Claim Today's Gift | Recorded after today's gift is claimed |  |  |  |  |

## Common Event Properties (#Common Event Properties)

| Property Category | Property Name | Display Name | Type | Property Description |
|---|---|---|---|---|
| System preset | #device_id | Device ID | string | Device ID or device-related ID, such as uuid |
|  | #os | Operating system | string | ios, android |
|  | #os_version | OS version | string | E.g. Android OS 9 |
|  | #app_version | App version | string |  |
|  | Properties auto-collected by client; see SDK integration docs for details |  |  |  |
| Resource | diamond | Diamond count | number | Diamond count of the player when event occurs |
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

## User Properties (#User ID System)

| Property Name | Display Name | Property Description | Assignment Description |
|---|---|---|---|
| #account_id | Account ID | System property | Not configured |
| #distinct_id | Visitor ID | System property | Device-level unique ID |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
