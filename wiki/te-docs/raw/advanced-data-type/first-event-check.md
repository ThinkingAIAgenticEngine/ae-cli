---
code: first_check_id
name: "First Event Check"
wikiToken: IlCawoKZKiytCMkqRPvcpz3Ln5g
parentWikiToken: DyTywDmeWiYzq2kLIQlcsNsJnff
updateTime: 1774249367000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=first_check_id
---

This chapter will introduce the special data structure of the TA system - the method of using the first event check. The first event check is a data filtering feature. A unique ID is added to the event data. When the system receives the data, it will identify whether the ID has appeared before. Only data with a new ID can be stored, and the ID will be recorded to ensure that the event with this ID will be stored for the first time.
::: warning
The performance overhead of the first event check is relatively high, it is not recommended to add this check to all events, but to enable it with the assistance of TA staff
 :::
## **I. Data structure**
To enable the "first event check", the data needs to be adjusted:
- When adding the ID field `#first_check_id`, the type must be a string. This field is the ID of the first check event, the first data of this ID will be stored, and the subsequent data cannot be stored. The `#first_check_id` of different events is independent of each other, so the first check of each event does not interfere with each other
The following is a data sample, and you can pay attention to the location of `#first_check_id`:
```json
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

The `#first_check_id` in the above data is "123456". If another piece of data with `#first_check_id` "123456" has been stored before the event "test", this piece of data cannot be stored. If it has not been stored before, this piece of data can be stored
## II. **Data processing logic**
The TA system will maintain an ID table for each event, and the ID tables between different events are independent of each other.
When the system receives event data with `#first_check_id`, it will look up the `#first_check_id` of the data in the ID table of the corresponding event, and perform different processing tasks according to the query result:
1. If the `#first_check_id` does not exist in the ID table, this piece of data will pass the check and will be directly stored, and the `#first_check_id` will be recorded in the ID table
2. If the `#first_check_id` exists in the ID table, this piece of data will be discarded directly
If data with/without `#first_check_id` are both uploaded for the same event, then the data without this field will not be processed by the first event check, the same as the common data
::: tip
In addition to the key logics above, the following two should be noted:
1. To ensure performance, the system adopts the method of timing batch processing, and the default interval is 1 hour, so the event data of the first event check will have a query delay of 1 hour by default
2. "#first_check_id" will not be recorded in the database after processing. If you need to keep a record, please use an event property
 :::
## III. **Best practices**
### **New device**
The new device data is very suitable for the first event check. You can report a "new device" event with the device ID as `#first_check_id` every time the application starts. According to the logic of the first event check, only the device ID appears for the first time, the "new device" event will be recorded, and the data that appears after that will be discarded. Therefore, the storage event is the first event of each device ID, which is in line with the new logic of the device.
Here's an example of a "new device" event of the first event check:
```json
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

This event can be reported every time the app is started, and the device ID is used as `#first_check_id`; in addition, other properties can also be added, such as "device model", and "source channel", to add the analysis dimension. For TA's client SDK or server SDK, please refer to the corresponding SDK access guide. The chapters "Updated Event" and "Rewritten Event" of this User Guide will provide detailed interface calling methods
