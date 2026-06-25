---
code: android_sdk_preset_properties
name: "Preset Properties"
wikiToken: MBnZwHrO0ibkd9ksCSBc7dxEnic
parentWikiToken: LqfmwtW1xi0jzwkrKpscKEzFnme
updateTime: 1774251962000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=android_sdk_preset_properties
---

## **1. Preset Properties of All Events**
All Events in Andriod SDK(including auto-tracking events) would have the following preset property.
<sheet token="BFCzsqRI5h2w9BtGpH3cXgZOnde_pEyZdm"/>

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
      The content is JSON character string; when the APP is enabled by url or intent method, the `url `content and the` ``data` in intent would be recorded automatically. For the sample, please refer to:
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

<lark-table rows="5" cols="4" column-widths="149,138,168,248">

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
      The title of the Activity to which the element belongs, whose value is the value of the title property
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
      The `package.class `name of the Activity to which the element belongs
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
      The address of the screen before skipping, to be set by invoking `getScreenUrl `
    </lark-td>
  </lark-tr>
</lark-table>

- Preset properties of APP element click event

<lark-table rows="8" cols="4" column-widths="154,133,169,248">

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
      The title of the Activity to which the element belongs, whose value is the value of the title property
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
      The package.class name of the Activity to which the element belongs
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
      The ID of element, in which andriod:id is used by default, and could be set by invoking setViewID
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
      Type of the element
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
      Splicing of the viewPath of the element
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
      Position information of element, which would only be uploaded when the element has position property
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
      Content on the element
    </lark-td>
  </lark-tr>
</lark-table>


- Preset properties of APP crash event (ta_app_crash)
<sheet token="BFCzsqRI5h2w9BtGpH3cXgZOnde_V3lxuq"/>

## **3. Other Preset Properties**
In addition to the Preset properties above, some preset properties would only be recorded after corresponding API is called:

<lark-table rows="3" cols="4" column-widths="138,153,153,267">

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
      numeric value
    </lark-td>
    <lark-td>
      Timing function `timeEvent` should be called to record the background duration within an event interval (Unit: second)
    </lark-td>
  </lark-tr>
</lark-table>

## **Getting Preset Properties**
When some preset properties of the APP is required for the server data tracking, this method can be invoked to get the preset properties of the App side and then send them to the server. 
```java
   //get property objects
   TDPresetProperties presetProperties = TDAnalytics.getPresetProperties();

   //Preset properties of Event
   JSONObject properties = presetProperties.toEventPresetProperties();
   /*
   {
        "#carrier": "T-Mobile",
        "#os": "Android",
        "#device_id": "dd4a508df0dbff08",
        "#screen_height": 2560,
        "#bundle_id": "cn.thinkingdata.android.demo",
        "#device_model": "sdk_gphone64_arm64",
        "#screen_width": 1440,
        "#system_language": "en",
        "#install_time": "2022-08-19 17:31:52.398",
        "#simulator": true,
        "#manufacturer": "Google",
        "#os_version": "12",
        "#app_version": "1.0",
        "#network_type": "3G",
        "#zone_offset": 8,
        "#ram": "0.8\/1.9",
        "#disk": "0.1\/0.8",
        "#fps": 60
    }
   */

    //get a certain preset properties
    String bundle_id = presetProperties.bundle_id;//package name
    String os =  presetProperties.os;//os type, e.g., Android
    String system_language = presetProperties.system_language;//type of mobile phone system language
    int screen_width = presetProperties.screen_width;//screen width
    int screen_height = presetProperties.screen_height;//screen height
    String device_model = presetProperties.device_model;//device model
    String device_id = presetProperties.device_id;//unique identifier of device
    String carrier = presetProperties.carrier;//information about operator of the SIM card. Operation information of the primary card should be get under dual-card dual-standby mode 
    String manufacture = presetProperties.manufacture;//mobile phone manufacturer, e.g., HuaWei
    String network_type = presetProperties.network_type;//network type
    String os_version = presetProperties.os_version;//system version number
    String app_version = presetProperties.app_version;//app version number
    double zone_offset = presetProperties.zone_offset;//timezone offset value
    String ram = presetProperties.ram;//storage usage
    String disk = presetProperties.disk;//disk usage
    int fps = presetProperties.fps;//fps
    String installTime = presetProperties.installTime;//app installation time
    boolean isSimulator = presetProperties.isSimulator;//the device is a simulator or not
    
```

<quote-container>
IP, nation and city information are parsed and generated by the server. The client shall not provide the api to get such properties
</quote-container>

## **5. Disable Preset Property Tracking**
Under certain scenarios, you may want to forbid tracking certain preset properties to ensure compliance and meet actual business requirements. In this case, you can add ta_public_config.xml under the res/values catalog of the engineering catalog, which would be used to configure the property array that is not allowed to be tracked.
```java
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ThinkingAnalytics DisablePresetProperties start -->
    <string-array name="TDDisPresetProperties">
<!--        <item>#disk</item>-->
<!--        <item>#fps</item>-->
<!--        <item>#ram</item>-->
<!--        <item>#app_version</item>-->
<!--        <item>#os_version</item>-->
<!--        <item>#manufacturer</item>-->
<!--        <item>#device_model</item>-->
<!--        <item>#screen_height</item>-->
<!--        <item>#screen_width</item>-->
<!--        <item>#carrier</item>-->
<!--        <item>#device_id</item>-->
<!--        <item>#system_language</item>-->
<!--        <item>#lib</item>-->
<!--        <item>#lib_version</item>-->
<!--        <item>#os</item>-->
<!--        <item>#bundle_id</item>-->
<!--        <item>#install_time</item>-->
<!--        <item>#start_reason</item>-->
<!--        <item>#simulator</item>-->
<!--        <item>#network_type</item>-->
<!--        <item>#zone_offset</item>-->
<!--        <item>#start_reason</item>-->
<!--        <item>#resume_from_background</item>-->
<!--        <item>#title</item>-->
<!--        <item>#screen_name</item>-->
<!--        <item>#url</item>-->
<!--        <item>#referrer</item>-->
<!--        <item>#element_type</item>-->
<!--        <item>#element_id</item>-->
<!--        <item>#element_position</item>-->
<!--        <item>#element_content</item>-->
<!--        <item>#element_selector</item>-->
<!--        <item>#app_crashed_reason</item>-->
<!--        <item>#background_duration</item>-->
<!--        <item>#duration</item>-->
    </string-array>
    <!-- ThinkingAnalytics DisablePresetProperties end -->
</resources>
```

<quote-container>
As for Android ID property, we support complete isolation at the code level, that is, relevant codes used to get the property shall no longer be contained in the APP after isolation. For detailed information, please refer to the[ ](https://thinkingdata.feishu.cn/wiki/D7ykw75weigcIfk3ZoichHbKnuv)[Chapter of auto-tracking plugin configuration](https://thinkingdata.feishu.cn/wiki/D7ykw75weigcIfk3ZoichHbKnuv)
</quote-container>
