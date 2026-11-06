---
code: client_cpp_sdk_installation
name: "C++"
wikiToken: E8ekwJ170iMfb8ktBPfcYxE4nq0
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1760169183000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=client_cpp_sdk_installation
---

# C++

::: tip Note

Before integration, please read the Pre-installation Guide first.

You can get the C++ SDK source code on GitHub.

C++ SDK supports running on Mac and Windows platforms, supports C++ 11 and above, and is approximately 144KB in size.

:::

**Latest Version:** v1.5.3

**Update Time:** 2025-10-11

**Resource Download:** SDK Source Code

### I. SDK Integration

#### 1.1 Download SDK

Download the SDK source code, unzip it and enter the cpp-client/cpp folder.

The `include` folder contains the SDK header files, `src` contains the SDK source code files, and `thirdparty` contains the dependent third-party libraries.

#### 1.2 Add Dependencies

C++ SDK depends on sqlite, curl, zlib, and openssl libraries. Due to platform differences, the library formats also vary. You can use the pre-compiled libraries from ThinkingData or compile the libraries yourself.

##### 1.2.1 Use Pre-compiled Libraries from ThinkingData

The libraries are compiled using a compiler on the Windows platform. Configure the compiled libraries in the thirdparty folder into your project. (.dll is dynamic library, .lib is static library)

##### 1.2.2 Self-compile

Here is an example for Windows platform:

Download curl library from https://github.com/curl/curl/releases/tag/curl-7_61_1, unzip it, switch to the winbuild directory, and compile. The compilation command is as follows, and the compilation result is in the builds folder under the curl directory.

```
nmake /f Makefile.vc mode=static ENABLE_IDN=no
```

Download zlib library from https://github.com/madler/zlib/releases/tag/v1.2.11, unzip it, and execute the compilation command. The compilation result is in the zlib directory.

```
nmake -f win32/Makefile.msc
```

Download sqlite library from https://www.sqlite.org/download.html, and select the library for your specified platform.

<!-- unsupported block: 19 -->

Besides using command line, you can also use IDEs (Integrated Development Environments) such as Visual Studio or Clion to generate libraries for specific platforms.

Download openssl library from https://github.com/openssl/openssl, and compile the library for your specified platform yourself.

#### 1.3 Integrate SDK

##### 1.3.1 Integration using CMake

Use CMake to integrate the C++ SDK. Copy the cpp folder to your project, and add the following configuration for Windows and Mac in the `CMakeLists.txt` file:

Set C++ version:

```
set(CMAKE_CXX_STANDARD 11)
```

Include header files:

```
include_directories(cpp/include)
```

Add Windows platform configuration:

```
if(WIN32)
    if(CMAKE_SIZEOF_VOID_P EQUAL 8) # x64 platform
        include_directories(cpp/thirdparty/x64/curl/include cpp/thirdparty/x64/zlib/include cpp/thirdparty/x64/sqlite/include cpp/thirdparty/x64/openssl/include)
        link_directories(cpp/thirdparty/x64/curl/lib cpp/thirdparty/x64/zlib/lib cpp/thirdparty/x64/sqlite/lib cpp/thirdparty/x64/openssl/lib)
    else() # Win32 platform
        include_directories(cpp/thirdparty/x86/curl/include cpp/thirdparty/x86/zlib/include cpp/thirdparty/x86/sqlite/include cpp/thirdparty/x86/openssl/include)
        link_directories(cpp/thirdparty/x86/curl/lib cpp/thirdparty/x86/zlib/lib cpp/thirdparty/x86/sqlite/lib cpp/thirdparty/x86/openssl/lib)
    endif()
    add_library(thinkingdata SHARED cpp/src/ta_analytics_sdk.cpp cpp/src/ta_cpp_helper.cpp cpp/src/ta_cpp_network.cpp cpp/src/ta_cpp_utils.cpp cpp/src/ta_sqlite.cpp cpp/src/ta_timer.cpp cpp/src/ta_event_task.cpp cpp/src/ta_cpp_send.cpp cpp/src/ta_json_object.cpp cpp/src/ta_cJSON.c cpp/src/ta_encrypt.cpp cpp/src/ta_calibrated_time.cpp cpp/src/ta_flush_task.cpp)
    target_link_libraries(thinkingdata libcurl sqlite3 zlibwapi libssl libcrypto)
endif()
```

Add Mac platform configuration:

```
if (CMAKE_HOST_APPLE)
    find_library(COCOA Cocoa)
    find_library(IOKIT IOKit)
    find_package(OpenSSL REQUIRED)
    include_directories(${OPENSSL_INCLUDE_DIR})
    link_directories(${OPENSSL_LIBRARIES})
    add_library(thinkingdata SHARED cpp/src/ta_analytics_sdk.cpp cpp/src/ta_cpp_helper.cpp cpp/src/ta_cpp_network.cpp cpp/src/ta_cpp_utils.cpp cpp/src/ta_sqlite.cpp cpp/src/ta_timer.cpp cpp/src/ta_event_task.cpp cpp/src/ta_cpp_send.cpp cpp/src/ta_json_object.cpp cpp/src/ta_cJSON.c cpp/src/ta_mac_tool.mm cpp/src/ta_encrypt.cpp cpp/src/ta_calibrated_time.cpp cpp/src/ta_flush_task.cpp)
    target_link_libraries(thinkingdata curl z sqlite3 ${OPENSSL_LIBRARIES} ${COCOA} ${IOKIT})
endif()
```

##### 1.3.2 Self-compile

You can use IDE (Integrated Development Environment) to compile ThinkingData libraries yourself

1. Download the SDK code, cd to the cmakelist file directory
1. Execute the following commands

```
//windows platform using Visual Studio to compile
//x86
cmake -S . -B build -G "Visual Studio 17 2022" -A Win32
 //x64
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
```

```
//Mac platform
// arm64 platform m1
arch -arm64 cmake -B build
arch -arm64 cmake --build build

//x86_64 platform  intel
arch -x86_64 cmake -B build
arch -x86_64 cmake --build build
```

##### 1.3.3 Integration using Source Code

After completing the third-party dependency configuration in step 1.2, add the include and src folders to your project.

##### 1.3.4 Use Pre-compiled Libraries

SDK Download

After downloading and unzipping, you can find the corresponding dll files for x64 and x86 platforms, which can be used directly.

### II. Initialize SDK

```
#include "ta_analytics_sdk.h"
#include "ta_json_object.h"

using namespace thinkingdata;

ThinkingAnalyticsAPI::Init(SERVER_URL, APPID);
```

Parameter description:

- `APPID`: Your project's APPID, which can be obtained from the TE backend project management page
- `SERVER_URL`: The URL for data upload
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using a privately deployed version, please bind a domain name for the data collection address and configure an HTTPS certificate: https://your-data-collection-domain

### III. Common Features

Before using common features, we recommend that you first understand the user identification rules; SDK will generate a random number as a visitor ID by default, and persistently store the visitor ID locally; before the user logs in, the visitor ID will be used as the identity identification ID. Note: The visitor ID will change when the user reinstalls the App or changes the device.

#### 3.1 Set Account ID

When a user logs in, you can call `Login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `Logout` is called. Calling `Login` multiple times will override the previous account ID.

```
// The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
ThinkingAnalyticsAPI::Login("TA");
```

`Login` can be called multiple times. Each call will determine whether the passed account ID is consistent with the previously saved ID. If consistent, the call will be ignored; if inconsistent, the previous ID will be overridden.

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 3.2 Send Event

You can call `track` to upload events. It is recommended that you set event properties and conditions for sending information based on your previously documented tracking requirements. Here is an example of a user purchasing a product:

```
TDJSONObject event_properties;
event_properties.SetString("name1", "name1");//string
event_properties.SetNumber("test_number_int", 3);//number
event_properties.SetBool("test_bool", true);//bool
event_properties.SetDateTime("test_time1", time(NULL), 0);//time
std::vector<std::string> test_list;
test_list.push_back("item11");
test_list.push_back("item21");
event_properties.SetList("test_list1", test_list);//array
ThinkingAnalyticsAPI::Track("CPP_event", event_properties);
```

- The event name is a string type, can only start with a letter, can contain numbers, letters and underscores "\_", with a maximum length of 50 characters.
- Event properties are of `TDJSONObject` type, where each element represents a property;
- Event property `Key` is the property name, is a string type, and can only start with a letter, contain numbers, letters and underscores "\_", with a maximum length of 50 characters, and is case-insensitive for letters;
- Property values support string, number, boolean, array, and time types.
<!-- unsupported block: 34 -->

**User property requirements are the same as event property requirements**

#### 3.3 Set User Properties

For general user properties, you can call `UserSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username:

```
TDJSONObject userProperties;
userProperties.SetString("user_name", "TA");
ThinkingAnalyticsAPI::UserSet(userProperties);
```

### IV. Best Practices

The following example code includes all the above operations. We recommend following these steps:

```
#include "ta_analytics_sdk.h"
using namespace thinkingdata;
//Initialize SDK
ThinkingAnalyticsAPI::Init(SERVER_URL, APPID);
 //If the user has logged in, you can set the user's account ID as the unique identifier
ThinkingAnalyticsAPI::Login("TA");
//Send event
TDJSONObject event_properties;
event_properties.SetString("name1", "name1");//string
event_properties.SetNumber("test_number_int", 3);//number
event_properties.SetBool("test_bool", true);//bool
event_properties.SetDateTime("test_time1", time(NULL), 0);//time
std::vector<std::string> test_list;
test_list.push_back("item11");
test_list.push_back("item21");
event_properties.SetList("test_list1", test_list);//array
ThinkingAnalyticsAPI::Track("CPP_event", event_properties);;
//Set user properties
TDJSONObject userProperties;
userProperties1.SetString("user_name", "TA");
ThinkingAnalyticsAPI::UserSet(userProperties);
```

---

# Advanced Guide

### I. Set User ID

The SDK instance defaults to using a random number as the default visitor ID for each user, which will serve as the identity identification ID for users in an unauthenticated state. Note that the visitor ID will change when the user reinstalls the application or changes the device.

#### 1.1 Set Visitor ID

::: tip Note

Generally, you do not need to customize the visitor ID. Please ensure you understand the user identification rules before setting the visitor ID.

If you need to replace the visitor ID, you should call it immediately after initializing the SDK. Do not call it multiple times to avoid creating unnecessary accounts.

:::

If your App has its own visitor ID management system for each user, you can call `Identify` to set the visitor ID:

```
// Set the visitor ID to "Thinker"
ThinkingAnalyticsAPI::Identify("Thinker");
```

If you need to get the current visitor ID, you can call `DistinctID()`:

```
//Return visitor ID
ThinkingAnalyticsAPI::DistinctID().c_str()
```

#### 1.2 Set Account ID

When a user logs in, you can call `Login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `Logout` is called. Calling `Login` multiple times will override the previous account ID

```
// The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
ThinkingAnalyticsAPI::Login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 1.3 Clear Account ID

After a user logs out, you can call `LogOut` to clear the account ID. Before calling `Login` again, the visitor ID will be used as the identity identification ID.

```
ThinkingAnalyticsAPI::LogOut();
```

We recommend that you call `LogOut` only when there is an explicit logout behavior, such as when the user actively cancels their account, rather than when the App is closed.

<!-- unsupported block: 34 -->

**This method will not upload a logout event**

### II. Send Events

After the SDK initialization is complete, you can perform data tracking and collect user behavior information. Generally, ordinary events can meet business scenario requirements. You can also use first-time events, updatable events, etc. according to your actual business scenarios.

#### 2.1 Ordinary Events

You can call `Track` to upload events. We recommend that you set event properties and conditions for sending events based on your previously documented tracking requirements. Here is an example of a user purchasing a product:

```
//Store purchase event
TDJSONObject event_properties;
event_properties.SetString("product_name", "Product Name");
ThinkingAnalyticsAPI::Track("product_buy", event_properties);
```

#### 2.2 First-time Event

First-time events refer to events that will only be recorded once for a certain device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a certain device, then you can use first-time events to report the data.

```
TDJSONObject jsonObject1;
jsonObject1.SetString("test","test");
TDFirstEvent *firstEvent = new TDFirstEvent("device_activation",jsonObject1);
ThinkingAnalyticsAPI::Track(firstEvent);
delete firstEvent;
```

If you want to determine whether it is the first time based on other dimensions other than the device, you can customize the first_check_id for the first-time event:

```
//Set the user ID as the first_check_id of the first-time event to implement the collection of user first activation event
TDJSONObject jsonObject1;
jsonObject1.SetString("test","test");
TDFirstEvent *firstEvent = new TDFirstEvent("account_activation",jsonObject1);
firstEvent->setFirstCheckId("TA");
ThinkingAnalyticsAPI::Track(firstEvent);
delete firstEvent;
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it is the first time is completed on the server side, first-time events will be delayed by 1 hour before entering the database by default.

#### 2.3 Updatable Events

You can implement the need to modify event data in specific scenarios through updatable events. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. The TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report an event that can be updated, assuming the event name is UPDATABLE_EVENT
// After reporting, the event property status is 3, price is 100
TDJSONObject jsonObject;
jsonObject.SetNumber("status", 3);
jsonObject.SetNumber("price", 100);
TDUpdatableEvent *updatableEvent = new TDUpdatableEvent("UPDATABLE_EVENT",jsonObject,"test_event_id");
ThinkingAnalyticsAPI::Track(updatableEvent);
delete updatableEvent;

// After reporting, the event property status is updated to 5, price remains unchanged
TDJSONObject jsonObject1;
jsonObject1.SetNumber("status", 5);
TDUpdatableEvent *updatableEvent1 = new TDUpdatableEvent("UPDATABLE_EVENT",jsonObject1,"test_event_id");
ThinkingAnalyticsAPI::Track(updatableEvent1);
delete updatableEvent1;
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite historical data with the latest data, which effectively is equivalent to deleting the previous data and storing the latest data. The TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report an event that can be overwritten, assuming the event name is OVERWRITE_EVENT
// After reporting, the event property status is 3, price is 100
TDJSONObject jsonObject;
jsonObject.SetNumber("status", 3);
jsonObject.SetNumber("price", 100);
TDOverWritableEvent *event = new TDOverWritableEvent("OVERWRITE_EVENT",jsonObject,"test_event_id");
ThinkingAnalyticsAPI::Track(event);
delete event;

// After reporting, the event property status is updated to 5, price property is deleted
TDJSONObject jsonObject1;
jsonObject1.SetNumber("status", 5);
TDOverWritableEvent *event1 = new TDOverWritableEvent("OVERWRITE_EVENT",jsonObject1,"test_event_id");
ThinkingAnalyticsAPI::Track(event1);
delete event;
```

#### 2.5 Public Event Properties

Public event properties refer to properties that will be uploaded with every event.

##### 2.5.1 Static Public Event Properties

Static public event properties are properties that change infrequently and are present in every event, such as user membership level. After setting static public event properties through `setSuperProperties`, the SDK will obtain the set public event properties as event properties when collecting events.

```
TDJSONObject superProperties;
superProperties.SetNumber("vip_level",2);
ThinkingAnalyticsAPI::SetSuperProperty(superProperties);
```

Static public event properties will be saved to the cache and do not need to be called every time the App starts. If the property already exists, the newly set property will override the original property value; if the property did not exist before, a new property will be created. Besides setting properties, we also provide other APIs to manage static public event properties to meet daily business needs.

```
//Clear a specific public event property
TDAnalytics.unsetSuperProperty("Channel");
//Clear all public event properties
ThinkingAnalyticsAPI::ClearSuperProperties();
//Get all public event properties
TDJSONObject superJson;
ThinkingAnalyticsAPI::GetSuperProperties(superJson);
```

##### 2.5.2 Dynamic Public Event Properties

Dynamic public event properties are properties that change frequently and are present in every event, such as the number of gold coins a user has. After setting the dynamic public property class through `SetDynamicSuperProperties`, the SDK will automatically obtain the properties during event collection and add them to the triggered event.

```
TDJSONObject GetDynamicSuperProperties(){
    TDJSONObject json;
    json.SetNumber("coin",10);
    return json;
}
ThinkingAnalyticsAPI::Init(config);
ThinkingAnalyticsAPI::SetDynamicSuperProperties(GetDynamicSuperProperties);
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload that event, a `#duration` property will automatically be added to your event properties to represent the recorded duration in seconds. Note that only one timing task can exist for the same event name.

```
//The following example completes the statistics of the user's stay duration on a certain product page
try {
    //User enters the product page, start timing
    ThinkingAnalyticsAPI::TimeEvent("stay_shop");
    /**do someting
    .......
    **/
    //User leaves the product page, timing ends, the "stay_shop" event will have a property #duration representing the event duration
    ThinkingAnalyticsAPI::TimeEvent("stay_shop");
} catch (JSONException e) {
    e.printStackTrace();
}
```

### III. User Properties

The user property setting interfaces currently supported by TE platform are: `UserSet`, `UserSetOnce`, `UserAdd`, `UserUnset`, `UserDelete`, `UserAppend`.

#### 3.1 UserSet

For general user properties, you can call `UserSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username:

```
TDJSONObject userProperties;
userProperties.SetString("username", "TA");
ThinkingAnalyticsAPI::UserSet(userProperties);
//At this time userName is TE
TDJSONObject userProperties1;
userProperties1.SetString("username", "TE");
ThinkingAnalyticsAPI::UserSet(userProperties1)
```

#### 3.2 UserSetOnce

If you need to upload user properties that should only be set once, you can call `UserSetOnce` to set them. When the property already has a value, this information will be ignored. Here is an example of setting the first payment time:

```
//first_payment_time is 2018-01-01 01:23:45.678
TDJSONObject userProperties;
userProperties.SetString("first_payment_time","2018-01-01 01:23:45.678");
ThinkingAnalyticsAPI::UserSetOnce(userProperties);

//first_payment_time is still 2018-01-01 01:23:45.678
TDJSONObject userProperties1;
userProperties1.SetString("first_pay_time","2018-12-31 01:23:45.678");
ThinkingAnalyticsAPI::UserSetOnce(userProperties1);
```

#### 3.3 UserAdd

When you need to upload numeric properties, you can call `UserAdd` to perform an accumulation operation on the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, which is equivalent to a subtraction operation. Here is an example of accumulating total payment amount:

```
//At this time total_revenue is 30
TDJSONObject userProperties;
userProperties.SetNumber("total_revenue",30;
ThinkingAnalyticsAPI::UserAdd(userProperties);
//At this time total_revenue is 678
TDJSONObject userProperties1;
userProperties1.SetNumber("total_revenue",648);
ThinkingAnalyticsAPI::UserAdd(userProperties1);
```

<!-- unsupported block: 34 -->

The property key is a string, and Value only allows numeric values.

#### 3.4 UserUnset

If you need to reset a user's property, you can call `UserUnset` to clear the value of a specified user property. This interface supports passing string or list type parameters:

```
ThinkingAnalyticsAPI::UserUnset("userUnset_key");
```

<!-- unsupported block: 34 -->

The passed value is the Key of the property to be cleared.

#### 3.5 UserDelete

If you need to delete a user, you can call `UserDelete` to delete that user. You will no longer be able to query that user's user properties, but the events generated by that user can still be queried.

```
ThinkingAnalyticsAPI::UserDelete();
```

#### 3.6 UserAppend

You can call `UserAppend` to append elements to `List` type user properties:

```
TDJSONObject userProperties;
vector<string> listValue;
listValue.push_back("apple");
listValue.push_back("ball");
userProperties.SetList("user_list",listValue);
ThinkingAnalyticsAPI::UserAppend(userProperties);
```

#### 3.7 UserUniqAppend

You can call `UserUniqAppend` to append elements to array type user properties. Calling `UserUniqAppend` interface will deduplicate the appended user properties, while `UserAppend` interface does not deduplicate, so user properties may contain duplicates.

```
//At this time user_list property value is ["apple", "ball"]
TDJSONObject userProperties1;
vector<string> listValue1;
listValue1.push_back("apple");
listValue1.push_back("ball");
userProperties1.SetList("user_list",listValue1);
ThinkingAnalyticsAPI::UserAppend(userProperties1);

//At this time user_list property value is ["apple", "apple", "ball", "cube"]
TDJSONObject userProperties2;
vector<string> listValue1;
listValue2.push_back("apple");
listValue2.push_back("cube");
userProperties2.SetList("user_list",listValue2);
ThinkingAnalyticsAPI::UserAppend(userProperties2);

//At this time user_list property value is ["apple", "ball", "cube"]
ThinkingAnalyticsAPI::UserUniqAppend(userProperties2);

```

### IV. Encryption Function

Starting from version v1.3.7, SDK supports using AES+RSA to encrypt data. The data encryption function requires client and server to work together. Please consult your customer success manager for specific usage.

```
TDConfig config;
config.appid = appid;
config.server_url = server_url;
config.EnableEncrypt(1,"publickKey");
ThinkingAnalyticsAPI::Init(config);
```

### V. Other Features

#### 5.1 Print SDK Logs

You can enable SDK log printing through the EnableLog interface. After enabling, the reported data will be printed in the IDE console.

```
ThinkingAnalyticsAPI::EnableLog(true);
```

#### 5.2 Preset Properties Description

**Property Name**

**Chinese Name**

**Property Type**

**Description**

#ip

IP Address

Text

User's IP address, TE will use this to obtain user's geographic location information

#country

Country

Text

User's country, generated based on IP address

#country_code

Country Code

Text

User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address

#province

Province

Text

User's province, generated based on IP address

#city

City

Text

User's city, generated based on IP address

#os

Operating System

Text

Such as MacOS, Windows, etc.

#device_id

Device ID

Text

User's device ID

#lib

SDK Type

Text

The type of SDK you integrated, such as Android, iOS, etc.

#lib_version

SDK Version

Text

The version of SDK you integrated

#### 5.3 Calibrate Time

By default, SDK uses the local time as the event occurrence time. If users manually modify the device time, it will affect your business analysis. At this time, you can ensure the accuracy of event occurrence time through time calibration operations. We provide two time calibration methods: `timestamp` and `automatic`.

- You can use the current timestamp obtained from the server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use the calibrated time as the occurrence time.

```
// 1585633785954 is the current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
ThinkingAnalyticsAPI::CalibrateTime(1585633785954);
```

- You can also set automatic time calibration. After that, SDK will attempt to obtain the current time from the config interface and calibrate SDK time. If the correct return result is not obtained, the local time will be used to report data subsequently.

```
TDConfig config;
config.appid = appid;
config.server_url = server_url;
config.enableAutoCalibrated = true;
ThinkingAnalyticsAPI::Init(config);
```

#### 5.4 Flush Data Immediately

In some business scenarios, if you expect data to be reported to the TE server immediately, you can complete it by calling the `flush` interface

```
ThinkingAnalyticsAPI::Flush();
```

#### 5.5 Get Device ID

You can get the device ID by calling `getDeviceId`:

```
ThinkingAnalyticsAPI::GetDeviceId();
```

#### 5.6 Set Default Timezone

By default, SDK uses the device's local time at the time of the interface call as the event occurrence time for reporting. You can also set a default timezone through the interface so that all events will be aligned to the event time according to the timezone you set:

```
TDConfig config;
config.appid = appid;
config.server_url = server_url;
config.zoneOffset = 5;
ThinkingAnalyticsAPI::Init(config);
```

<!-- unsupported block: 34 -->

Note: Aligning event time with a specified timezone will lose the device's local timezone information. If you need to preserve the device's local timezone information, you currently need to add relevant properties to the event yourself.

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in the IDE console or using TE's Debug feature.

### I. Print SDK Logs

```
TDAnalytics.EnableLogType(TDLogType.LogTxt);
```

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingAnalytics related logs in the IDE to observe SDK data reporting.

### II. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Enable Debug mode on the client side
   The following is an example code for enabling Debug mode on the client side:

```
// Get TDConfig instance
TDConfig config = new TDConfig();
config.appid = TA_APP_ID;
config.server_url = TA_SERVER_URL;
/*
Set the running mode to Debug mode
NORMAL mode: Data will be stored in cache and reported according to a certain cache strategy. Default is NORMAL mode; recommended for production environment
Debug mode: Data is reported one by one. When problems occur, users will be prompted with logs and exceptions; not recommended for production environment
DebugOnly mode: Only validates data, will not be stored in database; not recommended for production environment
 */
config.mode = TDMode.Debug;
// Initialize SDK
TDAnalytics.Init(config);
```

1. Add Debug device in TE backend
   To prevent Debug mode from being launched in production environments, only specified devices can enable Debug mode. Debug mode can only be enabled if Debug mode is enabled on the client side and the device ID is configured in the "Debug Data" section of the "Tracking Management" page in TE backend.

Device ID can be obtained through the following three ways:

- The #device_id property in event data in TE platform
- Client logs: SDK will print device DeviceId after initialization completes
- Through instance interface call: Get Device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and App stability, it is only used for data verification during integration stage, do not use it in production environment.

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in the IDE console or using TE's Debug feature.

### I. Print SDK Logs

```
ThinkingAnalyticsAPI::EnableLogType(LOGCONSOLE);//Print logs to console
ThinkingAnalyticsAPI::EnableLogType(LOGTXT);//Output logs to local file
```

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingAnalytics related logs in the IDE to observe SDK data reporting.

### II. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Enable Debug mode on the client side
   The following is an example code for enabling Debug mode on the client side:

```
// Get TDConfig instance
TDConfig config;
config.appid = TA_APP_ID;
config.server_url = TA_SERVER_URL;
/*
Set the running mode to Debug mode
NORMAL mode: Data will be stored in cache and reported according to a certain cache strategy. Default is NORMAL mode; recommended for production environment
Debug mode: Data is reported one by one. When problems occur, users will be prompted with logs and exceptions; not recommended for production environment
DebugOnly mode: Only validates data, will not be stored in database; not recommended for production environment
 */
config.mode = TDMode.TD_DEBUG;
// Initialize SDK
ThinkingAnalyticsAPI::Init(config);
```

1. Add Debug device in TE backend
   To prevent Debug mode from being launched in production environments, only specified devices can enable Debug mode. Debug mode can only be enabled if Debug mode is enabled on the client side and the device ID is configured in the "Debug Data" section of the "Tracking Management" page in TE backend.

Device ID can be obtained through the following three ways:

- The #device_id property in event data in TE platform
- Client logs: SDK will print device DeviceId after initialization completes
- Through instance interface call: Get Device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and App stability, it is only used for data verification during integration stage, do not use it in production environment.
