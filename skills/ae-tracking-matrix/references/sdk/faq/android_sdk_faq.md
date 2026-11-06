---
title: "Android SDK FAQ"
code: "android_sdk_faq"
source: "Feishu MCP"
doc_id: "wikcnVrL8nNo5bwytvIVde3MT8e"
fetched_at: "2026-04-20T17:29:37Z"
---

# Integrate SDK

## Integration Methods

- Android SDK supports two integration methods: automatic gradle integration and manual aar integration.

### gradle Import

- Add the following configuration dependency in the `Project` level `build.gradle` file

```json
buildscript {
    repositories {
        jcenter()
        mavenCentral()
    }
}
```

- Add the dependency in the `build.gradle` file under the `Module` project directory:

```java
dependencies {
    implementation 'cn.thinkingdata.android:ThinkingAnalyticsSDK:2.8.3'
}
```

### Local aar Import

Refer to the official documentation.

## Compatibility Notes

- Android SDK minimum compatibility version is Android 4.0
  - `minSdkVersion 14`

# Initialization

## Recommended Initialization Location

- It is recommended to initialize the SDK after the user agrees to the privacy policy. See the "Compliance Guide" section in ThinkingData official documentation for details.

```json
// Determine whether to enable data collection based on privacy policy
if (Privacy Policy Authorized) {
    TDAnalytics.init(this, APPID, SERVER_URL);
}
```

## Initialization Method 1: Default configuration, just pass APPID and SERVER_URL

```java
// Initialize SDK in main thread
TDAnalytics.init(this, APPID, SERVER_URL);
```

## Initialization Method 2: Customize parameters via config

- Mode settings
  - config.setMode(TDConfig.TDMode.NORMAL);
  - config.setMode(TDConfig.TDMode.DEBUG);
  - config.setMode(TDConfig.TDMode.DEBUG_ONLY);
- Mode timezone settings
  - config.setDefaultTimeZone(TimeZone.getDefault());
- Enable multi-process
  - config.setMutiprocess(true);
- Enable encryption
  - config.enableEncrypt(true)

```java
TDConfig config = TDConfig.getInstance(this, APPID, TE_SERVER_URL);
TDAnalytics.init(config);
```

# Upload Modes

## NORMAL

- In Normal mode, data first enters the cache, then is batch uploaded according to configured upload rules. Successfully uploaded data will be stored in the database.

## DEBUG

- In Debug mode, data is immediately uploaded one by one. Successfully uploaded data will be stored in the database.
- If upload fails, SDK will downgrade Debug mode to Normal mode and cache failed data locally.
- Device whitelist needs to be configured in the application.

## DEBUG_ONLY

- In DebugOnly mode, data is immediately uploaded one by one and will NOT be stored in the database. If upload fails, data will be lost.
- Without whitelist configuration, it will not automatically switch to NORMAL mode.

> Note:
>
> - Avoid using debug or debug_only mode in production release
> - In debug mode, if no whitelist is configured in TE backend, it will switch to NORMAL mode
> - debug_only will not automatically switch to NORMAL mode

# Upload Strategy

- Normal mode defaults to 30 seconds or 30 records triggering an upload, can be modified in TE project management
- debug / debug_only mode events are immediately uploaded
- Manually calling flush() interface will immediately upload cached data
- Auto-tracking events are immediately uploaded
- Each request has a maximum of 50 records

# Cache Mechanism

- Non debug, debug_only mode, data is first cached in local database, then sent according to strategy
- Default local cache limit is 10,000 records, exceeding this will start discarding earlier data
- SDK version before 2.8.2 defaults to 15 days cache, 2.8.2 onwards defaults to 10 days cache
- Cache days and count can be configured via ta_public_config.xml

# Auto-tracking Events

## ta_app_install

### Trigger Conditions and Timing

- Install event auto-tracking is enabled
- SDK initialization checks firstInstallTime

## ta_app_start

### Trigger Conditions and Timing

- ta_app_start event auto-tracking is enabled
- App starts or App returns from background to foreground

## ta_app_end

### Trigger Conditions and Timing

- End event auto-tracking is enabled
- App exits or switches to background, or crashes

## ta_app_crash

### Trigger Conditions and Timing

- Crash event auto-tracking is enabled
- Triggered when App crashes

## ta_app_view

### Trigger Conditions and Timing

- View event auto-tracking is enabled
- When Activity or fragment page is displayed

## ta_app_click

### Trigger Conditions and Timing

- Click event auto-tracking is enabled
- When clicking page controls
- Requires full-tracking plugin integration

# Preset Properties

## Device ID #device_id

- Obtained from AndroidID or randomly generated
- When it changes: app multi-instance, unable to get androidId and uninstall/reinstall, flashing ROM or changing package name

## Simulator #simulator

- Determined based on Android's SystemProperties

## Memory #ram

- Gets available memory and total memory size

## Carrier #carrier

- Some app stores report security detection for obtaining carrier without permission request, this field can be blocked

## Network Type #network_type

- If no network at event time, value is NULL

## Visitor ID #distinct_id

- Default generated by system UUID, stored locally
- Will change after uninstall/reinstall

# Common Properties

## Static Common Properties

- Method name setSuperProperties
- Stores set properties in local SharedPreferences

## Dynamic Common Properties

- Method name setDynamicSuperPropertiesTracker
- Properties from this callback are included in each track call

# Data Encryption

- Default is gzip then base64 processing
- From 2.8.0 asymmetric encryption can also be enabled
- Encryption only works in normal mode

# Common Issues

## Data Upload Failed

- Check if upload address and appid are correct
  - {Upload Address}/check_appid?appid={appid} returns 0 means normal
- Service exception
  - {Upload Address}/health_check returns ok means normal

## Some Users Have No Event Upload

- Check if upload address uses https protocol, Android 9.0+ defaults to not supporting http
- Check if SDK initialization has logic judgment, some cases may not initialize

# Known Issues

See complete documentation for details.
