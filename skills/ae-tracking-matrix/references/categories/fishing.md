# Fishing Game Tracking Plan (Local Cache)

> Source: Feishu sheet "捕鱼游戏王_AE埋点方案_v1", provided by Zeng Ruonan, cached 2026-10-30.
> Source URL: https://thinkingdata.feishu.cn/sheets/AISTsSZ0rhOYt2tMcxAcMrd3nec?sheet=0uUIZW
> Coverage: 235 events, 638 event-property rows, 8 common event properties, 24 user properties, and 2 user-ID fields.
> Use this as a candidate business catalog, not as a requirement to enable every event. Select the modules that exist in the customer game and confirm event names, trigger timing, collection side, and property definitions before delivery.
> Property types and user-property update methods retain the source canonical values. Source display names and business descriptions are preserved in Chinese to avoid semantic loss.

## Contents

| Module / source tag | Events | Event-property rows |
| --- | ---: | ---: |
| 系统事件 | 11 | 26 |
| 基础事件 | 16 | 32 |
| 成长 | 30 | 98 |
| 社交 | 13 | 30 |
| 新手引导 | 11 | 26 |
| 大厅 | 20 | 42 |
| 房间 | 18 | 45 |
| 对局 | 53 | 146 |
| 付费 | 24 | 70 |
| 活动 | 39 | 123 |
| Common event properties | — | 8 |
| User properties | — | 24 |
| User ID system | — | 2 |

## Event Data (#事件数据)

### 系统事件

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| ta_page_show | 页面展示 | 开启客户端自动采集后自动上报 | client |  |  |  |  |
| ta_page_hide | 页面隐藏 | 开启客户端自动采集后自动上报 | client |  |  |  |  |
| page_show | 页面曝光 | 任意页面/面板渲染完成（通用兜底） | client | page_id | 页面ID | 文本 | 页面唯一标识 |
| page_show | 页面曝光 | 任意页面/面板渲染完成（通用兜底） | client | page_name | 页面名称 | 文本 | 页面名称 |
| page_show | 页面曝光 | 任意页面/面板渲染完成（通用兜底） | client | from_page | 来源页面 | 文本 | 从哪个页面跳转而来 |
| page_hide | 页面离开 | 页面关闭或跳转 | client | page_id | 页面ID | 文本 | 页面唯一标识 |
| page_hide | 页面离开 | 页面关闭或跳转 | client | page_name | 页面名称 | 文本 | 页面名称 |
| page_hide | 页面离开 | 页面关闭或跳转 | client | stay_duration_s | 停留时长 | 数值 | 页面或弹窗停留秒数 |
| button_click | 按钮点击 | 任意按钮点击（通用兜底） | client | button_id | 按钮ID | 文本 | 按钮唯一标识 |
| button_click | 按钮点击 | 任意按钮点击（通用兜底） | client | button_name | 按钮名称 | 文本 | 被点击按钮文案或标识 |
| button_click | 按钮点击 | 任意按钮点击（通用兜底） | client | page_id | 页面ID | 文本 | 页面唯一标识 |
| popup_close | 弹窗关闭 | 任意弹窗关闭 | client | popup_id | 弹窗ID | 文本 | 弹窗唯一标识 |
| popup_close | 弹窗关闭 | 任意弹窗关闭 | client | close_type | 关闭方式 | 文本 | manual/auto/jump |
| popup_close | 弹窗关闭 | 任意弹窗关闭 | client | stay_duration_s | 停留时长 | 数值 | 页面或弹窗停留秒数 |
| error_toast | 错误提示 | 展示错误提示文案 | client | error_code | 错误码 | 文本 | 错误码 |
| error_toast | 错误提示 | 展示错误提示文案 | client | error_msg | 错误信息 | 文本 | 错误描述 |
| error_toast | 错误提示 | 展示错误提示文案 | client | page_id | 页面ID | 文本 | 页面唯一标识 |
| network_error | 网络异常 | 网络请求失败 | client | error_type | 错误类型 | 文本 | 错误分类 |
| network_error | 网络异常 | 网络请求失败 | client | api_name | 接口名称 | 文本 | 接口标识 |
| api_error | 接口错误 | 业务接口返回非成功 | client | api_name | 接口名称 | 文本 | 接口标识 |
| api_error | 接口错误 | 业务接口返回非成功 | client | error_code | 错误码 | 文本 | 错误码 |
| api_error | 接口错误 | 业务接口返回非成功 | client | error_msg | 错误信息 | 文本 | 错误描述 |
| api_error | 接口错误 | 业务接口返回非成功 | client | cost_ms | 耗时 | 数值 | 接口或操作耗时毫秒数 |
| resource_load_fail | 资源加载失败 | 资源文件加载失败 | client | resource_name | 资源名称 | 文本 | 加载失败的资源名 |
| resource_load_fail | 资源加载失败 | 资源文件加载失败 | client | resource_type | 资源类型 | 文本 | 资源类型 |
| crash | 崩溃 | 客户端崩溃 | client | crash_type | 崩溃类型 | 文本 | 崩溃分类 |
| crash | 崩溃 | 客户端崩溃 | client | stack_trace | 堆栈 | 文本 | 崩溃堆栈信息 |
| crash | 崩溃 | 客户端崩溃 | client | page_id | 页面ID | 文本 | 页面唯一标识 |

### 基础事件

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| app_launch | 应用启动 | 冷启动或热启动，SDK 初始化后 | client | launch_type | 启动类型 | 文本 | 冷启动/热启动 |
| app_launch | 应用启动 | 冷启动或热启动，SDK 初始化后 | client | launch_cost_ms | 启动耗时 | 数值 | 从点击图标到可交互毫秒数 |
| app_launch | 应用启动 | 冷启动或热启动，SDK 初始化后 | client | is_first_launch | 是否首次启动 | 布尔 | 设备首次启动 |
| resource_load_complete | 资源加载完成 | 首屏资源包加载结束 | client | load_cost_ms | 加载耗时 | 数值 | 资源加载毫秒数 |
| resource_load_complete | 资源加载完成 | 首屏资源包加载结束 | client | is_first_load | 是否首次加载 | 布尔 | 首次下载资源包 |
| hotfix_start | 热更开始 | 检测到新版本并开始下载 | client | from_version | 原版本 | 文本 | 热更前版本 |
| hotfix_start | 热更开始 | 检测到新版本并开始下载 | client | to_version | 目标版本 | 文本 | 热更后版本 |
| hotfix_complete | 热更完成 | 热更包下载安装结束 | client | cost_ms | 耗时 | 数值 | 接口或操作耗时毫秒数 |
| hotfix_complete | 热更完成 | 热更包下载安装结束 | client | package_size | 包大小 | 数值 | 热更包字节数 |
| hotfix_complete | 热更完成 | 热更包下载安装结束 | client | result | 结果 | 文本 | 操作结果 success/fail |
| hotfix_complete | 热更完成 | 热更包下载安装结束 | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| app_foreground | 切回前台 | 应用从后台恢复到前台 | client | background_duration_s | 后台停留时长 | 数值 | 应用在后台停留的秒数 |
| app_background | 切到后台 | 应用进入后台 | client | stay_duration_s | 停留时长 | 数值 | 页面或弹窗停留秒数 |
| login_page_show | 登录页曝光 | 登录页渲染完成 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| login_click | 登录按钮点击 | 点击登录/一键登录/游客登录 | client | login_method | 登录方式 | 文本 | phone/wechat/guest/account |
| login_success | 登录成功 | 服务端返回登录成功 | client | user_id | 用户ID | 文本 | 平台唯一用户标识 |
| login_success | 登录成功 | 服务端返回登录成功 | client | login_method | 登录方式 | 文本 | phone/wechat/guest/account |
| login_success | 登录成功 | 服务端返回登录成功 | client | cost_ms | 耗时 | 数值 | 接口或操作耗时毫秒数 |
| login_fail | 登录失败 | 登录接口返回失败 | client | login_method | 登录方式 | 文本 | phone/wechat/guest/account |
| login_fail | 登录失败 | 登录接口返回失败 | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| login_fail | 登录失败 | 登录接口返回失败 | client | error_code | 错误码 | 文本 | 错误码 |
| account_bind | 账号绑定 | 绑定手机号或第三方账号完成 | client | bind_type | 绑定类型 | 文本 | phone/wechat/qq |
| account_bind | 账号绑定 | 绑定手机号或第三方账号完成 | client | result | 结果 | 文本 | 操作结果 success/fail |
| privacy_agree | 隐私协议同意 | 点击同意隐私政策 | client | policy_version | 协议版本 | 文本 | 隐私政策版本号 |
| realname_start | 实名认证开始 | 进入实名认证页 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| realname_result | 实名认证结果 | 实名认证提交返回 | client | result | 结果 | 文本 | 操作结果 success/fail |
| realname_result | 实名认证结果 | 实名认证提交返回 | client | is_adult | 是否成年 | 布尔 | 实名认证结果 |
| realname_result | 实名认证结果 | 实名认证提交返回 | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| antispam_show | 防沉迷提示曝光 | 触发防沉迷限制并弹出提示 | client | limit_type | 限制类型 | 文本 | 防沉迷限制类型 |
| antispam_show | 防沉迷提示曝光 | 触发防沉迷限制并弹出提示 | client | remain_time | 剩余时间 | 数值 | 剩余可用时间（秒） |
| server_select | 选择服务器 | 切换或选择服务器 | client | server_id | 服务器ID | 文本 | 服务器唯一标识 |
| server_select | 选择服务器 | 切换或选择服务器 | client | server_name | 服务器名称 | 文本 | 服务器名称 |

### 成长

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| gun_equip | 炮台装备 | 装备或切换炮台皮肤 | client | gun_id | 炮台ID | 数值 | 炮台皮肤唯一标识 |
| gun_equip | 炮台装备 | 装备或切换炮台皮肤 | client | gun_name | 炮台名称 | 文本 | 炮台皮肤名称 |
| gun_equip | 炮台装备 | 装备或切换炮台皮肤 | client | gun_level | 炮台等级 | 数值 | 炮台等级 |
| gun_unlock | 炮台解锁 | 解锁新炮台 | client | gun_id | 炮台ID | 数值 | 炮台皮肤唯一标识 |
| gun_unlock | 炮台解锁 | 解锁新炮台 | client | gun_name | 炮台名称 | 文本 | 炮台皮肤名称 |
| gun_unlock | 炮台解锁 | 解锁新炮台 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| gun_unlock | 炮台解锁 | 解锁新炮台 | client | unlock_type | 解锁方式 | 文本 | free/pay/level/task |
| gun_upgrade | 炮台升级 | 升级炮台 | client | gun_id | 炮台ID | 数值 | 炮台皮肤唯一标识 |
| gun_upgrade | 炮台升级 | 升级炮台 | client | from_level | 原等级 | 数值 | 升级前等级 |
| gun_upgrade | 炮台升级 | 升级炮台 | client | to_level | 新等级 | 数值 | 升级后等级 |
| gun_upgrade | 炮台升级 | 升级炮台 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| gun_upgrade | 炮台升级 | 升级炮台 | client | result | 结果 | 文本 | 操作结果 success/fail |
| spirit_equip | 精灵装备 | 装备或切换精灵 | client | spirit_id | 精灵ID | 数值 | 精灵唯一标识 |
| spirit_equip | 精灵装备 | 装备或切换精灵 | client | spirit_name | 精灵名称 | 文本 | 精灵名称 |
| spirit_unlock | 精灵解锁 | 解锁新精灵 | client | spirit_id | 精灵ID | 数值 | 精灵唯一标识 |
| spirit_unlock | 精灵解锁 | 解锁新精灵 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| spirit_upgrade | 精灵升级 | 升级精灵 | client | spirit_id | 精灵ID | 数值 | 精灵唯一标识 |
| spirit_upgrade | 精灵升级 | 升级精灵 | client | from_level | 原等级 | 数值 | 升级前等级 |
| spirit_upgrade | 精灵升级 | 升级精灵 | client | to_level | 新等级 | 数值 | 升级后等级 |
| spirit_upgrade | 精灵升级 | 升级精灵 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| spirit_upgrade | 精灵升级 | 升级精灵 | client | result | 结果 | 文本 | 操作结果 success/fail |
| wing_equip | 翅膀装备 | 装备或切换翅膀 | client | wing_id | 翅膀ID | 数值 | 翅膀唯一标识 |
| wing_equip | 翅膀装备 | 装备或切换翅膀 | client | wing_name | 翅膀名称 | 文本 | 翅膀名称 |
| wing_unlock | 翅膀解锁 | 解锁新翅膀 | client | wing_id | 翅膀ID | 数值 | 翅膀唯一标识 |
| wing_unlock | 翅膀解锁 | 解锁新翅膀 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| wing_upgrade | 翅膀升级 | 升级翅膀 | client | wing_id | 翅膀ID | 数值 | 翅膀唯一标识 |
| wing_upgrade | 翅膀升级 | 升级翅膀 | client | from_level | 原等级 | 数值 | 升级前等级 |
| wing_upgrade | 翅膀升级 | 升级翅膀 | client | to_level | 新等级 | 数值 | 升级后等级 |
| wing_upgrade | 翅膀升级 | 升级翅膀 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| wing_upgrade | 翅膀升级 | 升级翅膀 | client | result | 结果 | 文本 | 操作结果 success/fail |
| pet_equip | 宠物装备 | 装备或切换宠物 | client | pet_id | 宠物ID | 数值 | 宠物唯一标识 |
| pet_equip | 宠物装备 | 装备或切换宠物 | client | pet_name | 宠物名称 | 文本 | 宠物名称 |
| pet_equip | 宠物装备 | 装备或切换宠物 | client | pet_level | 宠物等级 | 数值 | 宠物等级 |
| pet_unlock | 宠物解锁 | 解锁新宠物 | client | pet_id | 宠物ID | 数值 | 宠物唯一标识 |
| pet_unlock | 宠物解锁 | 解锁新宠物 | client | pet_name | 宠物名称 | 文本 | 宠物名称 |
| pet_unlock | 宠物解锁 | 解锁新宠物 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| pet_upgrade | 宠物升级 | 升级宠物 | client | pet_id | 宠物ID | 数值 | 宠物唯一标识 |
| pet_upgrade | 宠物升级 | 升级宠物 | client | from_level | 原等级 | 数值 | 升级前等级 |
| pet_upgrade | 宠物升级 | 升级宠物 | client | to_level | 新等级 | 数值 | 升级后等级 |
| pet_upgrade | 宠物升级 | 升级宠物 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| pet_awaken | 宠物觉醒 | 宠物觉醒进阶 | client | pet_id | 宠物ID | 数值 | 宠物唯一标识 |
| pet_awaken | 宠物觉醒 | 宠物觉醒进阶 | client | awaken_stage | 觉醒阶段 | 数值 | 宠物觉醒阶段 |
| pet_awaken | 宠物觉醒 | 宠物觉醒进阶 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| pet_awaken | 宠物觉醒 | 宠物觉醒进阶 | client | result | 结果 | 文本 | 操作结果 success/fail |
| equip_drop | 装备掉落 | 获得装备或装备碎片 | client | equip_id | 装备ID | 数值 | 装备唯一标识 |
| equip_drop | 装备掉落 | 获得装备或装备碎片 | client | equip_name | 装备名称 | 文本 | 装备名称 |
| equip_drop | 装备掉落 | 获得装备或装备碎片 | client | rarity | 品质 | 数值 | 道具品质等级 |
| equip_drop | 装备掉落 | 获得装备或装备碎片 | client | source | 来源 | 文本 | 道具或玩家的来源 |
| equip_drop | 装备掉落 | 获得装备或装备碎片 | client | num | 数量 | 数值 | 道具数量 |
| equip_forge | 锻造 | 锻造装备或材料 | client | material_id | 材料ID | 数值 | 锻造消耗的材料ID |
| equip_forge | 锻造 | 锻造装备或材料 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| equip_forge | 锻造 | 锻造装备或材料 | client | result | 结果 | 文本 | 操作结果 success/fail |
| equip_forge | 锻造 | 锻造装备或材料 | client | is_success | 是否成功 | 布尔 | 操作是否成功 |
| equip_forge | 锻造 | 锻造装备或材料 | client | gain_crystal | 获得水晶精华 | 数值 | 锻造失败返还的水晶精华 |
| equip_decompose | 装备分解 | 分解装备获得材料 | client | equip_id | 装备ID | 数值 | 装备唯一标识 |
| equip_decompose | 装备分解 | 分解装备获得材料 | client | rarity | 品质 | 数值 | 道具品质等级 |
| equip_decompose | 装备分解 | 分解装备获得材料 | client | gain_item | 获得道具 | 文本 | 获得道具ID |
| equip_decompose | 装备分解 | 分解装备获得材料 | client | gain_num | 获得数量 | 数值 | 获得道具数量 |
| fragment_compose | 碎片合成 | 用碎片合成完整道具 | client | fragment_id | 碎片ID | 数值 | 碎片道具ID |
| fragment_compose | 碎片合成 | 用碎片合成完整道具 | client | fragment_num | 碎片数量 | 数值 | 消耗碎片数量 |
| fragment_compose | 碎片合成 | 用碎片合成完整道具 | client | result_id | 结果ID | 数值 | 操作产出的道具ID |
| fragment_compose | 碎片合成 | 用碎片合成完整道具 | client | result_name | 结果名称 | 文本 | 产出道具名称 |
| artifact_unlock | 神器解锁 | 解锁神器 | client | artifact_id | 神器ID | 数值 | 神器唯一标识 |
| artifact_unlock | 神器解锁 | 解锁神器 | client | artifact_name | 神器名称 | 文本 | 神器名称 |
| artifact_unlock | 神器解锁 | 解锁神器 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| artifact_bounty_claim | 神器赏金任务领取 | 领取神器赏金任务奖励 | client | task_id | 任务ID | 文本 | 任务唯一标识 |
| artifact_bounty_claim | 神器赏金任务领取 | 领取神器赏金任务奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| artifact_bounty_claim | 神器赏金任务领取 | 领取神器赏金任务奖励 | client | gold_supplement | 金币补足数量 | 数值 | 神器赏金任务补足的金币数 |
| energy_convert | 能量转换 | 能量转换为弹头/道具 | client | cost_energy | 消耗能量 | 数值 | 转换消耗的能量值 |
| energy_convert | 能量转换 | 能量转换为弹头/道具 | client | gain_item | 获得道具 | 文本 | 获得道具ID |
| energy_convert | 能量转换 | 能量转换为弹头/道具 | client | gain_num | 获得数量 | 数值 | 获得道具数量 |
| album_show | 图鉴曝光 | 打开图鉴 | client | album_type | 图鉴类型 | 文本 | 图鉴分类 |
| album_show | 图鉴曝光 | 打开图鉴 | client | collected | 已收集 | 数值 | 已收集数量 |
| album_show | 图鉴曝光 | 打开图鉴 | client | total | 总数 | 数值 | 可收集总数 |
| album_collect | 图鉴收集 | 图鉴新增收集 | client | album_type | 图鉴类型 | 文本 | 图鉴分类 |
| album_collect | 图鉴收集 | 图鉴新增收集 | client | item_id | 道具ID | 数值 | 通用道具标识 |
| album_collect | 图鉴收集 | 图鉴新增收集 | client | item_name | 道具名称 | 文本 | 通用道具名称 |
| album_collect | 图鉴收集 | 图鉴新增收集 | client | collected | 已收集 | 数值 | 已收集数量 |
| album_collect | 图鉴收集 | 图鉴新增收集 | client | total | 总数 | 数值 | 可收集总数 |
| collection_show | 收藏曝光 | 打开收藏系统 | client | collection_type | 收藏类型 | 文本 | 收藏分类 |
| develop_system_show | 养成系统曝光 | 打开养成系统总入口 | client | tab_id | 页签ID | 文本 | 页签标识 |
| develop_system_show | 养成系统曝光 | 打开养成系统总入口 | client | tab_name | 页签名称 | 文本 | 页签名称 |
| season_pass_show | 通行证曝光 | 打开赛季通行证 | client | season_id | 赛季ID | 文本 | 赛季唯一标识 |
| season_pass_show | 通行证曝光 | 打开赛季通行证 | client | level | 用户等级 | 数值 | 通行证或赛季等级 |
| season_pass_show | 通行证曝光 | 打开赛季通行证 | client | is_paid | 是否付费档 | 布尔 | 是否购买付费通行证 |
| season_pass_claim | 通行证领取 | 领取通行证奖励 | client | season_id | 赛季ID | 文本 | 赛季唯一标识 |
| season_pass_claim | 通行证领取 | 领取通行证奖励 | client | level | 用户等级 | 数值 | 通行证或赛季等级 |
| season_pass_claim | 通行证领取 | 领取通行证奖励 | client | is_paid | 是否付费档 | 布尔 | 是否购买付费通行证 |
| season_pass_claim | 通行证领取 | 领取通行证奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| season_pass_upgrade | 通行证升级 | 通行证等级提升 | client | season_id | 赛季ID | 文本 | 赛季唯一标识 |
| season_pass_upgrade | 通行证升级 | 通行证等级提升 | client | from_level | 原等级 | 数值 | 升级前等级 |
| season_pass_upgrade | 通行证升级 | 通行证等级提升 | client | to_level | 新等级 | 数值 | 升级后等级 |
| season_pass_upgrade | 通行证升级 | 通行证等级提升 | client | upgrade_type | 升级方式 | 文本 | task/pay/activity |
| avatar_change | 头像更换 | 更换头像 | client | avatar_id | 头像ID | 数值 | 头像唯一标识 |
| avatar_change | 头像更换 | 更换头像 | client | avatar_name | 头像名称 | 文本 | 头像名称 |
| avatar_frame_change | 头像框更换 | 更换头像框 | client | frame_id | 头像框ID | 数值 | 头像框唯一标识 |
| avatar_frame_change | 头像框更换 | 更换头像框 | client | frame_name | 头像框名称 | 文本 | 头像框名称 |
| personal_home_show | 个人主页曝光 | 打开个人主页 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |

### 社交

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| friend_list_show | 好友列表曝光 | 打开好友列表 | client | friend_count | 好友数 | 数值 | 好友总数 |
| friend_list_show | 好友列表曝光 | 打开好友列表 | client | online_count | 在线好友数 | 数值 | 在线好友数 |
| friend_add | 添加好友 | 添加好友成功 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| friend_add | 添加好友 | 添加好友成功 | client | source | 来源 | 文本 | 道具或玩家的来源 |
| friend_delete | 删除好友 | 删除好友 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| friend_gift_send | 好友送礼 | 向好友赠送礼物 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| friend_gift_send | 好友送礼 | 向好友赠送礼物 | client | gift_id | 礼包ID | 文本 | 礼包唯一标识 |
| friend_gift_send | 好友送礼 | 向好友赠送礼物 | client | gift_num | 礼物数量 | 数值 | 赠送礼物数量 |
| friend_gift_receive | 好友收礼 | 收到好友礼物 | client | from_user_id | 来源用户ID | 文本 | 礼物或消息的来源玩家 |
| friend_gift_receive | 好友收礼 | 收到好友礼物 | client | gift_id | 礼包ID | 文本 | 礼包唯一标识 |
| friend_gift_receive | 好友收礼 | 收到好友礼物 | client | gift_num | 礼物数量 | 数值 | 赠送礼物数量 |
| team_create | 创建队伍 | 创建队伍 | client | team_id | 队伍ID | 文本 | 队伍唯一标识 |
| team_create | 创建队伍 | 创建队伍 | client | team_type | 队伍类型 | 文本 | normal/rank |
| team_invite | 队伍邀请 | 邀请好友加入队伍 | client | team_id | 队伍ID | 文本 | 队伍唯一标识 |
| team_invite | 队伍邀请 | 邀请好友加入队伍 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| team_join | 加入队伍 | 加入他人队伍 | client | team_id | 队伍ID | 文本 | 队伍唯一标识 |
| team_join | 加入队伍 | 加入他人队伍 | client | member_count | 成员数 | 数值 | 队伍成员数 |
| team_leave | 离开队伍 | 离开队伍 | client | team_id | 队伍ID | 文本 | 队伍唯一标识 |
| team_leave | 离开队伍 | 离开队伍 | client | reason | 原因 | 文本 | 事件原因 |
| chat_send | 聊天发送 | 发送聊天消息（通用） | client | channel | 渠道/频道 | 文本 | 聊天频道或分享渠道 |
| chat_send | 聊天发送 | 发送聊天消息（通用） | client | msg_type | 消息类型 | 文本 | text/voice/emoji |
| chat_send | 聊天发送 | 发送聊天消息（通用） | client | has_emoji | 含表情 | 布尔 | 消息是否含表情 |
| chat_receive | 聊天接收 | 收到聊天消息 | client | channel | 渠道/频道 | 文本 | 聊天频道或分享渠道 |
| chat_receive | 聊天接收 | 收到聊天消息 | client | msg_type | 消息类型 | 文本 | text/voice/emoji |
| share_click | 分享点击 | 点击分享 | client | share_scene | 分享场景 | 文本 | 分享发生的场景 |
| share_click | 分享点击 | 点击分享 | client | content_type | 内容类型 | 文本 | 分享内容类型 |
| share_click | 分享点击 | 点击分享 | client | channel | 渠道/频道 | 文本 | 聊天频道或分享渠道 |
| share_success | 分享成功 | 分享成功回调 | client | share_scene | 分享场景 | 文本 | 分享发生的场景 |
| share_success | 分享成功 | 分享成功回调 | client | content_type | 内容类型 | 文本 | 分享内容类型 |
| share_success | 分享成功 | 分享成功回调 | client | channel | 渠道/频道 | 文本 | 聊天频道或分享渠道 |

### 新手引导

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| guide_start | 新手引导开始 | 首次进入新手引导流程 | client | guide_id | 引导ID | 文本 | 新手引导版本标识 |
| guide_start | 新手引导开始 | 首次进入新手引导流程 | client | entry_scene | 来源场景 | 文本 | 进入时的来源场景标识 |
| guide_step | 引导分步完成 | 完成引导的每一个步骤（漏斗核心） | client | guide_id | 引导ID | 文本 | 新手引导版本标识 |
| guide_step | 引导分步完成 | 完成引导的每一个步骤（漏斗核心） | client | step_id | 步骤ID | 数值 | 引导步骤序号 |
| guide_step | 引导分步完成 | 完成引导的每一个步骤（漏斗核心） | client | step_name | 步骤名称 | 文本 | 引导步骤名称 |
| guide_step | 引导分步完成 | 完成引导的每一个步骤（漏斗核心） | client | step_cost_ms | 步骤耗时 | 数值 | 该步骤停留毫秒数 |
| guide_skip | 引导跳过 | 点击跳过引导 | client | guide_id | 引导ID | 文本 | 新手引导版本标识 |
| guide_skip | 引导跳过 | 点击跳过引导 | client | at_step_id | 跳过时步骤 | 数值 | 在第几步跳过 |
| guide_complete | 引导完成 | 引导全流程结束 | client | guide_id | 引导ID | 文本 | 新手引导版本标识 |
| guide_complete | 引导完成 | 引导全流程结束 | client | total_cost_ms | 总耗时 | 数值 | 流程总耗时毫秒数 |
| guide_complete | 引导完成 | 引导全流程结束 | client | is_skipped | 是否跳过 | 布尔 | 是否跳过引导 |
| newbie_room_enter | 新手房进入 | 进入新手引导渔场/新手剧本房 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| newbie_room_enter | 新手房进入 | 进入新手引导渔场/新手剧本房 | client | room_name | 房间名称 | 文本 | 当前房间名称 |
| newbie_task_show | 新手任务曝光 | 新手任务面板曝光 | client | task_id | 任务ID | 文本 | 任务唯一标识 |
| newbie_task_show | 新手任务曝光 | 新手任务面板曝光 | client | task_progress | 任务进度 | 数值 | 任务当前进度 |
| newbie_task_claim | 新手任务领取 | 领取新手任务奖励 | client | task_id | 任务ID | 文本 | 任务唯一标识 |
| newbie_task_claim | 新手任务领取 | 领取新手任务奖励 | client | reward_id | 奖励ID | 文本 | 奖励道具ID |
| newbie_task_claim | 新手任务领取 | 领取新手任务奖励 | client | reward_num | 奖励数量 | 数值 | 奖励道具数量 |
| newbie_seven_day_show | 新手七天曝光 | 新手七天登录面板曝光 | client | day_index | 第几天 | 数值 | 签到或领取的天序号 |
| newbie_seven_day_show | 新手七天曝光 | 新手七天登录面板曝光 | client | is_claimed | 是否已领取 | 布尔 | 该奖励是否已领取 |
| newbie_seven_day_claim | 新手七天领取 | 领取新手七天奖励 | client | day_index | 第几天 | 数值 | 签到或领取的天序号 |
| newbie_seven_day_claim | 新手七天领取 | 领取新手七天奖励 | client | coin_count | 金币数量 | 数值 | 涉及的金币数量 |
| newbie_sprint_claim | 新手冲刺领取 | 领取新手冲刺奖励 | client | tier | 档位 | 数值 | 奖励档位 |
| newbie_sprint_claim | 新手冲刺领取 | 领取新手冲刺奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| newbie_voyage_step | 新手旅程进度 | 新手旅程推进到新阶段 | client | stage_id | 阶段ID | 文本 | 阶段唯一标识 |
| newbie_voyage_step | 新手旅程进度 | 新手旅程推进到新阶段 | client | progress | 进度 | 数值 | 活动或收集进度 |

### 大厅

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| lobby_show | 大厅曝光 | 进入大厅并渲染完成 | client | from_scene | 来源场景 (from_scene) | 文本 | 跳转前的场景标识 |
| lobby_module_click | 大厅模块点击 | 点击大厅任意功能入口（通用，覆盖全部入口） | client | module_id | 模块ID | 文本 | 功能模块唯一标识 |
| lobby_module_click | 大厅模块点击 | 点击大厅任意功能入口（通用，覆盖全部入口） | client | module_name | 模块名称 | 文本 | 功能模块名称 |
| lobby_module_click | 大厅模块点击 | 点击大厅任意功能入口（通用，覆盖全部入口） | client | position | 位置 | 文本 | 在页面中的位置序号 |
| lobby_banner_show | 大厅横幅曝光 | 大厅轮播横幅曝光 | client | banner_id | 横幅ID | 文本 | 轮播横幅标识 |
| lobby_banner_show | 大厅横幅曝光 | 大厅轮播横幅曝光 | client | position | 位置 | 文本 | 在页面中的位置序号 |
| lobby_banner_show | 大厅横幅曝光 | 大厅轮播横幅曝光 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| lobby_banner_click | 大厅横幅点击 | 点击大厅横幅 | client | banner_id | 横幅ID | 文本 | 轮播横幅标识 |
| lobby_banner_click | 大厅横幅点击 | 点击大厅横幅 | client | position | 位置 | 文本 | 在页面中的位置序号 |
| lobby_banner_click | 大厅横幅点击 | 点击大厅横幅 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| lobby_popup_show | 大厅弹窗曝光 | 任意大厅弹窗曝光 | client | popup_id | 弹窗ID | 文本 | 弹窗唯一标识 |
| lobby_popup_show | 大厅弹窗曝光 | 任意大厅弹窗曝光 | client | popup_type | 弹窗类型 | 文本 | activity/pay/notice/tip |
| lobby_popup_show | 大厅弹窗曝光 | 任意大厅弹窗曝光 | client | source | 来源 | 文本 | 道具或玩家的来源 |
| lobby_popup_click | 大厅弹窗点击 | 点击弹窗主按钮 | client | popup_id | 弹窗ID | 文本 | 弹窗唯一标识 |
| lobby_popup_click | 大厅弹窗点击 | 点击弹窗主按钮 | client | button_name | 按钮名称 | 文本 | 被点击按钮文案或标识 |
| lobby_popup_close | 大厅弹窗关闭 | 关闭弹窗 | client | popup_id | 弹窗ID | 文本 | 弹窗唯一标识 |
| lobby_popup_close | 大厅弹窗关闭 | 关闭弹窗 | client | stay_duration_s | 停留时长 | 数值 | 页面或弹窗停留秒数 |
| lobby_popup_close | 大厅弹窗关闭 | 关闭弹窗 | client | close_type | 关闭方式 | 文本 | manual/auto/jump |
| lobby_reddot_show | 红点曝光 | 功能入口出现红点 | client | reddot_id | 红点ID | 文本 | 红点标识 |
| lobby_reddot_show | 红点曝光 | 功能入口出现红点 | client | position | 位置 | 文本 | 在页面中的位置序号 |
| lobby_reddot_click | 红点点击 | 点击带红点的入口 | client | reddot_id | 红点ID | 文本 | 红点标识 |
| lobby_reddot_click | 红点点击 | 点击带红点的入口 | client | position | 位置 | 文本 | 在页面中的位置序号 |
| lobby_mail_show | 邮件曝光 | 打开邮件列表 | client | mail_count | 邮件数量 | 数值 | 邮件总数 |
| lobby_mail_show | 邮件曝光 | 打开邮件列表 | client | unread_count | 未读数量 | 数值 | 未读邮件数量 |
| lobby_mail_claim | 邮件领取 | 领取邮件附件 | client | mail_id | 邮件ID | 文本 | 邮件唯一标识 |
| lobby_mail_claim | 邮件领取 | 领取邮件附件 | client | attach_id | 附件ID | 文本 | 邮件附件道具ID |
| lobby_mail_claim | 邮件领取 | 领取邮件附件 | client | attach_num | 附件数量 | 数值 | 邮件附件数量 |
| lobby_announcement_show | 公告曝光 | 公告弹窗或跑马灯曝光 | client | notice_id | 公告ID | 文本 | 公告标识 |
| lobby_announcement_show | 公告曝光 | 公告弹窗或跑马灯曝光 | client | notice_type | 公告类型 (notice_type) | 文本 | 公告类型标识 |
| lobby_task_show | 任务面板曝光 | 打开任务面板 | client | task_type | 任务类型 | 文本 | daily/weekly/activity |
| lobby_task_claim | 任务奖励领取 | 领取任务奖励 | client | task_id | 任务ID | 文本 | 任务唯一标识 |
| lobby_task_claim | 任务奖励领取 | 领取任务奖励 | client | task_type | 任务类型 | 文本 | daily/weekly/activity |
| lobby_task_claim | 任务奖励领取 | 领取任务奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| lobby_rank_show | 大厅排行榜曝光 | 打开排行榜 | client | rank_type | 榜单类型 | 文本 | 排行类型 |
| lobby_rank_show | 大厅排行榜曝光 | 打开排行榜 | client | rank_scope | 榜单范围 | 文本 | global/friend/room |
| lobby_player_info_show | 个人信息曝光 | 打开个人资料页 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| lobby_player_view | 查看他人信息 | 点击查看其他玩家资料 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| lobby_player_view | 查看他人信息 | 点击查看其他玩家资料 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| lobby_setting_show | 设置曝光 | 打开设置页 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| lobby_customer_service | 客服点击 | 点击联系客服 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| lobby_chat_send | 大厅聊天发送 | 在大厅发送聊天消息 | client | channel | 渠道/频道 | 文本 | 聊天频道或分享渠道 |
| lobby_chat_send | 大厅聊天发送 | 在大厅发送聊天消息 | client | msg_type | 消息类型 | 文本 | text/voice/emoji |

### 房间

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| scene_list_show | 场次列表曝光 | 打开场次选择界面 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| scene_list_show | 场次列表曝光 | 打开场次选择界面 | client | unlocked_count | 已解锁数量 | 数值 | 已解锁的场次数量 |
| scene_select | 场次选择 | 选中某个场次 | client | scene_id | 场次ID | 数值 | 场次唯一标识 |
| scene_select | 场次选择 | 选中某个场次 | client | scene_name | 场次名称 | 文本 | 场次名称 |
| scene_select | 场次选择 | 选中某个场次 | client | is_unlocked | 是否已解锁 | 布尔 | 场次是否已解锁 |
| scene_unlock | 场次解锁 | 解锁新场次 | client | scene_id | 场次ID | 数值 | 场次唯一标识 |
| scene_unlock | 场次解锁 | 解锁新场次 | client | scene_name | 场次名称 | 文本 | 场次名称 |
| scene_unlock | 场次解锁 | 解锁新场次 | client | unlock_condition | 解锁条件 | 文本 | 解锁所需条件描述 |
| scene_unlock | 场次解锁 | 解锁新场次 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| scene_unlock_fail | 场次解锁失败 | 解锁条件不满足 | client | scene_id | 场次ID | 数值 | 场次唯一标识 |
| scene_unlock_fail | 场次解锁失败 | 解锁条件不满足 | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| room_list_show | 房间列表曝光 | 打开房间列表 | client | scene_id | 场次ID | 数值 | 场次唯一标识 |
| room_list_show | 房间列表曝光 | 打开房间列表 | client | room_count | 房间数量 | 数值 | 当前场次房间数 |
| room_select | 房间选择 | 选中某个房间 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_select | 房间选择 | 选中某个房间 | client | room_name | 房间名称 | 文本 | 当前房间名称 |
| room_enter_request | 进入房间请求 | 点击进入房间，发起请求 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_enter_request | 进入房间请求 | 点击进入房间，发起请求 | client | room_name | 房间名称 | 文本 | 当前房间名称 |
| room_enter_request | 进入房间请求 | 点击进入房间，发起请求 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| room_enter_success | 进入房间成功 | 服务端返回进入成功 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_enter_success | 进入房间成功 | 服务端返回进入成功 | client | room_name | 房间名称 | 文本 | 当前房间名称 |
| room_enter_success | 进入房间成功 | 服务端返回进入成功 | client | cost_ms | 耗时 | 数值 | 接口或操作耗时毫秒数 |
| room_enter_success | 进入房间成功 | 服务端返回进入成功 | client | is_matched | 是否匹配进入 | 布尔 | 是否通过匹配进入 |
| room_enter_fail | 进入房间失败 | 进入房间被拒绝（关键，需明确原因） | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_enter_fail | 进入房间失败 | 进入房间被拒绝（关键，需明确原因） | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| room_enter_fail | 进入房间失败 | 进入房间被拒绝（关键，需明确原因） | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| room_leave | 离开房间 | 主动或被动离开房间 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_leave | 离开房间 | 主动或被动离开房间 | client | stay_duration_s | 停留时长 | 数值 | 页面或弹窗停留秒数 |
| room_leave | 离开房间 | 主动或被动离开房间 | client | leave_type | 离开类型 | 文本 | active/kick/disconnect |
| room_match_start | 匹配开始 | 进入匹配队列 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_match_start | 匹配开始 | 进入匹配队列 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| room_match_success | 匹配成功 | 匹配到房间 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_match_success | 匹配成功 | 匹配到房间 | client | wait_cost_ms | 等待时长 | 数值 | 匹配等待毫秒数 |
| room_match_cancel | 取消匹配 | 取消匹配 | client | wait_cost_ms | 等待时长 | 数值 | 匹配等待毫秒数 |
| room_create | 创建房间 | 创建自选房/密码房 | client | room_type | 房间类型 | 文本 | normal/private/match/guide |
| room_create | 创建房间 | 创建自选房/密码房 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_create | 创建房间 | 创建自选房/密码房 | client | has_password | 是否有密码 | 布尔 | 房间是否设置密码 |
| room_join_by_no | 房间号加入 | 输入房间号加入 | client | room_no | 房间号 | 文本 | 玩家输入的房间号 |
| room_join_by_no | 房间号加入 | 输入房间号加入 | client | result | 结果 | 文本 | 操作结果 success/fail |
| room_join_by_no | 房间号加入 | 输入房间号加入 | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| room_kick | 被踢出房间 | 被房主踢出或系统踢出 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| room_kick | 被踢出房间 | 被房主踢出或系统踢出 | client | kick_reason | 踢出原因 | 文本 | 被踢出的原因 |
| room_switch | 切换房间 | 从一个房间切换到另一个 | client | from_room_id | 原房间ID | 数值 | 切换前房间 |
| room_switch | 切换房间 | 从一个房间切换到另一个 | client | to_room_id | 目标房间ID (to_room_id) | 数值 | 切换后房间 |
| room_switch | 切换房间 | 从一个房间切换到另一个 | client | stay_duration_s | 停留时长 | 数值 | 页面或弹窗停留秒数 |
| room_quick_start | 快速开始点击 | 点击快速开始按钮 | client | from_scene | 来源场景 (from_scene) | 文本 | 跳转前的场景标识 |

### 对局

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| game_enter | 进入对局 | 进入捕鱼对局场景 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| game_enter | 进入对局 | 进入捕鱼对局场景 | client | room_name | 房间名称 | 文本 | 当前房间名称 |
| game_enter | 进入对局 | 进入捕鱼对局场景 | client | scene_id | 场次ID | 数值 | 场次唯一标识 |
| game_start | 对局开始 | 对局正式开始可操作 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| game_start | 对局开始 | 对局正式开始可操作 | client | player_count | 玩家人数 | 数值 | 房间内玩家数量 |
| game_ready | 准备完成 | 点击准备 | client | cost_ms | 耗时 | 数值 | 接口或操作耗时毫秒数 |
| game_bet_change | 炮倍切换 | 玩家切换炮倍档位（关键） | client | from_bet | 原炮倍 | 数值 | 切换前炮倍档位 |
| game_bet_change | 炮倍切换 | 玩家切换炮倍档位（关键） | client | to_bet | 新炮倍 | 数值 | 切换后炮倍档位 |
| game_bet_unlock | 炮倍解锁 | 解锁新的炮倍档位 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| game_bet_unlock | 炮倍解锁 | 解锁新的炮倍档位 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| game_bet_unlock | 炮倍解锁 | 解锁新的炮倍档位 | client | unlock_type | 解锁方式 | 文本 | free/pay/level/task |
| game_bet_unlock_fail | 炮倍解锁失败 | 炮倍解锁条件不足 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| game_bet_unlock_fail | 炮倍解锁失败 | 炮倍解锁条件不足 | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| game_fire | 开炮 | 每次发射子弹（高频，建议采样上报） | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| game_fire | 开炮 | 每次发射子弹（高频，建议采样上报） | client | cost_gold | 消耗金币 | 数值 | 本次操作消耗金币 |
| game_fire | 开炮 | 每次发射子弹（高频，建议采样上报） | client | bullet_type | 子弹类型 | 文本 | 普通/激光/能量弹 |
| game_fire | 开炮 | 每次发射子弹（高频，建议采样上报） | client | is_auto | 是否自动 | 布尔 | 是否自动开炮 |
| game_auto_fire_toggle | 自动开炮开关 | 开启或关闭自动开炮 | client | is_on | 开关状态 | 布尔 | 自动开炮开关状态 |
| game_auto_fire_toggle | 自动开炮开关 | 开启或关闭自动开炮 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| game_lock_start | 锁定开始 | 使用锁定技能锁定目标 | client | target_fish_id | 目标鱼ID | 数值 | 锁定的鱼ID |
| game_lock_start | 锁定开始 | 使用锁定技能锁定目标 | client | target_fish_name | 目标鱼名称 | 文本 | 锁定的鱼名称 |
| game_lock_start | 锁定开始 | 使用锁定技能锁定目标 | client | target_multiple | 目标倍率 | 数值 | 目标鱼的倍率 |
| game_lock_end | 锁定结束 | 锁定状态解除 | client | target_fish_id | 目标鱼ID | 数值 | 锁定的鱼ID |
| game_lock_end | 锁定结束 | 锁定状态解除 | client | duration_s | 持续时长 | 数值 | 事件或状态持续秒数 |
| game_lock_end | 锁定结束 | 锁定状态解除 | client | is_killed | 是否击杀 | 布尔 | 锁定目标是否被击杀 |
| game_skill_use | 技能使用 | 使用任意技能（冰冻/狂暴/分身/锁定/葫芦） | client | skill_id | 技能ID | 数值 | 技能唯一标识 |
| game_skill_use | 技能使用 | 使用任意技能（冰冻/狂暴/分身/锁定/葫芦） | client | skill_name | 技能名称 | 文本 | 技能名称 |
| game_skill_use | 技能使用 | 使用任意技能（冰冻/狂暴/分身/锁定/葫芦） | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| game_skill_use | 技能使用 | 使用任意技能（冰冻/狂暴/分身/锁定/葫芦） | client | skill_remain_count | 技能剩余次数 | 数值 | 技能剩余可用次数 |
| game_skill_end | 技能结束 | 技能效果结束 | client | skill_id | 技能ID | 数值 | 技能唯一标识 |
| game_skill_end | 技能结束 | 技能效果结束 | client | skill_name | 技能名称 | 文本 | 技能名称 |
| game_skill_end | 技能结束 | 技能效果结束 | client | duration_s | 持续时长 | 数值 | 事件或状态持续秒数 |
| game_skill_end | 技能结束 | 技能效果结束 | client | gold_gain_during | 期间收益 | 数值 | 技能生效期间获得金币 |
| game_skill_buy | 技能购买 | 在对局内购买技能次数 | client | skill_id | 技能ID | 数值 | 技能唯一标识 |
| game_skill_buy | 技能购买 | 在对局内购买技能次数 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| game_prop_use | 道具使用 | 使用道具 | client | prop_id | 道具ID (prop_id) | 数值 | 道具唯一标识 |
| game_prop_use | 道具使用 | 使用道具 | client | prop_name | 道具名称 (prop_name) | 文本 | 道具名称 |
| game_prop_use | 道具使用 | 使用道具 | client | use_scene | 使用场景 | 文本 | 道具使用场景 |
| game_prop_buy | 道具购买 | 购买道具 | client | prop_id | 道具ID (prop_id) | 数值 | 道具唯一标识 |
| game_prop_buy | 道具购买 | 购买道具 | client | prop_name | 道具名称 (prop_name) | 文本 | 道具名称 |
| game_prop_buy | 道具购买 | 购买道具 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| fish_kill | 击杀鱼 | 击杀任意鱼类（核心事件） | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| fish_kill | 击杀鱼 | 击杀任意鱼类（核心事件） | client | fish_name | 鱼名称 | 文本 | 鱼种名称 |
| fish_kill | 击杀鱼 | 击杀任意鱼类（核心事件） | client | fish_type | 鱼类型 | 文本 | normal/gold/special/elite/boss |
| fish_kill | 击杀鱼 | 击杀任意鱼类（核心事件） | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| fish_kill | 击杀鱼 | 击杀任意鱼类（核心事件） | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| fish_kill | 击杀鱼 | 击杀任意鱼类（核心事件） | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| fish_kill_boss | BOSS击杀 | 击杀 BOSS 鱼 | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| fish_kill_boss | BOSS击杀 | 击杀 BOSS 鱼 | client | fish_name | 鱼名称 | 文本 | 鱼种名称 |
| fish_kill_boss | BOSS击杀 | 击杀 BOSS 鱼 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| fish_kill_boss | BOSS击杀 | 击杀 BOSS 鱼 | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| fish_kill_boss | BOSS击杀 | 击杀 BOSS 鱼 | client | damage_rank | 伤害排名 | 数值 | BOSS 伤害排名 |
| fish_kill_elite | 精英鱼击杀 | 击杀精英鱼 | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| fish_kill_elite | 精英鱼击杀 | 击杀精英鱼 | client | fish_name | 鱼名称 | 文本 | 鱼种名称 |
| fish_kill_elite | 精英鱼击杀 | 击杀精英鱼 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| fish_kill_elite | 精英鱼击杀 | 击杀精英鱼 | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| fish_kill_gold | 奖金鱼击杀 | 击杀奖金鱼 | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| fish_kill_gold | 奖金鱼击杀 | 击杀奖金鱼 | client | fish_name | 鱼名称 | 文本 | 鱼种名称 |
| fish_kill_gold | 奖金鱼击杀 | 击杀奖金鱼 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| fish_kill_gold | 奖金鱼击杀 | 击杀奖金鱼 | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| fish_kill_special | 特殊鱼击杀 | 击杀特殊鱼（含转盘鱼/红包鱼） | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| fish_kill_special | 特殊鱼击杀 | 击杀特殊鱼（含转盘鱼/红包鱼） | client | fish_name | 鱼名称 | 文本 | 鱼种名称 |
| fish_kill_special | 特殊鱼击杀 | 击杀特殊鱼（含转盘鱼/红包鱼） | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| fish_kill_special | 特殊鱼击杀 | 击杀特殊鱼（含转盘鱼/红包鱼） | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| fish_escape | 鱼逃脱 | 锁定目标逃脱 | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| fish_escape | 鱼逃脱 | 锁定目标逃脱 | client | fish_name | 鱼名称 | 文本 | 鱼种名称 |
| fish_escape | 鱼逃脱 | 锁定目标逃脱 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| game_gold_change | 金币变化 | 对局内金币发生增减 | client | change_amount | 变化量 | 数值 | 数值增减量，负数为减少 |
| game_gold_change | 金币变化 | 对局内金币发生增减 | client | change_reason | 变化原因 | 文本 | 数值变化原因 |
| game_gold_change | 金币变化 | 对局内金币发生增减 | client | current_gold | 当前金币 | 数值 | 变化后金币 |
| game_energy_change | 能量变化 | 能量值发生增减 | client | change_amount | 变化量 | 数值 | 数值增减量，负数为减少 |
| game_energy_change | 能量变化 | 能量值发生增减 | client | change_reason | 变化原因 | 文本 | 数值变化原因 |
| game_energy_change | 能量变化 | 能量值发生增减 | client | current_energy | 当前能量 | 数值 | 变化后能量 |
| game_sudden_wealth | 暴富啦触发 | 单次收益达到房间暴富阈值 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| game_sudden_wealth | 暴富啦触发 | 单次收益达到房间暴富阈值 | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| game_sudden_wealth | 暴富啦触发 | 单次收益达到房间暴富阈值 | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| game_sudden_wealth | 暴富啦触发 | 单次收益达到房间暴富阈值 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| game_fortune_trigger | 财运亨通触发 | 单次收益达到财运阈值 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| game_fortune_trigger | 财运亨通触发 | 单次收益达到财运阈值 | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| game_fortune_trigger | 财运亨通触发 | 单次收益达到财运阈值 | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| game_bigwin | BigWin 触发 | 单次收益达到 BigWin 阈值 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| game_bigwin | BigWin 触发 | 单次收益达到 BigWin 阈值 | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| game_bigwin | BigWin 触发 | 单次收益达到 BigWin 阈值 | client | fish_id | 鱼ID | 数值 | 鱼种唯一标识 |
| game_prizepool_trigger | 奖池触发 | 击中奖池 | client | pool_gold | 奖池金币 | 数值 | 奖池当前金额 |
| game_prizepool_trigger | 奖池触发 | 击中奖池 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| game_frenzy_start | 狂暴开始 | 房间进入狂暴状态 | client | frenzy_level | 狂暴等级 | 数值 | 狂暴等级 |
| game_frenzy_start | 狂暴开始 | 房间进入狂暴状态 | client | trigger_reason | 触发原因 | 文本 | 状态触发原因 |
| game_frenzy_end | 狂暴结束 | 狂暴状态结束 | client | frenzy_level | 狂暴等级 | 数值 | 狂暴等级 |
| game_frenzy_end | 狂暴结束 | 狂暴状态结束 | client | duration_s | 持续时长 | 数值 | 事件或状态持续秒数 |
| game_kill_board_show | 击杀公告曝光 | 击杀公告弹出 | client | board_type | 公告类型 | 文本 | 公告种类 |
| game_kill_board_show | 击杀公告曝光 | 击杀公告弹出 | client | is_real | 是否真实 | 布尔 | 真击杀公告/假击杀公告 |
| game_kill_board_show | 击杀公告曝光 | 击杀公告弹出 | client | multiple | 倍率 | 数值 | 鱼的赔付倍率 |
| game_prizepool_board_show | 奖池公告曝光 | 奖池公告弹出 | client | pool_gold | 奖池金币 | 数值 | 奖池当前金额 |
| game_player_join | 对局内玩家加入 | 其他玩家进入当前房间 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| game_player_join | 对局内玩家加入 | 其他玩家进入当前房间 | client | player_count | 玩家人数 | 数值 | 房间内玩家数量 |
| game_player_leave | 对局内玩家离开 | 其他玩家离开当前房间 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| game_player_leave | 对局内玩家离开 | 其他玩家离开当前房间 | client | player_count | 玩家人数 | 数值 | 房间内玩家数量 |
| game_chat | 对局内聊天 | 在对局内发送消息 | client | channel | 渠道/频道 | 文本 | 聊天频道或分享渠道 |
| game_chat | 对局内聊天 | 在对局内发送消息 | client | msg_type | 消息类型 | 文本 | text/voice/emoji |
| game_view_player | 查看对局内玩家 | 点击查看同房玩家信息 | client | target_user_id | 目标用户ID | 文本 | 被查看/被操作的玩家ID |
| game_world_boss_enter | 世界BOSS进入 | 世界BOSS玩法开启并进入 | client | boss_id | BOSS ID | 数值 | BOSS 唯一标识 |
| game_world_boss_enter | 世界BOSS进入 | 世界BOSS玩法开启并进入 | client | boss_name | BOSS 名称 | 文本 | BOSS 名称 |
| game_world_boss_enter | 世界BOSS进入 | 世界BOSS玩法开启并进入 | client | entry_time | 入场时间 | 文本 | BOSS 入场时间点 |
| game_world_boss_kill | 世界BOSS击杀 | 参与击杀世界BOSS | client | boss_id | BOSS ID | 数值 | BOSS 唯一标识 |
| game_world_boss_kill | 世界BOSS击杀 | 参与击杀世界BOSS | client | damage | 伤害值 | 数值 | 对 BOSS 造成的伤害 |
| game_world_boss_kill | 世界BOSS击杀 | 参与击杀世界BOSS | client | damage_rank | 伤害排名 | 数值 | BOSS 伤害排名 |
| game_world_boss_kill | 世界BOSS击杀 | 参与击杀世界BOSS | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| game_secret_realm_enter | 秘境进入 | 使用道具令全房间进入秘境 | client | prop_id | 道具ID (prop_id) | 数值 | 道具唯一标识 |
| game_secret_realm_enter | 秘境进入 | 使用道具令全房间进入秘境 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| game_secret_realm_enter | 秘境进入 | 使用道具令全房间进入秘境 | client | player_count | 玩家人数 | 数值 | 房间内玩家数量 |
| game_dragon_summon | 召唤红龙 | 召唤红龙/BOSS 鱼 | client | summon_type | 召唤类型 | 文本 | 召唤的鱼或 BOSS 类型 |
| game_dragon_summon | 召唤红龙 | 召唤红龙/BOSS 鱼 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |
| game_dragon_summon | 召唤红龙 | 召唤红龙/BOSS 鱼 | client | result | 结果 | 文本 | 操作结果 success/fail |
| game_network_error | 对局网络异常 | 对局中网络中断 | client | error_type | 错误类型 | 文本 | 错误分类 |
| game_network_error | 对局网络异常 | 对局中网络中断 | client | latency_ms | 延迟 | 数值 | 网络延迟毫秒数 |
| game_reconnect | 对局重连 | 网络恢复后重连成功 | client | cost_ms | 耗时 | 数值 | 接口或操作耗时毫秒数 |
| game_reconnect | 对局重连 | 网络恢复后重连成功 | client | disconnect_duration_s | 断线时长 | 数值 | 断线持续秒数 |
| game_pause | 对局暂停 | 对局暂停 | client | reason | 原因 | 文本 | 事件原因 |
| game_end | 对局结束 | 离开对局场景 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| game_end | 对局结束 | 离开对局场景 | client | duration_s | 持续时长 | 数值 | 事件或状态持续秒数 |
| game_end | 对局结束 | 离开对局场景 | client | end_reason | 结束原因 | 文本 | 对局结束原因 |
| game_settle_show | 结算页曝光 | 结算面板曝光 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| game_settle_detail | 结算详情 | 结算数据生成（核心分析事件） | client | cost_gold | 消耗金币 | 数值 | 本次操作消耗金币 |
| game_settle_detail | 结算详情 | 结算数据生成（核心分析事件） | client | gain_gold | 获得金币 | 数值 | 本次获得金币数 |
| game_settle_detail | 结算详情 | 结算数据生成（核心分析事件） | client | net_gold | 金币净增 | 数值 | 对局金币净变化 |
| game_settle_detail | 结算详情 | 结算数据生成（核心分析事件） | client | kill_count | 击杀数 | 数值 | 本局击杀鱼数量 |
| game_settle_detail | 结算详情 | 结算数据生成（核心分析事件） | client | fire_count | 开炮数 | 数值 | 本局开炮次数 |
| game_settle_detail | 结算详情 | 结算数据生成（核心分析事件） | client | hit_rate | 命中率 | 数值 | 击杀/开炮比率 |
| game_settle_detail | 结算详情 | 结算数据生成（核心分析事件） | client | duration_s | 持续时长 | 数值 | 事件或状态持续秒数 |
| game_bankrupt | 破产 | 对局中金币耗尽 | client | cost_gold | 消耗金币 | 数值 | 本次操作消耗金币 |
| game_bankrupt | 破产 | 对局中金币耗尽 | client | duration_s | 持续时长 | 数值 | 事件或状态持续秒数 |
| game_bankrupt | 破产 | 对局中金币耗尽 | client | bet_level | 当前炮倍 | 数值 | 当前炮倍档位 |
| game_bankrupt | 破产 | 对局中金币耗尽 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| game_relief_show | 救济金曝光 | 破产救济弹窗曝光 | client | relief_amount | 救济金额 | 数值 | 领取的救济金数量 |
| game_relief_show | 救济金曝光 | 破产救济弹窗曝光 | client | bankrupt_count_today | 今日破产次数 | 数值 | 当日破产累计次数 |
| game_relief_claim | 救济金领取 | 领取救济金 | client | relief_amount | 救济金额 | 数值 | 领取的救济金数量 |
| game_relief_claim | 救济金领取 | 领取救济金 | client | claim_type | 领取类型 | 文本 | free/pay/activity |
| game_revive_click | 复活点击 | 点击复活按钮 | client | cost_type | 消耗类型 | 文本 | gold/diamond/coupon/activity_coin |
| game_revive_click | 复活点击 | 点击复活按钮 | client | cost_amount | 消耗数量 | 数值 | 消耗数量 |
| game_continue_click | 续玩点击 | 结算后点击继续游戏 | client | target_room_id | 目标房间ID | 数值 | 跳转的目标房间ID |
| game_next_room | 进入下一房间 | 结算后跳转到下一个房间 | client | from_room_id | 原房间ID | 数值 | 切换前房间 |
| game_next_room | 进入下一房间 | 结算后跳转到下一个房间 | client | to_room_id | 目标房间ID (to_room_id) | 数值 | 切换后房间 |
| game_exit | 退出对局 | 结算后返回大厅 | client | room_id | 房间ID | 数值 | 当前所在房间ID，不在房间为0 |
| game_exit | 退出对局 | 结算后返回大厅 | client | total_duration_s | 总时长 | 数值 | 总持续秒数 |
| game_result_share | 战绩分享 | 分享对局战绩 | client | share_channel | 分享渠道 | 文本 | 分享到的渠道 |
| game_result_share | 战绩分享 | 分享对局战绩 | client | net_gold | 金币净增 | 数值 | 对局金币净变化 |

### 付费

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| shop_show | 商城曝光 | 打开商城 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| shop_show | 商城曝光 | 打开商城 | client | default_tab | 默认页签 | 文本 | 打开时默认选中的页签 |
| shop_tab_click | 商城页签点击 | 切换商城页签 | client | tab_id | 页签ID | 文本 | 页签标识 |
| shop_tab_click | 商城页签点击 | 切换商城页签 | client | tab_name | 页签名称 | 文本 | 页签名称 |
| shop_item_show | 商品曝光 | 商品在列表中曝光 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| shop_item_show | 商品曝光 | 商品在列表中曝光 | client | product_name | 商品名称 | 文本 | 商品名称 |
| shop_item_show | 商品曝光 | 商品在列表中曝光 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| shop_item_show | 商品曝光 | 商品在列表中曝光 | client | product_type | 商品类型 | 文本 | gold/diamond/gift/month_card |
| shop_item_show | 商品曝光 | 商品在列表中曝光 | client | position | 位置 | 文本 | 在页面中的位置序号 |
| shop_item_click | 商品点击 | 点击商品 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| shop_item_click | 商品点击 | 点击商品 | client | product_name | 商品名称 | 文本 | 商品名称 |
| shop_item_click | 商品点击 | 点击商品 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| shop_item_click | 商品点击 | 点击商品 | client | product_type | 商品类型 | 文本 | gold/diamond/gift/month_card |
| pay_start | 发起支付 | 点击支付并发起订单 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| pay_start | 发起支付 | 点击支付并发起订单 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| pay_start | 发起支付 | 点击支付并发起订单 | client | pay_channel | 支付渠道 | 文本 | wechat/alipay/apple |
| pay_start | 发起支付 | 点击支付并发起订单 | client | order_id | 订单号 | 文本 | 支付订单唯一标识 |
| pay_success | 支付成功 | 支付回调成功（核心付费事件） | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| pay_success | 支付成功 | 支付回调成功（核心付费事件） | client | product_name | 商品名称 | 文本 | 商品名称 |
| pay_success | 支付成功 | 支付回调成功（核心付费事件） | client | price | 价格 | 数值 | 商品价格（人民币分） |
| pay_success | 支付成功 | 支付回调成功（核心付费事件） | client | order_id | 订单号 | 文本 | 支付订单唯一标识 |
| pay_success | 支付成功 | 支付回调成功（核心付费事件） | client | cost_ms | 耗时 | 数值 | 接口或操作耗时毫秒数 |
| pay_success | 支付成功 | 支付回调成功（核心付费事件） | client | is_first_pay | 是否首充 | 布尔 | 是否首次付费 |
| pay_fail | 支付失败 | 支付失败 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| pay_fail | 支付失败 | 支付失败 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| pay_fail | 支付失败 | 支付失败 | client | fail_reason | 失败原因 | 文本 | 失败的具体原因（关键归因字段） |
| pay_fail | 支付失败 | 支付失败 | client | error_code | 错误码 | 文本 | 错误码 |
| pay_cancel | 支付取消 | 用户取消支付 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| pay_cancel | 支付取消 | 用户取消支付 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| first_pay | 首充完成 | 首次付费成功 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| first_pay | 首充完成 | 首次付费成功 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| first_pay | 首充完成 | 首次付费成功 | client | gift_id | 礼包ID | 文本 | 礼包唯一标识 |
| month_card_buy | 月卡购买 | 购买月卡/周卡/季卡/天卡 | client | card_type | 卡类型 | 文本 | day/week/month/quarter |
| month_card_buy | 月卡购买 | 购买月卡/周卡/季卡/天卡 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| month_card_buy | 月卡购买 | 购买月卡/周卡/季卡/天卡 | client | duration_days | 有效天数 | 数值 | 卡有效期天数 |
| month_card_claim | 月卡每日领取 | 领取月卡每日奖励 | client | card_type | 卡类型 | 文本 | day/week/month/quarter |
| month_card_claim | 月卡每日领取 | 领取月卡每日奖励 | client | day_index | 第几天 | 数值 | 签到或领取的天序号 |
| month_card_claim | 月卡每日领取 | 领取月卡每日奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| gift_buy | 礼包购买 | 购买各类礼包 | client | gift_id | 礼包ID | 文本 | 礼包唯一标识 |
| gift_buy | 礼包购买 | 购买各类礼包 | client | gift_name | 礼包名称 | 文本 | 礼包名称 |
| gift_buy | 礼包购买 | 购买各类礼包 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| gift_buy | 礼包购买 | 购买各类礼包 | client | gift_type | 礼包类型 | 文本 | first/level/period/activity |
| vip_upgrade | VIP升级 | VIP 等级提升 | client | from_level | 原等级 | 数值 | 升级前等级 |
| vip_upgrade | VIP升级 | VIP 等级提升 | client | to_level | 新等级 | 数值 | 升级后等级 |
| vip_upgrade | VIP升级 | VIP 等级提升 | client | trigger_type | 触发类型 | 文本 | 升级触发方式 |
| vip_privilege_show | VIP特权曝光 | 查看 VIP 特权说明 | client | vip_level | VIP等级 | 数值 | VIP 等级 |
| vip_gun_use | VIP炮台使用 | 使用 VIP 专属炮台 | client | gun_id | 炮台ID | 数值 | 炮台皮肤唯一标识 |
| vip_gun_use | VIP炮台使用 | 使用 VIP 专属炮台 | client | vip_level | VIP等级 | 数值 | VIP 等级 |
| diamond_buy | 钻石购买 | 购买钻石 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| diamond_buy | 钻石购买 | 购买钻石 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| diamond_buy | 钻石购买 | 购买钻石 | client | diamond_num | 钻石数量 | 数值 | 购买获得的钻石数 |
| gold_buy | 金币购买 | 购买金币 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| gold_buy | 金币购买 | 购买金币 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| gold_buy | 金币购买 | 购买金币 | client | gold_num | 金币数量 (gold_num) | 数值 | 购买获得的金币数 |
| recharge_page_show | 充值页曝光 | 打开充值页 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| coupon_use | 优惠券使用 | 使用优惠券抵扣 | client | coupon_id | 优惠券ID | 文本 | 优惠券唯一标识 |
| coupon_use | 优惠券使用 | 使用优惠券抵扣 | client | coupon_type | 优惠券类型 | 文本 | discount/cash/free |
| coupon_use | 优惠券使用 | 使用优惠券抵扣 | client | discount_amount | 抵扣金额 | 数值 | 优惠券抵扣金额（分） |
| coupon_use | 优惠券使用 | 使用优惠券抵扣 | client | product_id | 商品ID | 文本 | 商品唯一标识 |
| piggy_bank_show | 存钱罐曝光 | 打开存钱罐 | client | current_amount | 当前金额 | 数值 | 存钱罐当前金额 |
| piggy_bank_show | 存钱罐曝光 | 打开存钱罐 | client | target_amount | 目标金额 | 数值 | 存钱罐目标金额 |
| piggy_bank_break | 存钱罐打破 | 付费打破存钱罐 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| piggy_bank_break | 存钱罐打破 | 付费打破存钱罐 | client | gain_amount | 获得金额 | 数值 | 打破存钱罐获得金额 |
| growth_fund_buy | 成长基金购买 | 购买成长基金 | client | fund_id | 基金ID | 文本 | 基金唯一标识 |
| growth_fund_buy | 成长基金购买 | 购买成长基金 | client | price | 价格 | 数值 | 商品价格（人民币分） |
| growth_fund_claim | 成长基金领取 | 领取成长基金阶段奖励 | client | fund_id | 基金ID | 文本 | 基金唯一标识 |
| growth_fund_claim | 成长基金领取 | 领取成长基金阶段奖励 | client | stage | 阶段 | 数值 | 阶段序号 |
| growth_fund_claim | 成长基金领取 | 领取成长基金阶段奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| period_gift_show | 周期礼包曝光 | 周期礼包弹窗曝光 | client | gift_id | 礼包ID | 文本 | 礼包唯一标识 |
| period_gift_show | 周期礼包曝光 | 周期礼包弹窗曝光 | client | period_type | 周期类型 | 文本 | daily/weekly/monthly |

### 活动

| Event Name | Event Display Name | Trigger Timing | Collection | Property Name | Property Display Name | Type | Property Description |
|---|---|---|---|---|---|---|---|
| activity_list_show | 活动列表曝光 | 打开活动中心 | client | activity_count | 活动数量 | 数值 | 当前可参与活动数 |
| activity_list_show | 活动列表曝光 | 打开活动中心 | client | entry_source | 来源入口 | 文本 | 从哪个入口进入 |
| activity_enter | 活动进入 | 进入任意活动（通用） | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| activity_enter | 活动进入 | 进入任意活动（通用） | client | activity_name | 活动名称 | 文本 | 活动名称 |
| activity_enter | 活动进入 | 进入任意活动（通用） | client | activity_type | 活动类型 | 文本 | 常驻/限时/节日 |
| activity_exit | 活动退出 | 退出活动 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| activity_exit | 活动退出 | 退出活动 | client | stay_duration_s | 停留时长 | 数值 | 页面或弹窗停留秒数 |
| activity_task_show | 活动任务曝光 | 活动内任务面板曝光 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| activity_task_show | 活动任务曝光 | 活动内任务面板曝光 | client | task_id | 任务ID | 文本 | 任务唯一标识 |
| activity_task_show | 活动任务曝光 | 活动内任务面板曝光 | client | progress | 进度 | 数值 | 活动或收集进度 |
| activity_task_claim | 活动任务领取 | 领取活动任务奖励 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| activity_task_claim | 活动任务领取 | 领取活动任务奖励 | client | task_id | 任务ID | 文本 | 任务唯一标识 |
| activity_task_claim | 活动任务领取 | 领取活动任务奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| lottery_start | 抽奖开始 | 发起抽奖（单抽/十连） | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| lottery_start | 抽奖开始 | 发起抽奖（单抽/十连） | client | draw_type | 抽奖类型 | 文本 | single/ten/free |
| lottery_start | 抽奖开始 | 发起抽奖（单抽/十连） | client | draw_count | 抽奖次数 | 数值 | 本次抽奖次数 |
| lottery_start | 抽奖开始 | 发起抽奖（单抽/十连） | client | cost_type | 消耗类型 | 文本 | gold/diamond/coupon/activity_coin |
| lottery_start | 抽奖开始 | 发起抽奖（单抽/十连） | client | cost_amount | 消耗数量 | 数值 | 消耗数量 |
| lottery_result | 抽奖结果 | 抽奖返回结果（核心） | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| lottery_result | 抽奖结果 | 抽奖返回结果（核心） | client | prize_id | 奖品ID | 文本 | 奖品唯一标识 |
| lottery_result | 抽奖结果 | 抽奖返回结果（核心） | client | prize_name | 奖品名称 | 文本 | 奖品名称 |
| lottery_result | 抽奖结果 | 抽奖返回结果（核心） | client | prize_rarity | 奖品品质 | 数值 | 奖品品质等级 |
| lottery_result | 抽奖结果 | 抽奖返回结果（核心） | client | is_grand_prize | 是否大奖 | 布尔 | 是否命中大奖 |
| lottery_result | 抽奖结果 | 抽奖返回结果（核心） | client | draw_count | 抽奖次数 | 数值 | 本次抽奖次数 |
| lottery_free | 免费抽奖 | 使用免费次数抽奖 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| lottery_free | 免费抽奖 | 使用免费次数抽奖 | client | free_source | 免费来源 | 文本 | 免费次数来源 |
| fortune_wheel_show | 转盘曝光 | 打开幸运转盘 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| fortune_wheel_show | 转盘曝光 | 打开幸运转盘 | client | free_count | 免费次数 | 数值 | 剩余免费次数 |
| fortune_wheel_spin | 转盘转动 | 转动转盘 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| fortune_wheel_spin | 转盘转动 | 转动转盘 | client | cost_type | 消耗类型 | 文本 | gold/diamond/coupon/activity_coin |
| fortune_wheel_spin | 转盘转动 | 转动转盘 | client | cost_amount | 消耗数量 | 数值 | 消耗数量 |
| fortune_wheel_spin | 转盘转动 | 转动转盘 | client | result_id | 结果ID | 数值 | 操作产出的道具ID |
| star_box_open | 星盒开启 | 开启星盒 | client | box_id | 宝箱ID | 文本 | 宝箱唯一标识 |
| star_box_open | 星盒开启 | 开启星盒 | client | cost_type | 消耗类型 | 文本 | gold/diamond/coupon/activity_coin |
| star_box_open | 星盒开启 | 开启星盒 | client | cost_amount | 消耗数量 | 数值 | 消耗数量 |
| star_box_open | 星盒开启 | 开启星盒 | client | prize_id | 奖品ID | 文本 | 奖品唯一标识 |
| card_draw | 翻牌 | 活动翻牌 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| card_draw | 翻牌 | 活动翻牌 | client | card_index | 卡牌序号 | 数值 | 翻牌位置 |
| card_draw | 翻牌 | 活动翻牌 | client | result_id | 结果ID | 数值 | 操作产出的道具ID |
| card_draw | 翻牌 | 活动翻牌 | client | remain_count | 剩余次数 | 数值 | 剩余可操作次数 |
| sign_in_show | 签到曝光 | 打开签到面板 | client | sign_type | 签到类型 | 文本 | daily/weekly/monthly/system |
| sign_in_show | 签到曝光 | 打开签到面板 | client | signed_days | 已签天数 | 数值 | 已签到天数 |
| sign_in_show | 签到曝光 | 打开签到面板 | client | can_sign | 是否可签 | 布尔 | 今日是否可签到 |
| sign_in_claim | 签到领取 | 领取签到奖励 | client | sign_type | 签到类型 | 文本 | daily/weekly/monthly/system |
| sign_in_claim | 签到领取 | 领取签到奖励 | client | day_index | 第几天 | 数值 | 签到或领取的天序号 |
| sign_in_claim | 签到领取 | 领取签到奖励 | client | is_makeup | 是否补签 | 布尔 | 是否使用补签 |
| sign_in_claim | 签到领取 | 领取签到奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| rank_show | 活动排行榜曝光 | 打开活动排行榜 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| rank_show | 活动排行榜曝光 | 打开活动排行榜 | client | rank_type | 榜单类型 | 文本 | 排行类型 |
| rank_show | 活动排行榜曝光 | 打开活动排行榜 | client | my_rank | 我的排名 | 数值 | 玩家当前排名 |
| rank_reward_claim | 排行奖励领取 | 领取排行榜奖励 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| rank_reward_claim | 排行奖励领取 | 领取排行榜奖励 | client | rank_type | 榜单类型 | 文本 | 排行类型 |
| rank_reward_claim | 排行奖励领取 | 领取排行榜奖励 | client | my_rank | 我的排名 | 数值 | 玩家当前排名 |
| rank_reward_claim | 排行奖励领取 | 领取排行榜奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| world_boss_show | 世界BOSS曝光 | 世界BOSS面板曝光 | client | boss_id | BOSS ID | 数值 | BOSS 唯一标识 |
| world_boss_show | 世界BOSS曝光 | 世界BOSS面板曝光 | client | boss_name | BOSS 名称 | 文本 | BOSS 名称 |
| world_boss_show | 世界BOSS曝光 | 世界BOSS面板曝光 | client | boss_time | BOSS时间 | 文本 | 世界BOSS开启时间 |
| world_boss_rank_show | 世界BOSS排行曝光 | 查看世界BOSS伤害排行 | client | boss_id | BOSS ID | 数值 | BOSS 唯一标识 |
| world_boss_rank_show | 世界BOSS排行曝光 | 查看世界BOSS伤害排行 | client | my_rank | 我的排名 | 数值 | 玩家当前排名 |
| world_boss_rank_show | 世界BOSS排行曝光 | 查看世界BOSS伤害排行 | client | my_damage | 我的伤害 | 数值 | 玩家对 BOSS 累计伤害 |
| match_signup | 比赛报名 | 报名金币赛/大奖赛 | client | match_type | 比赛类型 | 文本 | gold/grand/item |
| match_signup | 比赛报名 | 报名金币赛/大奖赛 | client | match_id | 比赛ID | 文本 | 比赛唯一标识 |
| match_signup | 比赛报名 | 报名金币赛/大奖赛 | client | cost_type | 消耗类型 | 文本 | gold/diamond/coupon/activity_coin |
| match_signup | 比赛报名 | 报名金币赛/大奖赛 | client | cost_amount | 消耗数量 | 数值 | 消耗数量 |
| match_start | 比赛开始 | 比赛正式开始 | client | match_id | 比赛ID | 文本 | 比赛唯一标识 |
| match_start | 比赛开始 | 比赛正式开始 | client | match_type | 比赛类型 | 文本 | gold/grand/item |
| match_start | 比赛开始 | 比赛正式开始 | client | player_count | 玩家人数 | 数值 | 房间内玩家数量 |
| match_end | 比赛结束 | 比赛结束并结算 | client | match_id | 比赛ID | 文本 | 比赛唯一标识 |
| match_end | 比赛结束 | 比赛结束并结算 | client | match_type | 比赛类型 | 文本 | gold/grand/item |
| match_end | 比赛结束 | 比赛结束并结算 | client | rank | 名次 | 数值 | 最终名次 |
| match_end | 比赛结束 | 比赛结束并结算 | client | score | 积分 | 数值 | 比赛积分 |
| match_end | 比赛结束 | 比赛结束并结算 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| match_reward_claim | 比赛奖励领取 | 领取比赛奖励 | client | match_id | 比赛ID | 文本 | 比赛唯一标识 |
| match_reward_claim | 比赛奖励领取 | 领取比赛奖励 | client | rank | 名次 | 数值 | 最终名次 |
| match_reward_claim | 比赛奖励领取 | 领取比赛奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| peak_match_show | 巅峰赛曝光 | 打开巅峰赛 | client | season_id | 赛季ID | 文本 | 赛季唯一标识 |
| peak_match_show | 巅峰赛曝光 | 打开巅峰赛 | client | my_star | 我的星数 | 数值 | 巅峰赛星数 |
| peak_match_enter | 巅峰赛进入 | 进入巅峰赛对局 | client | season_id | 赛季ID | 文本 | 赛季唯一标识 |
| peak_match_enter | 巅峰赛进入 | 进入巅峰赛对局 | client | stage | 阶段 | 数值 | 阶段序号 |
| peak_match_settle | 巅峰赛结算 | 巅峰赛单局结算 | client | season_id | 赛季ID | 文本 | 赛季唯一标识 |
| peak_match_settle | 巅峰赛结算 | 巅峰赛单局结算 | client | stage | 阶段 | 数值 | 阶段序号 |
| peak_match_settle | 巅峰赛结算 | 巅峰赛单局结算 | client | result | 结果 | 文本 | 操作结果 success/fail |
| peak_match_settle | 巅峰赛结算 | 巅峰赛单局结算 | client | star_change | 星数变化 | 数值 | 星数增减 |
| treasure_show | 夺宝曝光 | 打开夺宝活动 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| treasure_show | 夺宝曝光 | 打开夺宝活动 | client | treasure_type | 夺宝类型 | 文本 | 夺宝玩法分类 |
| treasure_show | 夺宝曝光 | 打开夺宝活动 | client | progress | 进度 | 数值 | 活动或收集进度 |
| treasure_draw | 夺宝抽取 | 进行夺宝抽取 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| treasure_draw | 夺宝抽取 | 进行夺宝抽取 | client | cost_type | 消耗类型 | 文本 | gold/diamond/coupon/activity_coin |
| treasure_draw | 夺宝抽取 | 进行夺宝抽取 | client | cost_amount | 消耗数量 | 数值 | 消耗数量 |
| treasure_draw | 夺宝抽取 | 进行夺宝抽取 | client | prize_id | 奖品ID | 文本 | 奖品唯一标识 |
| treasure_progress_claim | 夺宝进度奖励领取 | 领取夺宝进度奖励 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| treasure_progress_claim | 夺宝进度奖励领取 | 领取夺宝进度奖励 | client | progress_stage | 进度阶段 | 数值 | 进度奖励阶段 |
| treasure_progress_claim | 夺宝进度奖励领取 | 领取夺宝进度奖励 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| exchange_show | 兑换曝光 | 打开兑换商店 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| exchange_show | 兑换曝光 | 打开兑换商店 | client | currency_type | 货币类型 | 文本 | 活动币类型 |
| exchange_show | 兑换曝光 | 打开兑换商店 | client | balance | 余额 | 数值 | 货币余额 |
| exchange_buy | 兑换购买 | 用活动币兑换物品 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| exchange_buy | 兑换购买 | 用活动币兑换物品 | client | item_id | 道具ID | 数值 | 通用道具标识 |
| exchange_buy | 兑换购买 | 用活动币兑换物品 | client | item_name | 道具名称 | 文本 | 通用道具名称 |
| exchange_buy | 兑换购买 | 用活动币兑换物品 | client | cost_amount | 消耗数量 | 数值 | 消耗数量 |
| exchange_buy | 兑换购买 | 用活动币兑换物品 | client | num | 数量 | 数值 | 道具数量 |
| invite_show | 邀请曝光 | 打开邀请活动 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| invite_show | 邀请曝光 | 打开邀请活动 | client | invited_count | 已邀请数 | 数值 | 已成功邀请人数 |
| invite_show | 邀请曝光 | 打开邀请活动 | client | max_count | 最大数量 | 数值 | 可邀请上限 |
| invite_send | 邀请发送 | 发送邀请 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| invite_send | 邀请发送 | 发送邀请 | client | channel | 渠道/频道 | 文本 | 聊天频道或分享渠道 |
| invite_success | 邀请成功 | 被邀请人达成条件 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| invite_success | 邀请成功 | 被邀请人达成条件 | client | invitee_user_id | 被邀请人ID | 文本 | 被邀请玩家ID |
| invite_success | 邀请成功 | 被邀请人达成条件 | client | reward | 奖励内容 | 文本 | 奖励道具与数量 |
| blessing_show | 祈福曝光 | 打开祈福活动 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| blessing_show | 祈福曝光 | 打开祈福活动 | client | ticket_count | 票券数量 | 数值 | 祈福票券数量 |
| blessing_choose | 祈福选择 | 选择祈福大奖 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| blessing_choose | 祈福选择 | 选择祈福大奖 | client | reward_id | 奖励ID | 文本 | 奖励道具ID |
| blessing_choose | 祈福选择 | 选择祈福大奖 | client | reward_name | 奖励名称 | 文本 | 奖励物品名称 |
| parade_show | 巡游曝光 | 打开巡游活动 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| festival_act_enter | 节日活动进入 | 进入节日主题活动（春节/中秋/端午等） | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| festival_act_enter | 节日活动进入 | 进入节日主题活动（春节/中秋/端午等） | client | festival_type | 节日类型 | 文本 | spring/mid_autumn/dragon_boat |
| world_cup_enter | 世界杯活动进入 | 进入世界杯主题活动 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| world_cup_enter | 世界杯活动进入 | 进入世界杯主题活动 | client | stage | 阶段 | 数值 | 阶段序号 |
| world_cup_guess | 世界杯竞猜 | 参与赛事竞猜 | client | activity_id | 活动ID | 文本 | 活动唯一标识 |
| world_cup_guess | 世界杯竞猜 | 参与赛事竞猜 | client | match_id | 比赛ID | 文本 | 比赛唯一标识 |
| world_cup_guess | 世界杯竞猜 | 参与赛事竞猜 | client | guess_team | 竞猜队伍 | 文本 | 竞猜选择的队伍 |
| world_cup_guess | 世界杯竞猜 | 参与赛事竞猜 | client | cost | 消耗 | 数值 | 消耗的货币或道具数量 |

## Common Event Properties (#公共事件属性)

| 属性名（必填） | 属性显示名 | 属性类型（必填） | 属性说明 |
|---|---|---|---|
| agent_id | 代理ID | 文本 | 波克代理标识 |
| gold | 当前金币 | 数值 | 玩家当前持有金币 |
| is_new_user | 是否新用户 | 布尔 | 是否当日新注册 |
| level | 用户等级 | 数值 | 玩家游戏等级 |
| platform_id | 平台ID | 文本 | 游戏平台标识 |
| resource_version | 资源版本 | 文本 | 热更资源版本 |
| scene | 当前场景 | 文本 | 事件发生时所处场景 |
| vip_level | VIP等级 | 数值 | 玩家 VIP 等级 |

## User ID System (#用户ID体系)

| 属性名 | 属性显示名 | 属性说明 | 赋值说明 |
|---|---|---|---|
| #account_id | 账户ID | 系统属性 | 设置为user_id |
| #distinct_id | 访客ID | 系统属性 | SDK自动生成或设备相关ID |

## User Properties (#用户数据)

| 属性名（必填） | 属性显示名 | 属性类型（必填） | 更新方式 | 属性说明 | 属性标签 |
|---|---|---|---|---|---|
| register_time | 注册时间 | 时间 | user_setOnce | 账号首次创建时间 |  |
| register_channel | 注册渠道 | 文本 | user_setOnce | 首次进入的渠道 |  |
| register_days | 注册天数 | 数值 | user_set | 距注册日的自然天数 |  |
| first_pay_time | 首次付费时间 | 时间 | user_setOnce | 首次付费成功时间，未付费为空 |  |
| total_pay_amount | 累计付费金额 | 数值 | user_add | 历史累计付费金额（分） |  |
| pay_count | 累计付费次数 | 数值 | user_add | 历史累计付费笔数 |  |
| last_pay_time | 最近付费时间 | 时间 | user_set | 最近一次付费成功时间 |  |
| vip_level | VIP等级 | 数值 | user_set | 当前 VIP 等级 |  |
| max_vip_level | 历史最高VIP等级 | 数值 | user_set | 历史达到过的最高 VIP 等级 |  |
| user_level | 用户等级 | 数值 | user_set | 当前游戏等级 |  |
| max_bet_level | 历史最高炮倍 | 数值 | user_set | 历史使用过的最高炮倍档位 |  |
| favorite_room_id | 偏好房间 | 数值 | user_set | 游玩时长最长的房间ID |  |
| total_game_count | 累计对局数 | 数值 | user_add | 历史进入对局总次数 |  |
| total_play_duration | 累计游戏时长 | 数值 | user_add | 历史累计对局时长（秒） |  |
| total_kill_count | 累计击杀数 | 数值 | user_add | 历史累计击杀鱼数量 |  |
| max_gold_ever | 历史最高金币 | 数值 | user_set | 历史持有过的最高金币 |  |
| bankrupt_count | 累计破产次数 | 数值 | user_add | 历史破产次数 |  |
| last_login_time | 最近登录时间 | 时间 | user_set | 最近一次登录时间 |  |
| login_days | 累计登录天数 | 数值 | user_add | 历史累计登录天数 |  |
| province | 省份 | 文本 | user_set | IP 归属省份 |  |
| city | 城市 | 文本 | user_set | IP 归属城市 |  |
| life_cycle_stage | 生命周期阶段 | 文本 | user_set | new / active / silent / churn / back |  |
| account_status | 账号状态 | 文本 | user_set | normal / banned / muted |  |
| device_first_time | 设备首次时间 | 时间 | user_setOnce | 该设备首次进入游戏时间 |  |

## Implementation Review Notes

- `agent_id` carries a source-specific description (波克代理标识). Confirm whether this concept exists in the customer project; do not silently reuse a customer-specific agent dimension.
- `device_first_time` is defined as a user property but describes a device-level first-seen time. Confirm whether the intended scope is the account, the device, or a separate device-profile design before implementation.
- `login_days` uses `user_add`; increment it at most once per natural day per user rather than once per login event.
- Monetary and duration units in the source must remain explicit: `total_pay_amount` is in cents, and cumulative play duration is in seconds.
- The source tag `系统事件` does not by itself prove that an event is a TE preset event. Confirm SDK auto-collection support instead of assuming that all events with this tag are automatically reported.
- Preserve `client` / `server` collection assignments during implementation. Move an event to another side only after confirming idempotency, timestamp semantics, and retry behavior.
