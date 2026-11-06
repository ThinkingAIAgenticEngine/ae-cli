# Standard Base - Gameplay Event Data

> Source: Feishu sheets `M71zsVFKihDEKXtZJjZcOkAvn5b` / sheet "Gameplay Event Data", cached on 2026-09-20. The cloud copy is the authoritative version; the cloud takes precedence on conflict.

| Event Name (Required) | Event Display Name | Event Description | Event Tag | Property Name (Required) | Property Display Name | Property Type (Required) | Property Description |
|---|---|---|---|---|---|---|---|
| hero_levelup | Hero Level Up | Reported on hero level up | Hero Progression | hero_id | Hero ID | Text |  |
| hero_levelup | Hero Level Up | Reported on hero level up | Hero Progression | hero_level | Hero Level | Number | Level after upgrade |
| hero_levelup | Hero Level Up | Reported on hero level up | Hero Progression | hero_star | Hero Star Level | Number | Star level after upgrade |
| hero_levelup | Hero Level Up | Reported on hero level up | Hero Progression | hero_quality | Hero Grade | Text | Grade after upgrade |
| hero_levelup | Hero Level Up | Reported on hero level up | Hero Progression | hero_power | Hero Combat Power | Number | Combat power after upgrade |
| hero_starup | Hero Star Up | Reported on hero star up | Hero Progression | hero_id | Hero ID | Text |  |
| hero_starup | Hero Star Up | Reported on hero star up | Hero Progression | hero_level | Hero Level | Number | Level after upgrade |
| hero_starup | Hero Star Up | Reported on hero star up | Hero Progression | hero_star | Hero Star Level | Number | Star level after upgrade |
| hero_starup | Hero Star Up | Reported on hero star up | Hero Progression | hero_quality | Hero Grade | Text | Grade after upgrade |
| hero_starup | Hero Star Up | Reported on hero star up | Hero Progression | hero_power | Hero Combat Power | Number | Combat power after upgrade |
| hero_qualityup | Hero Advance | Reported on hero advance | Hero Progression | hero_id | Hero ID | Text |  |
| hero_qualityup | Hero Advance | Reported on hero advance | Hero Progression | hero_level | Hero Level | Number | Level after upgrade |
| hero_qualityup | Hero Advance | Reported on hero advance | Hero Progression | hero_star | Hero Star Level | Number | Star level after upgrade |
| hero_qualityup | Hero Advance | Reported on hero advance | Hero Progression | hero_quality | Hero Grade | Text | Grade after upgrade |
| hero_qualityup | Hero Advance | Reported on hero advance | Hero Progression | hero_power | Hero Combat Power | Number | Combat power after upgrade |
| equipment_levelup | Equipment Enhancement | Reported on equipment enhancement | Equipment Progression | equipment_id | Equipment ID | Text |  |
| equipment_levelup | Equipment Enhancement | Reported on equipment enhancement | Equipment Progression | equipment_level | Equipment Level | Number | Level after upgrade |
| equipment_levelup | Equipment Enhancement | Reported on equipment enhancement | Equipment Progression | equipment_star | Equipment Star Level | Number | Star level after upgrade |
| equip_refine | Equipment Refinement | Reported on equipment refinement | Equipment Progression | equipment_id | Equipment ID | Text |  |
| equip_refine | Equipment Refinement | Reported on equipment refinement | Equipment Progression | equipment_level | Equipment Level | Number | Level after upgrade |
| equip_refine | Equipment Refinement | Reported on equipment refinement | Equipment Progression | equipment_star | Equipment Star Level | Number | Star level after upgrade |
| guild_create | Create Guild | Reported on guild creation | Guild Gameplay | guild_id | Guild ID | Text |  |
| guild_create | Create Guild | Reported on guild creation | Guild Gameplay | guild_name | Guild Name | Text |  |
| guild_join | Join Guild | Reported on joining a guild | Guild Gameplay | guild_id | Guild ID | Text |  |
| guild_join | Join Guild | Reported on joining a guild | Guild Gameplay | guild_name | Guild Name | Text |  |
| guild_join | Join Guild | Reported on joining a guild | Guild Gameplay | guild_level | Guild Level | Number |  |
| guild_join | Join Guild | Reported on joining a guild | Guild Gameplay | guild_member | Guild Member Count | Number | Current guild member count |
| guild_join | Join Guild | Reported on joining a guild | Guild Gameplay | guild_power | Guild Total Combat Power | Number |  |
| guild_leave | Leave Guild | Reported on leaving a guild | Guild Gameplay | guild_id | Guild ID | Text |  |
| guild_leave | Leave Guild | Reported on leaving a guild | Guild Gameplay | guild_name | Guild Name | Text |  |
| guild_leave | Leave Guild | Reported on leaving a guild | Guild Gameplay | guild_level | Guild Level | Number |  |
| guild_leave | Leave Guild | Reported on leaving a guild | Guild Gameplay | guild_member | Guild Member Count | Number |  |
| guild_leave | Leave Guild | Reported on leaving a guild | Guild Gameplay | guild_power | Guild Total Combat Power | Number |  |
| guild_leave | Leave Guild | Reported on leaving a guild | Guild Gameplay | guild_position | Guild Position | Text | Guild position at the time of leaving |
| guild_manage | Guild Management | Reported on guild management | Guild Gameplay | guild_id | Guild ID | Text |  |
| guild_manage | Guild Management | Reported on guild management | Guild Gameplay | guild_name | Guild Name | Text |  |
| guild_manage | Guild Management | Reported on guild management | Guild Gameplay | guild_level | Guild Level | Number |  |
| guild_manage | Guild Management | Reported on guild management | Guild Gameplay | guild_member | Guild Member Count | Number |  |
| guild_manage | Guild Management | Reported on guild management | Guild Gameplay | target_player_id | Target Player ID | Text |  |
| guild_manage | Guild Management | Reported on guild management | Guild Gameplay | guild_position | Guild Position | Text | Position of the target player after the operation |
| guild_game | Participate in Guild Gameplay | Reported on participating in guild gameplay | Guild Gameplay | guild_game_type | Guild Gameplay Type | Text |  |
| guild_game | Participate in Guild Gameplay | Reported on participating in guild gameplay | Guild Gameplay | guild_game_id | Guild Gameplay ID | Text |  |
| guild_game | Participate in Guild Gameplay | Reported on participating in guild gameplay | Guild Gameplay | guild_id | Guild ID | Text |  |
| guild_game | Participate in Guild Gameplay | Reported on participating in guild gameplay | Guild Gameplay | guild_name | Guild Name | Text |  |
| guild_game | Participate in Guild Gameplay | Reported on participating in guild gameplay | Guild Gameplay | guild_level | Guild Level | Number |  |
| guild_game | Participate in Guild Gameplay | Reported on participating in guild gameplay | Guild Gameplay | guild_member | Guild Member Count | Number |  |
| guild_game | Participate in Guild Gameplay | Reported on participating in guild gameplay | Guild Gameplay | guild_position | Guild Position | Text |  |
| put_items | List Item | Reported on listing an item | Player Trading | item_id | Item ID | Text |  |
| put_items | List Item | Reported on listing an item | Player Trading | item_num | Item Quantity | Number |  |
| put_items | List Item | Reported on listing an item | Player Trading | start_price | Starting Price | Number |  |
| put_items | List Item | Reported on listing an item | Player Trading | fixed_price | Buy-Now Price | Number |  |
| bid_items | Bid on Item | Reported on bidding | Player Trading | item_id | Item ID | Text |  |
| bid_items | Bid on Item | Reported on bidding | Player Trading | item_num | Item Quantity | Number |  |
| bid_items | Bid on Item | Reported on bidding | Player Trading | bid_type | Bid Type | Text | Bid / Buy-Now |
| bid_items | Bid on Item | Reported on bidding | Player Trading | start_price | Starting Price | Number |  |
| bid_items | Bid on Item | Reported on bidding | Player Trading | offer_price | Bid Price | Number |  |
| deal_items | Item Transaction Closed | Reported on transaction closed | Player Trading | item_id | Item ID | Text |  |
| deal_items | Item Transaction Closed | Reported on transaction closed | Player Trading | item_num | Item Quantity | Number |  |
| deal_items | Item Transaction Closed | Reported on transaction closed | Player Trading | bid_type | Bid Type | Text | Bid / Buy-Now |
| deal_items | Item Transaction Closed | Reported on transaction closed | Player Trading | start_price | Starting Price | Number |  |
| deal_items | Item Transaction Closed | Reported on transaction closed | Player Trading | deal_price | Final Price | Number |  |
| stream_items | Item Unsold | Reported when item fails to sell | Player Trading | item_id | Item ID | Text |  |
| stream_items | Item Unsold | Reported when item fails to sell | Player Trading | item_num | Item Quantity | Number |  |
| stream_items | Item Unsold | Reported when item fails to sell | Player Trading | start_price | Starting Price | Number |  |
| start_transaction | Initiate Transaction | Each of the two trading parties reports one event; the two transaction events share the same transaction ID | Player Trading | transaction_id | Transaction ID | Text |  |
| start_transaction | Initiate Transaction | Each of the two trading parties reports one event; the two transaction events share the same transaction ID | Player Trading | our_id | Our Side ID | Text |  |
| start_transaction | Initiate Transaction | Each of the two trading parties reports one event; the two transaction events share the same transaction ID | Player Trading | rival_id | Counterparty ID | Text |  |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | transaction_id | Transaction ID | Text |  |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | our_id | Our Side ID | Text |  |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | rival_id | Counterparty ID | Text |  |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | give_item_info | Given Item Information | ObjectGroup | Example:<br>[{"item_id":"1","item_num":100},{"asset_id":"2","item_num":200},...] |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | give_item_info.item_id | Given Item ID | Text |  |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | give_item_info.item_num | Given Item Quantity | Number |  |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | receive_item_info | Received Item Information | ObjectGroup | Example:<br>[{"item_id":"1","transaction_num":100},{"asset_id":"2","transaction_num":200},...] |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | receive_item_info.item_id | Received Item ID | Text |  |
| complete_transaction | Transaction Completed | 1. Each of the two trading parties reports one event; the two transaction events share the same transaction ID<br>2. Report resource gain and consumption events at the same time | Player Trading | receive_item_info.item_num | Received Item Quantity | Number |  |
| apply_friend | Friend Request | Reported on sending a friend request | Social Gameplay | friend_id | Friend ID | Text |  |
| apply_friend | Friend Request | Reported on sending a friend request | Social Gameplay | apply_friend_type | Friend Request Type | Text | Targeted search, system recommendation, etc. |
| add_friend | Add Friend | Reported on adding a friend | Social Gameplay | friend_id | Friend ID | Text |  |
| del_friend | Delete Friend | Reported on deleting a friend | Social Gameplay | friend_id | Friend ID | Text |  |
| del_friend | Delete Friend | Reported on deleting a friend | Social Gameplay | friendship | Friendship Points | Number |  |
| give_gift | Send Gift | Reported on sending a gift | Social Gameplay | gift_id | Gift ID | Text |  |
| give_gift | Send Gift | Reported on sending a gift | Social Gameplay | gift_num | Gift Quantity | Number |  |
| give_gift | Send Gift | Reported on sending a gift | Social Gameplay | friend_id | Friend ID | Text |  |
| give_gift | Send Gift | Reported on sending a gift | Social Gameplay | friendship_change | Friendship Points Change | Number |  |
| give_gift | Send Gift | Reported on sending a gift | Social Gameplay | after_friendship | Friendship Points After Change | Number |  |
| receive_gift | Receive Gift | Reported on receiving a gift | Social Gameplay | gift_id | Gift ID | Text |  |
| receive_gift | Receive Gift | Reported on receiving a gift | Social Gameplay | gift_num | Gift Quantity | Number |  |
| receive_gift | Receive Gift | Reported on receiving a gift | Social Gameplay | friend_id | Friend ID | Text |  |
| receive_gift | Receive Gift | Reported on receiving a gift | Social Gameplay | friendship_change | Friendship Points Change | Number |  |
| receive_gift | Receive Gift | Reported on receiving a gift | Social Gameplay | after_friendship | Friendship Points After Change | Number |  |
| chat | Chat | Reported on chatting | Social Gameplay | channel_id | Channel ID | Text |  |
| chat | Chat | Reported on chatting | Social Gameplay | room_id | Room ID | Text |  |
| chat | Chat | Reported on chatting | Social Gameplay | target_player_id | Target Player ID | Text |  |
| chat | Chat | Reported on chatting | Social Gameplay | chat_content | Chat Content | Text |  |
| chat | Chat | Reported on chatting | Social Gameplay | hold_up | Whether Matched Prohibited Words Library | Text | Muted, normal, fraud lexicon, profanity lexicon, political lexicon, etc.; record based on actual situation |
| recruit | Recruit | Recorded after recruitment | Gacha | recruit_type | Gacha Type | Text | Standard version, premium version |
| recruit | Recruit | Recorded after recruitment | Gacha | recruit_times | Gacha Count | Number | 1, 5 |
| recruit | Recruit | Recorded after recruitment | Gacha | get_items | Obtained Items | ObjectGroup |  |
| recruit | Recruit | Recorded after recruitment | Gacha | cost_type | Cost Resource ID | Text |  |
| recruit | Recruit | Recorded after recruitment | Gacha | cost_num | Cost Amount | Number | Free = 0 |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | soldier_id | Soldier ID | Text |  |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | soldier_type | Soldier Type | Text |  |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | camp_type | Camp Type | Text |  |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | camp_level | Camp Level | Number |  |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | soldier_new_level | Soldier Current Level | Number |  |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | #duration | Event Duration | Number | Duration from start of training to completion |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | is_accelerate | Is Accelerated | Boolean |  |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | operation_type | Operation Method | Text | Upgrade / Instant Upgrade |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | cost_type | Cost Resource ID | Text |  |
| soldier_training | Soldier Training | Triggered when soldier training completes | Soldier Training | cost_num | Cost Amount | Number |  |
| unlock_area | Unlock Map | Recorded when the player unlocks a map | Map Related | area_id | Area ID | Number |  |
| unlock_area | Unlock Map | Recorded when the player unlocks a map | Map Related | unlock_type | Unlock Method | Text |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | building_type | Building Type | Text |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | building_id | Building ID | Number | ID of the constructed building |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | building_name | Building Name | Text |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | building_level | Level Before Upgrade | Number |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | building_new_level | Building Level After Upgrade | Number |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | cost_type | Cost Resource ID | Text |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | cost_num | Cost Amount | Number |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | operation_type | Operation Method | Text | Upgrade / Instant Upgrade |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | remaining_time | Remaining Time | Number |  |
| building_upgrade | Upgrade Building | Reported after the player completes a building upgrade | Building Upgrade | #duration | Event Duration | Number |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | module_type | Module Type | Text |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | module_id | Module ID | Number |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | module_name | Module Name | Text |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | is_help | Is Help | Text |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | cost_type | Cost Resource ID | Text |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | cost_num | Cost Amount | Number |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | remaining_time | Remaining Time | Number |  |
| acceleration | Module Acceleration | Reported on using acceleration | Module Acceleration | acceleration_duration | Acceleration Duration | Number |  |
| mail | Mail | Tracked when mail is sent successfully / attachment is claimed; for one-click claim, track per mail | Mail Module | mail_sender | Sender | Text |  |
| mail | Mail | Tracked when mail is sent successfully / attachment is claimed; for one-click claim, track per mail | Mail Module | mail_message | Mail Information | ObjectGroup |  |
| mail | Mail | Tracked when mail is sent successfully / attachment is claimed; for one-click claim, track per mail | Mail Module | mail_message.message_id | Mail ID | Text |  |
| mail | Mail | Tracked when mail is sent successfully / attachment is claimed; for one-click claim, track per mail | Mail Module | mail_message.sender_item | Attached Items | Text |  |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | main_id | Stage ID | Text | For example: 12-1 |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | is_first | Is First Time | Boolean | Yes / No |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | total_power | Total Combat Power in Battle | Number |  |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info | Our Side Hero Information | ObjectGroup | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info.index | Our Side Hero Lineup Position | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info.hero_id | Our Side Hero ID | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info.hero_level | Our Side Hero Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info.hero_star | Our Side Hero Star Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info.hero_quality | Our Side Hero Grade | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info.hero_power | Our Side Hero Combat Power | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_start | Main Storyline Stage Battle Start | Main storyline stage<br>reported on battle start | Main Storyline | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | main_id | Stage ID | Text | For example: 12-1 |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | is_first | Is First Time | Boolean | Yes / No |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | total_power | Total Combat Power in Battle | Number |  |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info | Our Side Hero Information | ObjectGroup | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info.index | Our Side Hero Lineup Position | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info.hero_id | Our Side Hero ID | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info.hero_level | Our Side Hero Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info.hero_star | Our Side Hero Star Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info.hero_quality | Our Side Hero Grade | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info.hero_power | Our Side Hero Combat Power | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_win | Main Storyline Stage Battle Win | Main storyline stage<br>reported after winning | Main Storyline | duration | Elapsed Time | Number | Unit: seconds |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | main_id | Stage ID | Text | For example: 12-1 |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | is_first | Is First Time | Boolean | Yes / No |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | total_power | Total Combat Power in Battle | Number |  |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info | Our Side Hero Information | ObjectGroup | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info.index | Our Side Hero Lineup Position | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info.hero_id | Our Side Hero ID | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info.hero_level | Our Side Hero Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info.hero_star | Our Side Hero Star Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info.hero_quality | Our Side Hero Grade | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info.hero_power | Our Side Hero Combat Power | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | fail_reason | Failure Reason | Text |  |
| main_fail | Main Storyline Stage Battle Fail | Main storyline stage<br>reported after losing | Main Storyline | duration | Elapsed Time | Number | Unit: seconds |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | battle_type | Battle Type | Text |  |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | battle_id | Battle ID | Text |  |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | boss_id | boss id | Text |  |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | boss_power | boss Combat Power | Number |  |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | is_team | Is Team Challenge | Boolean |  |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | total_power | Total Combat Power in Battle | Number |  |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | c | Our Side Hero Information | ObjectGroup | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | hero_info.index | Our Side Hero Lineup Position | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | hero_info.hero_id | Our Side Hero ID | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | hero_info.hero_level | Our Side Hero Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | hero_info.hero_star | Our Side Hero Star Level | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | hero_info.hero_quality | Our Side Hero Grade | Text | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | hero_info.hero_power | Our Side Hero Combat Power | Number | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_start | Dungeon Challenge Start | Dungeon challenge<br>reported on battle start | Dungeon | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | battle_type | Battle Type | Text |  |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | battle_id | Battle ID | Text |  |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | boss_id | boss id | Text |  |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | boss_power | boss Combat Power | Number |  |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | is_team | Is Team Challenge | Boolean |  |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | total_power | Total Combat Power in Battle | Number |  |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info | Our Side Hero Information | ObjectGroup | Example:<br><br>"hero_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info.index | Our Side Hero Lineup Position | Text | (same JSON example as above) |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info.hero_id | Our Side Hero ID | Text | (same JSON example as above) |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info.hero_level | Our Side Hero Level | Number | (same JSON example as above) |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info.hero_star | Our Side Hero Star Level | Number | (same JSON example as above) |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info.hero_quality | Our Side Hero Grade | Text | (same JSON example as above) |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info.hero_power | Our Side Hero Combat Power | Number | (same JSON example as above) |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | (same JSON example as above) |
| battle_win | Dungeon Challenge Win | Dungeon challenge<br>reported after winning | Dungeon | duration | Elapsed Time | Number | Unit: seconds |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | battle_type | Battle Type | Text |  |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | battle_id | Battle ID | Text |  |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | boss_id | boss id | Text |  |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | boss_power | boss Combat Power | Number |  |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | is_team | Is Team Challenge | Boolean |  |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | total_power | Total Combat Power in Battle | Number |  |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info | Our Side Hero Information | ObjectGroup | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info.index | Our Side Hero Lineup Position | Text | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info.hero_id | Our Side Hero ID | Text | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info.hero_level | Our Side Hero Level | Number | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info.hero_star | Our Side Hero Star Level | Number | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info.hero_quality | Our Side Hero Grade | Text | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info.hero_power | Our Side Hero Combat Power | Number | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | (same JSON example as above) |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | fail_reason | Failure Reason | Text | Reported on battle failure |
| battle_fail | Dungeon Challenge Fail | Dungeon challenge<br>reported after losing | Dungeon | duration | Elapsed Time | Number | Unit: seconds |
| mopping_up | Mopping Up | Reported when mopping up completes | Mopping Up | battle_type | Battle Type | Text |  |
| mopping_up | Mopping Up | Reported when mopping up completes | Mopping Up | battle_id | Battle ID | Text |  |
| mopping_up | Mopping Up | Reported when mopping up completes | Mopping Up | mop_num | Mop Count | Number |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | battle_type | Battle Type | Text |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | battle_id | Battle ID | Text |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_id | Counterparty ID | Text |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_rank | Rival Rank | Number |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | is_bot | Is Bot | Boolean | Yes / No |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | arena_rank | Our Side Rank | Number |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | total_power | Total Combat Power in Battle | Number |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info | Our Side Hero Information | ObjectGroup | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info.index | Our Side Hero Lineup Position | Text | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info.hero_id | Our Side Hero ID | Text | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info.hero_level | Our Side Hero Level | Number | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info.hero_star | Our Side Hero Star Level | Number | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info.hero_quality | Our Side Hero Grade | Text | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info.hero_power | Our Side Hero Combat Power | Number | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | (same JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_power | Rival Combat Power | Number |  |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info | Counterparty Hero Information | ObjectGroup | Example:<br><br>"rival_info":<br>[<br>{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quality":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},<br>{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quality":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400}<br>] |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info.index | Rival Hero Position | Text | (same rival_info JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info.hero_id | Rival Hero ID | Text | (same rival_info JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info.hero_level | Rival Hero Level | Number | (same rival_info JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info.hero_star | Rival Hero Star Level | Number | (same rival_info JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info.hero_quality | Rival Hero Grade | Text | (same rival_info JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info.hero_power | Rival Hero Combat Power | Number | (same rival_info JSON example as above) |
| arena_start | Arena Start Challenge | Arena or other PvP gameplay<br>reported on battle start | Arena | rival_info.hero_equipment_list | Rival Hero Equipment List | List | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | battle_type | Battle Type | Text |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | battle_id | Battle ID | Text |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_id | Counterparty ID | Text |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | before_rival_rank | Current Rival Rank | Number |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | before_rival_score | Current Rival Score | Number |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | is_bot | Is Bot | Boolean | Yes / No |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | before_arena_rank | Current Our Side Rank | Number |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | before_arena_score | Current Our Side Score | Number |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | total_power | Total Combat Power in Battle | Number |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info | Our Side Hero Information | ObjectGroup | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info.index | Our Side Hero Lineup Position | Text | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info.hero_id | Our Side Hero ID | Text | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info.hero_level | Our Side Hero Level | Number | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info.hero_star | Our Side Hero Star Level | Number | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info.hero_quality | Our Side Hero Grade | Text | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info.hero_power | Our Side Hero Combat Power | Number | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | (same hero_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_power | Rival Combat Power | Number |  |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info | Counterparty Hero Information | ObjectGroup | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info.index | Rival Hero Position | Text | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info.hero_id | Rival Hero ID | Text | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info.hero_level | Rival Hero Level | Number | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info.hero_star | Rival Hero Star Level | Number | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info.hero_quality | Rival Hero Grade | Text | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info.hero_power | Rival Hero Combat Power | Number | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_info.hero_equipment_list | Rival Hero Equipment List | List | (same rival_info JSON example as above) |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | duration | Elapsed Time | Number | Unit: seconds |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_rank | Rival Rank | Number | Rival rank after battle |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | arena_rank | Our Side Rank | Number | Our side rank after battle |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | rival_score | Rival Score | Number | Rival score after battle |
| arena_win | Arena Battle Win | Arena or other PvP gameplay<br>reported on winning | Arena | arena_score | Our Side Score | Number | Our side score after battle |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | battle_type | Battle Type | Text |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | battle_id | Battle ID | Text |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_id | Counterparty ID | Text |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | before_rival_rank | Current Rival Rank | Number |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | before_rival_score | Current Rival Score | Number |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | is_bot | Is Bot | Boolean | Yes / No |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | before_arena_rank | Current Our Side Rank | Number |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | before_arena_score | Current Our Side Score | Number |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | total_power | Total Combat Power in Battle | Number |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info | Our Side Hero Information | ObjectGroup | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info.index | Our Side Hero Lineup Position | Text | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info.hero_id | Our Side Hero ID | Text | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info.hero_level | Our Side Hero Level | Number | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info.hero_star | Our Side Hero Star Level | Number | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info.hero_quality | Our Side Hero Grade | Text | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info.hero_power | Our Side Hero Combat Power | Number | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | hero_info.hero_equipment_list | Our Side Hero Equipment List | List | (same hero_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_power | Rival Combat Power | Number |  |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info | Counterparty Hero Information | ObjectGroup | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info.index | Rival Hero Position | Text | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info.hero_id | Rival Hero ID | Text | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info.hero_level | Rival Hero Level | Number | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info.hero_star | Rival Hero Star Level | Number | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info.hero_quality | Rival Hero Grade | Text | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info.hero_power | Rival Hero Combat Power | Number | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_info.hero_equipment_list | Rival Hero Equipment List | List | (same rival_info JSON example as above) |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | fail_reason | Failure Reason | Text | Reported on battle failure |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | duration | Elapsed Time | Number | Unit: seconds |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_rank | Rival Rank | Number | Rival rank after battle |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | arena_rank | Our Side Rank | Number | Our side rank after battle |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | rival_score | Rival Score | Number | Rival score after battle |
| arena_fail | Arena Battle Fail | Arena or other PvP gameplay<br>reported on losing | Arena | arena_score | Our Side Score | Number | Our side score after battle |
| map_explore | Map Exploration | Reported on map exploration | Map Exploration | map_id | Map ID | Text |  |
| map_explore | Map Exploration | Reported on map exploration | Map Exploration | explore_type | Exploration Method | Text | Obtain map resource / complete map task / unlock map main city, etc. |
| map_explore | Map Exploration | Reported on map exploration | Map Exploration | increase_rate | Exploration Progress Increase | Number |  |
| save_team | Save Team | Reported on saving a team | Save Team | team_id | Team ID | Text |  |
| save_team | Save Team | Reported on saving a team | Save Team | team_name | Team Name | Text |  |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info | Our Side Hero Information | ObjectGroup | Example:<br>[{"index":"1",hero_id":"1","hero_level":100,"hero_star":4,"hero_quanlity":"Purple+2","hero_equipment_list":["Sword","Shield"],"hero_power":500},{"index":"2","hero_id":"2","hero_level":200,"hero_star":3,"hero_quanlity":"Purple+1","hero_equipment_list":["Staff"],"hero_power":400},...] |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info.index | Our Side Hero Lineup Position | Text |  |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info.hero_id | Our Side Hero ID | Text |  |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info.hero_level | Our Side Hero Level | Number |  |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info.hero_star | Our Side Hero Star Level | Number |  |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info.hero_quality | Our Side Hero Grade | Text |  |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info.hero_power | Our Side Hero Combat Power | Number |  |
| save_team | Save Team | Reported on saving a team | Save Team | hero_info.hero_equipment_list | Our Side Hero Equipment List | List |  |
| unlock_machine | Unlock Machine | Reported on unlocking a machine | Machine | machine_id | Machine ID | Number |  |
| unlock_machine | Unlock Machine | Reported on unlocking a machine | Machine | machine_name | Machine English Name | Text |  |
| enter_machine | Enter Machine | Reported on entering a machine | Machine | machine_id | Machine ID | Number |  |
| enter_machine | Enter Machine | Reported on entering a machine | Machine | machine_name | Machine English Name | Text |  |
| enter_machine | Enter Machine | Reported on entering a machine | Machine | if_first_enter | Is First Entry | Boolean |  |
| leave_machine | Leave Machine | Reported on leaving a machine | Machine | machine_id | Machine ID | Number |  |
| leave_machine | Leave Machine | Reported on leaving a machine | Machine | machine_name | Machine English Name | Text |  |
| leave_machine | Leave Machine | Reported on leaving a machine | Machine | if_first_enter | Is First Entry | Boolean |  |
| leave_machine | Leave Machine | Reported on leaving a machine | Machine | #duration | Event Duration | Number | Unit: seconds |
| spin_start | Spin Start | Reported on spin start | spin | machine_id | Machine ID | Number |  |
| spin_start | Spin Start | Reported on spin start | spin | machine_name | Machine English Name | Text |  |
| spin_start | Spin Start | Reported on spin start | spin | enter_machine_time | Time of Entering This Machine | Datetime |  |
| spin_start | Spin Start | Reported on spin start | spin | if_first_enter | Is First Entry | Boolean |  |
| spin_start | Spin Start | Reported on spin start | spin | machine_gid | Round ID | Text | Unique id for one round of spin |
| spin_start | Spin Start | Reported on spin start | spin | total_bet | Bet Size | Number |  |
| spin_start | Spin Start | Reported on spin start | spin | total_bet_lv | Bet Tier | Number |  |
| spin_start | Spin Start | Reported on spin start | spin | total_bet_value | Bet USD Value | Number |  |
| spin_start | Spin Start | Reported on spin start | spin | use_rtp | Reel-Band RTP | Text | Which reel-band set the bet belongs to |
| spin_start | Spin Start | Reported on spin start | spin | is_auto | Is AUTO | Boolean |  |
| spin_start | Spin Start | Reported on spin start | spin | is_maxbet | Is Maxbet | Boolean | Whether maximum bet |
| spin_start | Spin Start | Reported on spin start | spin | positive_cistern | Positive Pool Balance | Number |  |
| spin_start | Spin Start | Reported on spin start | spin | negative_cistern | Negative Pool Balance | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | machine_id | Machine ID | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | machine_name | Machine English Name | Text |  |
| spin_end | Spin End | Reported when the result is returned | spin | enter_machine_time | Time of Entering This Machine | Datetime |  |
| spin_end | Spin End | Reported when the result is returned | spin | if_first_enter | Is First Entry | Boolean |  |
| spin_end | Spin End | Reported when the result is returned | spin | machine_gid | Round ID | Text | Unique id for one round of spin |
| spin_end | Spin End | Reported when the result is returned | spin | total_bet | Bet Size | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | total_bet_lv | Bet Tier | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | total_bet_value | Bet USD Value | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | win | Win Value | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | win_value | Win USD Value | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | win_mul | Win Multiplier | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | feature_type | Feature Type | List |  |
| spin_end | Spin End | Reported when the result is returned | spin | jackpot_win | Jackpot Win Value | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | jackpot_win_value | Jackpot Win USD Value | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | jackpot_win_mul | Jackpot Win Multiplier | Number |  |
| spin_end | Spin End | Reported when the result is returned | spin | use_rtp | Reel-Band RTP | Text | Which reel-band set the bet belongs to |
| spin_end | Spin End | Reported when the result is returned | spin | is_auto | Is AUTO | Boolean |  |
| spin_end | Spin End | Reported when the result is returned | spin | is_maxbet | Is Maxbet | Boolean | Whether maximum bet |
| spin_end | Spin End | Reported when the result is returned | spin | machine_cistern | Pool Balance | Number |  |
| bankrupt | Bankrupt | Reported on going bankrupt | Bankrupt | machine_id | Machine ID | Number |  |
| bankrupt | Bankrupt | Reported on going bankrupt | Bankrupt | total_bet | Bet Size | Number |  |
| bankrupt | Bankrupt | Reported on going bankrupt | Bankrupt | total_bet_lv | Bet Tier | Number |  |
| bankrupt | Bankrupt | Reported on going bankrupt | Bankrupt | total_bet_value | Bet USD Value | Number |  |
