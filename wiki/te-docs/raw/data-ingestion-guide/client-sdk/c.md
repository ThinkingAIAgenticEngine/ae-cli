---
code: csharp_client_sdk_installation
name: "C#"
wikiToken: ENH2wrxtFicwM7koUgtcPsaCnOE
parentWikiToken: KaFCwNeV3iRxjNkpT3QcDMg3n5V
updateTime: 1774251999000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=csharp_client_sdk_installation
---
::: tip
Before you begin, please read [Preparations before Data Ingestion](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
Supported platforms: Windows.
 :::
**Latest version:** 2.0.1
**Update time:** 10/13/2025
**Resource download: **[SDK Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcsharp-client-sdk)
## 1. **SDK**** Integration**
### 1.1 Download SDK
Download Source Code from [GitHub](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcsharp-client-sdk),  add the files in the `TDAnalyticsSDK` directory to the project.
The SDK relies on `Newtonsoft.Json` for json parsing. If you are using `Visual Studio`, please use `NuGet` to add `Newtonsoft.Json` library.
### 1.2 Add dynamic library
- Download the dll and unzip it (you can download any one)
  - [github link](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcsharp-client-sdk%2Fblob%2Fmain%2Fdll%2Fta_csharp_sdk.zip)
  - [official website link](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Ftd_analytics_csharp_client.zip)
- For Windows platform, you can find the dll file in the windowswen folder and copy it to the project root directory. (Note: If the dll conflicts with the existing dll in the project, just use the existing one in the project)
<image token="VlfNbOkbdoVtTux2HEHcUhqpnxg" width="728" height="335" align="center"/>

- Mac platform
  - Step 1: Install sqlite, curl, zlib, openssl through homebrew
  - Step 2: Find the dll file in the macOS folder and copy it to the project root directory
  <image token="U1rVbMHfToJZc3xPTcqcQ9RWndg" width="731" height="217" align="center"/>

## **2. Initialization**
```csharp
using ThinkingData.Analytics;
TDAnalytics.Init(APPID,SERVER_URL)
```

Instruction on parameters:
- `APPID`: The APP ID of your project, which can be found on the project management page of the TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="OOXjbbcBioOIm8x1ZPMcYlCFnFr" width="1280" height="1007" align="center"/>


- If you use the private deployment version, you can customize the data tracking URL .
## **3. Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or used the APP with a new device.
### **3.1 Login**
When the users log in , `Login` could be called to set the account ID of the user. TE would use the account ID as the identification ID, and this ID would be saved before `Logout` is called. The previous account ID would be replaced if `Login` has been called multiple times.
```csharp
TDAnalytics.Login("TA");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>


### **3.2 Sending Events**
You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```csharp
Dictionary<string, object> dic = new Dictionary<string, object>();
dic.Add("channel", "te");//string
dic.Add("id", 618834);//number
dic.Add("isSuccess", true);//boolean
dic.Add("create_date", Convert.ToDateTime("2019-7-8 20:23:22"));//time
List<string> arr = new List<string>();
arr.Add("value");
dic.Add("arr", arr);//array
TDAnalytics.Track("product_buy", dic);
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.2 User Properties**
You can set user properties by calling `UserSet` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```csharp
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TA"}});
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```csharp
using ThinkingData.Analytics;

TDAnalytics.Init(APPID,SERVER_URL)
//if the user has logged in, the account ID of the user could be set as the unique identifier 
TDAnalytics.Login("TA");
//track
Dictionary<string, Object> dic = new Dictionary<string, object>();
dic.Add("channel", "te");//string
dic.Add("id", 618834);//number
dic.Add("isSuccess", true);//boolean
dic.Add("create_date", Convert.ToDateTime("2019-7-8 20:23:22"));//time
List<string> arr = new List<string>();
arr.Add("value");
dic.Add("arr", arr);//array
TDAnalytics.Track("product_buy", dic);
// object
Dictionary<string, object> json = new Dictionary<string, object>();
json.Add("key", "value");
dic.Add("object", json);
//array object
List<Dictionary<string, object>> arr1 = new List<Dictionary<string, object>>();
Dictionary<string, object> json1 = new Dictionary<string, object>();
json1.Add("key", "value");
arr1.Add(json1);
dic.Add("objects", arr1);
//Set user properties
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TA"}});
```
