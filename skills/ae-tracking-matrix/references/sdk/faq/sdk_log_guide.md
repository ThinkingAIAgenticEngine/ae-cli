# Viewing Client SDK Logs

# I. Background

During client SDK integration debugging and troubleshooting, you can use logs to analyze whether data collection and upload meet expectations. This document introduces how to enable SDK logs, and keywords in logs and their meanings.

### Native Client SDK Upload Mechanism

First we briefly introduce native client SDK upload mechanism. Both Android and iOS SDK cache data in local database and batch upload. Local caching data is to avoid data loss under network abnormality, batch upload is to avoid system and network overhead from frequent uploading. Data upload triggers when any of the following conditions is met:

- APP switches to background
- Time interval from last data upload reaches upload time interval (default interval is 30 seconds, can be modified in TE)
- Local cache count reaches upload count (default triggers upload when reaching 30 records, can be modified in TE)

Therefore, during debugging, if conditions triggering data upload are not met, data is still cached locally.

### Data Log Printing

For one record, log is printed when data is stored locally, and another log is printed when data is uploaded, therefore need to distinguish log meaning by keywords in log, don't mistakenly think duplicate data was generated.

# II. Enable Log Printing

### iOS Version Before 3.0

Log filter field "[THINKING]"

**Enable Log Printing**

```objectivec
[ThinkingAnalyticsSDK setLogLevel:TDLoggingLevelDebug];
```

**Initialize SDK**

mode: indicates SDK used mode

```
2024-02-01 11:36:47.862929+0800 TATest_iOS[32287:14658471] [THINKING] Thinking Analytics iOS SDK 2.8.4 instance initialized successfully with mode: NORMAL, APP ID: af6861d085e14b5c948662e1fcdce6ef, server url: https://receiver-ta-demo.thinkingdata.cn, device ID: 15F96974-CE32-44F5-9AD0-F259349FDAF2
```

**Data Stored Locally** (keyword: `[THINKING] queueing data`)

```objectivec
2022-10-25 17:30:29.270504+0800 TATest_iOS[85710:698131] [THINKING] queueing data:{
  "properties" : {
    "#os" : "iOS",
    "#device_model" : "arm64",
    ...
  },
  "#type" : "track",
  "#uuid" : "DB2B97A5-183A-439E-B8B2-FE9AF77D7421",
  "#distinct_id" : "E5ABB02F-EA10-47AC-AB6C-A8E47E55B4E9",
  "#event_name" : "testA",
  "#time" : "2022-10-25 14:30:29.256"
}
```

**Data Upload to TA** (keyword: `[THINKING] flush success sendContent`)

```objectivec
2022-10-25 17:30:32.551796+0800 TATest_iOS[85710:698131] [THINKING] flush success sendContent---->:{
  "#app_id" : "af6861d085e14b5c948662e1fcdce6ef",
  "data" : [...],
  "#flush_time" : 1666690232351
}
```

**Upload to TA Result** (keyword: `flush success responseData`)

code 0 means upload success

```objectivec
2022-10-25 17:30:32.552237+0800 TATest_iOS[85710:698131] [THINKING] flush success responseData---->{
  "code" : 0
}
```

### iOS Version 3.0 and After

Log filter field "[ThinkingData]"

**Enable Log Printing**

```objectivec
[TDAnalytics enableLog:YES];
```

**Initialize SDK**

```
2024-02-01 12:07:05.077926+0800 TATest_iOS[32411:14665745] [ThinkingData] [ThinkingData][Info] initialized successfully!
 AppID: af6861d085e14b5c948662e1fcdce6ef
 ServerUrl: https://receiver-ta-demo.thinkingdata.cn
 Mode: Debug
 TimeZone: Local Time Zone (Asia/Shanghai (GMT+8) offset 28800)
 DeviceID: 15F96974-CE32-44F5-9AD0-F259349FDAF2
 Lib: iOS
 LibVersion: 3.0.0
```

**Data Stored Locally** (keyword: `[ThinkingData] [Info] Enqueue data`)

```
2023-09-05 14:27:44.721461+0800 TestTAiOS[41411:3781875] [ThinkingData] [Info] Enqueue data: {
  "properties" : {...},
  "#type" : "track",
  "#uuid" : "0ECCD33B-8076-42A5-BA2B-89DE0773B84B",
  "#distinct_id" : "51C6265F-8F03-461E-91D3-D0FFB11DFCFD_2",
  "#event_name" : "iOS_001",
  "#time" : "2023-09-05 14:27:44.719"
}
```

**Data Upload to TA** (keyword: `[ThinkingData] [Debug] flush success sendContent`)

```
2023-09-05 14:28:14.834448+0800 TestTAiOS[41411:3782015] [ThinkingData] [Debug] flush success sendContent---->:{...}
```

**Upload to TA Result**

- code 0 means upload success
- If flush success responseData is printed, can consider upload successful. Only look at response status code 200, not return content code

```
2023-09-05 14:28:14.835774+0800 TestTAiOS[41411:3782015] [ThinkingData] [Debug] flush success responseData---->{
  "code" : 0
}
```

### Android Version Before 3.0

Log filter field "ThinkingAnalytics"

**Enable Log Printing**

```java
ThinkingAnalyticsSDK.enableTrackLog(true);
```

**Initialize SDK**

mode: indicates SDK used mode

```
2024-04-09 13:39:23.458 12219-12219 ThinkingAnalyticsSDK cn.thinkingdata.android.demo I Thinking Analytics SDK 2.8.3 instance initialized successfully with mode: NORMAL, APP ID ends with: 3356, server url: https://receiver.ta.thinkingdata.cn/sync, device ID: d4d6419233102942
```

**Data Stored Locally** (keyword: `Data enqueued`)

```
2022-10-26 10:56:54.416 6445-6528/cn.thinkingdata.android.demo I/ThinkingAnalytics.DataHandle: Data enqueued(e6ef):
    {
        "#type": "track",
        "#time": "2022-10-26 10:56:54.285",
        "#distinct_id": "04af1a3d-56b2-4c8f-a54a-2b6f655b8286",
        "#event_name": "testA",
        ...
    }
```

**Data Upload to TA and Result** (keyword: `upload message`)

code 0 means upload success

```
2022-10-26 10:56:54.637 6445-6526/cn.thinkingdata.android.demo I/ThinkingAnalytics.DataHandle: ret code: 0, upload message: {...}
```

### Android Version After 3.0

Log filter field "[ThinkingData]"

**Enable Log Printing**

```java
TDAnalytics.enableLog(true);
```

**Initialize SDK**

```
2024-04-09 13:48:02.088 13974-13974 ThinkingAnalyticsSDK cn.thinkingdata.android.demo I [ThinkingData] Info: ThinkingData SDK 3.0.2 initialize success with mode: NORMAL, APP ID ends with: 3df0, server url: https://receiver-ta-preview.thinkingdata.cn/sync
```

**Data Stored Locally** (keyword: `[ThinkingData] Info: Enqueue data`)

```
2023-09-14 10:09:52.461 15126-15163/com.example.tatest_android I/ThinkingAnalytics.DataHandle: [ThinkingData] Info: Enqueue data(e6ef):
    {
        "#type": "track",
        "#time": "2023-09-14 10:09:52.445",
        "#distinct_id": "b86de4eb-12b8-4ce4-924a-54cd12b5fa25",
        "#event_name": "android_001",
        ...
    }
```

**Data Upload to TA** (keyword: `[ThinkingData] Debug: Send event, Request =`)

```
2023-09-14 10:09:52.688 15126-15162/com.example.tatest_android D/ThinkingAnalytics.DataHandle: [ThinkingData] Debug: Send event, Request = {...}
```

**Upload to TA Result** (keyword: `[ThinkingData] Debug: Send event, Response =`)

code 0 means upload success

```
2023-09-14 10:09:52.688 15126-15162/com.example.tatest_android D/ThinkingAnalytics.DataHandle: [ThinkingData] Debug: Send event, Response ={
        "code": 0
    }
```

### Unity Version Before 3.0

**Enable Log Printing**

Note: EnableLog needs to be called after StartThinkingAnalytics

```csharp
ThinkingAnalyticsAPI.EnableLog(true);
```

**Data Stored Locally** (keyword: `Save event`)

```
[ThinkingEngine] (Unity_V2.6.0-beta.1) Save event: {...}
```

**Data Upload to TA** (keyword: `Post event`)

```
[ThinkingEngine] (Unity_V2.6.0-beta.1) Post event: {...}
```

**Upload to TA Result**

code 0 means upload success

```
[ThinkingEngine] (Unity_V2.6.0-beta.1) Response: {"code":0}
```

### Unity Version After 3.0

**Enable Log Printing**

Note: EnableLog needs to be called after Init. Unity log is enabled by default.

```csharp
TDAnalytics.EnableLog(true);
```

**Data Stored Locally** (keyword: `Enqueue data`)

```
[ThinkingData] Info: Enqueue data: {...}
```

**Data Upload to TA** (keyword: `Send event Request`)

```
[ThinkingData] Info: Send event Request: {...}
```

**Upload to TA Result** (keyword: `Send event Response`)

- Normal mode, code 0 means upload success
- Debug mode, if no whitelist added, "errorLevel":-1, prompts to add whitelist
- Debug mode, if whitelist added, "errorLevel":0, means upload success

### OpenHarmony

Log filter field "[ThinkingData]", but due to print field limit, usually no filter condition added

**Enable Log Printing**

```
TDAnalytics.enableLog(true);
```

**Initialize SDK**

```
[ThinkingData] Info: ThinkingData SDK 1.3.3 initialize success with mode: NORMAL, APP ID ends with: e6ef, server url: https://receiver-ta-demo.thinkingdata.cn, device ID: ad6a69cf-3f2c-47ed-a6e9-4808e36cc61f
```

**Data Stored Locally** (keyword: `[ThinkingData] Info: Enqueue data`)

```
[ThinkingData] Info: Enqueue data : {...}
```

**Data Upload to TA** (keyword: `[ThinkingData] Info: Send event`)

```
[ThinkingData] Info: Send event, Request = {...}
```

**Upload to TA Result** (keyword: `[ThinkingData] Info: Response`)

If Response is printed, can consider upload successful. Only look at response status code 200, not return content code

```
[ThinkingData] Info: Response :{"responseCode":200,...}
```

# III. Query Data in TE System

Use SQL to query data via #device_id, here data is most timely, real-time data is also less timely than here

1. Select SQL query in Analysis
2. Parse event table, add #device_id in where clause
