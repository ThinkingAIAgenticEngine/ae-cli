---
code: unreal_sdk_thirdparty
name: "Third-party Integrations"
wikiToken: I1pgw7m8pix4lpku3L1cPzoZnRb
parentWikiToken: T3M0w3OWGi4LYjk1XYQcUCbCnff
updateTime: 1774249116000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unreal_sdk_thirdparty
---

The sample codes for the synchronization of multiple platform data are as follows:
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeIRONSOURCE"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRACKING"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRADPLUS"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

`EnableThirdPartySharingWithCustomProperties：`, an API that does not support bitwise operation, can be used to add additional parameters.
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeIRONSOURCE"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRACKING"));
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRADPLUS"));

TSharedPtr<FJsonObject> m_DataJsonObject = MakeShareable(new FJsonObject);
m_DataJsonObject->SetStringField(TEXT("thirdkey1"), TEXT("thirdvalue1"));
m_DataJsonObject->SetStringField(TEXT("thirdkey2"), TEXT("thirdvalue2"));
UTDAnalytics::EnableThirdPartySharingWithCustomProperties(EventTypeList, m_DataJsonObject, AppID);
```

## 1.AppsFlyer
Call  this API before AppsFlyer SDK calls the Start API：
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

After the created role is registered (optional)：
```cpp
UTDAnalytics::Login("account_id", AppID);
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

Every time you call the `Login` or `Identify `, you need to call `EnableThirdPartySharing` synchronously to update the user ID.
Note: Since AppFlyer's `setAdditionalData` is called each time, the  user ID will be overwritten. You can set parameters via the` EnableThirdPartySharingWithCustomProperties` API we provide:
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeAPPSFLYER"));
TSharedPtr<FJsonObject> m_DataJsonObject = MakeShareable(new FJsonObject);
m_DataJsonObject->SetStringField(TEXT("thirdkey1"), TEXT("thirdvalue1"));
m_DataJsonObject->SetStringField(TEXT("thirdkey2"), TEXT("thirdvalue2"));
UTDAnalytics::EnableThirdPartySharingWithCustomProperties(EventTypeList, m_DataJsonObject, AppID);
```

## 2.Adjust
To be called before Adjust SDK initialization：
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

After the created role is registered (optional)：
```cpp
UTDAnalytics::Login("account_id", AppID);
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeADJUST"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

## 3.Branch
To be called before the Branch initialize the session：
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

After the created role is registered (optional)：
```cpp
UTDAnalytics::Login("account_id", AppID);
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeBRANCH"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

## 4.TopOn
To be called before ATSDK.*init：*
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

Every time you call the `Login` or `Identify `, you need to call `EnableThirdPartySharing` synchronously to update the user ID.
Note: Since TopOn's `initCustomMap` is called each time, the  user ID will be overwritten. You can set parameters via the` EnableThirdPartySharingWithCustomProperties` API we provide:
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTOPON"));
TSharedPtr<FJsonObject> m_DataJsonObject = MakeShareable(new FJsonObject);
m_DataJsonObject->SetStringField(TEXT("thirdkey1"), TEXT("thirdvalue1"));
m_DataJsonObject->SetStringField(TEXT("thirdkey2"), TEXT("thirdvalue2"));
UTDAnalytics::EnableThirdPartySharingWithCustomProperties(EventTypeList, m_DataJsonObject, AppID);
```

## 5.ReYun
To be called after the account is registered:
```cpp
UTDAnalytics::Login("account_id", AppID);
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRACKING"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

## 6.TradPlus
To be called before TradPlus SDK initialization:
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeTRADPLUS"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```

## 7.IronSource
To be called after IronSource SDK initialization:
```cpp
TArray<FString> EventTypeList;
EventTypeList.Emplace(TEXT("TAThirdPartyShareTypeIRONSOURCE"));
UTDAnalytics::EnableThirdPartySharing(EventTypeList, AppID);
```
