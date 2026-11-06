---
code: php_sdk_installation
name: "PHP"
wikiToken: XjWfwdvmliurf5k9Tr7cevp3nhc
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1745310928000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=php_sdk_installation
---

# PHP

::: tip Note

Before integration, please read the Pre-Integration Guide first.

You can get PHP SDK source code from GitHub.

:::

**Latest Version**: v3.1.1

**Update Date**: 2024-07-24

**Download**: Source Code

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to PHP SDK Integration Guide (V2).

:::

### 1. SDK Integration

1. Use composer integration

```
{
    "require": {
        "thinkinggame/ta-php-sdk": "v3.1.1"
    }
}
```

2. You can also get SDK source code from GitHub and integrate it into your project. Just put TaPhpSdk.php in your project directory. This SDK is compatible with PHP >5.5, and some features depend on curl extension.

3. Install LogBus
   We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
require_once "vendor/autoload.php";

use Exception;
use ThinkingData\TDLog;
use ThinkingData\TDAnalytics;
use ThinkingData\TDFileConsumer;
use ThinkingData\TDDebugConsumer;
use ThinkingData\TDBatchConsumer;
use ThinkingData\ThinkingDataException;

TDLog::$enable = true;

$consumer = new TDFileConsumer("LOG_DIRECTORY", 200, true, "LOG_FILE_PREFIX");
$teSDK = new TDAnalytics($consumer, true);
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder address to this address to use LogBus for data monitoring and uploading.

`LOG_FILE_PREFIX` is the prefix for log file names.

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
$account_id = 2121;
$distinct_id = 'SJ232d233243';
$properties = array();
$properties['age'] = 20;
$properties['Product_Name'] = 'c';
$properties['update_time'] = date('Y-m-d H:i:s', time());
$json = array();
$json['a'] = "a";
$json['b'] = "b";
$jsonArray = array();
$jsonArray[0] = $json;
$jsonArray[1] = $json;
$properties['json'] = $json;
$properties['jsonArray'] = $jsonArray;

try {
    $teSDK->track($distinct_id, $account_id, "viewPage", $properties);
} catch (Exception $e) {
    echo $e;
}
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
$properties = array();
$properties['once_key'] = 'twice';
$properties['age'] = 10;
$properties['money'] = 300;
$properties['array1'] = ['str1', 'str2'];
try {
    $teSDK->user_set('distinct_id', 'account_id', $properties);
} catch (Exception $e) {
    //handle except
    echo $e;
}
```

#### 3.3 Data Reporting

When using `TDFileConsumer`, collected events are first converted to JSON strings and added to a cache array. Data is written to disk only when the array element count exceeds the set capacity. Default capacity limit is 100 data items.

In certain business scenarios, if you want data to be reported to the TE server immediately, you can call the `flush()` interface. Note that frequent calls to `flush()` will cause service performance degradation.

```
$te->flush();
```

#### 3.4 Close SDK

```
try{
  $te->close();
} catch (Exception $e){
  // Exception handling
  echo $e;
}
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
require_once "vendor/autoload.php";

use Exception;
use ThinkingData\TDLog;
use ThinkingData\TDAnalytics;
use ThinkingData\TDFileConsumer;
use ThinkingData\TDDebugConsumer;
use ThinkingData\TDBatchConsumer;
use ThinkingData\ThinkingDataException;

TDLog::$enable = true;

$consumer = new TDFileConsumer("LOG_DIRECTORY", 200, true, "te");
$teSDK = new TDAnalytics($consumer, true);

$account_id = 2121;
$distinct_id = 'SJ232d233243';
$properties = array();
$properties['age'] = 20;
$properties['Product_Name'] = 'c';
$properties['update_time'] = date('Y-m-d H:i:s', time());
$json = array();
$json['a'] = "a";
$json['b'] = "b";
$jsonArray = array();
$jsonArray[0] = $json;
$jsonArray[1] = $json;
$properties['json'] = $json;
$properties['jsonArray'] = $jsonArray;

try {
    $teSDK->track($distinct_id, $account_id, "viewPage", $properties);
} catch (Exception $e) {
    echo $e;
}

$properties = array();
$properties['once_key'] = 'twice';
$properties['age'] = 10;
$properties['money'] = 300;
$properties['array1'] = ['str1', 'str2'];
try {
    $teSDK->user_set($distinct_id, $account_id, $properties);
} catch (Exception $e) {
    //handle except
    echo $e;
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
$properties = array();
$properties["product_name"] = "book";
try {
    $te->track("distinctId", "accountId", "productBuy", $properties);
} catch (Exception $e) {
    echo $e;
}
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
// Example: Report first-time event, assuming event name is device_activation
$properties = array();
$properties["price"] = 100;
$properties["status"] = 3;
$firstCheckId = "first_flag_id";
try {
    $te->track_first("distinctId", "accountId", "device_activation", $firstCheckId, $properties);
} catch (Exception $e) {
    echo $e;
}
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report updateable event, assuming event name is eventName
// After reporting, event property status is 3, price is 100
$properties = array();
$properties["price"] = 100;
$properties["status"] = 3;
$eventId = "eventId";
try {
    $te->track_update("distinctId", "accountId", "eventName", $eventId, $properties);
} catch (Exception $e) {
    echo $e;
}

// After reporting, event with id eventId and name eventName has property status updated to 5, price unchanged
$properties1 = array();
$properties1["status"] = 5;
try {
    $te->track_update("distinctId", "accountId", "eventName", $eventId, $properties1);
} catch (Exception $e) {
    echo $e;
}
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report overwriteable event, assuming event name is eventName
// After reporting, event property status is 3, price is 100
$properties = array();
$properties["price"] = 100;
$properties["status"] = 3;
$eventId = "eventId";
try {
    $te->track_overwrite("distinctId", "accountId", "eventName", $eventId, $properties);
} catch (Exception $e) {
    echo $e;
}

// After reporting, event with id eventId and name eventName has property status updated to 5, price property is deleted
$properties1 = array();
$properties1["status"] = 5;
try {
    $te->track_overwrite("distinctId", "accountId", "eventName", $eventId, $properties1);
} catch (Exception $e) {
    echo $e;
}
```

### 2. User Properties

TE platform supports the following user property setting APIs: `user_set`, `user_setOnce`, `user_add`, `user_unset`, `user_del`, `user_append`, `user_uniqAppend`.

#### 2.1 user_set

For general user properties, you can call `user_set` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
$properties = array();

// Upload user property, create new property "user_name", value is "ABC"
$properties["user_name"] = "ABC";
try{
    $te->user_set('distinct_id', 'account_id', $properties);
}catch (Exception $e){
    // Exception handling
    echo $e;
}
// Upload user property again, at this point "user_name" value is overwritten to "XYZ"
$properties["user_name"] = "XYZ";
try{
    $te->user_set('distinct_id', 'account_id', $properties);
}catch (Exception $e){
    // Exception handling
    echo $e;
}
```

#### 2.2 user_setOnce

If you want to set a user property only once, you can call `user_setOnce`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
$properties = array();

// Same as above, upload user property, create new property "user_name", value is "ABC"
$properties["user_name"] = "ABC";
try{
    $te->user_setOnce('distinct_id', 'account_id', $properties);
} catch (Exception $e){
    // Exception handling
    echo $e;
}

// Upload user property again, at this point "user_name" already has value, so no modification, still "ABC"; "user_age" value is 18
$properties["user_name"] = "XYZ";
$properties["user_age"] = 18;
try{
    $te->user_setOnce('distinct_id', 'account_id', $properties);
} catch (Exception $e){
    // Exception handling
    echo $e;
}
```

#### 2.3 user_add

When you want to upload numeric properties, you can call `user_add` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
try{
    $properties = array();
    $properties['level'] = 2;
    $te->user_add($distinct_id, $account_id, $properties);
}catch (Exception $e){
    //handle except
    echo $e;
}
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 user_append

You can call `user_append` to append array-type user properties.

```
// user_append append one or more sets for a user
try{
    $properties = array();
    $properties['arr'] = ['str3','str4'];// Append multiple values for array type, key-array format, array contains string types
    $te->user_append('distinct_id', 'account_id', $properties);
}catch (Exception $e){
    //handle except
    echo $e;
}
```

#### 2.5 user_uniq_append

You can call `user_uniq_append` to append array-type user properties. The `user_uniq_append` interface will deduplicate appended user properties, while `user_append` interface does not deduplicate, allowing duplicate user properties.

```
// user_uniq_append append one or more sets for a user (deduplicate duplicate elements)
try{
    $properties = array();
    $properties['arr'] = ['str3','str4'];// Append multiple values for array type, key-array format, array contains string types
    $te->user_uniq_append('distinct_id', 'account_id', $properties);
}catch (Exception $e){
    //handle except
    echo $e;
}
```

#### 2.6 user_unset

When you want to clear user property values, you can call `user_unset` to clear specified properties. If the property has not been created in the cluster, `user_unset` will not create the property.

```
$properties1 = array(
    'age', "update_time"
);
try {
    $te->user_unset(null, 'account_id', $properties1);
} catch (Exception $e) {
    //handle except
    echo $e;
}
```

user_unset: The parameter is the Key value of the property to be cleared.

#### 2.7 user_del

If you want to delete a user, you can call `user_del` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
try{
    $te->user_del('distinct_id', 'account_id');
} catch (Exception $e){
    // Exception handling
    echo $e;
}
```

### 3. Other Features

#### 3.1 TDBatchConsumer

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools.

```
require "TaPhpSdk.php";
$te = new TDAnalytics(new TDBatchConsumer("SERVER_URL","APP_ID"));
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

### Print Logs

```
TDLog::$enable = true;
```

### Real-time Debugging

During SDK integration, you can use TE's Debug feature for real-time debugging. Enabling Debug feature requires two steps:

1. Use TDDebugConsumer
   Here is sample code using TDDebugConsumer:

```
try {
    // Same as test device ID configured in TE backend
    $deviceId = "123";
    $debugConsumer = new TDDebugConsumer("SERVER_URL", "APP_ID", 1000, $deviceId);
    // Whether to write test data to TE, true-write, false-no write. Default value is true
    $debugConsumer->setDebugOnly(false);
    $te = new TDAnalytics($debugConsumer);
} catch (Exception $e) {
    echo $e;
}
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for PHP SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
