# TE 埋点示例模板

## 事件数据

| 事件名 | 显示名 | 说明 | 标签 | 平台 | 属性 |
| --- | --- | --- | --- | --- | --- |
| role_login | 角色登录 | 角色登录时记录 | 基础数据 |  | first_login |
| level_up | 角色升级 | 角色升级时记录 | 基础数据 |  | new_level |
| order_init | 发起订单 | 用户发起充值订单 | 付费模块 |  | order_id, pay_type, pay_amount, pay_reason, is_first_pay |
| dungeon_completed | 关卡通过 | 通过副本或关卡 | 关卡模块 |  | dungeon_id, dungeon_name, card_detail, card_detail.hero_name, card_detail.hero_level, resource_get, resource_num |

## 公共事件属性

| 属性名 | 显示名 | 类型 | 说明 |
| --- | --- | --- | --- |
| channel | 注册渠道 | string | APP store、应用宝、豌豆荚等渠道 |
| sever | 区服ID | string | 事件发生时玩家的所属区服 |
| account_id | 账户ID | string | 角色的从属账号ID |
| role_id | 角色ID | string |  |
| role_name | 角色名 | string |  |
| level | 角色等级 | number | 事件发生时玩家的等级 |
| vip_level | VIP等级 | number | 事件发生时玩家的VIP等级 |
| fight | 战力 | number | 事件发生时玩家的战力 |
| gold | 金币数量 | number | 事件发生时玩家的金币数量 |
| star | 星星数量 | number | 事件发生时玩家的星星数量 |
| energy | 体力数量 | number | 事件发生时玩家的体力数量 |

## 用户数据

| 属性名 | 显示名 | 类型 | 更新方式 | 说明 | 标签 |
| --- | --- | --- | --- | --- | --- |
| role_id | 角色ID | string | user_setOnce | 创建角色时记录 | 基本信息类 |
| role_name | 角色名 | string | user_setOnce | 创建角色时记录 | 基本信息类 |
| register_time | 注册时间 | datetime | user_setOnce | 账号或角色新增时设置 | 时间类 |
| first_login_time | 首次登录时间 | datetime | user_setOnce | 首次登录时记录 | 时间类 |
| total_ad_num | 累计观看广告次数 | number | user_add | 每次观看广告时累加 | 累积类 |
| total_ad_time | 累计观看广告时长 | number | user_add | 每次观看广告时累加 | 累积类 |
| current_level | 当前等级 | number | user_set | 每次登出时设置，上传当前等级 | 进度类 |
| current_dungeon | 当前主线关卡 | number | user_set | 每次登出时设置 | 进度类 |
| current_keynode_level | 当前里程碑等级 | number | user_set | 每次登出时累加 | 进度类 |
