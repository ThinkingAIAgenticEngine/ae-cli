---
code: android_sdk_installation
name: "Android"
wikiToken: Sis2weaL2iJOOWklkX1cZAtcnVc
parentWikiToken: KaFCwNeV3iRxjNkpT3QcDMg3n5V
updateTime: 1780396559000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=android_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FQHT3wUuKGiO3xCka3WTchxiinMn)
The lowest system version required by Android SDK is Android 4.0 (API 14)
The size of Android SDK (aar format) is around 200 KB
 :::
**Latest version:** 3.4.2
**Update time: 0****5****/****26****/2026**
**Resource download: **[**AAR**](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FAndroid%2Fta_android_sdk_v3.4.2.zip)**,**[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fandroid-sdk%2Ftags)
::: warning
The current document is applicable to v3.0.0 and later versions. Please refer to historical versions. [Android Access Guide (V2)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fandroid_sdk_installation%2Fandroid_sdk_installation.html)，[SDK download (V2)](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FAndroid%2Fta_android_sdk_v2.8.6.zip)
::: 
## **1. SDK Integration**
### **1.1 Automatic Integration**
- Find `build.gradle` file under the Project, declare the `mavenCentral` repository:
```plaintext
buildscript {
    repositories {
        mavenCentral()
    }
}
```

- Find `build.gradle` file under the application , add the latest Android SDK package:
```plaintext
dependencies {
    implementation 'cn.thinkingdata.android:ThinkingAnalyticsSDK:3.4.2'
}
```

### **1.2 Manual Integration**
1. Download and unzip [Android SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FAndroid%2Fta_android_sdk_v3.4.2.zip)
2. Add ThinkingSDK.aar into a libs file folder
<grid cols="2">
  <column width="46">
    <image token="Cr0sbNN9IoIETFxG5nAczezBnjg" width="1532" height="1298" align="center"/>

  </column>
  <column width="53">
    <image token="VtffbNtqkoffgExG1bCcmysqnJf" width="2476" height="1830" align="center"/>

  </column>
</grid>

3. Add the following configuration should be added into build.gradle
```java
dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar','*.aar'])
}
```

## **2. Initialization**
```java
//Initialize SDK in the main thread 
//Method 1
TDAnalytics.init(this, APPID, SERVER_URL);
//Method 2
TDConfig config = TDConfig.getInstance(this, APPID, TE_SERVER_URL);
TDAnalytics.init(config);
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="Cr21buNzDoZaolxaNjKcRjdknvg" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
<quote-container>
Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol only.
</quote-container>

## **3. Common Features**
We suggested that you read [User Identification Rules](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FORyZwNANpi12XBkyGgUccSy0ntb) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **3.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE platform would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```java
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TA");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super properties refer to properties that each event might have. You can call `setSuperProperties` to set super properties. It is recommended that you set super properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as super properties.
```java
try {
    JSONObject superProperties = new JSONObject();
    superProperties.put("channel","ta");//string
    superProperties.put("age",1);//number
    superProperties.put("isSuccess",true);//boolean
    superProperties.put("birthday",new Date());//time

    JSONObject object = new JSONObject();
    object.put("key", "value");
    superProperties.put("object",object);//object
    
    JSONObject object1 = new JSONObject();
    object1.put("key", "value");
    JSONArray  arr    = new JSONArray();
    arr.put(object1);
    superProperties.put("object_arr",arr);//array object
    
    JSONArray  arr1    = new JSONArray();
    arr1.put("value");
    superProperties.put(arr1);//array
    //set super properties
    TDAnalytics.setSuperProperties(superProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

Super properties would be saved in local storage, and will not need to be called every time the App is opened. If the super properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for super properties**
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of tracking installation, open_app and close_app events. To get more information about the automatic tracking of SDK, please refer to the [Detailed introduction of automatic tracking function](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FYd9xwEAngihRscktwwOcVbronmc)
```java
//TDAnalytics.TDAutoTrackEventType.APP_INSTALL  APP start event
//TDAnalytics.TDAutoTrackEventType.APP_START APP install event
//TDAnalytics.TDAutoTrackEventType.APP_END  APP end event

//enable autotrack event
TDAnalytics.enableAutoTrack(TDAnalytics.TDAutoTrackEventType.APP_START | TDAnalytics.TDAutoTrackEventType.APP_END
        | TDAnalytics.TDAutoTrackEventType.APP_INSTALL);
```

### **3.4 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```java
try {
    JSONObject properties = new JSONObject();
    properties.put("product_name","product name");
    TDAnalytics.track("product_buy", properties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```java
try {
    //the username now is TA
    JSONObject properties = new JSONObject();
    properties.put("username","TA");
    TDAnalytics.userSet(properties);
    //the userName now is TE
    JSONObject newProperties = new JSONObject();
    newProperties.put("username","TE");
    TDAnalytics.userSet(properties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```java
if (privacy policy is authorized) {
    TDAnalytics.init(this, APPID, SERVER_URL);
    //if the user has logged in, the account ID of the user could be set as the unique identifier 
    TDAnalytics.login("TA");
    //After setting super properties, each event would have super properties
    try {
        JSONObject superProperties = new JSONObject();
        superProperties.put("channel","te");//string
        superProperties.put("age",1);//number
        superProperties.put("isSuccess",true);//boolean
        superProperties.put("birthday",new Date());//time
        
        JSONObject object = new JSONObject();
        object.put("key", "value");
        superProperties.put("object",object);//object
        
        JSONObject object1 = new JSONObject();
        object1.put("key", "value");
        JSONArray  arr    = new JSONArray();
        arr.put(object1);
        superProperties.put("object_arr",arr);//array object
        
        JSONArray  arr1    = new JSONArray();
        arr1.put("value");
        superProperties.put(arr1);//array
        //set super properties
        TDAnalytics.setSuperProperties(superProperties);
    } catch (JSONException e) {
        e.printStackTrace();
    }

    //Enable auto-tracking
    TDAnalytics.enableAutoTrack(TDAnalytics.TDAutoTrackEventType.APP_START | TDAnalytics.TDAutoTrackEventType.APP_END
        | TDAnalytics.TDAutoTrackEventType.APP_INSTALL);
  
    //upload events
    try {
        JSONObject properties = new JSONObject();
        properties.put("product_name","product name");
        TDAnalytics.track("product_buy", properties);
    } catch (JSONException e) {
        e.printStackTrace();
    }
    //Set user properties
    try {
        JSONObject userProperties = new JSONObject();
        userProperties.put("username","TE");
        TDAnalytics.userSet(userProperties);
    } catch (JSONException e) {
         e.printStackTrace();
    }
}
```
