---
code: unity_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: VK92wPhIqirJJAknRxLcG3fsnNe
parentWikiToken: A3TawLiiwiV2LZkUDTAc1YuOnmd
updateTime: 1774249092000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_autotrack
---

## 1. Enable Auto-tracking
<callout emoji="books" background-color="light-orange" border-color="light-orange">
HarmonyOS currently does not support automatic collection.
</callout>

You can call `EnableAutoTrack` to enable the auto-tracking function:
```csharp
// auto-tracking events type
public enum TDAutoTrackEventType
{
    None = 0,
    AppStart = 1 << 0,
    AppEnd = 1 << 1,
    AppCrash = 1 << 4,
    AppInstall = 1 << 5,
    AppSceneLoad = 1 << 6,
    AppSceneUnload = 1 << 7,
    All = AppStart | AppEnd | AppInstall | AppCrash | AppSceneLoad | AppSceneUnload
}
```

More details about auto-tracking events:
- **AppStart**: Open APP, including activating APP and resuming APP from the background
<callout emoji="bulb" background-color="light-orange" border-color="light-orange">
Note: The AppStart event for WeChat mini-games has been changed to the show event, with the event name: `*ta_mg_show*`. The attribute `*start_reason*` has been added.
</callout>

- **AppEnd**: Close APP, including disabling the APP and calling in the background while tracking the duration of the enabling process
<callout emoji="bulb" background-color="light-orange" border-color="light-orange">
Note: The AppEnd event for WeChat mini-games has been changed to the hide event, with the event name: `*ta_mg_hide*`.
</callout>

- **AppCrash**: Record crash information when the APP crashes
- **AppInstall**: Record APP installation
<callout emoji="bulb" background-color="light-orange" border-color="light-orange">
Note: The AppInstall event for WeChat mini-games has been changed to the launch event, with the event name: `*ta_mg_launch*`. The attribute `*start_reason*` has been added.
</callout>

- **AppSceneLoad**: Record game scene loading
- **AppSceneUnload**: Record game scene unloading
- **All**: All types above
```csharp
// enable all auto-tracking events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All);

// enable Open and Close events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd);
```

<quote-container>
Note: If you need to set a custom distinct ID or super properties, be sure to set them before enabling auto-tracking events
</quote-container>

About APP_CRASH, if you only want to track Objective-C and Java exceptions on iOS and Android, but not C# exceptions, you can configure disabled information by adding ta_public_config.xml in the Resources directory in v2.3.1 and above versions.
```xml {wrap}
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ThinkingAnalytics disable C# Exception -->
    <bool name="DisableCSharpException">true</bool>
</resources>
```

## **2. Set the Properties of Auto-tracking Events**
Starting from v2.2.4, you can enable auto-tracking by calling `EnableAutoTrack` with properties that need to be tracked.
```csharp {wrap}
// enable aotu-tracking with properties
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All, new Dictionary<string, object>() {
    {"custom_key", "custom_value"}
});
```

You can also call `SetAutoTrackProperties` to set properties for auto-tracking events.
<quote-container>
Note: `SetAutoTrackProperties` will not enable auto-tracking, you need to call `EnableAutoTrack` at the same time.
</quote-container>

```csharp {wrap}
// set properties for a auto-tracking event
TDAnalytics.SetAutoTrackProperties(TDAutoTrackEventType.AppStart, new Dictionary<string, object>() 
{
    {"start_key", "start_value"}
});

// set properties for auto-tracking events
TDAnalytics.SetAutoTrackProperties(TDAutoTrackEventType.AppInstall | TDAutoTrackEventType.AppStart, new Dictionary<string, object>() 
{
    {"install_crash_key", "install_crash_value"}
});

// enable auto-tracking for all
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All);
```

## **3. Set Auto-tracking Event Callbacks**
Starting from v2.4.0, it supports setting auto-tracking event callbacks to set properties in time, or execute code when events are triggered. To set auto-tracking event callback, you need to create a new class and implement the interface `TDAutoTrackEventHandler` , and override the method `public Dictionary<string, object> GetAutoTrackEventProperties(int type, Dictionary<string, object>properties)`. The return value of this method is the properties that need to be set. Then call `EnableAutoTrack` to pass in the auto-tracking event callback object.
```csharp
// 1. implement auto-tracking callback
public class AutoTrackECB : TDAutoTrackEventHandler
{
    public Dictionary<string, object> GetAutoTrackEventProperties(int type, Dictionary<string, object>properties)
    {
        return new Dictionary<string, object>() 
        {
            {"AutoTrackEventProperty", DateTime.Today}
        };
    }
}
// 2. enable auto-tracking, and set callback
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All, new AutoTrackECB());
```
