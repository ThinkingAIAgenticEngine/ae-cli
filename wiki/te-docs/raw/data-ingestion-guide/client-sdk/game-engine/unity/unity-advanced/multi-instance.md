---
code: unity_sdk_multi_instance
name: "Multi-instance"
wikiToken: LZkjwczk4iA1zBkB2MVc8r3lnbh
parentWikiToken: A3TawLiiwiV2LZkUDTAc1YuOnmd
updateTime: 1774249100000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_multi_instance
---

## **1. Create Multiple ****SDK**** Instances**
If you want to send data to multiple projects, you can use the multi-instance feature.
Multi-instance can be created by initializing the SDK with multiple settings of project information.
```csharp
//multi-instance initialization
TDConfig tdConfig_1 = new TDConfig(appId_1, serverUrl_2);
TDConfig tdConfig_2 = new TDConfig(appId_2, serverUrl_2);
TDConfig[] tokens = new TDConfig[2];
tokens[0] = tdConfig_1;
tokens[1] = tdConfig_2;
TDAnalytics.Init(tokens);
//multi-instance tracking
Dictionary<string, object> properties = new Dictionary<string, object>(){
    {"product_name", "product name"}
};
//track event with 1st instance
TDAnalytics.Track("product_buy", properties, appId_1);
//track event with 2ed instance
TDAnalytics.Track("product_buy", properties, appId_2);
//if Track without APP ID, it will be reported with 1st instance
TDAnalytics.Track("product_buy", properties);
```

<quote-container>
Distinct ID, account ID, super properties, etc. are not shared across multi-instance and need to be set for each instance.
</quote-container>

## **2. Create Light Instance**
```csharp
// initializing instance
TDAnalytics.Init("APPID", "SERVER");
// call CreateLightInstance to creat Lightweight Instance
string lightKey = TDAnalytics.LightInstance();
// Login/Track with lightKey
TDAnalytics.Login("TE2", lightKey);
TDAnalytics.Track("some_event", lightKey);
```

<quote-container>
The Light Instance has the same APP ID, server URL, and some settings as the parent instance, but other information is not shared.
</quote-container>
