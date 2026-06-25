---
code: unity_sdk_compliance
name: "Compliance"
wikiToken: LQORw5r91iyT0LkBRP1cF7MTnrd
parentWikiToken: NaFYwOKI1iN5mgkTPQwcZY0tnRg
updateTime: 1774249104000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_compliance
---

## **1****. Fill ****I****n the ****SDK**** ****R****elated ****C****ontent in the ****P****rivacy ****P****olicy**
### **1.1 ****Collection and Acquisition**
Complete the following as appropriate in the Collection and Access to Your Personal Information section of the Privacy Policy.
When you are active, Thinking Data collects your device information (IDFV, AndroidID, operating system, device model, device manufacturer, system version, etc.) for statistical analysis of how you use it within App.
### **1.2 ****Share with Authorized Partners**
Complete the following as appropriate in the Sharing with Authorized Partners section of the Privacy Policy.
Thinking Data SDK: Collect your device information (IDFV, AndroidID, operating system, device model, device manufacturer, system version, etc.) and networking information for data analysis to improve our products and services.
## **2****. ****SDK**** Compliance Steps**
ThinkingData SDK requires you to ensure that users initialize the SDK after agreeing to the Privacy Policy
```csharp
// Judging whether to open data acquisition according to privacy protocol
if (Authorized Privacy Policy) {
   TDAnalytics.Init("APPID","SERVER");
}
```
