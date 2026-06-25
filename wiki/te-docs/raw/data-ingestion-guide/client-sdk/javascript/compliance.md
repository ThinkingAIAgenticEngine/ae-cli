---
code: javascript_sdk_compliance
name: "Compliance"
wikiToken: KBxowhZ3Fir4rekLEqec9em3ngg
parentWikiToken: HwzHwHeb5iFceqk6Eylcd03UnMh
updateTime: 1774249083000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=javascript_sdk_compliance
---

## **1. Fill In the ****SDK**** Related Content in the Privacy Policy**
### **1.1 ****Collection and Acquisition**
Complete the following as appropriate in the Collection and Access to Your Personal Information section of the Privacy Policy.
When you are active, Thinking Data collects your device information (Screen width, Screen height, operating system, Browser type,Browser version, System language, etc.) for statistical analysis of how you use it within App.
### **1.2 ****Share with Authorized Partners**
Complete the following as appropriate in the Sharing with Authorized Partners section of the Privacy Policy.
Thinking Data SDK: Collect your device information (Screen width, Screen height, operating system, Browser type,Browser version, System language, etc.) and networking information for data analysis to improve our products and services.
## **2****. ****SDK**** Compliance Steps**
ThinkingData SDK requires you to ensure that users initialize the SDK after agreeing to the Privacy Policy
```cpp
import ta from "thinkingdata-browser";
// Judging whether to open data acquisition according to privacy protocol
if (Authorized Privacy Policy) {
    var config = {
        appId: 'APP_ID',
        serverUrl: 'SERVER_URL'
    };            
    ta.init(config);
}
```
