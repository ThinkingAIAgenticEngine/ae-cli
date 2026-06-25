# SLG游戏埋点模板_v1

## 事件数据

| 事件名 | 显示名 | 说明 | 标签 | 平台 | 属性 |
| --- | --- | --- | --- | --- | --- |
| ta_app_install | app安装 | 开启客户端自动采集后自动上报 |  |  |  |
| ta_app_start | app启动 | 开启客户端自动采集后自动上报 |  |  |  |
| ta_app_crash | app崩溃 | 开启客户端自动采集后自动上报 |  |  |  |
| ta_app_end | app关闭 | 开启客户端自动采集后自动上报 |  |  | #duration |
| register | 用户注册 | 用户完成注册时上报 |  |  | area_name |
| login | 用户登录 | 登录完成后 |  |  | first_login |
| app_leave | 用户切屏 | APP切到后台时上报 |  |  | online_time |
| lord_up | 领主升级 | 领主升级时上报 |  |  | new_level |
| vip_up | 贵族升级 | 贵族升级时上报 |  |  | new_level |
| avoid_war | 开启免战 | 开启免战时上报 |  |  |  |
| guide_complete | 完成新手引导 | 完成新手引导每一小阶段时记录 |  |  | guide_step, guide_name |
| sign | 每日签到 | 领取签到奖励后上报 |  |  | sign_day |
| seven_day | 七日豪礼 | 领取七日豪礼时记录 |  |  | day_num |
| task_completed | 完成任务 | 点击领取时记录 |  |  | task_type, task_ID, task_name |
| recharge | 充值付费 | 充值付费时记录 |  |  | order_id, pay_type, pay_amount, pay_reason, is_first_pay, pay_method |
| go_battle | 出征 | 出征时记录 |  |  | battle_type, battle_aim, aim_level, aim_owner, guard_num, guard_fight, our_fight, general_id, soldier_num |
| battle_result | 失败战报 | 战斗失败后记录 |  |  | battle_type, battle_aim, aim_level, aim_owner, guard_num, guard_fight, our_fight, general_id, soldier_num, battle_result |
| repair_defense | 修筑城防 | 修筑城防时上报 |  |  | build_name |
| create_build | 建造建筑 | 完成要塞修建后上报 |  |  | build_name |
| remove_build | 拆除建筑 | 拆除要塞后记录 |  |  | build_name |
| move_home | 迁城 | 迁城后上报 |  |  | location_area |
| recruit | 抽卡 | 用户进行抽卡 |  |  | recruit_enter, recruit_type, card_id, cost_type, cost_num, general_name |
| enlist | 招募 | 完成士兵招募时上报 |  |  | soldier_type, enlist_num, soldier_rank |
| disband | 遣散 | 遣散士兵时上报 |  |  | soldier_type, disband_num, soldier_rank |
| research | 研究 | 完成项目研究时上报 |  |  | project_name, level |
| unlock_goods | 解锁商品 | 解锁商品时上报 |  |  | goods_name, goods_type, num, soldier_rank |
| goods_recovery | 商品回收 | 完成一次商品回收时上报 |  |  | goods_name, goods_type, num, price |
| get_resource | 获得资源 | 完成资源收割时记录，贸易城购买时记录（不记录）工坊收割时记录 |  |  | resource_name, goods_type, num |
| join_guild | 加入联盟 | 加入他人联盟时触发 |  |  | guild_level, guild_id, guild_name, guild_position |
| leave_guild | 离开联盟 | 退出联盟时触发 |  |  | guild_level, guild_id, guild_name, guild_position |
| create_guild | 创建联盟 | 自己创建联盟时触发 |  |  | guild_level, guild_id, location_area, guild_name |
| level_guild | 联盟升级 | 联盟升级时 |  |  | guild_level, guild_id, guild_name |
| commison_position | 任命 | 任命时候上报 |  |  | guild_id, position_name |
| get_gold | 获得金币 | 获得金币时上报 |  |  | guild_gold, guild_id, guild_reason |
| study_tech | 研究科技 | 研究科技时上报 |  |  | tech_id, tech_level, guild_id |
| donate | 联盟捐献 | 完成捐献时上报 |  |  | resource_name, num, donate_type |
| compose | 炼魂 | 完成炼魂时上报 |  |  | compose_type |
| equipment_level_up | 装备强化 | 装备强化时上报 |  |  | equip_name, equip_level |
| hero_star_up | 英雄升星 | 英雄完成升星时上报 |  |  | hero_id, hero_name, new_star, new_fight |
| hero_level_up | 英雄升级 | 英雄完成升级时上报，连续升级可上报一次或多次 |  |  | hero_id, hero_name, new_level, new_fight |
| item_change | 货币与道具变动 | 货币与道具发生变化时记录 |  |  | item_id, item_name, change_type, change_num, change_before, change_after, change_reason |
| buy_goods | 买入商品 | 完成商品买入时上报 |  |  | goods_name, num, city |
| sale_goods | 卖出商品 | 卖出商品后上报 |  |  | goods_name, num, city, profit |
| invest_city | 投资 | 投资贸易城后上报 |  |  | city, gold |
| store_buy | 购买商品 | 在商城中购买商品后上报 |  |  | goods_type, goods_id, goods_name, num, cost_type, cost_num |
| sign_up_war | 报名全面战争 | 报名全面战争后上报 |  |  | side |
| war_finish | 全面战争结束 | 全面战争结束后上报 |  |  | war_result, side1_num, side2_num, side1_rank1, side1_rank2, side1_rank3, side2_rank1, side2_rank2, side2_rank3 |
| complete_dungeons | 完成闯关 | 完成闯关后记录（扫荡统一计一次） |  |  | dungeons_id, fight_result, fight_time, get_star |
| get_general_reward | 领取大势奖励 | 领取大势奖励时上报 |  |  | reward_name, complete_time |
| rank_event | 排行榜事件 | 每天凌晨定时上报昨日排行榜快照，按照一条json格式 |  |  | server_id, rank_type_one, rank_type_two, rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8, rank9, rank10, rank_list |
| map_competition | 地图建筑易主 | 地图建筑易主时上报 |  |  | city_name, guild_new_id, guild_old_id, is_first |

## 公共事件属性

| 属性名 | 显示名 | 类型 | 说明 |
| --- | --- | --- | --- |
| channel | 渠道 | 字符串 | 如taptap、appstore等 |
| role_account_id | 账号 | 字符串 | 业务层面账号ID |

## 用户数据

| 属性名 | 显示名 | 类型 | 更新方式 | 说明 | 标签 |
| --- | --- | --- | --- | --- | --- |
| role_name | 角色名称 | 字符串 | user_set | 注册时记录 |  |
| device_id | 设备ID | 字符串 | user_set | 注册时记录 |  |
| channel | 渠道 | 字符串 | user_set | 在游戏启动时设置，上传用户的渠道信息，如app store、应用宝等 |  |
| server | 服务器ID | 字符串 | user_set | 用户注册时上传所属服务器ID |  |
| born_city | 出生城市 | 字符串 | user_set | 注册时记录 |  |
| current_diamond | 当前钻石数量 | 数值 | user_set | 每次登出时设置 |  |
| current_coin | 当前金币数量 | 数值 | user_set | 每次登出时设置 |  |
| current_counting | 当前点券数量 | 数值 | user_set | 每次登出时设置 |  |
| current_body | 当前体力 | 数值 | user_set | 每次登出时设置 |  |
| current_token | 当前代币 | 数值 | user_set | 每次登出时设置 |  |
| current_territory | 当前领土 | 数值 | user_set | 每次登出时设置 |  |
| current_population | 当前人口 | 数值 | user_set | 每次登出时设置 |  |
| current_viplevel | 当前VIP等级 | 数值 | user_set | 每次登出时设置 |  |
| current_lordlevel | 当前领主等级 | 数值 | user_set | 每次登出时设置 |  |
| total_revenue | 累计付费 | 数值 | user_set | 每次付费完成时累加 |  |
| first_pay_time | 首次付费时间 | 时间 | user_set | 首次充值时记录 |  |
| last_pay_time | 末次付费时间 | 时间 | user_set | 每次充值时覆盖原来记录 |  |
