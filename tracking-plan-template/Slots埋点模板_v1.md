# Slots埋点模板_v1

## 事件数据

| 事件名 | 显示名 | 说明 | 标签 | 平台 | 属性 |
| --- | --- | --- | --- | --- | --- |
| ta_app_install | 游戏安装 | 客户端开启自动采集后，即可采集 |  |  |  |
| ta_app_start | 游戏启动 | 在游戏启动时触发，需开始计时（客户端开启自动采集后，即可采集） |  |  |  |
| ta_app_end | 游戏登出 | 游戏登出时记录，结束计时（客户端开启自动采集后，即可采集） |  |  | #duration |
| user_create | 用户注册 | 用户新增时记录 |  |  |  |
| new_device | 设备新增 | 用户新增时同时记录设备新增事件；使用首次事件判断功能上传，去重id(取客户端sdk获取的设备id |  |  |  |
| user_login | 用户登录 | 当玩家进行游戏登录操作时，上报该埋点 |  |  | login_type |
| vip_level_up | vip等级升级 | vip等级提升时记录 |  |  | new_level |
| level_up | 世界升级 | 世界升级时调用 |  |  | new_level |
| new_guide | 新手引导步骤变化 | 步数变化时记录 |  |  | guide_step |
| sign | 完成签到 | 点击签到时记录 |  |  | sign_day, sum_day |
| slot_machine | 转动老虎机 | 每转动一次时记录 |  |  | reward_times, result, item_id, item_num, get |
| building | 建造建筑 | 世界建造建筑时记录（建造商店购买时） |  |  | build_id, build_level, type, cost_num |
| tap_turntable | 点击水果机 | 完成时记录 |  |  | coin_num, cash_cost, pay_type, type |
| unlock_pet | 解锁宠物 | 解锁一个宠物时记录该宠物信息 |  |  | pet_id, pet_name |
| feed_pet | 投喂宠物 | 投喂宠物时记录 |  |  | pet_id, pet_name, type, active_time |
| pet_up | 宠物升级 | 宠物完成升级后记录 |  |  | pet_id, pet_name, change_type, exp, before_level, new_level |
| order_ini | 发起订单 | 用户发起充值订单 |  |  | order_id, pay_1_level, pay_2_level, pay_3_level, goods_id, pay_type, pay_amount, is_first_pay |
| show_gift | 礼包出现 | 礼包弹出/点击时记录 |  |  | pay_1_level, pay_2_level, pay_3_level, show_type, goods_id |
| order_finish | 订单完成 | 订单完成 |  |  | order_id, pay_1_level, pay_2_level, pay_3_level, goods_id, pay_method, pay_type, pay_amount, get_goods, is_first_pay |
| click_share | 发起分享 | 发起分享后触发 |  |  | share_location, share_content |
| start_invite | 发起邀请 | 发起邀请后触发 |  |  | invite_button |
| invite_success | 邀请成功 | 邀请成功后触发 |  |  | invite_button, invited_id |
| share | 分享成功 | 分享成功后触发 |  |  | share_location, share_content |
| collection | 收集活动 | 领取收集活动阶段奖励时记录 |  |  | floor, reward_list |
| championships | 锦标赛 | 领取锦标赛奖励时记录 |  |  | type, progress, reward_list |
| coin_machine | 金币老虎机 | 转动金币老虎机时记录 |  |  | times, cost_money, turn_result, bonus, get_money |
| egg | 彩蛋 | 完成时记录 |  |  | floor, out_type, reward_list |
| pass_check | 通行证 | 领取通行证等级奖励时记录 |  |  | typ, reward_list |
| get_box | 获得/开启宝箱 | 获得时同时开启 |  |  | box_id, box_name, get_method, reward_list |
| card_send | 赠送卡片 | 赠送卡片链接发出去后记录 |  |  | card_id, card_type, sended_id |
| send_energy | 赠送体力 | 赠送体力后触发 |  |  | send_id, energy_num |
| accept_energy | 接受其他人赠送体力 | 接受体力后触发 |  |  | send_id, energy_num |
| send_coin | 赠送金币 | 赠送金币后触发 |  |  | send_id, coin_num |
| accept_coin | 接受其他人赠送金币 | 接受金币后触发 |  |  | send_id, coin_num |
| album_get | 卡组完成 | 完成一个卡组时记录 |  |  | album_id, reward_list |
| resource_change | 资源变动 | 资源或道具发生变化时记录 |  |  | resource_id, resource_name, change_type, change_num, change_after, change_reason |
| rank_list | 排行榜 | 服务器每天固定时间（比如每天0点）上传，每个排行榜上的用户，对应上传一条排行榜事件 |  |  | rank_type, rank_no, star_num |
| cost_event | 成本事件 | 将成本当做一个事件上传，该事件可使用可更新事件上报 |  |  | channel, cost_money |

## 公共事件属性

| 属性名 | 显示名 | 类型 | 说明 |
| --- | --- | --- | --- |
| current_level | 当前等级 | number | 玩家发生事件时的世界等级 |
| current_vip_level | 当前vip等级 | number | 玩家发生事件时的vip等级 |
| current_energy | 当前体力数量 | number | 玩家发生事件时的体力数量 |
| current_coin | 当前金币数量 | number |  |
| current_star | 当前星星数量 | number |  |
| current_build | 当前建筑等级 | number | 当前建筑总等级 |
| total_energy_get | 累计获得体力 | number | 当天累计获得体力（即时更新）、1天前、2天前、3天前……最多保留7天 |
| total_energy_cost | 累计消耗体力 | number | 当天累计消耗体力（即时更新）、1天前、2天前、3天前……最多保留7天 |
| total_turn | 累计旋转次数 | number | 当天累计旋转次数（即时更新）、1天前、2天前、3天前……最多保留7天 |
| total_login | 累计登陆天数 | number |  |
| continuity_login | 连续登陆天数 | number |  |
| total_pay | 充值总额 | number |  |

## 用户数据

| 属性名 | 显示名 | 类型 | 更新方式 | 说明 | 标签 |
| --- | --- | --- | --- | --- | --- |
| channel | 渠道 | string | user_setOnce | 在游戏启动时设置，上传用户的渠道来源信息 |  |
| nick_name | 昵称 | string | user_setOnce | 账号新增时或变动时记录 |  |
| gender | 性别 | string | user_setOnce | 账号新增时或变动时记录 |  |
| register_time | 注册时间 | datetime | user_setOnce | 账号新增时记录 |  |
| user_login_type | 登录模式 | string | user_set | 登录时设置，最近一次登录的状态 |  |
| account_bind_time | 账号绑定时间 | datetime | user_setOnce | 账号绑定时记录，绑定fb登录 |  |
| first_pay_time | 首次充值时间 | datetime | user_setOnce | 首次充值时记录 |  |
| current_level | 当前等级 | number | user_set | 世界的等级变动时记录 |  |
| current_vip_level | 当前vip等级 | number | user_set | 变动时记录 |  |
| current_score | 当前vip积分 | number | user_set | 变动时记录 |  |
| current_star | 当前星星数量 | number | user_set | 变动时记录，若变动太过频繁，可以登录登出时设置 |  |
| current_coin | 当前金币数量 | number | user_set |  |  |
| current_energy | 当前体力数量 | number | user_set |  |  |
| current_shield | 当前盾牌数量 | number | user_set |  |  |
