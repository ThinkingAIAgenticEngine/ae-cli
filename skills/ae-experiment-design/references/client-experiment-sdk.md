# Client Experiment SDK

Read this reference for Android, iOS, or browser JavaScript experiment integration. Read `sdk-index.md` first and verify the current main document before producing production code.

## Shared client model

All three verified client pages describe the same model:

- analytics SDK handles data collection;
- Remote Config retrieves AE configuration;
- experiment SDK provides typed Feature getters and exposure;
- automatic exposure is enabled through `automaticExposureTracking`;
- manual exposure is available when activation does not coincide with the getter;
- a custom bucket map can override the default assignment subject;
- custom fetch parameters can be attached to configuration requests;
- an explicit fetch can refresh experiment information.

## Android

Verified document state: `TDExperiment` 1.0.1, updated 2026-07-24.

Dependencies:

- `TDAnalytics` >= 3.3.6
- `TDRemoteConfig` >= 1.3.0
- automatic package: `cn.thinkingdata.android:TDExperiment:1.0.1`

Initialization order:

```java
TDAnalytics.init(context, "APP_ID", "https://YOUR_SERVER_URL");

TDExperimentConfig config =
    new TDExperimentConfig("APP_ID", "https://YOUR_SERVER_URL");
config.automaticExposureTracking = true;
TDExperiment.init(context, config);
```

Verified operations:

```java
TDExperiment.getValueAsString(key);
TDExperiment.getValueAsDouble(key);
TDExperiment.getValueAsBoolean(key);
TDExperiment.getValueAsJson(key);
TDExperiment.exposure(key);
TDExperiment.fetch();
TDExperiment.setCustomBucketId(bucketId);
TDExperiment.setCustomFetchParams(params);
```

Use the initialization callback for first-fetch success or error. `TDExperiment.enableLog(true)` enables experiment logging.

The verified page does not show typed-default overloads for Android getters. Keep an application-owned typed control default and verify whether a newer SDK adds overloads.

## iOS

Verified document state: `TDExperiment` 1.0.2, updated 2026-07-24.

Dependencies:

- `ThinkingSDK` >= 3.1.6
- `TDRemoteConfig` >= 1.3.1
- CocoaPods: `pod 'TDExperiment', '1.0.2'`
- minimum deployment target shown by the experiment page: iOS 9.0

Initialization order:

```objective-c
[TDAnalytics startAnalyticsWithAppId:@"APP_ID"
                           serverUrl:@"https://YOUR_SERVER_URL"];

TDExperimentConfig *config =
    [[TDExperimentConfig alloc] initWithAppId:@"APP_ID"
                                    serverUrl:@"https://YOUR_SERVER_URL"];
config.automaticExposureTracking = YES;
[TDExperiment startWithConfig:config];
```

Verified getters support no-argument defaults and explicit defaults:

```objective-c
[TDExperiment getValueAsString:key defaultValue:@"default"];
[TDExperiment getValueAsNumber:key defaultValue:@0];
[TDExperiment getValueAsBoolean:key defaultValue:NO];
[TDExperiment getValueAsJson:key defaultValue:@{}];
```

Other verified operations:

```objective-c
[TDExperiment exposure:key];
[TDExperiment fetch];
[TDExperiment setCustomBucketId:bucketId];
[TDExperiment setCustomFetchParams:params];
```

Use `TDExperimentTask` listeners for startup or fetch success and failure. `[TDExperiment enableLog:YES]` enables experiment logging.

## JavaScript

Verified document state: experiment package 1.0.0, updated 2026-07-24.

Dependencies:

- `TDAnalytics` >= 2.6.0
- `TDRemoteconfig` >= 1.3.0
- files shown by the page: `thinkingdata.umd.min.js`, `tdremoteconfig.umd.min.js`, `tdexperiment.umd.min.js`

The page initializes analytics first and then the experiment global with:

- `appId`
- `serverUrl`
- `automaticExposureTracking`
- `customBucketId`
- `customFetchParams`
- `enableLog`
- fetch success and failure callbacks

The page shows typed getters, manual exposure, fetch, custom bucket ID, and custom fetch parameters.

### Spelling gate

The verified page spells the global object `TDExpriment`. Treat this as unresolved until the downloaded 1.0.0 package or a newer verified main document confirms the export. Do not silently change it, and do not publish exact JavaScript code based only on the page.

## Remote Config companion behavior

The verified Remote Config pages show:

- local defaults when no remote value is available;
- value order: remote, local default, then empty;
- a successful-fetch update listener;
- status information for strategies changed to `suspend` or `force_offline`;
- debug/test mode polling every five seconds for test strategies;
- test-device selection for client send testing.

These are Remote Config behaviors. Do not imply that the experiment SDK itself polls every five seconds in production.

## Client implementation checklist

- Verify all three SDK versions together.
- Initialize on the documented thread or lifecycle point.
- Set assignment identity before first fetch or getter.
- Use a typed control default.
- Choose automatic or manual exposure, not both.
- Freeze behavior when a mid-session update would cause flicker.
- Test control, treatment, no-network, timeout, account switch, and stale-cache cases.
