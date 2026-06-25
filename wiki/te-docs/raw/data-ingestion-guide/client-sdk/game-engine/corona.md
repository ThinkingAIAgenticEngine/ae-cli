---
code: corona_sdk_installation
name: "Corona"
wikiToken: QjOXwKuZFiw4JLk477Fcuzmnnnb
parentWikiToken: FgrswqlHEiE45HkQve4cU0NFnbd
updateTime: 1774251985000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=corona_sdk_installation
---

::: tip
Before you begin, please read [Preparations before Data Ingestion](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
Corona SDK supports iOS, Android
The size of Corona SDK (aar format) is around 0.5 MB
 :::
**Latest version:** v2.0.1
**Update time:** November 24, 2023
**Resource download: **[SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Frelease%2Fta_corona_sdk.zip), [Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcorona-sdk%2Ftags)
::: warning Notice 
The current documentation applies to v2.0.0 and later versions. For historical versions, please refer to the [Data Ingestion Guide - Corona (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fgame_engine_sdk_installation%2Fcorona_sdk_installation%2Fcorona_sdk_installation.html), [SDK Download (v1.0.1)](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FCorona%2Fta_corona_sdk_v1.0.1.zip). 
:::
## **1. ****SDK**** Integration**
- **Corona Setting**
  - Download and unzip [Corona SDK](https://download.thinkingdata.cn/client/release/ta_corona_sdk.zip), and copy `TDAnalytics.lua` to Corona
- **Android Setting**
  - Copy `android/ThinkingPluginProxy.java` to `android/plugin/src/main/java/plugin/library`
  - Open Android project file with Android Studio, then switch to Android Mode. Add dependencies in `build.gradle` and click `Sync Now` to update it
```bash
dependencies {
    implementation 'cn.thinkingdata.android:ThinkingAnalyticsSDK:3.0.0'
}
```

<image token="IAW9b4t1yoS1zlxkTVmcx5TVnwg" width="1278" height="997" align="center"/>

- Add code to `plugin.library.LuaLoader` like this
::: tip
If you don't add any code in `plugin.library.LuaLoader`, you can copy `android/LuaLoader.java` to `android/plugin/src/main/java/plugin/library` to replace the original file
:::
```java
public int invoke(LuaState L) {
   NamedJavaFunction[] luaFunctions = new NamedJavaFunction[] {
      ...
      // TDAnalytics: add code
      new ThinkingBridgingWrapper(),
      ...
   };
   String libName = L.toString( 1 );
   L.register(libName, luaFunctions);
   return 1;
}

public void dispatchEvent(final String message) {
   CoronaEnvironment.getCoronaActivity().getRuntimeTaskDispatcher().send( new CoronaRuntimeTask() {
      @Override
      public void executeUsing(CoronaRuntime runtime) {

         LuaState L = runtime.getLuaState();
         CoronaLua.newEvent( L, EVENT_NAME );
         
         ...
         // TDAnalytics: add code
         JSONObject jsonObject = null;
         String newMessage = null;
         String type = null;
         try {
            jsonObject = new JSONObject(message);
            newMessage = jsonObject.optString("message");
            type = jsonObject.optString("type");
         } catch (Exception ignored) {
         }

         if (!TextUtils.isEmpty(newMessage) && !TextUtils.isEmpty(type)) {
            L.pushString(newMessage);
            L.setField(-2, "message");
            L.pushString(type);
            L.setField(-2, "type");
         } else  {
            L.pushString(message);
            L.setField(-2, "message");
         }
         ...
         
         try {
            CoronaLua.dispatchEvent( L, fListener, 0 );
         } catch (Exception ignored) {
         }
      }
   } );
}

...
// TDAnalytics: add code
@SuppressWarnings({"WeakerAccess", "SameReturnValue"})
public int thinkingBridging(LuaState L) {
   CoronaActivity activity = CoronaEnvironment.getCoronaActivity();
   if (activity == null) {
      return 0;
   }

   String word = L.checkString( 1 );
   JSONObject params = null;
   try {
      params = new JSONObject(word);
   } catch (JSONException e) {
      params = new JSONObject();
   }
   String method = params.optString("method");
   if (method.length() > 0) {
      try {
         Class aClass = Class.forName("plugin.library.ThinkingPluginProxy");
         Method aMethod = aClass.getDeclaredMethod(method, JSONObject.class);
         JSONObject jsonObject = (JSONObject) aMethod.invoke(aClass, params);
         if (jsonObject != null && jsonObject.getClass() == JSONObject.class && jsonObject.has("message")) {
            (new Thread() {
               @Override
               public void run() {
                  dispatchEvent(jsonObject.toString());
               }
            }).start();
         }
      } catch (Exception e) {
         e.printStackTrace();
      }
   }
   return 0;
}
...

...
// TDAnalytics: add code
@SuppressWarnings("unused")
private class ThinkingBridgingWrapper implements NamedJavaFunction {
   @Override
   public String getName() {
      return "thinkingBridging";
   }
   
   @Override
   public int invoke(LuaState L) {
      return thinkingBridging(L);
   }
}
...
```


- **iOS**** Setting**
  - Open iOS project with Xcode, add files in `ios/ThinkingAnalyticsSDK` to directory named App
<image token="MUGMb5urConcL4xWQexcfXHwnSf" width="1278" height="994" align="left"/>

- Enable ARC support, select **TARGETS** -> **App** -> **Build Settings** -> **Objective-C Automatic Reference Counting**, and set it to **YES**
<image token="Ov9gbxSQpoLPcOxiMCFcFOrtnQc" width="2556" height="1988" align="center"/>

- Disable ARC for **ThinkingPluginLibrary.mm**, select **TARGETS** -> **App** -> **Build Phases** -> **Compile Sources** -> **ThinkingPluginLibrary.mm**, and add **-fno-objc-arc**
<image token="Tkp7bK8MnoDVfKxNZcucEYnHnMc" width="2556" height="1988" align="center"/>

## **2. Initialization**
```lua
-- import TDAnalytics
local TDAnalytics = require("TDAnalytics")

-- initialize TDAnalytics
local params = {
    appId = "YOUR_APP_ID",
    serverUrl = "YOUR_SERVER_URL"
}
TDAnalytics.init(params)
```

<quote-container>
Note: Since some devices restrict HTTP requests by default, please use HTTPS protocol only.
</quote-container>

## **3. Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common functions; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **3.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE platform would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```lua
-- The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TE")
```

<quote-container>
Note: Login events wouldn't be uploaded in this method.
</quote-container>

### **3.2 Super Properties**
Super properties refer to properties that each event might have. You can call `setSuperProperties` to set super properties. It is recommended that you set super properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as super properties.
```lua
-- set super properties
TDAnalytics.setSuperProperties({
    channel = "App Store",
    trip = {"Car", "Train"}
})
```

Super properties would be saved in local storage, and will not need to be called every time the App is opened. If the super properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
Note: The requirements for event properties and user properties are the same with that for super properties
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of tracking installation, open_app and close_app events. To get more information about the automatic tracking of SDK, please refer to [Automatic Event Tracking](https://thinkingdata.feishu.cn/wiki/QsdxwfT04iDDK8kNLAEc6z5YnRb)
```lua
-- enable auto-tracking
-- appInstall=enable auto-track APP installation
-- appStart=enable auto-track open APP
-- appEnd=enable auto-track close APP
local params = {
    appId = "YOUR_APP_ID",
    serverUrl = "YOUR_SERVER_URL",
    autoTrack = {
        "appStart", "appEnd", "appInstall"
    }
}
TDAnalytics.init( params )
```

### **3.4 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```lua
TDAnalytics.track("product_buy", {product_name="product name"});
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```lua
-- set user properties
TDAnalytics.userSet({user_name = "TE"})
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```lua
-- import ThinkingAnalyticsAPI
local TDAnalytics = require("TDAnalytics")

if (privacy policy is authorized) {
    -- initialize SDK
    local params = {
        appId = "YOUR_APP_ID",
        serverUrl = "YOUR_SERVER_URL"
    }
    TDAnalytics.init(params)
    
    -- if the user has logged in, the account ID of the user could be set as the unique identifier 
    TDAnalytics.login("TE")
    
    -- After setting super properties, each event would have super properties
    local superProperties = {}
    superProperties["channel"] = "TE" -- string
    superProperties["age"] = 1 -- number
    superProperties["isSuccess"] = true -- boolean
    superProperties["birthday"] = os.date("%Y-%m-%d %H:%M:%S") -- time
    superProperties["object"] = { key="value" } -- object
    superProperties["object_arr"] = { { key="value" } } -- array object
    superProperties["arr"] = { "value" } -- array
    TDAnalytics.setSuperProperties(superProperties) -- set super properties
    
    -- track event
    TDAnalytics.track("product_buy", {product_name="product name"});
    
    -- set user properties
    TDAnalytics.userSet({user_name = "TE"})
}
```
