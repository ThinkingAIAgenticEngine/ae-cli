---
code: c_sdk_installation
name: "C"
wikiToken: SLlQwuOYRifeDVkRAxTc08pVnMg
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1745310920000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=c_sdk_installation
---

# C

::: tip Note

Before integration, please read the Pre-Integration Guide first.

:::

**Latest Version**: v2.0.0

**Update Date**: 2023-11-30

**Download**: Source Code

::: warning Note

This document applies to v2.0.0 and later versions. For historical versions, please refer to C SDK Integration Guide (V1).

:::

### 1. SDK Integration

1. Download C SDK source code, modify `CMakeLists.txt` file, use `logconsumer` method to compile .a file

```
cmake_minimum_required(VERSION 3.12)
project(thinking_data_c)
message(STATUS "[ThinkingData] CMAKE_HOST_SYSTEM: ${CMAKE_HOST_SYSTEM} ")

include_directories(include)

#################################################################

# Product Library: logging consumer
if(WIN32)
    add_compile_definitions(USE_WIN)
    set(CMAKE_C_FLAGS "-std=c89 -pedantic-errors -m64")
else()
    add_compile_definitions(USE_POSIX)
    set(CMAKE_C_FLAGS "-std=c89")
endif()
SET(TE_LIB_NAME thinkingdata)
add_library(${TE_LIB_NAME} src/thinkingdata.c src/td_json.c src/td_list.c src/td_util.c src/td_logger_consumer.c)
if(WIN32)
    include_directories(thirdparty/pcre/include)
    link_directories(thirdparty/pcre/lib)
    target_link_libraries(${TE_LIB_NAME} pcre_x64)
endif()
```

Compile the project to get the `libthinkingdata.a` file.

2. Install LogBus
   We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;

TDConfig* config = td_init_config();
char* logPath = "LOG_DIRECTORY";
TD_ASSERT(TD_OK == td_add_string("file_path", logPath, strlen(logPath), config));

if (TD_OK != td_init_consumer(&consumer, config)) {
    fprintf(stderr, "Failed to initialize the consumer.");
}
td_free_properties(config);

if (TD_OK != td_init(consumer, &ta)) {
    fprintf(stderr, "Failed to initialize the SDK.");
    return 1;
}
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder path to this address to use LogBus for data monitoring and uploading.

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `td_track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
// Generate custom properties
TDProperties *properties = td_init_properties();
// Set user IP address, TE system will parse user geographic location based on IP
TD_ASSERT(TD_OK == td_add_string("#ip", "192.168.1.1", strlen("192.168.1.1"), properties));
// Add custom properties
TD_ASSERT(TD_OK == td_add_string("channel", "ta", strlen("ta"), properties));// String
TD_ASSERT(TD_OK == td_add_int("age", 1, properties)); // Number
TD_ASSERT(TD_OK == td_add_bool("is_success", TD_TRUE, properties));// Boolean
TD_ASSERT(TD_OK == td_add_date("birthday", time(NULL), 0, properties));// Date
// Array
TD_ASSERT(TD_OK == td_append_array("arr", "value", strlen("value"), properties));
TD_ASSERT(TD_OK == td_append_array("arr", "value1", strlen("value1"), properties));
// Object
TDProperties *object = td_init_custom_properties("object");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object));
TD_ASSERT(TD_OK == td_add_property(object, properties));
// Object Array
TDProperties *object1 = td_init_custom_properties("object1");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object1));
TD_ASSERT(TD_OK == td_append_properties("object_arr", object1, properties));
// Report event with custom properties, account_id and distinct_id must have at least one set
TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "payment", properties, ta));
td_free_properties(properties);
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `td_user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
// At this point, username is "TA"
// account_id and distinct_id must have at least one set
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TA", strlen("TA"), user_properties));
TD_ASSERT(TD_OK == td_user_set(account_id, distinct_id, user_properties,ta));
td_free_properties(user_properties);

// At this point, userName is "TE"
TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TE", strlen("TE"), user_properties2));
TD_ASSERT(TD_OK == td_user_set(account_id, distinct_id, user_properties2,ta));
td_free_properties(user_properties2);
```

#### 3.3 Data Reporting

When initializing SDK using `td_init_consumer()` method, SDK will write collected data to disk in real-time.

The `td_flush()` function internally synchronizes the default memory cache in the file system to disk in real-time. Generally, no need to call manually.

```
td_flush(ta);
```

#### 3.4 Close SDK

```
td_free(ta);
td_consumer_free(consumer);
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

```
struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;

TDConfig* config = td_init_config();
char* logPath = "LOG_DIRECTORY";
TD_ASSERT(TD_OK == td_add_string("file_path", logPath, strlen(logPath), config));

if (TD_OK != td_init_consumer(&consumer, config)) {
    fprintf(stderr, "Failed to initialize the consumer.");
}
td_free_properties(config);

if (TD_OK != td_init(consumer, &ta)) {
    fprintf(stderr, "Failed to initialize the SDK.");
    return 1;
}

// Generate custom properties
TDProperties *properties = td_init_properties();
// Set user IP address, TE system will parse user geographic location based on IP
TD_ASSERT(TD_OK == td_add_string("#ip", "192.168.1.1", strlen("192.168.1.1"), properties));
// Add custom properties
TD_ASSERT(TD_OK == td_add_string("channel", "ta", strlen("ta"), properties));// String
TD_ASSERT(TD_OK == td_add_int("age", 1, properties)); // Number
TD_ASSERT(TD_OK == td_add_bool("is_success", TD_TRUE, properties));// Boolean
TD_ASSERT(TD_OK == td_add_date("birthday", time(NULL), 0, properties));// Date
// Array
TD_ASSERT(TD_OK == td_append_array("arr", "value", strlen("value"), properties));
TD_ASSERT(TD_OK == td_append_array("arr", "value1", strlen("value1"), properties));
// Object
TDProperties *object = td_init_custom_properties("object");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object));
TD_ASSERT(TD_OK == td_add_property(object, properties));
// Object Array
TDProperties *object1 = td_init_custom_properties("object1");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object1));
TD_ASSERT(TD_OK == td_append_properties("object_arr", object1, properties));
// Report event with custom properties, account_id and distinct_id must have at least one set
TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "payment", properties, ta));
td_free_properties(properties);

// At this point, username is "TA"
// account_id and distinct_id must have at least one set
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TA", strlen("TA"), user_properties));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties,ta));
td_free_properties(user_properties);

// At this point, userName is "TE"
TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TE", strlen("TE"), user_properties2));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties2,ta));
td_free_properties(user_properties2);
```

---

# Advanced Guide

### 1. Track Events

After SDK initialization, you can perform data tracking to collect user behavior information. Generally, regular events can meet business scenario requirements. You can also use first-time events, updateable events, etc. based on your actual business scenarios.

#### 1.1 Regular Events

You can call `td_track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is an example of a user purchasing a product:

```
// Set event properties
TDProperties *properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("product_name", "goods_name", strlen("goods_name"), properties));
// Report event with custom properties, account_id and distinct_id must have at least one set
TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "product_buy", properties, ta));
td_free_properties(properties);
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
TD_ASSERT(TD_OK == td_track_first_event("account_id", "distinct_id", "device_activation", "first_id", properties, ta));
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
// Report updateable event, event name is UPDATABLE_EVENT, event ID is event_id
// After reporting, event property status is 3, price is 100
TDProperties *properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("price",100,properties));
TD_ASSERT(TD_OK == td_add_int("status",3,properties));
TD_ASSERT(TD_OK == td_track_update("account_id", "distinct_id", "UPDATABLE_EVENT", "event_id",properties, ta));
td_free_properties(properties);
// After reporting, same event property status is updated to 5, price unchanged
TDProperties *new_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("status",5,new_properties));
TD_ASSERT(TD_OK == td_track_update("account_id", "distinct_id", "UPDATABLE_EVENT", "event_id",new_properties, ta));
td_free_properties(new_properties);
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
// Report overwriteable event, event name is OVERWRITE_EVENT, event ID is event_id
// After reporting, event property status is 3, price is 100
TDProperties *properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("price",100,properties));
TD_ASSERT(TD_OK == td_add_int("status",3,properties));
TD_ASSERT(TD_OK == td_track_overwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "event_id",properties, ta));
td_free_properties(properties);
// After reporting, same event property status is updated to 5, price property is deleted
TDProperties *new_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("status",5,new_properties));
TD_ASSERT(TD_OK == td_track_overwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "event_id",new_properties, ta));
td_free_properties(new_properties);
```

### 2. User Properties

TE platform supports the following user property setting APIs: `td_user_set`, `td_user_setOnce`, `td_user_add`, `td_user_unset`, `td_user_delete`, `td_user_append`, `td_user_uniq_append`.

#### 2.1 td_user_set

For general user properties, you can call `td_user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
// At this point, username is "TA"
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TA", strlen("TA"), user_properties));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties,ta));
td_free_properties(user_properties);

// At this point, userName is "TE"
TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TE", strlen("TE"), user_properties2));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties2,ta));
td_free_properties(user_properties2);
```

#### 2.2 td_user_setOnce

If you want to set a user property only once, you can call `td_user_setOnce`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
// first_payment_time is 2018-01-01 01:23:45.678
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("first_payment_time", "2018-01-01 01:23:45.678", strlen("2018-01-01 01:23:45.678"), user_properties));
TD_ASSERT(TD_OK == td_user_setOnce("account_id", "distinct_id", user_properties,ta));
td_free_properties(user_properties);

// first_payment_time is still 2018-01-01 01:23:45.678
TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("first_payment_time", "2018-12-31 01:23:45.678", strlen("2018-12-31 01:23:45.678"), user_properties2));
TD_ASSERT(TD_OK == td_user_setOnce("account_id", "distinct_id", user_properties2,ta));
td_free_properties(user_properties2);
```

#### 2.3 td_user_add

When you want to upload numeric properties, you can call `td_user_add` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
// Upload user property, at this point "total_revenue" value is 30
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("total_revenue", 30, user_properties));
TD_ASSERT(TD_OK == td_user_add("account_id", "distinct_id", user_properties, ta));
td_free_properties(user_properties);

// Upload user property, at this point "total_revenue" value is 678
TDProperties *new_user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("total_revenue",648 , new_user_properties));
TD_ASSERT(TD_OK == td_user_add("account_id", "distinct_id", new_user_properties, ta));
td_free_properties(new_user_properties);
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 td_user_append

You can call `td_user_append` to append array-type user properties.

```
// At this point, user_list property value is ["apple", "ball"]
TDProperties *array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "ball", strlen("ball"), array_properties));
TD_ASSERT(TD_OK == td_user_append("account_id", "distinct_id", array_properties, ta));
td_free_properties(array_properties);

// At this point, user_list property value is ["apple","apple","ball","cube"]
TDProperties *new_array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), new_array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "cube", strlen("cube"), new_array_properties));
TD_ASSERT(TD_OK == td_user_append("account_id", "distinct_id", new_array_properties, ta));
```

#### 2.5 td_user_uniq_append

You can call `td_user_uniq_append` to append array-type user properties. The `td_user_uniq_append` interface will deduplicate appended user properties, while `td_user_append` interface does not deduplicate, allowing duplicate user properties.

```
// At this point, user_list property value is ["apple", "ball"]
TDProperties *array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "ball", strlen("ball"), array_properties));
TD_ASSERT(TD_OK == td_user_append("account_id", "distinct_id", array_properties, ta));
td_free_properties(array_properties);

// At this point, user_list property value is ["apple", "ball","cube"]
TDProperties *new_array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), new_array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "cube", strlen("cube"), new_array_properties));
TD_ASSERT(TD_OK == td_user_uniq_append("account_id","distinct_id", new_array_properties, ta));
td_free_properties(new_array_properties);
```

#### 2.6 td_user_unset

When you want to clear user property values, you can call `td_user_unset` to clear specified properties. If the property has not been created in the cluster, `td_user_unset` will not create the property.

```
TD_ASSERT(TD_OK == td_user_unset("account_id", "distinct_id", "test", ta));
```

td_user_unset: The parameter is the Key value of the property to be cleared.

#### 2.7 td_user_delete

If you want to delete a user, you can call `td_user_delete` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
TD_ASSERT(TD_OK == td_user_delete("account_id", "distinct_id", ta));
```

### 3. Other Features

#### 3.1 BatchConsumer

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools. Cache buffer size can be set, default 20, meaning maximum cached data count is 20 (20 is batch value for each upload, configurable).

```
// First: Modify CMakeList.txt file, package TDBatchConsumer type library file

struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;

// Generate config
TDConfig *config = td_init_config();
// Configure appid and url
char* appid = "APPID";
char* serverURL = "SERVER_URL";
TD_ASSERT(TD_OK == td_add_string("push_url", serverURL, strlen(serverURL), config));
TD_ASSERT(TD_OK == td_add_string("appid", appid, strlen(appid), config));

// Generate SDK instance
if (TD_OK != td_init_consumer(&consumer, config)) {
    fprintf(stderr, "Failed to initialize the consumer.");
    return 1;
}
td_free_properties(config);
if (TD_OK != td_init(consumer, &ta)) {
    fprintf(stderr, "Failed to initialize the SDK.");
    return 1;
}
```

Parameter Description:

- `APPID`: Your project's APPID, can be obtained from TE backend project management page
- `SERVER_URL`: Data upload URL
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you use private deployment version, please bind domain for data collection address and configure HTTPS certificate: https://YOUR_DATA_COLLECTION_DOMAIN

---

# Real-time Debugging

::: warning Note

SDK Debug mode is only for integration debugging. Do not use in production environment.

:::

### Enable Log Printing

```
td_enableLog(1);
```

### Use DebugConsumer

During SDK integration, you can use TE's Debug feature for real-time debugging. Enabling Debug feature requires two steps:

1. Use DebugConsumer

- Package .a file including debugConsumer functionality, `CMakeLists.txt` modification example:

```
# Debug Library: debug consumer
if(WIN32)
    add_compile_definitions(USE_WIN)
    set(CMAKE_C_FLAGS "-std=c99 -pedantic-errors -m64")
else()
    add_compile_definitions(USE_POSIX)
    set(CMAKE_C_FLAGS "-std=c99")
endif()
SET(TE_LIB_NAME thinkingDataDebug)
add_library(${TE_LIB_NAME} src/thinkingdata.c src/td_json.c src/td_list.c src/td_util.c src/td_debug_consumer.c src/td_http_client.c)
if(WIN32)
    add_compile_definitions(BUILDING_LIBCURL)
    include_directories(thirdparty/pcre/include thirdparty/curl/include)
    link_directories(thirdparty/pcre/lib thirdparty/curl/lib)
    target_link_libraries(${TE_LIB_NAME} pcre_x64 libcurl)
else()
    target_link_libraries(${TE_LIB_NAME} curl)
endif()
```

- Here is sample code using DebugConsumer:

```
struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;
/*
 * DebugConsumer: Data is reported one by one. When problems occur, users are notified via logs and exceptions. Not recommended for production environment.
 */
TDConfig *config = td_init_config();
// debug_mode, 0 means write to database, otherwise no write
TD_ASSERT(TD_OK == td_add_int("debug_mode", 0, config));
// TE backend test device ID: 123456789
TD_ASSERT(TD_OK == td_add_string("device_id", "123456789", strlen("123456789"), config));
// Configure appid and url
char* appid = "APPID";
char* serverURL = "SERVER_URL";
TD_ASSERT(TD_OK == td_add_string("push_url", serverURL, strlen(serverURL), config));
TD_ASSERT(TD_OK == td_add_string("appid", appid, strlen(appid), config));

// Generate SDK instance
if (TD_OK != td_init_consumer(&consumer, config)) {
    fprintf(stderr, "Failed to initialize the consumer.");
    return 1;
}
td_free_properties(config);
if (TD_OK != td_init(consumer, &ta)) {
    fprintf(stderr, "Failed to initialize the SDK.");
    return 1;
}

// Generate custom properties
TDProperties *properties = td_init_properties();
// Add device ID property, device ID value is td_device_id
TD_ASSERT(TD_OK == td_add_string("#device_id", "td_device_id", strlen("td_device_id"), properties));
// Report event with custom properties, account_id and distinct_id must have at least one set
TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "test", properties, ta));
td_free_properties(properties);
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for C SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
