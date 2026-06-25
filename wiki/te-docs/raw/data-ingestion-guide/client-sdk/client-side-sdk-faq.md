---
code: client_sdk_faq
name: "Client-side SDK FAQ"
wikiToken: YQC3wSRR2iGPkYkAHieczG6ZnJe
parentWikiToken: KaFCwNeV3iRxjNkpT3QcDMg3n5V
updateTime: 1774252003000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=client_sdk_faq
---

## **What is the client-side ****SDK**** tracking policy?**
Native client-side SDK (including Unity, Unreal, Flutter, etc. ) data would be stored in the local database firstly. Data tracking would be triggered under the following situations:
- App enters the background
- Track once every 30S (can be set in TA background)
- Trigger tracking when the number of cached data exceeds 30 items (can be set in TE)
- Call flush interface actively
Mini-program, mini-game SDK, and JavaScript SDK would be reported in real-time without local storage.
## **What is the value logic of the ****device ID****?**
The value logic of the device of native client-side SDK (including Unity, Unreal, Flutter, etc. ) is as follows:
- Android: Take Android ID as the value
For systems below Android 8.0, Android ID is the unique device identifier. It would only change after being re-flashed or reset.  Shared by all apps. For systems of Android 8.0 or later versions, each combination of the app signature key, user, and the device has its unique ANDROID_ID value. Therefore, apps operating on the same device with different signature keys would no longer see the same Android ID (which also applies to the same user). A special condition: if the device on which the APP installed by the user is below 8.0, the APP was uninstalled later and reinstalled after the device was upgraded to 8.0, Android ID would become different. If the APP is not reinstalled, the Android ID would not change. 
- iOS: obtain IDFV first. Use a random UUID if failed to obtain IDFV. The first device ID value would be stored in the key string and no longer change, although IDFC changes subsequently. 
Mini-program, mini-game, and JavaScript interface could not obtain similar device numbers, with a random ID used as the device ID. If the user deletes the cache, the device ID would change. 
## **What is the lowest system version supported by client-side ****SDK****?**
The lowest version supported by the client-side SDK is Android 4.0 and iOS 8.0
## **How to identify tracking problems?**
Common problems could be identified rapidly through client-side logs. We described how to enable client-side logs in various data ingestion guidance. 
In Android, you can enable client-side logs by calling the `enableTrackLog` api. You can filter the logs of Android SDK through `ThinkingAnalytics`.
```java
ThinkingAnalyticsSDK.enableTrackLog(true);
```

In iOS, you can enable log printing by calling `setLogLevel` and filter logs of iOS SDK through `THINKING`.
```objectivec
[ThinkingAnalyticsSDK setLogLevel:TDLoggingLevelDebug]
```

After opening the logs, you can send the logs to our technical support engineer to help you identify the problem. 
If you are not sure whether the receiver URL is correct, you can detect the accessibility of the receiver URL by inspecting the interface. Visit https://YOUR_RECEIVER_URL/health-check. If the page returns ok, it means the address of the receiving end is configured correctly.
Besides, with the functions of the [tracking management](https://thinkingdata.feishu.cn/wiki/K443wTChAiFc47kBz8ucXqVfnSf) module, you can also identify the problems related to data tracking swiftly. 
## **What are the precautions for data tracking through Unity ****SDK****?**
1. The initialization of SDK is completed in Awake(). Therefore, the calling process could not be triggered in Awake
2. All the interfaces could only be called in the main thread by default. 
3. We can tell whether the APP could enter the foreground or retreat to the background according to the life cycle of the components of the Android system. However, Unity could not ensure that the program could initialize SDK from the very beginning. Therefore, the first enable event could only be identified when the APP retreat to the background. Currently, we would supplement a ta_app_start (being tracked at a relatively late time) when the APP retreat to the background for the first time. However, the event time #event_time is correct and would not influence subsequent analysis)
## **What is the content of crash events? How to track crash events?**

The client-side SDK supports the tracking of some crash logs. It is necessary to enable auto-tracking of APP Crash after SDK initialization. The event name corresponding to the crash event is: ta_app_crash.
Conditions under which crash event tracking would be triggered:
- Android platform: no anomaly is captured in the virtual machine
- iOS platform: 
  - Unix signal anomalies include: SIGABRT, SIGILL, SIGSEGV, SIGFPE, SIGBUS
  - NSException anomaly
- Tracking of C$ anomaly in the Unity engine
