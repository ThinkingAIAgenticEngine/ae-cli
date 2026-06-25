---
code: ios_sdk_installation
name: "iOS"
wikiToken: Wxc7wQj3FitXYVkTuW5cAAtPnCc
parentWikiToken: KaFCwNeV3iRxjNkpT3QcDMg3n5V
updateTime: 1778673793000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ios_sdk_installation
---

::: tip
Before  you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
The lowest system version required by iOS SDK is iOS 9.0
The size of iOS SDK (Framework format) is around 2.7 MB
 :::
**Latest Version:** v3.4.0
**Update Time:** 03/20/2026
**Resource Download: **[Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fios-sdk%2Ftags), [Download](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FiOS%2Fios_td_analytics_v3.4.0.zip)
::: warning Notice 
Current documentation applies to v3.0.0 and later. For historical versions, see [Data Ingestion Guide - iOS (V2)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fios_sdk_installation%2Fios_sdk_installation.html), [SDK Download (v2.8.4)](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FiOS%2Fios_sdk_2.8.4.zip). 
:::
## **1. ****SDK**** Integration**
### **1.1 Automatic Integration**
- CocoaPods
1. Create a Podfile in your Xcode project directory by running `pod init` in your terminal.
Edit the generated Podfile , and add the following lines: 
```ruby
platform :ios, '9.0'
target 'YourProjectTarget' do
  pod 'ThinkingSDK', '3.4.0'
end
```

2. Navigate to your project's root folder and run `pod install` in your terminal 
After success, the following tip will appear in the terminal:
<image token="QvsBb5DnyocFtgxoVBTc6Goxnxt" width="1132" height="342" align="center"/>

3. Open project 
After the command is executed successfully, `.xcworkspace` file will be generated, indicating that you have successfully imported the iOS SDK. Open the `.xcworkspace` file to start the project (note: the `.xcodeproj` file cannot be opened at the same time)
### **1.2 ****Manual Integration**
1. Download and unzip the [iOS SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FiOS%2Fios_td_analytics_v3.4.0.zip)
2. Add `ThinkingSDK.framework`, `ThinkingDataCore.xcframework` into the Xcode project workspace project
3. In Xcode, go to **Targets** > **Build Settings, **add line `-ObjC ` to `Other linker flags` :
<grid cols="2">
  <column width="52">
    <image token="DQf2bBOAYoyw6mxAxb5c8Y9qnIb" width="496" height="202" align="center"/>

  </column>
  <column width="47">
    <image token="NlCQbh9CmoS10SxyicpcYQZdndh" width="727" height="328" align="center"/>

  </column>
</grid>

4. In Xcode, go to **Targets** > **Build Phases**, add the following dependencies into `Link Binary With Libraries`: `libz.dylib`, `Security.framework`, `SystemConfiguration.framework`, `libsqlite3.tbd`
## **2.  ****Initialization**
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
#import <ThinkingSDK/ThinkingSDK.h>

// SDK needs to be initialized on the main thread

NSString *appid = @"APPID";
NSString *url = @"SERVER_URL";
    
// the first way
[TDAnalytics startAnalyticsWithAppId:appid serverUrl:url];
    
// the second way
TDConfig *config = [[TDConfig alloc] init];
config.appid = appid;
config.serverUrl = url;
[TDAnalytics startAnalyticsWithConfig:config];
```

:::
::: el-tab-pane label=Swift
```swift
// SDK needs to be initialized on the main thread

let appid = "APPID";
let url = "SERVER_URL";

// the first way
TDAnalytics.start(withAppId: appid, serverUrl: url)

// the second way
let config = TDConfig(appId: appid, serverUrl: url)
TDAnalytics.start(with: config)
```

:::
::::
Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of the TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="QnSnbV9NRo0NElx5SQ9cenEcnbd" width="1674" height="1318" align="center"/>


- If you use the private deployment version, you can customize the data tracking URL .
## **3.  Common F****eatures**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or used the APP with a new device.
### **3.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
:::: el-tabs
::: el-tab-pane label=Objective-C
```java
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TD
[TDAnalytics login:@"TD"];
```

:::
::: el-tab-pane label=Swift
```swift
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TD
TDAnalytics.login("TD")
```

:::
::::
<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super properties refer to properties that each event might have. You can call `setSuperProperties` to set super properties. It is recommended that you set super properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as super properties.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
NSMutableDictionary *superProperties = [NSMutableDictionary new];
[superProperties setValue:@"te" forKey:@"channel"];
[superProperties setValue:@1 forKey:@"age"];
[superProperties setValue:@YES forKey:@"isSuccess"];
[superProperties setValue:[NSDate now] forKey:@"birthday"];
[superProperties setValue:@{@"key":@"value"} forKey:@"object"];
[superProperties setValue:@[@{@"key":@"value"}] forKey:@"object_arr"];
[superProperties setValue:@[@"value"] forKey:@"arr"];

//set super properties
[TDAnalytics setSuperProperties:superProperties];
```

:::
::: el-tab-pane label=Swift
```swift
var superProperties: [String : Any] = [:]
superProperties["channel"] = "te"
superProperties["age"] = 1
superProperties["isSuccess"] = true
superProperties["birthday"] = Date()
superProperties["object"] = [
    "key": "value"
]
superProperties["object_arr"] = [["key": "value"]]
superProperties["arr"] = ["value"]

//set super properties
TDAnalytics.setSuperProperties(superProperties)
```

:::
::::
Super properties would be saved in local storage, and will not need to be called every time the APP is opened. If the super properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for super properties**
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of tracking installation, open_app and close_app events. To get more information about the automatic tracking of SDK, please refer to the [Detailed introduction of automatic tracking function](https://thinkingdata.feishu.cn/wiki/IqwOwQmTbiVNXZk8r4JcmZAMnie)
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAppInstall | TDAutoTrackEventTypeAppStart | TDAutoTrackEventTypeAppEnd];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.enableAutoTrack([.appStart, .appEnd, .appInstall])
```

:::
::::
### **3.4 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
NSDictionary *eventProperties = @{@"product_name": @"book"};
[TDAnalytics track:@"product_buy" properties:eventProperties];
```

:::
::: el-tab-pane label=Swift
```swift
let properties = ["product_name": "book"] as [String: Any]
TDAnalytics.track("product_buy", properties: properties)
```

:::
::::
The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `user``S``et` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties would be created. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//the username now is ThinkingData
[TDAnalytics userSet:@{@"username": @"ThinkingData"}];
//the userName now is TA
[TDAnalytics userSet:@{@"username": @"TA"}];
```

:::
::: el-tab-pane label=Swift
```swift
//the username now is ThinkingData
TDAnalytics.userSet(["usernaame": "ThinkingData"])
//the userName now is TA
TDAnalytics.userSet(["usernaame": "TA"])
```

:::
::::
## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
if (privacy policy is authorized) {
    
    // SDK needs to be initialized on the main thread
    NSString *appid = @"APPID";
    NSString *url = @"SERVER_URL";
    TDConfig *config = [[TDConfig alloc] init];
    config.appid = appid;
    config.serverUrl = url;
    [TDAnalytics startAnalyticsWithConfig:config];
    
    [TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAppInstall | TDAutoTrackEventTypeAppStart | TDAutoTrackEventTypeAppEnd];
    
    [TDAnalytics login:@"TD"];
    
    NSDictionary *superProperties = @{
        @"channel": @"ta",
        @"age": @1,
        @"isSuccess": @YES,
        @"birthday": [NSDate date],
        @"object": @{
            @"key":@"value"
        },
        @"object_arr":@[
            @{
                @"key":@"value"
            }
        ],
        @"arr": @[@"value"],
    };
    [TDAnalytics setSuperProperties:superProperties];
        
    NSDictionary *eventProperties = @{@"product_name": @"book"};
    [TDAnalytics track:@"product_buy" properties:eventProperties];
    
    [TDAnalytics userSet:@{@"username": @"ThinkingData"}];
}

```

:::
::: el-tab-pane label=Swift
```swift
// SDK needs to be initialized on the main thread
let appid = "app_id";
let url = "server_url";
let config = TDConfig(appId: appid, serverUrl: url)
TDAnalytics.start(with: config)

TDAnalytics.enableAutoTrack([.appStart, .appEnd, .appInstall])

TDAnalytics.login("TD")

var superProperties: [String : Any] = [:]
superProperties["channel"] = "ta"
superProperties["age"] = 1
superProperties["isSuccess"] = true
superProperties["birthday"] = Date()
superProperties["object"] = [
    "key": "value"
]
superProperties["object_arr"] = [["key": "value"]]
superProperties["arr"] = ["value"]
TDAnalytics.setSuperProperties(superProperties)

let eventProperties : [String: Any] = ["product_name": "book"]
TDAnalytics.track("test", properties: eventProperties)

TDAnalytics.userSet(["level": "1"])
```

:::
::::
