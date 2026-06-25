---
code: ios_sdk_preset_properties
name: "Preset Properties"
wikiToken: Ny61w1VIbi5Qeok94fRcJhulned
parentWikiToken: N4t8wyPNKip6pSkZsZvcYBpMnRc
updateTime: 1774249062000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ios_sdk_preset_properties
---

## **1. Preset Properties of All Events**
All Events in iOS SDK(including auto-tracking events) would have the following preset property.
<sheet token="FdJBsTosshqTaKtdn8scmCurnih_NdCvtZ"/>

## **2. Preset Properties of Auto-tracking Event**
The following preset properties are the properties set specially for each auto-tracking event
- Preset properties of APP start event (ta_app_start)

<lark-table rows="4" cols="4" column-widths="143,133,140,328">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      ** Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #resume_from_background
    </lark-td>
    <lark-td>
      Resume from the background or not
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
      Indicating whether the APP is enabled by the user or resumed from the background. If the value is true, it means the APP is resumed from the background; if the value is false, it means the APP is enabled by the user directly.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #start_reason
    </lark-td>
    <lark-td>
      APP enable source
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Displays the reason for APP starting, and the value is string. Currently supports favorite deeplink, push, 3dtouch start reason. For the sample, please refer to:
      `{url:"thinkingdata://","data":{}}`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #background_duration
    </lark-td>
    <lark-td>
      Background duration
    </lark-td>
    <lark-td>
      Numeric value
    </lark-td>
    <lark-td>
      Record the background duration of the APP in the time interval between two start events (Unit: second)
    </lark-td>
  </lark-tr>
</lark-table>

- Preset properties of APP end event (ta_app_end)

<lark-table rows="2" cols="4" column-widths="143,137,138,335">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      ** Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #duration
    </lark-td>
    <lark-td>
      Event duration
    </lark-td>
    <lark-td>
      Numeric value
    </lark-td>
    <lark-td>
      Indicating the duration of the APP access (Unit: second).
    </lark-td>
  </lark-tr>
</lark-table>

- Preset properties of APP view screen event (ta_app_view)

<lark-table rows="5" cols="4" column-widths="149,138,168,302">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      ** Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #title
    </lark-td>
    <lark-td>
      Screen title
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Title of the ViewController, to be set by invoking `controller.navigationItem.title`.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #screen_name
    </lark-td>
    <lark-td>
      Screen name
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Class name of ViewController.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #url
    </lark-td>
    <lark-td>
      Screen URL
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The url of current screen, to be set by invoking `getScreenUrl`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #referrer
    </lark-td>
    <lark-td>
      Forward address
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The address of the screen before skipping, to be set by invoking `getScreenUrl`
    </lark-td>
  </lark-tr>
</lark-table>

- Preset properties of APP control(view) click event

<lark-table rows="8" cols="4" column-widths="154,133,169,304">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      ** Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #title
    </lark-td>
    <lark-td>
      Screen title
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Title of the `ViewController`, to be set by invoking `controller.navigationItem.title`.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #screen_name
    </lark-td>
    <lark-td>
      Screen name
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Class name of `ViewController`.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #element_id
    </lark-td>
    <lark-td>
      Element ID
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The ID of the `UIView`. e.g. `button.thinkingAnalyticsViewID`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #element_type
    </lark-td>
    <lark-td>
      Element type
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Type of the `UIView`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #element_selector
    </lark-td>
    <lark-td>
      Element selector
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Splicing of the `viewPath` of the `UIView`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #element_position
    </lark-td>
    <lark-td>
      Element position
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      `UIView` position information that exists only if the control type is `UITableView` or `UICollectionView`.
      The value is `Section`, `Row`.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #element_content
    </lark-td>
    <lark-td>
      Element content
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Content on the `UIView`
    </lark-td>
  </lark-tr>
</lark-table>

- Preset properties of APP crash event (ta_app_crash)

<lark-table rows="2" cols="4" column-widths="158,127,178,304">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      ** Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #app_crashed_reason
    </lark-td>
    <lark-td>
      Abnormal information
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      Character string type, record the stack trace upon crash
    </lark-td>
  </lark-tr>
</lark-table>

## **3. Other Preset Properties**
In addition to the Preset properties above, some preset properties would only be recorded after corresponding API is called:

<lark-table rows="3" cols="4" column-widths="138,153,153,324">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      ** Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #duration
    </lark-td>
    <lark-td>
      Event duration
    </lark-td>
    <lark-td>
      Numeric value
    </lark-td>
    <lark-td>
      Timing function `timeEvent `should be invoked to record the event duration (Unit: second)
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #background_duration
    </lark-td>
    <lark-td>
      Background duration
    </lark-td>
    <lark-td>
      Numeric value
    </lark-td>
    <lark-td>
      Timing function `timeEvent` should be called to record the background duration within an event interval (Unit: second)
    </lark-td>
  </lark-tr>
</lark-table>

## **Getting Preset Properties**
When some preset properties of the APP is required for Server data tracking, this method can be invoked to get the preset properties of the App side and then send them to the server
:::: el-tabs
::: el-tab-pane label=Objective-C
```csharp
//get property objects
TDPresetProperties *presetProperties = [TDAnalytics getPresetProperties];

//Preset properties of Event
NSDictionary *properties = [presetProperties toEventPresetProperties];
/*
   {
        "#carrier": "T-Mobile",
        "#os": "iOS",
        "#device_id": "A8B1C00B-A6AC-4856-8538-0FBC642C1BAD",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
        "#manufacturer": "Apple",
        "#device_model": "iPhone7",
        "#screen_width": 1080,
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8,
        "#app_version":"1.0.0"
    }
*/

//get a certain preset properties
NSString *bundle_id = presetProperties.bundle_id;//app bundle id
NSString *os = presetProperties.os; //os type, e.g., iOS
NSString *system_language = presetProperties.system_language;//type of mobile phone system language
NSNumber *screen_width = presetProperties.screen_width;//screen width
NSNumber *screen_height = presetProperties.screen_height;//screen height
NSString *device_model = presetProperties.device_model;//device model
NSString *device_id = presetProperties.device_id;//unique identifier of device
NSString *carrier = presetProperties.carrier;//information about operator of the SIM card. Operation information of the primary card should be geted under dual-card dual-standby mode 
NSString *manufacture = presetProperties.manufacturer;//mobile phone manufacturer, e.g., Apple
NSString *network_type = presetProperties.network_type;//network type
NSString *os_version = presetProperties.os_version;//system version number
NSNumber *zone_offset = presetProperties.zone_offset;//timezone offset value
NSString *app_version = presetProperties.app_version;//app version number
```

:::
::: el-tab-pane label=Swift
```swift
//get property objects
let presetProperties = TDAnalytics.getPresetProperties();

//Preset properties of Event
let properties = presetProperties.toEventPresetProperties();
/*
   {
        "#carrier": "T-Mobile",
        "#os": "iOS",
        "#device_id": "A8B1C00B-A6AC-4856-8538-0FBC642C1BAD",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
        "#manufacturer": "Apple",
        "#device_model": "iPhone7",
        "#screen_width": 1080,
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8,
        "#app_version":"1.0.0"
    }
*/

//get a certain preset properties
let bundle_id = presetProperties.bundle_id; //app bundle id
let os = presetProperties.os; //os type, e.g., iOS
let system_language = presetProperties.system_language; //type of mobile phone system language
let screen_width = presetProperties.screen_width;;//screen width
let screen_height = presetProperties.screen_height; //screen height
let device_model = presetProperties.device_model; //device model
let device_id = presetProperties.device_id; //unique identifier of device
let carrier = presetProperties.carrier; //information about operator of the SIM card. Operation information of the primary card should be geted under dual-card dual-standby mode 
let manufacture = presetProperties.manufacturer; //mobile phone manufacturer, e.g., Apple
let network_type = presetProperties.network_type; //network type
let os_version = presetProperties.os_version; //system version number
let zone_offset = presetProperties.zone_offset; //timezone offset value
```

:::
::::
<quote-container>
IP, nation and city information are parsed and generated by the server. The client shall not provide the interface to get such properties
</quote-container>

## **5. Disable preset property tracking**
Under certain scenarios, you may want to forbid tracking certain preset properties to ensure compliance and meet actual business requirements. Add `TDDisPresetProperties` field of array type in the `info.plist`, Add the prefab properties that not allowed to be tracked to this field. e.g.  "#fps", @"#ram", @"#disk", @"#start_reason", @"#simulator", the configuration is as follows:
<image token="FKX7bpwmloELsRx4IUkcKKTfnbd" width="1344" height="724" align="center"/>
