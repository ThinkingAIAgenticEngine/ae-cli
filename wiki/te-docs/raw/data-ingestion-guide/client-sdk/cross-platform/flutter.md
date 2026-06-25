---
code: flutter_sdk_installation
name: "Flutter"
wikiToken: OzW1wBUwbiX7D5k8ZaSc6Uy0ndh
parentWikiToken: JRIIwKqb5iVJMAkCwTic7H17ncg
updateTime: 1774251995000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=flutter_sdk_installation
---
::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
 :::
**Latest version:** 3.3.1
**Update time:**  11/10/2025
**Resource download: **[SDK](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fflutter-sdk%2Ftags)
## **1. ****SDK**** Integration**
Add thinking_analytics dependencies to your `pubspec.yaml` file for your Flutter project:
```yaml
dependencies:
  thinking_analytics: ^3.3.1
```

## **2. Initialization**
The ThinkingData SDK needs to be initialized after the user agrees to the Privacy Policy

<callout emoji="musical_score" background-color="light-orange" border-color="light-orange">
Versions 3.3.0 and later do not need to add await
</callout>

```dart
import 'package:thinking_analytics/thinking_analytics.dart';
if (authorized)
{
   //init
   await TDAnalytics.init(APPID, SERVER_URL);
}
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of the TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page

<image token="EvjEbQjETodTuLxuDl7c4KXsnFd" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .

<quote-container>
Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol only.
</quote-container>

## **3. Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the APP or use the APP with a new device.
### **3.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```dart
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TA");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super Properties refer to properties that each event might have. You can call `setSuperProperties` to set Super Properties. It is recommended that you set Super Properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as Super Properties.
```dart
TDAnalytics.setSuperProperties({
  "channel": "ta",//character string
  "age": 1,//number
  "isSuccess": true,//boolean
  "birthday": DateTime.now(),//time
  "object": {"key": "value"},//object
  "object_arr": [{"key": "value"}],//array object
  "arr": ["value"]//array
});
```

Super Properties would be saved in local storage, and will not need to be called every time the App is opened. If the Super Properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array

<quote-container>
**The requirements for event properties and user properties are the same with that for super properties**
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of install, active and inactive events. To get more information about the automatic tracking of SDK, please refer to [Detailed introduction of automatic tracking function](https://thinkingdata.feishu.cn/wiki/V2adwX3TziCBZzkaDUkcbBw6nJf)
```dart
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START |
    TDAutoTrackEventType.APP_END |
    TDAutoTrackEventType.APP_INSTALL |
    TDAutoTrackEventType.APP_CRASH);
```

### **3.4 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```dart
TDAnalytics.track('product_buy', properties: <String, dynamic>{'product_name': 'tv'});
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this API. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```dart
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TA'});  //the username now is TA
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TE'});  //the username now is TE
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```dart
import 'package:thinking_analytics/thinking_analytics.dart';
if (authorized)
{
   //SDK init
   await TDAnalytics.init('APP_ID', 'https://SERVER_URL');
   //if the user has logged in, the account ID of the user could be set as the unique identifier 
   TDAnalytics.login('TA');
   //After setting super properties, each event would have super properties
   TDAnalytics.setSuperProperties({
     "channel": "ta",//string
     "age": 1,//number
     "isSuccess": true,//boolean
     "birthday": DateTime.now(),//time
     "object": {"key": "value"},//object
     "object_arr": [{"key": "value"}],//array object
     "arr": ["value"]//array
    });
   //Enable auto-tracking
   TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START |
    TDAutoTrackEventType.APP_END |
    TDAutoTrackEventType.APP_INSTALL |
    TDAutoTrackEventType.APP_CRASH);
   //upload events
   TDAnalytics.track('product_buy', properties: <String, dynamic>{'product_name': 'productName'});
   //Set user properties
   TDAnalytics.userSet(<String, dynamic>{'user_name': 'TE'});
}
```
