---
code: unity_sdk_preset_properties
name: "Preset Properties"
wikiToken: HENNwqT8uiQM4jkvOG3clcL0nHf
parentWikiToken: A3TawLiiwiV2LZkUDTAc1YuOnmd
updateTime: 1774249096000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_preset_properties
---

<quote-container>
Preset Properties will have differences on different platforms, for details: [Android](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FDbcOwYwnFirSPxkQzN6cKxLQnsf), [iOS](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FMBTNw8aaiiyELSkviIQcHMTTnAe). 
</quote-container>

## **1. Preset Properties of All Events**
All Events in Unity SDK(including auto-tracking events) would have the following preset property.
<sheet token="VUh7s0LnohDumKtANzgc6Ilpnvf_VzxXgM"/>

## **2. Preset Properties of Auto-tracking Event**
The following preset properties are the properties set specially for each auto-tracking event
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

<lark-table rows="2" cols="4" column-widths="138,153,153,267">

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
      Timing function `TimeEvent `should be invoked to record the event duration (Unit: second)
    </lark-td>
  </lark-tr>
</lark-table>

## **4. Getting Preset Properties**
If you need to use the preset properties of the client SDK when tracking events on the server, then you can use `GetPresetProperties` to get these properties and upload them to the server.
```csharp
//get property objects
TDPresetProperties presetProperties = TDAnalytics.GetPresetProperties();

//get all preset properties
Dictionary<string, object> eventPresetProperties = presetProperties.ToDictionary();
/*
   {
        "#carrier": "T-Mobile",
        "#os": "iOS",
        "#device_id": "A8B1C00B-A6AC-4856-8538-0FBC642C1BAD",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
        "#app_version": "0.1",
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

//get a preset properties
string bundleId = presetProperties.BundleId;//package name
string os = presetProperties.OS;//os type, e.g. Android, iOS
string systemLanguage = presetProperties.SystemLanguage;//type of mobile phone system language
int screenWidth = presetProperties.ScreenWidth;//screen width
int screenHeight = presetProperties.ScreenHeight;//screen height
string deviceModel = presetProperties.DeviceModel;//device model
string deviceId = presetProperties.DeviceId;//unique identifier of device
string carrier = presetProperties.Carrier;//information about operator of the SIM card. Operation information of the primary card should be got under dual-card dual-standby mode 
string manufacture = presetProperties.Manufacturer;//device manufacturer, e.g. HuaWei
string networkType = presetProperties.NetworkType;//network type
string osVersion = presetProperties.OSVersion;//system version number
double zoneOffset = presetProperties.ZoneOffset;//timezone offset value
string appVersion = presetProperties.appVersion;//APP version 
```

<quote-container>
IP, nation and city information are parsed and generated by the server. The client shall not provide the interface to get such properties
</quote-container>

## **5. Disable Preset Property Tracking**
If you want to forbid tracking certain preset properties to ensure compliance and meet actual business requirements, you can add `ta_public_config.xml` under the `Resources` catalog of the engineering catalog, which would be used to configure the property array that is not allowed to be tracked.
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ThinkingAnalytics DisablePresetProperties start -->
    <string-array name="TDDisPresetProperties">
       <item>#disk</item>
       <item>#fps</item>
       <item>#ram</item>
       <!-- <item>#app_version</item> -->
       <!-- <item>#os_version</item> -->
       <!-- <item>#manufacturer</item> -->
       <!-- <item>#device_model</item> -->
       <!-- <item>#screen_height</item> -->
       <!-- <item>#screen_width</item> -->
       <!-- <item>#carrier</item> -->
       <!-- <item>#device_id</item> -->
       <!-- <item>#system_language</item> -->
       <!-- <item>#lib</item> -->
       <!-- <item>#lib_version</item> -->
       <!-- <item>#os</item> -->
       <!-- <item>#bundle_id</item> -->
       <!-- <item>#install_time</item> -->
       <!-- <item>#start_reason</item> -->
       <!-- <item>#simulator</item> -->
       <!-- <item>#network_type</item> -->
       <!-- <item>#start_reason</item> -->
       <!-- <item>#resume_from_background</item> -->
       <!-- <item>#title</item> -->
       <!-- <item>#screen_name</item> -->
       <!-- <item>#url</item> -->
       <!-- <item>#referrer</item> -->
       <!-- <item>#element_type</item> -->
       <!-- <item>#element_id</item> -->
       <!-- <item>#element_position</item> -->
       <!-- <item>#element_content</item> -->
       <!-- <item>#element_selector</item> -->
       <!-- <item>#app_crashed_reason</item> -->
    </string-array>
    <!-- ThinkingAnalytics DisablePresetProperties end -->
</resources>
```
