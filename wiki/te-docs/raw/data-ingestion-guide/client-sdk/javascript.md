---
code: javascript_sdk_installation
name: "JavaScript"
wikiToken: HwzHwHeb5iFceqk6Eylcd03UnMh
parentWikiToken: KaFCwNeV3iRxjNkpT3QcDMg3n5V
updateTime: 1780908046000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=javascript_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
The JavaScript SDK runs on a browser and is not compatible with IE 8 or before.
The JavaScript SDK is about 58 KB in size
 :::
**Latest version:** 2.5.1
**Update time:** 06/08/2026
**Resource download: **[**SDK**](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FJavaScript%2Fta_js_sdk_v2.5.1.zip)**,**[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fjs-sdk)
## **1. ****SDK**** Integration**
### **1.1 Automatic Integration**
```json
npm install thinkingdata-browser --save

"dependencies": {
    "thinkingdata-browser": "2.5.1",
},
```

Next, start to initialize the SDK. For specific configuration parameters, please refer to the second step below:
```javascript
import ta from "thinkingdata-browser";
var config = {
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL",
    autoTrack: {
     pageShow: true, //page display event, event name ta_page_show
     pageHide: true, //page hide event, event name ta_page_hide
     pageView: true， //enable single-page browsing event, event name: ta_pageview
     pageClick: true //Enable page element click events, event name: ta_page_click
    }
};
ta.init(config);
```

### **1.2 Manual Integration**
1. Download [JavaScript SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FJavaScript%2Fta_js_sdk_v2.5.0.zip)
Two standard scripts are provided in the compressed package, and you can choose the desired script according to your needs.The asynchronous loading described below requires the use of the `thinkingdata.min.js` file;Synchronous loading requires the use of `thinkingdata.umd.min.js`.
2. Load the JavaScript SDK
You can choose to use the SDK by loading asynchronously or synchronously. The two methods are the same in actual use, you can choose one of them
Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="AnjzbzFZtoF0UBxKQ7ZcGpGXnOe" width="1280" height="1007" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
:::: el-tabs
::: el-tab-pane label=asynchronous loading
For asynchronous loading, use `thinkingdata.min.js`, put the following code into the `<``script``>` of html, or other initialization codes, and configure the corresponding parameters:
```javascript
<!--Thinking Analytics SDK BEGIN-->
<script>
    !function (e) { if (!window.ThinkingDataAnalyticalTool) { var n = e.sdkUrl, t = e.name, r = window, a = document, i = "script", l = null, s = null; r.ThinkingDataAnalyticalTool = t; var o = ["track", "quick", "login", "identify", "logout", "trackLink", "userSet", "userSetOnce", "userAdd", "userDel", "setPageProperty", "setSuperProperties", "setDynamicSuperProperties", "clearSuperProperties", "timeEvent", "unsetSuperProperties", "initInstance", "trackFirstEvent", "trackUpdate", "trackOverwrite"]; r[t] = function (e) { return function () { if (this.name) (r[t]._q = r[t]._q || []).push([e, arguments, this.name]); else if ("initInstance" === e) { var n = arguments[0]; r[t][n] = { name: n }; for (var a = 0; a < o.length; a++)r[t][n][o[a]] = r[t].call(r[t][n], o[a]); (r[t]._q1 = r[t]._q1 || []).push([e, arguments]) } else (r[t]._q = r[t]._q || []).push([e, arguments]) } }; for (var u = 0; u < o.length; u++)r[t][o[u]] = r[t].call(null, o[u]); r[t].param = e, r[t].__SV = 1.1, l = a.createElement(i), s = a.getElementsByTagName(i)[0], l.async = 1, l.src = n, s.parentNode.insertBefore(l, s) } }(
    {
        appId:'APP_ID', //APPID assigned by the system
        name: 'ta', //The global call variable name can be set arbitrarily, and subsequent calls can use this name
        sdkUrl:'./thinkingdata.min.js', //script address
        serverUrl:'https://YOUR_SERVER_URL', //URL for data upload
        autoTrack: {
           pageShow: true, //page display event, event name ta_page_show
           pageHide: true, //page hide event, event name ta_page_hide
           pageView: true, //enable single-page browsing event, event name: ta_pageview
           pageClick: true //Enable page element click events, event name: ta_page_click
        }，
        loaded: function(te) {
           // var currentId = ta.getDistinctId();
           // ta.identify(currentId);
           // ta.quick('autoTrack');
        }
    });
</script>
<!--Thinking Analytics SDK END-->
```

Specific parameters for asynchronous loading:
- `name` Call the variable name for the global
- `sdkUrl` It is the URL of sdk and needs to be configured
- `loaded` Initialize the callback function, and use the code fragment to load as asynchronous loading, so the method with a return value may not be called successfully, or the track triggered before the SDK loading is completed will be abnormal.We provide the loaded attribute in the parameter. The callback function in loaded will be called after the initialization is completed and before the data is reported. For example, if the user ID is set here, the data generated before the SDK is loaded will be set to this user ID.
:::
::: el-tab-pane label=synchronous loading
For synchronous loading, use `thinkingdata.umd.min.js`,Put the following code into the initialization code and configure the corresponding parameters:
```javascript
<!--Thinking Analytics SDK BEGIN-->
<script src="./thinkingdata.umd.min.js"></script>
<script>
// Create an SDK configuration object
var config = {
    appId: 'APP_ID',
    serverUrl: 'https://YOUR_SERVER_URL',
    autoTrack: {
     pageShow: true, //page display event, event name ta_page_show
     pageHide: true, //page hide event, event name ta_page_hide
     pageView: true, //enable single-page browsing event, event name: ta_pageview
     pageClick: true //Enable page element click events, event name: ta_page_click
    }
};
//Assign the SDK instance to the global variable ta, or other variables you specify
window.ta = thinkingdata;
//Initialize the SDK with a configuration object
ta.init(config);
</script>
<!--Thinking Analytics SDK END-->
```

:::
::::
## **2. Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **2.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE platform would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```javascript
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
ta.login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 2.2 **Super Properties**
Super Properties refer to properties that each event might have. You can call `setSuperProperties` to set Super Properties. It is recommended that you set Super Properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as Super Properties.
```javascript
var superProperties = {};
superProperties["channel"] = "te";//string
superProperties["age"] = 1;//number
superProperties["isSuccess"] = true;//boolean
superProperties["birthday"] = new Date();//time
superProperties["object"] = {key:"value"};//object
superProperties["object_arr"] = [{key:"value"}];//array object
superProperties["arr"] = ["value"];//array
te.setSuperProperties(superProperties);//set super properties
```

Super Properties will be saved in local storage, and will not need to be called every time the App is opened. If the super properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for super properties**
</quote-container>

### **2.3 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```javascript
ta.track(
"product_buy", //event name
 //event property
 {product_name:"tv"});
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **2.4 User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```javascript
//the username now is TA
ta.userSet({ username: "TA" });
//the username now is TE
ta.userSet({ username: "TE" });
```

## **3. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```javascript
import ta from "thinkingdata-browser";
var config = {
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL/sync_js",
    autoTrack: {
     pageShow: true, //page display event, event name ta_page_show
     pageHide: true, //page hide event, event name ta_page_hide
     pageView: true, //enable single-page browsing event, event name: ta_pageview
     pageClick: true //Enable page element click events, event name: ta_page_click
    }
};

//Initialize the SDK
ta.init(config);

//if the user has logged in, the account ID of the user could be set as the unique identifier 
ta.login("TA");

//set super properties
var superProperties = {};
superProperties["channel"] = "ta";//string
superProperties["age"] = 1;//number
superProperties["isSuccess"] = true;//boolean
superProperties["birthday"] = new Date();//time
superProperties["object"] = {key:"value"};//object
superProperties["object_arr"] = [{key:"value"}];//array object
superProperties["arr"] = ["value"];//array
ta.setSuperProperties(superProperties);

//upload events
ta.track("product_buy", //event name
 //event property
 {product_name:"tv"});
 
//Set user properties
ta.userSet({username: "TA" });
```
