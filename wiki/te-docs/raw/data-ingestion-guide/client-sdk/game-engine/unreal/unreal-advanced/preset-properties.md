---
code: unreal_sdk_preset_properties
name: "Preset Properties"
wikiToken: YNhfwH1lyiPmEiktyZ9c7NRXnsg
parentWikiToken: T3M0w3OWGi4LYjk1XYQcUCbCnff
updateTime: 1774251977000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unreal_sdk_preset_properties
---

### **1. Preset Properties of All Events**
All Events in Unreal SDK would have the following preset property.

<quote-container>
The prefabricated attributes collected by each platform will have certain differences. For details, please refer to the following documents: [Android platform](https://thinkingdata.feishu.cn/wiki/MBnZwHrO0ibkd9ksCSBc7dxEnic) 、 [iOS platform](https://thinkingdata.feishu.cn/wiki/Ny61w1VIbi5Qeok94fRcJhulned)
</quote-container>

**Preset properties for ****Mac**** and Windows:**

<sheet token="CinXs6jDlhoD2FtyWYqc4yXgnjb_7VXZad"/>

### **Getting Preset Properties**
Since v1.3.0, Adds a pre-acquisition attribute API. The SDK will automatically add some built-in attributes when reporting event attributes. You can obtain preset attributes through this interface.
```cpp
FString PresetProperties = UTDAnalytics::GetPresetProperties();
```
