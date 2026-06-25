---
code: unreal_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: FDgww1mPCiPbO1k68GlcdDgKn1d
parentWikiToken: T3M0w3OWGi4LYjk1XYQcUCbCnff
updateTime: 1774249111000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unreal_sdk_autotrack
---

Unreal SDK Automatic Event Tracking events including installation,open,close etc.
## **1. Introduction **
TE  provides Apis for automatic data tracking. You can select the data to be tracked based on your needs.
Currently, the following types of events can be tracked automatically:
1. Install:  behavior of APP installation
2. Open APP: including activiting APP and resuming APP from the background
3. Close APP: including disabling the APP and calling in the background while tracking the duration of the enabling process
4. Crash:Record crash information when the APP crashes
See below for more details on how to start tracking these events.
## **2. Enable Auto-Tracking**
You can call `EnableAutoTrack` to enable the auto-tracking function:
```cpp
UTDAnalytics::EnableAutoTrack();
```

You can also manually pass in the automatic collection events that need to be started:
```cpp {wrap}
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("ta_app_install"));
EventTypeList.Emplace(TEXT("ta_app_start"));
EventTypeList.Emplace(TEXT("ta_app_end"));
EventTypeList.Emplace(TEXT("ta_app_crash"));
UTDAnalytics::EnableAutoTrackWithType(EventTypeList, AppID);
```

## 3. Set custom properties
Since v1.4.1 , Supports setting custom attributes for automatic collection events. When a specified event is collected, the custom attributes will be merged into the event attributes and reported.
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("ta_app_install"));
EventTypeList.Emplace(TEXT("ta_app_start"));
EventTypeList.Emplace(TEXT("ta_app_end"));
EventTypeList.Emplace(TEXT("ta_app_crash"));
UTDAnalytics::EnableAutoTrackWithTypeAndProperties(EventTypeList, TEXT("{\"autoTrackKey1\":\"autoTrackvalue1\",\"autoTrackKey2\":\"autoTrackvalue2\"}"), AppID);
```

## Set the automatic collection event callback
 Since v1.5.0,  Supports setting callback methods for automatic collection events. When a specified event is collected, the callback will be used to notify and return the current event attributes. You can forward data as needed, or add new event attributes as return.
```cpp
//Define the callback
FString UTAUserWidget::TAAutoTrackProperties(FString AutoTrackEventType, FString Properties)
{
    //AutoTrackEventType automatically collects event types
    //Properties The event properties carried by the current event
    //processing logic
    FDateTime TDateTime = FDateTime::Now();
    int64 SecondTimestamp = TDateTime.ToUnixTimestamp();
    int32 MillisecondPart = TDateTime.GetMillisecond();
    FString TimeStr = *FString::Printf(TEXT("%llu"), SecondTimestamp);
    TimeStr += *FString::Printf(TEXT("%lld"), MillisecondPart);
    return "{\"auto_property1_name\":\"" + AutoTrackEventType + "\",\"auto_property2_time\":\"" + TimeStr + "\"}";
}

//set callback
void UTAUserWidget::Call_TA_SetAutoTrackEventListener()
{   
    TArray<FString> EventTypeList;
    EventTypeList.Emplace(TEXT("ta_app_install"));
    EventTypeList.Emplace(TEXT("ta_app_start"));
    EventTypeList.Emplace(TEXT("ta_app_end"));
    EventTypeList.Emplace(TEXT("ta_app_crash"));
    UTDAnalytics::SetAutoTrackEventListener(this, &UTAUserWidget::TAAutoTrackProperties, EventTypeList, AppID);
}
```

### 
#### 
## 
### 

