---
code: cocos2d_lua_sdk_installation
name: "Cocos2d-Lua"
wikiToken: UDhNw7ShXiLkTukQ7GTcjKwGnge
parentWikiToken: G5xvwevvSi8u93kR0RwcN52MnFc
updateTime: 1776262569000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=zh-CN&code=cocos2d_lua_sdk_installation
---

::: tip 提示
 在接入前, 请先阅读[<text color="purple" underline="true">接入前准备</text>](https://thinkingdata.feishu.cn/wiki/OvpawZlw1idmxzkwiJWcxlfNnNc)。
 Cocos2d-Lua SDK 支持在 iOS、Android 平台运行，大小约为 7.1M
 :::
**最新版本:** v2.0.2
**更新时间:** 2024-01-19
**资源下载**: [源码](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcocos2d-lua-sdk%2Ftags)、[SDK下载](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_cocos2d_lua_sdk.zip)
::: warning 注意
当前文档适用于 v2.0.0 及以后的版本，历史版本请参考 [Cocos2d-Lua 接入指南（V1）](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fgame_engine_sdk_installation%2Fcocos2d_lua_sdk_installation%2Fcocos2d_lua_sdk_installation.html)，[SDK下载（v1.0.1）](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FCocos2d-Lua%2Fta_cocos2d_lua_sdk_v1.0.1.zip)
::: 
## 一、集成SDK
- **添加 Cocos2d-Lua 配置**
  - 下载 [Cocos2d-Lua SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_cocos2d_lua_sdk.zip) 资源文件，解压文件后把 `TDAnalytics``.lua` 添加到 `src` 文件夹
- **添加 Android 配置**
  - 在 `frameworks/runtime-src/proj.android/app` 目录下添加 `libs` 文件夹，把 `TDAnalytics.aar`、`TDCore.aar` 添加到 `libs` 文件夹
  - 在 `frameworks/runtime-src/proj.android/app/src/org/cocos2dx/lua` 目录下添加 `TDAnalyticsProxy.java`
  - 在 `CMakeLists.txt` 中加入如下配置
```bash
if(ANDROID)
    list(APPEND GAME_SOURCE
        # ... 添加以下代码
        ${RUNTIME_SRC_ROOT}/proj.android/app/src/org/cocos2dx/lua/TDAnalyticsProxy.java
        ${RUNTIME_SRC_ROOT}/proj.android/app/libs/TDCore.aar
        ${RUNTIME_SRC_ROOT}/proj.android/app/libs/TDAnalytics.aar
        )
endif()
```

- 在 `frameworks/runtime-src/proj.android/app` 目录下的`build.gradle`中添加如下配置
```groovy
dependencies {
    // 添加 .aar 引用
    implementation fileTree(include: ['*.jar','*.aar'], dir: 'libs')
}
```

- **添加 iOS 配置（****Cocos2d-Lua-Community 4.x****）**
  - 把 `TDAnalyticsProxy.h`、`TDAnalyticsProxy.mm`、`ThinkingSDK.framework` 添加到 `frameworks/runtime-src/proj.ios_mac/ios` 目录
  - 在 `CMakeLists.txt` 中加入如下配置
```bash {wrap}
if(APPLE)
    if(IOS)
        list(APPEND GAME_HEADER
             # [TDAnalytics] 添加以下代码
             ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/TDAnalyticsProxy.h
             )
        list(APPEND GAME_SOURCE
             # [TDAnalytics] 添加以下代码
             ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/TDAnalyticsProxy.mm
             ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/ThinkingSDK.framework
             )
    endif()
endif()

if(IOS)
    # [TDAnalytics] 添加以下代码
    target_link_libraries(${APP_NAME} ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/ThinkingSDK.framework)
endif()


if(IOS)
    # [TDAnalytics] 添加以下代码
    set(CMAKE_EXE_LINKER_FLAGS -ObjC)
endif()
```

- **添加 iOS 配置（Cocos2d-Lua-Community 3.x）**
  - 使用 Xcode 打开 `iOS` 项目，直接拖拽 SDK 目录下的 `iOS` 文件夹放入 `Classes` 目录
  - `Build Setting` -> `Other Linker Flags` 中的 `Debug` 和 `Release` 分别添加 `-force_load "$(SRCROOT)/``ios/``ThinkingSDK.framework/ThinkingSDK"`
## 二、初始化
```lua
local TDAnalytics = require("TDAnalytics")
TDAnalytics.init(APPID, SERVER_URL, TDAnalytics.debugModel.debugOff)
```

参数说明:
- `APPID`: 是您的项目的 APPID，可通过在 AE 后台项目管理页面获取
- `SERVER_URL`: 为数据上传的 URL
  - 如果您对接的是云服务，填入: https://global-receiver-ta.thinkingdata.cn
  - 如果您使用私有化部署版本，请为数据采集地址绑定域名，并配置 HTTPS 证书：https://数据采集地址绑定域名
<quote-container>
由于 Android 9.0+ 默认限制 HTTP 请求，因此请务必使用 HTTPS 协议
</quote-container>

## 三、常用功能
在使用常用功能之前，建议你先了解[用户识别规则](https://thinkingdata.feishu.cn/wiki/AUyiw6XZsiF9EMk2fBScKjzunjd)；SDK默认会生成随机数作为访客ID，并持久化存储访客ID在本地；用户未登录之前，会以访客ID作为身份识别ID。注意:访客 ID 在用户重新安装 App 以及更换设备时将会变更。
### 3.1 设置账号ID
在用户进行登录时，可调用 `login` 来设置用户的账号 ID， AE 平台将会以账号 ID 作为身份识别 ID，并且设置的账号 ID 将会在调用 `logout` 之前一直保留。多次调用 `login` 将覆盖先前的账号 ID 。
```lua
--用户的登录唯一标识，此数据对应上报数据里的#account_id，此时#account_id的值为TA
TDAnalytics.login("TA")
```

`login` 可以多次调用，每次调用会判断传入的账号 ID 与先前保存的 ID 是否一致，一致则忽略调用，不一致则会覆盖先前的 ID。
<quote-container>
**该方法不会上传登录事件**
</quote-container>

### 3.2 设置公共事件属性
公共事件属性指的就是每个事件都会带有的属性，您可以调用 `setSuperProperties` 来设置公共事件属性，我们推荐您在发送事件前，先设置公共事件属性。对于一些重要的属性，譬如用户的会员等级、来源渠道等，这些属性需要设置在每个事件中，此时您可以将这些属性设置为公共事件属性。
```lua
local superProperties = {}
superProperties["channel"] = "ta" -- 字符串
superProperties["age"] = 1 -- 数字
superProperties["isSuccess"] = true -- 布尔
superProperties["birthday"] = os.date("%Y-%m-%d %H:%M:%S") -- 时间
superProperties["object"] = { key="value" } -- 对象
superProperties["object_arr"] = { { key="value" } } -- 对象组
superProperties["arr"] = { "value" } -- 数组
TDAnalytics.setSuperProperties(superProperties) -- 设置公共事件属性
```

公共事件属性将会被保存到缓存中，无需每次启动 App 时调用。如果调用 `setSuperProperties` 上传了先前已设置过的公共事件属性，则会覆盖之前的属性。
- Key 为该属性的名称，为字符串类型，规定只能以字母开头，包含数字，字母和下划线 "_"，长度最大为 50 个字符，对字母大小写不敏感，AE 会统一转化为小写字母
- Value 为该属性的值，支持字符串、数字、布尔、时间、对象、对象组、数组
<quote-container>
**事件属性、用户属性的要求与公共事件属性保持一致**
</quote-container>

### 3.3 开启自动采集
以下代码示例开启安装、启动、关闭事件，如果您想详细了解SDK的自动采集能力，可以查看[自动采集功能详细介绍](https://thinkingdata.feishu.cn/wiki/DwalwrtebisQfXkjgdCcKS16nXE)
```lua
TDAnalytics.enableAutoTrack( {
    appInstall = true, 
    appStart = true, 
    appEnd = true
});
```

### 3.4 发送事件
您可以调用 `track` 来上传事件，建议您根据先前梳理的埋点文档来设置事件的属性以及发送信息的条件，此处以用户购买某商品作为范例：
```lua
TDAnalytics.track("product_buy", {
    product_name="商品名"
});
```

事件的名称是字符串类型，只能以字母开头，可包含数字，字母和下划线 "_"，长度最大为 50 个字符。
### 3.5 设置用户属性
对于一般的用户属性，您可以调用 `userSet`来进行设置，使用该接口上传的属性将会覆盖原有的属性值，如果之前不存在该用户属性，则会新建该用户属性，类型与传入属性的类型一致，此处以设置用户名为例：
```lua
-- 此时username为TA
TDAnalytics.userSet({
    user_name = "TA"
})
-- 此时username为AE
TDAnalytics.userSet({
    user_name = "TE"
})
```

## 四、最佳实践
以下示例代码包含以上所有操作，我们推荐按照如下步骤使用:
```lua
-- 引入 TDAnalytics
local TDAnalytics = require("TDAnalytics")

if (授权隐私政策) {
    -- 初始化SDK
    TDAnalytics.init(APP_ID, SERVER_URL, TDAnalytics.debugModel.debugOff);
    --开启自动采集事件
    TDAnalytics.enableAutoTrack( {
        appInstall = true, 
        appStart = true, 
        appEnd = true
    });
    --如果用户已登录，可以设置用户的账号ID作为身份唯一标识
    TDAnalytics.login("TA")
    
    --设置公共事件属性以后，每个事件都会带有公共事件属性
    local superProperties = {}
    superProperties["channel"] = "ta" -- 字符串
    superProperties["age"] = 1 -- 数字
    superProperties["isSuccess"] = true -- 布尔
    superProperties["birthday"] = os.date("%Y-%m-%d %H:%M:%S") -- 时间
    superProperties["object"] = { key="value" } -- 对象
    superProperties["object_arr"] = { { key="value" } } -- 对象组
    superProperties["arr"] = { "value" } -- 数组
    TDAnalytics.setSuperProperties(superProperties) -- 设置公共事件属性
    
    --发送事件
    TDAnalytics.track("product_buy", {
        product_name="商品名"
    });
    
    --设置用户属性
    TDAnalytics.userSet({
        user_name = "TE"
    })
}
```
