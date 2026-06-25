---
code: unity_sdk_installation
name: "Unity"
wikiToken: NaFYwOKI1iN5mgkTPQwcZY0tnRg
parentWikiToken: FgrswqlHEiE45HkQve4cU0NFnbd
updateTime: 1779765101000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_installation
---
::: tip
Before  you begin, please read [Preparations before Data Ingestion](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
Unity SDK Support:  iOS, Android, Unity Editor, Windows, Mac, WebGL, Switch, Xbox、PS4/5, Wechat Mini Game, Douyin Mini Game, OPPO Quick Game.
The lowest Unity Editor version required is 5.4.0
The size of Unity SDK is around 320 KB
 :::
**Latest version:** v3.4.8
**Update time:** 2026/05/26
**Resource download: **[**SDK**](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FUnity%2Fta_unity_sdk_v3.4.8.zip)**, **[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Funity-sdk%2Ftags)
::: warning Notice 
The current documentation applies to v3.0.0 and later versions. For historical versions, please refer to the [Data Ingestion Guide - Unity (V2)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fgame_engine_sdk_installation%2Funity_sdk_installation%2Funity_sdk_installation.html), [SDK Download (v2.6.1)](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FUnity%2Fta_unity_sdk_v2.6.1.zip). 
:::
## **1. ****SDK**** Integration**
### **1.1 Manual Integration**
1. Download and unzip [Unity SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FUnity%2Fta_unity_sdk_v3.4.8.zip)
2. Double click `ta_unity_sdk.unitypackage` to import SDK. Or open menu`Assets > Import Package > Custom Package`, select `ta_unity_sdk.unitypackage` to import SDK
<callout emoji="unicorn_face" background-color="light-orange" border-color="light-orange">
When upgrading the unitypackage from version 3.3.0 to 3.4+.x, you must delete the original SDK first before importing the new package.
This is because: An occasional TS file loss issue may occur when exporting to the HarmonyOS platform using the Unity Engine. Currently, all relevant files have been renamed to .tslib. If the previous files are not deleted, a file naming conflict will arise.
</callout>

### **1.2 Package Manager Integration**
After version 2.4.1 , Unity SDK support `Package Manager` Integration
3. Open menu `Window` - `Package Manager` 
4. Click `+` , and select `Add package from git URL...`
5. Input `https://github.com/ThinkingDataAnalytics/unity-sdk.git` , and click `Add`, wait for loading to complete
## **2. Initialization**
We recommend to initialize the SDK manually, and also provide a way to automatically initialize the SDK by loading prefabs.
### **2.1 Manual initialization**
```csharp
//Initialize SDK
//Method 1
TDAnalytics.Init("APPID","SERVER");
//Method 2
TDConfig config = new TDConfig("APPID","SERVER");
TDAnalytics.Init(config);
```

### **2.2 Automatic initialization**
<callout emoji="first_place_medal" background-color="light-orange" border-color="light-orange">
HarmonyOS currently does not support automatic collection.
</callout>

6. Add prefab named `TDAnalytics` to GameObject, and set project information
<image token="Br9obI1KUonQEyxC5CPcXwAinvb" width="724" height="636" align="center"/>

The configuration items in the picture are:
**Configuration**
- **Start Manually: **Enable manual initialization
  - If `Start Manually` is selected, you need to call `TDAnalytics.Init()` to complete SDK initialization
  - If `Start Manually` is not selected, SDK will be initialized when the prefab ThinkingAnalytics is loaded
- **Enable Log: **Enable log output
  - If `Enable Log`  is selected, SDK will output  log on the consoles to debugging. You can check whether the event data is correctly reported to TE in the Unity Editor.  For invalid properties, a warning log will be displayed on the console
**Tokens**
One Token represents one instance. If you need to report data to multiple projects, you can click "+" to add project configuration
- **APP ID: **The APPID of your project, which can be found on the project management page of the TE.
- **SERVER URL**: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="HnN8berA7o8DU1xkBEpchChOnig" width="1674" height="1318" align="left"/>

- If you are using a privatized deployment version, please bind the data tracking URL with a domain name and configure it with an HTTPS certificate: `https://bind the domain name with the data tracking URL`
<quote-container>
Since some devices restrict HTTP requests by default, please use HTTPS protocol only.
</quote-container>

- **MODE**: The SDK mode, please be sure to use the NORMAL mode in the production environment.
### 2.3 Initialize via ProjectSettings
If the SDK version is greater than or equal to 3.3.0-beta.1, you can configure the initialization parameters through ProjectSettings.
<image token="QOKfbyOB8ofB3IxMN89cf5DVn8c" width="2104" height="1296" align="center"/>

- **APP ID**: The APPID of your project, which can be found on the project management page of the TE.
- **SERVER URL**: Need to be configured, which is the URL of the data receiving end:
  - If you are using a cloud service, enter the following URL: https://global-receiver-ta.thinkingdata.cn
  - If you are using a privately deployed version, please enter the following URL: https://data collection address
- **MODE**: SDK instance running mode. Please use NORMAL mode for the build environment.
- **Enable Log : **Log switch
- **Network Type ：**Set the reporting network status
- **Time Zone ：**Set the default time zone
<quote-container>
注意：由于一些设备默认禁止明文传输，因此强烈建议您使用 HTTPS 格式的接收端地址
</quote-container>

## **3. Common Features**
We suggest that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or used the APP with a new device.
### **3.1 Login**
When the users log in , `Login` could be called to set the account ID of the user. TE platform would use the account ID as the identification ID, and this ID would be saved before `Logout` is called. The previous account ID would be replaced if `Login` has been called multiple times.
```csharp
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.Login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super properties refer to properties that each event might have. You can call `SetSuperProperties` to set super properties. It is recommended that you set super properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as super properties.
```csharp
Dictionary<string, object> superProperties = new Dictionary<string, object>();
superProperties["channel"] = "te";//string
superProperties["age"] = 1;//number
superProperties["isSuccess"] = true;//boolean
superProperties["birthday"] = DateTime.Now;//time
superProperties["object"] = new Dictionary<string, object>(){{ "key", "value"}};//object
superProperties["object_arr"] = new List<object>() {new Dictionary<string, object>(){{ "key", "value" }}};//object array
superProperties["arr"] = new List<object>() { "value" };//array
TDAnalytics.SetSuperProperties(superProperties);//set super properties
```

Super properties would be saved in local storage, and will not need to be called every time the App is opened. If the super properties set previously are uploaded after calling `SetSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for super properties**
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of install, active and inactive events. To get more information about the automatic tracking of SDK, please refer to [Automatic Event Tracking](https://thinkingdata.feishu.cn/wiki/VK92wPhIqirJJAknRxLcG3fsnNe)
```csharp
//enable auto-tracking events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppInstall | TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd);
```

### **3.4 Sending Events**
You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>(){{"product_name", "商品名"}};
TDAnalytics.Track("product_buy", properties);
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `UserSet` api. The original properties would be replaced by the properties uploaded via this api. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here:
```csharp
//the username now is TA
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TA"}});
//the username now is TE
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TE"}});
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```csharp
if (privacy policy is authorized)
{  
   //Initialize SDK
   TDAnalytics.Init("APPID", "SERVER");
   //if the user has logged in, the account ID of the user could be set as the unique identifier 
   TDAnalytics.Login("TE");
   //After setting super properties, each event would have super properties
   Dictionary<string, object> superProperties = new Dictionary<string, object>();
   superProperties["channel"] = "te";//string
   superProperties["age"] = 1;//number
   superProperties["isSuccess"] = true;//boolean
   superProperties["birthday"] = DateTime.Now;//time
   superProperties["object"] = new Dictionary<string, object>(){{ "key", "value"}};//object
   superProperties["object_arr"] = new List<object>() {new Dictionary<string, object>(){{ "key", "value" }}};//object array
   superProperties["arr"] = new List<object>() { "value" };//array
   TDAnalytics.SetSuperProperties(superProperties);//set super properties
   //Enable auto-tracking
   TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppInstall | TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd);
   //Upload events
   Dictionary<string, object> properties = new Dictionary<string, object>(){{"product_name", "商品名"}};
   TDAnalytics.Track("product_buy", properties);
   //Set user properties
   TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TA"}});
}
```
