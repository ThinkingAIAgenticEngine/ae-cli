---
code: uniapp_sdk_autotrack
name: "Automatically Track Events"
wikiToken: F2MmwPLE7iVwHfktWXFc3htdnIg
parentWikiToken: DM7kwtiBMiCpWCkk7icczidxn7c
updateTime: 1774249169000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=uniapp_sdk_autotrack
---

We provide auto-tracking  function. You only need to enable the events you need to automatically collect in config when creating the instance. SDK will automatically collect some behaviors of the mini program.
automated data collection is now supported:
1. mini program initialization,this is triggered only once by a user
2. mini program active， including startup and background back to  foreground
3. mini program inactive，and record the time of this access (start to the background)
the methods for collecting each type of data are described in detail next
## **1. Enable Auto-Tracking**
in config, the elements in the autoTrack parameter represent the switch for each auto collection event, set to true to enable auto collection:
```javascript
var config = {
  appid: "YOU-APP-ID",
  server_url: "https://youserverurl.com",
  autoTrack: {
    appLaunch: true, // auto-tracking ta_mp_launch
    appShow: true, // auto-tracking ta_mp_show
    appHide: true, // auto-tracking ta_mp_hide
    pageShow: true, // auto-tracking ta_mp_view
    pageShare: true, // auto-tracking ta_mp_share
  }
};
```

- `appLaunch`：auto tracking mini-program launch
- `appShow`：auto tracking mini-program active and resume mini-program from the background
- `appHide`：auto tracking mini-program enter in background
## **2.Detailed Introduction**
### 2.1 mini-program initialization
mini-program initialization will be triggered when the mini-program is opened for the first time or when the user kills the process and starts it again. It will only be triggered once in the life cycle of the process. The detailed event is described as follows:
- event name:ta_mp_launch
- auto-tracking attributes: `#scene`, the scene value is taken from the scene value provided by wechat
Through the mini-program initialization event, you can calculate the daily user usage and per-capita user usage, including viewing the usage of users with different scenario values grouped by scenario values.
### 2.2 mini-program active
mini-program active will be triggered when mini-program is started, or when mini-program is called back to the foreground from the background. The detailed event is described as follows:
- event name:ta_mp_show
- auto-tracking attributes：
- `#scene`，the scene value is taken from the scene value provided by wechat
- `#url_path`，page path, mini-program to start the displayed page path
the startup of mini-program is not suitable for direct analysis due to the influence of the call out before and after (many), but it can be used in the behavior path to identify a user's use, can be used as the initial behavior of the user behavior path
### 2.3 mini-program inactive
mini-program  inactive will be triggered when the mini-program is called into the background, and record the duration of this use,The detailed event is described as follows:
- event name:ta_mp_hide
- auto-tracking attributes： 
  - `#scene`，the scene value is taken from the scene value provided by wechat
  - `#duration`，The value is a numeric value, indicating the duration from this start (ta_mp_show) to hiding
mini-program inactive events record the usage duration (in seconds), so you can directly calculate the total user usage duration and per capita duration, or you can divide by the initialization times to calculate the single usage duration.
