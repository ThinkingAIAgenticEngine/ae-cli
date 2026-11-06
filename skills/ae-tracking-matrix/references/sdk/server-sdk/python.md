---
code: python_sdk_installation
name: "Python"
wikiToken: HsQ2wYZDripMsZkFc2wcz2Zhn06
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1745310930000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=python_sdk_installation
---

# Python

This guide will introduce how to use Python SDK to integrate into your project.

**Latest Version**: v3.0.0

**Update Date**: 2023-10-07

**Download**: Source Code

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to Python SDK Integration Guide (V2).

:::

### 1. SDK Integration

1. Get Python SDK via `pip`

```
pip install ThinkingDataSdk
```

Upgrade command:

```
pip install --upgrade ThinkingDataSdk
```

2. Install LogBus
   We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
from tgasdk.sdk import *

consumer = TDLogConsumer("LOG_DIRECTORY", rotate_mode=TD_ROTATE_MODE.HOURLY, file_prefix="LOG_FILE_PREFIX")
te = TDAnalytics(consumer)
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder address to this address to use LogBus for data monitoring and uploading.

`LOG_FILE_PREFIX` is the prefix for log file names.

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
distinct_id = "ABCDEF123456"
account_id = "TE10001"
properties = {
    "#time": datetime.datetime.now(),
    # Set event occurrence time, if not set, defaults to current time
    "#ip": "192.168.1.1",
    # Set user IP, TDA will automatically parse province and city based on IP
    # "#uuid":uuid.uuid1(),# Optional, if enable_uuid switch is on above, no need to fill
    "Product_Name": "Product Name",
    "Price": 30,
    "OrderId": "Order ID abc_123"
}
# Upload event, including account ID and visitor ID
try:
    te.track(distinct_id, account_id, "Payment", properties)
    # You can also upload only visitor ID
    # te.track(distinct_id = distinct_id, event_name = "Payment", properties = properties)
    # Or upload only account ID
    # te.track(account_id = account_id, event_name = "Payment", properties = properties)
except Exception as e:
    # Exception handling
    print(e)
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
properties = {"user_name": "ABC"}
# Upload user property, "user_name" value is "ABC"
try:
    te.user_set(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    print(e)
```

#### 3.3 Data Reporting

When using TDLogConsumer, collected events are first converted to JSON strings and added to a cache array. Data is written to disk only when the array element count exceeds the set capacity. Default capacity limit is 5 data items. You can set buffer_size in TDLogConsumer constructor.

In certain business scenarios, if you want data to be reported to the TE server immediately, you can call the `flush()` interface. Note that frequent calls to `flush()` will cause service performance degradation.

```
te.flush();
```

#### 3.4 Close SDK

```
te.close()
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
from tgasdk.sdk import *

# Initialize SDK
te = TDAnalytics(TDLogConsumer("LOG_DIRECTORY"))

# Upload event, account ID and visitor ID cannot both be empty
properties = {
    "#time": datetime.datetime.now(),  # Set event occurrence time, if not set, defaults to current time
    "#ip": "192.168.1.1",  # Set user IP, TDA will automatically parse province and city based on IP
    "Product_Name": "Product Name"
}
try:
    te.track("distinct_id", "account_id", "Payment", properties)
except Exception as e:
    # Exception handling
    print(e)

# Upload user property, "user_name" value is "ABC"
user_properties = {"user_name": "ABC"}
try:
    te.user_set(account_id="account_id", distinct_id="distinct_id", properties=user_properties)
except Exception as e:
    # Exception handling
    print(e)

# Calling flush interface will immediately write data to file. In production environment, avoid frequent flush calls to prevent IO or network overhead issues
te.flush()
```

---

# Advanced Guide

### 1. Track Events

After SDK initialization, you can perform data tracking to collect user behavior information. Generally, regular events can meet business scenario requirements. You can also use first-time events, updateable events, etc. based on your actual business scenarios.

#### 1.1 Regular Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is an example of a user purchasing a product:

```
distinct_id = "ABCDEF123456"
account_id = "TE10001"
properties = {
    "#time": datetime.datetime.now(),
    # Set event occurrence time, if not set, defaults to current time
    "#ip": "192.168.1.1",
    # Set user IP, TDA will automatically parse province and city based on IP
    # "#uuid":uuid.uuid1(),# Optional, if enable_uuid switch is on above, no need to fill
    "Product_Name": "Product Name",
    "Price": 30,
    "OrderId": "Order ID abc_123"
}

# Upload event, including account ID and visitor ID
try:
    te.track(distinct_id, account_id, "Payment", properties)
    # You can also upload only visitor ID
    # te.track(distinct_id = distinct_id, event_name = "Payment", properties = properties)
    # Or upload only account ID
    # te.track(account_id = account_id, event_name = "Payment", properties = properties)
except Exception as e:
    # Exception handling
    print(e)
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
# Call first-time event
try:
    properties = {'name': 'hello'}
    te.track_first(account_id="account_id", distinct_id="distinct_id", event_name='first_event', first_check_id='first_flag_id', properties=properties)
except Exception as e:
    # Exception handling
    raise TDIllegalDataException(e)
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
# Example: Report updateable event, assuming event name is UPDATABLE_EVENT
distinct_id = "65478cc0-275a-4aeb-9e6b-861155b5aca7"
account_id = "123"
event_name = "UPDATABLE_EVENT"
event_id = "123"
properties = {
    "price": 100,
    "status": 3
}
# After reporting, event property status is 3, price is 100
te.track_update(distinct_id=distinct_id, account_id=account_id, event_name=event_name, event_id=event_id,
                properties=properties)

# After reporting, same event_name + event_id property status is updated to 5, price unchanged
new_properties = {
    "status": 5
}
te.track_update(distinct_id=distinct_id, account_id=account_id, event_name=event_name, event_id=event_id,
                properties=new_properties)
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
# Example: Report overwriteable event, assuming event name is OVERWRITE_EVENT
distinct_id = "65478cc0-275a-4aeb-9e6b-861155b5aca7"
account_id = "123"
event_name = "OVERWRITE_EVENT"
event_id = "123"
properties = {
    "price": 100,
    "status": 3
}
# After reporting, event property status is 3, price is 100
te.track_overwrite(distinct_id=distinct_id, account_id=account_id, event_name=event_name, event_id=event_id,
                   properties=properties)

# After reporting, event property status is updated to 5, price property is deleted
new_properties = {
    "status": 5
}
te.track_overwrite(distinct_id=distinct_id, account_id=account_id, event_name=event_name, event_id=event_id,
                   properties=new_properties)
```

### 2. User Properties

TE platform supports the following user property setting APIs: `user_set`, `user_setOnce`, `user_add`, `user_unset`, `user_del`, `user_append`, `user_uniq_append`.

#### 2.1 user_set

For general user properties, you can call `user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
properties = {"user_name": "ABC"}
# Upload user property, "user_name" value is "ABC"
try:
    te.user_set(account_id="account_id", distinct_id="distinct_id", properties=properties)
    properties = {"user_name": "XYZ"}
    # Upload user property again, at this point "user_name" value is overwritten to "XYZ"
    te.user_set(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    print(e)
```

#### 2.2 user_setOnce

If you want to set a user property only once, you can call `user_setOnce`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
properties = {"user_name": "ABC"}
# Upload user property, "user_name" value is "ABC"
try:
    te.user_setOnce(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    print(e)
properties = {
    "user_name": "XYZ",
    "user_age": 18
}
# Upload user property again, at this point "user_name" already has value, so no modification, still "ABC"; "user_age" value is 18
try:
    te.user_setOnce(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    print(e)
```

#### 2.3 user_add

When you want to upload numeric properties, you can call `user_add` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
properties = {
    "total_revenue": 30,
    "vip_level": 1
}
# Upload user property, at this point "total_revenue" value is 30, "vip_level" value is 1
te.user_add(account_id="account_id", distinct_id="distinct_id", properties=properties)

properties = {"total_revenue": 90}
# Upload user property, at this point "total_revenue" value is 90, "vip_level" value is 1
try:
    te.user_add(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    print(e)
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 user_append

You can call `user_append` to append array-type user properties.

```
list1 = ['Google']
# Append array-type properties for arrKey1, arrKey2
properties = {'arrKey1': list1, 'arrKey2': ['11', '22']}
try:
    te.user_append(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    print(e)
```

#### 2.5 user_uniq_append

You can call `user_uniq_append` to append array-type user properties. The `user_uniq_append` interface will deduplicate appended user properties, while `user_append` interface does not deduplicate, allowing duplicate user properties.

```
arrayValue = ['Google', 'True', '2.222']
properties = {'arrKey4': arrayValue, 'arrKey3': ['appendList', '222'], 'dict1': {'name': 'Tom', 'Age': 28}}
try:
    # After execution, user property arrKey4 is ['Google', True, 2.222], arrKey3 is ['appendList', '222']
    te.user_append(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    raise TDIllegalDataException(e)

properties = {'arrKey4': ['addValue', 'True'], 'arrKey3': ['appendList', '222']}
try:
    # After execution, user property arrKey4 is ['Google', True, 2.222, 'addValue'], arrKey3 is ['appendList', '222']
    te.user_uniq_append(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    # Exception handling
    raise TDIllegalDataException(e)
```

#### 2.6 user_unset

When you want to clear user property values, you can call `user_unset` to clear specified properties. If the property has not been created in the cluster, `user_unset` will not create the property.

```
try:
    te.user_unset("distinct_id", "account_id", ["string1", "lastTime"])
except Exception as e:
    # Exception handling
    print(e)
```

user_unset: The parameter is the Key value of the property to be cleared.

#### 2.7 user_del

If you want to delete a user, you can call `user_del` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
try:
    te.user_del(account_id="account_id", distinct_id="distinct_id")
except Exception as e:
    # Exception handling
    print(e)
```

### 3. Other Features

#### 3.1 TDBatchConsumer

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools.

```
te = TDAnalytics(TDBatchConsumer("SERVER_URL", "APP_ID"))
```

Parameter Description:

- `APP_ID`: Your project's APP ID, can be obtained from TE backend project management page
- `SERVER_URL`: Data upload URL
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you use private deployment version, please bind domain for data collection address and configure HTTPS certificate: https://YOUR_DATA_COLLECTION_DOMAIN

---

# Real-time Debugging

::: warning Note

SDK Debug mode is only for integration debugging. Do not use in production environment.

:::

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Print SDK Logs

```
TDAnalytics.enableLog(isPrint=True)
```

### 2. Real-time Debugging

During SDK integration, you can use TE's Debug feature for real-time debugging. Enabling Debug feature requires two steps:

1. Use TDDebugConsumer
   Here is sample code using TDDebugConsumer:

```
te = TDAnalytics(TDDebugConsumer("https://receiver-ta-demo.thinkingdata.cn", "appId", device_id="123456789"))
distinct_id = "ABD"
account_id = "11111"
try:
    te.track(account_id=account_id, event_name='event_name', properties={'level': 0})
except Exception as e:
    print(e)
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for Python SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
