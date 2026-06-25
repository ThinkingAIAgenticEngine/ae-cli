---
code: python_sdk_release_note
name: "Release Notes"
wikiToken: J30hwY6JOiFI3lknMssc7KBrnte
parentWikiToken: YoPdwzGBMiRyS7kTY5pcmWHpnjf
updateTime: 1774249282000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=python_sdk_release_note
---
## v3.0.0
**Date：2023/09/21**
**Notes：**
- Warning: Class name replacement, incompatible with older versions
## v2.1.3
**Date：2023/03/02**
**Notes：**
- Bugfix: fix dynamic wrong type
## v2.1.1
**Date：2023/03/01**
**Notes：**
- Clean up example program
## v2.1.0
**Date：2022/12/22**
**Notes：**
- Add debug model in TE
## v2.0.0
**Date：****2022/08/03**
**Notes：**
- Add test cases
## v1.8.0
**Date：****2022/04/26**
**Notes：**
- Supports First Event
## v1.7.0
**Date：****2021/12/29**
**Notes：**
- Added support for complex structure types
## v1.6.2
**Date：****2021/08/05**
**Notes：**
- Fix the problem that the flush method does not refresh the file date
## v1.6.1
**Date：****2021/06/04**
**Notes：**
- Modify LoggingConsumer's default write file condition to write 5 pieces of data once
- Modify the default maximum buffer limit of BatchConsumer to 50 batches
## v1.6.0
**Date：****2021/03/22**
**Notes：**
- Added network failure retry mechanism
- Increase the buffer area, retry 3 times to send failed data will be stored in the buffer area, the cache data exceeds the upper limit will discard the early data
- Support #app_id attribute
