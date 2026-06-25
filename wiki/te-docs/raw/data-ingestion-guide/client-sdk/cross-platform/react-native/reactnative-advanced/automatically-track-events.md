---
code: rn_sdk_autotrack
name: "Automatically Track Events"
wikiToken: EVwUwiZdYi3jhEkcAhHcNxSrnkd
parentWikiToken: GKCGw8YI4itlKEk4miNccirjnfc
updateTime: 1774249183000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=rn_sdk_autotrack
---

## **1. Enable Auto-Tracking**
You can call `enableAutoTrack` and pass in a List of type `TDAutoTrackEventType` to enable the auto-tracking function:
1. Install:  behavior of APP installation,the corresponding type is `TDAutoTrackEventType.APP_INSTALL`
2. Open APP: including activiting APP and resuming APP from the background, the corresponding type is `TDAutoTrackEventType.APP_START`
3. Close APP: including disabling the APP and calling in the background, the corresponding type is `TDAutoTrackEventType.APP_END`
4. Crash:Record crash information when the APP crashes, the corresponding type is `TDAutoTrackEventType.APP_CRASH`
1. Page view:The APP is triggered when using Navigator route jump,the corresponding type is `TDAutoTrackEventType.APP_VIEW_SCREEN`
1. Element click:The APP control click event will be triggered when the user clicks the control. The corresponding type is `TDAutoTrackEventType.APP_CLICK`
pay attention to auto-tracking event:
1. The auto-tracking event is implemented in the native SDK, so Dynamic Public Properties cannot be added to the automatic collection event at present.
1. If you need to set the distinct ID or public properties, please complete the settings before enabling automatic event collection.
Example of enabling auto-tracking:
```typescript
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_INSTALL| TDAutoTrackEventType.APP_CRASH | TDAutoTrackEventType.APP_CLICK | TDAutoTrackEventType.APP_VIEW_SCREEN);
```

## **2. Detailed Introduction**
### 2.1 Page view events
The app's page browsing events support React Navigation ^2.0 ~ ^6.0.
The APP is triggered when using Navigator route jump. The detailed event description is as follows:
- Event Name：ta_app_view
- Preset Properties：
  `#screen_name`：String type, page name
  `#title`：String type, page title
  `#referrer`：String type, forward address
- Steps to start：
  - Call enableAutoTrack, passing in TDAutoTrackEventType.APP_VIEW_SCREEN
  ```typescript
  TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_VIEW_SCREEN);
  ```

  - Execute script
  ```typescript
  node node_modules/react-native-thinking-data/ThinkingDataRNHook.js -run
  ```

- Set custom page attributes: When navigating via Navigation, you can add custom attributes in params. The SDK will automatically use the settings in params to supplement or override the attributes of the App's page browsing events.
  ```typescript
  navigation.navigate('PageB', {
    thinkingdataparams: {
      name: 'name_A',
      '#title': 'page_two',
      '#screen_name': "page_B"
    }
  });
  ```

If you need to customize #title and #screen_name, you can pass them in the thinkingdataparams parameter.
- Ignore individual page view events: Adding the TDIgnoreViewScreen property to thinkingdataparams with a value of true will ignore the page view event.
  ```typescript
  navigation.navigate('PageB', {
    thinkingdataparams: {
      name: 'name_A',
      '#title': 'page_two',
      '#screen_name': "page_B",
      TDIgnoreViewScreen: true
    }
  });
  ```

### 2.1 Element click event
The APP control click event will be triggered when the user clicks the control
- Event Name：ta_app_click
- Preset Properties：
  `#screen_name`：String type, page name
  `#title`：String type, page title
  `#element_content`：String type, element content
- Steps to start：
  - Call enableAutoTrack, passing in TDAutoTrackEventType.APP_CLICK
  ```typescript
  TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_CLICK);
  ```

  - Execute script
  ```typescript
  node node_modules/react-native-thinking-data/ThinkingDataRNHook.js -run
  ```

- Set custom properties for the control: Add the custom property thinkingdataparams to the control.
```typescript
<CustomButton
  title="button"
  thinkingdataparams={{
    name: 'button',
    pro_key:'pro_value'
  }}
/>
```

- Ignore click events for individual controls: Adding the TDIgnoreViewClick property to thinkingdataparams with a value of true will ignore click events for that control.
```typescript
<CustomButton
  title="button"
  thinkingdataparams={{
    name: 'button',
    pro_key:'pro_value'
    TDIgnoreViewClick: true
  }}
/>
```

## **3****. Set Auto-tracking Event Public Properties**
You can call `setAutoTrackProperties` to set or update custom properties
```javascript
TDAnalytics.enableAutoTrack({
    autoTrackTypes: TDAutoTrackEventType.APP_START,
    properties: {
        auto_name: "xxx",
        auto_age: "xxx"
    }
})
```
