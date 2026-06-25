---
code: uniapp_sdk_native
name: "Support Native"
wikiToken: OcNWwiFFPiRBP6kivKicaRgEnKh
parentWikiToken: DM7kwtiBMiCpWCkk7icczidxn7c
updateTime: 1774249176000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=uniapp_sdk_native
---

## 1. Support  iOS Native 
### 1.1 Building an iOS Project
- Create an iOS project
- Open HBuilderX- Publish - Generate App package resources
- Copy the locally packaged App resources to the Pandora -> apps path in the project directory
### **1.2 Configuring the ****iOS**** Project**
- Add iOS project dependency files
Install the SDK using CocoaPods
Create and edit Podfile content (edit directly if you already have it) :
Create a Podfile, project (.xcodeproj) file in the same directory as the command line:
```shell
pod init
```

Edit Podfile as follows:
```javascript
pod 'TAGameEngine'
```

Running the Installation Command
```javascript
pod install
```

## 2.Support Android Native
### 1.1 Building an Android Project
- Create an Android project
- Open HBuilderX- Publish - Generate App package resources
- Copy app resources to project assets->apps
### **2.2 Configuring the Android Project**
- Add the following configuration dependencies to the build.gradle file at the Project
```plaintext
buildscript {
    repositories {
        jcenter()
        mavenCentral()
    }
}
```

-  Add the dependencies to the build.gradle file in the Module project directory
```plaintext
implementation 'cn.thinkingdata.android:TAGameEngine:1.2.0'
implementation 'cn.thinkingdata.android:ThinkingAnalyticsSDK:3.0.0.1
```

## 3.Enabling Native Support
When initializing the SDK, set enableNative: true in config to enableNative support.
```go

var config = {
  appId: "YOUR_APPID", 
  serverUrl: "YOUR_SERVER_URL", 
  enableNative: true, // enable native support
  autoTrack: {
    appLaunch: true, // auto-tracking ta_mp_launch
    appShow: true, // auto-tracking ta_mp_show
    appHide: true, // auto-tracking ta_mp_hide
    appInstall:true,// auto-tracking ta_app_install(only for native)
    appCrash: true, // auto-tracking ta_app_crash(only for native)
  }
};

// init
TDAnalytics.init(config);
TDAnalytics.track({
    eventName: "product_buy",
    properties: {
        product_name: "tv"
    }
 });
```
