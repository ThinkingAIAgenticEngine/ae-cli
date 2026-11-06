---
code: track_update_and_track_overwrite
name: "Updatable Events"
wikiToken: P5ryw0zcmi9CJBk5S0LclWSEnlh
parentWikiToken: Ljs3w406DiyDLnktFuAcHogInvg
updateTime: 1745309946000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=track_update_and_track_overwrite
---

# Updatable Events

This chapter will introduce the usage of TE system's special data structure - Updatable Events. Updatable Events are **special event data** that can update attribute values in the data, suitable for recording event data containing mutable state values or mutable cumulative values, such as cost events where the `cost_amount` attribute can be updated over time.

::: warning

Updatable Events have significant storage and processing performance overhead. To ensure data processing efficiency and query performance, they are only suitable for events with small volume and strong update requirements in special business scenarios. It is strongly recommended to use them with assistance from TE staff.

:::

### I. Data Structure

<!-- unsupported block: 34 -->

Using TE client SDK or server SDK, you can refer to the corresponding SDK's integration guide. The "Updatable Events" and "Overwritable Events" sections in the guide will provide detailed interface calling methods.

To use the "Updatable Events" feature, two adjustments are needed in the data:

1. Set the data type identification field `#type` to `track_update` or `track_overwrite`. These two data types represent two event update methods: updating partial attributes and overwriting all attributes
1. Add field `#event_id`, which is the unique identifier of the event; when updating attributes, the corresponding event data will be found based on `#event_name` and `#event_id`, and that data will be updated. `#event_id` for different events are independent of each other, so each updatable event has its own separate unique identifier system

Here is a sample data, you can see where `#event_id` is located:

```
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

### II. Data Processing Logic

Updatable Events have significant differences in processing logic compared to regular event data: **Please note, if an event data's** `#type` **is** `track`**, then that data cannot be updated later**; if an event data's `#type` is `track_update` or `track_overwrite`, it will be treated as an updatable event, and then either type of data can be used to update attributes.

The TE system handles `track_update` and `track_overwrite` differently. This section will detail the processing logic for these two types of data.

#### 2.1 track_update Processing Logic

When `#type` in the data is `track_update`, the data processing logic is event attribute update. When the system receives this type of data, it will check whether corresponding event data exists based on the `#event_id` field. If it exists, the corresponding fields will be updated. The specific processing logic is as follows:

1. If no data with the corresponding `#event_id` exists under this event, this data is treated as new data and will be directly stored
1. If `#event_id` exists, the event attributes in the newly passed data will update previous values. If there are new attributes, they will also be added. Attributes not included in the newly passed data will not be updated, so you only need to pass the attributes to be updated
1. Additionally, `#time` (event time) will also be updated by new data, so you need to reasonably set the time in the newly passed data according to actual business scenarios

#### 2.2 track_overwrite Processing Logic

When `#type` in the data is `track_overwrite`, the data processing logic is event overwrite. When the system receives this type of data, it will check whether corresponding event data exists based on the `#event_id` field. If it exists, it will delete that data and write the new event data to the system (equivalent to replacing the deleted data). The specific processing logic is as follows:

1. If no data with the corresponding `#event_id` exists under this event, this data is treated as new data and will be directly stored
1. If `#event_id` exists, all content of that event data will be overwritten. If you need to update partial attributes, use `track_update`
1. Additionally, `#time` (event time) will also be updated by new data, so you need to reasonably set the time in the newly passed data according to actual business scenarios

### III. Best Practices

#### Advertising Cost

In advertising effectiveness analysis, you often need to calculate the ROI (return on investment) for ad placements or creatives, which is the ratio of user value to user cost. User value, i.e., the sum of direct payments and value generated from other means, is easy to record; while cost data depends on the data rules from the advertising platform side, and cost amounts generally continue to update, making it unsuitable to record with regular event data.

Since cost data continues to change, advertising cost data is very suitable for recording using updatable data. When first recording advertising cost data, you can upload data like the following:

```
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

The above data will add a new updatable cost event, where `#event_id` is formed by concatenating date, channel, campaign name, ad group, and ad name, serving as the unique ID for the cost. From a data logic perspective, this is also the finest granularity at which the cost event can be updated; the `cost` field records the current advertising cost of 100 yuan.

As time passes, the advertising platform pushed new cost data, and the new advertising cost is 200. You can send data like the following, where `#event_id` needs to be consistent with the previous data, representing updating the previous data; updating the `cost` field, passing the new cost value 200; since `#time` will also be updated by new data, it needs to be consistent with before, passing the cost date (converted to time type). Other fields like channel, campaign, ad placement, since they don't need updating, can be omitted from the data.

```
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

When the system receives this event, it will query whether this `#event_id` already exists. After finding it exists, it will update the `#time` and `cost` field in the original data (i.e., the first sample data), completing the update operation for the cost event's cost amount.
