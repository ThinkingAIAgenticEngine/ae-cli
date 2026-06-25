---
code: laya_sdk_native
name: "Native支持"
wikiToken: JQaWwYpaXimQlwkmQHgcZTRUnXc
parentWikiToken: UGaFwQQPEi69XukGdVocvRTSnjh
updateTime: 1774247996000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=zh-CN&code=laya_sdk_native
---
## 一、 iOS Native 支持
### 1.1 构建iOS项目
- 构建准备 
  - 发布 Web 平台应用，记录发布文件路径
- 构建配置 
  - 打开`菜单`-`工具`-`app构建`界面
  - 项目类型选择 `XCode iOS`，勾选`单机版`
  - 资源路径选择 Web 平台应用的发布路径
### **1.2 配置 iOS 工程**
- 添加 iOS 工程依赖文件 
  - `LayaProxyApi.h`
  - `LayaProxyApi.mm`
  - `ThinkingSDK.framework`
- Build Settings 设置 
  - `Other Linker Flags` 添加 `-ObjC`
## 二、 Android Native 支持
### 2.1 构建Android项目
- 构建准备 
  - 发布 Web 平台应用，记录发布文件路径
- 构建配置 
  - 打开`菜单 - 工具 - app构建`界面
  - 项目类型选择 `Android studio`，勾选`单机版`
  - 资源路径选择 Web 平台应用的发布路径
### **2.2 配置 Android 工程**
- 在 Adnroid 显示模式的 app 工程中，把依赖文件 `LayaProxyApi.java` 加入到 `demo` 中，如下图 

- 在项目的 `app/libs` 目录下，将 `ThinkingSDK.aar` 拷贝到其中 

- 在 `Module` 下的 `build.gradle` 文件中添加依赖项
```groovy
dependencies {
    ...
    implementation fileTree(dir: 'libs', include: ['*.aar'])
}
```


## 三、 开启 Native 支持
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
    appView: true, // 自动采集 浏览事件（仅 native 生效）
    appCrash: true, // 自动采集 崩溃事件（仅 native 生效）
    appInstall: true // 自动采集 安装事件（仅 native 生效）
  }
};

// 初始化
TDAnalytics.init(config);
// 上报一个简单事件, 事件名为 test_event
TDAnalytics.track({
    eventName: "test_event"
});
```

