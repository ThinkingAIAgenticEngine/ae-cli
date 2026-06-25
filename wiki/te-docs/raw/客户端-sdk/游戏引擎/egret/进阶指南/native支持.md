---
code: egret_sdk_native
name: "Native支持"
wikiToken: JPB1w4spWidFSokTeNec4JRGnef
parentWikiToken: IFBjwUhHviTPggkLtGZchaSonGd
updateTime: 1774248009000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=zh-CN&code=egret_sdk_native
---
## 一、iOS Native支持
**构建 iOS 平台应用，配置 iOS 工程**
- 添加 iOS 工程依赖文件 
  - `EgretProxyApi.h`
  - `EgretProxyApi.mm`
  - `ThinkingSDK.framework`
- Build Settings 设置 
  - `Other Linker Flags` 添加 `-ObjC`
- 注册 Native 代理 
  - 在 `AppDelegate.mm` 的 `application:didFinishLaunchingWithOptions:` 方法中注册 Native 代理，调用代码 `[EgretProxyApi registExternalInterface:_native]`
## 二、Android Native支持
**构建 Android 平台应用，配置 Android 工程**
- 添加 Adnroid 工程依赖文件 
  - `EgretProxyApi.java`
- 在 `Project` 级别的 `build.gradle` 文件中添加如下配置依赖
```plaintext
buildscript {
    repositories {
        jcenter()
        mavenCentral()
    }
}
```

- 在 `Module` 下的 `build.gradle`文件中添加依赖项
```plaintext
dependencies {
    implementation 'cn.thinkingdata.android:ThinkingAnalyticsSDK:2.7.6.1'
}
```

- 注册 Native 代理 
  - 在 `MainActivity` 的 `onCreate` 方法中注册 Native 代理，调用代码 `EgretProxyApi.registExternalInterface(nativeAndroid,this)`
## 三、开启 Native 支持
初始化 SDK 时，在 `config` 中加入 `enableNative: true`，即可开启 Native 支持。
```javascript
// TA SDK 配置对象
var config = {
  appId: "YOUR_APPID", // 项目 APP ID
  serverUrl: "YOUR_SERVER_URL", // 上报地址
  enableNative: true, // 允许调用 Native 代码
  autoTrack: {
    appShow: true, // 自动采集 启动事件
    appHide: true, // 自动采集 关闭事件
    appClick: true, // 自动采集 点击事件（仅 native 生效）
    appView: true, // 自动采集 页面浏览事件（仅 native 生效）
    appCrash: true, // 自动采集 崩溃事件（仅 native 生效）
    appInstall: true // 自动采集 安装事件（仅 native 生效）
  }
};

// 初始化
TDAnalytics.init(config);
// 上报一个简单事件, 事件名为 test_event
TDAnalytics.track({
    eventName: 'test_event'
});
```
