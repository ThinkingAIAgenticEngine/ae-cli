---
code: javascript_sdk_preset_properties
name: "Preset Properties"
wikiToken: V3ITwtUofi0wCAkhTw5czkIvnqg
parentWikiToken: BwkywAk0aiKI9Skyhk8cKnlKnde
updateTime: 1774249080000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=javascript_sdk_preset_properties
---

## **1. Preset Properties of All Events**
All Events in JavaScript SDK(including auto-tracking events) would have the following preset property.
<sheet token="PNTKsV2bWhwNcjtjMy1c1xSynef_Vt6TIB"/>

## **2. Preset Properties of Auto-tracking Event**

<lark-table rows="6" cols="4" column-widths="243,243,100,243">

  <lark-tr>
    <lark-td>
      **Property name**
    </lark-td>
    <lark-td>
      **Display name**
    </lark-td>
    <lark-td>
      **Property type**  {align="center"}
    </lark-td>
    <lark-td>
      **Instruction**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #url
    </lark-td>
    <lark-td>
      website url
    </lark-td>
    <lark-td>
      Text {align="center"}
    </lark-td>
    <lark-td>
      current  URL of  website
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #url_path
    </lark-td>
    <lark-td>
      website path
    </lark-td>
    <lark-td>
      Text {align="center"}
    </lark-td>
    <lark-td>
      current  path of  website
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
      Text {align="center"}
    </lark-td>
    <lark-td>
      The address of the website before skipping
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #referrer_host
    </lark-td>
    <lark-td>
      Forward path
    </lark-td>
    <lark-td>
      Text {align="center"}
    </lark-td>
    <lark-td>
      The path of the website before skipping
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #title
    </lark-td>
    <lark-td>
      website title
    </lark-td>
    <lark-td>
      Text {align="center"}
    </lark-td>
    <lark-td>
      current  title of  website
    </lark-td>
  </lark-tr>
</lark-table>

## **3. Getting Preset Properties**
When some preset properties of the application is required for the server data tracking, this method can be invoked to get the preset properties of the application and then send them to the server. 
```javascript
   //get property objects
   var presetProperties = ta.getPresetProperties();

   //Preset properties of Event
   var properties = presetProperties.toEventPresetProperties();
   /*
    {
      "#os":"Mac OS X",
      "#screen_width":1920,
      "#screen_height":1080,
      "#browser":"chrome",
      "#browser_version":"91.0.4472.114",
      "#device_id":"17a3858fafd9b4-0693d07132e2d1-34657600-2073600-17a3858fafea9b",
      "#zone_offset":8
    }
   */

    //get a certain preset properties
    var os =  presetProperties.os;//os type, e.g., Android
    var screenWidth = presetProperties.screenWidth;//screen width
    var screenHeight = presetProperties.screenHeight;//screen height
    var browser = presetProperties.browser;//browser type
    var browserVersion =  presetProperties.browserVersion;//browser version
    var deviceId = presetProperties.deviceId;//device id 
    var zoneOffset = presetProperties.zoneOffset;//timezone offset value
```
