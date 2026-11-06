---
code: java_sdk_installation
name: "Java"
wikiToken: SMGDw5xMCiGynekTD0ccp9OJnQd
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1767773958000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=java_sdk_installation
---

# Java

::: tip Note

Before integration, please read the Pre-Integration Guide first.

Java SDK minimum compatibility: JDK 8

:::

**Latest Version**: v3.0.4-beta.1

**Update Date**: 2026-01-07

**Download**: Source Code

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to Java SDK Integration Guide (V2).

The SDK API is thread-safe and defaults to synchronous calls. When reporting large amounts of data, you can call the API in a sub-thread to avoid affecting business threads.

:::

### 1. SDK Integration

1. To integrate SDK using Maven, add the following dependency information in your `pom.xml` file:

```
<dependencies>
    // others...
    <dependency>
        <groupId>cn.thinkingdata</groupId>
        <artifactId>thinkingdatasdk</artifactId>
        <version>3.0.2</version>
    </dependency>
</dependencies>
```

2. Install LogBus

We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

#### Method 1

```
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), false);
```

`LOG_DIRECTORY` is the folder path where data is written.

#### Method 2

The SDK supports passing configuration for initialization. You can finely control SDK functionality through configuration. For example, you can add a prefix to log files.

```
TDLoggerConsumer.Config config = new TDLoggerConsumer.Config("LOG_DIRECTORY");
config.setFilenamePrefix("unique_name");
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer(config), false);
```

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
// Set event properties
HashMap<String,Object> properties = new HashMap<>();
// Set user IP address, TE system will parse user geographic location based on IP
properties.put("#ip", "192.168.1.1");// String
properties.put("channel","te");// String
properties.put("age",1);// Number
properties.put("isSuccess",true);// Boolean
properties.put("birthday",new Date());// Date

HashMap<String,Object>  object = new HashMap<>();
object.put("key", "value");
properties.put("object",object);// Object

HashMap<String,Object> object1 = new HashMap<>();
object1.put("key", "value");

ArrayList<Object> arr = new ArrayList<>();
arr.add(object1);
properties.put("object_arr",arr);// Object Array

ArrayList<String> arr1 = new ArrayList<>();
arr1.add("value");
properties.put("arr",arr1);// Array

try {
    te.track("account_id","distinct_id","payment",properties);
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
// At this point, username is "TA"
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("user_name", "TA");
try {
   te.userSet("account_id","distinct_id",userProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
}

// At this point, userName is "TE"
Map<String,Object> newUserProperties = new HashMap<String,Object>();
newUserProperties.put("user_name", "TE");
try {
   te.userSet("account_id","distinct_id",newUserProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
}
```

#### 3.3 Data Reporting

When using TDLogConsumer, collected events are first encoded into JSON strings and added to cache. Data is written to disk only when the cache string length exceeds the set length. Default maximum length is 8192 bytes.

In certain business scenarios, if you want data to be reported to the TE server immediately, you can call the `flush()` interface. Note that frequent calls to `flush()` will cause service performance degradation.

```
te.flush();
```

#### 3.4 Close SDK

```
try{
   te.close();
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
// Initialize SDK, LOG_DIRECTORY is the local folder address for writing
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), false);

// Set event properties
HashMap<String,Object> properties = new HashMap<>();
// Set user IP address, TE system will parse user geographic location based on IP
properties.put("#ip", "192.168.1.1");// String
properties.put("channel","te");// String
properties.put("age",1);// Number
properties.put("isSuccess",true);// Boolean
properties.put("birthday",new Date());// Date

HashMap<String,Object>  object = new HashMap<>();
object.put("key", "value");
properties.put("object",object);// Object

HashMap<String,Object> object1 = new HashMap<>();
object1.put("key", "value");

ArrayList<Object> arr = new ArrayList<>();
arr.add(object1);
properties.put("object_arr",arr);// Object Array

ArrayList<String> arr1 = new ArrayList<>();
arr1.add("value");
properties.put("arr",arr1);// Array

try {
    te.track("account_id","distinct_id","payment",properties);
} catch (Exception e) {
    System.out.println("except:"+e);
}

// Set user properties
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("user_name", "TE");
try {
   te.userSet("account_id","distinct_id",userProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
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
Map<String,Object> properties = new HashMap<String,Object>();
properties.put("product_name","Product Name");// String
try {
     te.track("account_id","distinct_id","product_buy",properties);
} catch (Exception e) {
     System.out.println("except:"+e);
}
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event. To use the "first-time event verification" feature, you must set the `#first_check_id` field in properties, with type as string.

```
// Report first-time event, event name is "device_activation", first_check_id value is "device_id"
Map<String, Object> properties = new HashMap<>();
properties.put("price",100);
properties.put("status",3);
properties.put("#first_check_id","device_id");
te.trackFirst("account_id", "distinct_id", "device_activation", properties);
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
// Report updateable event, event name is "UPDATABLE_EVENT"
// After reporting, event property status is 3, price is 100
Map<String, Object> properties = new HashMap<>();
properties.put("price",100);
properties.put("status",3);
te.trackUpdate("account_id","distinct_id","UPDATABLE_EVENT","test_event_id",properties);

// After reporting, the same event property status is updated to 5, price unchanged
Map<String, Object> protertiesNew = new HashMap<>();
protertiesNew.put("status",5);
te.trackUpdate("account_id", "distinct_id", "UPDATABLE_EVENT", "test_event_id", protertiesNew);
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
// Report overwriteable event, event name is "OVERWRITE_EVENT"
// After reporting, event property status is 3, price is 100
Map<String, Object> properties = new HashMap<>();
properties.put("price",100);
properties.put("status",3);
te.trackOverwrite("account_id","distinct_id", "OVERWRITE_EVENT","test_event_id", properties);

// After reporting, event property status is updated to 5, price property is deleted
Map<String, Object> protertiesNew = new HashMap<>();
protertiesNew.put("status",5);
te.trackOverwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "test_event_id", protertiesNew);
```

### 2. User Properties

TE platform supports the following user property setting APIs: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 2.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
// At this point, userName is "TA"
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("user_name", "TA");
try {
   te.userSet("account_id","distinct_id",userProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
}

// At this point, userName is "TE"
Map<String,Object> newUserProperties = new HashMap<String,Object>();
newUserProperties.put("user_name", "TE");
try {
   te.userSet("account_id","distinct_id",newUserProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
 }
```

#### 2.2 userSetOnce

If you want to set a user property only once, you can call `userSetOnce`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
// first_payment_time is 2018-01-01 01:23:45.678
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("first_payment_time","2018-01-01 01:23:45.678");
try {
     te.userSetOnce("account_id","distinct_id",userProperties);
} catch (Exception e) {
     System.out.println("except:"+e);
 }

// first_payment_time is still 2018-01-01 01:23:45.678
Map<String,Object> newUserProperties = new HashMap<String,Object>();
newUserProperties.put("first_payment_time","2018-12-31 01:23:45.678");
try {
     te.userSetOnce("account_id","distinct_id",newUserProperties);
} catch (Exception e) {
     System.out.println("except:"+e);
}
```

#### 2.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("total_revenue",30);
// Upload user property, at this point "total_revenue" value is 30
try {
     te.userAdd("account_id","distinct_id",userProperties);
} catch (Exception e) {
     System.out.println("except:"+e);
 }

// Upload user property again, at this point "total_revenue" value accumulates to 678
Map<String,Object> newUserProperties = new HashMap<String,Object>();
newUserProperties.put("total_revenue",648);
try {
    te.userAdd("account_id","distinct_id",newUserProperties);
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 userAppend

You can call `userAppend` to append array-type user properties.

```
Map<String,Object> properties = new HashMap<String,Object>();
List<String> list = new ArrayList<>();
list.add("apple");
list.add("ball");
properties.put("user_list",list);
 try{
    // At this point, user_list property value is ["apple", "ball"]
    te.userAppend("account_id", "distinct_id", properties);
 } catch (Exception e) {
    System.out.println("except:"+e);
 }
```

#### 2.5 userUniqAppend

You can call `userUniqAppend` to append array-type user properties. The `userUniqAppend` interface will deduplicate appended user properties, while `userAppend` interface does not deduplicate, allowing duplicate user properties.

```
Map<String,Object> properties = new HashMap<String,Object>();
List<String> list = new ArrayList<>();
list.add("apple");
list.add("ball");
properties.put("user_list",list);

Map<String,Object> newProperties = new HashMap<String,Object>();
List<String> newList = new ArrayList<>();
newList.add("apple");
newList.add("cube");
newProperties.put("user_list", newList);
try{
   // At this point, user_list property value is ["apple", "ball"]
   te.userAppend("account_id", "distinct_id", properties);
   // At this point, user_list property value is ["apple","apple","ball","cube"]
   te.userAppend("account_id", "distinct_id",newProperties);
   // At this point, user_list property value is ["apple", "ball","cube"]
   te.userUniqAppend("account_id", "distinct_id",newProperties);
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

#### 2.6 userUnset

When you want to clear user property values, you can call `userUnset` to clear specified properties. If the property has not been created in the cluster, `userUnset` will not create the property.

```
// Reset multiple user properties
try {
    te.userUnset("account_id", "distinct_id", "key1", "key2", "key3");
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

user_unset: The parameter is the Key value of the property to be cleared.

#### 2.7 userDelete

If you want to delete a user, you can call `userDelete` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
try{
   te.userDelete("account_id","distinct_id");
} catch (Exception e) {
   System.out.println("except:"+e);
}
```

### 3. Other Features

#### 3.1 TDBatchConsumer

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools. When transmission fails due to network issues, it will retry 3 times. If still fails, data will be stored in cache buffer. Cache buffer size can be set, default 50, meaning maximum cached data count is 50\*20 (20 is batch value for each upload, configurable).

```
TDAnalytics te = null;
try {
    te = new TDAnalytics(new TDBatchConsumer("SERVER_URL", "APPID"));
} catch (Exception ignored){

}
```

Parameter Description:

- `APPID`: Your project's APPID, can be obtained from TE backend project management page
- `SERVER_URL`: Data upload URL
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you use private deployment version, please bind domain for data collection address and configure HTTPS certificate: https://YOUR_DATA_COLLECTION_DOMAIN

#### 3.2 Scheduled Flush Feature

You can configure interval and autoFlush parameters in Config to enable scheduled data reporting.

```
TDAnalytics te = null;

// e.g. TDLogConsumer
try {
    TDLoggerConsumer.Config config = new TDLoggerConsumer.Config("./log");
    // The cache event is reported every 10 seconds
    config.setAutoFlush(true);
    config.setInterval(10);
    te = new TDAnalytics(new TDLoggerConsumer(config));
} catch (Exception ignored){}

// e.g. TDBatchConsumer
try {
    TDBatchConsumer.Config config = new TDBatchConsumer.Config();
    // The cache event is reported every 10 seconds
    config.setAutoFlush(true);
    config.setInterval(10);
    te = new TDAnalytics(new TDBatchConsumer("url", "appId", config));
} catch (Exception ignored){}
```

---

# Real-time Debugging

::: warning Note

SDK Debug mode is only for integration debugging. Do not use in production environment.

:::

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Print SDK Logs

```
TDAnalytics.enableLog(true);
```

### 2. Enable Debug Mode

Enabling Debug mode requires two steps:

1. Use TDDebugConsumer
   Here is sample code using TDDebugConsumer:

```
/*
TDDebugConsumer: Data is reported one by one. When problems occur, users are notified via logs and exceptions. Not recommended for production environment.
 */
TDAnalytics te = new TDAnalytics(new TDDebugConsumer("serverUrl","appId","deviceId"));
// Set event properties
Map<String,Object> properties = new HashMap<String,Object>();
properties.put("name", "shoes");
try {
     te.track("account_id","distinct_id","payment",properties);
} catch (Exception e) {
     System.out.println("except:"+e);
}
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for Java SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
