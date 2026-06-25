---
code: flutter_sdk_autotrack
name: "Automatically Track Events"
wikiToken: V2adwX3TziCBZzkaDUkcbBw6nJf
parentWikiToken: HGZfwfrFmidWBVkBtKzclpHEnSe
updateTime: 1774249196000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=flutter_sdk_autotrack
---

## 1. Enable Auto-Tracking
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
```dart
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START |
    TDAutoTrackEventType.APP_END |
    TDAutoTrackEventType.APP_INSTALL |
    TDAutoTrackEventType.APP_CRASH｜
    TDAutoTrackEventType.APP_CLICK｜
    TDAutoTrackEventType.APP_VIEW_SCREEN);
```

## **2. Detailed Introduction**
### 2.1 Page view events
The APP is triggered when using Navigator route jump. The detailed event description is as follows:
- Event Name：ta_app_view
- Preset Properties：
  `#screen_name`：String type, page name
  `#title`：String type, page title
  `#referrer`：String type, forward address
- Steps to start：
  - Add global monitoring and add navigatorObservers under MaterialApp
  ```dart
  import 'package:thinking_analytics/autotrack/td_page_view.dart';
  
  void main() => runApp(new MaterialApp(
      navigatorObservers: TDNavigatorObserver.wrap([]), home: MyApp()));
  ```

  - Call enableAutoTrack to enable it. The sample code is as follows:
  ```dart
  TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_VIEW_SCREEN,
      autoTrackEventProperties: {
        "test_property": "test_property_value"
      },
      autoTrackPageConfig: TDAutoTrackConfig(
        pageConfigs: [
          TDAutoTrackPageConfig<Page1>(
            screenName: "Page1",
            title: "page one",
          ),
          TDAutoTrackPageConfig<Page2>(
            screenName: "Page2",
            title: "page two",
            ignore: false,
            properties: {
              "multi_property": "multi_property_value"
            },
          )
        ],
  ));
  ```

autoTrackEventProperties：Set common properties for automatic collection
autoTrackPageConfig：Configuration information related to page browsing. You can customize the title and screenName of each page. "ignore" indicates whether to ignore the collection of this page. "properties" indicates the custom properties of the page.
<callout emoji="bullettrain_front" background-color="light-orange" border-color="light-orange">
It needs to be enabled as soon as possible, otherwise the life cycle of the first page will have expired and the browsing events of the first page will not be collected.
</callout>

### 2.1 Element click event
The APP control click event will be triggered when the user clicks the control
- Event Name：ta_app_click
- Preset Properties：
  `#screen_name`：String type, page name
  `#title`：String type, page title
  `#element_type`：String type, element type
  `#element_content`：String type, element content
- Steps to start：
```dart
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_CLICK);
```

- Control custom properties
Customize properties by setting TDElementKey
- The first parameter: element ID, corresponding to the attribute #element_id
- properties：Custom properties
- isIgnore：Whether to ignore the automatic collection events of this control
```dart
import 'package:thinking_analytics/autotrack/td_autotrack_config.dart';

ElevatedButton(
    key: TDElementKey("element id", properties: {"key": "value"},isIgnore: true),
    onPressed: () {},
    child: Text(
      "button",
      style: TextStyle(fontSize: 14),
    )),
```

## **3****. Set Auto-tracking Event Public Properties**
You can call `setAutoTrackProperties` to set or update custom properties
```dart
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START,
    autoTrackEventProperties: {
  'auto_test': 'stu',
  'auto_arr': [1, 2, 3],
  'auto_obj': {'obj_test': 'xxx'}
});
```
