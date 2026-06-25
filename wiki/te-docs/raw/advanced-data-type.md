---
code: advanced_data_type
name: "Advanced Data Type"
wikiToken: DyTywDmeWiYzq2kLIQlcsNsJnff
parentWikiToken: Hx0SwfT0aiwGRekQp2ocJ7okn0g
updateTime: 1776412217000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=advanced_data_type
---

This chapter mainly introduces the advanced data type in the AE system. The advanced data type will have additional data processing logics when the system receives such data. The structure is also somewhat different from the standard data structure. You can view the corresponding document to learn about the capabilities of each advanced data type
::: warning
The advanced data will have high performance overheads. To ensure data processing efficiency, it is recommended to use it only in appropriate scenarios
 :::
The current advanced data types are as follows:
- [<text underline="true">updated event:</text>](https://thinkingdata.feishu.cn/wiki/BtlUwIB0piMzhdkMjz2cmndrnFb)<text underline="true"> special events that can update event properties</text>
- [<text underline="true">first event check</text>](https://thinkingdata.feishu.cn/wiki/IlCawoKZKiytCMkqRPvcpz3Ln5g)<text underline="true">: </text>By adding the first event check ID to determine whether the event occurred for the first time, only the data whose ID appears for the first time is allowed to be stored in the database