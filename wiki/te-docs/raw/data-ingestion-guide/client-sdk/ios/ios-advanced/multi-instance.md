---
code: ios_sdk_multi_instance
name: "Multi-Instance"
wikiToken: KBL1wNb45iIA0KkdHEmcYPXSnBc
parentWikiToken: N4t8wyPNKip6pSkZsZvcYBpMnRc
updateTime: 1774251967000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ios_sdk_multi_instance
---

## **1. Introduction of Multi-instance**
The Multi-Appid feature could create multiple SDK instances to perform data tracking based on their own Appid. That is, you can report data to multiple Appids. 
In the iOS SDK version 2.1.0, a new Light-instance feature is added, which can support the generate of multiple sub-light instances of the same Appid. The Light-instance is consistent with the Appid of the parent instance, but the account number and other information are inconsistent.

## **2. How to Create Multiple ****SDK**** Instances**
Since 1.2.0 , Multiple SDK instances can be created by uploading different APP IDs to complete SDK initialization
```objectivec
[TDAnalytics enableLog:YES];

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

// super property
[TDAnalytics setSuperProperties:@{@"channel": @"ta",} withAppId:appId_1];
[TDAnalytics setSuperProperties:@{@"channel": @"ta",} withAppId:appId_2];
[TDAnalytics unsetSuperProperty:@"isTest" withAppId:appId_1];
[TDAnalytics clearSuperPropertiesWithAppId:appId_1];
[TDAnalytics getSuperPropertiesWithAppId:appId_1];
[TDAnalytics setDynamicSuperProperties:^NSDictionary * _Nonnull{
    return @{@"now": [NSDate date]};
} withAppId:appId_1];

// auto track
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAppInstall | TDAutoTrackEventTypeAppStart | TDAutoTrackEventTypeAppEnd withAppId:appId_1];
[TDAnalytics setAutoTrackProperties:TDAutoTrackEventTypeAll properties:@{@"auto_key2": @"auto_value2"} withAppId:appId_1];

// track
[TDAnalytics track:@"product_buy" withAppId:appId_1];

// track first
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation" firstCheckID:@"TD"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel withAppId:appId_1];

// track update
TDUpdateEventModel *updateModel = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:updateModel withAppId:appId_1];

// track overwrite
TDOverwriteEventModel *overwriteModel = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:overwriteModel withAppId:appId_1];

// time event
[TDAnalytics timeEvent:@"stay_shop" withAppId:appId_1];
/*
 do someting .......
 */
// track time event
[TDAnalytics track:@"stay_shop" withAppId:appId_1];

// logout
[TDAnalytics logoutWithAppId:appId_1];

// user set
[TDAnalytics userSet:@{@"username": @"ThinkingData"} withAppId:appId_2];

// user set once
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-01-01 01:23:45.678"} withAppId:appId_1];

// user add
[TDAnalytics userAdd:@{@"total_revenue": @30} withAppId:appId_1];

// user unset
[TDAnalytics userUnset:@"key" withAppId:appId_1];

// user delete
[TDAnalytics userDeleteWithAppId:appId_1];

// user append
[TDAnalytics userAppend:@{@"user_list": @[@"apple", @"ball"]} withAppId:appId_1];

// user uniqe append
[TDAnalytics userUniqAppend:@{@"user_list":@[@"apple", @"cube"]} withAppId:appId_1];

// flush event
[TDAnalytics flushWithAppId:appId_1];

// third party data
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer withAppId:appId_1];
```

It should be noted that the Appid of multiple SDK instances must be different. Most data between multiple instances is not the same. For detailed information, please refer to section "Data and Setting Sharing between Multiple Instances".
## **3. Create a Light-instance**
From 3.0.0 , you can create multiple instances under the same Appid by creating light-instance
```objectivec
// original project
NSString *appId = @"appId";
NSString *receiverUrl = @"https://receiver-ta-preview.thinkingdata.cn";
[TDAnalytics startAnalyticsWithAppId:appId serverUrl:receiverUrl];

// create light project id with original project
NSString *lightProjectAppId = [TDAnalytics lightInstanceIdWithAppId:appId];
    
// track ...
[TDAnalytics track:@"event" withAppId:lightProjectAppId];
    
// user profile ....
[TDAnalytics userSet:@{@"age": 18} withAppId:lightProjectAppId];
```

The Appid, receiver URL, and some settings of sub-light instances are the same as that of the parent instances, without sharing the other information. For detailed information, please refer to section 4 "Data and settings Sharing among Multiple Instances".

## **4. Data and Setting Sharing among Multiple Instances**
Since most API are called by instance objects, a majority of data and settings are not shared between Multi-appid instances, Parent-instances, and Light-instances. However, some data and settings will become valid for all instances. The detailed description of whether all data and settings are shared among multiple instances is as follows
1. Account information
- The distinct ID `#distinct_id` generated by the system by default: shared
- The distinct ID `#distinct_id` set by calling identify: not shared 
- The distinct ID `#account_id` set by calling `login`: not shared
2. Event tracking `track` and user property track `userSet`, `userSetOnce`, `userAdd`, `userDelete` : not shared
3. Super property `setSuperProperties` and dynamic super property set `setDynamicSuperProperties`: not shared
4. Whether SDK configuration information is shared among multiple instances:
- Tracking policy related (i.e. the time interval of data tracking and the volume of each batch of data): shared, decided by the project data corresponding to the first instantiated Appid
- Upload network condition `setNetworkType`: shared
- Print uploaded data Log `EnableLog`: shared
5. Auto-tracking event
  -  It is suggested that Auto-Tracking be enabled on only one instance
  - Support reporting auto-tracking events to multiple APP IDs
  - The setting of auto-tracking events can only be worked for a single APPID instance, please refer to [Automatic Event Tracking](https://thinkingdata.feishu.cn/wiki/IqwOwQmTbiVNXZk8r4JcmZAMnie)
6. Record event duration `timeEvent`: not shared
