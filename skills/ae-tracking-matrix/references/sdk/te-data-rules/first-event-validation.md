---
code: first_check_id
name: "First Event Validation"
wikiToken: VcMswVyheiYNqek35fKcFYiEnTg
parentWikiToken: Ljs3w406DiyDLnktFuAcHogInvg
updateTime: 1745309948000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=first_check_id
---

# First Event Validation

This chapter will introduce the usage of TE system's special data structure - First Event Validation. First Event Validation is a data filtering feature that adds a unique identifier ID to event data. When the system receives data, it checks whether this ID has appeared before. Data with IDs that have already appeared will not be stored. Data with IDs that have not appeared can be stored, and the ID will be recorded, ensuring only the first occurrence of an ID is stored.

::: warning

First Event Validation has significant performance overhead. It is not recommended to add this validation to all events, and it should be used with assistance from TE staff.

:::

### I. Data Structure

To use the "First Event Validation" feature, one adjustment is needed in the data:

- Add ID field `#first_check_id`, which must be of string type. This field is the identifier ID for validating first events. The first occurrence of this ID will be stored, subsequent occurrences will not be stored. `#first_check_id` for different events are independent of each other, so the first validation for each event does not interfere with others

Here is a sample data, you can see where `#first_check_id` is located:

```
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track",
  "#ip": "192.168.171.111",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "#time": "2017-12-18 14:37:28.527",
  "#first_check_id": "123456",
  "#event_name": "test",
  "properties": {
    "argString": "abc",
    "argNum": 123,
    "argBool": true
  }
}
```

The `#first_check_id` in the above data is "123456". If event "test" has already stored another data with `#first_check_id` of "123456", then this data cannot be stored. If no such data has been stored before, this data can be stored.

### II. Data Processing Logic

The TE system maintains an ID table for each event. ID tables for different events are independent of each other.

When the system receives event data with `#first_check_id`, it will search for the `#first_check_id` of this data in the corresponding event's ID table. Based on the search result, different processing will be performed:

1. If the `#first_check_id` does not exist in the ID table, then this data passes validation, will be directly stored, and the `#first_check_id` will be recorded in the ID table
1. If the `#first_check_id` exists in the ID table, then this data will be directly discarded

If the same event has both data with `#first_check_id` and data without this field uploaded, then data without this field will not undergo first event validation processing, consistent with regular data.

::: tip

Besides the key logic above, there are two additional notes:

1. To ensure performance, the system uses scheduled batch processing for validation, with a default interval of 1 hour. Therefore, event data using first event validation will have a default 1 hour query delay

2. "#first_check_id" is not recorded in the database after processing. If you need to record it, please use an event attribute to record it

:::

### III. Best Practices

#### Device Addition

Device addition data is very suitable for first event validation. You can report a "Device Addition" event with device ID as `#first_check_id` each time the app starts. According to the logic of first event validation, only the first occurrence of each device ID's "Device Addition" event will be recorded, subsequent occurrences will be discarded. Therefore, the stored events are the first occurrence of each device ID, matching the logic of device addition.

Here is a sample of "Device Addition" event using first event validation:

```
{
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track",
  "#ip": "192.168.171.111",
  "#time": "2017-12-18 14:37:28.527",
  "#first_check_id": "device_id_123456",
  "#event_name": "new_device",
  "properties": {
    "device_id": "device_id_123456"
  }
}
```

This event can be reported each time the app starts, using the device ID as `#first_check_id`; besides that, other attributes can be added, such as "Device Model", "Source Channel", etc., to increase dimensions for analysis. For TE client SDK or server SDK, you can refer to the corresponding SDK's integration guide. The "Updatable Events" and "Overwritable Events" sections in the guide will provide detailed interface calling methods.
