---
code: ios_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: IqwOwQmTbiVNXZk8r4JcmZAMnie
parentWikiToken: N4t8wyPNKip6pSkZsZvcYBpMnRc
updateTime: 1774249058000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ios_sdk_autotrack
---

## **1. Introduction **
TE  provides Apis for automatic data tracking. You can select the data to be tracked based on your needs.
Currently, the following types of events can be tracked automatically:
1. Install:  behavior of APP installation
2. Open App: including activiting APP and resuming APP from the background
3. Close App: including disabling the APP and calling in the background while tracking the duration of the enabling process
4. View Page:The user views the screen in the APP (`UIViewController`)
5. Click:The user clicks on the UI element  in the APP
6. Crash:Record crash information when the APP crashes
See below for more details on how to start tracking these events.
## **2. Enable Auto-Tracking**
You can call `enableAutoTrack:` to enable the auto-tracking function:
```objectivec
//enable autotrack event
[TDAnalytics enableAutoTrack:
TDAutoTrackEventTypeAppStart | //APP enable event
TDAutoTrackEventTypeAppInstall | // APP install event
TDAutoTrackEventTypeAppEnd | //APP disable event
TDAutoTrackEventTypeAppViewScreen | //APP view screen event 
TDAutoTrackEventTypeAppClick | //APP click view event
TDAutoTrackEventTypeAppViewCrash]; //APP crash event
```

## **Instructions**
### **3.1 Installation Events**
APP install event would record the installation of the APP and be reported when the APP is being activated. The event is triggered when the APP is activated for the first time after installation. APP upgrade would not trigger an  installation event.  If the user reinstalls the app after uninstalling it, the installing event will be triggered again.
- Event name: ta_app_install
### **3.2 Active Events**
APP started event would be triggered when the user enables the APP or resumes the APP from the background. A detailed description of the start event is as follows:
- Event name: ta_app_start
- Preset property: `#resume_from_background`, Boolean  type, indicating whether the APP is enabled by the user or resumed from the background. If the value is true, it means the APP is resumed from the background; if the value is false, it means the APP is enabled by the user directly. 
### **3.3 Inactive Events**
APP end event would be triggered when the user disables the APP or moves the APP to the background. Detailed description of the end event is as follows:
- Event name: ta_app_end
- Preset property:`#duration`, numeric type, indicating the duration of each APP (unit: second).
### **3.4 View Page Events**
APP view screen event would be triggered when the user views the screen (View Controller). Detailed event introduction is as follows: 
- Event name: ta_app_view
- Preset property: 
  `#screen_name`, string  type, package name, and category name of View Controller
  `#title`, string type,  title of View Controller, value: the value of `controller.navigationItem.title`
      Other properties could be added to view screen events to expand their analysis value. Methods for defining the properties of view screen events are as follows

#### **3.4.1  Define The Properties of View Page Events**
As for the view page events of `UIViewController`, properties could be added by implementing  the Protocol `<TDScreenAutoTracker>`. URL information and other self-defined properties could be added for view page events through the following two methods:
```objectivec
@interface MYController : UITableViewController<TDScreenAutoTracker>
@end

@implementation MYController

- (NSDictionary *)getTrackProperties {
    return @{@"PageName" : @"ABCD", @"ProductId" : @12345};
}

- (NSString *)getScreenUrl {
    return @"APP://test";
}

/** Multi-Instance， Configure with appid
 *  - (NSDictionary *)getTrackPropertiesWithAppid{
 *      return @{@"appid1" : @{@"testTrackProperties" : @"ABCD"},
 *               @"appid2" : @{@"testTrackProperties2" : @"ABCD"},
 *               };
 *  }
 *  -(NSDictionary *)getScreenUrlWithAppid {
 *      return @{@"appid1" : @"APP://test1",
 *               @"appid2" : @"APP://test2",
 *               };
 *  }
 */
@end
```

       The returned value of `getScreenUrl`would be used as the URL Schema of the `UIViewController`. When the view event of the page is triggered, preset property `#url` will be added. Meanwhile, SDK will fetch the URL Schema of the page before redirection. If it succeeds, it will be added to the preset property `#referrer` as the forward address.
      The returned value of `getTrackProperties` is the self-defined property of the view event of the screen, and would join the view event of the screen automatically 
### **3.5 C****licked events**
App view click event would be triggered when the user clicks the control(view)
- Event name: ta_app_click
- Preset property:
  `#screen_name`, string type, consist of category name of the UIViewController which control(view) belongs to
  `#element_content`, character string type, the content of the control/view 
  `#element_type`, character string type, type of the view 
   It only exists when the control type is `UITableView` or `UICollectionView`, indicating the position where the control is clicked, and the value is `group(Section):item(Row)`
#### **3.5.1 Define ViewID**
You can set `#element_id`  as a view ID on the page to partition different view, you can use `thinkingAnalyticsViewID` to set the view ID:
```objectivec
self.table1.thinkingAnalyticsViewID = @"testtable1";

// Multi-Instance， Configure with appid
self.table1.thinkingAnalyticsViewIDWithAppid = @{ @"app1" : @"testtableID2",
                        @"app2" : @"testtableID3" };
```

`#element_id` will be added to the click event of table1, and the value is the incoming value here
- Related preset attributes: #element_id, character string type
#### **3.5.2 Define The Properties of Clicked Events**
You can apply the following method to add self-defined properties for Clicking a certain view.
```objectivec
self.table1.thinkingAnalyticsViewProperties = @{@"key1":@"value1"};

// Multi-Instance， Configure with appid
self.table1.thinkingAnalyticsViewPropertiesWithAppid = @{@"app1":@{@"tablekey":@"tablevalue"},
     @"app2":@{@"tablekey2":@"tablevalue2"}
};
```

#### **3.5.3 Define Properties of UITableView And UICollectionView Click Events**
For `UITableView` and `UICollectionView`, you need to set custom properties by implementing `Protocol<TDUIViewAutoTrackDelegate>`:
1. First, implement `Protocol<TDUIViewAutoTrackDelegate>` in the View Controller class
2. Secondly, set the proxy in the class, it is recommended to set it in the `viewDidLoad` method
```objectivec
self.table1.thinkingAnalyticsDelegate = self;
```

- `table1` can be replaced with a View that needs to set custom properties
3. Then implement the method according to the type of View Controller
- `UITableView` needs to implement
```objectivec
//Set all APPID instances and set the custom properties of UITableView
-(NSDictionary *) thinkingAnalytics_tableView:(UITableView *)tableView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath
{
    return @{@"testProperty":@"test"};
}

/** Multi-Instance， Configure with appid
 * -(NSDictionary *) thinkingAnalyticsWithAppid_tableView:(UITableView *)tableView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath {
 *    return @{@"app1":@{@"autoPro":@"tablevalue"},
 *              @"app2":@{@"autoPro2":@"tablevalue2"}
 *            };
 * }
 */
```

- `UICollectionView` needs to implement
```objectivec
//Set all APPID instances and set the custom properties of UICollectionView
-(NSDictionary *) thinkingAnalytics_collectionView:(UICollectionView *)collectionView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath;
{
    return @{@"testProperty":@"test"};
}

/** Multi-Instance， Configure with appid
 * - (NSDictionary *)thinkingAnalyticsWithAppid_collectionView:(UICollectionView *)collectionView autoTrackPropertiesAtIndexPath:(NSIndexPath *)indexPath {
 *     return @{@"app1":@{@"autoProCOLL":@"tablevalueCOLL"},
 *              @"app2":@{@"autoProCOLL2":@"tablevalueCOLL2"}
 *              };
 * }
 */
```

4.Finally, set `thinkingAnalyticsDelegate` to `nil` in the `viewWillDisappear` method of the class
```objectivec
-(void)viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    self.table1.thinkingAnalyticsDelegate = nil;
}
```

- `table1` can be replaced with a View that needs to set custom properties, corresponding to when setting the proxy
### **3.6 Crash Events**
When an unexpected crash occurs in the APP, an APP crash event would be reported
- Event name: ta_app_crash
- Preset property:`#app_crashed_reason`, character string type, record the stack trace upon crash
## **4.Ignore Auto-Tracking Event**
You can ignore the auto-tracking event of activity or view by the following means
### **4.1 ****View Page Events**
As for certain screens (`UIViewController`), if you do not want to transmit auto-tracking events (including view screen event and view click event), you can ignore them by the following means:
```objectivec
NSMutableArray *array = [[NSMutableArray alloc] init];
[array addObject:@"IgnoredViewController"];

//ignore some screen
[TDAnalytics ignoreAutoTrackViewControllers:array];
```

### **4.2 Click Events of Type Control**
You can apply the following method to ignore the Click Events of Type Control
```objectivec
[TDAnalytics ignoreViewType:[IgnoredClass class]];
```

- `ignoredClass` is the type of view that needs to be ignored. 
### **4.3 Click Events  of  A Control(View)**
You can apply the following method to ignore the Click Events  of  A Control(View)
```objectivec
self.table1.thinkingAnalyticsIgnoreView = YES;

// Multi-Instance， Configure with appid
self.table2.thinkingAnalyticsIgnoreViewWithAppid = @{@"appid1" : @YES,@"appid2" : @NO};
```

- `table1` is the View to be ignored
## **5.Preset Properties of Auto-Tracking Events**
The following preset properties are the properties set specially for each auto-tracking event
- Preset properties of APP start event (ta_app_start)

| ** Property name** | **Display name** | ** Property type ** | ** Instruction ** |
|---|---|---|---|
| #resume_from_background | Resume from the background or note | Bool | Indicating whether the APP is enabled by the user or resumed from the background. If the value is true, it means the APP is resumed from the background; if the value is false, it means the APP is enabled by the user directly. |
| #start_reason | Start reason | Text | Displays the reason for APP starting, and the value is string. Currently supports favorite deeplink, push, 3dtouch start reason. For the sample, please refer to:`{url:"thinkingdata://","data":{}}` |
| #background_duration | Duration in the background | Numeric value | Unit: second |

- Preset properties of APP end event (ta_app_end)

| ** Property name** | **Display name** | ** Property type ** | ** Instruction ** |
|---|---|---|---|
| #duration | Event duration | Numeric value | Indicating the duration of the APP access (unit: second). |

- Preset properties of APP view screen event (ta_app_view)

| ** Property name ** | ** Display name ** | ** Property type ** | ** Instruction ** |
|---|---|---|---|
| #title | Screen title | Text | Title of the ViewController, to be set by invoking `controller.navigationItem.title`. |
| #screen_name | Screen name | Text | Class name of ViewController. |
| #url | Screen URL | Text | The url of current screen, to be set by invoking `getScreenUrl` |
| #referrer | Forward address | Text | The address of the screen before skipping, to be set by invoking `getScreenUrl` |

- Preset properties of APP view click event (ta_app_click)

| ** Property name ** | ** Display name ** | ** Property type ** | ** Instruction ** |
|---|---|---|---|
| #title | Screen title | Text | Title of the `ViewController`, to be set by invoking `controller.navigationItem.title`. |
| #screen_name | Screen name | Text | Class name of `ViewController`. |
| #element_id | Element ID | Text | The ID of the `UIView`. e.g. `button.thinkingAnalyticsViewID` |
| #element_type | Element type | Text | Type of the `UIView` |
| #element_selector | Element selector | Text | Splicing of the `viewPath` of the `UIView` |
| #element_position | Element position | Text | `UIView` position information that exists only if the control type is `UITableView` or `UICollectionView`. The value is `Section`, `Row`. |
| #element_content | Element content | Text | Content on the `UIView` |

- Preset properties of APP crash event (ta_app_crash)

| ** Property name ** | ** Display name ** | ** Property type ** | ** Instruction ** |
|---|---|---|---|
| #app_crashed_reason | Abnormal information | Text | Character string type, record the stack trace upon crash |

## **6.Self-defined Property For Auto-Tracking**
You can call `enableAutoTrack:properties:` to enable the auto-tracking function and update self-defined property for auto-tracking:
```objectivec
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAll properties:@{@"auto_key1": @"auto_value1"}];
```

You can also call `setAutoTrackProperties:properties:`, to set up or update the properties.
```objectivec
[TDAnalytics setAutoTrackProperties:TDAutoTrackEventTypeAll properties:@{@"auto_key2": @"auto_value2"}];
```

## **7. Callback for Auto-Tracking**
Since v2.7.4, You can call `enableAutoTrack:callback:` to enable auto-tracking function, and you can add or update property in the callback.
```objectivec
[TDAnalytics enableAutoTrack:TDAutoTrackEventTypeAll callback:^NSDictionary * _Nonnull(TDAutoTrackEventType eventType, NSDictionary * _Nonnull properties) {
    if (eventType == TDAutoTrackEventTypeAppStart) {
      return @{@"addkey":@"addvalue"};
    }
    if (eventType == TDAutoTrackEventTypeAppEnd) {
      return @{@"updatekey":@"updatevalue"};
    }
    return @{};
}];
```

> Please do not do time-consuming operations in this callback, otherwise it will affect the normal storage of data
