---
code: cocos2d-x_sdk_installation
name: "Cocos2d-x"
wikiToken: D4l8wlZzuifeHUkWUXbcnUuYnM6
parentWikiToken: FgrswqlHEiE45HkQve4cU0NFnbd
updateTime: 1774251978000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocos2d-x_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
Supports platforms : Android, iOS, Windows, MacOS . and the size is about 6.8 M
 :::
**Latest version: **v2.0.4
**Update time:** 02/04, 2025
**Resource download: **[SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FCocos2d-x%2Fta_cocos2dx_sdk_v2.0.4.zip), [Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcocos2dx-sdk%2Ftags) 
::: warning Notice 
The current documentation applies to v2.0.0 and later versions. For historical versions, please refer to the [Data Ingestion Guide - Cocos2d-x (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fgame_engine_sdk_installation%2Fcocos2d-x_sdk_installation%2Fcocos2d-x_sdk_installation.html), [SDK Download (v1.3.5)](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FCocos2d-x%2Fta_cocos2dx_sdk_v1.3.5.zip). 
:::
## **1. ****SDK**** Integration**
1. Download and unzip the [Cocos2d-x SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_cocos2dx_sdk.zip) Source Code,  Add `ThinkingAnalytics` files into your project `Classes` folder
2. Add the following configuration to `CMakeLists.txt`
```cpp
list(APPEND GAME_SOURCE
     Classes/ThinkingAnalytics/Common/TDJSONObject.cpp
     )
list(APPEND GAME_HEADER
     Classes/ThinkingAnalytics/Common/TDJSONObject.h
     Classes/ThinkingAnalytics/Common/TDAnalytics.h
     )
if(ANDROID)
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Android/TDAnalytics.cpp
         )
elseif(WINDOWS)
    list(APPEND GAME_HEADER
         Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
         )
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
         )
elseif(MACOSX)
        list(APPEND GAME_HEADER
            Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
            )
        list(APPEND GAME_SOURCE
            Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
            ）
```

3. Configuration for Android 
- Add the `libs` folder to your project directory in `proj.android`, and add **TDAnalytics.aar**、**TDCore.aar**、**TDThirdparty.aar** into the `libs` folder
- Add the following configuration to `build.gradle` in your project directory in `proj.android`
```cpp
dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar','*.aar'])
}
```

<image token="CDPnbOv4moAvFmxBZWncuUM3nxe" width="1544" height="860" align="center"/>

4. Configuration for iOS 
Compile the iOS project using the ios.toolchain.cmake tool.
- Add iOS-related configurations to CMakeLists.txt
```typescript
list(APPEND GAME_SOURCE
     Classes/ThinkingAnalytics/Common/TDJSONObject.cpp
     )
list(APPEND GAME_HEADER
     Classes/ThinkingAnalytics/Common/TDJSONObject.h
     Classes/ThinkingAnalytics/Common/TDAnalytics.h
     )
if(ANDROID)
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Android/TDAnalytics.cpp
         )
elseif(WINDOWS)
    list(APPEND GAME_HEADER
         Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
         )
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
         )
elseif(IOS)
    //iOS configuration
    list(APPEND GAME_HEADER
         Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.h
         )
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/iOS/TDAnalytics.mm
         Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.m
         )    
elseif(MACOSX)
    list(APPEND GAME_HEADER
        Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
        )
    list(APPEND GAME_SOURCE
        Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
        )
        
if(IOS)
    //iOS configuration
    set(CMAKE_EXE_LINKER_FLAGS -ObjC)
endif()       
```

- Open the iOS project in Xcode, and drag and drop the `ThinkingSDK.framework` and `TAThirdParty.framework` files from the iOS folder under ThinkingAnalytics into the Classes/ThinkingAnalytics/iOS directory of your Xcode project, as shown in the image below.
<image token="XloUbOXwwopBzvxm8BxcORponmb" width="1280" height="605" align="center"/>

- Configuration complete. If your version is lower than 2.0.2, you need to manually modify the header file of Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.m to include it.
```typescript
#import "ThinkingAnalyticsSDK.h"
//Change to the following
#import <ThinkingSDK/ThinkingSDK.h>
```

Open the Xcode project  in proj.ios_mac
- Open the iOS project in Xcode, and drag and drop the Common and iOS folders from the ThinkingAnalytics folder into the Classes directory of your Xcode project, as shown in the image below.
<image token="QgHubSgALogac5xRUnNcsIhqnQf" width="1280" height="612" align="center"/>

- Add -ObjC in Build Settings -> Other Linker Flags
<image token="W0pVbOS17ocss5xbwZTcdL0nnbg" width="1075" height="368" align="center"/>

- Add in Build Setting - Framework Search Paths "$(SRCROOT)/../Classes/ThinkingAnalytics/iOS"
<image token="Sy9lbem73onzWLxDsg2cQoM2npd" width="1280" height="901" align="center"/>

- Build Phases - Link Binary With Libraries
WebKit.framework, GameController.framework, MediaPlayer.framework
<image token="M3g7bhvBvo10tIxBoFUcs5tQnCg" width="1280" height="901" align="center"/>

- Configuration complete. If your version is lower than 2.0.2, you need to manually modify the header file of Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.m to include it.
```typescript
#import "ThinkingAnalyticsSDK.h"
//Change to the following
#import <ThinkingSDK/ThinkingSDK.h>
```

## **2. Initialization**
```cpp
#include "./ThinkingAnalytics/Common/TDAnalytics.h"
using namespace thinkingdata::analytics;
//Initialize SDK in the main thread 
//Method 1
TDAnalytics::init(TE_APP_ID, TE_SERVER_URL);
//Method 2
TDConfig config(TE_APP_ID, TE_SERVER_URL);
TDAnalytics::init(config);
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
  - If you use the private deployment version, you can customize the data tracking URL .
<quote-container>
Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol only.
</quote-container>

## **3. Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or used the APP with a new device.
### **3.1 Login**
When the users log in , `Login` could be called to set the account ID of the user. TE would use the account ID as the identification ID, and this ID would be saved before `Logout` is called. The previous account ID would be replaced if `Login` has been called multiple times.
```cpp
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics::login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super Properties refer to properties that each event might have. You can call `setSuperProperties` to set Super Properties. It is recommended that you set Super Properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as Super Properties.
```cpp
TDJSONObject superProperties;
superProperties.setString("channel", "TE");//string
superProperties.setNumber("age",1);//number
superProperties.setBool("isSuccess",true);//boolean
superProperties.setDateTime("birthday","2020-01-02 10:52:52.290");//time

TDJSONObject object;
object.setString("key", "value");
superProperties.setJsonObject("object", object);// object

TDJSONObject object1;
object1.setString("key", "value");
vector<TDJSONObject> arr;  
arr.push_back(object1);
superProperties.setList("object_arr", arr); // array object

vector<string> arr1;
arr1.push_back("value");
superProperties.setList("arr",arr1);//array

TDAnalytics::setSuperProperties(superProperties);
```

Super Properties would be saved in local storage, and will not need to be called every time the App is opened. If the Super Properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- The event property is of type `TDJSONObject`.
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for Super Properties**
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of tracking installation, open_app and close_app events. To get more information about the automatic tracking of SDK, please refer to the [Detailed introduction of automatic tracking function](https://thinkingdata.feishu.cn/wiki/GC8pwAeGLiW2vlkR44WcNoJfnId)
```cpp
TDAnalytics::enableAutoTrack();
```

### **3.4 Sending Events**
You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```cpp
TDJSONObject eventProperties;
eventProperties.setString("product_name", "product name");
TDAnalytics::track("product_buy",eventProperties);
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `userSet` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```cpp
//the username now is TA
TDJSONObject properties;
properties.setString("username", "TA");
TDAnalytics::userSet(properties);
//the username now is TE
TDJSONObject newProperties;
newProperties.setString("username", "TE");
TDAnalytics::userSet(newProperties);
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```cpp
#include "./ThinkingAnalytics/Common/TDAnalytics.h"
using namespace thinkingdata::analytics;
if (privacy policy is authorized) {
      TDAnalytics::init(TE_APP_ID, TE_SERVER_URL);
      //if the user has logged in, the account ID of the user could be set as the unique identifier 
      TDAnalytics::login("TE");
      
      
      //After setting super properties, each event would have super properties
      TDJSONObject superProperties;
      superProperties.setString("channel", "TE");//string
      superProperties.setNumber("age",1);//number
      superProperties.setBool("isSuccess",true);//boolean
      superProperties.setDateTime("birthday","2020-01-02 10:52:52.290");//time

      TDJSONObject object;
      object.setString("key", "value");
      superProperties.setJsonObject("object", object);// object

      TDJSONObject object1;
      object1.setString("key", "value");
      vector<TDJSONObject> arr;  
      arr.push_back(object1);
      superProperties.setList("object_arr", arr); // array object

      vector<string> arr1;
      arr1.push_back("value");
      superProperties.setList("arr",arr1);//array 
      //set super properties
      TDAnalytics::setSuperProperties(superProperties);
      
      //Enable auto-tracking
      TDAnalytics::enableAutoTrack();
      
      //upload events
      TDJSONObject eventProperties;
      eventProperties.setString("product_name", "product name");
      TDAnalytics::track("product_buy",eventProperties);
      
      //Set user properties
      TDJSONObject userProperties;
      userProperties.setString("username", "TE");
      TDAnalytics::userSet(userProperties);
}
```
