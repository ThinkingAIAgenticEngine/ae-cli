---
code: ruby_sdk_installation
name: "Ruby"
wikiToken: JQwMwwgRviGugBklAUJcBSSjnng
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1745310924000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=ruby_sdk_installation
---

# Ruby

This guide will introduce how to use Ruby SDK to integrate into your project.

**Latest Version**: v2.0.0

**Update Date**: 2023-10-08

**Download**: Source Code

::: warning Note

This document applies to v2.0.0 and later versions. For historical versions, please refer to Ruby SDK Integration Guide (V1).

:::

### 1. SDK Integration

1. Use `gem` command to integrate SDK package

```
# Get SDK
gem install thinkingdata-ruby
```

2. Install LogBus
   We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
require 'thinkingdata-ruby'

consumer = ThinkingData::TDLoggerConsumer.new("LOG_DIRECTORY")
ta = ThinkingData::TDAnalytics.new(consumer)
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder address to this address to use LogBus for data monitoring and uploading.

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}

ta.track(event_name: 'test_event', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: properties)
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

user_data = {
  array: ["str1", 11, 22.22],
  prop_date: Time.now,
  prop_double: 134.12,
  prop_string: 'hello',
  prop_int: 666,
}
ta.user_set(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_data)
```

#### 3.3 Data Reporting

When using TDLoggerConsumer, SDK will write collected data to disk in real-time. No need to call `flush()` method.

#### 3.4 Close SDK

```
# Close and exit SDK
ta.close
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
ThinkingData::set_stringent(false)
ThinkingData::set_enable_log(false)

consumer = ThinkingData::TDLoggerConsumer.new( 'LOG_DIRECTORY', 'hourly')
ta = ThinkingData::TDAnalytics.new(consumer, my_error_handler, uuid: true)

DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}

ta.track(event_name: 'test_event', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: properties)

user_data = {
  array: ["str1", 11, 22.22],
  prop_date: Time.now,
  prop_double: 134.12,
  prop_string: 'hello',
  prop_int: 666,
}
ta.user_set(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_data)

user_append_data = {
  array: %w[33 44]
}
ta.user_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_append_data)

user_uniq_append_data = {
  array: %w[44 55]
}
ta.user_uniq_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_uniq_append_data)

user_set_once_data = {
  prop_int_new: 888,
}
ta.user_set_once(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_set_once_data)

ta.user_add(distinct_id: DEMO_DISTINCT_ID, properties: {prop_int: 10, prop_double: 15.88})

ta.user_unset(distinct_id: DEMO_DISTINCT_ID, property: [:prop_string, :prop_int])

ta.user_del(distinct_id: DEMO_DISTINCT_ID)
```

---

# Advanced Guide

### 1. Track Events

After SDK initialization, you can perform data tracking to collect user behavior information. Generally, regular events can meet business scenario requirements. You can also use first-time events, updateable events, etc. based on your actual business scenarios.

#### 1.1 Regular Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is an example of a user purchasing a product:

```
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}

ta.track(event_name: 'test_event', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: properties)
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}
ta.track(event_name: 'test_event', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, first_check_id:'first_id', properties: properties)
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}
ta.track_update(event_name: 'update', event_id: 'id123', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties:properties)
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}
ta.track_overwrite(event_name: 'update', event_id: 'id123', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties:properties)
```

### 2. User Properties

TE platform supports the following user property setting APIs: `user_set`, `user_set_once`, `user_add`, `user_unset`, `user_del`, `user_append`, `user_uniq_append`.

#### 2.1 user_set

For general user properties, you can call `user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

user_data = {
  array: ["str1", 11, 22.22],
  prop_double: 134.12,
  prop_string: 'hello',
  prop_int: 666,
}
ta.user_set(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_data)
```

#### 2.2 user_set_once

If you want to set a user property only once, you can call `user_set_once`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
user_set_once_data = {
  prop_int_new: 888,
}
ta.user_set_once(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_set_once_data)
```

#### 2.3 user_add

When you want to upload numeric properties, you can call `user_add` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
# Accumulate numeric type properties
ta.user_add(distinct_id: DEMO_DISTINCT_ID, properties: {prop_int: 10, prop_double: 15.88})
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 user_append

You can call `user_append` to append array-type user properties.

```
user_append_data = {
  array: %w[33 44]
}
ta.user_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_append_data)

user_append_data_new = {
  array: %w[44 55]
}
ta.user_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_append_data_new)
```

#### 2.5 user_uniq_append

You can call `user_uniq_append` to append array-type user properties. The `user_uniq_append` interface will deduplicate appended user properties, while `user_append` interface does not deduplicate, allowing duplicate user properties.

```
user_append_data = {
  array: %w[33 44]
}
ta.user_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_append_data)

user_uniq_append_data = {
  array: %w[44 55]
}
ta.user_uniq_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_uniq_append_data)
```

#### 2.6 user_unset

When you want to clear user property values, you can call `user_unset` to clear specified properties. If the property has not been created in the cluster, `user_unset` will not create the property.

```
ta.user_unset(distinct_id: DEMO_DISTINCT_ID, property: [:prop_string, :prop_int])
```

user_unset: The parameter is the Key value of the property to be cleared.

#### 2.7 user_del

If you want to delete a user, you can call `user_del` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
ta.user_del(distinct_id: DEMO_DISTINCT_ID)
```

### 3. Other Features

#### 3.1 TDBatchConsumer

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools.

```
consumer = ThinkingData::TDBatchConsumer.new('SERVER_URL', 'APPID', 30)
ta = ThinkingData::TDAnalytics.new(consumer)

DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}

ta.track(event_name: 'test_event', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: properties)
```

Parameter Description:

- `APPID`: Your project's APP ID, can be obtained from TE backend project management page
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
ThinkingData::set_enable_log(true)
```

### Debug Mode Data Validation

During SDK integration, you can use TE's Debug feature for real-time debugging. Enabling Debug feature requires two steps:

1. Use TDDebugConsumer
   Here is sample code using TDDebugConsumer:

```
consumer = ThinkingData::TDDebugConsumer.new('SERVER_URL', 'APPID', device_id: "123456789")
te = ThinkingData::TDAnalytics.new(consumer)

DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}

ta.track(event_name: 'test_event', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: properties)
```

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for Ruby SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
