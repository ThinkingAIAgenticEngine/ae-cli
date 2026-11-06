---
code: data_format
name: "Data Rules"
wikiToken: BxBWwrjHYiJGgbkKVxtcaKOmnNv
parentWikiToken: Bmhewqk5PiJirhk1GJzcJliqnOh
updateTime: 1768384216000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=data_format
---

# Data Rules

This chapter will detail the TE backend data structure, data types, and data limitations. Through this chapter, you will learn how to construct data that conforms to the rules and troubleshoot data transmission issues.

**If you are using LogBus or RESTful API to upload data, you need to format the data according to the data rules in this chapter.**

### I. Data Structure

The TE backend accepts JSON data that conforms to the rules: if using SDK integration, the data will be converted to JSON format for transmission. If using LogBus or POST method to upload data, the data needs to be JSON data that conforms to the rules.

JSON data is organized by lines: one line contains one JSON data, which corresponds to one piece of data physically, and semantically corresponds to one user behavior, or one user attribute setting operation.

The data format and requirements are as follows (for readability, the data has been formatted, please do not use line breaks in actual environment):

- Here is a sample event data:

```
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track",
  "#ip": "192.168.171.111",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "#time": "2017-12-18 14:37:28.527",
  "#event_name": "test",
  "properties": {
    "argString": "abc",
    "argNum": 123,
    "argBool": true
  }
}
```

- Here is a sample user attribute setting:

```
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "user_set",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "#time": "2017-12-18 14:37:28.527",
  "properties": {
    "userArgString": "abc",
    "userArgNum": 123,
    "userArgBool": true
  }
}
```

_The value of "#type" can be replaced with "user_setOnce", "user_add", "user_unset", "user_append", "user_del"_

From a structural and functional perspective, a JSON data can be divided into two parts:

**Other fields at the same level as "properties" constitute the basic information of this data, including only the following items:**

- The account ID `#account_id` and visitor ID `#distinct_id` representing the triggering user
- The trigger time `#time`, can be precise to seconds or milliseconds
- The data type (event or user attribute setting) `#type`
- The event name `#event_name` (only present in event data)
- The user IP `#ip`
- The unique identifier `#uuid`
  Please note that apart from the above items, all other properties starting with "#" must be placed inside properties

**The inner layer of "properties" is the content of this data, which includes the attributes in events, or user attributes to be set. These are used directly as attributes or analysis objects in backend analysis.**

Structurally, these two parts are similar to the header and content of a message. Next, we will detail the meaning of each field in these two parts.

#### 1.1 Data Information Section

As shown in the red box below, several fields at the same level as "properties" constitute the information section of this data:

These fields contain data information such as the triggering user and trigger time. Their characteristic is that all fields start with "#". This section will explain the meaning and configuration of each field.

<!-- unsupported block: 22 -->

##### 1.1.1 User Information (`#account_id` and `#distinct_id`)

`#account_id` and `#distinct_id` are two fields used by the TE backend to identify users. `#account_id` is the user's ID in logged-in state, and `#distinct_id` is the user's identifier in non-logged-in state. The TE backend will determine the triggering user based on these two fields, with priority given to `#account_id`. See the User Identification Rules chapter for specific rules.

At least one of `#account_id` or `#distinct_id` must be passed. If all events are triggered when the user is logged in, only passing `#account_id` is acceptable. If there are events triggered in non-logged-in state (including before registration), it is recommended to fill in both fields.

<!-- unsupported block: 22 -->

##### 1.1.2 Data Type Information (`#type` and `#event_name`)

`#type` determines the type of this data, whether it's a user behavior record or an operation to modify user attributes. **Every data must configure the `#type` field.** The values of `#type` are divided into two categories: `track` means this data is a user behavior record, and values starting with `user_` mean operations on user attributes. The specific meanings are as follows:

1. track: Pass an event to the event table, all event uploads are track
1. user_set: Operation on user table, overwrite one or more user attributes, if the attribute already has a value, overwrite the previous value
1. user_setOnce: Operation on user table, initialize one or more user attributes, if the attribute already has a value, ignore this operation
1. user_add: Operation on user table, perform cumulative calculation for one or more numeric user attributes
1. user_unset: Operation on user table, clear the values of one or more user attributes for this user
1. user_del: Operation on user table, delete this user
1. user_append: Operation on user table, add elements to the user's list type attribute values
1. user*uniq_append: Operation on user table, add elements to the user's list type attribute values, and perform a full list deduplication (deduplication preserves the original order of elements)
   When the value of `#type` is `track`, i.e., this data is a behavior record, \*\*you must configure the event name `#event_name`, which must start with a letter, can only contain: letters (case-sensitive), numbers and underscore "*", maximum length is 50 characters. Please ensure there are no spaces when configuring.\*\* If this data is an operation to modify user attributes, the `#event_name` field is not required.

Note that user attributes are attributes that have node significance for users. It is not recommended to modify them frequently in a short time. For attributes that need frequent changes, it is recommended to put them in events as event attributes.

<!-- unsupported block: 22 -->

##### 1.1.3 Trigger Time (`#time`)

`#time` is the time when the event occurred, **must be configured**, the format must be a string precise to milliseconds ("yyyy-MM-dd HH:mm:ss.SSS") or seconds ("yyyy-MM-dd HH:mm:ss")

Although data for operations on the User table also needs to configure `#time`, operations on user attributes will be performed in the order the backend receives the data.

_For example, if a user re-uploads user table operation data from a past day, both attribute overwrite and initialization will proceed normally, without judging based on the #time field_

<!-- unsupported block: 22 -->

##### 1.1.4 Trigger Location (`#ip`)

`#ip` is the device's IP address, optional configuration. TE will calculate the user's geographic location based on the IP address. If you pass #country, #province, #city and other geographic location attributes in "properties", the values you passed will be used.

<!-- unsupported block: 22 -->

##### 1.1.5 Data Unique ID (`#uuid`)

`#uuid` is a field used to indicate data uniqueness, optional configuration, the format must be standard UUID format. TE will, depending on data volume, within a certain period of time, check at the receiving end whether data with the same `#uuid` appears within a short time (i.e., duplicate data), and directly discard duplicate data, not storing it.

**Note that receiving-end validation through `#uuid` only validates data received in the past few hours, mainly to solve short-term data duplication caused by network jitter issues. It cannot validate received data against all data. If you need to deduplicate data, please contact TE staff.**

<!-- unsupported block: 22 -->

#### 1.2 Data Content Section

The other part of the data is what's contained inside `properties`. `properties` is a JSON object, and the data inside is represented as key-value pairs. If it's user behavior data, it represents the attributes and indicators of that behavior (equivalent to fields in the behavior table), and these attributes and indicators can be used directly in analysis; if it's an operation on user attributes, it represents the attribute content to be set.

The key value is the name of that attribute, the type is string. Custom attributes must start with a letter, can only contain: letters (case-insensitive), numbers and underscore "\_", and maximum length is 50 characters; there are also TE preset attributes starting with `#`, you can learn more in the Preset Attributes chapter, but note that in most cases it's recommended to only use custom attributes, not use #.

The value is the value of that attribute, can be numeric, text, time, boolean, list, object, object group. The data type representation is shown in the table below:

**TE Data Type**

**Sample Value**

**Value Description**

**Data Type**

Numeric

123,1.23

Data range is -9E15 to 9E15

Number

Text

"ABC","Shanghai"

Character default upper limit is 2KB

String

Time

"2019-01-01 00:00:00","2019-01-01 00:00:00.000"

"yyyy-MM-dd HH:mm:ss.SSS" or "yyyy-MM-dd HH:mm:ss", if you need to represent a date, you can use "yyyy-MM-dd 00:00:00"

String

Boolean

true,false

-

Boolean

List

["a","1","true"]

Elements in the list will be converted to string type, maximum 500 elements in the list

Array(String)

Object

{"hero_name":"Liu Bei","hero_level":22,"hero_equipment": ["Dual Swords","Red Horse"],"hero_if_support":false}

Each sub-attribute (Key) in the object has its own data type, for value description please refer to the corresponding type of regular attributes above

Maximum 100 sub-attributes in object

Object

Object Group

[{"hero_name":"Liu Bei","hero_level":22,"hero_equipment": ["Dual Swords","Red Horse"],"hero_if_support":false}, {"hero_name":"Liu Bei","hero_level":22,"hero_equipment": ["Dual Swords","Red Horse"],"hero_if_support":false}]

Each sub-attribute (Key) in the object group has its own data type, for value description please refer to the corresponding type of regular attributes above

Maximum 500 objects in object group

Array(Object)

Note that the type of all attributes will be determined based on the type of the attribute value received the first time. Subsequent data types must be consistent with the corresponding attribute type. Attributes with mismatched types will be discarded (other attributes of this data that conform to the type will be retained), and TE will not perform type compatibility conversion.

### II. Data Processing Rules

After receiving data, the TE server will perform some processing. This section will explain the processing rules of the TE backend combined with actual usage scenarios:

#### 2.1 Receiving New Event Data

After receiving new event data, the TE backend will automatically create the association model for the new event and its attributes; if new attributes are received, the attribute type when the attribute is first received will be set as the attribute's type, and the attribute type cannot be modified afterwards.

<!-- unsupported block: 22 -->

#### 2.2 Adding Event Attributes

If you need to add attributes to an existing event, just pass the new attributes together when uploading data. The TE backend will dynamically associate the event with the new attributes, no other configuration is needed.

<!-- unsupported block: 22 -->

#### 2.3 Handling Attribute Type Inconsistency

When receiving an event data where the type of an attribute is inconsistent with the existing attribute type in the backend, the value of that attribute will be discarded (i.e., the value becomes null).

<!-- unsupported block: 22 -->

#### 2.4 Deprecating Event Attributes

If you need to deprecate an event attribute, just hide that attribute in the data management module of the TE backend. Subsequent transmitted data may not include that attribute. The TE backend will not delete the attribute's data, and the hiding operation is reversible. If the attribute is still transmitted after being hidden, the attribute value will still be retained.

<!-- unsupported block: 22 -->

#### 2.5 Shared Attributes Across Events

Same-name attributes across different events are considered the same attribute with consistent type. Therefore, you need to ensure all same-name attributes have consistent types to avoid attribute values being discarded due to type inconsistency.

<!-- unsupported block: 22 -->

#### 2.6 User Table Operation Logic

Modifying user data in the user table, i.e., data where the `#type` field in the uploaded data is `user_set`, `user_setOnce`, `user_add`, `user_unset`, `user_append` or `user_del`, can essentially be seen as a command, i.e., an operation on the user table data of the user referred to by that data. The operation type is determined by the `#type` field, and the operation content is determined by the attributes in `properties`.

Here are the specific logic for major user table attribute operations:

##### 2.6.1 Overwrite User Attributes (user_set)

Determine the user to operate on based on the user ID in the data, then based on the attributes in `properties`, overwrite all attributes. If an attribute does not exist, create that attribute.

##### 2.6.2 Initialize User Attributes (user_setOnce)

Determine the user to operate on based on the user ID in the data, then based on the attributes in `properties`, set attributes that have not been assigned (empty). If an attribute that needs to be set for this user already has a value, no overwrite will be performed. If an attribute does not exist, create that attribute.

##### 2.6.3 Accumulate User Attributes (user_add)

Determine the user to operate on based on the user ID in the data, then based on the attributes in `properties`, perform accumulation operation on numeric attributes. If a negative value is passed, it's equivalent to subtracting the passed value from the original attribute value. If an attribute that needs to be set for this user has not been assigned (empty), it will default to 0 before performing the accumulation operation. If the attribute does not exist, create that attribute.

##### 2.6.4 Clear User Attribute Values (user_unset)

Determine the user to operate on based on the user ID in the data, then based on the attributes in `properties`, clear all those attributes (i.e., set to NULL). If an attribute does not exist, it **will not** be created.

##### 2.6.5 Add Elements to List Type User Attributes (user_append)

Determine the user to operate on based on the user ID in the data, then based on the attributes in `properties`, perform element addition operation on list type attributes.

##### 2.6.6 Delete User (user_del)

Determine the user to operate on based on the user ID in the data, delete this user from the user table. This user's event data **will not** be deleted.

##### 2.6.7 Add Elements to List Type User Attributes with Deduplication (user_uniq_append)

Determine the user to operate on based on the user ID in the data, then based on the attributes in `properties`, perform element addition operation on list type attributes, and perform a full list deduplication (deduplication preserves the original order of elements).

<!-- unsupported block: 22 -->

### III. Data Limitations

- **Event Type and Attribute Quantity Limits**
  For performance considerations, the TE backend will by default limit the number of event types and attributes for projects:

**Limit**

**Event Type Upper Limit**

**Event Attribute Upper Limit**

**User Attribute Upper Limit**

Recommended no more than

100

300

100

Hardware limit

500

1000

500

Administrators can enter the "Project Management" page to query the number of event types and attributes already used in each project. Contact TE staff to apply for increasing the upper limits for event types and attribute quantities.

- **Account ID (#account_id), Visitor ID (#distinct_id) Length Limits**

```
  * Projects created before version 3.1: 64 characters; to expand to 128 characters, please contact TE staff

  * Projects created in version 3.1 and later: 128 characters
```

- **Event, Attribute Name Limits**

```
  * Event name: `String` type, starts with a letter, can contain numbers, uppercase and lowercase letters and underscore "\_", maximum length is 50 characters

  * Attribute name: `String` type, starts with a letter, can contain numbers, letters (case-insensitive) and underscore "\_", maximum length is 50 characters. Only preset attributes can start with #.
```

- **Text, Numeric, List, Object, Object Group Type Attribute Data Range**

```
  * Text: String upper limit is 2KB

  * Numeric: Data range is -9E15 to 9E15

  * List: Maximum 500 elements; each element is string type, upper limit is 255 bytes

  * Object: Maximum 100 sub-attributes;

  * Object Group: Maximum 500 objects;
```

- **Data Receiving Time Limit**

```
  * Server data receiving event upper limit: 3 years before to 3 days after relative to server time

  * Client data receiving event upper limit: 10 days before to 3 days after relative to server time
```

### IV. Other Rules

1. Please encode data using UTF-8 to avoid character encoding issues
1. TE backend attribute names are case-insensitive, recommend using "\_" as word separator
1. TE backend by default only receives data from the past three years. Data older than three years cannot be entered. If you need to enter data older than three years, contact TE staff to extend the time limit

### V. Common Issues

This section summarizes common issues caused by data not conforming to data rules. If there are data transmission issues, you can troubleshoot based on this section content first

#### 5.1 TE Backend Did Not Receive Data

**If using SDK transmission:**

1. Please confirm whether the SDK has been successfully integrated
1. Check whether APPID and transmission URL are set correctly, whether transmission port number and transmission method corresponding suffix are missing

**If using LogBus or POST method transmission:**

1. Please confirm whether APPID and transmission URL are set correctly, whether transmission port number and transmission method corresponding suffix are missing
1. Please check whether data is transmitted in JSON format, and ensure one JSON data per line
1. Please check whether key values in the data information section start with "#", whether required fields are missing
1. Please check whether the type and format (time format) of value values in the data information section are correct
1. Please check whether the value of "#event_name" conforms to specifications, does not contain Chinese characters, spaces, etc.
1. "properties" should not start with "#"

- Also, note that user attribute settings do not produce behavior records. Therefore, if only `user_set` and other data are uploaded, data cannot be directly queried in the backend behavior analysis models (except SQL queries)
- Please note the upload data time. Data from too long ago (more than three years) will not be entered; if uploading historical data, it may be that the query period does not cover the upload data time, please adjust the query period

#### 5.2 Data Has Missing Parts, Some Attributes Not Received

1. Please confirm that attribute key values in the data content section conform to specifications, do not contain Chinese characters, spaces, etc.
1. Please confirm that among attribute key values in the data content section, those starting with "#" are preset attributes
1. Please check whether the type of missing attributes when uploading is consistent with the attribute type in the backend. You can view the type of received attributes in the backend metadata management

#### 5.3 Data Transmission Has Errors, Want to Delete Data

1. Users with private deployment services can use the data deletion tool to self-service delete data; if you are a cloud service user, you can contact TE staff for data deletion
1. If there are major data changes, it is recommended to directly create a new project. It is recommended that users conduct complete data testing in a test project before formally transmitting data
