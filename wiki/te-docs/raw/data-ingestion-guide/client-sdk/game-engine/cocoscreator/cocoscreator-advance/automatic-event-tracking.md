---
code: cocoscreator_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: KS9vw7Yq6i5BcwkLJhdczOskn4e
parentWikiToken: DHMrw6JkgiGcwxkzyPKc55VJn0c
updateTime: 1774249140000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocoscreator_sdk_autotrack
---

## **1. Introduction **
CocosCreator SDK support auto-tracking Mini Game Event:
1. Open Mini Game, including activiting Mini Game and resuming Mini Game from the background
2. Close Mini Game: including disabling the Mini Game
## **2. Enable Auto-Tracking**
Configing before SDK initialization to enable auto-tracking: 
```javascript
var config = {
    appid: "YOUR_APPID",
    server_url: "YOUR_SERVER_URL",
    autoTrack: {
         appShow: true, 
         appHide: true, 
         properties: { 
         callback: (eventType:any) =>{ 
           if (eventType === 'appShow')
           {
            return { appShowKey: 'appShowValue' };
           } 
           else if (eventType === 'appHide')
           {
            return { appHideKey: 'appHideValue' };
           } 
           else {
             return {};
           }
         }
     }
};
TDAnalytics.init(config);
```

- appShow: enable auto-tracking open Mini Game
- appHide: enable auto-tracking close Mini Game
- properties: auto-tracking events properties
- callback: auto-tracking events callback
If you need the first automatically collected event to include the account, visitor, and static public attributes, you can pass in the following configuration during initialization:
```javascript
TDAnalytics.init(config, () => {
  TDAnalytics.login("TA")
  TDAnalytics.setDistinctId("DIS_TA")
  TDAnalytics.setSuperProperties({
    key: "value"
  });
});
```

## **3. Instructions**
### **3.1 Open Mini Game**
Mini Game started event would be triggered when the user enables the Mini Game or resumes the Mini Game from the background. A detailed description of the start event is as follows:
- Event Name：ta_mg_show
- Auto-tracking Event Properties：
  - `#scene`, game scene name
### **2.2 Close Mini Game**
Mini Game end event would be triggered when the user disables the Mini Game or moves the Mini Game to the background. Detailed description of the end event is as follows:
- Event Name：ta_mg_hide
- Auto-tracking Event Properties：
  - `#scene`, game scene name
  - `#duration`, numeric type, indicating the duration of each Mini Game (unit: second)

  
