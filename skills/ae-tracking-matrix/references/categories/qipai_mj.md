# Chess/Cards & Mahjong Tracking Plan (Local Cache)

> Source: Feishu wiki "Sub-category Tracking Templates" / Chess/Cards & Mahjong, 2026-09-28 cache. Cloud is the authoritative version.

## Event Data (#event-table)

| Custom Event Table Collection Instructions |  |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|
| 1. Event Name: text type, can start with a digit or letter, can contain digits, letters and underscore "\_"; max length is 50 characters; case-insensitive for letters |  |  |  |  |  |  |  |
| Event Module | Event Name | Event Display Name | Event Trigger Timing | Property Name | Property Display Name | Property Type | Property Description |
| Basic Data | ta_app_install | App Install | Reported automatically when client auto-collection is enabled |  |  |  | Preset property, see official docs; if you need to set common event properties or set a custom visitor ID, be sure to call setSuperProperties() or identify() before enabling auto-collection |
|  | ta_app_start | App Launch | Reported automatically when client auto-collection is enabled |  |  |  |  |
|  | ta_app_crash | App Crash | Reported automatically when client auto-collection is enabled |  |  |  |  |
|  | ta_app_end | App Close | Reported automatically when client auto-collection is enabled | #duration | Duration (auto-recorded) | number |  |
|  | register | User Register | After registration completes | register_type | Registration Method | text |  |
|  | login | User Login | After login completes | first_login | Is First Login | bool |  |
|  |  |  |  | login_type | Login Method | text |  |
|  |  |  |  | current_continuous_login_number | Current Consecutive Login Count | number |  |
|  | logout | User Logout | Recorded when the user exits the game/switches account | online_time | Online Duration | number | Duration the app has been open under this account |
|  | authentification | User Authentication | When the user completes authentication | user_name | Name | text |  |
|  |  |  |  | id_number | ID Card Number | text |  |
|  | server_switch | Switch Server | After switching server | previous_server | Previous Server | text |  |
|  | guide | Newbie Guide Event | Reported when the player reaches a specific node | guide_id | Guide ID | text |  |
|  | button_click | Click Log | After clicking certain key buttons | button_id | Button ID | text |  |
|  | dan_grading | Rank Promotion | After rank promotion | previous_dan_grading | Previous Rank | text |  |
|  | sharing | Share | When the user completes sharing | share_type | Share Method | text |  |
| Recharge | order_init | Initiate Order | When the order is initiated | order_id | Order ID | text |  |
|  |  |  |  | pay_id | Product ID | text |  |
|  | order_pay | Payment Complete | After user payment completes | order_id | Order ID | text |  |
|  |  |  |  | pay_id | Product ID | text |  |
|  |  |  |  | recharge_amount | Recharge Amount | number |  |
|  |  |  |  | pay_way | Payment Channel | text |  |
| Resource Change | gold_increase | Gold Increase | After an increase event occurs | previous_number | Amount Before | number |  |
|  |  |  |  | increase_number | Amount Increased | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
|  | gold_decrease | Gold Decrease | After a decrease event occurs | previous_number | Amount Before | number |  |
|  |  |  |  | decrease_number | Amount Decreased | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
|  | bluediamond_increase | Blue Diamond Increase | After an increase event occurs | previous_number | Amount Before | number |  |
|  |  |  |  | increase_number | Amount Increased | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
|  | bluediamond_decrease | Blue Diamond Decrease | After a decrease event occurs | previous_number | Amount Before | number |  |
|  |  |  |  | decrease_number | Amount Decreased | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
|  | reddiamond_increase | Red Diamond Increase | After an increase event occurs | previous_number | Amount Before | number |  |
|  |  |  |  | increase_number | Amount Increased | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
|  | reddiamond_decrease | Red Diamond Decrease | After a decrease event occurs | previous_number | Amount Before | number |  |
|  |  |  |  | decrease_number | Amount Decreased | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
|  | item_increase | Item Gained | After an increase event occurs | item_id | Item ID | text |  |
|  |  |  |  | previous_number | Amount Before | number |  |
|  |  |  |  | increase_number | Amount Increased | number |  |
|  |  |  |  | current_number | Current Amount | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
|  | item_decrease | Item Lost | After a decrease event occurs | item_id | Item ID | text |  |
|  |  |  |  | previous_number | Amount Before | number |  |
|  |  |  |  | decrease_number | Amount Decreased | number |  |
|  |  |  |  | current_number | Current Amount | number |  |
|  |  |  |  | reasons | Change Reason | text |  |
| Task | task_log | Task Achieved | After task is achieved | task_id | Task ID | text |  |
|  | task_award | Task Reward Claimed | After task reward is claimed | task_id | Task ID | text |  |
|  |  |  |  | get_award_list | Rewards Obtained List | list |  |
|  | achievement_log | Achievement Reached | After achievement is reached | achievement_id | Achievement ID | text |  |
|  | achievement_award | Achievement Reward Claimed | After achievement reward is claimed | achievement_id | Achievement ID | text |  |
|  |  |  |  | get_award_list | Rewards Obtained List | list |  |
|  | activity_award_get | Activity Reward Claimed | After activity reward is claimed | activity_id | Activity ID | text | Sign-in, roulette |
|  |  |  |  | award_id | Reward ID | text |  |
|  |  |  |  | get_item_list | Items Obtained List | list |  |
|  | mail_watch | View Mail | After viewing mail | mail_type | Mail Type | text |  |
|  |  |  |  | mail_id | Mail ID | text |  |
|  | mail_get | Mail Attachment Claimed | Mail attachment claimed | mail_type | Mail Type | text |  |
|  |  |  |  | get_item_list | Items Obtained List | list |  |
|  |  |  |  | mail_id | Mail ID | text |  |
| Ranked Match | qualifying_game_begin | Ranked Match Start | After the match starts | game_id | Game ID | text |  |
|  |  |  |  | arena_id | Arena ID | text |  |
|  |  |  |  | item_id_list | Chosen Item List | list |  |
|  | qualifying_game_end | Ranked Match End | After the ranked match ends | game_id | Game ID | text |  |
|  |  |  |  | arena_id | Arena ID | text |  |
|  |  |  |  | result | Game Result | text |  |
|  |  |  |  | game_grade | Game Ranking | number |  |
|  |  |  |  | get_gold_number | Gold Obtained | number |  |
| Tournament | match_subscribe | Tournament Subscribe | After tournament subscription | match_id | Tournament ID | text |  |
|  | match_apply | Tournament Apply | After tournament application | match_id | Tournament ID | text |  |
|  |  |  |  | cost_token_type | Currency Type Consumed | text |  |
|  |  |  |  | cost_token_number | Currency Amount Consumed | text |  |
|  | match_withdraw | Withdraw | After withdrawal | match_id | Tournament ID | text |  |
|  |  |  |  | get_token_type | Currency Type Obtained | text |  |
|  |  |  |  | get_token_number | Currency Amount Obtained | text |  |
|  | match_begin | Tournament Start | After tournament starts | match_id | Tournament ID | text |  |
|  |  |  |  | match_course  | Tournament Progress | text |  |
|  |  |  |  | current_ranking | Current Ranking | number |  |
|  |  |  |  | item_id | Chosen Item List | list |  |
|  | match_end | Tournament End | After tournament ends | match_id | Tournament ID | text |  |
|  |  |  |  | match_course  | Tournament Progress | text |  |
|  |  |  |  | current_round | Current Round | number |  |
|  |  |  |  | result | Game Result | text |  |
|  |  |  |  | current_ranking | Current Ranking | number |  |
|  |  |  |  | is_final | Is Final Round | text |  |
|  |  |  |  | get_token_type | Currency Type Obtained | text |  |
|  |  |  |  | get_token_number | Currency Amount Obtained | text |  |
| Activity | daily_bonus | Sign-in Event | After sign-in event | bonus_id | Reward ID | text |  |
|  |  |  |  | is_advertising | Ad Claim | bool |  |
|  |  |  |  | get_item_list | Chosen Item List | list |  |
|  |  |  |  | current_continuous_daily_number | Current Consecutive Sign-in Count | number |  |
|  | lucky_draw | Roulette Lucky Draw Event | After the draw completes | ticket_type | Ticket Type Used | text |  |
|  |  |  |  | get_award_id | Reward ID Obtained | text |  |
|  |  |  |  | get_item_list | Items Obtained List | list | Specific reward list |
|  | lucky_draw_quest_finish | Roulette Draw Task Complete | After completion | lucky_draw_quest_id | Roulette Draw Task ID | text |  |
|  |  |  |  | current_draw_count_left | Current Remaining Draw Count | number |  |
|  | discounts_award_get | One-Yuan Special Reward Claimed | After the one-yuan special reward is claimed | discounts_award_id | Special Reward ID | text |  |
|  | invitation | Invite Friend | After successfully inviting a friend | friend_id | Friend ID | text |  |
|  |  |  |  | current_invitation_number | Current Invited Friend Count | text | Use lightweight method |
|  |  |  |  | get_award_id | Reward ID Obtained | text |  |
|  | answer | Answer Activity | Each time a question is answered | question_id | Question ID | text |  |
|  |  |  |  | question_order_number | Question Order | number |  |
|  |  |  |  | is_correct | Is Correct | bool |  |
|  |  |  |  | get_score_number | Score Obtained | number |  |
|  |  |  |  | current_get_score_total | Current Total Score Obtained | number |  |
|  | answer_award_get | Answer Activity Reward Exchange | After exchanging the answer activity reward | award_id | Reward ID | text |  |
|  |  |  |  | cost_score_number | Score Consumed | number |  |
|  | questionnaire | Questionnaire | Each time a question is answered | question_id | Question ID | text |  |
|  |  |  |  | question_order_number | Question Order | number |  |
|  |  |  |  | choose_option | Chosen Option | text |  |
|  | ranking_award_get | Ranking Battle Activity Reward Claimed | After the ranking battle activity reward is claimed | award_id | Reward ID | text |  |
|  |  |  |  | get_item_list | Items Obtained List | list | Specific reward list |
|  | limittime_quest_finish | Limited-Time Activity Task Complete | After the limited-time activity task completes | limittime_quest_id | Limited-Time Activity Task ID | text |  |
|  | limittime_award_get | Limited-Time Activity Reward Claimed | After the limited-time activity reward is claimed | award_id | Reward ID | text |  |
|  |  |  |  | get_item_list | Items Obtained List | list | Specific reward list |
|  |  |  |  |  |  |  |  |
| Events not triggered from a single-user perspective, |  |  |  |  |  |  |  |
| Event Name | Current Online Count |  |  |  |  |  |  |
|  | Channel |  |  |  |  |  |  |
|  | Server ID |  |  |  |  |  |  |
|  | Platform (ios/Android) |  |  |  |  |  |  |
|  | Online Count |  |  |  |  |  |  |
| Note | Server-side report |  |  |  |  |  |  |
|  |  |  | 4th place |  |  |  |  |
|  |  |  | 5th place |  |  |  |  |
|  |  |  | 6th place |  |  |  |  |
|  |  |  | 7th place |  |  |  |  |
|  |  |  | 8th place |  |  |  |  |
|  |  |  | 9th place |  |  |  |  |
|  |  |  | 10th place |  |  |  |  |
|  |  |  | Total List (list) |  |  |  |  |

## Common Event Properties (Common Event Property Setup)

|  |  |
|---|---|
|  |  |
|  | Common event properties are properties that all (or most) events have |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |

## User Properties (#user-id-and-common-properties)

| User ID Description |  |  |  |  |  |  |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
| Property Name |  | Property Display Name |  | Property Description |  | Assignment Description |
| #account_id |  | Account ID |  | System property |  | The user's account ID |
| #distinct_id |  | Visitor ID |  | System property |  | Device-related ID or in-business visitor ID; if using the client SDK or if there is no visitor state, no need to pay attention |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
| Common Event Property Description |  |  |  |  |  |  |
| Common event properties are properties that every custom event needs to include. If the property has no value when the event is triggered, leave it blank. |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
| Property Name |  | Property Display Name |  | Property Type |  | Assignment Description |
| channel |  | Channel |  | text |  | Such as taptap, appstore, etc. |
| level |  | Level |  | number |  | Player's level when the event occurs |
| role_name |  | Current Role Name |  | text |  | Player's role name when the event occurs |
| phone_number |  | Phone Number |  | text |  | Player's phone number when the event occurs |
| total_recharge_amount |  | Current Cumulative Recharge Amount |  | number |  | Player's cumulative recharge amount when the event occurs |
| total_recharge_times |  | Current Cumulative Recharge Count |  | number |  | Player's cumulative recharge count when the event occurs |
| current_bluediamond_stock |  | Current Blue Diamond Stock |  | number |  | Player's blue diamond stock when the event occurs |
| current_gold_stock |  | Current Gold Stock |  | number |  | Player's gold stock when the event occurs |
| current_red_diamond_stock |  | Current Red Diamond Stock |  | number |  | Player's red diamond stock when the event occurs |
| total_game_number |  | Total Match Count |  | number |  | Player's total match count when the event occurs |
| win_rate |  | Current Win Rate |  | number |  | Player's match win rate when the event occurs |
| dan_grading |  | Current Rank |  | text |  | Player's rank when the event occurs |
| dan_grading_score |  | Current Rank Score |  | text |  | Player's rank score when the event occurs |
| current_server_id |  | Current Server ID |  | text |  | Player's server ID when the event occurs |
