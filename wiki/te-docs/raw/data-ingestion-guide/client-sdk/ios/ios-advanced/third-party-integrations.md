---
code: ios_sdk_thirdparty
name: "Third-party Integrations"
wikiToken: WU5YwzBG9iRAcpkG1ypccUHmnBc
parentWikiToken: N4t8wyPNKip6pSkZsZvcYBpMnRc
updateTime: 1774249064000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ios_sdk_thirdparty
---

**Latest Version:** v0.3.5
**Update Time:** 2025/02/10
**Resource Download: **[SDK Framework](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_third_party.zip), [Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2FTAThirdParty%2Ftags)

Install using CocoaPods
```objectivec
pod 'TAThirdParty'
```

The sample codes for the synchronization of multiple platform data are as follows:
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer | TDThirdPartyTypeAdjust | TDThirdPartyTypeTradPlus | TDThirdPartyTypeTracking | TDThirdPartyTypeTopOn | TDThirdPartyTypeBranch | TDThirdPartyTypeIronSource];
```

<quote-container>
`enableThirdPartySharing:customMap`, an API that does not support bitwise operation, can be used to add additional parameters.
</quote-container>

## 1. AppsFlyer
Call  this API before AppsFlyer SDK calls the Start API：
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer];
```

After the created role is registered (optional)：
```objectivec
[TDAnalytics login:@"account_id"];
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer properties:@{@"ta_data11":@"ta_value11"}];
```

Every time you call the `login` or `setDistinctId`` `, you need to call `enableThirdPartySharing` synchronously to update the user ID.
Note: Since AppFlyer's `setAdditionalData` is called each time, the  user ID will be overwritten. You can set parameters via the` enableThirdPartySharing` API we provide:
```objectivec
NSDictionary *dic = @{@"af_test_key1": @"test1",@"af_test_key2": @"test2"};
[AppsFlyerLib.shared setAdditionalData:dic];
```

Since previous parameters would be replaced if setAdditionalData is called multiple times, the parameters could be transmitted to TE, and the TE SDK would merge the parameters.
```objectivec
NSDictionary *dic = @{@"af_test_key1": @"test1",@"af_test_key2": @"test2"};
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppsFlyer properties:dic];
```

## 2. Adjust
To be called before Adjust SDK initialization：
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAdjust];
```

After the created role is registered (optional)：
```objectivec
[TDAnalytics login:@"account_id"];
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAdjust];
```

## 3. Branch
To be called before the Branch initialize the session：
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeBranch];
```

After the created role is registered (optional)：
```objectivec
[TDAnalytics login:@"account_id"];
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeBranch];
```

## 4. TopOn
To be called before ATSDK.*init：*
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeTopOn];
```

Every time you call the `login` or `identify `, you need to call `enableThirdPartySharing` synchronously to update the user ID.
Note: Since TopOn's `initCustomMap` is called each time, the  user ID will be overwritten. You can set parameters via the` enableThirdPartySharing` API we provide:
```objectivec
NSDictionary *dic = @{@"test_key1": @"test1", @"test_key2": @"test2"};
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeTopOn properties:dic];
```

## 5. ReYun
To be called after the account is registered:
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeTRACKING];
```

## 6. TradPlus
To be called before TradPlus SDK initialization.*:*
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeTradPlus];
```

## 7. IronSource
To be called before IronSource SDK initialization:
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeIronSource];
```

## 8. AppLovin
- Display
To be called after AppLovin SDK initialization.
```objectivec
[TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppLovin];
```

- User
To achieve realization data acquisition, you need to implement `-[MAAdRevenueDelegate didPayRevenueForAd:]` to obtain realization data in this method and report the data through `enableThirdPartySharing` of SDK.
```objectivec
- (void)didPayRevenueForAd:(MAAd *)ad {
    //get Ad infomations
    NSDictionary *adInfo = @{
        @"ad_id": ad.adUnitIdentifier,
        @"revenue": @(ad.revenue),
        @"countryCode": [[[ALSdk shared] configuration] countryCode],
        @"networkName": ad.networkName,
        @"adUnitId": ad.adUnitIdentifier,
        @"adFormat": ad.format,
        @"placement": ad.placement
    };
    [TDAnalytics enableThirdPartySharing:TDThirdPartyTypeAppLovin];
    [TDAnalytics track:@"appLovin_sdk_ad_revenue" properties:adInfo];
}
```
