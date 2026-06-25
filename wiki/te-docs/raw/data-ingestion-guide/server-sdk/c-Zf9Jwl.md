---
code: cpp_server_sdk_installation
name: "C++"
wikiToken: Zf9Jwl81biGtrbkmBhackD1Fn3c
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252019000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cpp_server_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
C++ 11 is required. The g++ version needs to be greater than 5.1.0
 :::
**Latest version**: v2.0.0
**Update time**: 2023-11-30
**Resource download: **[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcpp-server-sdk)
::: warning Notice 
Current documentation applies to v2.0.0 and later. For historical versions, see [Data Ingestion Guide - C++ (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Fcpp_server_sdk_installation%2Fcpp_server_sdk_installation.html) 
:::
## **SDK**** Integration**
**1.1**** Build **`**libthinkingdata.a**`** file**
1. TE SDK relies on [rapidjson ](https%3A%2F%2Fgithub.com%2FTencent%2Frapidjson)parsing library, you need to download `rapidjson` library.
2. Download the SDK source code, modify the `CMakeLists.txt` file in the SDK, and select the data consumers you need for packaging (details can refer to the `CMakeLists.txt` file in the SDK source code). Here is an example of the most common `logconsumer`:
```bash
cmake_minimum_required(VERSION 3.12)
project(ThinkingData)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 11)

message(STATUS "[${PROJECT_NAME}] current cmake version: ${CMAKE_MAJOR_VERSION}.${CMAKE_MINOR_VERSION}.${CMAKE_PATCH_VERSION}")
message(STATUS "[${PROJECT_NAME}] CMAKE_HOST_SYSTEM: ${CMAKE_HOST_SYSTEM} ")

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE release CACHE STRING "Build Type" FORCE)
endif()

message(STATUS "[${PROJECT_NAME}] Build type:${CMAKE_BUILD_TYPE}")

message(STATUS "[${PROJECT_NAME}] Debug configuration:${CMAKE_CXX_FLAGS_DEBUG}")

message(STATUS "[${PROJECT_NAME}] release configuration:${CMAKE_CXX_FLAGS_RELEASE}")

message(STATUS "[${PROJECT_NAME}] release configuration with debug info:${CMAKE_CXX_FLAGS_RELWITHDEBINFO}")

message(STATUS "[${PROJECT_NAME}] minimal release configuration:${CMAKE_CXX_FLAGS_MINSIZEREL}")

include_directories(include)

 #
 # log consumer. Recommended for production environments
 #
 set(TE_LIB_NAME thinkingdata)
 add_library(${TE_LIB_NAME} src/TDAnalytics.cpp src/TDUtils.cpp src/TDLoggerConsumer.cpp src/TDConsumer.cpp)
 if(UNIX)
   find_package(Threads REQUIRED)
   target_link_libraries(${TE_LIB_NAME} Threads::Threads)
 endif()
```

3. The `rapidjson` library contains only header files.
  1. Put the `rapidjson` in the following path if your project has not included the `rapidjson` library before:

<image token="A0uybVQmOoqIRfxshGNcdvObnig" width="222" height="201" align="center"/>

2. The contents of the `TDJsonParse.h` file need to be modified if your project has previously included the `rapidjson` library. You don't need to import `rapidjson` again:

<image token="J9LLbZLR0oI26KxgcUfcHyFWndc" width="294" height="149" align="center"/>


**1.2 ****Logbus**** Integration**
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```cpp
#include "../include/TDAnalytics.h"
#include "../include/TDLoggerConsumer.h"
#include "../include/TDDebugConsumer.h"
#include "../include/TDBatchConsumer.h"

using namespace thinkingDataAnalytics;

int main(int argc, char *argv[]) {
    TDLoggerConsumer::Config config = TDLoggerConsumer::Config("LOG_DIRECTORY", 20, 500, TDLoggerConsumer::HOURLY);
    config.fileNamePrefix = "te";
    config.rotateMode = TDLoggerConsumer::HOURLY;

    TDConsumer *consumer = new TDLoggerConsumer(config);
    TDAnalytics te(*consumer, false);
}
```

`LOG_DIRECTORY` is the local folder path.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```cpp
TDPropertiesNode event_properties;
event_properties.SetString("name1", "XZ_debug");
event_properties.SetString("name2", "logbugs");
event_properties.SetString("name3", "name3");
event_properties.SetString("#uuid", "1234567890");
event_properties.SetNumber("test_number_int", 3);
event_properties.SetNumber("test_number_double", 3.14);
event_properties.SetBool("test_bool", true);
std::string test_string = "test_string";
event_properties.SetString("test_stl_string1", test_string);
event_properties.SetDateTime("test_time1", time(nullptr), 0);
timeb t = {};
ftime(&t);
event_properties.SetDateTime("#time", t.time, t.millitm);
std::vector<std::string> test_list;
test_list.emplace_back("item11");
test_list.emplace_back("item21");
event_properties.SetList("test_list1", test_list);

// track event
te.track("accountId", "distinctId", "eventName", event_properties);
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2** User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```cpp
// user_set
TDPropertiesNode userSet_properties;
userSet_properties.SetString("userName", "test");
te.user_set("accountId", "distinctId", userSet_properties);
```

### 3.3 Reported data
When using `TDLoggerConsumer`, the captured events are converted to json strings and then added to the cache array. Data is written to disk only when the number of array elements exceeds the set capacity. The default capacity is 20.
You can call the `flush()` api to report data to the TE  immediately under certain service scenarios. However, frequent calls to `flush()` can result in degraded service performance.
```cpp
te.flush();
```

### 3.4 Close  SDK
```cpp
te.close();
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```cpp
// Import header file (adjust the path yourself)
#include "../include/TDAnalytics.h"
#include "../include/TDLoggerConsumer.h"

using namespace thinkingDataAnalytics;

TDLoggerConsumer::Config config = TDLoggerConsumer::Config("LOG_DIRECTORY", 20, 500, TDLoggerConsumer::HOURLY);
config.fileNamePrefix = "te";
config.rotateMode = TDLoggerConsumer::HOURLY;

TDConsumer *consumer = new TDLoggerConsumer(config);
TDAnalytics te(*consumer, false);

TDPropertiesNode event_properties;
event_properties.SetString("name1", "XZ_debug");;
event_properties.SetNumber("test_number_int", 3);
event_properties.SetBool("test_bool", true);
te.track("accountId", "distinctId", "eventName", event_properties);

TDPropertiesNode userSet_properties;
userSet_properties.SetString("userName", "test");
te.user_set("accountId", "distinctId", userSet_properties);

te.flush();
```
