---
code: cocos2d-x_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: GC8pwAeGLiW2vlkR44WcNoJfnId
parentWikiToken: FQF1wNXmZiaQ42kNmOicojvCnO6
updateTime: 1774249125000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocos2d-x_sdk_autotrack
---

Cocos2d-x SDK Automatic Event Tracking events including installation,open,close etc.
## **1. Introduction **
TE provides Apis for automatic data tracking. You can select the data to be tracked based on your needs.
Currently, the following types of events can be tracked automatically:
1. Install:  behavior of APP installation
2. Open APP: including activiting APP and resuming APP from the background
3. Close APP: including disabling the APP and calling in the background while tracking the duration of the enabling process
See below for more details on how to start tracking these events.
You can call `enableAutoTrack` to enable the auto-tracking function:
```cpp
//enable autotrack event
TDAnalytics::enableAutoTrack();
```

Since v1.3.2, Support setting custom property for Automatic Event Tracking. the custom property will be merged into the event properties and reported.
```cpp
TDJSONObject autoProperties;
autoProperties.setString("auto_track_key", "auto_track_value");
TDAnalytics::enableAutoTrack(autoProperties);
```
