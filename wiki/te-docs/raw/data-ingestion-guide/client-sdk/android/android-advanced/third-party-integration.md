---
code: android_sdk_thirdparty
name: "Third-party Integration"
wikiToken: SRalwJFiZiEuZUk6PXJc2144nse
parentWikiToken: LqfmwtW1xi0jzwkrKpscKEzFnme
updateTime: 1774249046000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=android_sdk_thirdparty
---

-  Third-party data plugin should be introduced:
```groovy
implementation 'cn.thinkingdata.android:TAThirdParty:2.0.0'
```

- The sample codes for the synchronization of multiple platform data are as follows:
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.APPS_FLYER | TDThirdPartyType.ADJUST);
```

<quote-container>
`enableThirdPartySharing(int var1, Map<String, Object> var2)`, an API that does not support bitwise operation, can be used to add additional parameters.
</quote-container>

## AppsFlyer
Call  this API before AppsFlyer SDK calls the Start API：
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.APPS_FLYER)
```

After the created role is registered (optional)：
```java
TDAnalytics.login("account_id")
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.APPS_FLYER)
```

Every time you call the `login` or `identify `, you need to call `enableThirdPartySharing` synchronously to update the user ID.
Note: Since AppFlyer's `setAdditionalData` is called each time, the  user ID will be overwritten. You can set parameters via the` enableThirdPartySharing` API we provide:
```java
Map<String, Object> additionalData = new HashMap<>();
additionalData.put("af_test_key1", "test1");
additionalData.put("af_test_key2", "test2");
AppsFlyerLib.getInstance().setAdditionalData(additionalData);
```

Since previous parameters would be replaced if setAdditionalData is called multiple times, the parameters could be transmitted to TE, and the TE SDK would merge the parameters.
```java
Map<String, Object> additionalData = new HashMap<>();
additionalData.put("af_test_key1", "test1");
additionalData.put("af_test_key2", "test2");
TDAnalytics.enableThirdPartySharing(
    TDThirdPartyType.APPS_FLYER,
    additionalData
)
```

## Adjust
To be called before Adjust SDK initialization：
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.ADJUST)
```

After the created role is registered (optional)：
```java
TDAnalytics.login("accoount_id")
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.ADJUST)
```

## 3.Branch
To be called before the Branch initialize the session：
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.BRANCH);
```

After the created role is registered (optional)：
```java
TDAnalytics.login("accoount_id")
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.BRANCH);
```

## 4.TopOn
To be called before ATSDK.*init：*
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.TOP_ON);
```

Every time you call the `login` or `identify `, you need to call `enableThirdPartySharing` synchronously to update the user ID.
Note: Since TopOn's `initCustomMap` is called each time, the  user ID will be overwritten. You can set parameters via the` enableThirdPartySharing` API we provide:
```java
Map<String, Object> customMap = new HashMap<>();
customMap.put("key1", "value1");
customMap.put("key2", "value2");
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.TOP_ON, customMap);
```

## 5.ReYun
To be called after the account is registered:
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyShareType.TD_TRACKING)
```

## 6.TradPlus
To be called before TradPlus SDK  initialization:
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.TRAD_PLUS);
```

## 7.IronSource
To be called after IronSource Sdk initialization:
```java
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.IRON_SOURCE);
```

## 8.AppLovin
- User Revenue API
To be called before AppLovin SDK  initialization:
```css
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.APPLOVIN_IMPRESSION);
```

- Impression-Level User Revenue API
If you want to achieve monetization data acquisition, you need to create a `MaxAdRevenueListener`,and rewrite the `onAdRevenuePaid`.In this method, the monetization data is obtained and the data is reported through the `enableThirdPartySharing` of the TA SDK,
finally, the listener is passed to setRevenueListener(). The sample code is as follows:
```java
void onAdRevenuePaid(final MaxAd ad){
    TDAnalytics.enableThirdPartySharing(TDThirdPartyType.APPLOVIN_USER,ad);
}
```
