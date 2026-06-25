---
code: unreal_sdk_installation
name: "Unreal"
wikiToken: Tjh7wx7FYinevfkG0mwcLxsSnea
parentWikiToken: FgrswqlHEiE45HkQve4cU0NFnbd
updateTime: 1774251975000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unreal_sdk_installation
---

::: tip
Before  you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)<text color="purple" underline="true">.</text>
TE Unreal  SDK supports Unreal Engine's built-in TE service and also supports reporting data directly through the C++  API.
Supports platforms : Android, iOS, Windows, MacOS .
 :::
**Latest version:** v3.0.3
**Update time:** October 11, 2025
**Resource download: **[SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FUnreal%2Fta_unreal_sdk_v3.0.3.zip)、[Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Funreal-sdk%2Ftags)
::: warning Notice 
The current documentation applies to v2.0.0 and later versions. For historical versions, please refer to the [Data Ingestion Guide - Unreal (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fclient_sdk%2Fgame_engine_sdk_installation%2Funreal_sdk_installation%2Funreal_sdk_installation.html), [SDK Download (v1.6.0)](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FUnreal%2Fta_unreal_sdk_v1.6.0.zip). 
:::
## **1. ****SDK**** Integration**
### **1.1 ****Integrate ThinkingAnalytics Plugin**
Download the [Unreal SDK](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2FUnreal%2Fta_unreal_sdk_v3.0.3.zip), unzip it and add `TDAnalytics` into the `Plugins` directory of your project; if the `Plugins` directory does not exist, first create a Plugins directory under the project root directory, and then put the `TDAnalytics` directory into it.

### **1.2 ****Activate**** ThinkingAnalytics ****Plugin**
In order to enable the ThinkingAnalytics plugin, you need to perform the following steps:
- Restart Unreal Editor
- Open Edit > Plugins, under the Project `Analytics` category, enable `TDAnalytics`
- If you use Blueprint, enable the `Analytics` Blueprint Library under the Built-in Analytics category
- Restart Unreal Editor again
- Open `Edit>Project` Settings, under the Plugins category, set the ThinkingAnalytics parameters:
  - Server Url: Required receiver URL , need to use https type address
  - App ID: Required APP ID of your project can be viewed on the TE background project management page
  - TimeZone: Optional, if you need to align the time zone, please fill in the canonical TimeZone ID, such as "Asia/Shanghai", "UTC". If you do not need to align the time zone, you do not need to fill in
  - Enable Encrypt: enable data encryption. The default is false. After enabling, the data will be encrypted and uploaded to TE
  - EncryptPublicKey:  Optional, if not filled, the default configuration will be used to encrypt the public key
  - EncryptVersion: Optional, if not filled, the default configuration will be used, the key version
  - SymmetricEncryption: Optional, if not filled, the default configuration will be used, symmetric key
  - AsymmetricEncryption: Optional, if not filled, the default configuration will be used, asymmetric key
<quote-container>
 Note: Windows/MacOS does not currently support time zone alignment.
</quote-container>


- Add the following to the `DefaultEngine.ini `file in the `Config` directory:
```cpp
[Analytics]
ProviderModuleName=TDAnalytics
```

- If you want to use the `TDAnalytics` API directly in your C++ code, you need to add the following to your project's` *.Build.cs `file:
```cpp
PrivateDependencyModuleNames.AddRange(new string[] { "TDAnalytics" });
PrivateIncludePathModuleNames.AddRange(new string[] { "TDAnalytics" });
```

Also, reference the `TDAnalytics.h` header file in the files you wish to use the SDK with:
```cpp
#include "TDAnalytics.h"
```

## **2. Initialization**
```cpp
UTDAnalytics::Initialize();
```

## **3. Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the App or used the APP with a new device.
### **3.1 Login**
When the users log in , `Login` could be called to set the account ID of the user. TE would use the account ID as the identification ID, and this ID would be saved before `Logout` is called. The previous account ID would be replaced if `Login` has been called multiple times.
```cpp
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
UTDAnalytics::Login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super Properties refer to properties that each event might have. You can call `SetSuperProperties` to set Super Properties. It is recommended that you set Super Properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as Super Properties.
```cpp
    TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
    Properties->SetStringField("channel", "TE");//string
    Properties->SetNumberField("age", 1);//number
    Properties->SetBoolField("isSuccess", true);//boolean
    FDateTime DateTime = FDateTime::Now();
    Properties->SetStringField("birthday", FDateTime::FromUnixTimestamp(DateTime.ToUnixTimestamp()).ToString(TEXT("%Y-%m-%d %H:%M:%S.")) += *FString::Printf(TEXT("%03d"), DateTime.GetMillisecond()));//time

    TSharedPtr<FJsonObject> ItemProperties = MakeShareable(new FJsonObject);
    ItemProperties->SetStringField("itemChannel", "item");
    Properties->SetObjectField("object", ItemProperties);//object

    TArray< TSharedPtr<FJsonValue> > DataObjectArray;
    TSharedPtr<FJsonObject> ArrayItemProperties = MakeShareable(new FJsonObject);
    ArrayItemProperties->SetStringField("arrayItemChannel", "array_item");
    TSharedPtr<FJsonValueObject> DataObjectValue = MakeShareable(new FJsonValueObject(ArrayItemProperties));
    DataObjectArray.Add(DataObjectValue);
    Properties->SetArrayField("object_arr", DataObjectArray);//array object

    TArray< TSharedPtr<FJsonValue> > DataArray;
    TSharedPtr<FJsonValueString> DataValue = MakeShareable(new FJsonValueString("data_value"));
    DataArray.Add(DataValue);
    Properties->SetArrayField("arr", DataArray);//array 

    UTDAnalytics::SetSuperProperties(Properties, AppID);
```

- Super Properties will be saved in local storage, and will not need to be called every time the App is opened. If the Super Properties set previously are uploaded after calling `SetSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
- **The requirements for event properties and user properties are the same with that for Super Properties**
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of tracking installation, open_app and close_app events. To get more information about the automatic tracking of SDK, please refer to the [Detailed introduction of automatic tracking function](https://thinkingdata.feishu.cn/wiki/D7ykw75weigcIfk3ZoichHbKnuv)
```cpp
UTDAnalytics::EnableAutoTrack();
```

### **3.4 Sending Events**
You can call `Tack` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```cpp
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("product_name", "product name");
UTDAnalytics::Track("product_buy", Properties);
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `UserSet` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```cpp
 //the username now is TA
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("username", "TA");
UTDAnalytics::UserSet(Properties);
//the username now is TE
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetStringField("username", "TE");
UTDAnalytics::UserSet(NewProperties);
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```cpp
#include "TDAnalytics.h"
if (privacy policy is authorized) {
   
   UTDAnalytics::Initialize();
   
   //if the user has logged in, the account ID of the user could be set as the unique identifier 
   UTDAnalytics::Login("TE");
   
    //After setting Super Properties, each event would have Super Properties
   TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
   Properties->SetStringField("channel", "TE");//string
   Properties->SetNumberField("age", 1);//number
   Properties->SetBoolField("isSuccess", true);//boolean
   FDateTime DateTime = FDateTime::Now();
   Properties->SetStringField("birthday", FDateTime::FromUnixTimestamp(DateTime.ToUnixTimestamp()).ToString(TEXT("%Y-%m-%d %H:%M:%S.")) += *FString::Printf(TEXT("%03d"), DateTime.GetMillisecond()));//time

   TSharedPtr<FJsonObject> ItemProperties = MakeShareable(new FJsonObject);
   ItemProperties->SetStringField("itemChannel", "item");
   Properties->SetObjectField("object", ItemProperties);//object

   TArray< TSharedPtr<FJsonValue> > DataObjectArray;
   TSharedPtr<FJsonObject> ArrayItemProperties = MakeShareable(new FJsonObject);
   ArrayItemProperties->SetStringField("arrayItemChannel", "array_item");
   TSharedPtr<FJsonValueObject> DataObjectValue = MakeShareable(new FJsonValueObject(ArrayItemProperties));
   DataObjectArray.Add(DataObjectValue);
   Properties->SetArrayField("object_arr", DataObjectArray);//array object

   TArray< TSharedPtr<FJsonValue> > DataArray;
   TSharedPtr<FJsonValueString> DataValue = MakeShareable(new FJsonValueString("data_value"));
   DataArray.Add(DataValue);
   Properties->SetArrayField("arr", DataArray);//array
   UTDAnalytics::SetSuperProperties(Properties, AppID);
   //Enable auto-tracking
   UTDAnalytics::EnableAutoTrack();
   //upload events
   TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
   Properties->SetStringField("product_name", "product name");
   UTDAnalytics::Track("product_buy", Properties);
   //Set user properties
   TSharedPtr<FJsonObject> UserProperties = MakeShareable(new FJsonObject);
   UserProperties->SetStringField("username", "TE");
   UTDAnalytics::UserSet(Proper);
}
```
