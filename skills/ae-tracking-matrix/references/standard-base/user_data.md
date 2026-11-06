# Standard Base - User Data

> Source: Feishu sheets `M71zsVFKihDEKXtZJjZcOkAvn5b` / sheet "User Data", cached on 2026-09-20. The cloud copy is the authoritative version; the cloud takes precedence on conflict.

| Property Name | Property Display Name | Property Type | Update Method | Property Description |
|---|---|---|---|---|
| device_id | Device ID | Text | user_setOnce | Set when the game starts / at registration |
| channel | Registration Channel | Text | user_setOnce | Set when the game starts / at registration; uploads the user's channel info, such as app store, Yingyongbao, etc. |
| account | Account | Text | user_setOnce | Recorded at registration |
| server_id | Server ID | Text | user_setOnce | Recorded at role creation |
| player_id | Role ID | Text | user_setOnce | Recorded at role creation |
| role_type | Role Class | Text | user_setOnce | Recorded at role creation |
| nick_name | Role Nickname | Text | user_set | Overwrites on update |
| is_roll | Is Server-Rolling | Boolean | user_setOnce | Recorded at role creation |
| current_level | Current Level | Number | user_set | Recorded when the player's level changes |
| current_vip_level | Current VIP Level | Number | user_set | Recorded when the player's VIP level changes |
| current_power | Current Total Combat Power | Number | user_set | Set at each login / logout |
| current_main_id | Current Main Storyline Stage Progress | Text | user_set | Recorded each time a new main-storyline stage is cleared |
| current_pvp_winrate | Current Arena Win Rate | Number | user_set | Set at each login / logout |
| current_pvp_rank | Current Arena Rank | Number | user_set | Set each time the arena rank changes |
| current_pvp_maxwin | Current Arena Max Win Streak | Number | user_set | Set at each login / logout |
| current_explore_rate | Current Map Exploration Progress | Number | user_set | Set at each login / logout |
| hero_info | Hero / General / Card Details | ObjectGroup | user_set | Set at each login / logout |
| hero_info.hero_id | Hero ID | Text | user_set | Set at each login / logout |
| hero_info.hero_level | Hero Level | Number | user_set | Set at each login / logout |
| hero_info.hero_star | Hero Star Level | Number | user_set | Set at each login / logout |
| hero_info.hero_quanlity | Hero Grade | Text | user_set | Set at each login / logout |
| hero_info.hero_power | Hero Combat Power | Number | user_set | Set at each login / logout |
| hero_info.hero_equipment_list | Hero Equipment List | List | user_set | Set at each login / logout |
| guild_id | Current Guild | Text | user_set | Set each time it changes |
| bag_info | Inventory Details | ObjectGroup | user_set | Set at each login / logout |
| bag_info.item_id | Inventory Item ID | Text | user_set | Set at each login / logout |
| bag_info.item_type | Inventory Item Type | Text | user_set | Set at each login / logout |
| bag_info.item_num | Inventory Item Count | Number | user_set | Set at each login / logout |
| register_time | User Added Time | Datetime | user_setOnce | Recorded when the user is added (activation / registration / role-creation time; consistent with the user ID system) |
| first_login_time | First Login Time | Datetime | user_setOnce | Recorded at first login |
| last_login_time | Last Login Time | Datetime | user_set | Overwrites at each login |
| first_pay_time | First Recharge Time | Datetime | user_setOnce | Recorded at first recharge completion |
| last_pay_time | Last Recharge Time | Datetime | user_set | Overwrites at each recharge completion |
| total_pay_amount | Total Payment Amount | Number | user_set | Overwrites at each recharge completion (user_add may also be used) |
| total_pay_times | Total Payment Count | Number | user_set | Incremented at each recharge completion (user_add may also be used) |
| total_login_day | Total Login Days | Number | user_set | Set at each login / logout |
| current_coin | Current Silver Coins | Number | user_set | Set at each login / logout |
| current_gold | Current Gold Ingots | Number | user_set | Set at each login / logout |
| current_jade | Current Jade | Number | user_set | Set at each login / logout |
| current_diomand | Current Diamonds | Number | user_set | Set at each login / logout |
