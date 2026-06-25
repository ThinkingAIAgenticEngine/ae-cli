---
code: corona_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: QsdxwfT04iDDK8kNLAEc6z5YnRb
parentWikiToken: VgpBwhQ5aiThtUklu2Gc60vnngg
updateTime: 1774249154000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=corona_sdk_autotrack
---

Corona SDK Automatic Event Tracking events including installation, open, close.
- `appInstall`: behavior of APP installation
- `appStart`: Open APP, including activiting APP and resuming APP from the background
- `appEnd`: Close APP, including disabling the APP and calling in the background while tracking the duration of the enabling process
You can enable auto-tracking during initialization
```lua
-- enable auto-tracking
local params = {
    appId = "YOUR_APP_ID",
    serverUrl = "YOUR_SERVER_URL",
    autoTrack = {
        "appStart", "appEnd", "appInstall"
    }
}
TDAnalytics.init( params )
```

<quote-container>
Note: If you need to set distinct ID, please call `setDistinctId` before enabling auto-tracking.
</quote-container>
