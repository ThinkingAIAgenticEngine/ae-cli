---
code: coco2d-x_sdk_multi_instance
name: "Multi-Instance"
wikiToken: Y9L5wGBcpisIl6kJEnFcKl8nndd
parentWikiToken: FQF1wNXmZiaQ42kNmOicojvCnO6
updateTime: 1774249131000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=coco2d-x_sdk_multi_instance
---

The Multi-Appid feature could create multiple SDK instances to perform data tracking based on their own Appid. That is, you can report data to multiple Appids. 
In the Cocos2d-x SDK version 2.1.0, a new Light-instance feature is added, which can support the generate of multiple sub-light instances of the same Appid. The sub-lightweight instance is consistent with the Appid of the parent instance, but the account number and other information are inconsistent.
Multiple SDK instances can be created by uploading different APP IDs to complete SDK initialization
```csharp
// initialize SDK
TDAnalytics::init(TE_APP_ID, TE_SERVER_URL);
TDAnalytics::init(TE_APP_ID_1, TE_SERVER_URL_1);

TDJSONObject eventProperties;
eventProperties.setString("product_name", "product name");
TDAnalytics::track("product_buy",eventProperties,TE_APP_ID);
```
