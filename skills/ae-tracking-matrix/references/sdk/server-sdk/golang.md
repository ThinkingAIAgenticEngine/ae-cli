---
code: golang_sdk_installation
name: "Golang"
wikiToken: LopRwvKpWiKdXdkB9YSck9ImnVf
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1745310918000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=golang_sdk_installation
---

# Golang

::: tip Note

Before integration, please read the Pre-Integration Guide first.

:::

**Latest Version**: v2.1.0

**Update Date**: 2024-12-19

**Download**: Source Code

::: warning Note

This document applies to v2.0.0 and later versions. For historical versions, please refer to Go SDK Integration Guide (V1).

:::

### 1. SDK Integration

1. We provide two options for SDK integration:
   Option 1: Run the following command to get the latest Golang SDK

```
# Get SDK
go get github.com/ThinkingDataAnalytics/go-sdk/v2

# Update SDK
go get -u github.com/ThinkingDataAnalytics/go-sdk/v2
```

Option 2: Module Mode

```
// Import thinkingdata at the beginning of code file
import "github.com/ThinkingDataAnalytics/go-sdk/v2/src/thinkingdata"

# Pull latest SDK module
go mod tidy
```

2. Install LogBus
   We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
// Create LogConfig configuration file
config := thinkingdata.TDLogConsumerConfig {
    FileNamePrefix: "test_prefix", // log file prefix
    Directory: "LOG_DIRECTORY", // Event collection file path
}
// Initialize logConsumer
consumer, _ := thinkingdata.NewLogConsumerWithConfig(config)
// Create te object
te := thinkingdata.New(consumer)
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder address to this address to use LogBus for data monitoring and uploading.

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
accountId := "te_account_id"
distinctId := "te_distinct_id"// accountId and distinctId cannot both be empty
properties := map[string]interface{}{
   // Set user IP address, TE system will parse user geographic location based on IP
   "#ip":       "123.123.123.123",
   "channel":   "te",       // String
   "age":       1,          // Number
   "is_success": true,       // Boolean
   "birthday":  time.Now(), // Date
   // Object
   "object": map[string]interface{}{
      "key": "value",
   },
   // Object Array
   "objectArr": []interface{}{
      map[string]interface{}{
         "key": "value",
      },
   },
   "arr":     []string{"value"}, // Array
}
// track event
err := te.Track(accountId, distinctId, "payment", properties)
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `UserSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
// At this point, username is "TA"
err := te.UserSet("accountId", "distinctId", map[string]interface{}{
   "user_name": "TA",
})
// At this point, username is "TE"
err = te.UserSet("accountId", "distinctId", map[string]interface{}{
   "user_name": "TE",
})
```

#### 3.3 Data Reporting

When using TDLogConsumer, SDK will write collected data to disk in real-time.

The `Flush()` method of `TDAnalytics` object internally synchronizes the default memory cache in the file system to disk in real-time. Generally, you don't need to manually call the `Flush()` method.

#### 3.4 Close SDK

```
// Close and exit SDK
te.Close()
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
// Create LogConfig configuration file
config := thinkingdata.TDLogConsumerConfig {
    Directory: "./log_directory", // Event collection file path
}
// Initialize logConsumer
consumer, _ := thinkingdata.NewLogConsumerWithConfig(config)
// Create te object
te := thinkingdata.New(consumer)

accountId := "te_account_id"
distinctId := "te_distinct_id"// accountId and distinctId cannot both be empty
properties := map[string]interface{}{
    // Set user IP address, TE system will parse user geographic location based on IP
    "#ip":       "123.123.123.123",
    "channel":   "te",       // String
    "age":       1,          // Number
    "isSuccess": true,       // Boolean
    "birthday":  time.Now(), // Date
    // Object
    "object": map[string]interface{}{
       "key": "value",
    },
    // Object Array
    "objectArr": []interface{}{
       map[string]interface{}{
          "key": "value",
       },
    },
    "arr":     []string{"value"}, // Array
}
// Upload event
err := te.Track(accountId, distinctId, "payment", properties)
if err != nil {
    fmt.Println(err)
}
// Set user properties
err = te.UserSet("accountId", "distinctId", map[string]interface{}{
    "user_name": "TE",
})
if err != nil {
    fmt.Println(err)
}
```

---

# Advanced Guide

### 1. Track Events

After SDK initialization, you can perform data tracking to collect user behavior information. Generally, regular events can meet business scenario requirements. You can also use first-time events, updateable events, etc. based on your actual business scenarios.

#### 1.1 Regular Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is an example of a user purchasing a product:

```
// Set event properties
properties := map[string]interface{}{
    "product_name": "Product Name",
}
// Report event named product_buy. account_id and distinct_id cannot both be empty
te.Track("account_id", "distinct_id", "product_buy", properties)
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
// Report first-time event, event name is device_activation, first_check_id value is first_event_flag
properties := map[string]interface{}{
    "prop_string": "value",
}
err := te.TrackFirst("account_id", "distinct_id", "device_activation", "first_event_flag", properties)
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
// Report updateable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
properties := make(map[string]interface{})
properties["status"] = 3
properties["price"] = 100
err := te.TrackUpdate("account_id", "distinct_id", "UPDATABLE_EVENT", "test_event_id", properties)
propertiesNew := make(map[string]interface{})
propertiesNew["status"] = 5

// After reporting, event property status is updated to 5, price unchanged
err = te.TrackUpdate("account_id", "distinct_id", "UPDATABLE_EVENT", "test_event_id", propertiesNew)
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
// Report overwriteable event, event name is OVERWRITE_EVENT
// After reporting, event property status is 3, price is 100
properties := make(map[string]interface{})
properties["status"] = 3
properties["price"] = 100
err := te.TrackOverwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "test_event_id", properties)

// After reporting, event property status is updated to 5, price property is deleted
propertiesNew := make(map[string]interface{})
propertiesNew["status"] = 5
err = te.TrackOverwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "test_event_id", propertiesNew)
```

### 2. User Properties

TE platform supports the following user property setting APIs: `UserSet`, `UserSetOnce`, `UserAdd`, `UserDelete`, `UserUnset`, `UserAppend`, `UserUniqAppend`.

#### 2.1 UserSet

For general user properties, you can call `UserSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
// At this point, userName is "TA"
err := te.UserSet("account_id", "distinct_id", map[string]interface{}{
    "user_name": "TA",
})
// At this point, userName is "TE"
err = te.UserSet("account_id", "distinct_id", map[string]interface{}{
    "user_name": "TE",
})
```

#### 2.2 UserSetOnce

If you want to set a user property only once, you can call `UserSetOnce`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
// first_payment_time is 2018-01-01 01:23:45.678
err := te.UserSetOnce("account_id", "distinct_id", map[string]interface{}{
    "first_payment_time":"2018-01-01 01:23:45.678",
})

// first_payment_time is still 2018-01-01 01:23:45.678
err = te.UserSetOnce("account_id", "distinct_id", map[string]interface{}{
    "first_payment_time":"2018-12-31 01:23:45.678",
})
```

#### 2.3 UserAdd

When you want to upload numeric properties, you can call `UserAdd` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
// Upload user property, at this point "total_revenue" value is 30
err := te.UserAdd("account_id", "distinct_id", map[string]interface{}{
    "total_revenue":30,
})
// Upload user property again, at this point "total_revenue" value accumulates to 678
err = te.UserAdd("account_id", "distinct_id", map[string]interface{}{
    "total_revenue":648,
})
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 UserAppend

You can call `UserAppend` to append array-type user properties.

```
// At this point, user_list property value is ["apple", "ball"]
err := te.UserAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "ball"},
})
```

#### 2.5 UserUniqAppend

From v1.6.0 version onwards, you can call `UserUniqAppend` to append array-type user properties. The `UserUniqAppend` interface will deduplicate appended user properties, while `UserAppend` interface does not deduplicate, allowing duplicate user properties.

```
// in this case, the property value of user_list is ["apple", "ball"]
err := te.UserAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "ball"},
})
// in this case, the property value of user_list is ["apple","apple","ball","cube"]
err = te.UserAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "cube"},
})
// in this case, the property value of user_list is ["apple", "ball","cube"]
err = te.UserUniqAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "cube"},
})
```

#### 2.6 UserUnset

When you want to clear user property values, you can call `UserUnset` to clear specified properties. If the property has not been created in the cluster, `UserUnset` will not create the property.

```
// Clear specific user property of a user, pass property name in parameter
err := te.UserUnset("account_id"," distinct_id", property_name)
```

UserUnset: The parameter is the Key value of the property to be cleared.

#### 2.7 UserDelete

If you want to delete a user, you can call `UserDelete` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
err := te.UserDelete("account_id", "distinct_id")
```

### 3. Other Features

#### 3.1 BatchConsumer

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools.

```
consumer, err := thinkingdata.NewBatchConsumer("SERVER_URL", "APP_ID")
te := thinkingdata.New(consumer)
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

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Print SDK Logs

```
// enable log
thinkingdata.SetLogLevel(thinkingdata.TDLogLevelDebug)
```

### 2. Enable Debug Mode

Enabling Debug mode requires two steps:

1. Use TDDebugConsumer
   Here is sample code using TDDebugConsumer:

```
// Create Debug Consumer
consumer, _ := thinkingdata.NewDebugConsumerWithDeviceId("url", "appid", false, "deviceId")
te := thinkingdata.New(consumer)
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for Golang SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
