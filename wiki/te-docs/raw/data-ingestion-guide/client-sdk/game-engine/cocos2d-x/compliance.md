---
code: cocos2d-x_sdk_compliance
name: "Compliance"
wikiToken: Ce3Ow1fBGiDGeXkdk4vcZT73nrh
parentWikiToken: D4l8wlZzuifeHUkWUXbcnUuYnM6
updateTime: 1774249133000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocos2d-x_sdk_compliance
---

## **1. Filling out SDK-related Contents in The Privacy Policy**
### **1.1 Collecting and Acquiring Data**
The following content is suggested to fill out  in accordance with the actual conditions in the column of collecting and acquiring your personal data in the *Privacy Policy*. 
When you activate and use the APP, we would collect information about your device (including IDFV, AndroidID, OS, device model, device manufacturer, system version, application process information, etc.) through ThinkingAnalytics-SDK to analyze the effect you achieved by using the App via statistics.
### **1.2 Sharing with authorized partners**
The following content is suggested to fill out in accordance with the actual conditions in the column of sharing with authorized partners in the *Privacy Policy*.
ThinkingAnalytics-SDK: collect information about your device (including IDFV, AndroidID, OS, device model, device manufacturer, system version, application process information, etc.) and your network information to perform data analysis ,so as to improve our products and services
## **2. ****SDK**** Compliance Steps**
ThinkingData SDK needs to be initialized after the user agrees with the *Privacy Policy.*
```csharp
// determine whether to enable data tracking according to the Privacy Policy
if (authorized) {
   TDAnalytics::init(TA_APP_ID, TA_SERVER_URL);
}
```
