---
code: openharmony_sdk_installation
name: "OpenHarmony"
wikiToken: G1ZhwUWl2iwrvbkLDr3cThPDngd
parentWikiToken: H03fwITExiJnKOk5UDOcqK4nnHe
updateTime: 1776262477000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=zh-CN&code=openharmony_sdk_installation
---

::: tip 提示
 在接入前, 请先阅读[<text color="purple" underline="true">接入前准备</text>](https://thinkingdata.feishu.cn/wiki/OvpawZlw1idmxzkwiJWcxlfNnNc)。
SDK 要求最低系统版本为 API 10
SDK ( har 格式) 大小约为 56 KB
SDK名称：数数科技SDK
开发者：数数信息科技(上海)有限公司
版本号：1.8.1
功能：SDK采用事件、用户属性的方式收集客户端日志，具有统计日活、使用时长、留存行为分析等方面的能力。
隐私声明：[数数科技SDK隐私声明](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Flatest%2Finstallation%2Finstallation_menu%2Fprivacy_cn.html)
合规指南：[数数科技SDK合规指南](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FVS7UwlrJaiOAzqk4oDhc4Qggnld%3FfromScene%3DspaceOverview)
 :::
**最新版本:** 1.8.1
**资源下载: **[SDK下载](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Fharmony%2Ftd_harmony_sdk_v1.8.1.zip)  
**SDK包名：**@thinkingdata/analytics
**MD5值：**997d05310dbe82eb02b1536deeb4645f
**更新时间:** 2026-03-25
## 一、集成 SDK
1. 引入SDK
- 执行以下命令
```java
ohpm i @thinkingdata/analytics
```

- 手动在oh-packages.json5中dependencies下添加依赖，然后IDE会提示ohpm install，点击安装
```java
"dependencies": {
  "@thinkingdata/analytics": "1.8.1",
}
```

## 二、 初始化
```javascript
import { TDAnalytics, TDConfig, TDMode } from '@thinkingdata/analytics';

//方式一
TDAnalytics.init(context, "appId", "serverUrl")

//方式二
let config = new TDConfig()
config.appId = 'appId'
config.serverUrl = 'serverUrl'
config.mode = TDMode.NORMAL
config.enableAutoCalibrated = true
TDAnalytics.initWithConfig(context, config)
```

SDK初始化的时候会收集操作系统版本、设备制造商、操作系统、屏幕分辨率、设备型号、APP 版本、网络状态、网络运营商、应用安装时间、系统语言等信息，用于统计分析功能。
参数说明:
- `APPID`: 您的项目的 APPID，可通过在 AE 项目管理页面获取
- `SERVER_URL`: 数据上传的 URL
  - 如果您对接的是云服务，请在项目管理->接入配置中查看上报地址。
  - 如果您使用私有化部署版本,您可以自定义数据采集地址。
- `mode`: SDK上报模式，默认为Normal模式。
- `enableAutoCalibrated` : 自动开启时间校准。
## 三、 常用功能
在使用常用功能之前，建议你先了解[用户识别规则](https://thinkingdata.feishu.cn/wiki/AUyiw6XZsiF9EMk2fBScKjzunjd)；SDK默认会生成随机数作为访客ID，并持久化存储访客ID在本地；用户未登录之前，会以访客ID作为身份识别ID。注意:访客 ID 在用户重新安装 App 以及更换设备时将会变更。
### 3.1 设置账号ID
在用户进行登录时，可调用 `login` 来设置用户的账号 ID， AE 平台将会以账号 ID 作为身份识别 ID，并且设置的账号 ID 将会在调用 `logout` 之前一直保留。多次调用 `login` 将覆盖先前的账号 ID 。
```javascript
// 用户的登录唯一标识，此数据对应上报数据里的#account_id，此时#account_id的值为TA
TDAnalytics.login("TA");
```

<quote-container>
**该方法不会上传登录事件**
</quote-container>

### 3.2 设置公共事件属性
公共事件属性指的就是每个事件都会带有的属性，您可以调用 `setSuperProperties` 来设置公共事件属性，我们推荐您在发送事件前，先设置公共事件属性。对于一些重要的属性，譬如用户的会员等级、来源渠道等，这些属性需要设置在每个事件中，此时您可以将这些属性设置为公共事件属性。
```java
let superProperties = {};
superProperties["channel"] = "ta";//字符串
superProperties["age"] = 1;//数字
superProperties["isSuccess"] = true;//布尔
superProperties["birthday"] = new Date();//时间
superProperties["object"] = {key:"value"};//对象
superProperties["object_arr"] = [{key:"value"}];//对象组
superProperties["arr"] = ["value"];//数组
TDAnalytics.setSuperProperties(superProperties)
```

公共事件属性将会被保存到缓存中，无需每次启动 App 时调用。如果调用 `setSuperProperties` 上传了先前已设置过的公共事件属性，则会覆盖之前的属性。
### 3.3 开启自动采集
建议enableAutoTrack在onWindowStageCreate之后开启，以下代码示例开启所有自动采集事件：
```java
//APP安装事件 TDAutoTrackEventType.APP_INSTALL
//APP启动事件 TDAutoTrackEventType.APP_START
//APP关闭事件 TDAutoTrackEventType.APP_END
//APP浏览页面事件 TDAutoTrackEventType.APP_VIEW_SCREEN
//APP点击控件事件 TDAnalytics.TDAutoTrackEventType.APP_CLICK
//APP崩溃事件 TDAutoTrackEventType.APP_CRASH
TDAnalytics.enableAutoTrack(context,TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_INSTALL | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_VIEW_SCREEN | TDAutoTrackEventType.APP_CLICK | TDAutoTrackEventType.APP_CRASH)
```

### 3.4 发送事件
您可以调用 `track` 来上传事件，建议您根据先前梳理的埋点文档来设置事件的属性，此处以用户购买某商品作为范例：
```java
TDAnalytics.track({
  eventName: 'product_buy'，
  properties：{
      product_name:"商品名"
  }
})
```

事件的名称是字符串类型，只能以字母开头，可包含数字，字母和下划线 "_"。
### 3.5 设置用户属性
对于一般的用户属性，您可以调用 `userSet` 来进行设置，使用该接口上传的属性将会覆盖原有的属性值；如果之前不存在该用户属性，则会新建该用户属性，类型与传入属性的类型一致，此处以设置用户名为例：
```java
// username为TA
TDAnalytics.userSet({
  properties: {
    username: "TA"
  }
})
//username为AE
TDAnalytics.userSet({
  properties: {
    username: "TE"
  }
})
```

## 四、最佳实践
以下示例代码包含以上所有操作，我们推荐按照如下步骤使用:
```javascript
import { TDAnalytics, TDConfig, TDMode } from '@thinkingdata/analytics';
let config = new TDConfig()
config.appId = 'appId'
config.serverUrl = 'serverUrl'
config.enableAutoCalibrated = true
config.mode = TDMode.NORMAL
// 初始化
TDAnalytics.initWithConfig(this.context, config)
//开启自动采集
TDAnalytics.enableAutoTrack(context,TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_INSTALL | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_VIEW_SCREEN | TDAutoTrackEventType.APP_CLICK | TDAutoTrackEventType.APP_CRASH)
// 用户的登录唯一标识，此数据对应上报数据里的#account_id，此时#account_id的值为TA
TDAnalytics.login("TA");
//设置公共事件属性
let superProperties = {
    channel : "ta", //字符串
    age : 1,//数字
    isSuccess : true,//布尔
    birthday :  new Date(),//对象
    object : { key : "value" },//对象
    object_arr : [ { key : "value" } ],//对象组
    arr : [ "value" ]//数组
};
TDAnalytics.setSuperProperties(superProperties);
//发送事件
TDAnalytics.track({
    eventName: "product_buy", // 事件名称
    properties: {
        product_name: "商品名"
    } //事件属性
});
//设置用户属性
TDAnalytics.userSet({
    properties: { 
        username: "TE" 
    }
});
```
