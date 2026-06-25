---
code: macos_sdk_installation
name: "macOS"
wikiToken: AjsqwxZYhiklqfkGXetcWhjBnue
parentWikiToken: KaFCwNeV3iRxjNkpT3QcDMg3n5V
updateTime: 1778673818000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=macos_sdk_installation
---

::: tip
Before  you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
The minimum system version required by Mac SDK is OSX 10.11
:::
**Latest Version:** v3.0.4
**Update Time:** August 01, 2024
**Resource Download: **[Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fios-sdk%2Ftags)
**Beta version:**v3.0.5-beta.1
::: tip
The iOS SDK has been adapted for macOS since v3.0.0
:::
## **1. ****SDK**** Integration**
### **1.1 Automatic Integration**
- CocoaPods
1. Create a Podfile in your Xcode project directory by running `pod init` in your terminal.
Edit the generated Podfile , and add the following lines: 
```ruby
platform :osx, '10.10'
target 'YourProjectTarget' do
  pod 'ThinkingSDK'
end
```

2. Navigate to your project's root folder and run `pod install` in your terminal 
After success, the following tip will appear in the terminal:
```plaintext
pod install
```

3. Open project 
After the command is executed successfully, `.xcworkspace` file will be generated, indicating that you have successfully imported the macOS SDK. Open the `.xcworkspace` file to start the project (note: the `.xcodeproj` file cannot be opened at the same time)
## **2.  ****Initialization**
Complete the initialization operation in main thread, the sample code is as follows:
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
<image token="YAvRbReXLoG84yxy6ErciRSEnsf" width="1280" height="1007" align="center"/>


- If you use the private deployment version, you can customize the data tracking URL .
## **3.  Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the APP or used the APP with a new device.
### **3.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
[TDAnalytics login:@"TE"];
```

:::
::: el-tab-pane label=Swift
```swift
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TE");
```

:::
::::
<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super Properties refer to properties that each event might have. You can call `setSuperProperties` to set Super Properties. It is recommended that you set Super Properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as Super Properties.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
NSDictionary *params = @{
    @"channel": @"TE", //string
    @"age": @(1), //number
    @"isSuccess": @(YES), //boolean
    @"birthday": [NSDate date], //time
    @"object": @{@"key": @"value"}, //object
    @"object_arr": @[@{@"key": @"value"}], //array object
    @"arr": @[@"value"] //array
};
//set super properties
[TDAnalytics setSuperProperties:params];
```

:::
::: el-tab-pane label=Swift
```swift
let params: [String: Any] = [
    "channel": "TE", // string
    "age": 1, // number
    "isSuccess": true, //boolean
    "birthday": Date(), //time
    "object": ["key": "value"], //object
    "object_arr": [["key": "value"]], //array object
    "arr": ["value"] //array
]
//set super properties
TDAnalytics.setSuperProperties(params)
```

:::
::::
Super Properties would be saved in local storage, and will not need to be called every time the APP is opened. If the Super Properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for Super Properties**
</quote-container>

### **3.3 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
NSDictionary *eventProperties = @{@"product_name": @"product name"};
[TDAnalytics track:@"product_buy" properties:eventProperties];
```

:::
::: el-tab-pane label=Swift
```swift
let properties = ["productName": "product name"] as [String: Any]
TDAnalytics.track("product_buy", properties: properties)
```

:::
::::
The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.4 User Properties**
You can set general user properties by calling `userSet` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties would be created. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
[TDAnalytics userSet:@{@"userName": @"TE"}];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.userSet(["username": "TE"])
```

:::
::::
## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```objectivec
if (authorized) {
    // enable log
    [TDAnalytics enableLog:NO];
    
    // SDK needs to be initialized on the main thread
    NSString *appid = @"APPID";
    NSString *url = @"SERVER_URL";
    TDConfig *config = [[TDConfig alloc] init];
    config.appid = appid;
    config.serverUrl = url;
    [TDAnalytics startAnalyticsWithConfig:config];
    
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
    
    // "username" is "ThinkingData"
    [TDAnalytics userSet:@{@"username": @"ThinkingData"}];
}
```
