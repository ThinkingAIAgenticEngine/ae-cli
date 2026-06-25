---
code: cocoscreator_sdk_installation
name: "CocosCreator"
wikiToken: AL6VwEXmiiAgK7kXq97c8YXNnLc
parentWikiToken: FgrswqlHEiE45HkQve4cU0NFnbd
updateTime: 1780572148000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocoscreator_sdk_installation
---

::: tip
 Before you begin, please read [Preparations before Data Ingestion](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
 CocosCreator SDK support Android, iOS, Web, Wechat Mini Game, Alipay Mini Game, Bytedance Mini Game, OPPO Quick Game, Huawei Quick Game, VIVO Quick Game, Xiaomi Quick Game, Facebook Mini Game, Google Play Instant Game.
 :::
**Latest version**** :** v3.6.1
**Update time****:** 06/04/2026
**Resource download**: [<text color="blue">SDK</text>](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FMPMG%2Fta_cocoscreator_sdk_v3.6.1.zip)<text color="blue">, </text>[Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fmp-sdk%2Ftags)
::: warning Notice 
The current documentation applies to v3.0.0 and later versions. For historical versions, please refer to the [Data Ingestion Guide - CocosCreator (V2)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fgame_engine_sdk_installation%2Fcocoscreator_sdk_installation%2Fcocoscreator_sdk_installation.html), [SDK Download (v2.2.4)](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FMPMG%2Fta_cocoscreator_sdk_v2.2.4.zip). 
:::
## **1. ****SDK**** Integration**
Download and unzip [CocosCreator SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FMPMG%2Fta_cocoscreator_sdk_v3.6.1.zip)
:::: el-tabs
::: el-tab-pane label=TypeScript Integration
TypeScript project data Integration:
1. Add file **tdanalytics.cc****.d.ts** to **assets/libs**. If libs does not exist, create libs folder
2. Copy SDK file (**tdanalytics.mg.cocoscreator.min.js**) to **assets/Script**
:::
::: el-tab-pane label=JavaScript Integration
JavaScript project data Integration:
1. Copy SDK file (**tdanalytics.mg.cocoscreator.min.js**) to **assets/Script**
:::
::::
## **2. Initialization**
Import **TDAnalytics**, then you can use CocosCreator SDK:
```javascript
// config SDK infomation
var config = {
  appId: "YOUR_APPID", // project APP ID
  serverUrl: "YOUR_SERVER_URL", // receiver URL
  autoTrack: { // auto-tracking
    appShow: true, // open APP
    appHide: true // close APP
  }
};
// SDK initialization
TDAnalytics.init(config);
```

Parameters:
- **appId**: The APPID of your project, which can be found on the project management page of  TE.
- **serverUrl**: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="BlxhbLmVhot19IxqgR5cW8P4nxc" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
<quote-container>
Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol only.
</quote-container>

- **autoTrack**: Optional, enable auto-tracking
  - **appShow**: Enable auto-tracking APP open events
  - **appHide**: Enable auto-tracking APP open events
<quote-container>
Note: Before reporting the data, please add the data receiving URL to the request list of the server domain name in the development settings of the WeChat public platform or other platforms.
</quote-container>

## **3. Common Features**
We suggest that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common functions; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or used the APP with a new device.
### **3.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE platform would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```javascript
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TE");
```

<quote-container>
Note: Login events wouldn't be uploaded in this method.
</quote-container>

### 3.2 **Super Properties**
Super properties refer to properties that each event might have. You can call `setSuperProperties` to set super properties. It is recommended that you set super properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as super properties.
```javascript
var superProperties = {
    channel : "te", //string
    age : 1,//number
    isSuccess : true,//boolean
    birthday :  new Date(),//time
    object : { key : "value" },//object
    object_arr : [ { key : "value" } ],//object array
    arr : [ "value" ]//array
};
// set super properties
TDAnalytics.setSuperProperties(superProperties);
```

Super properties would be saved in local storage, and will not need to be called every time the App is opened. If the super properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
Note: The requirements for event properties and user properties are the same with that for super properties
</quote-container>

### **3.4 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```javascript
TDAnalytics.track({
    eventName: "product_buy", // event name
    properties: { 
        product_name: "product name" 
    } // event properties
});
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `userSet` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```javascript
//current username is TA
TDAnalytics.userSet({
    properties: { username: "TA" }
});
//current username is TE
TDAnalytics.userSet({
    properties: { username: "TE" }
});
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```javascript
var config = {
  appId: "YOUR_APPID",
  serverUrl: "YOUR_SERVER_URL",
  autoTrack: {
    appShow: true,
    appHide: true
  }
};
// initialization
TDAnalytics.init(config);
//if the user has logged in, the account ID of the user could be set as the unique identifier 
TDAnalytics.login("TA");
//After setting super properties, each event would have super properties
var superProperties = {
    channel : "te", //string
    age : 1,//number
    isSuccess : true,//bool
    birthday :  new Date(),//object
    object : { key : "value" },//object
    object_arr : [ { key : "value" } ],//object-array
    arr : [ "value" ]//array
};
TDAnalytics.setSuperProperties(superProperties);
// upload events
TDAnalytics.track({
    eventName: "product_buy", // event name
    properties: { 
        product_name: "product name" 
    } // event properties
});
// set user properties
TDAnalytics.userSet({
    properties: { username: "TE" }
});
```

### 

## 
## 
