---
code: track_update_and_track_overwrite
name: "Updated Event"
wikiToken: BtlUwIB0piMzhdkMjz2cmndrnFb
parentWikiToken: DyTywDmeWiYzq2kLIQlcsNsJnff
updateTime: 1774249365000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=track_update_and_track_overwrite
---
This chapter will introduce how to use the special data structure of the TA system - updated event. An updated event is a **special kind of event data to** update the event property value in the data. It is suitable for recording event data that contains variable state values or variable cumulative values, such as cost events, which can update the property `cost amount` over time.
::: warning
The storage and processing performance overhead of updated events is relatively high. To ensure data processing efficiency and query performance, it is only applicable to events with a small number and strong update requirements in special business scenarios. It is strongly recommended to use an updated event with the assistance of TA personnel
 :::
## **I. Data structure**
<quote-container>
For TA's client SDK or server SDK, please refer to the corresponding SDK access guide. The chapters "Updated events" and "Rewritable events" in this User Guide will provide detailed interface calling methods
</quote-container>

To use the "updated event" property, two adjustments need to be made in the data:
1. Set the field `#type` that identifies the data type to `track_update` or `track_overwrite`. These two data types represent the update methods of two events: updating some properties and overwriting all properties
2. Add the field `#event_id`, which is the unique identification of the event; when updating the properties, search the corresponding event data according to `#event_name` and `#event_id`, and update the data; the `#event_id` of different events is independent of each other, so each updated event has a separate unique identification system
The following is a data sample, and you can pay attention to the location of `#event_id`:
```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track_update",
  "#event_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#time": "2020-08-18 14:37:28.527",
  "#event_name": "test_event",
  "properties": {
    "argString": "abc"
  }
}
```

## **II. Data processing logic**
The processing logic of an updated event is very different from that of ordinary event data: **Please note that if the **`#type`** of event data is **`track`**, the data cannot be updated later**; if the `#type` of event data is `track_update` or `track_overwrite`, it will be regarded as an updated event, and then any one of the two types of data can be used to update the property.
When the TA system receives `track_update` or `track_overwrite`, different processing methods are available. This section will describe the processing logics of these two types of data in details.
### 2.1 **Processing logic of track_update**
When `#type` in the data is `track_update`, the processing logic of the data is event property update. When the system receives this type of data, it will check whether the corresponding event data exists according to the `#event_id` field. If it exists, it will update the corresponding field. The specific processing logic is as follows:
1. If the data corresponding to #`#event_id` does not exist in this event, the data will be regarded as new data and will be directly stored
2. If `#event_id` exists, the event property in the new data will update the previous value. If there is a new property, the new property will also be added. The property not included in the new data will not be updated, so you need to pass in the properties to be updated
3. In addition, `#time`, the event time, will also be updated by new data, so there is a need to set the time in the new data reasonably in the actual business scenario
### 2.2 **Processing logic of track_overwrite**
When `#type` in the data is `track_overwrite`, the processing logic of the data is event rewriting. When the system receives this type of data, it will check whether the corresponding event data exists according to the `#event_id` field. If it exists, it will delete the data and write new event data into the system (equivalent to substituting the deleted data). The specific processing logic is as follows:
1. If the data corresponding to `#event_id` does not exist in this event, the data will be regarded as new data and will be directly stored
2. If `#event_id` exists, all content of the event data will be rewritten. To update some properties, you can use `track_update`
3. In addition, `#time`, the event time, will also be updated by new data, so there is a need to set the time in the new data reasonably according to the actual business scenario
## III. **Best Practices**
### **Advertising cost**
When analyzing the advertising effect, it is often necessary to calculate the ROI input-output ratio of advertising space or material, that is, the ratio of user value to user cost. The user value, that is, the sum of direct payment and value generated by other methods, is easy to record; while the cost data will depend on the data rules of the advertisers, and the general cost amount will be continuously updated, which is not suitable for recording as per general event data.
Since the cost data will continue to change, the advertising cost data is highly recommended to be recorded in an updated manner. When recording the advertising cost data for the first time, the following data can be uploaded:
```json
{
  "#account_id": "admin",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track_update",
  "#event_id": "2020-09-01_google_7-Tier1-0527_adset1_adname1",
  "#time": "2020-09-01 00:00:00.000",
  "#event_name": "ad_cost",
  "properties": {
    "channel": "google",
    "campaignid": "7-Tier1-0527",
    "adset": "adset1",
    "adname": "adname1",
    "cost": 100
  }
}
```

The above data will add an updated event of cost, where #event_id is composed of date, channel, activity name, ad group, and ad name, which is the unique ID of cost. According to data logic, this is also the cost event that can be updated at the finest granularity; the `cost` field records the advertising cost, namely RMB 100.
As time goes by, the advertising channel pushes new cost data, and the new advertising cost is RMB 200. Then the following data can be sent, where `#event_id` needs to be consistent with the previous data, which means updating the previous data; the `cost` field is updated, and the new cost RMB 200 is passed in; since `#time` will also be updated by new data, it needs to be consistent with the previous one, and the cost data is passed in (converted to time type). Other fields such as channels, activities, and advertising spaces do not need to be updated, so the data can be left blank.
```json
{
  "#account_id": "admin",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track_update",
  "#event_id": "2020-09-01_google_7-Tier1-0527_adset1_adname1",
  "#time": "2020-09-01 00:00:00.000",
  "#event_name": "ad_cost",
  "properties": {
    "cost": 200
  }
}
```

When the system receives this event, it will query whether the `#event_id` already exists. If it exists, it will update the `#time` and `cost` fields in the original data (that is, the first sample data), that is, the cost amount of the cost event has been updated.
