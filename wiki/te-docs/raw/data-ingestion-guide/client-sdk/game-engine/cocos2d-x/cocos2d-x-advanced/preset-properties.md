---
code: cocos2d-x_sdk_preset_properties
name: "Preset Properties"
wikiToken: SZ0iwIIzTiTSNgk5sJgcTq34nCc
parentWikiToken: FQF1wNXmZiaQ42kNmOicojvCnO6
updateTime: 1774251980000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocos2d-x_sdk_preset_properties
---

### **1. Preset Properties of All Events**
All Events in Cocos2d-x SDK(including auto-tracking events) would have the following preset property.
<quote-container>
The prefabricated attributes collected by each platform will have certain differences. For details, please refer to the following documents: [Android platform](https://thinkingdata.feishu.cn/wiki/MBnZwHrO0ibkd9ksCSBc7dxEnic) 、 [iOS platform](https://thinkingdata.feishu.cn/wiki/Ny61w1VIbi5Qeok94fRcJhulned)
</quote-container>

**Preset properties for ****Mac**** and Windows:**

<lark-table rows="13" cols="4" column-widths="169,152,140,259">

  <lark-tr>
    <lark-td>
      Property name
    </lark-td>
    <lark-td>
      Display name
    </lark-td>
    <lark-td>
      Property type
    </lark-td>
    <lark-td>
      Instruction
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #ip
    </lark-td>
    <lark-td>
      IP address
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      IP address of the user, based on which TE would get the geographical location of the user
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country
    </lark-td>
    <lark-td>
      Country
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The country where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country_code
    </lark-td>
    <lark-td>
      Country code
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The code of the country where the user is located (ISO 3166-1 alpha-2, two English characters in upper case); generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #province
    </lark-td>
    <lark-td>
      Province
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The province or state where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #city
    </lark-td>
    <lark-td>
      City
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The city where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #os
    </lark-td>
    <lark-td>
      OS version
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      iOS 11.2.2, Android 8.0.0, e.g.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #device_id
    </lark-td>
    <lark-td>
      Device manufacturer
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The manufacturer of the user device, namely, Apple, Sumsung, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #screen_height
    </lark-td>
    <lark-td>
      OS
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      E.g., Android, iOS, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #screen_width
    </lark-td>
    <lark-td>
      Screen width
    </lark-td>
    <lark-td>
      Numeric value
    </lark-td>
    <lark-td>
      The screen width of a device, e.g., 1080, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib
    </lark-td>
    <lark-td>
      SDK type
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The type of the SDK which you integrate, e.g., Android，iOS, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib_version
    </lark-td>
    <lark-td>
      SDK version
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The version of the SDK which you integrate
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #zone_offset
    </lark-td>
    <lark-td>
      Timezone offset
    </lark-td>
    <lark-td>
      Numeric value
    </lark-td>
    <lark-td>
      Data's offset hours when compared with UTC time
    </lark-td>
  </lark-tr>
</lark-table>

 
### **Getting Preset Properties**
When some preset properties of the APP is required for the server data tracking, this method can be invoked to get the preset properties of the App side and then send them to the server. 
```cpp
   //get property objects
   PresetProperties* presetProperties =  TDAnalytics::getPresetProperties();

   //Preset properties of Event
   TDJSONObject* properties = presetProperties->toEventPresetProperties();
   /*
   {
        "#carrier": "T-Mobile",
        "#os": "Android",
        "#device_id": "abb8e87bfb5ce66c",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
        "#manufacturer": "realme",
        "#device_model": "RMX1991",
        "#screen_width": 1080,
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8，
        "#app_version":"1.0"
    }
   */

    //get a certain preset properties
    string bundleId = presetProperties->bundleId;//package name
    string os =  presetProperties->os; //os type, e.g., Android
    string systemLanguage = presetProperties->systemLanguage; //type of mobile phone system language
    int screenWidth = presetProperties->screenWidth; //screen width
    int screenHeight = presetProperties->screenHeight; //screen height
    string deviceModel = presetProperties->deviceModel; //device model
    string deviceId = presetProperties->deviceId;//unique identifier of device
    string carrier = presetProperties->carrier; //information about operator of the SIM card. Operation information of the primary card should be get under dual-card dual-standby mode
    string manufacture = presetProperties->manufacturer; //mobile phone manufacturer, e.g., HuaWei
    string networkType = presetProperties->networkType; //network type
    string osVersion = presetProperties->osVersion; //system version number
    string appVersion = presetProperties->appVersion; //app version number
    double zoneOffset = presetProperties->zoneOffset; //timezone offset value
```

<quote-container>
IP, nation and city information are parsed and generated by the server. The client shall not provide the api to get such properties
</quote-container>
