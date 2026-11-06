# MMO Mobile Game Tracking Plan


## #User ID System

| Game Type | Property Name | Display Name | Description | Assignment Notes |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| Single Account Multi-Role | #account_id | Account ID | Preset property | Set to role ID; set the account ID to which the role belongs as a custom property of the role |  |  |
|  | #distinct_id | Visitor ID | Preset property | Device-related ID or in-business visitor ID. If using the client SDK, you may choose to auto-generate the visitor ID |  |  |


## #Event Data

| Event Name (Required) | Event Display Name | Event Description | Event Tag | Property Name (Required) | Display Name | Property Type (Required) | Description |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | APP Install | Auto-collected by client SDK |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| ta_app_start | APP Start | Auto-collected by client SDK |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| ta_app_end | APP End | Auto-collected by client SDK |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| ta_app_crash | APP Crash | Auto-collected by client SDK |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| new_device | New Device | Use the first event. Reference: https://docs.thinkingdata.cn/ta-manual/latest/installation/advanced_data_type/first_check_id.html |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| register | User/Account Registration | Reported when the user/account registers |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| login | User/Account Login | Reported when the user/account logs in |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| create_role | Create Role | Reported when the role is created |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| role_login | Role Login | Reported when the role logs in |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| level_up | Level Up | Reported when the player/role levels up |  | level | Level After Level-up | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| vip_levelup | VIP Level Up | Reported when VIP levels up |  | vip_level | VIP Level After Level-up | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| role_logout | Role Logout | Reported when the role logs out |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| logout | User/Account Logout | Reported when the user/account logs out |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| monthpass_activate | Monthly Pass Activation | Reported when the monthly pass is activated |  | monthpass_id | Monthly Pass ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| pass_activate | Battle Pass Activation | Reported when the battle pass is activated |  | pass_id | Pass ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guide_complete | Complete Newbie Guide | Reported when each step of the newbie guide is completed |  | guide_id | Guide Category | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guide_step | Guide Step | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| init_order | Initiate Recharge | Reported when an order is initiated |  | order_id | Order ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | click_position | Click Position | text | Which button or page the order was initiated from |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | payment_name | Purchased Product Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | payment_num | Purchase Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| payment | Recharge Success | Reported when recharge succeeds |  | order_id | Order ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | click_position | Click Position | text | Which button or page the order was initiated from |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_first | Is First Time | bool | Yes/No |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | payment_name | Purchased Product Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | payment_num | Purchase Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | payment_type | Payment Method | text | Alipay/WeChat |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | currency_type | Currency | text | Reference values: https://docs.thinkingdata.cn/ta-manual/latest/user_guide/advanced_analysis/currency.html#%E9%99%84%E5%BD%95 |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | pay_amount | Payment Amount | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| resource_get | Resource Gained | Reported when a resource/currency/item is gained ---------------------- Tip: Important currencies can be reported as independent events; currencies and items can be split into independent events |  | change_reason | Change Reason | text | Battle victory, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | change_detail | Change Detail | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info | Resource Info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.item_id | Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.item_type | Item Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.change_num | Change Amount | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.after_num | Amount After Change | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| resource_cost | Resource Consumed | Reported when a resource/currency/item is consumed ---------------------- Tip: Important currencies can be reported as independent events; currencies and items can be split into independent events |  | change_reason | Change Reason | text | Equipment upgrade, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | change_detail | Change Detail | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info | Resource Info | object group | Example: "resource_info": [ {"item_id":"1001","item_type":"1","change_num":100,"after_num":"540"}, {"item_id":"5","item_type":"2","change_num":10,"after_num":"70"} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.item_id | Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.item_type | Item Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.change_num | Change Amount | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | resource_info.after_num | Amount After Change | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| open_shop | Open Shop | Reported when the shop is opened |  | shop_id | Shop ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | click_position | Click Position | text | Which button or page the shop was opened from |  |  |  |  |  |  |  |  |  |  |  |  |
| shop_refresh | Shop Refresh | Reported when the shop is refreshed |  | shop_id | Shop ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| shop_buy | Shop Purchase | Reported when a shop purchase occurs |  | shop_id | Shop ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | item_id | Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | item_num | Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | item_price | Item Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guild_create | Create Guild | Reported when a guild is created |  | guild_id | Guild ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_name | Guild Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guild_join | Join Guild | Reported when joining a guild |  | guild_id | Guild ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_name | Guild Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_level | Guild Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_member | Guild Member Count | number | Current guild member count |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_power | Guild Total Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guild_leave | Leave Guild | Reported when leaving a guild |  | guild_id | Guild ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_name | Guild Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_level | Guild Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_member | Guild Member Count | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_power | Guild Total Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_position | Guild Position | text | Guild position when leaving |  |  |  |  |  |  |  |  |  |  |  |  |
| guild_manage | Guild Management | Reported when a guild management action occurs |  | guild_id | Guild ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_name | Guild Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_level | Guild Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_member | Guild Member Count | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | target_player_id | Target Player ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_position | Guild Position | text | Position of target player after the action |  |  |  |  |  |  |  |  |  |  |  |  |
| guild_game | Participate in Guild Gameplay | Reported when participating in guild gameplay |  | guild_game_type | Guild Gameplay Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_game_id | Guild Gameplay ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_id | Guild ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_name | Guild Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_level | Guild Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_member | Guild Member Count | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | guild_position | Guild Position | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| activity_attend | Participate in Activity | Reported when participating in an activity |  | activity_id | Activity ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | activity_type | Activity Type | text | Newbie Activity/Daily Activity/Weekly Activity/Holiday Activity, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
| activity_end | Activity Settlement | Reported at activity settlement |  | activity_id | Activity ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | activity_type | Activity Type | text | Newbie Activity/Daily Activity/Weekly Activity/Holiday Activity, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | complete_rate | Completion Rate | number | Completion rate calculation is customizable; e.g., for a check-in activity: actual check-in days / possible check-in days |  |  |  |  |  |  |  |  |  |  |  |  |
| put_items | List Items | Reported when items are listed |  | item_id | Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | item_num | Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | start_price | Starting Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | fixed_price | Fixed Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| bid_items | Bid Items | Reported when bidding on items |  | item_id | Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | item_num | Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | bid_type | Bid Type | text | Auction/Fixed Price |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | start_price | Starting Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | offer_price | Bid Offer Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| deal_items | Items Sold | Reported when items are sold |  | item_id | Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | item_num | Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | bid_type | Bid Type | text | Auction/Fixed Price |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | start_price | Starting Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | deal_price | Deal Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| stream_items | Items Unsold | Reported when items are unsold (auction failed) |  | item_id | Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | item_num | Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | start_price | Starting Price | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| start_transaction | Initiate Transaction | Each party reports one event; the two transaction events share the same transaction ID |  | transaction_id | Transaction ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | our_id | Our ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_id | Counterparty ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| complete_transaction | Complete Transaction | 1. Each party reports one event; the two transaction events share the same transaction ID 2. Also report resource gained and consumed events |  | transaction_id | Transaction ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | our_id | Our ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_id | Counterparty ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | give_item_info | Given Item Info | object group | Example: [{"item_id":"1","item_num":100},{"asset_id":"2","item_num":200},...] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | give_item_info.item_id | Given Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | give_item_info.item_num | Given Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | receive_item_info | Received Item Info | object group | Example: [{"item_id":"1","transaction_num":100},{"asset_id":"2","transaction_num":200},...] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | receive_item_info.item_id | Received Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | receive_item_info.item_num | Received Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| apply_friend | Apply for Friend | Reported when applying to add a friend |  | friend_id | Friend ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | apply_friend_type | Apply Friend Type | text | Targeted search, system recommendation, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
| add_friend | Add Friend | Reported when a friend is added |  | friend_id | Friend ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| del_friend | Delete Friend | Reported when a friend is deleted |  | friend_id | Friend ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | friendship | Friendship Points | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| give_gift | Give Gift | Reported when a gift is given |  | gift_id | Gift ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | gift_num | Gift Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | friend_id | Friend ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | friendship_change | Friendship Points Change | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | after_friendship | Friendship Points After Change | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| receive_gift | Claim Gift | Reported when a gift is claimed |  | gift_id | Gift ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | gift_num | Gift Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | friend_id | Friend ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | friendship_change | Friendship Points Change | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | after_friendship | Friendship Points After Change | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| chat | Chat | Reported when chatting |  | channel_id | Channel ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | room_id | Room ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | target_player_id | Target Player ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | chat_content | Chat Content | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | hold_up | Matched Prohibited Word Library | text | Muted, Normal, Fraud Word Library, Vulgar Word Library, Political Word Library, etc. Record based on actual situation |  |  |  |  |  |  |  |  |  |  |  |  |
| task_start | Quest Start | Reported when a quest starts |  | task_id | Quest ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | task_type | Quest Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| task_complete | Complete Quest | Reported when a quest is completed |  | task_id | Quest ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | task_type | Quest Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| sign_complete | Complete Check-in | Reported when check-in is completed |  | sign_type | Check-in Type | text | Daily Check-in/Activity Check-in, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | sign_days | Check-in Days | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| award_get | Claim Reward | Reported when a reward is claimed |  | award_id | Reward ID | text | IDs of various rewards |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | award_type | Reward Type | text | Mail Reward/Idle Reward/Achievement Reward/First Recharge Reward/Cumulative Recharge Reward, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
| equipment_levelup | Equipment Enhance | Reported when equipment is enhanced |  | equipment_id | Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_level | Equipment Level | number | Level after enhancement |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_star | Equipment Star | number | Star rating after enhancement |  |  |  |  |  |  |  |  |  |  |  |  |
| equip_refine | Equipment Refine | Reported when equipment is refined |  | equipment_id | Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_level | Equipment Level | number | Level after enhancement |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_star | Equipment Star | number | Star rating after enhancement |  |  |  |  |  |  |  |  |  |  |  |  |
| defeat_world_enemy | Defeat World Enemy | Reported when a world enemy is defeated |  | map_id | Map ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | enemy_type | Enemy Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | enemy_id | Enemy ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
| main_start | Main Stage Battle Start | Reported when the main story stage battle begins |  | main_id | Stage ID | text | For example: 12-1 |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_first | Is First Time | bool | Yes/No |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| main_win | Main Stage Battle Win | Reported after the main story stage battle is won |  | main_id | Stage ID | text | For example: 12-1 |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_first | Is First Time | bool | Yes/No |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | duration | Duration | number | Unit: seconds |  |  |  |  |  |  |  |  |  |  |  |  |
| main_fail | Main Stage Battle Fail | Reported after the main story stage battle is lost |  | main_id | Stage ID | text | For example: 12-1 |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_first | Is First Time | bool | Yes/No |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | fail_reason | Fail Reason | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | duration | Duration | number | Unit: seconds |  |  |  |  |  |  |  |  |  |  |  |  |
| battle_start | Dungeon Battle Start | Reported when a dungeon challenge battle begins |  | battle_type | Battle Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | battle_id | Battle ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | boss_id | Boss ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | boss_power | Boss Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_team | Is Team Challenge | bool |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| battle_win | Dungeon Battle Win | Reported after the dungeon challenge battle is won |  | battle_type | Battle Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | battle_id | Battle ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | boss_id | Boss ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | boss_power | Boss Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_team | Is Team Challenge | bool |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | duration | Duration | number | Unit: seconds |  |  |  |  |  |  |  |  |  |  |  |  |
| battle_fail | Dungeon Battle Fail | Reported after the dungeon challenge battle is lost |  | battle_type | Battle Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | battle_id | Battle ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | boss_id | Boss ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | boss_power | Boss Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_team | Is Team Challenge | bool |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | fail_reason | Fail Reason | text | Reported when the battle is lost |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | duration | Duration | number | Unit: seconds |  |  |  |  |  |  |  |  |  |  |  |  |
| mopping_up | Sweep | Reported when sweeping is completed |  | battle_type | Battle Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | battle_id | Battle ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | mop_num | Sweep Count | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| arena_start | Arena Challenge Start | Reported when the arena or other PvP gameplay battle begins |  | battle_type | Battle Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | battle_id | Battle ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_id | Opponent ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_rank | Opponent Rank | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_bot | Is Bot | bool | Yes/No |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | arena_rank | Our Rank | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_power | Opponent Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info | Opponent Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_type | Opponent Equipment Slot | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_id | Opponent Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_level | Opponent Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_star | Opponent Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_quality | Opponent Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_power | Opponent Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| arena_win | Arena Battle Win | Reported when the arena or other PvP gameplay battle is won |  | battle_type | Battle Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | battle_id | Battle ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_id | Opponent ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_rival_rank | Current Opponent Rank | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_rival_score | Current Opponent Score | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_bot | Is Bot | bool | Yes/No |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_arena_rank | Current Our Rank | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_arena_score | Current Our Score | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_power | Opponent Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info | Opponent Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_type | Opponent Equipment Slot | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_id | Opponent Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_level | Opponent Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_star | Opponent Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_quality | Opponent Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_power | Opponent Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | duration | Duration | number | Unit: seconds |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_rank | Opponent Rank | number | Opponent rank after battle |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | arena_rank | Our Rank | number | Our rank after battle |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_score | Opponent Score | number | Opponent score after battle |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | arena_score | Our Score | number | Our score after battle |  |  |  |  |  |  |  |  |  |  |  |  |
| arena_fail | Arena Battle Fail | Reported when the arena or other PvP gameplay battle is lost |  | battle_type | Battle Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | battle_id | Battle ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_id | Opponent ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_rival_rank | Current Opponent Rank | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_rival_score | Current Opponent Score | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | is_bot | Is Bot | bool | Yes/No |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_arena_rank | Current Our Rank | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | before_arena_score | Current Our Score | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | total_power | Total Battle Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: "equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_power | Opponent Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info | Opponent Equipment Info | object group | Example: "rival_equipment_info": [ {"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quality":"Purple+2","equipment_power":500}, {"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quality":"Purple+1","equipment_power":400} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_type | Opponent Equipment Slot | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_id | Opponent Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_level | Opponent Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_star | Opponent Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_quality | Opponent Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_equipment_info.equipment_power | Opponent Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | fail_reason | Fail Reason | text | Reported when the battle is lost |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | duration | Duration | number | Unit: seconds |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_rank | Opponent Rank | number | Opponent rank after battle |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | arena_rank | Our Rank | number | Our rank after battle |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rival_score | Opponent Score | number | Opponent score after battle |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | arena_score | Our Score | number | Our score after battle |  |  |  |  |  |  |  |  |  |  |  |  |
| map_explore | Map Exploration | Reported during map exploration |  | map_id | Map ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | explore_type | Exploration Method | text | Obtain map resources/Complete map quests/Unlock map main city, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | increase_rate | Exploration Progress Increase | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| save_team | Save Team | Reported when the team formation is saved |  | team_id | Team ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | team_name | Team Name | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info | Our Equipment Info | object group | Example: [{"equipment_type":"1",equipment_id":"1","equipment_level":100,"equipment_star":4,"equipment_quanlity":"Purple+2","equipment_power":500},{"equipment_type":"2","equipment_id":"2","equipment_level":200,"equipment_star":3,"equipment_quanlity":"Purple+1","equipment_power":400},...] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_type | Our Equipment Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_id | Our Equipment ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_level | Our Equipment Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_star | Our Equipment Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_quality | Our Equipment Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | equipment_info.equipment_power | Our Equipment Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| rank | Leaderboard | #distinct_id reports a custom value that does not conflict with players; clear common properties before reporting. Report once per specific time interval |  | rank_type | Leaderboard Type | text | e.g., level/online duration, etc. |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rank_info | Rank Info | object group | Example: "rank_info": [ {"id":"1000125","rank":1,"score":12000},{"id":"1000236","rank":2,"score":11005} ] |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rank_info.id | Player ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rank_info.rank | Rank | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | rank_info.score | Score | number |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_online | Online Users | #distinct_id reports a custom value that does not conflict with players; clear common properties before reporting. Report once per specific time interval |  | server_id | Server ID | text | Report 1 record per server split; also report 1 overall record separately |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | platform | Platform | text | iOS/Android |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | online_user | Online Users | number | Number of online users |  |  |  |  |  |  |  |  |  |  |  |  |


## #Common Event Properties

| Property Name (Required) | Display Name | Property Type (Required) | Description |
| --- | --- | --- | --- |
| channel | Channel | text | e.g., taptap, appstore, etc. |
| account | Game Account | text |  |
| server_id | Server ID | text |  |
| nick_name | Nickname | text |  |
| role_type | Role Class | text |  |
| tmp_level | Current Level | number |  |
| tmp_vip_level | Current VIP Level | number |  |
| tmp_main_id | Current Main Story Stage Progress | text |  |
| tmp_power | Current Battle Power | number |  |
| tmp_guild | Current Guild | text |  |
| tmp_coin | Current Silver Coins | number |  |
| tmp_gold | Current Gold Ingots | number |  |
| tmp_jade | Current Jade | number |  |


## #User Data

| Property Name | Display Name | Property Type | Update Method | Description |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| device_id | Device ID | text | user_setOnce | Set at game start/registration |  |  |  |  |  |  |  |  |  |  |  |  |  |
| channel | Registration Channel | text | user_setOnce | Set at game start/registration; uploads the user's channel info, such as app store, Tencent Yingyongbao, etc. |  |  |  |  |  |  |  |  |  |  |  |  |  |
| account | Account | text | user_setOnce | Recorded at registration |  |  |  |  |  |  |  |  |  |  |  |  |  |
| server_id | Server ID | text | user_setOnce | Recorded when the role is created |  |  |  |  |  |  |  |  |  |  |  |  |  |
| player_id | Role ID | text | user_setOnce | Recorded when the role is created |  |  |  |  |  |  |  |  |  |  |  |  |  |
| role_type | Role Class | text | user_setOnce | Recorded when the role is created |  |  |  |  |  |  |  |  |  |  |  |  |  |
| nick_name | Role Nickname | text | user_set | Overwritten on update |  |  |  |  |  |  |  |  |  |  |  |  |  |
| is_roll | Is Server Hopper | bool | user_setOnce | Recorded when the role is created |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_level | Current Level | number | user_set | Recorded when the player's level changes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_vip_level | Current VIP Level | number | user_set | Recorded when the player's VIP level changes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_power | Current Total Battle Power | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_main_id | Current Main Story Stage Progress | text | user_set | Recorded each time a new main story stage is cleared |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_pvp_winrate | Current Arena Win Rate | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_pvp_rank | Current Arena Rank | number | user_set | Set each time the arena rank changes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_pvp_maxwin | Current Arena Highest Win Streak | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_explore_rate | Current Map Exploration Progress | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hero_info | Hero/General/Card Details | object group | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hero_info.hero_id | Hero ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hero_info.hero_level | Hero Level | number |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hero_info.hero_star | Hero Star | number |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hero_info.hero_quanlity | Hero Quality | text |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hero_info.hero_power | Hero Power | number |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hero_info.hero_equipment_list | Hero Equipment List | list |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guild_id | Current Guild | text | user_set | Set on each change |  |  |  |  |  |  |  |  |  |  |  |  |  |
| bag_info | Bag Details | object group | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| bag_info.item_id | Bag Item ID | text |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| bag_info.item_type | Bag Item Type | text |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| bag_info.item_num | Bag Item Quantity | number |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| register_time | New User Time | time | user_setOnce | Recorded when the user is new (activation/registration/role creation time; consistent with the user ID system) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| first_login_time | First Login Time | time | user_setOnce | Recorded at first login |  |  |  |  |  |  |  |  |  |  |  |  |  |
| last_login_time | Last Login Time | time | user_set | Overwritten on each login |  |  |  |  |  |  |  |  |  |  |  |  |  |
| first_pay_time | First Recharge Time | time | user_setOnce | Recorded when the first recharge completes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| last_pay_time | Last Recharge Time | time | user_set | Overwritten on each recharge completion |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_pay_amount | Cumulative Payment Amount | number | user_set | Overwritten on each recharge completion (user_add may also be used) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_pay_times | Cumulative Payment Count | number | user_set | Accumulated on each recharge completion (user_add may also be used) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| total_login_day | Cumulative Login Days | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_coin | Current Silver Coins | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_gold | Current Gold Ingots | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
| current_jade | Current Jade | number | user_set | Set on each login/logout |  |  |  |  |  |  |  |  |  |  |  |  |  |
