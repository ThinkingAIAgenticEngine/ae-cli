# Blockchain Game Tracking Plan Template.xlsx Tracking Plan


## #User ID System

| Property Name | Property Display Name | Property Description | Assignment Description |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #account_id | Account ID | System Property | Set to role ID; the account ID that the role belongs to is set as a custom property of the role |  |  |  |  |  |  |
| #distinct_id | Visitor ID | System Property | Device-related ID or in-business visitor ID; auto-generated if using the client SDK |  |  |  |  |  |  |


## #Event Data

| Event Name | Event Display Name | Event Tag | Event Description | Property Name | Property Display Name | Property Type | Property Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | Game Install |  | Collected automatically once client auto-collection is enabled |  |  |  |  |
| ta_app_start | Game Start |  | Triggered when the game starts (collected automatically once client auto-collection is enabled) |  |  |  |  |
| register | Account Register |  | Register result returned | is_success | Whether Succeeded | bool |  |
| login | Account Login |  | After login completes | account_type | Account Type | text | Mobile account, wallet account, email account |
| role_login | Role Login |  | Recorded when role logs in | first_login | First Login | bool |  |
| logout | User/Account Logout |  | Reported after (account/role) logout succeeds |  |  |  |  |
| ta_app_end | Game Logout |  | Recorded when the game logs out (collected automatically once client auto-collection is enabled) | #duration | Online Duration | number | [300,600] |
| resource_change | Resource Change |  | Reported when resources/currency/items are gained or consumed ---------------------- Tip: important currencies can be reported as independent events; currencies and items can be split into independent events ---------------------- | resource_id | Resource ID | text | coin,gold,diamond,integral |
|  |  |  |  | resource_name | Resource Name | text | Token, Gold, Diamond, Points |
|  |  |  |  | change_type | Change Type | text | Gain, consume, withdraw |
|  |  |  |  | change_num | Change Amount | number | [10,10000] |
|  |  |  |  | change_after | Amount After Change | number | [10,10000] |
|  |  |  |  | change_reason | Change Reason | text | Dungeon, market purchase, market sell, daily quest |
| item_increase | Token Gained |  | After an increase event occurs | coin_type | Token Type | text |  |
|  |  |  |  | previous_number | Previous Amount | number | [10,1000] |
|  |  |  |  | increase_number | Increased Amount | number | [10,1000] |
|  |  |  |  | current_number | Current Amount | number | [10,1000] |
|  |  |  |  | reasons | Change Reason | text | Pet rental, pet sell |
| item_decrease | Token Consumed |  | After a decrease event occurs | coin_type | Token Type | text |  |
|  |  |  |  | previous_number | Previous Amount | number | [10,1000] |
|  |  |  |  | decrease_number | Decreased Amount | number | [10,1000] |
|  |  |  |  | reasons | Change Reason | text | Pet rental, pet purchase |
| coin_get | Token Withdraw |  | Recorded after token withdrawal | coin_type | Token Type | text |  |
|  |  |  |  | previous_number | Previous Amount | number | [10,1000] |
|  |  |  |  | increase_number | Increased Amount | number | [10,1000] |
|  |  |  |  | current_number | Current Amount | number | [10,1000] |
|  |  |  |  | reasons | Change Reason | text | Withdraw |
| coin_buy | Token Recharge |  | Recorded after token recharge | coin_type | Token Type | text |  |
|  |  |  |  | previous_number | Previous Amount | number | [10,1000] |
|  |  |  |  | increase_number | Increased Amount | number | [10,1000] |
|  |  |  |  | current_number | Current Amount | number | [10,1000] |
|  |  |  |  | reasons | Change Reason | text | Recharge |
| task_complete | Complete Task |  | Reported when a task is completed and rewards are claimed | task_type | Task Type | text | Daily task, weekly task |
|  |  |  |  | task_name | Task Name | text |  |
|  |  |  |  | task_id | Task ID | number | [1,100] |
|  |  |  |  | task_rewards | Task Rewards | list |  |
|  |  |  |  | active | Reward Progress After This Operation | number | [1,100] |
|  |  |  |  | reward_name | Reward Name | text | Leaderboard reward, PvE reward |
|  |  |  |  | item_id | Item ID | text |  |
|  |  |  |  | item_name | Item Name | text |  |
| enter_dungeon | Enter Stage |  | Enter a dungeon or stage | dungeon_id | Stage ID | text |  |
|  |  |  |  | pet_level | Pet Level | number | [1,100] |
|  |  |  |  | buff_id | buff ID | text |  |
|  |  |  |  | dungeon_name | Stage Name | text |  |
|  |  |  |  | dungeon_type | Stage Type | text | Minion, boss |
| dungeon_completed | Stage Cleared |  | Clear a dungeon or stage | dungeon_id | Stage ID | text |  |
|  |  |  |  | pet_level | Pet Level | number | [1,100] |
|  |  |  |  | buff_id | buff ID | text |  |
|  |  |  |  | dungeon_name | Stage Name | text |  |
|  |  |  |  | dungeon_type | Stage Type | text | Minion, boss |
|  |  |  |  | resource_info | Reward List | object array |  |
|  |  |  |  | resource_info.resource_get_id | Reward ID | text |  |
|  |  |  |  | resource_info.resource_num | Reward Amount | number | [1,100] |
| dungeon_fail | Stage Failed |  | Dungeon or stage challenge failed | dungeon_id | Stage ID | text |  |
|  |  |  |  | pet_level | Pet Level | number | [1,100] |
|  |  |  |  | buff_id | buff ID | text |  |
|  |  |  |  | dungeon_name | Stage Name | text |  |
|  |  |  |  | fail_reasons | Failure Reason | text |  |
|  |  |  |  | dungeon_type | Stage Type | text | Minion, boss |
| battle_match_begin | Match Start |  | Click start in matchmaking | battle_type | Match Type | text | Match, ranked |
|  |  |  |  | duration | Matchmaking Duration | number | [1,1000] |
| battle_match_fail | Match Fail |  | Matchmaking failed | battle_type | Match Type | text | Match, ranked |
|  |  |  |  | fail_reasons | Failure Reason | text | Timeout, clicked "Cancel", did not click "Accept" |
|  |  |  |  | duration | Matchmaking Duration | number | [1,1000] |
| contest_league | Arena |  | Recorded at arena challenge settlement | enemy_rank | Enemy Score | number | [1,1000] |
|  |  |  |  | enemy_fight | Enemy Power | number | [1,1000] |
|  |  |  |  | own_rank | My Score | number | [1,1000] |
|  |  |  |  | is_win | Whether Won | bool |  |
|  |  |  |  | current_rank | Score After End | number | [1,1000] |
| rank_event | Leaderboard Event |  | Reported at scheduled time each early morning as a snapshot of yesterday's leaderboard, in a single JSON format | server_id | Server | text |  |
|  |  |  |  | season_id | Season ID | text |  |
|  |  |  |  | rank_catalogue | Leaderboard Category | text |  |
|  |  |  |  | rank_type | Leaderboard Subcategory | text |  |
|  |  |  |  | rank_info | Leaderboard List | object array |  |
|  |  |  |  | rank_info.rank_count | Leaderboard Rank | number | [1,100] |
|  |  |  |  | rank_info.role_id | Role ID | text |  |
| challenge_boss | Challenge Boss |  | Recorded when starting a boss challenge in the fierce boss battle | boss_id | Boss ID | text |  |
|  |  |  |  | boss_name | Boss Name | text |  |
|  |  |  |  | boss_type | Boss Type | text |  |
| challenge_victory | Challenge Boss Success |  | Recorded when a boss challenge succeeds | boss_id | Boss ID | text |  |
|  |  |  |  | boss_name | Boss Name | text |  |
|  |  |  |  | boss_type | Boss Type | text |  |
| challenge_fail | Challenge Boss Fail |  | Recorded when a boss challenge fails | boss_id | Boss ID | text |  |
|  |  |  |  | boss_name | Boss Name | text |  |
|  |  |  |  | boss_type | Boss Type | text |  |
| tree_gift | Idle Reward |  | Recorded when idle rewards are received | gift_level | Reward Level | text |  |
|  |  |  |  | season_id | Season ID | text |  |
|  |  |  |  | resource_info | Reward List | object array |  |
|  |  |  |  | resource_info.resource_get_id | Reward ID | text |  |
|  |  |  |  | resource_info.resource_num | Reward Amount | number | [1,100] |
| tree_ask_cost | World Tree Task Refresh |  | Recorded when user refreshes world tree tasks | cost_item_id | Consumed Item ID | text |  |
|  |  |  |  | cost_item_num | Consumed Item Amount | number | [1,100] |
| tree_level_up | World Tree Level Up Progress |  | Recorded when the world tree level up task is completed | season_id | Season ID | text |  |
|  |  |  |  | level_up_before | Level Before Level Up | number | [1,100] |
|  |  |  |  | level_up_now | Level After Level Up | number | [1,100] |
|  |  |  |  | tree_growing | Current Progress | number | [1,100] |
|  |  |  |  | cost_item_id | Consumed Item ID | text |  |
|  |  |  |  | cost_item_num | Consumed Item Amount | number | [1,100] |
| let_pet_on | Place Pet |  | Place a pet in the world tree | pet_id | Pet ID | text |  |
|  |  |  |  | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet's Included Skills | list |  |
|  |  |  |  | season_id | Season ID | text |  |
| buy_market_pet | Buy Pet from Market |  | Recorded when buying a pet in the market (purchase price, pet stock in market, current lowest price, etc.) | pet_id | Pet ID | text |  |
|  |  |  |  | pet_name | Pet Name | text |  |
|  |  |  |  | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet's Included Skills | list |  |
|  |  |  |  | sale_price | Total Sale Price | number | [10,1000000] |
| put_on_shelf | List Pet |  | Recorded when listing a pet on the market | pet_id | Pet ID | text |  |
|  |  |  |  | pet_name | Pet Name | text |  |
|  |  |  |  | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet's Included Skills | list |  |
|  |  |  |  | sale_price | Total Sale Price | number | [10,1000000] |
| put_off_shelf | Delist Pet |  | Recorded when delisting a pet on the market | pet_id | Pet ID | text |  |
|  |  |  |  | pet_name | Pet Name | text |  |
|  |  |  |  | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet's Included Skills | list |  |
|  |  |  |  | sale_price | Total Sale Price | number | [10,1000000] |
| search_pet | Search Pet |  | Recorded when clicking search for pet | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet's Included Skills | list |  |
|  |  |  |  | pet_price_start | Price Range Start | number | [10,5000] |
|  |  |  |  | pet_price_end | Price Range End | number | [5000,10000] |
| lease_market_pet | Lease Pet |  | Recorded when leasing a pet | pet_id | Pet ID | text |  |
|  |  |  |  | pet_name | Pet Name | text |  |
|  |  |  |  | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet's Included Skills | list |  |
|  |  |  |  | coin_type | Token Type | text |  |
|  |  |  |  | sale_price | Total Sale Price | number | [10,1000000] |
| lease_pet_on | List Lease Pet |  | Recorded when listing a pet in the lease market | pet_id | Pet ID | text |  |
|  |  |  |  | pet_name | Pet Name | text |  |
|  |  |  |  | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet's Included Skills | list |  |
|  |  |  |  | coin_type | Token Type | text |  |
|  |  |  |  | sale_price | Total Sale Price | number |  |
| lease_pet_off | Delist Lease Pet |  | Recorded when delisting a pet from the lease market | pet_id | Pet ID | text |  |
|  |  |  |  | pet_name | Pet Name | text |  |
|  |  |  |  | pet_class | Pet Race | text |  |
|  |  |  |  | pet_skill | Pet Skill List | list |  |
|  |  |  |  | coin_type | Token Type | text |  |
|  |  |  |  | sale_price | Total Sale Price | number | [10,1000000] |
| pet_breed | Pet Breeding |  | Triggered during pet breeding | cost_item_id | Consumed Item ID | text |  |
|  |  |  |  | cost_item_num | Consumed Item Amount | number | [1,100] |
|  |  |  |  | pet_breed_info | Pet Breeding List | object array |  |
|  |  |  |  | pet_breed_info.pet_id | Breeding Pet ID | text |  |
|  |  |  |  | pet_breed_info.pet_class | Breeding Pet Race | text |  |
|  |  |  |  | pet_breed_info.pet_skill | Breeding Pet Included Skills | list |  |
|  |  |  |  | pet_breed_info.son_pet_id | Produced Pet ID | text |  |
| pet_price | Pet Current Price |  | Reported when pet price changes on the market | pet_id | Pet ID | text |  |
|  |  |  |  | pet_price | Pet Price | number | [10,1000000] |
|  |  |  |  | before_price | Price Before Change | number | [10,1000000] |
|  |  |  |  | now_price | Current Price | number | [10,1000000] |
| now_coin | Current Token Stock |  | Reported hourly on a schedule | coin_type | Token Type | text |  |
|  |  |  |  | coin_num | Token Amount | number | [10,1000000] |
| send_pet | Gift Pet |  | Recorded when gifting a pet | friend_id | Recipient ID | text |  |
|  |  |  |  | pet_id | Pet ID | text |  |


## #Common Event Properties

| Property Name | Property Display Name | Property Type | Property Description |
| --- | --- | --- | --- |
| channel | Registration Channel | text | APP store, Yingyongbao, Wandoujia, Huawei App Store, KOL channel =first |
| sever_id | Server ID | text | =first |
| account_id | Account ID | text | =first |
| device_type | Device Model | text | =first |
| level | Account Level | number | [1,100] |
| pet_info | Current Pet List | object array |  |
| pet_info.pet_id | Current_Pet ID | text |  |
| pet_info.is_lease | Current_Is Leased | bool |  |
| pet_info.pet_class | Current_Pet Race | text | God race, Demon race |
| pet_info.pet_skill | Current_Pet's Included Skills | list |  |
| rank | Current Rank | number | The player's rank at the time of the event |
| current_energy | Current Energy Stock | number |  |
| cost_energy | Energy Consumed This Time | number |  |
| current_coin | Current Token Amount | number | [0,1000000] |


## #User Data

| Property Name | Property Display Name | Property Type | Update Method | Property Description |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| account_id | Account ID | text | user_setOnce | register\|#time\|first |  |  |  |  |  |
| device_id | Device ID | text | user_setOnce | register\|#time\|first |  |  |  |  |  |
| channel | Registration Channel | text | user_setOnce | ta_app_install\|channel\|first |  |  |  |  |  |
| wellt | Wallet | text | user_setOnce |  |  |  |  |  |  |
| emile | Email | text | user_setOnce |  |  |  |  |  |  |
| server_id | Server ID | text | user_setOnce | role_login\|sever_id\|first |  |  |  |  |  |
| register_time | Registration Time | time | user_setOnce | register\|#time\|first |  |  |  |  |  |
| first_login_time | First Login Time | time | user_setOnce | role_login\|#time\|first |  |  |  |  |  |
| last_login_time | Last Login Time | time | user_set | role_logout\|#time\|last |  |  |  |  |  |
| pet_info | Current Pet List | object array | user_set |  |  |  |  |  |  |
| pet_info.pet_id | Current_Pet ID | text |  |  |  |  |  |  |  |
| pet_info.is_lease | Current_Is Leased | bool |  |  |  |  |  |  |  |
| pet_info.pet_class | Current_Pet Race | text |  | God race, Demon race |  |  |  |  |  |
| pet_info.pet_skill | Current_Pet's Included Skills | list |  |  |  |  |  |  |  |
| season_pets | Season X Frequently Used Pet IDs | list | user_set |  |  |  |  |  |  |
| current_coin | Current Token Amount | number | user_set | Set at each logout |  |  |  |  |  |
| current_level | Current Level | number | user_set | logout\|level\|last |  |  |  |  |  |
| current_dungeon | Current Main Line Stage | text | user_set | dungeon_completed\|dungeon_id\|last |  |  |  |  |  |
