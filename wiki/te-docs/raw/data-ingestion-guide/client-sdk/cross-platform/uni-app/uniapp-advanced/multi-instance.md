---
code: uniapp_sdk_multi_appid
name: "Multi-Instance"
wikiToken: UwidwC00DiRr0pkIdqDccoCOnwh
parentWikiToken: DM7kwtiBMiCpWCkk7icczidxn7c
updateTime: 1774249174000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=uniapp_sdk_multi_appid
---

The multi-APPID feature could create multiple SDK instances to perform data tracking based on their own APPID. That is, you can report data to multiple APPIDs. 
Multiple instances share preset device-related attributes (including device ids). Other attributes are not shared:
- `#distinct_id` distinct ID
- `#account_id` account ID
- super propert、Dynamic public property
- `timeEvent` related event
You can report data to another project by creating a child instance, or to another set of user ids.
```javascript
var config_1 = {
  appId: "app-id-1", 
  serverUrl: "https://youserverurl.1.com"
};
TDAnalytics.init(config_1);

var config_2 = {
  appId: "app-id-2", 
  serverUrl: "https://youserverurl.2.com"
};
TDAnalytics.init(config_2);

//Report events to app-id-1
TDAnalytics.track({
    eventName: 'event_from_appid_1'
});
//Report events to app-id-1
TDAnalytics.track({
    eventName: 'event_from_appid_1'
}, 'app-id-1');
//Report events to app-id-2
TDAnalytics.track({
    eventName: 'event_from_appid_2'
}, 'app-id-2');
```
