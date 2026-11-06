---
code: erlang_sdk_installation
name: "Erlang"
wikiToken: FT65wwPGgiXLEpkeW4IcZeEHnCd
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1745310923000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=erlang_sdk_installation
---

# Erlang

This guide will introduce how to use Erlang SDK to integrate into your project.

::: tip Note

Before integration, please read the Pre-Integration Guide first.

:::

**Latest Version**: v2.0.0

**Update Date**: 2023-10-08

**Download**: Source Code

::: warning Note

This document applies to v2.0.0 and later versions. For historical versions, please refer to Erlang SDK Integration Guide (V1).

:::

### 1. SDK Integration

1. Your project needs to have rebar3 environment installed.
2. Modify your `rebar.config` file to add reference to thinkingdata_analytics SDK.

```
{erl_opts, [debug_info,
    %% Required parameter for using lager library
    {parse_transform, lager_transform},
    %% Declare extended sink here, if multiple sinks, write: [ta_logger, ta_logger_xxxx]
    {lager_extra_sinks, [ta_logger]}
]}.

{deps, [
    %% Add ThinkingData SDK
    {thinkingdata_analytics, {git, "https://github.com/ThinkingDataAnalytics/erlang-sdk.git", {tag, "v2.0.0"}}}
]}.

{shell, [
    %% Enable configuration file
    {config, "config/example_sys.config"},
    {apps, [app_name]}
]}.
```

Note: There is an example file `example_sys.config` in the SDK directory that you can refer to for configuration.

3. Run command:

```
rebar3 compile
```

4. Modify your project's configuration file (e.g., example_sys.config). Add lager library configuration in your configuration file, mainly add the sink used by ThinkingData SDK: `ta_logger_lager_event`. If you need to use multiple instances writing to different log files, you need to add other sinks.

```
[
  %% lager log library configuration
  {lager, [
    {colored, true},
    {log_root, "./log"}, %% Path for storing logs generated during system operation
    %% Add a sink used by ThinkingData SDK here, name is fixed: ta_logger_lager_event
    {extra_sinks,
      [
        {ta_logger_lager_event,
          [{handlers, [
            {lager_file_backend, [
              {file, "LOG_DIRECTORY"}, %% Configure file path and name for data collection
              {level, info},
              {formatter, lager_default_formatter},
              {formatter_config, [message, "\n"]},
              {size, 10485760}, %% Single file rotation size 10Mb
              {rotator, td_lager_rotator} %% Custom log rotation
            ]}]},
            {async_threshold, 500},
            {async_threshold_window, 50}
          ]
        }]
    }
  ]
  }
].
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder address to this address to use LogBus for data monitoring and uploading.

5. Configure startup parameters in your app project configuration file. Add necessary startup items in `xxxx.app.src` file.

```
{application, app_name,
 [{description, "An OTP application"},
  {vsn, "0.1.0"},
  {registered, []},
  {mod, {app_name_app, []}},
  {applications,
   [kernel,
    stdlib,
    jsone, %% Add startup item here
    lager %% Add startup item here
   ]},
  {env,[]},
  {modules, []},

  {licenses, ["Apache-2.0"]},
  {links, []}
 ]}.
```

6. Use SDK:

```
%% A lager sink is provided by default: 'ta_logger'. You could add your own sink
Consumer = td_log_consumer:init_with_logger(fun(E) -> ta_logger:info(E) end),
%% init SDK with consumer
TE_SDK = td_analytics:init_with_consumer(Consumer),
```

Windows Platform Note: You need to open command line terminal with **administrator privileges** to run the project, otherwise data writing errors will occur.

We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
%% A lager sink is provided by default: 'ta_logger'. You could add your own sink
Consumer = td_log_consumer:init_with_logger(fun(E) -> ta_logger:info(E) end),
%% init SDK with consumer
TE_SDK = td_analytics:init_with_consumer(Consumer),
```

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
%% Note: account_id and distinct_id must have at least one set
%% Set user IP address, TE system will parse user geographic location based on IP, if not set, default not reported
%% Set event occurrence time, if not set, default uses current time. Note: #time type must be timestamp() type

%% Report event
td_analytics:track_instance(TE_SDK, "account_id_Erlang", "distinct_logbus", "ViewProduct", #{"key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `user_set_instance` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
%% user properties
td_analytics:user_set_instance(TE_SDK, "account_id_Erlang", "distinct_id", #{"id" => 12, "key_1" => [1,1,1,1], "key_2" => ["a", "b"], "key_3" => ["chinese", "text"], "key_4" => ["chinese", "list"], "key_5" => "chinese_string", "amount" => 7.123}),
```

#### 3.3 Data Reporting

When using `td_analytics:consumer_type_log()`, SDK will write collected data to disk in real-time. No need to call `flush()` method.

#### 3.4 Close SDK

```
%% Call when closing SDK
td_analytics:close_instance(TE_SDK),
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
%% A lager sink is provided by default: 'ta_logger'. You could add your own sink
Consumer = td_log_consumer:init_with_logger(fun(E) -> ta_logger:info(E) end),
%% init SDK with consumer
TE_SDK = td_analytics:init_with_consumer(Consumer),

%% ordinary event
td_analytics:track_instance(TE_SDK, "account_id_Erlang", "distinct_logbus", "ViewProduct", #{"key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),

td_analytics:close_instance(TE_SDK),
```

---

# Advanced Guide

### 1. Track Events

After SDK initialization, you can perform data tracking to collect user behavior information. Generally, regular events can meet business scenario requirements. You can also use first-time events, updateable events, etc. based on your actual business scenarios.

#### 1.1 Regular Events

You can call `track_instance` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is an example of a user purchasing a product:

```
%% Note: account_id and distinct_id must have at least one set
%% Set user IP address, TE system will parse user geographic location based on IP, if not set, default not reported
%% Set event occurrence time, if not set, default uses current time. Note: #time type must be timestamp() type

%% Report event
td_analytics:track_instance(TE_SDK, "account_id_Erlang", "distinct_logbus", "ViewProduct", #{"key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
FirstCheckId = "first_check_id",
%% First-time event
td_analytics:track_first_instance(TE_SDK, "account_id_Erlang", "distinct_id", "first_login", FirstCheckId, #{"key1" => "value1", "key2" => "value2"}),
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
EventName = "event_name",
EventId = "event_id",
%% After reporting, event property status is 3, price is 100
td_analytics:track_update_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"price" => 100, "status" => 3}),

%% After reporting, event property status is 5, price is 100 unchanged
td_analytics:track_update_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"status" => 5}),
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
EventName = "overWrite_event",
EventId = "event_id",
%% After reporting, event property price is 100, status is 5
td_analytics:track_overwrite_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"price" => 100, "status" => 5}),

%% After reporting, event property price is 20, status property is deleted
td_analytics:track_overwrite_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"price" => 20}),
```

### 2. User Properties

TE platform supports the following user property setting APIs: `user_set_instance`, `user_set_once_instance`, `user_add_instance`, `user_unset_instance`, `user_del_instance`, `user_append_instance`, `user_unique_append_instance`.

#### 2.1 user_set_instance

For general user properties, you can call `user_set_instance` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
%% "name" is "A"
td_analytics:user_set_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "A", "abc" => ["a", "b", "c"]}),
%% "name" is "B"
td_analytics:user_set_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "B", "abc" => ["a", "b", "c"]}),
```

#### 2.2 user_set_once_instance

If you want to set a user property only once, you can call `user_set_once_instance`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
%% "name" is "A"
td_analytics:user_set_once_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "A"}),
%% "name" is still "A"
td_analytics:user_set_once_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "B"}),
```

#### 2.3 user_add_instance

When you want to upload numeric properties, you can call `user_add` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
%% "amount" is 30
td_analytics:user_add_instance(TE_SDK, "account_id", "distinct_id", #{"amount" => 30}),
%% "amount" is 90
td_analytics:user_add_instance(TE_SDK, "account_id", "distinct_id", #{"amount" => 60}),
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 user_append_instance

You can call `user_append_instance` to append array-type user properties.

```
%% "array" is ["arr1", "arr3"]
td_analytics:user_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr1", "arr3"]}),
%% "array" is ["arr1", "arr3", "arr2", "arr3"]
td_analytics:user_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr2", "arr3"]}),
```

#### 2.5 user_unique_append_instance

You can call `user_unique_append_instance` to append array-type user properties. The `user_unique_append_instance` interface will deduplicate appended user properties, while `user_append_instance` interface does not deduplicate, allowing duplicate user properties.

```
%% "array" is ["arr1", "arr3"]
td_analytics:user_unique_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr1", "arr3"]}),
%% "array" is ["arr1", "arr3", "arr2"]
td_analytics:user_unique_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr2", "arr3"]}),
```

#### 2.6 user_unset_instance

When you want to clear user property values, you can call `user_unset_instance` to clear specified properties. If the property has not been created in the cluster, `user_unset_instance` will not create the property.

```
td_analytics:user_unset_instance(TE_SDK, "account_id", "distinct_id", ["age", "abc"]),
```

user_unset_instance: The parameter is the Key value of the property to be cleared.

#### 2.7 user_del_instance

If you want to delete a user, you can call `user_del_instance` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
td_analytics:user_del_instance(TE_SDK, "account_id", "distinct_id"),
```

---

# Real-time Debugging

::: warning Note

SDK Debug mode is only for integration debugging. Do not use in production environment.

:::

During SDK integration, you can use TE's Debug feature for real-time debugging. Enabling Debug feature requires two steps:

1. Use DebugConsumer
   Here is sample code using DebugConsumer:

```
%% Configure report address
ServerUrl = "server_url",
%% Configure app_id
AppID = "app_id",
%% Configure whether to write to database
IsWrite = true,
%% Configure device_id, used to view reported data in TE backend in real-time
DeviceId = "123456789",

%% init consumer
Consumer = td_debug_consumer:init_with_config(ServerUrl, AppID, IsWrite, DeviceId),
%% init SDK with consumer
TE_SDK = td_analytics:init_with_consumer(Consumer),

AccountId0 = "account_id_Erlang_0",

%% ordinary event
td_analytics:track_instance(TE_SDK, AccountId0, "distinct_logbus", "ViewProduct", #{"#key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),

%% Call when closing SDK. If closed and need to restart SDK, must re-execute initialization code above.
td_analytics:close_instance(TE_SDK).
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for Erlang SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
