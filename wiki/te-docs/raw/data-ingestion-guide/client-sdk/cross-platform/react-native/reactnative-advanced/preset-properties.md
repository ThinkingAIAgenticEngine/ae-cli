---
code: rn_sdk_preset_properties
name: "Preset Properties"
wikiToken: RfDTw9QYNiY0AckcJZicnBOon7b
parentWikiToken: GKCGw8YI4itlKEk4miNccirjnfc
updateTime: 1774251993000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=rn_sdk_preset_properties
---

## 1. Description of Preset Properties
The preset properties collected by iOS and Android platforms will have certain differences. For details, please refer to the following documents:
[iOS platform preset properties](https://thinkingdata.feishu.cn/wiki/Ny61w1VIbi5Qeok94fRcJhulned),[android platform preset properties](https://thinkingdata.feishu.cn/wiki/MBnZwHrO0ibkd9ksCSBc7dxEnic)
## **2. Getting Preset Properties**
```javascript
async () => {
  var presetProperties = await TDAnalytics.getPresetProperties()
}
```