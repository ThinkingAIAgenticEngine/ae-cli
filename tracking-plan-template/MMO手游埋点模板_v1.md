# MMO手游埋点模板_v1

## 事件数据

| 事件名 | 显示名 | 说明 | 标签 | 平台 | 属性 |
| --- | --- | --- | --- | --- | --- |
| ta_app_install | 游戏安装 | 客户端开启自动采集后，即可采集 |  |  |  |
| ta_app_start | 游戏启动 | 在游戏启动时触发，需开始计时（客户端开启自动采集后，即可采集） |  |  |  |
| ta_app_end | 游戏登出 | 游戏登出时记录，结束计时（客户端开启自动采集后，即可采集） |  |  | #duration |
| account_register | 账号注册 | 注册玩家账号UID时记录 |  |  |  |
| account_login | 账号登录 | 登录玩家账号UID时记录 |  |  |  |
| create_role | 创建角色 | 用户创建角色时记录 |  |  |  |
| role_login | 角色登录 | 角色登录时记录 |  |  |  |
| logout | 角色登出 | 登出日志 |  |  | online_time |
| vip_level_up | vip等级提升 | vip等级提升时记录 |  |  | old_level, new_level |
| role_level_up | 角色等级提升 | 角色等级提升时记录 |  |  | old_level, new_level |
| shop_buy | 商城购买 | 商城购买商品后触发 |  |  | shop_type, goods_type, goods_id, goods_num, cost_type, cost_num |
| order_init | 发起订单 | 用户发起付费订单 |  |  | order_id, currency, pay_amount, pay_item_type, pay_item, is_first_pay |
| order_finish | 订单完成 | 订单完成时记录 |  |  | order_id, currency, pay_amount, pay_item_type, pay_item, is_first_pay, pay_method |
| diamond_get | 钻石获取 | 获得钻石（或与实际货币挂钩的代币）时触发 |  |  | diamond_get_amount, diamond_change_after, change_reason |
| diamond_consume | 钻石消耗 | 消耗钻石（或与实际货币挂钩的代币）时触发 |  |  | diamond_cost_amount, diamond_change_after, change_reason |
| token_get | 代币获取 | 获得代币时触发 |  |  | token_id, get_amount, change_after, change_reason |
| token_consume | 代币消耗 | 消耗代币时触发 |  |  | token_id, cost_amount, change_after, change_reason |
| resource_change | 资源变动 | 资源或道具发生变化时记录 |  |  | item_id, item_type, change_type, change_num, change_after, change_reason |
| llusory_skill | 幻光技能 | 幻光技能激活和进阶 |  |  | skill_id, step_level, star_level |
| soul_power | 魂力 | 魂力进阶/突破时记录 |  |  | new_level, change_type |
| profession_change | 转职 | 转职后记录 |  |  | profession |
| get_skill | 解锁技能 | 角色获得新技能后记录 |  |  | skill_id, skill_name |
| study_skill | 学习技能 | 角色学习技能后记录 |  |  | skill_id, skill_name |
| up_skill | 升级技能 | 角色技能升级时记录 |  |  | skill_id, skill_name, new_level |
| prop_step_up | 道具进阶 | 座驾/炫翼等等进阶时记录 |  |  | type, step_level, star_level |
| prop_skill_up | 道具技能升级 | 座驾/炫翼等等相关技能升级时记录 |  |  | type, skill_id, new_level |
| treasure_up | 珍宝升星 | 珍宝激活/升星时记录 |  |  | type, treasure_id, star_level |
| equip_strengthen | 装备强化 | 装备强化时记录 |  |  | equip_type, equip_id, new_level, promote_power |
| equip_evolution | 装备进化 | 装备进化时记录 |  |  | equip_type, equip_id, star_level, promote_power |
| equip_gem_set | 装备镶嵌宝石 | 装备镶嵌宝石时记录 |  |  | equip_type, equip_id, jewel_id, promote_power, jewel_list |
| get_spirit | 获得战魂 | 龙神宝库寻宝获得战魂时记录 |  |  | recruit_type, spirit_list, cost_type, cost_num |
| spirit_strengthen | 战魂强化 | 战魂强化时记录 |  |  | intensify_times, spirit_id, promote_power, new_level |
| spirit_evolution | 战魂进化 | 战魂进化时记录 |  |  | spirit_id, promote_power, star_level |
| join_guild | 加入社团 | 加入他人社团时触发 |  |  | guild_level, guild_id, guild_name, guild_position |
| leave_guild | 离开社团 | 退出社团时触发 |  |  | guild_level, guild_id, guild_name, guild_position |
| create_guild | 创建社团 | 自己创建社团时触发 |  |  | guild_level, guild_id, guild_name |
| guild_activity | 社团活动 | 参加社团活动时记录 |  |  | guild_level, guild_id, guild_name, activity_name, active_nums |
| add_friend | 添加好友请求 | 发送添加申请时记录 |  |  | friend_id, scene |
| delete_friend | 删除好友 | 成功删除好友后，上报该埋点 |  |  | friend_id |
| respond_friend | 响应添加 | 对收到的好友申请，成功完成操作后，上报该埋点 |  |  | friend_id, if_pass_friend |
| task_receive | 领取任务 | 领取任务时记录 |  |  | task_id, task_name, task_type |
| task_completed | 完成任务 | 完成任务时记录 |  |  | task_id, task_name, task_type, duration |
| copy_start | 进入副本 | 进入副本时记录 |  |  | copy_type, copy_id, boss_id |
| copy_end | 退出副本 | 退出副本时记录 |  |  | copy_type, copy_id, boss_id, is_win, duration |
| auction | 拍卖 | 拍卖物品竞价时记录 |  |  | auction_id, auction_item_id, auction_item_type, quote_price |
| reward_get | 奖励 | 点击领取时记录 |  |  | reward_name |
| daily_sign | 每日签到 | 签到领取奖励时记录 |  |  | sign_days |
| invite_gift | 邀请礼包 | 邀请礼包领取奖励 |  |  | active_code |
| active_level_up | 活跃等级升级 | 活跃等级升级时记录 |  |  | old_level, new_level |
| daily_task | 日常任务 | 点击领取时记录 |  |  | task_name, active_nums |
| trusteeship | 托管 | 托管参与活动 |  |  | activity_name, trust_nums |
| retrieve | 游戏找回 | 游戏内容找回时记录 |  |  | activity_name, times |
| achieve_task | 成就任务 | 成就任务领取奖励时记录 |  |  | task_name, exp_get |
| achieve_level_up | 成就升级 | 成就等级升级时记录 |  |  | old_level, new_level |
| turntable | 源能转盘 | 源能转盘抽奖时记录 |  |  | draw_type, reward_name, cost_type, cost_num |
| contest_league | 竞技联赛 | 竞技联赛挑战结算时记录 |  |  | enemy_rank, enemy_fight, own_rank, own_fight, is_win, exp_get, fame_get, current_rank |
| copy_challenge | 挑战副本（材料副本） | 挑战副本结算时记录 |  |  | copy_type, duration, current_rating, settle_rating |
| copy_mopup | 扫荡副本 | 扫荡副本后记录 |  |  | copy_type, cost_type, cost_num |
| endless_corridor | 无尽回廊 | 无尽回廊挑战结算时记录 |  |  | mode, layer, own_fight, is_win, star_num, duration |
| llusory_light | 幻光副本 | 幻光副本结算时记录 |  |  | current_sections, current_rounds, is_win |
| vip_treasure | VIP宝藏挑战 | vip宝藏结算时记录 |  |  | vip_level, is_win |
| place_adventure | 放置冒险 | 放置冒险结算时记录 |  |  | feat_rounds, duration |
| role_die | 角色死亡 | 角色死亡时记录 |  |  | die_reason |
| online_count | 在线表 | 非玩家维度数据，建立一个虚拟用户ID，服务端定时上传在线人数事件。 |  |  | server_id, amount |

## 公共事件属性

| 属性名 | 显示名 | 类型 | 说明 |
| --- | --- | --- | --- |
| channel | 渠道 | string | 渠道信息 |
| server_id | 区服ID | string | 事件发生时玩家的所属区服 |
| uid | 玩家账号 | string | 角色的从属玩家账号 |
| vip_level | 当前vip等级 | number | 事件发生时角色vip等级 |
| role_level | 当前角色等级 | number | 事件发生时角色等级 |
| guild_id | 当前社团 | string | 事件发生时所属社团 |
| profession | 当前职业 | string | 事件发生时角色职业 |
| current_power | 当前战力 | number | 事件发生时角色战力 |

## 用户数据

| 属性名 | 显示名 | 类型 | 更新方式 | 说明 | 标签 |
| --- | --- | --- | --- | --- | --- |
| channel | 渠道 | string | user_setOnce | 玩家的渠道信息 |  |
| register_time | 注册时间 | datetime | user_setOnce | 角色上层的玩家账号注册时间 |  |
| uid | 玩家账号 | string | user_setOnce | 角色上层的玩家账号 |  |
| server_id | 区服ID | string | user_setOnce | 玩家所在的区服ID |  |
| is_roll | 是否滚服用户 | bool | user_setOnce | 是，否 |  |
| initial_hero | 初始英雄 | string | user_setOnce | 选取的初始英雄 |  |
| create_role_time | 创角时间 | datetime | user_setOnce | 创角时间 |  |
| first_pay_time | 首次付费时间 | datetime | user_setOnce | 首次充值付费时记录 |  |
| first_pay_item | 首次付费项目名 | datetime | user_setOnce | 首次付费时记录购买项目名 |  |
| guild_id | 当前社团 | string | user_set | 变动时记录 |  |
| profession | 当前职业 | string | user_set | 变动时记录 |  |
| vip_level | 当前vip等级 | number | user_set | 等级变动时上报； |  |
| role_level | 当前角色等级 | number | user_set | 等级变动时上报； |  |
| current_power | 当前战力 | number | user_set | 变动时上报；若更新太过频繁可以登录或退出时上报 |  |
| colorful_diamond | 当前彩钻 | number | user_set | 变动时上报；若更新太过频繁可以登录或退出时上报 |  |
| red_diamond | 当前红钻 | number | user_set | 变动时上报；若更新太过频繁可以登录或退出时上报 |  |
