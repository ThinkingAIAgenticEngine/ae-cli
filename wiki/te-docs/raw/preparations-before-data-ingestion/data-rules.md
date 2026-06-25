---
code: data_format
name: "Data Rules"
wikiToken: L5rSwhPp8iycp4kWAnGc35gvn3f
parentWikiToken: OhD8we9iai6Xk5kM1QNc8ITRnQe
updateTime: 1774251958000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=data_format
---

This chapter will detail the data structure, data type, and restrictions of the TE backend. By reading this chapter, you will understand how to construct data that conforms to rules and identify data transmission problems. 
**If you use LogBus or RESTful API to upload data, you need to process the format of data in accordance with the data rules in this chapter.**
## **I. Data Structure**
The TE background accepts the JSON data that conforms to relevant rules. If SDK access is used, the data would be converted into JSON data for transmission. If LogBus or POST method is used to upload data, the data should be JSON data that conforms to relevant rules. 
The unit of JSON data is the line: that is, each line has a piece of JSON data, corresponding to the physical concept of a piece of data, and the user's committing to a behavior/setting user properties for once from the aspect of data meaning. 
The data format and relevant requirements are as follows (The typesetting of data has been carefully designed to make it convenient to read. Please do not switch lines in a real environment):
- Samples of event data are as follows:
```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track",
  "#ip": "192.168.171.111",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "#time": "2017-12-18 14:37:28.527",
  "#event_name": "test",
  "properties": {
    "argString": "abc",
    "argNum": 123,
    "argBool": true
  }
}
```

- Samples of user property settings are as follows:
```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "user_set",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "#time": "2017-12-18 14:37:28.527",
  "properties": {
    "userArgString": "abc",
    "userArgNum": 123,
    "userArgBool": true
  }
}
```

*The value of **"#type"** could be replaced with **"user_setOnce"**, **"user_add"、"user_unset"**, **"user_append"**, **"user_del"***
One piece of JSON data can be divided into two parts based on structure and function:
**Other fields on the same layer with properties constitute the basic information of the data, including the following information:**
- The account ID `#account_id` and distinct ID `#distinct_id` that presents the triggering user
- The `#time` that presents the trigger time, which could be correct to second or millisecond.
- The `#type` that presents the data type (the event is still a user property setting)
- The `#event_name` that presents the event name (only carried by event data)
- The `#ip`  that presents user IP
- The `#uuid` that presents the uniqueness of data
It should be noted that besides the above items of data, other properties starting with "#" should all be placed in the inner layer of properties
**The inner layer of properties, presenting the data's content and the properties in the event or the user properties that need to be set, could be used directly as properties or analysis objects during background analysis.**
Looking at the structure, these two parts are similar to the header and content. Next, we will detail the meaning of various fields in these two parts.
### 1.1 **Data information part**
The fields in the same layer with "properties" constitute the information part of the data marked by the red box in the following figure:
<image token="YYIqbwYP7oIKyZxAaprcjfuUnVe" width="1123" height="692" align="center"/>

These fields, all starting with "#", contain information about the trigger user and the trigger time of the data. This chapter would describe the meaning of each field and how to configure such fields.
---


#### 1.1.1 **User information (**`**#account_id**`** and **`**#distinct_id**`**)**
`#account_id` and `#distinct_id` are two fields used by the TE backend to identify users, among which, `#account_id` is the ID of the user under the login state, while `#distinct_id` is the identifier of the user under the unlogin state. TE background would identify the user triggering such behavior based on these two fields, with priority given to `#account_id`. For detailed rules, please refer to [User identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).

`#account_id` or `#distinct_id` should be uploaded. If all events are triggered when the user is under login state, it is acceptable to upload `#account_id` only. If some event is triggered when the user is under unlogin state (including before registration), it is suggested that the two fields be filled out. 
---


#### 1.1.2 **Data type information（**`**#type**`** and **`**#event_name**`**）**
`#type` decides the type of the data (record of user behavior or modification of user property), and **should be configured for each piece of data.** The value of`#type` can be divided into two types: `track` means the data is a record of user behavior, while data started with `user_` presents operation against user properties. Detailed information is as follows: 
1. Track: an event is uploaded into the event table. All events are uploaded as tracks
2. User_set: operate against the user table to overwrite one or more user properties. If the properties have values, the previous values should be overwritten.
3. user_setOnce: operate against the user table to initialize one or more user properties. If the properties have values, the operation should be ignored.
4. User_add: operate against the user table to accumulate one or more numeric user properties
5. User_unset: operate against the user table to delete the value of one or more user properties of the user. 
6. User_del: operate against the user table to delete the user 
7. User_append: operate against the user table to add elements for the list properties of the user.
8. user_uniq_append: operate against the user table to add elements for the list properties of the user and deduplicate the entire list (without changing the order of original elements)
When the value of `#type` is `track`, which means the data is a record of user behavior, `**#event_name**`** must be configured **(must start with a character and could only contain: characters (upper and lower cases distinguished), figures, and underline "_", with a maximum length of 50 characters). It should be noted that space shall never be contained in the event name during the configuration process. If the data present an operation of modifying user properties, the `#event_name` field is not required.

It should be noted that user properties are properties with node significance of the user, which should not be modified frequently within a short period. As for properties that are modified frequently, it is suggested that the properties be placed in an event as the event property.
---


#### 1.1.3 **Trigger time（**`**#time**`**）**
`#time` is the time when the event occurs, and **must be configured** in the format of a character string, correct to millisecond（"yyyy-MM-dd HH:mm:ss.SSS"）or second（"yyyy-MM-dd HH:mm:ss"）
Although the operation data of the User table also requires the configuration of `#time` , operations against user properties would be performed according to the receiving order of data in the background. 
*For instance, if the user uploaded the User table operation data of the previous day, overwriting or initialization of properties would be performed as normal instead of making decisions based on the #time field.*
---


#### 1.1.4 **Trigger location（**`**#ip**`**）**
`#ip`, an optional configuration, is the IP address of the device. TE will calculate the geographical location information of the user based on the IP address. If you have uploaded such geographical location information as #country, #province, and #city into "properties", the value you uploaded shall prevail.
---


#### 1.1.5 **Data Unique ID（**`**#uuid**`**）**
`#uuid`, an optional configuration, is a field used to indicate the uniqueness of data. Its format must be the standard format of uuid. TE would verify whether the same `#uuid` appears (duplicate data) within a short period based on the data volume, and abandon the duplicate data directly without storing such data again.
**It should be noted that the receiving end verification performed through**`**#uuid**`** would only verify the data received in a few recent hours to solve the problem of network jitter caused by short-term data duplication. The received data and full data could not be verified. If you need to delete the duplicate data, please contact the**** TE ****staff.**
---


### 1.2 **Data subject part**
The other part of the data is the data contained in the inner layer of `properties`, a JSON object, with the data inside expressed with key-value pairs. If it is user behavior data, it represents the properties and metrics of the behavior (equivalent to the fields in the behavior table). Such properties and metrics can be used directly in analysis. If it is the operation against user properties, it represents the content of the properties to be set.
<image token="JsyqbpA0XoUgxLxjfw1ckDtKn7f" width="1123" height="692" align="center"/>

The key value is the name of the property (type: character string). Self-defined properties must start with a letter and could only contain: letters (ignoring case), figures, and underline "_", with a maximum length of 50 characters. Besides, there are also TE preset properties starting with `#`. For detailed information, you can refer to [Preset Properties and System Fields](https://thinkingdata.feishu.cn/wiki/HoS9wEGASi5cpMkA2KocFLkfndg)[.](https://thinkingdata.feishu.cn/wiki/HoS9wEGASi5cpMkA2KocFLkfndg) However, it is recommended that only self-defined properties be used in most situations, and # should not be used.
Value is the value of the property and could be a numeric value, text, time, Boolean, list, object, and object group. The method for expressing data type is as shown in the following table: 

<lark-table rows="8" cols="4" column-widths="143,170,302,146">

  <lark-tr>
    <lark-td>
      ** Type of TE data **
    </lark-td>
    <lark-td>
      ** Sample value **
    </lark-td>
    <lark-td>
      ** Instructions on values **
    </lark-td>
    <lark-td>
      ** Type of data **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      numeric value
    </lark-td>
    <lark-td>
      123,1.23
    </lark-td>
    <lark-td>
      Data range: -9E15 to 9E15
    </lark-td>
    <lark-td>
      Number
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      "ABC", "Shanghai"
    </lark-td>
    <lark-td>
      The upper limit of characters is 2KB by default
    </lark-td>
    <lark-td>
      String
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Time
    </lark-td>
    <lark-td>
      "2019-01-01 00:00:00","2019-01-01 00:00:00.000"
    </lark-td>
    <lark-td>
      "yyyy-MM-dd HH:mm:ss.SSS" or "yyyy-MM-dd HH:mm:ss". If it is necessary to indicate the date, "yyyy-MM-dd 00:00:00" could be used
    </lark-td>
    <lark-td>
      String
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Boolean
    </lark-td>
    <lark-td>
      true,false
    </lark-td>
    <lark-td>
      -
    </lark-td>
    <lark-td>
      Boolean
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      List
    </lark-td>
    <lark-td>
      ["a","1","true"]
    </lark-td>
    <lark-td>
      Elements in the list would all be converted into character strings, with at most 500 elements in the list
    </lark-td>
    <lark-td>
      Array(String)
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Row
    </lark-td>
    <lark-td>
      {"hero_name":"Liu Bei","hero_level":22,"hero_equipment": ["Male and female swords","Delu"],"hero_if_support":false}
    </lark-td>
    <lark-td>
      Each sub-property in the object has its own data type. For detailed instructions on the values, please refer to the general properties of the corresponding above-mentioned types. There are at most 100 sub-properties inside the object
    </lark-td>
    <lark-td>
      Row
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Array Row
    </lark-td>
    <lark-td>
      [{"hero_name":"Liu Bei","hero_level":22,"hero_equipment": ["Male and female swords","Delu"],"hero_if_support":false},{"hero_name":"Liu Bei","hero_level":22,"hero_equipment": ["Male and female swords","Delu"],"hero_if_support":false}]
    </lark-td>
    <lark-td>
      Each sub-property in the object has its own data type. For detailed instructions on the values, please refer to the general properties of the corresponding above-mentioned types. There are at most 500 objects inside the object group
    </lark-td>
    <lark-td>
      Array Row
    </lark-td>
  </lark-tr>
</lark-table>

It should be noted that the type of all properties is determined by the type of property value received for the first time. The type of subsequent data must conform to the type of corresponding properties, with properties of mismatched types abandoned (the remaining type-compliant properties of the data would be retained) corresponding attributes, for TE does not support compatible conversion of types.
## **II. Data Processing Rules**
TA server would process the data received in accordance with the processing rules of the TE backend based on actual usage scenarios:
### 2.1 **Receive new event data**

After receiving the data about new events, the TE backend would create a correlation model for new events and their properties. If new properties are received, the type of the properties received for the first type would be set as the property type, which could not be modified in the future. 
---


### 2.2 **Add event properties**

If you need to add properties for existing events, you only need to upload the new properties when uploading data. The TE backend would then associate the events with the new properties dynamically without performing other configurations.
---


### 2.3 **Processing of inconsistent properties**

When a piece of event data is received and the type of certain property and the type of the property saved in the background are different, the value of the property would be abandoned (i.e., the value is null).
---


### 2.4 **Properties of abandoned events**

If you need to abandon a certain property of an event, you only need to hide the property in the [Metadata Management Tool](https://thinkingdata.feishu.cn/wiki/Cpidw68TeizrEzkXdElc2y8inff) of the TE backend. It is allowed that the data transmitted subsequently do not upload the property. The TE backend would not delete the data of the property, and the hidden operation is also reversible. If the property is transmitted after being hidden, its value would still be retained.
---


### 2.5 **Common properties of multiple events**

Properties of the same name of different events would be regarded as the same property of the same type. Therefore, it is necessary to ensure that the types of all properties of the same name are the same, so as to protect the property value from being abandoned due to inconsistent types.
---


### 2.6 **User table operation logic**
Modification of the data in the user table (i.e., the data whose `#type` field is `user_set`, `user_setOnce`, `user_add`, `user_unset`, `user_append` or `user_del`) could be regarded as a command in its nature, that is, the operation against the user table data of the user indicated by the piece of data. The operation type is decided by the `#type` field, while the content of the operation is decided by the properties in properties.
Detailed logic of major user table property operation is as follows:
#### 2.6.1 **Overwrite user properties (user_set)**
Determine the user who performs the operation according to the user ID in the data and overwrite all properties according to the properties in `properties`. If a certain property does not exist, create the property.
#### 2.6.2 **Initialize user properties (user_setOnce)**
Determine the user who performs the operation according to the user ID in the data and set properties without any value (or the value is empty) according to the properties in `properties`. If a property of the user that needs to be set has its value, it would not be overwritten. If a certain property does not exist, it would be newly created. 
#### 2.6.3 **Cumulate user properties (user_add)**
Determine the user who performs the operation according to the user ID in the data and cumulate properties of the numeric type according to the properties in `properties`. If the negative value uploaded is equivalent to the result of minusing the original property value with the uploaded value and the property of the user to be set does not have a value (or the value is empty), it would be set as 0 by default before the cumulation. If a certain property does not exist, it would be newly created. 
#### 2.6.4 **Clear the user property value (user_unset)**
Determine the user who performs the operation according to the user ID in the data and clear all properties according to the properties in `properties`**. **If a certain property did not exist, it **would not **be created.
#### 2.6.5 **Add elements of list-type user properties(user_append)**
Determine the user who performs the operation according to the user ID in the data and add elements for list-type properties according to the properties in `properties`.
#### 2.6.6 **Delete user (user_del)**
Determine the user who performs the operation according to the user ID in the data and delete the user from the user table (event data of the user **would not** be deleted).
---


## **III. Data Restrictions**
- **Restrictions on event type and property quantity**
To ensure sound performance, the TE backend would limit the number of event types and properties of the project by default; 


<lark-table rows="3" cols="4" column-widths="209,116,164,194">

  <lark-tr>
    <lark-td>
      ** Restrictions **
    </lark-td>
    <lark-td>
      ** Upper limit of event type **
    </lark-td>
    <lark-td>
      ** Upper limit of event property **
    </lark-td>
    <lark-td>
      ** Upper limit of user property **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      It is recommended that the quantity does not exceed
    </lark-td>
    <lark-td>
      100
    </lark-td>
    <lark-td>
      300
    </lark-td>
    <lark-td>
      100
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Upper limit of hardware
    </lark-td>
    <lark-td>
      500
    </lark-td>
    <lark-td>
      1000
    </lark-td>
    <lark-td>
      500
    </lark-td>
  </lark-tr>
</lark-table>

The administrator could enter the "project management" page to query the number of event types and properties that have been used in various projects. You can contact TE staff to lift the upper limit on the number of event types and properties. 
- **Restrictions on the length of account ID(#account_id) and distinct ID(#distinct_id)**
```plaintext
* Projects created before V3.1: 64 characters; please contact TE staff if you need to expand the number to 128 characters. 

* Projects created upon/after V3.1: 128 characters; 
```

- **Restrictions on the name of events and properties**
```plaintext
* Event name: character string type, starting with a character and containing figures, characters (upper and lower case distinguished), and an underline "_", with a maximum length of 50 characters.

* Properties name: character string type, starting with a character and containing figures, characters (upper and lower case ignored) and an underline "_", with a maximum length of 50 characters. Only buit-in properties could start with #.
```

- **Data scope of properties of text, numeric, list, object, and object group type**
```plaintext
  * Text: the upper limit of the character string is 2KB

  * Numeric value: data range: -9E15 to 9E15

  * List: containing at most 500 elements, with each element of the character string type and an upper limit of 255 bytes 
  
  * Object； containing at most 100 sub-properties;
  
  * Object group: containing at most 500 objects;
```

- **Time limit for data reception**
```plaintext
  * Upper limit for data reception event at the server: three years before or three days after the relative server time 

  * Upper limit for data reception event at the client side: ten days before or three days after the relative server time
```

**IV. Other Rules**
1. Please code data with UTF-8 to avoid messy codes
2. The property name of the TE backend would ignore the upper case and lower case. It is recommended that "_" be used as the separator of particles
3. The TE backend would only receive data from the recent three years by default. Data generated three years ago could not be imported. To import data generated three years ago, please contact TE staff. 
## **V. FAQ**
This chapter summarized FAQs caused by data's inconformity to data rules. If problems related to data transmission occur, you can perform troubleshooting according to the content of this section first
### 5.1 **T****E ****does not receive the data**
**If SDK transmission is used:**
1. Please confirm whether SDK is integrated successfully
2. Check whether the APPID and the transmission URL are set correctly and whether the suffix corresponding to the transmission port number and transmission mode is missing
**If LogBuss or POST method is used for transmission:**
1. Check whether the APPID and the transmission URL are set correctly and whether the suffix corresponding to the transmission port number and transmission mode is missing
2. Please check whether the data is transmitted in JSON format and ensure that there is a piece of JSON data in a line
3. Please check whether the key value of the [<text underline="true">data information part</text>](https://thinkingdata.feishu.cn/docx/LyvkdESnyoSg9MxG0O4c48n9nPc) starts with "#", and whether necessary fields are missing
4. Please check whether the type and format (time format) of the value of the [<text underline="true">data information part</text>](https://thinkingdata.feishu.cn/docx/LyvkdESnyoSg9MxG0O4c48n9nPc)<text underline="true"> </text>is correct
5. Please check whether the value of the "#event_name" conforms to relevant rules and does not contain Chinese characters and space. 
6. "properties" shall not start with "#"
- Besides, it should be noted that the setting of user properties would not generate behavior records. Therefore, if only data like `user_set` has been uploaded, data could not be queried in the behavior analysis model of the background (except SQL query) directly
- Please pay attention to the time of data uploading. Data generated too early (more than three years ago) would not be imported; if the data uploaded is historical data, it might be because the query time does not cover the time when the queried data was imported. In this case, please adjust the query time.
### 5.2 **Some data is missing, with certain properties not received**
1. Please confirm that the property key value of the [<text underline="true">data subject part </text>](https://thinkingdata.feishu.cn/docx/LyvkdESnyoSg9MxG0O4c48n9nPc)conforms to relevant rules and does not contain Chinese characters and space. 
2. Please confirm that among all properties of the [<text underline="true">data subject part</text>](https://thinkingdata.feishu.cn/docx/LyvkdESnyoSg9MxG0O4c48n9nPc), the key value starting with"#" belongs to the [<text underline="true">preset properties</text>](https://thinkingdata.feishu.cn/wiki/HoS9wEGASi5cpMkA2KocFLkfndg):
3. Please check whether the type of the missing property being uploaded conforms to that of the property in the background. You can check the type of property received in the [<text underline="true">meta-data management</text>](https://thinkingdata.feishu.cn/wiki/Cpidw68TeizrEzkXdElc2y8inff)<text underline="true"> </text>of the backend
### 5.3 **Delete data after data transmission failure**
1. Users of private services could delete data independently by using [<text underline="true">data deleting tools</text>](https://thinkingdata.feishu.cn/wiki/Twatwe2vYi0ng0kFz8yczOIpn2o), while users of cloud services could contact TE staff to delete relevant data. 
2. If the data has been changed significantly, it is suggested that projects be created and the user perform a comprehensive data test under the test project before the formal transmission of data. 
