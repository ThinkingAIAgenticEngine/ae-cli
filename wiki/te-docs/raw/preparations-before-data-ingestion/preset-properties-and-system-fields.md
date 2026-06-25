---
code: preset_properties
name: "Preset Properties and System Fields"
wikiToken: HoS9wEGASi5cpMkA2KocFLkfndg
parentWikiToken: OhD8we9iai6Xk5kM1QNc8ITRnQe
updateTime: 1776412284000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=preset_properties
---

::: tip
This section will introduce all the built-in properties and system fields in AE. For detailed built-in properties of the platform, please refer to:
[Android platform](https://thinkingdata.feishu.cn/wiki/Sis2weaL2iJOOWklkX1cZAtcnVc), [iOS platform](https://thinkingdata.feishu.cn/wiki/Wxc7wQj3FitXYVkTuW5cAAtPnCc), [Web platform](https://thinkingdata.feishu.cn/wiki/HwzHwHeb5iFceqk6Eylcd03UnMh), [Server](https://thinkingdata.feishu.cn/wiki/IKVPwn4NfiIhijk5EcAcMf6pn7e)
 :::
Preset properties refer to the properties generated or obtained by AE. All the preset properties, all event properties, start with "#", with their Chinese name and meaning clearly defined. System fields refer to the structure fields in data (e.g., `#account_id`and `#event_time`, etc.), or fields with special usage in the database. Such fields would not be used directly nor indirectly in the analysis model.
**Except for the following preset properties, any properties starting with "#" would be de****fined ****as illegal fields and could not be stored. Therefore, it is recommended that you do not set the self-defined properties as properties starting with "#". Since all the system fields could not be used as events or user properties and should be uploaded during data ingestion. **
**Please note that all preset properties except **`**#ip**`** are not recommended to be set manually. It is suggested that you set such properties under the guidance of ****AE staff**** to ensure the properties of data on multiple terminals are consistent when the client-side SDK and other transmission modes are used simultaneously.**
- Preset property:

<lark-table rows="49" cols="4" column-widths="159,180,145,259">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      **Description**
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
      #ip
    </lark-td>
    <lark-td>
      Client-side IP
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The IP address of the user, based on which AE would obtain the geographical location of the user
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country
    </lark-td>
    <lark-td>
      Country/region
    </lark-td>
    <lark-td>
      String
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
      Code of country/region
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The code of the country where the user is located (ISO 3166-1 alpha-2, two English characters in upper case); is generated based on the IP address
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
      String
    </lark-td>
    <lark-td>
      The province where the user is located; generated based on the IP address
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
      String
    </lark-td>
    <lark-td>
      The city where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #os_version
    </lark-td>
    <lark-td>
      OS version
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      iOS 11.2.2, Android 8.0.0, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #manufacturer
    </lark-td>
    <lark-td>
      Manufacturer
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The manufacturer of the user device, namely, Apple, Sumsung, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #os
    </lark-td>
    <lark-td>
      OS
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      E.g., Android, iOS, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #device_id
    </lark-td>
    <lark-td>
      Device No.
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The ID of the user device; IDFV or UUID of the user for iOS; androidID for Android
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #screen_height
    </lark-td>
    <lark-td>
      Screen height
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      The screen height of the user device, e.g., 1920, etc.
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
      Number
    </lark-td>
    <lark-td>
      The screen height of the user device, e.g., 1080, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #device_model
    </lark-td>
    <lark-td>
      Device model
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Model of the user deivce, e.g., iPhone 8, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #device_type
    </lark-td>
    <lark-td>
      Device type
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Type of user device, e.g., iPad, iPhone,etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #app_version
    </lark-td>
    <lark-td>
      APP version
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The version of your APP
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #bundle_id
    </lark-td>
    <lark-td>
      APP package name
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      APP package name or process name
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
      String
    </lark-td>
    <lark-td>
      The type of the SDK to which you access, e.g., Android,iOS, etc.
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
      String
    </lark-td>
    <lark-td>
      The version of the SDK to which you access
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #network_type
    </lark-td>
    <lark-td>
      Network type
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The network state when an event is uploaded, e.g., WIFI, 3G, 4G, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #carrier
    </lark-td>
    <lark-td>
      Operator
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The network operator of the user device, namely, AT&T, Vodafone, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #browser
    </lark-td>
    <lark-td>
      Browser
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Type of the browser used by the user, e.g., Chrome, Firefox, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #browser_version
    </lark-td>
    <lark-td>
      Browser version
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The version of the browser used by the user, e.g., Chrome 61.0, Firefox 57.0, etc.
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
      Number
    </lark-td>
    <lark-td>
      The duration was recorded by using the timing function (unit: second)
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, the address of the current page (a page not defined by service). The value of screen URL in the web page is located.href, while the value of the screen URL on the Android/iOS platform is the self-defined page path
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #url_path
    </lark-td>
    <lark-td>
      Page path
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, the address of the current page (a page not defined by service). Value: location.pathname
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, the address of the page before skipping (a page not defined by service). The value of the forward address in the web page document.referrer, while the value of the forward address on Android/iOS platform is the self-defined forward page path
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #referrer_host
    </lark-td>
    <lark-td>
      Forward domain name
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, the path of the page before skipping (a page not defined by service). The value is the host of referrer
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
      String
    </lark-td>
    <lark-td>
      Used in auto-tracking event, the title of current page (a page not defined by service). The value in the web page is document.title, while the value on Android platform is the title of Activity, with the value being the value of the title property of Activity. The value on iOS platform is the title of View Controller, with the value being that of the controller.navigationItem.title property
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, the name of page(a page not defined by service). The value on Android platform is the package name.type name of Activity, while the value on iOS platform is the type name of View Controller
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, ID of the controller
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
      String
    </lark-td>
    <lark-td>
      Used in auto-tracking event, ID of the controller
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
      Number
    </lark-td>
    <lark-td>
      Used in auto-tracking event, whether to resume the app from the background, Boolean
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, viewPath of the controller
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, the location information of the controller
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event, the content of the controller
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #scene
    </lark-td>
    <lark-td>
      Scenario value
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      Scenario value uploaded upon initiating mini-program of WeChat
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #mp_platform
    </lark-td>
    <lark-td>
      Mini-program platform
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Platform where the identification app locates
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
      String
    </lark-td>
    <lark-td>
      Used in the auto-tracking event to record the stack information of APP crash
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
      Number
    </lark-td>
    <lark-td>
      Data's offset hours when compared with UTC time
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #system_language
    </lark-td>
    <lark-td>
      Default language of the system
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The system language of the user device (ISO 639-1, two digits of lower case English letters), namely, zh, en,etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #install_time
    </lark-td>
    <lark-td>
      APP installation time
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      The time when the user installs the APP, with the value coming from the system
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #simulator
    </lark-td>
    <lark-td>
      Simulator or not
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      The device is a simulator or not true/false
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #ram
    </lark-td>
    <lark-td>
      Memory (GB)
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The remaining memory and total memory of the user device (unit: GB), for example, 1.4/2.4
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #disk
    </lark-td>
    <lark-td>
      Hard disk (GB)
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The remaining storage and total storage of the user device (unit: GB), for example, 30/200
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #fps
    </lark-td>
    <lark-td>
      FPS
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      The transmission frame rate per second of current image of the user device, for example, 60
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
      Number
    </lark-td>
    <lark-td>
      Record the background duration of the APP in the time interval between two start events (unit: second)
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #start_reason
    </lark-td>
    <lark-td>
      Start reason
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The property only exists when the app is enabled under the non-launcher mode, for example, deeplink mode or the startActivity of other apps. Sample data: "#start_reason":"{"url":"thinkingdata:\/\/","data":""}"
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #ua
    </lark-td>
    <lark-td>
      Current agent information of the user
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Used to identify the operating system and version, CPU type, browser and version, browser rendering engine, browser language, and browser plugin used by the user
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #utm
    </lark-td>
    <lark-td>
      Property of advertisement sources
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      The advertisement information originates from the user, including advertisement sources, advertisement media, etc.
    </lark-td>
  </lark-tr>
</lark-table>

- System fields in the event table

<lark-table rows="9" cols="4" column-widths="105,130,129,331">

  <lark-tr>
    <lark-td>
      ** Field name **
    </lark-td>
    <lark-td>
      **Description**
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
      $part_event
    </lark-td>
    <lark-td>
      Event partition field
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Event partition field, obtained from #event_name, the event name
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      $part_date
    </lark-td>
    <lark-td>
      Date partition field
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      Date partition field, obtained from #event_time, the date when the event occurred
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #user_id
    </lark-td>
    <lark-td>
      Unique ID of the user
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      Unique user identifier in the system
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #account_id
    </lark-td>
    <lark-td>
      Account ID
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Account ID, equivalent to the #account_id in the data
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #distinct_id
    </lark-td>
    <lark-td>
      Distinct ID
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Distinct ID, equivalent to the #distinct_id in the data
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #event_name
    </lark-td>
    <lark-td>
      Event name
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Event name, equivalent to the #event_name field in the data
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #event_time
    </lark-td>
    <lark-td>
      Event time
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      Event time, equivalent to the #time field in the data
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #server_time
    </lark-td>
    <lark-td>
      Server time
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      The time when the server receives the data
    </lark-td>
  </lark-tr>
</lark-table>

- System fields in the user table

<lark-table rows="8" cols="4" column-widths="105,154,124,276">

  <lark-tr>
    <lark-td>
      ** Field name **
    </lark-td>
    <lark-td>
      **Description**
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
      #user_id
    </lark-td>
    <lark-td>
      Unique ID of the user
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      Unique user identifier in the system
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #account_id
    </lark-td>
    <lark-td>
      Account ID
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Account ID, equivalent to the #account_id in data
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #distinct_id
    </lark-td>
    <lark-td>
      Distinct ID
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      Distinct ID, equivalent to the #distinct_id in the data
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #active_time
    </lark-td>
    <lark-td>
      Activation time
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      The time of the #time field when the first piece of data of the user is stored (including the event and user property data)
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #reg_time
    </lark-td>
    <lark-td>
      Register time
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      The time of the #time field when the first piece of data containing the account ID of the user is stored (including the event and user property data)
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #update_time
    </lark-td>
    <lark-td>
      Update time
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      The time when the #time field of the last piece of user property data is received
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #server_time
    </lark-td>
    <lark-td>
      Server time
    </lark-td>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      The server time when the last piece of user property data is received
    </lark-td>
  </lark-tr>
</lark-table>
