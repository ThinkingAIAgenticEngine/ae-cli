# MMO页游埋点模板_v2

## 事件数据

| 事件名 | 显示名 | 说明 | 标签 | 平台 | 属性 |
| --- | --- | --- | --- | --- | --- |
| ta_app_install | 游戏安装 | 客户端开启自动采集后，即可采集 |  |  |  |
| ta_app_start | 游戏启动 | 在游戏启动时触发，需开始计时（客户端开启自动采集后，即可采集） |  |  |  |
| register | 账号注册 | 注册完成后 |  |  |  |
| account_login | 账号登录 | 登录完成后 |  |  | account_type |
| create_role | 创建角色 | 用户创建角色时记录 |  |  | role_name |
| role_login | 角色登录 | 角色登录时记录 |  |  | first_login |
| ta_app_end | 游戏登出 | 游戏登出时记录，结束计时（客户端开启自动采集后，即可采集） |  |  | #duration |
| level_up | 角色升级 | 角色升级时记录 |  |  | new_level |
| vip_levelup | VIP提升 | VIP等级提升时记录 |  |  | new_level |
| order_init | 发起订单 | 用户发起充值订单 |  |  | pay_enter, order_id, pay_amount, is_first_pay |
| order_finish | 订单完成 | 订单完成 |  |  | pay_enter, order_id, pay_amount, is_first_pay, pay_method |
| get_pet | 获取法相 | 获得法相时记录 |  |  | pet_id, pet_name |
| pet_rankup | 法相升阶 | 法相结束发生变化时记录 |  |  | pet_id, pet_name, new_rank |
| task_completed | 完成任务 | 点击领取时记录 |  |  | task_type, task_ID, task_name |
| compose_equip | 装备合成 | 装备完成合成时记录 |  |  | compose_type, equip_type, equip_id, equip_name |
| buy_market_item | 市场购买道具 | 在市场中购买道具时记录 |  |  | item_id, item_name, cost_resource, cost_num |
| on_the_shelf | 上架道具 | 在市场中上架某个道具时记录 |  |  | item_id, item_name, sale_price |
| off_the_shelf | 下架道具 | 在市场中下架某个道具时记录 |  |  | item_id, item_name, sale_price |
| recovery_equip | 回收装备 | 回收背包内装备时记录，包含点击快捷键回收 |  |  | recovery_reward |
| buy_shop_item | 商城购买道具 | 在商城内购买道具时记录 |  |  | shop_type, item_id, item_name, cost_resource, cost_num |
| unlock_mount | 激活坐骑 | 激活坐骑时记录 |  |  | mount_name |
| mount_rankup | 坐骑升阶 | 坐骑升阶时记录 |  |  | mount_name, new_rank |
| unlock_mount_skill | 激活坐骑技能 | 激活坐骑技能时记录 |  |  | mount_name, skill_name |
| get_skill | 学习技能 | 角色学习技能后记录 |  |  | skill_id, skill_name |
| up_skill | 升级技能 | 角色技能升级时记录 |  |  | skill_id, skill_name, new_level |
| unlock_skin | 激活化形 | 激活化形时记录 |  |  | skin_id, skin_name, skin_type, skin_rarity |
| up_state | 升境 | 境界提升时记录 |  |  | new_state |
| up_title | 晋升头衔 | 头衔完成晋升时记录 |  |  | new_title |
| login_reward | 领取登录奖励 | 领取七天登录奖励时记录 |  |  | login_day |
| strengthen_equip | 装备强化 | 完成某装备强化时记录 |  |  | equip_id, equip_nae, new_level |
| get_open_welfare | 领取开服福利 | 领取开服福利时记录 |  |  | blessing_type, get_condition |
| treasure_hunt | 参与寻宝 | 完成一次寻宝后记录 |  |  | hunt_type, reward_list |
| points_exchange | 积分兑换 | 完成一次积分兑换后记录 |  |  | item_id, item_name, cost_points |
| pray | 参与祈福 | 完成一次祈福时记录 |  |  | pray_type, cost_num, get_num |
| enter_dungeon | 挑战关卡 | 玩家进入副本或关卡时记录 |  |  | dungeon_id, dungeon_name |
| dungeon_completed | 关卡通过 | 玩家通过副本或关卡时记录 |  |  | dungeon_id, dungeon_name, resource_get, resource_num |
| dungeon_fail | 关卡失败 | 玩家挑战副本或关卡失败失败时记录 |  |  | dungeon_id, dungeon_name |
| dungeon_mopup | 扫荡关卡 | 玩家完成扫荡时记录 |  |  | dungeon_id, dungeon_name |
| sign | 每日签到 | 玩家签到时记录 |  |  | sign_type, sign_day |
| online_reward | 在线奖励 | 领取在线奖励时记录 |  |  | online_time |
| offline_reward | 领取离线经验 | 领取离线经验时记录 |  |  | privilege_level |
| get_activation_reward | 领取激活码奖励 | 领取激活码奖励时记录 |  |  | activation_code |
| store_game | 收藏游戏 | 收藏游戏时记录 |  |  |  |
| get_day_recharge | 领取充值奖励 | 领取每日充值奖励时记录 |  |  | recharge_num |
| get_first_recharge | 领取首充奖励 | 领取首充奖励时记录 |  |  | recharge_day |
| activate_privilege | 激活特权卡 | 激活特权卡时记录 |  |  | privilege_type |
| worship | 膜拜 | 点击膜拜获取奖励时记录 |  |  |  |
| buy_discount | 购买折扣商品 | 购买折扣商品时记录 |  |  | item_id, item_name, discount, cost_coin_num |
| get_hungup | 领取挂机奖励 | 领取挂机奖励时记录 |  |  | get_diamond_num |
| challenge_boss | 挑战boss | 进入boss挑战时记录 |  |  | boss_id, boss_name, boss_type |
| challenge_victory | 挑战boss成功 | 挑战boss成功时记录 |  |  | boss_id, boss_name, boss_type |
| challenge_fail | 挑战boss失败 | 挑战boss失败时记录 |  |  | boss_id, boss_name, boss_type |
| get_boss_gift | 领取boss大礼包 | 领取boss大礼包后记录 |  |  | reward_list, num_list |
| join_guild | 加入帮派 | 加入他人帮派时触发 |  |  | guild_level, guild_id, guild_name, guild_position, owner_name, guild_rank |
| leave_guild | 离开帮派 | 退出帮派时触发 |  |  | guild_level, guild_id, guild_name, guild_position, owner_name, guild_rank |
| create_guild | 创建帮派 | 自己创建帮派时触发 |  |  | guild_level, guild_id, guild_name, owner_name, guild_rank |
| guild_sign | 帮派签到 | 完成帮派签到后记录 |  |  | sign_type |
| guild_like | 点赞 | 完成帮派内点赞时记录 |  |  |  |
| open_guild_box | 开启帮派宝箱 | 开启帮派宝箱时记录 |  |  | box_type |
| open_party | 开启晚会 | 开启晚会时记录 |  |  |  |
| enter_battle | 进入帮派争霸 | 进入帮派争霸时记录 |  |  |  |
| up_activity | 升级活跃度 | 升级活跃度时记录 |  |  | new_level |
| get_daily_reward | 领取每日奖励 | 领取每日奖励时记录 |  |  | get_points |
| submit_stone | 灵石提交 | 提交灵石后记录 |  |  |  |
| set_bead | 镶嵌灵珠 | 完成镶嵌灵珠后记录 |  |  | bead_id, bead_name |
| get_experience | 收获经验 | 领取打boss经验时记录 |  |  | experience_num, times |
| get_five_reward | 领取五环奖励 | 领取五环奖励时记录 |  |  | times |
| mining | 挖矿 | 挖矿时记录 |  |  | diamond_type |
| update | 刷新 | 刷新时记录 |  |  |  |
| plunder_success | 掠夺成功 | 掠夺成功时记录 |  |  | get_diamond_num |
| plunder_fail | 掠夺失败 | 掠夺失败时记录 |  |  |  |
| get_wechat_gift | 领取微信礼包 | 完成微信礼包领取时记录 |  |  |  |
| get_recharge_reward | 领取累冲奖励 | 领取累冲奖励时记录 |  |  | recharge_coin_num |
| get_rankup_reward | 领取升阶特惠奖励 | 领取升阶特惠奖励时记录 |  |  | discount_type, gift_name |
| buy_discount_gift | 购买钜惠好礼 | 购买钜惠好礼时记录 |  |  | project_name, cost_coin_num |
| get_fight_promote | 领取战力飞升 | 领取战力飞升时记录 |  |  | fight_level |
| get_king_promote | 领取王者飞升 | 领取王者飞升时记录 |  |  |  |
| buy_cultivation_gift | 购买修为礼包 | 购买修为礼包时记录 |  |  | gift_name |
| recovery_coin | 回收元宝 | 玩家完成元宝回收时记录 |  |  | red_packet_name, get_coin_num |
| role_die | 角色死亡 | 角色死亡时记录 |  |  | die_reason |
| item_change | 道具变动 | 道具发生变化时记录 |  |  | item_id, item_name, change_type, change_num, change_before, change_after, change_reason |

## 公共事件属性

| 属性名 | 显示名 | 类型 | 说明 |
| --- | --- | --- | --- |
| sever | 区服ID | string | 事件发生时玩家的所属区服 |
| level | 角色等级 | number | 事件发生时玩家的等级 |
| vip_level | VIP等级 | number | 事件发生时玩家的VIP等级 |
| fight | 战力 | number | 事件发生时玩家的战力 |

## 用户数据

| 属性名 | 显示名 | 类型 | 更新方式 | 说明 | 标签 |
| --- | --- | --- | --- | --- | --- |
| sever | 区服ID | string | user_setOnce | 用户注册时上传所属服务器ID |  |
| guild_id | 工会ID | string | user_set | 每次登出时覆盖 |  |
| register_time | 注册时间 | datetime | user_setOnce | 账号或角色新增时设置 |  |
| first_login_time | 首次登录时间 | datetime | user_setOnce | 首次登录时记录 |  |
| last_login_time | 最后登录时间 | datetime | user_set | 每次登出时设置 |  |
| first_pay_time | 首次充值时间 | datetime | user_setOnce | 首次充值时记录 |  |
| last_pay_time | 最后充值时间 | datetime | user_set | 每次充值时覆盖原来记录 |  |
| total_revenue | 累计付费金额 | number | user_add | 每次付费完成时累加 |  |
| total_login | 累计登录次数 | number | user_add | 每次登录时累加 |  |
| current_session_time | 当前累计游戏时长 | number | user_add | 每次登出时累加 |  |
| current_diamond | 当前钻石数 | number | user_set | 每次登出时设置 |  |
| current_coin | 当前金币数 | number | user_set | 每次登出时设置 |  |
| current_honor | 当前军功数 | number | user_set | 每次登出时覆盖 |  |
| current_level | 当前等级 | number | user_set | 每次登出时设置，上传当前等级 |  |
| current_viplevel | 当前VIP等级 | number | user_set | 每次登出时设置，上传当前等级 |  |
| current_fight | 当前战力 | number | user_set | 每次登出时设置 |  |
