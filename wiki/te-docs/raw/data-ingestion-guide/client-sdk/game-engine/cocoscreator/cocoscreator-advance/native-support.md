---
code: cocoscreator_sdk_native_support
name: "Native Support"
wikiToken: XykzwwmelizphXkdA8Yc98pYnUe
parentWikiToken: DHMrw6JkgiGcwxkzyPKc55VJn0c
updateTime: 1774249145000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocoscreator_sdk_native_support
---

## **1. ****iOS**** Native Support**
Building the iOS project for the first time, it will create native project file to ./build/ios/ and ./native/engine/ios/, and then you can start configuring the iOS project.
### **1.1 Manual Configuration**
- Add iOS project files
  - `CocosCreatorProxyApi.h`
  - `CocosCreatorProxyApi.mm`
  - `ThinkingSDK.framework`
  - `ThinkingDataCore.framework`
- Build Phases 
  - Add `ThinkingSDK.framework` to `Link Binary With Libraries`
- Build Settings 
  - Add `ThinkingSDK.framework` path, e.g. `"$(SRCROOT)/../Classes"`, to `Framework Search Paths`
  - Add `-ObjC` to `Other Linker Flags`
### **1.2 CMakeList Configuration**
<quote-container>
1. `CMakeList` file path is `./native/engine/ios/CMakeLists.txt`
2. The `CMakeList` file will be created after the iOS project is built for the first time, and it will take effect when it is built again after configuration
3. Copy iOS files to project, e.g. `./native/engine/common/Classes/ThinkingAnalytics/ios/`, and config `CMakeList` 
</quote-container>

- Add iOS project files
```c
# find the following code 
set(PROJ_COMMON_SOURCES
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/Game.h
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/Game.cpp
    # add the following code
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/CocosCreatorProxyApi.h
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/CocosCreatorProxyApi.mm
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingSDK.framework
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingDataCore.framework
)
```

- Build Phases
```c
# find the following code 
target_link_libraries(${LIB_NAME} cocos2d)
# add the following code
target_link_libraries(${LIB_NAME} ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingSDK.framework)
target_link_libraries(${LIB_NAME} ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingDataCore.framework)
```

- Build Settings
```c
# find the following code 
set(PRODUCT_NAME ${APP_NAME})
# add the following code
set(CMAKE_EXE_LINKER_FLAGS -ObjC)
```

<quote-container>
Cocos Creator v2.x does not support the CMake configuration mode, and needs to be configured manually.
</quote-container>

## **2.  Android Native Support**
Build and config the Android project.
- Open Android project with Android Studio and switch to Android mode. Add  `CocosCreatorProxyApi.java` to `com.cocos.game` , like this: 
<grid cols="2">
  <column width="37">
    <image token="T0UKbNL5Gotpljxuet8c1ABVnhg" width="440" height="397" align="center"/>

  </column>
  <column width="62">
    <image token="HXnZbUTJJoRFQHxzLDCcrXRGnrc" width="953" height="517" align="center"/>

  </column>
</grid>

- Find the file proguard-rules.pro in `/app`, and add obfuscated code
```plaintext
-keep public class com.cocos.game.CocosCreatorProxyApi {*;}
```

- Create a directory named libs, and copy `TDAnalytics.aar`、`TDCore.aar` to libs
- Add code to `build.gradle` of `Module`
```plaintext
dependencies {
    ...
    implementation fileTree(dir: 'libs', include: ['*.aar'])
}
```

## **3. Enable Native Support**
When initializing the SDK, add **enableNative: true** to enable Native support
```javascript
// SDK config object
var config = {
   appId: "YOUR_APPID", // APP ID
   serverUrl: "YOUR_SERVER_URL", // server URL
   enableNative: true// enable call Native code
};

TDAnalytics.init(config);
```
