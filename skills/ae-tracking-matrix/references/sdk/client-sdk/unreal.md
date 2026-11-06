---
code: unreal_sdk_installation
name: "Unreal"
wikiToken: WzIhwbKmkiwbUDkYZ4hcySdrnrg
parentWikiToken: BAU2w0eipiqGnckeUsIc0mYQnZc
updateTime: 1760166643000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=unreal_sdk_installation
---

# Unreal

::: tip Tip

Before integration, please read the Pre-Integration Guide first.

TDAnalytics implements Unreal Engine's built-in Analytics service and also supports direct data reporting via C++ code. Currently supports Android, iOS, Windows and macOS platforms. Supports Unreal Engine 4.26+ and 5.+ versions.

:::

**Latest Version:** v3.0.3

**Update Time:** 2025-10-11

**Resource Download:** Source code, SDK download

::: warning Note

This document applies to v2.0.0 and later versions. For historical versions, please refer to Unreal Integration Guide (V1), SDK Download (v1.6.0)

:::

### 1. SDK Integration

#### 1.1 Integrate TDAnalytics Plugin

Download the Unreal SDK, unzip it and place `TDAnalytics` in your project's `Plugins` directory; if the `Plugins` directory does not exist, first create a `Plugins` directory in the project root directory, then place the `TDAnalytics` directory inside it.

#### 1.2 Enable TDAnalytics Plugin

To enable the TDAnalytics plugin, you need to perform the following steps:

- Restart Unreal Editor
- Open Edit > Plugins, enable `TDAnalytics` under the project `Analytics` category
- If you use Blueprint, please enable `Analytics Blueprint Library` under the built-in `Analytics` category
- Restart Unreal Editor again
- Open Edit > Project Settings, set TDAnalytics parameters under the plugin category:
- Server Url: Required. Receiver address, must use https type address
- App ID: Required. Your project's APP ID, can be viewed in TE backend project management page
- TimeZone: Optional, if you need to align timezone, please fill in a standard TimeZone ID, such as "UTC01:00". No need to fill in if timezone alignment is not needed
- Enable Encrypt: Whether to enable data encryption, default false, when enabled data will be encrypted before uploading to TE
- EncryptPublicKey: Optional, if not filled will use default configuration, encryption public key
- EncryptVersion: Optional, if not filled will use default configuration, key version
- SymmetricEncryption: Optional, if not filled will use default configuration, symmetric key
- AsymmetricEncryption: Optional, if not filled will use default configuration, asymmetric key

Note: Windows/MacOS does not support timezone alignment temporarily.

- Add the following content in `DefaultEngine.ini` file under `Config` directory:

```
[Analytics]
ProviderModuleName=TDAnalytics
```

- If you want to use `TDAnalytics` interface directly in C++ code, you need to add the following content in your project's `*.Build.cs` file:

```
PrivateDependencyModuleNames.AddRange(new string[] { "TDAnalytics" });
PrivateIncludePathModuleNames.AddRange(new string[] { "TDAnalytics" });
```

And, in the file where you want to use SDK, include the `TDAnalytics.h` header file:

```
#include "TDAnalytics.h"
```

### 2. Initialization

Here is the SDK initialization example code:

```
// Initialize SDK
UTDAnalytics::Initialize();
```

After initialization is complete, you can use SDK to report events.

### 3. Common Features

Before using common features, we recommend you understand user identification rules first; SDK will generate a random number as visitor ID by default, and persist visitor ID locally; before user logs in, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user reinstalls App or changes device.

#### 3.1 Set Account ID

When user logs in, you can call `Login` to set user's account ID, TE platform will use account ID as identity identification ID, and the set account ID will be retained until `Logout` is called. Calling `Login` multiple times will overwrite the previous account ID.

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
UTDAnalytics::Login("TA");
```

`Login` can be called multiple times, each call will check whether the passed account ID is consistent with the previously saved ID, if consistent the call will be ignored, if inconsistent it will overwrite the previous ID.

**This method will not upload login event**

#### 3.2 Set Public Event Properties

Public event properties are properties that every event will have, you can call `SetSuperProperties` to set public event properties, we recommend you set public event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event, you can set these properties as public event properties.

```
    TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
    Properties->SetStringField("channel", "ta");//String
    Properties->SetNumberField("age", 1);//Number
    Properties->SetBoolField("isSuccess", true);//Boolean
    FDateTime DateTime = FDateTime::Now();
    Properties->SetStringField("birthday", FDateTime::FromUnixTimestamp(DateTime.ToUnixTimestamp()).ToString(TEXT("%Y-%m-%d %H:%M:%S.")) += *FString::Printf(TEXT("%03d"), DateTime.GetMillisecond()));//Time

    TSharedPtr<FJsonObject> ItemProperties = MakeShareable(new FJsonObject);
    ItemProperties->SetStringField("itemChannel", "item");
    Properties->SetObjectField("object", ItemProperties);//Object

    TArray< TSharedPtr<FJsonValue> > DataObjectArray;
    TSharedPtr<FJsonObject> ArrayItemProperties = MakeShareable(new FJsonObject);
    ArrayItemProperties->SetStringField("arrayItemChannel", "array_item");
    TSharedPtr<FJsonValueObject> DataObjectValue = MakeShareable(new FJsonValueObject(ArrayItemProperties));
    DataObjectArray.Add(DataObjectValue);
    Properties->SetArrayField("object_arr", DataObjectArray);//Object array

    TArray< TSharedPtr<FJsonValue> > DataArray;
    TSharedPtr<FJsonValueString> DataValue = MakeShareable(new FJsonValueString("data_value"));
    DataArray.Add(DataValue);
    Properties->SetArrayField("arr", DataArray);//Array

    UTDAnalytics::SetSuperProperties(Properties, AppID);
```

- Key is the property name, string type, must start with letter, contain numbers, letters and underscore "\_", maximum length 50 characters, case insensitive, TE will convert to lowercase uniformly
- Value is the property value, supports string, number, boolean, time, object, object array, array

**Event properties and user property requirements are consistent with public event properties**

#### 3.3 Enable Auto-tracking

The following code example enables install, start, and end events (PC platform does not support auto-tracking), if you want to understand SDK's auto-tracking capabilities in detail, you can view Auto-tracking Feature Detailed Introduction

```
// Enable auto-tracking
UTDAnalytics::EnableAutoTrack();
```

#### 3.4 Send Event

You can call `Track` to upload events, we recommend you set event properties and conditions for sending information according to the previously prepared tracking document, here we use user purchasing a product as an example:

```
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("product_name", "Product Name");//String
// Report an event without properties
UTDAnalytics::Track("product_buy", Properties);
```

Event name is string type, must start with letter, can contain numbers, letters and underscore "\_", maximum length 50 characters.

#### 3.5 Set User Properties

For general user properties, you can call `UserSet` to set them, properties uploaded using this interface will overwrite existing property values, if the user property did not exist before, it will create a new user property with the same type as the passed property type, here we use setting username as an example.

```
 //At this time "username" is "TA"
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("username", "TA");//String
UTDAnalytics::UserSet(Properties);
//At this time "userName" is "TE"
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetStringField("username", "TE");//String
UTDAnalytics::UserSet(NewProperties);
```

### 4. Best Practices

The following example code includes all the above operations, we recommend using the following steps:

```
#include "TDAnalytics.h"
if (Privacy Policy Authorized) {
   //Initialize SDK
   UTDAnalytics::Initialize();
   // Enable auto-tracking events
   UTDAnalytics::EnableAutoTrack();
   //If user has logged in, can set user's account ID as unique identity identifier
   UTDAnalytics::Login("TA");
   //Set public event properties
   TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
   Properties->SetStringField("channel", "ta");//String
   Properties->SetNumberField("age", 1);//Number
   Properties->SetBoolField("isSuccess", true);//Boolean
   FDateTime DateTime = FDateTime::Now();
   Properties->SetStringField("birthday", FDateTime::FromUnixTimestamp(DateTime.ToUnixTimestamp()).ToString(TEXT("%Y-%m-%d %H:%M:%S.")) += *FString::Printf(TEXT("%03d"), DateTime.GetMillisecond()));//Time

   TSharedPtr<FJsonObject> ItemProperties = MakeShareable(new FJsonObject);
   ItemProperties->SetStringField("itemChannel", "item");
   Properties->SetObjectField("object", ItemProperties);//Object

   TArray< TSharedPtr<FJsonValue> > DataObjectArray;
   TSharedPtr<FJsonObject> ArrayItemProperties = MakeShareable(new FJsonObject);
   ArrayItemProperties->SetStringField("arrayItemChannel", "array_item");
   TSharedPtr<FJsonValueObject> DataObjectValue = MakeShareable(new FJsonValueObject(ArrayItemProperties));
   DataObjectArray.Add(DataObjectValue);
   Properties->SetArrayField("object_arr", DataObjectArray);//Object array

   TArray< TSharedPtr<FJsonValue> > DataArray;
   TSharedPtr<FJsonValueString> DataValue = MakeShareable(new FJsonValueString("data_value"));
   DataArray.Add(DataValue);
   Properties->SetArrayField("arr", DataArray);//Array
   UTDAnalytics::SetSuperProperties(Properties, AppID);
   //Send event
   TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
   Properties->SetStringField("product_name", "Product Name");//String
   UTDAnalytics::Track("product_buy", Properties);
   //Set user properties
   TSharedPtr<FJsonObject> UserProperties = MakeShareable(new FJsonObject);
   UserProperties->SetStringField("username", "TA");//String
   UTDAnalytics::UserSet(Proper);
}
```

---

# Advanced Guide

### 1. Set User ID

SDK instance will use random UUID as default visitor ID for each user by default, this ID will be used as identity identification ID for user in unlogged state. Note that visitor ID will change when user reinstalls App or changes device.

#### 1.1 Set Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please make sure you understand user identification rules before setting visitor ID.

If you need to replace visitor ID, you should call it immediately after SDK initialization ends, do not call multiple times to avoid creating useless accounts.

:::

If your game has its own visitor ID management system, you can call `SetDistinctId` to set visitor ID:

```
// Set visitor ID to Thinker
UTDAnalytics::SetDistinctId("Thinker");
```

If you need to get visitor ID, you can call `GetDistinctId` to get:

```
FString distinctId = UTDAnalytics::GetDistinctId();
```

#### 1.2 Set Account ID

When user logs in, you can call `Login` to set user's account ID, TE platform will use account ID as identity identification ID, and the set account ID will be retained until `Logout` is called. Calling `Login` multiple times will overwrite the previous account ID.

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
UTDAnalytics::Login("TA");
```

**This method will not upload login event**

#### 1.3 Clear Account ID

After user logs out, you can call `Logout` to clear account ID, before calling `Login` next time, visitor ID will be used as identity identification ID.

```
UTDAnalytics::Logout();
```

We recommend you call `Logout` when there is an explicit logout event, such as when user performs account cancellation action, rather than calling it when closing the game.

**This method will not upload logout event**

### 2. Send Event

After SDK initialization is complete, you can perform data tracking and collect user behavior information. Generally, normal events can meet business scenario requirements, you can also use first, updatable and other events according to your actual business scenarios.

#### 2.1 Normal Event

You can call `track` to upload events, we recommend you set event properties and conditions for sending events according to the previously prepared document, here we use user purchasing a product as an example:

```
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("product_name", "Product Name");
UTDAnalytics::Track("product_buy",Properties);
```

#### 2.2 First Event

First event refers to events that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record the first event that occurs on a certain device, then you can use first event to report data.

```
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("key", "value");
UTDAnalytics::TrackFirst("device_activation",Properties);
```

If you want to determine whether it's the first time based on dimensions other than device, you can customize first_check_id for first event:

```
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("key", "value");
UTDAnalytics::TrackFirstWithId("account_activation", Properties,"TA");
```

Note: Since the verification of whether it's the first time is completed on the server side, first event will be delayed by 1 hour before entering the database by default.

#### 2.3 Updatable Event

You can use updatable event to achieve the requirement of modifying event data in specific scenarios. Updatable event needs to specify the ID that identifies the event and pass it when creating the updatable event object. TE backend will determine the data that needs to be updated based on event name and event ID.

```
// Example: Report an updatable event, assume event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetNumberField("status",3);
Properties->SetNumberField("price",100);
UTDAnalytics::TrackUpdate("UPDATABLE_EVENT", Properties,"test_event_id");

// After reporting, event property status is 5, price is 100
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetNumberField("status",5);
UTDAnalytics::TrackUpdate("UPDATABLE_EVENT",NewProperties,"test_event_id");
```

#### 2.4 Overwritable Event

Overwritable event is similar to updatable event, the difference is that overwritable event will completely overwrite historical data with the latest data, from the effect it's equivalent to deleting the previous data and storing the latest data in the database. TE backend will determine the data that needs to be updated based on event name and event ID.

```
// Example: Report an overwritable event, assume event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetNumberField("status",3);
Properties->SetNumberField("price",100);
UTDAnalytics::TrackOverwrite("OVERWRITE_EVENT", Properties,"test_event_id");

// After reporting, event property status is 5, price property is deleted
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetNumberField("status",5);
UTDAnalytics::TrackOverwrite("OVERWRITE_EVENT",NewProperties,"test_event_id")
```

#### 2.5 Public Event Properties

Public event properties are properties that every event will upload. Based on property update frequency, public event properties are divided into `static public event properties` and `dynamic public event properties`. You can choose different public event property setting methods according to specific business scenario requirements; we recommend you set public event properties before sending events. For the same event, when public event property, event custom property, and preset property have the same Key, we will assign values according to the following priority: `Custom Property > Dynamic Public Event Property > Static Public Event Property > Preset Property`.

##### 2.5.1 Static Public Event Properties

Static public event properties are low-frequency changing properties that every event will have, such as user membership level. After setting static public event properties through `SetSuperProperties`, SDK will get the set public event properties as event properties when collecting events.

```
TSharedPtr<FJsonObject> SuperProperties = MakeShareable(new FJsonObject);
SuperProperties->SetNumberField("vip_level",2);
UTDAnalytics::SetSuperProperties(SuperProperties);
```

Static public event properties will be saved to cache, no need to call every time when starting App. If the property already exists, the newly set property will overwrite the original property value; if the property did not exist before, it will create a new property. Besides property setting, we also provide other APIs to operate static public event properties to meet daily business needs.

```
//Get all public event properties
TSharedPtr<FJsonObject> SuperProperties = UTDAnalytics::GetSuperProperties();
```

##### 2.5.2 Set Dynamic Public Properties

Dynamic public event properties are high-frequency changing properties that every event will have, such as user's gold coin count. After setting dynamic public property class through `SetDynamicSuperPropertiesTracker`, SDK will automatically get dynamic public event properties when collecting events and add them to triggered events.

```
// Define dynamic public property function
static FString TDReturnDyldParams() {
    return "{\"dyld_property1\":\"value1\",\"dyld_property2\":\"value2\"}";
}
// Set dynamic public properties
void UMyDemoWidget::callSetDynamicSuperPropertiesFunction(){
    // Before V1.5.0
    UTDAnalytics::dynamicPropertiesMap.insert(pair<FString,FString(*)(void)>("insert your appid" ,&TDReturnDyldParams));
    // From V1.5.0
    UTDAnalytics::SetDynamicSuperProperties(this, &UMyDemoWidget::TDReturnDyldParams, "your appid");
}
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to configure the event name you want to time and start timing, when you upload that event, it will automatically add `#duration` property in your event properties to represent the recorded duration, unit is seconds. Note that the same event name can only have one timing task.

```
//The following example completes the statistics of user's stay duration on a product page
//User enters product page, start timing
UTDAnalytics::TimeEvent("stay_shop");
 /**do something
    .......
 **/
//User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
UTDAnalytics::Track("stay_shop", "");
```

Note: Windows/MacOS does not support recording event duration temporarily.

### 3. User Properties

TE platform supported user property setting APIs are: `UserSet`, `UserSetOnce`, `UserAdd`, `UserDelete`, `UserUnset`, `UserAppend`, `UserUniqueAppend`.

#### 3.1 UserSet

For general user properties, you can call `UserSet` to set them. Properties uploaded using this interface will overwrite existing property values, if the user property did not exist before, it will create a new user property with the same type as the passed property type, here we use setting username as an example:

```
//At this time username is TA
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("user_name", "TA");
UTDAnalytics::UserSet(Properties);
//At this time username is TE
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetStringField("user_name", "TE");
UTDAnalytics::UserSet(NewProperties);
```

#### 3.2 UserSetOnce

If the user property you want to upload only needs to be set once, you can call `UserSetOnce` to set it, when the property already has a value before, this message will be ignored, here we use setting first payment time as an example:

```
//first_payment_time is 2018-01-01 01:23:45.678
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("first_payment_time","2018-01-01 01:23:45.678");
UTDAnalytics::UserSetOnce(Properties);
//first_payment_time is still 2018-01-01 01:23:45.678
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetStringField("first_payment_time","2018-12-31 01:23:45.678");
UTDAnalytics::UserSetOnce(NewProperties);
```

#### 3.3 UserAdd

When you want to upload numeric properties, you can call `UserAdd` to accumulate the property, if the property hasn't been set yet, it will assign 0 before calculation, can pass negative value, equivalent to subtraction operation. Here we use cumulative payment amount as an example:

```
//At this time total_revenue is 30
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetNumberField("total_revenue",30);
UTDAnalytics::UserAdd(Properties);
//At this time total_revenue is 678
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetNumberField("total_revenue",648);
UTDAnalytics::UserAdd(NewProperties);
```

The property key is string, Value only allows numeric values.

#### 3.4 UserDelete

If you want to delete a user, you can call `UserDelete` to delete this user, you will no longer be able to query this user's user properties, but the events generated by this user can still be queried.

```
UTDAnalytics::UserDelete();
```

#### 3.5 UserUnset

If you need to reset a user's property, you can call `UserUnset` to delete the already set property.

```
UTDAnalytics::UserUnset("userPropertyName");
```

The input value of UserUnset is the Key value of the property being cleared.

#### 3.6 UserAppend

You can call UserAppend to append elements to List type user properties.

```
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
TArray< TSharedPtr<FJsonValue> > DataArray;
DataArray.Add(MakeShareable(new FJsonValueString("apple")));
DataArray.Add(MakeShareable(new FJsonValueString("ball")));
Properties->SetArrayField("user_list", DataArray);//Array
UTDAnalytics::UserAppend(Properties);
```

#### 3.7 UserUniqueAppend

You can call `UserUniqueAppend` to append elements to array type user properties. Calling `UserUniqueAppend` interface will deduplicate the appended user properties, `UserAppend` interface does not deduplicate, user properties can have duplicates.

```
//At this time user_list property value is ["apple", "ball"]
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
TArray< TSharedPtr<FJsonValue> > DataArray;
DataArray.Add(MakeShareable(new FJsonValueString("apple")));
DataArray.Add(MakeShareable(new FJsonValueString("ball")));
Properties->SetArrayField("user_list", DataArray);//Array
UTDAnalytics::UserAppend(Properties);

//At this time user_list property value is ["apple", "apple", "ball", "cube"]
TSharedPtr<FJsonObject> Properties1 = MakeShareable(new FJsonObject);
TArray< TSharedPtr<FJsonValue> > DataArray1;
DataArray1.Add(MakeShareable(new FJsonValueString("apple")));
DataArray1.Add(MakeShareable(new FJsonValueString("cube")));
Properties->SetArrayField("user_list", DataArray1);//Array
UTDAnalytics::UserAppend(Properties1);

//At this time user_list property value is ["apple", "ball", "cube"]
UTDAnalytics::UserUniqueAppend(Properties1);
```

### 4. Other Features

#### 4.1 Get Device ID

You can get device ID by calling `GetDeviceId`:

```
FString deviceId = UTDAnalytics::GetDeviceId();
```

#### 4.2 Calibrate Time

SDK will use local time as event occurrence time by default, if user manually modifies device time it will affect your business analysis, you can ensure the accuracy of event occurrence time through time calibration operation. We provide `timestamp` and `NTP` two time calibration methods.

- You can use the current timestamp obtained from server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use calibrated time as occurrence time.

```
// 1585633785954 is current unix timestamp, unit is milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
UTDAnalytics::CalibrateTime(1585633785954);
```

- You can also set NTP server address, after that SDK will try to get current time from passed NTP service address and calibrate SDK time. If correct return result is not obtained within default timeout (3 seconds), subsequent data will be reported using local time.

```
// Use Apple's NTP service to calibrate time
UTDAnalytics::CalibrateTimeWithNtp("time.apple.com");
```

1. Using NTP service for time calibration has certain uncertainty, we recommend you prioritize timestamp calibration method

2. You need to carefully choose your NTP server address to ensure user device can quickly get server time under good network conditions

#### 4.3 Flush Data Immediately

In some business scenarios, if you expect data to be reported to TE server immediately, you can call `Flush` interface to complete

```
UTDAnalytics::Flush();
```

---

# Third-party Data

From v1.5.0, third-party data integration feature is supported. Here is the example code for synchronizing data from multiple platforms:

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeIRONSOURCE"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRACKING"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRADPLUS"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

If you need to add custom parameters, you can use EnableThirdPartySharingWithCustomProperties:

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeIRONSOURCE"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRACKING"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRADPLUS"));

TSharedPtr<FJsonObject> m_DataJsonObject = MakeShareable(new FJsonObject);
m_DataJsonObject->SetStringField(TEXT("thirdkey1"), TEXT("thirdvalue1"));
m_DataJsonObject->SetStringField(TEXT("thirdkey2"), TEXT("thirdvalue2"));
UTDAnalytics::EnableThirdPartySharingWithCustomProperties(EventTypeList, m_DataJsonObject, AppID);
```

### 1. AppsFlyer

Call API before AppsFlyer SDK calls start method.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

After creating character (optional).

```
UTDAnalytics::Login("account_id", AppID);
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

If TE's Login method (will modify account_id) or Identify method (will modify distinct_id) is called, you need to call EnableThirdPartySharing again to synchronize data.

Note: If you also need to call AppsFlyer SDK's setAdditionalData method, you can pass parameters to TE through EnableThirdPartySharingWithCustomProperties, TE SDK will internally concatenate and merge the parameters.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
TSharedPtr<FJsonObject> m_DataJsonObject = MakeShareable(new FJsonObject);
m_DataJsonObject->SetStringField(TEXT("thirdkey1"), TEXT("thirdvalue1"));
m_DataJsonObject->SetStringField(TEXT("thirdkey2"), TEXT("thirdvalue2"));
UTDAnalytics::EnableThirdPartySharingWithCustomProperties(EventTypeList, m_DataJsonObject, AppID);
```

### 2. Adjust

Call before Adjust SDK initialization.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

After creating character (optional).

```
UTDAnalytics::Login("account_id", AppID);
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

### 3. Branch

Call before Branch initialize the session.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

After creating character (optional).

```
UTDAnalytics::Login("account_id", AppID);
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

### 4. TopOn

Call before ATSDK.\*init.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

Note: If you also need to call ATSDK's initCustomMap method, you can pass parameters to TE through EnableThirdPartySharingWithCustomProperties, TE SDK will internally concatenate and merge the parameters.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
TSharedPtr<FJsonObject> m_DataJsonObject = MakeShareable(new FJsonObject);
m_DataJsonObject->SetStringField(TEXT("thirdkey1"), TEXT("thirdvalue1"));
m_DataJsonObject->SetStringField(TEXT("thirdkey2"), TEXT("thirdvalue2"));
UTDAnalytics::EnableThirdPartySharingWithCustomProperties(EventTypeList, m_DataJsonObject, AppID);
```

### 5. TradPlus

Call before TradPlusSdk.\*initSdk.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRADPLUS"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

### 6. IronSource

Call after IronSourceSdk initialization.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeIRONSOURCE"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in IDE console or using TE's Debug feature.

#### 1. Print SDK Logs

Enable Log in TDAnalytics plugin

After enabling logs, you can filter TDAnalytics related logs in IDE to observe SDK data reporting.

#### 2. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Client enables Debug mode
   Set SDK MODE to Debug in TDAnalytics plugin.

- NORMAL mode: Data will be stored in cache and reported according to certain cache strategy, default is NORMAL mode; recommended for production environment
- Debug mode: Data is reported one by one. When problems occur, it will prompt users with logs and exceptions; not recommended for production environment
- DebugOnly mode: Only validates data, will not store in database; not recommended for production environment

2. TE backend adds Debug device
   To avoid Debug mode going live in production environment, it is specified that only designated devices can enable Debug mode. Only when client has enabled Debug mode and device ID is configured in TE backend's "Tracking Management" page's "Debug Data" section can Debug mode be enabled.

Device ID can be obtained through the following three ways:

- #device_id property in event data on TE platform
- Client log: SDK will print device DeviceId after initialization is complete
- Call through instance interface: Get Device ID

Debug mode may affect data collection quality and App stability, only use for integration phase data validation, do not use in production environment.

---

# Auto-tracking

### 1. Auto-tracking Events

TDAnalytics SDK currently supports three types of auto-tracking events:

- ta_app_install: Game install, this event will be collected when game is first opened after installation
- ta_app_start: Game enters foreground event
- ta_app_end: Game exits to background event
  You can enable auto-tracking by calling `EnableAutoTrack` interface:

```
// Enable auto-tracking
UTDAnalytics::EnableAutoTrack();
```

Note: If you need to customize visitor ID, please call Identify interface to set visitor ID before enabling auto-tracking feature.

You can also manually pass in auto-tracking events that need to be enabled:

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("ta_app_install"));
EventTypeList.Emplace(TEXT("ta_app_start"));
EventTypeList.Emplace(TEXT("ta_app_end"));
UTDAnalytics::EnableAutoTrackWithType(EventTypeList, AppID);
```

### 2. Set Custom Properties

From v1.4.1, custom properties can be set for auto-tracking events, when collecting specified events, custom properties will be merged into the event properties and reported.

```
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("ta_app_install"));
EventTypeList.Emplace(TEXT("ta_app_start"));
EventTypeList.Emplace(TEXT("ta_app_end"));
UTDAnalytics::EnableAutoTrackWithTypeAndProperties(EventTypeList, TEXT("{\"autoTrackKey1\":\"autoTrackvalue1\",\"autoTrackKey2\":\"autoTrackvalue2\"}"), AppID);
```

### 3. Set Auto-tracking Event Callback

From V1.5.0, callback method can be set for auto-tracking events, when collecting specified events, it will notify through this callback and return the current event properties carried, you can forward data or add new event properties as return according to needs.

```
//Define callback
FString UTAUserWidget::TAAutoTrackProperties(FString AutoTrackEventType, FString Properties)
{
    //AutoTrackEventType auto-tracking event type
    //Properties current event properties
    //Processing logic
    FDateTime TDateTime = FDateTime::Now();
    int64 SecondTimestamp = TDateTime.ToUnixTimestamp();
    int32 MillisecondPart = TDateTime.GetMillisecond();
    FString TimeStr = *FString::Printf(TEXT("%llu"), SecondTimestamp);
    TimeStr += *FString::Printf(TEXT("%lld"), MillisecondPart);
    return "{\"auto_property1_name\":\"" + AutoTrackEventType + "\",\"auto_property2_time\":\"" + TimeStr + "\"}";
}

//Set callback
void UTAUserWidget::Call_TA_SetAutoTrackEventListener()
{
    TArray<FString> EventTypeList;
    EventTypeList.Emplace(TEXT("ta_app_install"));
    EventTypeList.Emplace(TEXT("ta_app_start"));
    EventTypeList.Emplace(TEXT("ta_app_end"));
    UTDAnalytics::SetAutoTrackEventListener(this, &UTAUserWidget::TAAutoTrackProperties, EventTypeList, AppID);
}
```

---

# Preset Properties

#### 1. Preset Property Description

Preset properties collected by each platform will have certain differences, you can refer to the following documents: Android Platform, iOS Platform

**Non-Native Platform (PC) Preset Properties:**

**Property Name** | **Chinese Name** | **Property Type** | **Description**
#ip | IP Address | Text | User's IP address, TE will use this to get user's geographic location information
#country | Country | Text | User's country, generated based on IP address
#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e. two uppercase English letters), generated based on IP address
#province | Province | Text | User's province, generated based on IP address
#city | City | Text | User's city, generated based on IP address
#os_version | Operating System Version | Text | Such as windows10
#os | Operating System | Text | Such as MacOS, Windows, etc.
#device_id | Device ID | Text | User's device ID
#screen_height | Screen Height | Number | User device's screen height, such as 1920
#screen_width | Screen Width | Number | User device's screen height, such as 1080
#app_version | APP Version | Text | Your APP's version
#lib_version | SDK Version | Text | SDK version you integrated
#zone_offset | Timezone Offset | Number | Data time offset hours relative to UTC time
#system_language | Operating System Language | Text | Language set in user's system, such as zh
#install_time | Install Time | Time | User's app installation time
#fps | Frame Rate | Text | Current screen frame rate
#disk | Disk Status | Text | Current storage usage "remaining/total space"
#ram | Memory Status | Text | Current memory usage "remaining/total memory"

For versions 3.0.0 and later, the underlying layer uses C++ SDK, #install_time, #app_version, #os_version, #fps, #ram, #disk preset properties cannot be collected temporarily. If you need these preset properties, you can use versions before 3.0.0.

#### 2. Get Preset Properties

In v1.3.0 version, preset property interface is added, SDK will automatically add some built-in properties when reporting event properties, you can get preset properties through this interface.

```
FString PresetProperties = UTDAnalytics::GetPresetProperties();
```
