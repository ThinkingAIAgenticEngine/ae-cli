---
code: flutter_sdk_preset_properties
name: "Preset Properties"
wikiToken: Rp8awVVY4i4MURkMOSIcOX0hn2b
parentWikiToken: HGZfwfrFmidWBVkBtKzclpHEnSe
updateTime: 1774251997000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=flutter_sdk_preset_properties
---

## **1. Description of Preset Properties**
The preset properties collected by iOS and Android platforms will have certain differences. For details, please refer to the following documents:
[iOS platform preset properties](https://thinkingdata.feishu.cn/wiki/Ny61w1VIbi5Qeok94fRcJhulned),[android platform preset properties](https://thinkingdata.feishu.cn/wiki/MBnZwHrO0ibkd9ksCSBc7dxEnic)
## **2. Getting Preset Properties**
Since v2.0.1,you can call `getPresetProperties` to get preset properties:
When some preset properties of the APP is required for the server data tracking, this method can be invoked to get the preset properties of the APP side and then send them to the server. 
```dart
//get property objects
TDPresetProperties presetProperties = await TDAnalytics.getPresetProperties();

//Preset properties of Event
Map<String, dynamic>? eventPresetProperties = presetProperties.toEventPresetProperties();
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
  "#zone_offset": 8
    }
*/

//get a certain preset properties
String bundleId = presetProperties.bundleId;//package name
String os = presetProperties.os;//os type, e.g., Android
String systemLanguage = presetProperties.systemLanguage;//type of mobile phone system language
int screenWidth = presetProperties.screenWidth;//screen width
int screenHeight = presetProperties.screenHeight;//screen height
String deviceModel = presetProperties.deviceModel;//device model
String deviceId = presetProperties.deviceId;//unique identifier of device
String carrier = presetProperties.carrier;//information about operator of the SIM card. Operation information of the primary card should be get under dual-card dual-standby mode 
String manufacture = presetProperties.manufacturer; //mobile phone manufacturer, e.g., HuaWei
String networkType = presetProperties.networkType;//network type
String osVersion = presetProperties.osVersion;//system version number
double zoneOffset = presetProperties.zoneOffset;//timezone offset value
```
