---
code: unity_sdk_thirdparty
name: "Third-party Integration"
wikiToken: VFkdwuFNAiHedqkdbItc6oXznQ1
parentWikiToken: A3TawLiiwiV2LZkUDTAc1YuOnmd
updateTime: 1774249098000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_thirdparty
---

The sample codes for the synchronization of multiple platform data are as follows:
```csharp
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.APPSFLYER | TDThirdPartyType.ADJUST | TDThirdPartyType.TRADPLUS | TDThirdPartyType.TRACKING | TDThirdPartyType.TOPON | TDThirdPartyType.BRANCH | TDThirdPartyType.IRONSOURCE);
```

## **1. Appsflyer**
Call  this API before AppsFlyer SDK calls the Start API：
```csharp
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.APPSFLYER);
```

After the created role is registered (optional)：
```csharp
TDAnalytics.Login("account_id");
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.APPSFLYER);
```

<quote-container>
Note: Every time you call the `Login` or `SetDistinctId`, you need to call `EnableThirdPartySharing` synchronously to update the user ID.
</quote-container>

## **2. Adjust**
To be called before Adjust SDK initialization：
```csharp
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.ADJUST);
```

After the created role is registered (optional)：
```csharp
TDAnalytics.Login("account_id");
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.ADJUST);
```

## **3. Branch**
To be called before the Branch initialize the session：
```java
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.BRANCH);
```

After the created role is registered (optional)：
```java
TDAnalytics.Login("account_id");
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.BRANCH);
```

## **4. TopOn**
To be called before ATSDK.*init：*
```java
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.TOPON);
```

## **5. ReYun**
To be called after the account is registered:
```java
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.TRACKING);
```

## **6.** **Trad****P****lus**
To be called before TradPlus SDK initialization*:*
```java
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.TRADPLUS);
```

## **7.** **IronSource**
To be called after IronSource SDK initialization:
```java
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.IRONSOURCE);
```
