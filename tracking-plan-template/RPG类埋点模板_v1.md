# RPG类埋点模板_v1

## 事件数据

| 事件名 | 显示名 | 说明 | 标签 | 平台 | 属性 |
| --- | --- | --- | --- | --- | --- |
| ta_app_install | 游戏安装 | 客户端开启自动采集后，即可采集 |  |  |  |
| ta_app_start | 游戏启动 | 在游戏启动时触发，需开始计时（客户端开启自动采集后，即可采集） |  |  |  |
| ta_app_end | 游戏登出 | 游戏登出时记录，结束计时（客户端开启自动采集后，即可采集） |  |  | #duration |
| user_account_register | 账号注册 | 新增玩家账号时记录 |  |  |  |
| user_account_login | 账号登录 | 玩家登录游戏时记录 |  |  |  |
| create_role | 创建角色 | 用户创建角色时记录 |  |  |  |
| role_login | 角色登录 | 角色登录时记录 |  |  |  |
| guide_complete | 完成新手引导 | 完成新手引导每一步时记录 |  |  | guide_step |
| order_init | 发起订单 | 用户发起充值订单 |  |  | order_id, pay_amount, pay_reason, is_first_pay |
| order_finish | 订单完成 | 订单完成 |  |  | order_id, pay_amount, pay_reason, is_first_pay, pay_method |
| buy_item | 商品购买 | 代币购买时触发 |  |  | goods_id, goods_num, cost_type, cost_num |
| diamond_get | 钻石获取 | 获得钻石（或与实际货币挂钩的代币）时触发 |  |  | diamond_get_amount, diamond_change_after, change_reason |
| diamond_consume | 钻石消耗 | 消耗钻石（或与实际货币挂钩的代币）时触发 |  |  | diamond_cost_amount, diamond_change_after, change_reason |
| resource_change | 资源变动 | 资源或道具发生变化时记录 |  |  | item_id, item_type, change_type, change_num, change_after, change_reason |
| start_dungeon | 关卡挑战 | 挑战关卡结算时记录 |  |  | dungeon_id, is_first_try, enemy_fight, own_fight, fairy_id, holy_id, fight_duration, is_win |
| ice_cave | 冰晶洞窟 | 冰晶洞窟挑战结算时记录 |  |  | layers_num, is_first_try, enemy_fight, own_fight, fairy_id, holy_id, fight_duration, is_win |
| daily_instance | 日常副本 | 日常副本挑战结算时记录 |  |  | instance_type, is_first_try, enemy_fight, own_fight, fairy_id, holy_id, fight_duration, is_win |
| arena | 角斗场 | 角斗场挑战对手结算时记录 |  |  | enemy_fight, own_fight, is_win, score |
| speed_hunting | 魔塔的挑战-竞速狩猎 | 每个区域的最后一关挑战完成时上报 |  |  | area_name, last_enemy_fight, last_own_fight, last_fairy_id, last_holy_id, total_duration |
| mystery | 魔塔的挑战-凯恩之谜 | 战斗结束时上报 |  |  | dungeon_id, enemy_fight, own_fight, fairy_id, holy_id, fight_duration, damage_value |
| dragon_des | 龙之后裔 | 战斗结束时上报 |  |  | dungeon_id, is_first_try, enemy_fight, own_fight, fairy_id, holy_id, fight_duration, is_win |
| role_level_up | 角色等级提升 | 角色等级变化时上报 |  |  | new_level |
| equipment_up | 装备强化 | 装备强化升级时上报 |  |  | equipment_part, equipment_level |
| contract_up | 契约升级 | 契约升级时上报 |  |  | contract_level |
| holy_active | 圣物激活 | 圣物激活时上报 |  |  | holy_id |
| holy_up | 圣物升级 | 圣物升级时上报 |  |  | holy_id, holy_level, holy_total_level |
| position_change | 转职 | 角色转职时记录 |  |  | position_name |
| gift_up | 天赋升级 | 天赋升级时上报 |  |  | gift_type, gift_level, gift_total_level |
| magical_unlock | 幻化解锁 | 幻化解锁时上报 |  |  | magical_name |
| rune_up | 符文 | 符文等级提升 |  |  | rune_name, rune_level, rune_total_level |
| fairy_get | 精灵获得 | 获取精灵时上报 |  |  | fairy_id |
| fairy_level_up | 精灵升级 | 精灵完成升级时上报，连续升级可上报一次或多次 |  |  | fairy_id, fairy_level_before, fairy_level_after |
| fairy_train | 精灵培养 | 精灵培养阶段提升时记录 |  |  | fairy_id, train_stage |
| fairy_gift_get | 精灵专属激活 | 精灵专属激活时上报 |  |  | fairy_id, fairy_gift_name |
| fairy_evolution | 精灵进化 | 精灵进化解锁新形象时记录 |  |  | fairy_id, image_name |
| guild_deed | 公会行为 | 操作时记录，分为加入、创建、离开 |  |  | opt, guild_level, guild_id, guild_position |
| guild_tech | 公会科技 | 升级时记录 |  |  | guild_level, tech_id, tech_level |
| warcraft | 魔兽入侵 | 魔兽入侵挑战结束时上报 |  |  | enemy_fight, own_fight, fairy_id, holy_id, fight_duration, warcraft_blood, damage_value |
| colossus | 异界巨像 | 战斗结束时上报 |  |  | enemy_fight, own_fight, fairy_id, holy_id, fight_duration, damage_value |
| main_task | 主线任务 | 主线任务完成时上报 |  |  | task_id |
| rank_event | 排行榜事件 |  |  |  | server_id, rank_name, guild_id, sort, current_dungeon, current_layer, current_score |

## 公共事件属性

| 属性名 | 显示名 | 类型 | 说明 |
| --- | --- | --- | --- |
| sever_id | 区服ID | string | 事件发生时玩家的所属区服 |
| user_account | 玩家账号 | string | 角色的从属玩家账号 |
| role_level | 角色等级 | number | 事件发生时角色等级 |

## 用户数据

| 属性名 | 显示名 | 类型 | 更新方式 | 说明 | 标签 |
| --- | --- | --- | --- | --- | --- |
| channel | 注册渠道 | string | user_setOnce | 在游戏启动时设置，上传用户的渠道信息，如app store、应用宝等 |  |
| register_time | 注册时间 | datetime | user_setOnce | 玩家账号新增时设置 |  |
| user_account | 玩家账号 | string | user_setOnce |  |  |
| sever_id | 区服ID | string | user_setOnce | 玩家所在的服务器ID |  |
| initial_hero | 初始英雄 | string | user_setOnce | 首次登录时选取的初始英雄 |  |
| first_create_role_time | 创角时间 | datetime | user_setOnce | 创角时间 |  |
| first_pay_time | 首次充值时间 | datetime | user_setOnce | 首次充值时记录 |  |
| role_level | 当前角色等级 | number | user_set | 等级变动时上报；若更新太过频繁可以登录或退出时上报 |  |
| current_dungeon | 当前主线关卡 | number | user_set | 关卡变动时上报；若更新太过频繁可以登录或退出时上报 |  |
| current_diamond | 当前钻石数 | number | user_set | 变动时上报；若更新太过频繁可以登录或退出时上报 |  |
| current_coin | 当前金币数 | number | user_set | 变动时上报；若更新太过频繁可以登录或退出时上报 |  |
| current_energy | 当前战斗力 | number | user_set | 变动时上报；若更新太过频繁可以登录或退出时上报 |  |
