---
code: rn_sdk_support
name: "React Native"
wikiToken: E1F3wNsc3iW7dckzhH9cA2h2nIg
parentWikiToken: JRIIwKqb5iVJMAkCwTic7H17ncg
updateTime: 1778726153000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=rn_sdk_support
---
::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe)
 :::
**Latest version:** 3.2.1
**Update time:** 05/14/2026
**Resource download: **[**SDK**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Freact-native-sdk.git)
## **1. ****SDK**** Integration**
### **1.1 Automatic Integration**
#### npm install the react-native-thinking-data module
```json
"dependencies": {    
    "react-native-thinking-data": "3.2.1"
}
```

## **2. Initialization**
```javascript
import TDAnalytics,{TDAutoTrackEventType} from "react-native-thinking-data";
TDAnalytics.init({ appId: "xxx",serverUrl: "https://xxx"});
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of the TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="H0jHb0iMvok3Cmx034dcwZtHnYb" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
<quote-container>
Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol only.
</quote-container>

## **3. Common Features**
We suggested that you read [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before using common features; SDK would generate a random number that would be used as the distinct ID, and save the ID locally. Before the user logs in, the distinct ID would be used as the identification ID.   Note: The distinct ID would change after the user reinstalled the APP or used the APP with a new device.
### **3.1 Login**
When the users log in , `login` could be called to set the account ID of the user. TE would use the account ID as the identification ID, and this ID would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```java
TDAnalytics.login("TA")
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### 3.2 **Super Properties**
Super Properties refer to properties that each event might have. You can call `setSuperProperties` to set Super Properties. It is recommended that you set Super Properties first before sending data. Some important properties (e.g., the membership class of users, source channels, etc.) should be set in each event. At this time, you can set these properties as Super Properties.
```javascript
TDAnalytics.setSuperProperties({
    'channel': 'te',//string
    'age': 1,//number
    'isSuccess': true,//boolean
    'birthday': new Date(),//time
    'object': {
      'key': 'value'
    },//object
    'object_arr': [
      { 'key': 'value' }
    ],//array object
    'arr': ['value']//array
})
```

Super Properties would be saved in local storage, and will not need to be called every time the App is opened. If the Super Properties set previously are uploaded after calling `setSuperProperties`, previous properties would be replaced. 
- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same with that for super properties**
</quote-container>

### **3.3 Automatically Track Events**
The following code is an example of install, active and inactive events. To get more information about the automatic tracking of SDK, please refer to [Detailed introduction of automatic tracking function](https://thinkingdata.feishu.cn/wiki/EVwUwiZdYi3jhEkcAhHcNxSrnkd)
```javascript
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_CRASH | TDAutoTrackEventType.APP_INSTALL)
```

### **3.4 Sending Events**
You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```javascript
TDAnalytics.track({
    eventName:"product_buy",
    properties:{
        product_name:'productName'
    }
})
```

The event name is string type. It could only start with a character and could contain figures, characters, and an underline "_", with a maximum length of 50 characters.
### **3.5 User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this api. The data type of newly-created user properties must be the same as the uploaded properties. User name setting is taken as the example here: 
```javascript
//the username now is TA
TDAnalytics.userSet({ username:"TA"})
//the username now is TE
TDAnalytics.userSet({ username:"TE"})
```

## **4. Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the SDK be used in the following steps:
```javascript
import TDAnalytics,{TDAutoTrackEventType} from "react-native-thinking-data";
if (Authorized Privacy policy)
{
   //SDK init
   TDAnalytics.init({appId: "xxx",serverUrl: "https://xxx",});
   //if the user has logged in, the account ID of the user could be set as the unique identifier 
   TDAnalytics.login("TA")
   //After setting super properties, each event would have super properties
   TDAnalytics.setSuperProperties({
     'channel': 'ta',//string
     'age': 1,//number
     'isSuccess': true,//boolean
     'birthday': new Date(),//time
     'object': {'key': 'value'},//object
     'object_arr': [{ 'key': 'value'}],//array object
    'arr': ['value']//array
    })
   //Enable auto-tracking
   TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_CRASH | TDAutoTrackEventType.APP_INSTALL)
   //upload events
    TDAnalytics.track({
        eventName:"product_buy",
        properties:{
          'product_name':'tv'
        }
    }) 
   //Set user properties
   TDAnalytics.userSet({ username:"TE"})
}
```
