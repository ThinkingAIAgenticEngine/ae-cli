---
code: preset_properties
name: "Preset Properties and System Fields"
wikiToken: Ol8rw9SUXi45lqkBDXGc48tDnhf
parentWikiToken: Bmhewqk5PiJirhk1GJzcJliqnOh
updateTime: 1747886279000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=preset_properties
---

# Preset Properties and System Fields

::: tip Note

This section will introduce all preset properties and system fields in TE. For platform-specific preset properties, please refer to:

Android Platform, iOS Platform, Web Platform, Mini Program & Mini Game Platform, Server Side

:::

Preset properties refer to attributes generated or obtained by TE. All preset properties start with "#" and **are all event attributes**, and the Chinese names and meanings of these attributes have been determined. System fields refer to structural fields in the data (such as `#account_id`, `#event_time`, etc.), or fields with special purposes in the database, which are often not used directly in analysis models, or are used indirectly.

**Besides the preset properties listed below, any attribute starting with "#" is considered an illegal field and will not be stored. Therefore, it is not recommended to set custom attributes starting with "#". All system fields cannot be used as event or user attributes and passed during data integration.**

**Please note that for all preset properties except `#ip`, we do not recommend you use them directly. Only when simultaneously using client SDK and other transmission methods, and needing to make attributes consistent across multi-platform data, \*\***is it recommended\***\* to set them under the guidance of TE staff. Please ensure that the attribute types of preset properties in your uploaded data are consistent with those in the table. If types are inconsistent, \*\***the attribute value will be discarded (i.e., value becomes null).\*\*

- Preset Properties
  **Attribute Name**

**Chinese Name**

**Attribute Type**

**Description**

#ip

Client IP

Text

User's IP address, TE will use this to obtain user's geographic location information

#country

Country/Region

Text

User's country or region, generated based on IP address

#country_code

Country/Region Code

Text

Country or region code of the user's location (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address

#province

Province

Text

User's province, generated based on IP address

#city

City

Text

User's city, generated based on IP address

#os_version

Operating System Version

Text

Such as iOS 11.2.2, Android 8.0.0, etc.

#manufacturer

Manufacturer

Text

User device manufacturer, such as Apple, vivo, etc.

#os

Operating System

Text

Such as Android, iOS, etc.

#device_id

Device ID

Text

User's device ID, iOS uses IDFV or UUID, Android uses androidID

#screen_height

Screen Height

Numeric

User device screen height, such as 1920, etc.

#screen_width

Screen Width

Numeric

User device screen width, such as 1080, etc.

#device_model

Device Model

Text

User device model, such as iPhone 8, etc.

#device_type

Device Type

Text

User device type, such as iPad, iPhone, etc.

#app_version

App Version

Text

Your APP's version

#bundle_id

App Bundle ID

Text

APP package name or process name

#lib

SDK Type

Text

The type of SDK you integrated, such as Android, iOS, etc.

#lib_version

SDK Version

Text

The version of SDK you integrated

#network_type

Network Type

Text

Network status when event occurred, such as WIFI, 3G, 4G, etc.

#carrier

Carrier

Text

User device network carrier, such as China Mobile, China Telecom, etc.

#browser

Browser

Text

Browser type used by user, such as Chrome, Firefox, etc.

#browser_version

Browser Version

Text

Browser version used by user, such as Chrome 61.0, Firefox 57.0, etc.

#duration

Event Duration

Numeric

Duration recorded using timer feature, unit is seconds

#url

Page URL

Text

Used in auto-capture events, the URL of the current page (not business-defined page). In web pages, value is location.href; in Android / iOS platforms, value is custom page path

#url_path

Page Path

Text

Used in auto-capture events, the path of the current page (not business-defined page). Value is location.pathname

#referrer

Referrer URL

Text

Used in auto-capture events, the URL of the page before jump (not business-defined page). In web pages, value is document.referrer; in Android / iOS platforms, value is custom previous page path

#referrer_host

Referrer Host

Text

Used in auto-capture events, the host of the page before jump (not business-defined page). Value is the host of referrer

#title

Page Title

Text

Used in auto-capture events, the title of the current page (not business-defined page). In web pages, value is document.title. On Android platform, value is Activity's title, taking the value of Activity's title attribute. On iOS platform, value is View Controller's title, taking the value of controller.navigationItem.title attribute

#screen_name

Screen Name

Text

Used in auto-capture events, the name of the page (not business-defined page). On Android platform, value is Activity's package name.class name; on iOS platform, value is View Controller's class name

#element_id

Element ID

Text

Used in auto-capture events, the control's ID

#element_type

Element Type

Text

Used in auto-capture events, the control's type

#resume_from_background

Resume from Background

Boolean

Used in auto-capture events, whether the app resumed from background, boolean type

#element_selector

Element Selector

Text

Used in auto-capture events, the control's viewPath

#element_position

Element Position

Text

Used in auto-capture events, the control's position information

#element_content

Element Content

Text

Used in auto-capture events, the content on the control

#scene

Scene Value

Numeric

Scene value passed when WeChat mini program launches

#mp_platform

Mini Program Platform

Text

Identifies the platform where the app is located

#app_crashed_reason

Exception Information

Text

Used in auto-capture events, records the stack trace of app crash

#zone_offset

Timezone Offset

Numeric

Data time offset hours relative to UTC time

#system_language

System Default Language

Text

User device's system language (ISO 639-1, i.e., two lowercase English letters), such as zh, en, etc.

#install_time

App Install Time

Time

Time when user installed the app, value comes from system

#simulator

Is Simulator

Numeric

Whether the device is a simulator true/false

#ram

Memory (GB)

Text

User device's current remaining memory and total memory, unit GB, such as 1.4/2.4

#disk

Disk (GB)

Text

User device's current remaining storage space and total storage space, unit GB, such as 30/200

#fps

FPS

Numeric

User device's current frames per second, such as 60

#background_duration

Background Duration

Numeric

Duration the app was in background during the interval between two start events, unit is seconds

#start_reason

Start Reason

Text

Only exists when the app is launched by non-launcher method, such as deeplink or other app's startActivity, data sample: "#start_reason":"{"url":"thinkingdata:\/\/","data":""}"

#ua

User Agent

Text

Can identify the operating system and version, CPU type, browser and version, browser rendering engine, browser language, browser plugins, etc. used by the customer.

#utm

Campaign Source Attributes

Text

User's advertising source information, including ad source, ad medium, etc.

- System Fields in Event Table
  **Field Name**

**Chinese Name**

**Attribute Type**

**Description**

$part_event

Event Partition Field

Text

Event partition field, taken from #event_name, i.e., event name

$part_date

Date Partition Field

Time

Date partition field, taken from #event_time, i.e., the date when the event occurred

#app_id

Project ID

Text

The project ID the event belongs to

#user_id

Unique User ID

Numeric

The unique user identifier in the system

#account_id

Account ID

Text

Account ID, equivalent to #account_id in data

#distinct_id

Visitor ID

Text

Visitor ID, equivalent to #distinct_id in data

#event_name

Event Name

Text

Event name, equivalent to #event_name field in data

#event_time

Event Time

Time

Event time, equivalent to #time field in data

#server_time

Server Time

Time

Time when the server received the data

#dw_create_time

First Storage Time

Time

Time when this event data was stored, for updatable events this attribute is null

#dw_update_time

Storage Update Time

Time

Time when this event data was updated in storage, for non-updatable events this attribute is null

#kafka_offset

Kafka Offset Value

Numeric

The offset value of the event stored in kafka

#uuid

UUID

Text

The identification ID of the event

- System Fields in User Table
  **Field Name**

**Chinese Name**

**Attribute Type**

**Description**

#user_id

Unique User ID

Numeric

The unique user identifier in the system

#account_id

Account ID

Text

Account ID, equivalent to #account_id in data

#distinct_id

Visitor ID

Text

Visitor ID, equivalent to #distinct_id in data

#active_time

Activation Time

Time

When the first data (including event and user attribute data) for this user is stored, the #time field of that data

#reg_time

Registration Time

Time

When the first data containing Account ID (including event and user attribute data) for this user is stored, the #time field of that data

#update_time

Update Time

Time

The #time field of the last received user attribute data

#server_time

Server Time

Time

The server time of the last received user attribute data

#dw_update_time

Storage Update Time

Time

The latest update time of this user data

#event_date

Latest Event Date

Numeric

The latest event storage date for this user

#user_operation

User Operation Type

Text

The operation type of user attribute data

#kafka_offset

Kafka Offset Value

Numeric

The offset value of user attribute data stored in kafka

#uuid

UUID

Text

The identification ID of user attribute data
