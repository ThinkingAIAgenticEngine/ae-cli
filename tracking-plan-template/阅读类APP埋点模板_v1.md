# 阅读类APP埋点模板_v1

## 事件数据

| 事件名 | 显示名 | 说明 | 标签 | 平台 | 属性 |
| --- | --- | --- | --- | --- | --- |
| ta_app_start | 应用启动 | 在游戏启动时触发，需开始计时（客户端开启自动采集后，即可采集） |  |  |  |
| ta_app_end | 应用登出 | 游戏登出时记录，结束计时（客户端开启自动采集后，即可采集） |  |  | #duration |
| ta_app_crash | 应用崩溃 | 自动采集 |  |  |  |
| first_device_add | 设备新增 | *使用首次事件* |  |  |  |
| register | 账号注册 | 注册完成后 |  |  | invited_code |
| account_login | 账号登录 | 登录完成后 |  |  | last_login_time |
| interest_choose | 兴趣选择 | 初次登录兴趣选择后 |  |  | interest_id_list |
| account_logout | 账号登出 | 账号登出时记录 |  |  | online_duration |
| guide_complete | 完成新手引导 | 完成新手引导每一步时记录 |  |  | guide_step |
| home_click | 首页点击 | 首页控件点击后 |  |  |  |
| classify_click | 分类点击 | 分类控件点击后 |  |  |  |
| my_click | 我的点击 | 我的控件点击后 |  |  |  |
| book_enter | 进入书籍 | 进入书籍播放模块后 |  |  | book_id, position, now_play_num, now_comment_num |
| topic_enter | 进入专题 | 进入书籍专题后 |  |  | topic_id, position |
| book_collection | 书籍收藏 | 收藏书籍后 |  |  | book_id, position |
| book_share | 书籍分享 | 书签分享控件点击后 |  |  | book_id, position, share_path |
| more_click | 更多点击 | “更多”控件点击后 |  |  | position |
| back_to_top | 回到顶部 | 回到顶部控件点击后 |  |  |  |
| create_picture | 生成图片 | 生成图片控件点击后 |  |  | book_id |
| book_switch | 书签切换 | 滑动书签切换下一个书签后 |  |  | before_book_id, after_book_id |
| search_enter | 进入搜索 | 搜索控件点击进入搜索页面后 |  |  |  |
| book_classify | 书籍分类 | 书籍分类点击后 |  |  | type_id |
| search_click | 进行搜索 | 输入内容点击搜索后 |  |  | search_content |
| search_history | 历史搜索 | 历史搜索内容点击后 |  |  | search_content |
| clear_record | 清空记录 | 清空历史搜索记录后 |  |  |  |
| search_hot | 热门搜索 | 热门搜索内容点击后 |  |  | search_content, book_id |
| news_click | 消息点击 | 消息控件点击后 |  |  |  |
| mode_switch | 模式切换 | 进行日/夜间模式切换后 |  |  | before_mode, after_mode |
| setup_click | 设置点击 | 设置控件点击后 |  |  |  |
| book_delete | 书籍删除 | 书籍删除后 |  |  | positon, subpositon, book_id_list |
| information_alter | 信息修改 | 信息修改完成后 |  |  | before_name, before_sex, before_birthday, before_region, before_sign, before_background_id, after_name, after_sex, after_birthday, after_region, after_sign, after_background_id |
| lately_list | 最近列表 | 用户登出时上报 |  |  | positon, subpositon, book_id_list |
| collection_list | 收藏列表 | 用户登出时上报 |  |  | positon, subpositon, book_id_list |
| download_list | 下载列表 | 用户登出时上报 |  |  | positon, subpositon, book_id_list |
| subscribe_list | 订阅列表 | 用户登出时上报 |  |  | positon, subpositon, book_id_list |
| back_click | 返回点击 | 返回控件“<”点击后 |  |  | control_position, duration |
| book_download | 书籍下载 | 书籍下载控件点击后 |  |  | book_id |
| download_complete | 下载完成 | 书籍下载完成后 |  |  | book_id |
| timing_off | 定时关闭 | 设置定时关闭后 |  |  | off_time |
| play_speed | 倍速播放 | 设置倍速播放后 |  |  | speed |
| create_poster | 生成海报 | 生成海报点击后 |  |  | book_id, share_path |
| play_mode_switch | 播放模式切换 | 播放模式切换后 |  |  | after_mode |
| suspend_play_switch | 暂停播放切换 | 点击暂停或者播放后 |  |  | is_suspend, play_duration |
| view_comment | 浏览评论 | 浏览评论时 |  |  | book_id, comment_maker_id, comment_content, comment_like_num |
| make_comment | 发表评论 | 发表评论后 |  |  | book_id, comment_content |
| like_comment | 点赞评论 | 点赞评论后 |  |  | book_id, comment_maker_id, comment_content, comment_like_num |
| play_book_switch | 播放数据切换 | 切换播放书籍后 |  |  | before_book_id, after_book_id, switch_type, play_duration, is_complete_play |
| cost | 买量成本 | *第三方平台导入 |  |  | #event_id, adv_id, adv_type, channel_id, campaign_id, cost_amount, cost_action_amount |
| rank | 排行榜 | ★#account_id取自订值；定时(如每天)上报；上报前清空公共属性 |  |  | rank_type, rank_1_id, rank_2_id, rank_x_id, total_id_list |
| concurrent_users | 在线人数 | ★#account_id取自订值；定时(如每分钟/小时)上报；上报前清空公共属性 |  |  | channel_id, server_id, platform, online_user |

## 公共事件属性

| 属性名 | 显示名 | 类型 | 说明 |
| --- | --- | --- | --- |
| listen_time | 收听时长 | number | 事件发生时用户的收听时长 |

## 用户数据

| 属性名 | 显示名 | 类型 | 更新方式 | 说明 | 标签 |
| --- | --- | --- | --- | --- | --- |
| device_id | 设备id | string | user_setOnce |  |  |
| account_id | 登录账户id | string | user_setOnce |  |  |
| channel | 来源渠道 | string | user_setOnce |  |  |
| nick_name | 昵称 | string | user_setOnce | 检测到用户退出应用时上报 |  |
| register_time | 注册时间 | datetime | user_setOnce |  |  |
| first_login | 首次登录时间 | datetime | user_setOnce | 登录时上报 |  |
| last_login | 最后登录时间 | datetime | user_set | 登录时上报 |  |
| seies_login_days | 连续登录天数 | number | user_set |  |  |
| acc_login_count | 累计登录天数 | number | user_set |  |  |
| acc_listen_time | 累计收听时长 | number | user_set | 登出时累加上报 |  |
| comment_num | 发表评论数量 | number | user_set | 登出时上报 |  |
| comment_like_num | 评论获赞数量 | number | user_set | 登出时上报 |  |
| lately_num | 最近收听数量 | number | user_set | 登出时上报 |  |
| collection_num | 收藏数量 | number | user_set | 登出时上报 |  |
| download_num | 下载数量 | number | user_set | 登出时上报 |  |
| subscribe_num | 订阅数量 | number | user_set | 登出时上报 |  |
