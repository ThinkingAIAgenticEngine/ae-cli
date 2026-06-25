---
code: unity_sdk_native_pluggable
name: "Native Pluggable"
wikiToken: Q3tcwv2Z2iCbyukYA4YclS5QnOb
parentWikiToken: A3TawLiiwiV2LZkUDTAc1YuOnmd
updateTime: 1774249102000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_native_pluggable
---

::: tip Notices
After v2.6.0, it is supported to switch the type of code executed by the iOS/Android native platform. By default, Objective-C/Java code is executed, and C# code is executed after switching.
For online iOS/Android applications, after updating the version of "Execute C# code", users will lose persistent data, including Device ID, Account ID, Distinct ID, Event Super Properties, etc., and will be identified as a new user after the upgrade. Please choose carefully.
:::
# 1. Pluggable process
## 1.1 iOS
<quote-container>
By default, Objective-C code is executed, and C# code is executed after switching.
</quote-container>

- Download and uncompress [Unity SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_unity_sdk.zip), double click to import `ta_unity_sdk.unitypackage`. On the import interface, uncheck the `Plugins/iOS` and click `Import`.
<image token="MBTobPxU2op5pkxOPf8cnSUYnHr" width="350" height="378" align="center"/>

<quote-container>
Attention: If you have imported the Unity SDK before, you need to check the files in the Plugins/iOS directory, if there are no files or directories other than "ThinkingSDK", "TAThirdParty", "ThinkingAnalytics.m", Simply delete the Plugins/iOS directory, otherwise delete the above files and directories.
</quote-container>

- Open `Project Settings` - `Player` - `iOS` , find  `Scripting Define Symbols`, click `+` add `TE_DISABLE_IOS_OC`to list, and `Apply`
<image token="Kpakbc0MqoLVPtxQrCWcmG2tnUc" width="1200" height="857" align="center"/>

## 1.2 Android
<quote-container>
By default, Java code is executed, and C# code is executed after switching.
</quote-container>

- Download and uncompress [Unity SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_unity_sdk.zip), double click to import `ta_unity_sdk.unitypackage`. On the import interface, uncheck the `Plugins/Adnroid` and click `Import`.
<image token="QmZyb9VJboa1AtxuGUDcHC6hnAg" width="350" height="378" align="center"/>

<quote-container>
Attention: If you have imported the Unity SDK before, you need to check the files in the Plugins/Android directory, if there are no files or directories other than "ThinkingSDK.aar", "ThinkingSDK-gameengine.aar", "ThinkingSDK-thirdparty.aar", Simply delete the Plugins/Android directory, otherwise delete the above files.
</quote-container>

- Open `Project Settings` - `Player` - `Android`, find  `Scripting Define Symbols`, click `+` add `TE_DISABLE_ANDROID_JAVA` to list, and `Apply`
<image token="BcDEbIhdIopuJbxWtt5cOIz8ndb" width="1200" height="857" align="center"/>
