---
code: egret_sdk_installation
name: "Egret "
wikiToken: TwNbwKODFiQ8UGkdWC5cyx7anZQ
parentWikiToken: G5xvwevvSi8u93kR0RwcN52MnFc
updateTime: 1776262608000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=zh-CN&code=egret_sdk_installation
---
::: tip 提示
 在接入前, 请先阅读[<text color="purple" underline="true">接入前准备</text>](https://thinkingdata.feishu.cn/wiki/OvpawZlw1idmxzkwiJWcxlfNnNc)。
Egret SDK 支持平台：HTML5、iOS、Android、微信小游戏、百度小游戏、小米快游戏、OPPO小游戏、vivo小游戏、QQ小游戏、360小游戏、字节跳动小游戏、华为快游戏、支付宝小游戏、淘宝创意互动小程序、Facebook。
 :::
**最新版本:** v3.0.2
**更新时间:** 2024-02-09
**资源下载:**** **[源码](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fmp-sdk%2Ftags)、[SDK下载](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_egret_sdk.zip)
::: warning 注意
当前文档适用于 v3.0.0 及以后的版本，历史版本请参考 [Egret 接入指南（V2）](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fgame_engine_sdk_installation%2Fegret_sdk_installation%2Fegret_sdk_installation.html)，[SDK下载（v2.2.4）](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FMPMG%2Fta_egret_sdk_v2.2.4.zip)
::: 
## 一、集成SDK
下载并解压 [Egret SDK](https://download.thinkingdata.cn/client/release/ta_egret_sdk.zip).
引入 SDK 库与引入其他第三方库过程相同，在 egretProperties.json 中引入该库并编译引擎。
```json
{
     "name": "ta_egret_sdk",
     "path": "./libs/ta_egret_sdk"
}
```

引入到项目中之后编译引擎即可使用 SDK 库。
## 二、初始化
引入 AE SDK 后，您可以在代码中使用 TDAnalytics:
```javascript
// TE SDK 配置对象
var config = {
  appId: "YOUR_APPID", // 项目 APP ID
  serverUrl: "YOUR_SERVER_URL", // 上报地址
  autoTrack: {
    appLaunch: true, // 自动采集 ta_mg_launch
    appShow: true, // 自动采集 ta_mg_show
    appHide: true // 自动采集 ta_mg_hide
  }
};
// 初始化
TDAnalytics.init(config);
```

AE 配置对象参数说明如下：
- `appId`: 您项目的 APP ID，必需, 可以在 AE 后台项目管理页查看
- `serverUrl`: 数据上报 URL，必需 
  - 如果您使用的是云服务，填入: https://global-receiver-ta.thinkingdata.cn
  - 如果您使用的是私有化部署的版本，请与运维同学确认上报地址
- `autoTrack`：可选, 表示是否开启自动采集功能，每一个元素分别代表如下的自动采集事件，默认全部关闭： 
  - `appLaunch`：自动采集小程序初始化
  - `appShow`：自动采集小游戏启动，或从后台进入前台
  - `appHide`：自动采集小游戏从前台进入后台，并记录本次访问（启动至调入后台）的时间
::: warning 注意
 在上报数据之前，请先在微信公众平台或其他平台的开发设置中，将数据传输 URL 加入到服务器域名的 request 列表中.
 :::
## 三、常用功能 
在使用常用功能之前，建议你先了解[用户识别规则](https://thinkingdata.feishu.cn/wiki/AUyiw6XZsiF9EMk2fBScKjzunjd)；SDK默认会生成随机数作为访客ID，并持久化存储访客ID在本地；用户未登录之前，会以访客ID作为身份识别ID。注意:访客 ID 在用户清理缓存 以及更换设备时将会变更。
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
```javascript
var superProperties = {
    channel : "ta", //字符串
    age : 1,//数字
    isSuccess : true,//布尔
    birthday :  new Date(),//对象
    object : { key : "value" },//对象
    object_arr : [ { key : "value" } ],//对象组
    arr : [ "value" ]//数组
};
TDAnalytics.setSuperProperties(superProperties);//设置公共事件属性
```

公共事件属性将会被保存到缓存中，无需每次启动时调用。如果调用 `setSuperProperties` 上传了先前已设置过的公共事件属性，则会覆盖之前的属性。
- Key 为该属性的名称，为字符串类型，规定只能以字母开头，包含数字，字母和下划线 "_"，长度最大为 50 个字符，对字母大小写不敏感，AE 会统一转化为小写字母
- Value 为该属性的值，支持字符串、数字、布尔、时间、对象、对象组、数组
<quote-container>
**事件属性、用户属性的要求与公共事件属性保持一致**
</quote-container>

### 3.3 发送事件
您可以调用 `track` 来上传事件，建议您根据先前梳理的埋点文档来设置事件的属性以及发送信息的条件，此处以用户购买某商品作为范例：
```javascript
TDAnalytics.track({
    eventName: "product_buy", // 事件名称
    properties: {
        product_name: "商品名"
    } //事件属性
});
```

事件的名称是字符串类型，只能以字母开头，可包含数字，字母和下划线 "_"，长度最大为 50 个字符。
### 3.4 设置用户属性
对于一般的用户属性，您可以调用 `userSet` 来进行设置，使用该接口上传的属性将会覆盖原有的属性值，如果之前不存在该用户属性，则会新建该用户属性，类型与传入属性的类型一致，此处以设置用户名为例：
```javascript
//此时username为TA
TDAnalytics.userSet({
    properties: {
        username: "TA"
    }
});
//此时userName为AE
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

## 四、最佳实践
以下示例代码包含以上所有操作，我们推荐按照如下步骤使用:
```javascript
var TDAnalytics = require("./tdanalytics.egert.min.js");
var config = {
  appId: "YOU-APP-ID", // 项目的 APP ID
  serverUrl: "https://youserverurl.com", // 数据上报地址
  autoTrack: {
    appLaunch: true, // 自动采集 ta_mp_launch
    appShow: true, // 自动采集 ta_mp_show
    appHide: true, // 自动采集 ta_mp_hide
    pageShow: true, // 自动采集 ta_mp_view
    pageShare: true // 自动采集 ta_mp_share
  }
};
// 初始化
TDAnalytics.init(config);
// 用户的登录唯一标识，此数据对应上报数据里的#account_id，此时#account_id的值为TA
TDAnalytics.login("TA");
//设置公共事件属性
var superProperties = {
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
