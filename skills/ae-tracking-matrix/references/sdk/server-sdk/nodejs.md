---
code: nodejs_sdk_installation
name: "Node.js"
wikiToken: EfbBwX7fOiKXBvkOzGDcHKK8nBc
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1745310927000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=nodejs_sdk_installation
---

# Node.js

This guide will introduce how to use Node.js SDK to integrate into your project.

**Latest Version**: v1.5.0

**Update Date**: 2024-03-26

**Download**: Source Code

### 1. SDK Integration

1. Get Node.js SDK using `npm`:

```
# Get SDK
npm install thinkingdata-node --save

# Update SDK
npm i thinkingdata-node@{version_number}
```

2. Install LogBus
   We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
const ThinkingData = require('thinkingdata-node');

let teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', {
    filePrefix: 'test',
    rotateHourly: true
});
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder address to this address to use LogBus for data monitoring and uploading. **This SDK does not support multi-instance file writing in loggingMode.**

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
let trackEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    time: new Date(),
    ip: '202.38.64.1',
    properties: {
        prop_double: 134.1,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.track(trackEvent)
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
let userSetData = {
    accountId: 'node_test',
    properties: {
        prop_date: new Date(),
        prop_double: 134.12,
        prop_string: 'hello',
        prop_int: 666,
        prop_array: ['str1', 'str2'],
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.userSet(userSetData);
```

#### 3.3 Data Reporting

When using TDLoggingConsumer, SDK will write collected data to disk in real-time. No need to call `flush()` method.

#### 3.4 Close SDK

```
teSDK.close();
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
var teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY');
let trackEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    time: new Date(),
    ip: '202.38.64.1',
    properties: {
        prop_double: 134.1,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.track(trackEvent)
let userSetData = {
    accountId: 'node_test',
    properties: {
        prop_date: new Date(),
        prop_double: 134.12,
        prop_string: 'hello',
        prop_int: 666,
        prop_array: ['str1', 'str2'],
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.userSet(userSetData);
```

---

# Advanced Guide

### 1. Track Events

After SDK initialization, you can perform data tracking to collect user behavior information. Generally, regular events can meet business scenario requirements. You can also use first-time events, updateable events, etc. based on your actual business scenarios.

#### 1.1 Regular Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is an example of a user purchasing a product:

```
let trackEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    time: new Date(),
    ip: '202.38.64.1',
    properties: {
        prop_double: 134.1,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.track(trackEvent)
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
let trackFirstEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    firstCheckId: 'first_check_id',
    time: new Date(),
    properties: {
        prop_date: new Date(),
        prop_double: 134.1,
        prop_string: 'hello world',
        prop_int: 67,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.trackFirst(trackFirstEvent);
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
let trackUpdateEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    eventId: 'event_id',
    time: new Date(),
    properties: {
        prop_date: new Date(),
        prop_double: 134.1,
        prop_string: 'hello world',
        prop_int: 67,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.trackUpdate(trackUpdateEvent);
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
let trackOverwriteEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    eventId: 'event_id',
    time: new Date(),
    properties: {
        prop_date: new Date(),
        prop_double: 134.1,
        prop_string: 'hello world',
        prop_int: 67,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.trackOverWrite(trackOverwriteEvent);
```

### 2. User Properties

TE platform supports the following user property setting APIs: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDel`, `userAppend`, `userUniqAppend`.

#### 2.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
let userSetData = {
    accountId: 'node_test',
    properties: {
        prop_date: new Date(),
        prop_double: 134.12,
        prop_string: 'hello',
        prop_int: 666,
        prop_array: ['str1', 'str2'],
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.userSet(userSetData);
```

#### 2.2 userSetOnce

If you want to set a user property only once, you can call `userSetOnce`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
teSDK.userSetOnce({
    accountId: 'node_test',
    properties: {
        setOnceProperty: "set_once",
    }
});
```

#### 2.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
teSDK.userAdd({
    accountId: 'node_test',
    properties: {
        prop_double: 0.6,
        prop_int: 222,
    }
});
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 userAppend

You can call `userAppend` to append array-type user properties.

```
teSDK.userAppend({
    accountId: 'node_test',
    properties: {
        prop_array: ['str3', 'str4']
    }
});
```

#### 2.5 userUniqAppend

You can call `userUniqAppend` to append array-type user properties. The `userUniqAppend` interface will deduplicate appended user properties, while `userAppend` interface does not deduplicate, allowing duplicate user properties.

```
teSDK.userUniqAppend({
    accountId: 'node_test',
    properties: {
        prop_array: ['str3', 'str4']
    }
});
```

#### 2.6 userUnset

When you want to clear user property values, you can call `userUnset` to clear specified properties. If the property has not been created in the cluster, `userUnset` will not create the property.

```
teSDK.userUnset({
    accountId: 'node_test',
    property: 'set_once_property'
});
```

UserUnset: The parameter is the Key value of the property to be cleared.

#### 2.7 userDel

If you want to delete a user, you can call `userDel` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
teSDK.userDel({
  // Account ID (optional)
  accountId: "node_test",
  // Visitor ID (optional), account ID and visitor ID cannot both be empty
  distinctId: "node_distinct_id"
});
```

### 3. Other Features

#### 3.1 BatchMode

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools.

```
let teSDK = ThinkingData.initWithBatchMode('APP_ID', 'SERVER_URL', {
    batchSize: 2,
    compress: false // enable compress or not, default true
});
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
ThinkingData.enableLog(true);
```

### 2. Enable Debug Mode

Enabling Debug mode requires two steps:

1. Use DebugMode
   Here is sample code using DebugMode:

```
/*
DebugMode: Data is reported one by one. When problems occur, users are notified via logs and exceptions. Not recommended for production environment.
 */
let teSDK = ThinkingData.initWithDebugMode('appId', 'serverUrl', {
    dryRun: false, // report data to TE or not
    deviceId: "123456789"
});

let trackEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    time: new Date(),
    ip: '202.38.64.1',
    properties: {
        prop_double: 134.1,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.track(trackEvent)
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for Node SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
