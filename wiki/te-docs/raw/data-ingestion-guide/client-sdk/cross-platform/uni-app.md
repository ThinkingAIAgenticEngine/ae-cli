---
code: uni_app_sdk_installation
name: "uni-app"
wikiToken: N0e7w3csPiU7MkkMCO9c7PXVnSb
parentWikiToken: JRIIwKqb5iVJMAkCwTic7H17ncg
updateTime: 1774251989000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=uni_app_sdk_installation
---

::: tip
Before data integration, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
uni-app SDK supports platforms：iOS, Android, Web, Wechat mini-program, Baidu mini-program, Bytedance mini-program, Alipay mini-program, Dingding mini-program, Kuaishou mini-program, QQ mini-program, Jingdong mini-program, 360 mini-program.
 :::
**Latest version:** 3.0.0
**Update time:**  09/10/2023
**Resource download: **[**SDK**](https://download.thinkingdata.cn/client/release/ta_uniapp_sdk.zip)
## **1. Integrate ****SDK**
Download and decompress [uni-app SDK](https://download.thinkingdata.cn/client/release/ta_uniapp_sdk.zip)
You can put  `thinkingdata.uniapp.js` into your project directly, referencing it in the source code:
```json
import TDAnalytics from './static/thinkingdata.uniapp.js'
```

## **2. Initialization**
With the TA SDK introduced, you can use  ThinkingAnalyticsAPI in your code:
```json
var config = {
    appId: "YOUR_APPID", 
    serverUrl: "YOUR_SERVER_URL",
    autoTrack: {
        appLaunch: true, // auto-tracking ta_mp_launch
        appShow: true, // auto-tracking ta_mp_show
        appHide: true, // auto-tracking ta_mp_hide
    },
};
// initialize
TDAnalytics.init(config)
```

Instruction on parameters:
- `appId`: The APPID of your project, which can be obtained on the project management page of the TE.
- `serverUrl`: 
  - If you are using a sass version, please check the receiver URL in project management->data ingestion configuration.
  - If you are using a privatized deployment version, please bind the data tracking URL with a domain name and configure it with an HTTPS certificate: `https://bind the domain name with the data tracking URL`
- `autoTrack`：the auto-tracking event types supported include:
  - `appLaunch`：auto tracking mini-program launch
  - `appShow`：auto tracking mini-program active and resume mini-program from the background
  - `appHide`：auto tracking mini-program enter in background
::: warning 
before reporting data, add the data transmission URL to the request list of the server domain name in the development Settings of wechat public platform or other platforms.
 :::
## **3. Common Functions**
It is suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common functions; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the visitor ID would be used as the user's identity identification ID.  Note: The Distinct ID would change after the user clear cache or use the APP with a new device.
### **3.1 Login**
When the user is logging in, `login` could be called to set the account ID of the user. TE platform would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be covered if `login` has been called multiple times.
```json
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TA");
```

<quote-container>
**The method will not upload  login events**
</quote-container>

### 3.2 S**uper Properties**
Super properties refer to properties that each event might have. You can call `setSuperProperties` to set super properties. It is recommended that you set super properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as public event properties.
```javascript
var superProperties = {
    channel : "ta", //character string
    age : 1,//number
    isSuccess : true,//boolean
    birthday :  new Date(),//time
    object : { key : "value" },//object
    object_arr : [ { key : "value" } ],//array object
    arr : [ "value" ]//array
};
TDAnalytics.setSuperProperties(superProperties);//set super properties
```

Super properties would be saved in local storage, and will not need to be called every time the App is opened. If the super properties set previously are uploaded after calling `setSuperProperties`, previous properties would be covered. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for super properties**
</quote-container>

### **3.3 Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```javascript
TDAnalytics.track({
    eventName: "product_buy",
    properties: {
        product_name: "tv"
    }
});
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.4 User Properties**
You can set general user properties by calling `user_set` api. The original properties would be covered by the properties uploaded via this api. If no user properties are set before, user properties would be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```javascript
//the username now is TA
TDAnalytics.userSet({
    properties: {
        username: "TA"
    }
});
//the username now is TE
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```javascript
var config = {
  appId: "YOUR_APPID", 
  serverUrl: "YOUR_SERVER_URL", 
  autoTrack: {
    appLaunch: true, // auto-tracking ta_mp_launch
    appShow: true, // auto-tracking ta_mg_show
    appHide: true, // auto-tracking ta_mp_hide
  }
};
// creating a TA Instance
TDAnalytics.init(config);
// if the user has logged in, the account ID of the user could be set as the unique identifier 
TDAnalytics.login("TA");
//set super properties
var superProperties = {
    channel : "ta", //character string
    age : 1,//number
    isSuccess : true,//boolean
    birthday :  new Date(),//time
    object : { key : "value" },//object
    object_arr : [ { key : "value" } ],//array object
    arr : [ "value" ]//array
};
TDAnalytics.setSuperProperties(superProperties);
//send event
TDAnalytics.track({
    eventName: "product_buy",
    properties: {
        product_name: "tv"
    }
);
//Set user properties
TDAnalytics.userSet({
    properties: { 
        username: "TE" 
    }
});
```
