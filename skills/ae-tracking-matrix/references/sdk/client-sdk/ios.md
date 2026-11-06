---
code: ios_sdk_installation
name: "iOS"
wikiToken: RCJRwHveBi4YRBk2AqncI0VqncS
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1773312570000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=ios_sdk_installation
---

# iOS

::: tip Tip

Please read the pre-installation preparation before integration.

iOS SDK requires minimum system version iOS 9.0

iOS SDK (Framework format) size is approximately 2.7 MB

:::

**Latest Version:** v3.3.5

**Update Time:** 2026-03-12

**Resource Download:** Source code Download

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to iOS Integration Guide (V2), SDK Download (v2.8.4)

:::

### I. Integrate SDK

#### 1.1 Automatic Integration

- Install SDK using CocoaPods

1. Create and edit Podfile content (if exists, edit directly):

Create Podfile, execute command in the same directory as the project file (`.xcodeproj`):

```
pod init
```

Edit Podfile content as follows:

```
platform :ios, '9.0'
target 'YourProjectTarget' do
  pod 'ThinkingSDK', '3.3.5'
end
```

2. Execute installation command in the project root directory

```
pod install
```

After success, the terminal will show the following message:

3. Import successful, launch project

After successful command execution, a `.xcworkspace` file will be generated, indicating you have successfully imported `iOS SDK`. Open `.xcworkspace` file to launch the project (Note: `.xcodeproj` file cannot be opened simultaneously)

#### 1.2 Manual Integration

1. Download and unzip iOS SDK

2. Drag `ThinkingSDK.xcframework` and `ThinkingDataCore.xcframework` into XCode Project Workspace

3. Find Targets, add `-ObjC` to `Other linker flags` option in Build Settings menu

4. Switch to Build Phases tab, add the following dependencies under `Link Binary With Libraries`:

`libz.dylib`, `Security.framework`, `SystemConfiguration.framework`, `libsqlite3.tbd`

### II. Initialize

:::: el-tabs

::: el-tab-pane label=Objective-C

```
#import <ThinkingSDK/ThinkingSDK.h>

NSString *appid = @"APPID";
NSString *url = @"SERVER_URL";

// Method one
[TDAnalytics startAnalyticsWithAppId:appid serverUrl:url];

// Method two
TDConfig *config = [[TDConfig alloc] init];
config.appid = appid;
config.serverUrl = url;
[TDAnalytics startAnalyticsWithConfig:config];
```

:::

::: el-tab-pane label=Swift

```
// SDK needs to be initialized on the main thread

**let** appid = "APPID";
**let** url = "SERVER_URL";

// Method one
TDAnalytics.start(withAppId: appid, serverUrl: url)

// Method two
**let** config = TDConfig(appId: appid, serverUrl: url)
TDAnalytics.start(with: config)
```

:::

::::

Parameter description:

- `APPID`: Your project's APPID, can be obtained from TE backend project management page
- `SERVER_URL`: Data upload URL
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using private deployment version, please bind a domain for data collection address and configure HTTPS certificate: https://data-collection-address-bound-domain

### III. Common Features

Before using common features, we recommend you first understand user identification rules. SDK will default use `DeviceID_InstallCount` as visitor ID, and persistently store visitor ID locally. Before user logs in, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user reinstalls the App or switches devices.

#### 3.1 Set Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite previous account ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TD
[TDAnalytics login:@"TD"];
```

:::

::: el-tab-pane label=Swift

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TD
TDAnalytics.login("TD")
```

:::

::::

<!-- unsupported block: 34 -->

**This method does not upload login event**

#### 3.2 Set Common Event Properties

Common event properties refer to properties that every event will have. You can call `setSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For important properties like user membership level, source channel, etc., which need to be set in every event, you can set these properties as common event properties.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
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
```

:::

::: el-tab-pane label=Swift

```
var superProperties: [AnyHashable : Any] = [:]
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
```

:::

::::

Common event properties will be saved to cache, no need to call every time App starts. If `setSuperProperties` is called to set a previously set common event property, it will overwrite the previous property.

- Event property is a `NSDictionary` object, where each element represents a property.
- Key is the property name, string type, must start with letter, contain numbers, letters and underscore "\_", maximum length 50 characters, case insensitive, TE will convert to lowercase letters
- Value is the property value, supports string, number, boolean, time, object, object array, array
- If you need to upload boolean property, please use `@YES` and `@NO` or `[NSNumber numberWithBool:YES]` and `[NSNumber numberWithBool:NO]` to assign. **Cannot use** `@true`, `@false`, `@TRUE` and `@FALSE` to assign boolean data.
<!-- unsupported block: 34 -->

**Event properties and user properties requirements are consistent with common event properties**

#### 3.3 Enable Auto Tracking

The following code example enables install, start, and end events. If you want to understand SDK's auto tracking capabilities in detail, you can view the auto tracking feature detailed introduction.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAppInstall | TDAutoTrackEventTypeAppStart | TDAutoTrackEventTypeAppEnd];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.enableAutoTrack([.appStart, .appEnd, .appInstall])
```

:::

::::

#### 3.4 Send Event

You can call `track` to upload events. We recommend you set event properties and conditions for sending information according to your tracking documentation. Here is an example of user purchasing a product:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSDictionary *eventProperties = @{@"product_name": @"book"};
[TDAnalytics track:@"product_buy" properties:eventProperties];
```

:::

::: el-tab-pane label=Swift

```
let properties = ["product_name": "book"] as [String: Any]
TDAnalytics.track("product_buy", properties: properties)
```

:::

::::

Event name is string type, must start with letter, can contain numbers, letters and underscore "\_", maximum length 50 characters.

#### 3.5 Set User Properties

For general user properties, you can call `userSet` to set. Properties uploaded using this interface will overwrite original property values. If the user property did not exist before, it will create a new user property, type consistent with the uploaded property type. Here is an example of setting username:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Now "username" is "ThinkingData"
[TDAnalytics userSet:@{@"username": @"ThinkingData"}];
// Now "username" is "TA"
[TDAnalytics userSet:@{@"username": @"TA"}];
```

:::

::: el-tab-pane label=Swift

```
// Now "username" is "ThinkingData"
TDAnalytics.userSet(["usernaame": "ThinkingData"])
// Now "username" is "TA"
TDAnalytics.userSet(["usernaame": "TA"])
```

:::

::::

### IV. Best Practices

The following example code includes all the above operations. We recommend using the following steps:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
if (Privacy policy authorized) {
    // Enable log
    [TDAnalytics enableLog:NO];

    // SDK initialization
    NSString *appid = @"APPID";
    NSString *url = @"SERVER_URL";
    TDConfig *config = [[TDConfig alloc] init];
    config.appid = appid;
    config.serverUrl = url;
    [TDAnalytics startAnalyticsWithConfig:config];

    // Enable auto tracking
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

```
if (Privacy policy authorized) {
    // Enable log
    TDAnalytics.enableLog(true)

    // SDK initialization
    let appid = "app_id";
    let url = "server_url";
    let config = TDConfig(appId: appid, serverUrl: url)
    TDAnalytics.start(with: config)

    // Enable auto tracking
    TDAnalytics.enableAutoTrack([.appStart, .appEnd, .appInstall])

    TDAnalytics.login("TD")

    var superProperties: [AnyHashable : Any] = [:]
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
 }
```

:::

::::

---

# Advanced Guide

### I. Set User ID

SDK default will use `DeviceID_InstallCount` as the default visitor ID for each user. This visitor ID will be used as identity identification ID when user is not logged in. Note that visitor ID will change when user reinstalls App or switches devices.

#### 1.1 Set Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please ensure you understand user identification rules before setting visitor ID.

If you need to replace visitor ID, you should call it immediately after SDK initialization is complete. Do not call multiple times to avoid creating useless accounts.

:::

If your App has its own visitor ID management system for each user, you can call `setDistinctId` to set visitor ID:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics setDistinctId:@"Thinker"];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.setDistinctId("Thinker")
```

:::

::::

If you need to get current visitor ID, you can call `getDistinctId` to retrieve:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSString *distinctId = [TDAnalytics getDistinctId];
```

:::

::: el-tab-pane label=Swift

```
let distinctId = TDAnalytics.getDistinctId()
```

:::

::::

#### 1.2 Set Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite previous account ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics login:@"TD"];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.login("TD")
```

:::

::::

<!-- unsupported block: 34 -->

**This method does not upload login event**

#### 1.3 Clear Account ID

After user generates logout behavior, you can call `logout` to clear account ID. Before next `login` call, visitor ID will be used as identity identification ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics logout];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.logout()
```

:::

::::

We recommend you call `logout` when there is an explicit logout event, such as when user performs account cancellation action, rather than calling when closing App.

<!-- unsupported block: 34 -->

**This method does not upload logout event**

### II. Send Event

After SDK initialization is complete, you can perform data tracking and collect user behavior information. Generally, normal events can meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

#### 2.1 Normal Event

You can call `track` to upload events. We recommend you set event properties and conditions for sending events according to your documentation. Here is an example of user purchasing a product:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSDictionary *eventProperties = @{@"product_name": @"book"};
[TDAnalytics track:@"product_buy" properties:eventProperties];
```

:::

::: el-tab-pane label=Swift

```
let properties = ["product_name": "book"] as [String: Any]
TDAnalytics.track("product_buy", properties: properties)
```

:::

::::

#### 2.2 First-time Event

First-time event refers to an event that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record the activation event on a certain device, you can use first-time event to report data.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel];
```

:::

::: el-tab-pane label=Swift

```
let firstModel = TDFirstEventModel(eventName:"device_activation")
firstModel.properties = ["KEY": "VALUE"]
TDAnalytics.track(with: firstModel)
```

:::

::::

If you want to use other dimensions besides device to determine whether it's first-time, you can customize first_check_id for the first-time event:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation" firstCheckID:@"TD"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel];
```

:::

::: el-tab-pane label=Swift

```
**let** firstModel = TDFirstEventModel(eventName:"device_activation", firstCheckID:"TD")
firstModel.properties = ["KEY": "VALUE"]
TDAnalytics.track(with: firstModel)
```

:::

::::

<!-- unsupported block: 34 -->

Note: Since the server completes the verification of whether it's first-time, first-time events will have a 1-hour delay before being stored.

#### 2.3 Updatable Event

You can use updatable events to implement the need to modify event data in specific scenarios. Updatable events need to specify the ID that identifies the event and pass it when creating the updatable event object. TE backend will determine the data that needs to be updated based on event name and event ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Example: Report an updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TDUpdateEventModel *updateModel = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:updateModel];

// After reporting, event property status is updated to 5, price unchanged
TDUpdateEventModel *updateModelNew = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModelNew.properties = @{@"status": @5};
[TDAnalytics trackWithEventModel:updateModelNew];
```

:::

::: el-tab-pane label=Swift

```
// Example: Report an updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
**let** updateModel = TDUpdateEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
updateModel.properties = ["status": 3, "price": 100]
TDAnalytics.track(with: updateModel)

// After reporting, event property status is 5, price unchanged
**let** updateModel_new = TDUpdateEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
updateModel_new.properties = ["status": 5]
TDAnalytics.track(with: updateModel_new)
```

:::

::::

#### 2.4 Overwritable Event

Overwritable event is similar to updatable event, the difference is that overwritable event will completely overwrite historical data with the latest data. From the effect, it's equivalent to deleting the previous data and storing the latest data. TE backend will determine the data that needs to be updated based on event name and event ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Example: Report an overwritable event, assuming event name is OVERWRITE_EVENT
// After reporting, event property status is 3, price is 100
TDOverwriteEventModel *overwriteModel = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:overwriteModel];

// After reporting, event property status is 5, price property is deleted
TDOverwriteEventModel *overwriteModel_new = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel_new.properties = @{@"status": @5};
[TDAnalytics trackWithEventModel:overwriteModel_new];
```

:::

::: el-tab-pane label=Swift

```
// Example: Report an overwritable event, assuming event name is OVERWRITE_EVENT
// After reporting, event property status is 3, price is 100
**let** overwriteModel = TDOverwriteEventModel(eventName: "OVERWRITE_EVENT", eventID: "test_event_id")
overwriteModel.properties = ["status": 3, "price": 100]
TDAnalytics.track(with: overwriteModel)

// After reporting, event property status is 5, price is deleted
**let** overwriteModel_new = TDOverwriteEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
overwriteModel_new.properties = ["status": 5]
TDAnalytics.track(with: overwriteModel_new)
```

:::

::::

#### 2.5 Common Event Properties

Common event properties refer to properties that every event will upload. Based on property update frequency, common event properties are divided into `static common event properties` and `dynamic common event properties`. You can choose different common event property setting methods according to specific business scenario requirements. We recommend you set common event properties before sending events. For the same event, when common event properties, event custom properties, and preset properties have the same Key, we will assign values according to the following priority: `custom properties > dynamic common event properties > static common event properties > preset properties`.

##### 2.5.1 Static Common Event Properties

Static common event properties are properties that change infrequently and every event will have, such as user membership level. After setting static common event properties through `setSuperProperties`, SDK will get the set common event properties as event properties during event collection.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics setSuperProperties:@{@"vip_level": @(2)}];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.setSuperProperties(["vip_level" : 2])
```

:::

::::

Static common event properties will be saved to cache, no need to call every time App starts. If the property already exists, the newly set property will overwrite the original property value. If the property did not exist before, a new property will be created. Besides property setting, we also provide other APIs to operate static common event properties to meet daily business needs.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Clear a common event property, clearing the previously set "isTest" property
[TDAnalytics unsetSuperProperty:@"isTest"];

// Clear all common event properties
[TDAnalytics clearSuperProperties];

// Get all common properties
[TDAnalytics getSuperProperties];
```

:::

::: el-tab-pane label=Swift

```
// Clear a common event property, clearing the previously set "isTest" property
TDAnalytics.unsetSuperProperty("isTest")

// Clear all common event properties
TDAnalytics.clearSuperProperties()

// Get all common properties
TDAnalytics.getSuperProperties()
```

:::

::::

##### 2.5.2 Dynamic Common Event Properties

Dynamic common event properties are properties that change frequently and every event will have, such as user's coin count. After setting dynamic common properties through `setDynamicSuperProperties`, SDK will get dynamic common properties during event collection and add them to triggered events.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Set dynamic common properties, dynamically get event occurrence time during event reporting
[TDAnalytics setDynamicSuperProperties:^NSDictionary * **_Nonnull**{
    **return** @{@"now": [NSDate date]};
}];
```

:::

::: el-tab-pane label=Swift

```
// Set dynamic common properties, dynamically get event occurrence time during event reporting
TDAnalytics.setDynamicSuperProperties{ () -> [String : **Any**] **in**
    **return** ["now": Date()]
}
```

:::

::::

#### 2.6 Record Event Duration

If you need to record the duration of a certain event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload the event, it will automatically add `#duration` property in your event properties to represent the recorded duration, in seconds. Note that only one timing task can exist for the same event name.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// The following example completes the statistics of user stay duration on a product page
[TDAnalytics timeEvent:@"stay_shop"];
    /*
     do someting .......
     */
// User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
[TDAnalytics track:@"stay_shop"];
```

:::

::: el-tab-pane label=Swift

```
// The following example completes the statistics of user stay duration on a product page
TDAnalytics.timeEvent("stay_shop")
    /*
     do someting .......
     */
// User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.track("stay_shop")
```

:::

::::

### III. User Properties

TE platform supports user property setting APIs: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set. Properties uploaded using this interface will overwrite original property values. If the user property did not exist before, it will create a new user property, type consistent with the uploaded property type. Here is an example of setting username:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Now "username" is "ThinkingData"
[TDAnalytics userSet:@{@"username": @"ThinkingData"}];
// Now "username" is "TA"
[TDAnalytics userSet:@{@"username": @"TA"}];
```

:::

::: el-tab-pane label=Swift

```
// Now "username" is "ThinkingData"
TDAnalytics.userSet(["username": "ThinkingData"])
// Now "username" is "TA"
TDAnalytics.userSet(["username": "TA"])
```

:::

::::

#### 3.2 userSetOnce

If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set. When the property already has a value before, this message will be ignored. Here is an example of setting first payment time:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// first_payment_time is 2018-01-01 01:23:45.678
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-01-01 01:23:45.678"}];
// first_payment_time is still 2018-01-01 01:23:45.678
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-12-31 01:23:45.678"}];
```

:::

::: el-tab-pane label=Swift

```
// first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(["first_payment_time": "2018-01-01 01:23:45.678"])
// first_payment_time is still 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(["first_payment_time": "2018-12-31 01:23:45.678"])
```

:::

::::

#### 3.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to accumulate the property. If the property has not been set yet, it will assign 0 before calculation. Negative values can be passed, equivalent to subtraction operation. Here is an example of cumulative payment amount:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Now total_revenue is 30
[TDAnalytics userAdd:@{@"total_revenue": @30}];

// Now total_revenue is 678
[TDAnalytics userAdd:@{@"total_revenue": @648}];
```

:::

::: el-tab-pane label=Swift

```
// Now total_revenue is 30
TDAnalytics.userAdd(["total_revenue": 30])

// Now total_revenue is 678
TDAnalytics.userAdd(["total_revenue": 648])
```

:::

::::

#### 3.4 userUnset

When you want to clear a user's certain user property value, you can call `userUnset` to clear the specified property. If the property has not been created in the cluster yet, `userUnset` will not create the property

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Clear the user's cumulative payment amount property value
[TDAnalytics userUnset:@"total_revenue"];
```

:::

::: el-tab-pane label=Swift

```
// Clear the user's cumulative payment amount property value
TDAnalytics.userUnset("total_revenue")
```

:::

::::

#### 3.5 userDelete

If you want to delete a user, you can call `userDelete` to delete the user. You will no longer be able to query this user's user properties, but the events generated by this user can still be queried.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics userDelete];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.userDelete()
```

:::

::::

#### 3.6 userAppend

You can call `userAppend` to append elements to array type user properties.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Call userAppend to append elements to user property product_buy. If not exists, will create the element
[TDAnalytics userAppend:@{@"product_buy": @[@"apple", @"ball"]}];
```

:::

::: el-tab-pane label=Swift

```
// Call userAppend to append elements to user property product_buy. If not exists, will create the element
TDAnalytics.userAppend(["product_buy": ["apple", "ball"]])
```

:::

::::

#### 3.7 userUniqAppend

From v2.8.0, you can call `userUniqAppend` to append elements to array type user properties.

Calling `userUniqAppend` interface will deduplicate appended user properties. `userAppend` interface does not deduplicate, user properties may have duplicates.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Now user_list property value is ["apple", "ball"]
[TDAnalytics userAppend:@{@"user_list":@[@"apple", @"ball"]}];
// Now user_list property value is ["apple", "apple", "ball", "cube"]
[TDAnalytics userAppend:@{@"user_list":@[@"apple", @"cube"]}];
// Now user_list property value is ["apple", "ball", "cube"]
[TDAnalytics userUniqAppend:@{@"user_list":@[@"apple", @"cube"]}];
```

:::

::: el-tab-pane label=Swift

```
// Now user_list property value is ["apple", "ball"]
TDAnalytics.userAppend(["user_list": ["apple", "ball"]])
// Now user_list property value is ["apple", "apple", "ball", "cube"]
TDAnalytics.userAppend(["user_list": ["apple", "cube"]])
// Now user_list property value is ["apple", "ball", "cube"]
TDAnalytics.userUniqAppend(["user_list": ["apple", "cube"]])
```

:::

::::

### IV. Encryption Feature

From v2.8.0, SDK supports using AES+RSA encryption for data. Data encryption feature requires client and server cooperation. Please consult customer success staff for specific usage.

```
TDConfig *sdkConfig = [[TDConfig alloc] initWithAppId:appid serverUrl:url];
NSString *publicKey = @"MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCzA......QIDAQAB";
// Configure version number, public key and other key information
[sdkConfig enableEncryptWithVersion:1 publicKey:publicKey];
[TDAnalytics startAnalyticsWithConfig:sdkConfig];
```

### V. Enable Integration with H5 Pages

If you need to integrate with JavaScript SDK that collects H5 page data, please call the following interface. For details, please refer to the H5 and APP SDK Integration section.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
config.applicationNameForUserAgent = [NSString stringWithFormat:@"%@ %@", config.applicationNameForUserAgent ?: @"", @"/td-sdk-ios"];
```

:::

::: el-tab-pane label=Swift

```
let webViewConfig = WKWebViewConfiguration()
webViewConfig.applicationNameForUserAgent = "\(webViewConfig.applicationNameForUserAgent ?? "") /td-sdk-ios"
```

:::

::::

### VI. Other Features

#### 6.1 Get Device ID

You can get device ID by calling `getDeviceId`:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics getDeviceId];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.getDeviceId()
```

:::

::::

#### 6.2 Set Default Timezone

By default, SDK will use the local time at interface call time as event occurrence time for reporting. You can also set default timezone interface to specify default timezone, so all events will align event time according to your set timezone:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
TDConfig *config = [[TDConfig alloc] init];
// Set default timezone to UTC
config.defaultTimeZone = [NSTimeZone timeZoneWithName:@"UTC"];
[TDAnalytics startAnalyticsWithConfig:config];
```

:::

::: el-tab-pane label=Swift

```
let config = TDConfig(appId: appid, serverUrl: url)
config.defaultTimeZone = TimeZone.current
TDAnalytics.start(with: config)
```

:::

::::

<!-- unsupported block: 34 -->

Note: Using specified timezone to align event time will lose device local timezone information. If you need to preserve device local timezone information, currently you need to add relevant properties to events yourself.

#### 6.3 Calibrate Time

SDK default will use local time as event occurrence time for reporting. If user manually modifies device time, it will affect your business analysis. In this case, you can ensure the accuracy of event occurrence time through time calibration operation. We provide `timestamp, NTP` two time calibration methods.

- You can use the current timestamp obtained from server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use calibrated time.
  :::: el-tabs

::: el-tab-pane label=Objective-C

```
// 1585633785954 is current unix timestamp, unit is milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
[TDAnalytics calibrateTime:1585633785954];
```

:::

::: el-tab-pane label=Swift

```
// 1585633785954 is current unix timestamp, unit is milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954)
```

:::

::::

- You can also set NTP server address. After that, SDK will try to get current time from the passed NTP server address and calibrate SDK time. If correct return result is not obtained within default timeout time (3 seconds), subsequent data will be reported using local time.
  :::: el-tabs

::: el-tab-pane label=Objective-C

```
// Use Apple NTP service to calibrate time
[TDAnalytics calibrateTimeWithNtp:@"time.apple.com"];
```

:::

::: el-tab-pane label=Swift

```
// Use Apple NTP service to calibrate time
TDAnalytics.calibrateTime(withNtp:"time.apple.com")
```

:::

::::

<!-- unsupported block: 34 -->

- Using NTP service for time calibration has certain uncertainty. We recommend you consider timestamp calibration method first
- You need to carefully choose your NTP server address to ensure that user devices can quickly get server time under good network conditions

#### 6.4 Immediately Report Data

In certain business scenarios, if you expect data to be immediately reported to TE server, you can call `flush` interface to complete

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics flush];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.flush()
```

:::

::::

#### 6.5 Get Country/Region Code

In certain business scenarios, if you need to know user device's country/region code, you can get it through `getLocalRegion`

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics getLocalRegion];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.getLocalRegion()
```

:::

::::

#### 6.6 Support IP Reporting Data

To prevent or solve the problem of client data unable to normally report to server due to DNS hijacking, SDK parses ServerUrl to get IP, then directly reports data to server through IP. Specific enabling example is as follows:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSString *appId = @"appId";
NSString *serverUrl = @"serverUrl";
TDConfig *config = [[TDConfig alloc] initWithAppId:appId serverUrl:serverUrl];

[config enableDNSServcie:@[TDDNSServiceCloudALi, TDDNSServiceCloudGoogle, TDDNSServiceCloudFlare]];

[TDAnalytics startAnalyticsWithConfig:config];
```

:::

::: el-tab-pane label=Swift

```
let appid = "app_id";
let url = "url";
let config = TDConfig(appId: appid, serverUrl: url)

config.enableDNSServcie([.cloudALi, .cloudGoogle, .cloudFlare])

TDAnalytics.start(with: config)
```

:::

::::

#### 6.7 Support SDK Error Callback

<!-- unsupported block: 19 -->

Requires SDK version >= 3.3.0

In certain scenarios, you may want to customize operations when network request fails. You can register errorCallback. Specific enabling example is as follows:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics registerErrorCallback:^(NSInteger code, NSString * **_Nullable** errorMsg, NSString * **_Nullable** ext) {

}];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.registerErrorCallback { (code: Int, msg: String?, ext: String?) **in**

}
```

:::

::::

code error codes

Error Code

Description

1001

Network request failed

---

# Third-party Data

**Latest Version:** v0.3.5

**Update Time:** 2025-02-10

**Resource Download:** Source code Framework Download

Use cocopoads to integrate:

```
pod 'TAThirdParty'
```

ThinkingSDK from v2.8.0 supports third-party data integration feature. The following is example code for synchronizing data from multiple platforms:

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer | TDThirdPartyTypeAdjust | TDThirdPartyTypeTradPlus | TDThirdPartyTypeTracking | TDThirdPartyTypeTopOn | TDThirdPartyTypeBranch | TDThirdPartyTypeIronSource];
```

<!-- unsupported block: 34 -->

If you need to add extra parameters, you can use `enableThirdPartySharing:customMap`. This API does not support bitwise operations.

### I. Appsflyer

Call API before AppsFlyer SDK calls start method

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer];
```

After creating role (optional)

```
[TDAnalytics login:@"account_id"];
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer properties:@{@"ta_data11":@"ta_value11"}];
```

Each time TE's `login` method or `setDistinctId` method is called, you need to synchronously call `enableThirdPartySharing` to update user identifier.

Note: Since AppFlyer's setAdditionalData each call will overwrite the set user identifier. You can set parameters through our provided `enableThirdPartySharing` method:

```
NSDictionary *dic = @{@"af_test_key1": @"test1",@"af_test_key2": @"test2"};
[AppsFlyerLib.shared setAdditionalData:dic];
```

Because setAdditionalData called multiple times will overwrite previous parameters, you can pass parameters to TE. SDK will internally concatenate and merge the parameters.

```
NSDictionary *dic = @{@"af_test_key1": @"test1",@"af_test_key2": @"test2"};
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer properties:dic];
```

### II. Adjust

Call before Adjust SDK initialization

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAdjust];
```

After creating role (optional)

```
[TDAnalytics login:@"account_id"];
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAdjust];
```

### III. Branch

Call before Branch SDK initialization

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeBranch];
```

After creating role (optional)

```
[TDAnalytics login:@"account_id"];
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeBranch];
```

### IV. TopOn

Call before ATSDK initialization:

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeTopOn];
```

Multiple calls to TE's `login` or `setDistinctId` require calling enableThirdPartySharing again to synchronize data.

Note: Since TopOn's `setCustomData` each call will overwrite the set user identifier. You can set parameters through our provided `enableThirdPartySharing` method:

```
NSDictionary *dic = @{@"test_key1": @"test1", @"test_key2": @"test2"};
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeTopOn properties:dic];
```

### V. Tradplus

Call before TradPlusSdk initialization

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeTradPlus];
```

### VI. IronSource

Call after IronSourceSdk initialization

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeIronSource];
```

### VII. AppLovin

- Display level
  Call after AppLovinSdk initialization

```
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppLovin];
```

- User level
  If you want to implement monetization data acquisition, you need to implement `-[MAAdRevenueDelegate didPayRevenueForAd:]`. In this method, get monetization data and report data through SDK's `enableThirdPartySharing`. Example code is as follows:

```
- (**void**)didPayRevenueForAd:(MAAd *)ad {
    // Get Ad data
    NSDictionary *adInfo = @{
        @"ad_id": ad.adUnitIdentifier,
        @"revenue": @(ad.revenue),
        @"countryCode": [[[ALSdk shared] configuration] countryCode],
        @"networkName": ad.networkName,
        @"adUnitId": ad.adUnitIdentifier,
        @"adFormat": ad.format,
        @"placement": ad.placement
    };
    [TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppLovin];
    [TDAnalytics track:@"appLovin_sdk_ad_revenue" properties:adInfo];
}
```

---

# Multiple Instances

### I. Multiple Instance Feature Introduction

In iOS SDK 1.2.0 version, multiple APPID feature was added. You can create multiple SDK instances, each corresponding to their own APPID for data reporting, which means you can report data to multiple APPIDs.

In iOS SDK 2.1.0 version, lightweight instance feature was added. You can generate multiple child lightweight instances for the same APPID. Child lightweight instance and parent instance have the same APPID, but account information etc. are different.

If you upgrade old version (before 1.2.0) SDK to version after 1.2.0, and old version SDK local cache still has unreported data, it will be directly reported to the first instantiated APPID. **For users who only use one APPID instance, data will not be affected.**

### II. How to Create Multiple SDK Instances

This section introduces SDK multiple instance usage:

```
[TDAnalytics enableLog:**YES**];

NSString *appId_1 = @"appId_1";
NSString *receiverUrl_1 = @"https://receiver-ta-preview.thinkingdata.cn";
[TDAnalytics startAnalyticsWithAppId:appId_1 serverUrl:receiverUrl_1];

NSString *appId_2 = @"appId_2";
NSString *receiverUrl_2 = @"https://receiver-ta-preview.thinkingdata.cn";
[TDAnalytics startAnalyticsWithAppId:appId_2 serverUrl:receiverUrl_2];

[TDAnalytics calibrateTimeWithNtp:@"time.apple.com"];

[TDAnalytics login:@"TD" withAppId:appId_1];
[TDAnalytics login:@"TD" withAppId:appId_2];

[TDAnalytics setDistinctId:@"Thinker" withAppId:appId_2];

// Set static common properties
[TDAnalytics setSuperProperties:@{@"channel": @"ta",} withAppId:appId_1];
[TDAnalytics setSuperProperties:@{@"channel": @"ta",} withAppId:appId_2];
[TDAnalytics unsetSuperProperty:@"isTest" withAppId:appId_1];
[TDAnalytics clearSuperPropertiesWithAppId:appId_1];
[TDAnalytics getSuperPropertiesWithAppId:appId_1];
[TDAnalytics setDynamicSuperProperties:^NSDictionary * **_Nonnull**{
    **return** @{@"now": [NSDate date]};
} withAppId:appId_1];

// Enable auto tracking
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAppInstall | TDAutoTrackEventTypeAppStart | TDAutoTrackEventTypeAppEnd withAppId:appId_1];
// Ignore auto tracking events for a certain page
[TDAnalytics ignoreAutoTrackViewControllers:@[] withAppId:appId_1];
[TDAnalytics setAutoTrackProperties:TDAutoTrackEventTypeAll properties:@{@"auto_key2": @"auto_value2"} withAppId:appId_1];

// Report normal event
[TDAnalytics track:@"product_buy" withAppId:appId_1];

// Report first-time event
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation" firstCheckID:@"TD"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel withAppId:appId_1];

// Report updatable event
TDUpdateEventModel *updateModel = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:updateModel withAppId:appId_1];

// Report overwritable event
TDOverwriteEventModel *overwriteModel = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:overwriteModel withAppId:appId_1];

// The following example completes statistics of user stay duration on a product page
[TDAnalytics timeEvent:@"stay_shop" withAppId:appId_1];
/*
 do someting .......
 */
// User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
[TDAnalytics track:@"stay_shop" withAppId:appId_1];

// Logout
[TDAnalytics logoutWithAppId:appId_1];

// User properties
[TDAnalytics userSet:@{@"username": @"ThinkingData"} withAppId:appId_2];
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-01-01 01:23:45.678"} withAppId:appId_1];
[TDAnalytics userAdd:@{@"total_revenue": @30} withAppId:appId_1];
[TDAnalytics userUnset:@"key" withAppId:appId_1];
[TDAnalytics userDeleteWithAppId:appId_1];
[TDAnalytics userAppend:@{@"user_list": @[@"apple", @"ball"]} withAppId:appId_1];
[TDAnalytics userUniqAppend:@{@"user_list":@[@"apple", @"cube"]} withAppId:appId_1];

// Integrate H5 page data
[TDAnalytics addWebViewUserAgent];

// Get device ID
[TDAnalytics getDeviceId];

[TDAnalytics flushWithAppId:appId_1];

// Third-party data integration
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer withAppId:appId_1];
```

Please note that multiple SDK instances' APPID must be different. Most data between multiple instances is not shared. For details, please refer to Section IV "Multiple Instance Data and Settings Sharing".

### III. Create Lightweight Instance

In iOS SDK 3.0.0 version, you can create multiple instances under the same APPID through lightweight instance method

```
// Original project
NSString *appId = @"appId";
NSString *receiverUrl = @"https://receiver-ta-preview.thinkingdata.cn";
[TDAnalytics startAnalyticsWithAppId:appId serverUrl:receiverUrl];

// Create lightweight instance through original project
NSString *lightProjectAppId = [TDAnalytics lightInstanceIdWithAppId:appId];

// Report event
[TDAnalytics track:@"event" withAppId:lightProjectAppId];

// User properties
[TDAnalytics userSet:@{@"age": 18} withAppId:lightProjectAppId];
```

Child lightweight instance and parent instance have the same APPID, reporting address and some settings, but other information is not shared. For details, please refer to Section IV "Multiple Instance Data and Settings Sharing".

### IV. Multiple Instance Data and Settings Sharing

Most interfaces are called by instance objects, so most data and settings are not shared between multiple APPID instances, parent instance and lightweight instance. But some data and settings will take effect for all instances. The following is detailed explanation of whether all data and settings are shared between multiple instances:

- Account related information
- System default generated visitor ID `#distinct_id`: Shared
- Visitor ID `#distinct_id` set by calling `setDistinctId`: Not shared
- Account ID `#account_id` set by calling `login`: Not shared
- Event reporting `track` and user property reporting `userSet`, `userSetOnce`, `userAdd`, `userDelete`: Not shared
- Common properties `setSuperProperties` and dynamic common properties `setDynamicSuperProperties`: Not shared
- SDK configuration information whether shared between multiple instances:
- Reporting strategy related (i.e. reporting interval time and data volume per batch): Shared, determined by the first instantiated APPID corresponding project data
- Upload network condition `setNetworkType`: Shared
- Auto tracking events
- Recommend enabling auto tracking events on only one instance
- Support reporting auto tracking events to multiple APP IDs
- Auto tracking event settings can take effect for single APPID instance only. For details, please refer to iOS SDK Auto Tracking Guide
- Record event duration `timeEvent`: Not shared

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in IDE console or using TE's Debug feature.

### I. Print SDK Logs

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics enableLog:**YES**];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.enableLog(**true**)
```

:::

::::

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingData related logs in IDE to observe SDK data reporting.

### II. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Client enables Debug mode
   The following is example code for client enabling Debug mode:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSString *appid = @"appId";
NSString *url = @"https://receiver-ta-preview.thinkingdata.cn";
TDConfig *config = [[TDConfig alloc] init];
config.appid = appid;
config.serverUrl = url;
/*
Set running mode to Debug mode
Normal mode: Data will be stored in cache and reported according to certain cache strategy. Default is normal mode. Recommended for production environment.
Debug mode: Data is reported one by one. When problems occur, will prompt user through logs and exceptions. Not recommended for production environment.
DebugOnly mode: Only validates data, will not store. Not recommended for production environment.
 */
config.mode = TDModeDebug;
[TDAnalytics startAnalyticsWithConfig:config];
```

:::

::: el-tab-pane label=Swift

```
let appid = "APPID";
let url = "SERVER_URL";
let config = TDConfig(appId: appid, serverUrl: url)
config.mode = TDMode.debug
TDAnalytics.start(with: config)
```

:::

::::

1. TE backend add Debug device
   To avoid Debug mode being launched in production environment, only specified devices can enable Debug mode. Only devices that have enabled Debug mode on client and device ID configured in TE backend's "Tracking Management" page's "Debug Data" section can enable Debug mode.

Device ID can be obtained through the following three ways:

- #device_id property in event data on TE platform
- Client log: SDK will print device DeviceId after initialization is complete
- Through instance interface call: Get device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and App stability. Only use for integration phase data validation. Do not use in production environment.

---

# Auto Tracking

### I. Auto Tracking Introduction

TE system provides automated data collection interface. You can choose the data to be automatically collected according to business requirements.

Currently supported automated data collection:

1. APP installation, records APP being installed
1. APP start, including opening APP and waking from background
1. APP close, including closing APP and entering background, also collects start duration
1. User browsing pages in APP (native pages)
1. User clicking controls in APP
1. APP crash information when APP crashes
   Next will introduce each data collection method in detail

### II. Enable Auto Tracking

You can call `enableAutoTrack:` to enable auto tracking feature:

```
[TDAnalytics enableAutoTrack:
TDAutoTrackEventTypeAppStart |// APP start event
TDAutoTrackEventTypeAppInstall |// APP install event
TDAutoTrackEventTypeAppEnd |// APP close event
TDAutoTrackEventTypeAppViewScreen |// APP browse page event
TDAutoTrackEventTypeAppClick |// APP click control event
TDAutoTrackEventTypeAppViewCrash];// APP crash event
```

### III. Auto Tracking Event Details

#### 3.1 APP Install Event

APP install event will record the actual installation of APP. It is reported when APP starts. Event trigger time is the first start time after APP installation. APP upgrade will not trigger install event, but reinstall after deletion will report install event.

- Event name: ta_app_install

#### 3.2 APP Start Event

APP start event will be triggered when user opens APP or wakes APP from background. Detailed event introduction:

- Event name: ta_app_start. Normal APP start process will trigger this event.
- Preset property: `#resume_from_background`, boolean type, indicates whether APP is user opened or woke from background. Value true means woke from background, false means directly opened.
- Event name: ta_app_bg_start. This event is triggered when APP starts in background. This event is not collected by default. Needs to enable configuration item during initialization:

```
TDConfig *config = [[TDConfig alloc] init];
config.appid = appId;
config.serverUrl = serverUrl;

// Allow collecting events in background
config.trackRelaunchedInBackgroundEvents = YES;

[TDAnalytics startAnalyticsWithConfig:config];
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAll];
```

#### 3.3 APP Close Event

APP close event will be triggered when user closes APP or puts APP to background. Detailed event introduction:

- Event name: ta_app_end
- Preset property: `#duration`, numeric type, indicates the duration of this APP visit (from start to end), unit is seconds.

#### 3.4 APP Browse Page Event

APP browse page event will trigger browse page event when user switches page (View Controller). Detailed event introduction:

- Event name: ta_app_view
- Preset properties:
- `#screen_name`, string type, is View Controller class name
- `#title`, string type, is View Controller title, value is `controller.navigationItem.title` property value
  You can add other properties to page browse event to extend its analysis value. The following is how to customize browse page event properties:

##### 3.4.1 Customize Page Browse Event Properties

For View Controller inherited from `UIViewController`, you can set properties and page URL information by implementing Protocol `<TDScreenAutoTracker>`. SDK will automatically add `getTrackProperties` return value to this View Controller's APP browse page event. Additionally, `getScreenUrl` return value will be used as this page's URL Schema. When this page's browse event is triggered, preset property `#url` will be added, value is current page's URL Schema. Meanwhile, SDK will get the URL Schema of the previous page. If it can be obtained, it will be added to preset property `#referrer` as the forward address.

```
@interface MYController : UITableViewController<TDScreenAutoTracker>
@end

@implementation MYController

// Set for all APPID instances

- (NSDictionary *)getTrackProperties {
    return @{@"PageName" : @"Product Detail Page", @"ProductId" : @12345};
}

- (NSString *)getScreenUrl {
    return @"APP://test";

/** Set separately for multiple APPID instances
 *  - (NSDictionary *)getTrackPropertiesWithAppid{
 *      return @{@"appid1" : @{@"testTrackProperties" : @"Test Page"},
 *               @"appid2" : @{@"testTrackProperties2" : @"Test Page 2"},
 *               };
 *  }
 *  -(NSDictionary *)getScreenUrlWithAppid {
 *      return @{@"appid1" : @"APP://test1",
 *               @"appid2" : @"APP://test2",
 *               };
 *  }
 */

}
@end
```

Related preset properties:

- `#url`, string type, indicates the URL of browsed page
- `#referrer`, string type, indicates the URL of the page before page jump

#### 3.5 APP Control Click Event

APP control click event will be triggered when user clicks control

- Event name: ta_app_click
- Preset properties:
- `#screen_name`, string type, is the class name of the View Controller where control is located
- `#element_content`, string type, is the content of control
- `#element_type`, string type, is the type of control
- `#element_position`, string type, only exists when control type is `UITableView` or `UICollectionView`, indicates the position where control is clicked, value is `Section Row`
  For click events on page View, there are multiple ways to set more properties to extend its analysis value:

##### 3.5.1 Set Control Element ID

You can set element ID for page elements (View) to distinguish elements with different meanings. You can use the following method to set element ID:

```
// Set for all APPID instances
self.table1.thinkingAnalyticsViewID = @"testtable1";

// Set separately for multiple APPID instances
self.table1.thinkingAnalyticsViewIDWithAppid = @{ @"app1" : @"testtableID2",
                        @"app2" : @"testtableID3" };
```

At this time, `table1` click event will add preset property `#element_id`, value is the passed value here

- Related preset property: `#element_id`, string type, indicates the custom ID of this element

##### 3.5.2 Customize Control Click Event Properties

For most controls, you can directly use `thinkingAnalyticsViewProperties` to set custom properties:

```
// Set for all APPID instances
self.table1.thinkingAnalyticsViewProperties = @{@"key1":@"value1"};

// Set separately for multiple APPID instances
self.table1.thinkingAnalyticsViewPropertiesWithAppid = @{@"app1":@{@"tablekey":@"tablevalue"},
    @"app2":@{@"tablekey2":@"tablevalue2"}
};
```

##### 3.5.3 `UITableView` and `UICollectionView` Control Click Event Properties

For `UITableView` and `UICollectionView`, you need to implement Protocol `<TDUIViewAutoTrackDelegate>` to set custom properties:

1. First implement Protocol `<TDUIViewAutoTrackDelegate>` in View Controller class

2. Then set delegate in the class. Recommend setting in `viewDidLoad` method

```
self.table1.thinkingAnalyticsDelegate = self;
```

- `table1` can be replaced with View that needs custom properties

3. Then implement method according to View Controller type

- This is the method `UITableView` needs to implement

```
// Set for all APPID instances, set UITableView custom properties
-(NSDictionary *) thinkingAnalytics_tableView:(UITableView *)tableView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath
{
    return @{@"testProperty":@"test"};
}

/** Set separately for multiple APPID instances
 * -(NSDictionary *) thinkingAnalyticsWithAppid_tableView:(UITableView *)tableView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath {
 *    return @{@"app1":@{@"autoPro":@"tablevalue"},
 *              @"app2":@{@"autoPro2":@"tablevalue2"}
 *            };
 * }
 */
```

- This is the method `UICollectionView` needs to implement

```
// Set for all APPID instances, set UICollectionView custom properties
-(NSDictionary *) thinkingAnalytics_collectionView:(UICollectionView *)collectionView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath;
{
    return @{@"testProperty":@"test"};
}

/** Set separately for multiple APPID instances
 * - (NSDictionary *)thinkingAnalyticsWithAppid_collectionView:(UICollectionView *)collectionView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath {
 *     return @{@"app1":@{@"autoProCOLL":@"tablevalueCOLL"},
 *              @"app2":@{@"autoProCOLL2":@"tablevalueCOLL2"}
 *              };
 * }
 */
```

4. Finally, set `thinkingAnalyticsDelegate` to `nil` in `viewWillDisappear` method in the class

```
-(void)viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    self.table1.thinkingAnalyticsDelegate = nil;
}
```

- `table1` can be replaced with View that needs custom properties, corresponding to when delegate is set

#### 3.6 APP Crash Event

When APP has uncaught exception, APP crash event will be reported

- Event name: ta_app_crash
- Preset properties:
- `#app_crashed_reason`, character type, records stack trace when crash occurs

### IV. Ignore Auto Tracking Events

You can ignore auto tracking events for certain pages or controls through the following ways

#### 4.1 Ignore Auto Tracking Events for a Certain Page

For certain pages (View Controller), if you don't want to transfer auto tracking events (including page browse and control click events), you can ignore through the following method:

```
NSMutableArray *array = [[NSMutableArray alloc] init];
[array addObject:@"IgnoredViewController"];

// Ignore auto tracking events for a certain page
[TDAnalytics ignoreAutoTrackViewControllers:array];
```

#### 4.2 Ignore Click Events for a Certain Type of Control

If you need to ignore click events for a certain type of control, you can ignore through the following method

```
// Ignore all controls of a certain type
[TDAnalytics ignoreViewType:[IgnoredClass class]];
```

- `ignoredClass` is the control type that needs to be ignored

#### 4.3 Ignore Click Events for a Certain Element (View)

If you want to ignore click events for a certain element (View), you can ignore through the following method

```
// Set for all APPID instances
self.table1.thinkingAnalyticsIgnoreView = YES;

// Set separately for multiple APPID instances
// self.table2.thinkingAnalyticsIgnoreViewWithAppid = @{@"appid1" : @YES,@"appid2" : @NO};
```

- `table1` can be replaced with View that needs to be ignored

### V. Auto Tracking Event Preset Properties

The following preset properties are unique preset properties in each auto tracking event

- APP Start Event (ta_app_start) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#resume_from_background

Whether resumed from background

Boolean

Indicates whether APP is opened or woke from background. Value true means woke from background, false means directly opened

#start_reason

Start reason

Text

Indicates APP start reason. Value is string type. Currently supports collecting deeplink, push, 3dtouch start reasons.

#background_duration

Background stay duration

Numeric

Unit is seconds

- APP Close Event (ta_app_end) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#duration

Event duration

Numeric

Indicates the duration of this APP visit (from start to end), unit is seconds

- APP Browse Page Event (ta_app_view) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#title

Page title

Text

Is View Controller title, value is `controller.navigationItem.title` property value

#screen_name

Page name

Text

Is View Controller class name

#url

Page address

Text

Current page address, needs to call `getScreenUrl` to set url

#referrer

Forward address

Text

The address of the page before page jump. The page before jump needs to call `getScreenUrl` to set url

- APP Control Click Event (ta_app_click) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#title

Page title

Text

Is View Controller title, value is `controller.navigationItem.title` property value

#screen_name

Page name

Text

Is View Controller class name

#element_id

Element ID

Text

Control ID, needs `thinkingAnalyticsViewID` to set

#element_type

Element type

Text

Control type

#element_selector

Element selector

Text

Is the concatenation of control's `viewPath`

#element_position

Element position

Text

Control position information. Only exists when control type is `UITableView` or `UICollectionView`. Indicates the position where control is clicked. Value is `Section:Row`

#element_content

Element content

Text

Content on control

- APP Crash Event (ta_app_crash) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#app_crashed_reason

Exception information

Text

Character type, records stack trace when crash occurs

### VI. Set Custom Properties for Auto Tracking Events

You can call `enableAutoTrack:properties:` to enable auto tracking feature and set custom properties

```
// Auto tracking custom properties
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAll properties:@{@"auto_key1": @"auto_value1"}];
```

You can also call `setAutoTrackProperties:properties:` to set or update custom properties

```
[TDAnalytics setAutoTrackProperties:TDAutoTrackEventTypeAll properties:@{@"auto_key2": @"auto_value2"}];
```

### VII. Auto Tracking Event Callback

From v2.7.4, auto tracking event callback is supported. You can call `enableAutoTrack:callback:` to enable auto tracking feature. You can add and update properties in callback.

```
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAll callback:^NSDictionary * **_Nonnull**(TDAutoTrackEventType eventType, NSDictionary * **_Nonnull** properties) {
    **if** (eventType == TDAutoTrackEventTypeAppStart) {
      **return** @{@"addkey":@"addvalue"};
    }
    **if** (eventType == TDAutoTrackEventTypeAppEnd) {
      **return** @{@"updatekey":@"updatevalue"};
    }
    **return** @{};
}];
```

<!-- unsupported block: 34 -->

Please do not perform time-consuming operations in this callback, otherwise it will affect normal data storage

---

# Preset Properties

### I. Preset Properties for All Events

The following preset properties are preset properties that all events in iOS SDK (including auto tracking events) will have

**Property Name**

**Chinese Name**

**Property Type**

**Collection Time**

**Description**

#ip

IP address

Text

Server collection

User's IP address. TE will use this to get user's geographic location information

#country

Country

Text

Server collection

User's country, generated based on IP address

#country_code

Country code

Text

Server collection

User's country code (ISO 3166-1 alpha-2, i.e. two uppercase English letters), generated based on IP address

#province

Province

Text

Server collection

User's province, generated based on IP address

#city

City

Text

Server collection

User's city, generated based on IP address

#os_version

Operating system version

Text

Collected once at initialization

Displays operating system version number: 15.6.1

#manufacturer

Device manufacturer

Text

Collected once at initialization

User device's manufacturer, such as Apple

#os

Operating system

Text

Collected once at initialization

Such as iOS etc.

#device_id

Device ID

Text

Collected once at initialization

User's device ID. iOS takes user's IDFV or UUID

#device_type

Device type

Text

Collected once at initialization

Device type, such as iPhone, iPad

#screen_height

Screen height

Numeric

Collected once at initialization

User device's screen height, such as 667 etc.

#screen_width

Screen width

Numeric

Collected once at initialization

User device's screen height, such as 375 etc.

#device_model

Device model

Text

Collected once at initialization

User device's model, such as iPhone12,8 etc.

#app_version

APP version

Text

Collected once at initialization

Your APP's version

#bundle_id

Application unique identifier

Text

Collected once at initialization

Application package name

#lib

SDK type

Text

Collected when event occurs

SDK type you integrated, such as Android, iOS etc.

#lib_version

SDK version

Text

Collected when event occurs

SDK version you integrated

#network_type

Network status

Text

Collected once at initialization, collected when network status changes

Network status when uploading event, such as WIFI, 3G, 4G etc.

#carrier

Network carrier

Text

Collected once at initialization

User device's network carrier, such as China Mobile, China Telecom etc. In iOS 16.4 and later system versions, this field will not be collected

#zone_offset

Timezone offset

Numeric

Collected when event occurs

Data time offset hours relative to UTC time

#install_time

Program installation time

Time

Collected once at initialization

User's application installation time, value comes from system

#simulator

Whether is simulator

Numeric

Collected once at initialization

Whether device is simulator true/false

#ram

Device running memory status

Text

Collected when event occurs

User device's current remaining memory and total memory, unit GB, such as 1.4/2.4

#disk

Device storage space status

Text

Collected when event occurs

User device's current remaining storage space and total storage space, unit GB, such as 30/200

#fps

Device FPS

Numeric

Collected when event occurs

User device's current image frames per second, such as 60. (SDK after v3.2.0 does not collect this field by default)

#system_language

System language

Text

Collected when event occurs

User device's system language (ISO 639-1, i.e. two lowercase English letters), such as zh, en etc.

#relaunched_in_background

Whether app is in background

Numeric

Collected when event occurs

When APP starts in background, this property in collected events is YES.

When APP starts normally, collected events do not contain this property.

### II. Auto Tracking Event Preset Properties

The following preset properties are unique preset properties in each auto tracking event

- APP Start Event (ta_app_start) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#resume_from_background

Whether resumed from background

Boolean

Indicates whether APP is opened or woke from background. Value true means woke from background, false means directly opened

#start_reason

Application start source

Text

Indicates APP start reason. Content is JSON string. Currently supports collecting deeplink, push, 3dtouch start reasons. Data example reference {url:"thinkingdata://","data":{}}

#backgroud_duration

Background stay duration

Numeric

Records the duration that application stays in background during the interval between two start events, unit is seconds

- APP Close Event (ta_app_end) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#duration

Event duration

Numeric

Indicates the duration of this APP visit (from start to end), unit is seconds

- APP Browse Page Event (ta_app_view) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#title

Page title

Text

Is View Controller title, value is `controller.navigationItem.title` property value

#screen_name

Page name

Text

Is View Controller class name

#url

Page address

Text

Current page address, needs to call `getScreenUrl` to set url

#referrer

Forward address

Text

The address of the page before page jump. The page before jump needs to call `getScreenUrl` to set url

- APP Control Click Event (ta_app_click) Preset Properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#title

Page title

Text

Is View Controller title, value is `controller.navigationItem.title` property value

#screen_name

Page name

Text

Is View Controller class name

#element_id

Element ID

Text

Control ID, needs `thinkingAnalyticsViewID` to set

#element_type

Element type

Text

Control type

#element_selector

Element selector

Text

Is the concatenation of control's `viewPath`

#element_position

Element position

Control position information. Only exists when control type is `UITableView` or `UICollectionView`. Indicates the position where control is clicked. Value is `Section Row`

#element_content

Element content

Text

Content on control

- APP Crash Event (ta_app_crash) Preset Properties
  **Property Name**

**Chinese Name**

Property Type

**Description**

#app_crashed_reason

Exception information

Text

Character type, records stack trace when crash occurs

### III. Other Preset Properties

Besides the above mentioned preset properties, some preset properties need to call corresponding interfaces to be recorded:

**Property Name**

**Chinese Name**

Property Type

**Description**

#duration

Event duration

Numeric

Need to call timing function interface `timeEvent`, records event occurrence duration, unit is seconds

#background_duration

Background stay duration

Numeric

Need to call timing function interface `timeEvent`, records the duration that application stays in background during event occurrence interval, unit is seconds

### IV. Get Preset Properties

v2.7.0 and later versions can call `getPresetProperties` method to get preset properties.

When server-side tracking needs some preset properties from App side, you can get App side's preset properties through this method and pass to server side.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Get property object
TDPresetProperties *presetProperties = [TDAnalytics getPresetProperties];

// Generate event preset properties
NSDictionary *properties = [presetProperties toEventPresetProperties];
/*
   {
        "#carrier": "China Telecom",
        "#os": "iOS",
        "#device_id": "A8B1C00B-A6AC-4856-8538-0FBC642C1BAD",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
        "#manufacturer": "Apple",
        "#device_model": "iPhone7",
        "#screen_width": 1080,
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8,
    }
*/

// Get a certain preset property
NSString *bundle_id = presetProperties.bundle_id;// Package name
NSString *os = presetProperties.os;// os type, such as iOS
NSString *system_language = presetProperties.system_language;// Phone system language type
NSNumber *screen_width = presetProperties.screen_width;// Screen width
NSNumber *screen_height = presetProperties.screen_height;// Screen height
NSString *device_model = presetProperties.device_model;// Device model
NSString *device_id = presetProperties.device_id;// Device unique identifier
NSString *carrier = presetProperties.carrier;// Phone SIM card carrier information. For dual SIM dual standby, takes main card's carrier information
NSString *manufacture = presetProperties.manufacturer;// Phone manufacturer such as Apple
NSString *network_type = presetProperties.network_type;// Network type
NSString *os_version = presetProperties.os_version;// System version number
NSNumber *zone_offset = presetProperties.zone_offset;// Timezone offset
```

:::

::: el-tab-pane label=Swift

```
let presetProperties = TDAnalytics.getPresetProperties();

// Generate event preset properties
let properties = presetProperties.toEventPresetProperties();

// Get a certain preset property
let bundle_id = presetProperties.bundle_id;// Package name
let os = presetProperties.os;// os type, such as iOS
let system_language = presetProperties.system_language;// Phone system language type
let screen_width = presetProperties.screen_width;// Screen width
let screen_height = presetProperties.screen_height;// Screen height
let device_model = presetProperties.device_model;// Device model
let device_id = presetProperties.device_id;// Device unique identifier
let carrier = presetProperties.carrier;// Phone SIM card carrier information. For dual SIM dual standby, takes main card's carrier information
let manufacture = presetProperties.manufacturer;// Phone manufacturer such as Apple
let network_type = presetProperties.network_type;// Network type
let os_version = presetProperties.os_version;// System version number
let zone_offset = presetProperties.zone_offset;// Timezone offset value
```

:::

::::

<!-- unsupported block: 34 -->

IP, country city information is parsed and generated by server side. Client does not provide interface to get these properties

### V. Disable Preset Property Collection

In certain scenarios, out of compliance or actual business needs considerations, you may want to disable collection of certain preset properties. You can add **TDDisPresetProperties** field in the project's info.plist file. Type is Array. Added field's corresponding preset properties will not be uploaded. For example, blocking "#fps", @"#ram", @"#disk", @"#start_reason", @"#simulator" etc. preset properties. Configuration as shown in the figure:

<!-- unsupported block: 34 -->

If you block device ID and need to use first-time event, please be sure to fill in first_check_id property
