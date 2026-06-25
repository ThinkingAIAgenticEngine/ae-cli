---
code: javascript_sdk_multi_instance
name: "Multi-Instance"
wikiToken: VSPewnQaUiXZFvkfSGNcZdz0nvd
parentWikiToken: BwkywAk0aiKI9Skyhk8cKnlKnde
updateTime: 1774249082000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=javascript_sdk_multi_instance
---

You can call `initInstance` to create child instance,Its parameter is the child instance name,You can then call the child instance's API by that name.
```javascript
// Create an instance named newInstance
ta.initInstance("newInstance");
// set distinct_id for child instance and send the event of test_event
ta.newInstance.setDistinctId("new_distinct_id");
ta.newInstance.track("test_event");
```

By default, child instance use the same configuration as the main instance (appId, serverUrl, etc.),and child instance do not enable local caching.
If you need to configure parameters for child instance separately, you can pass in the configuration information during initialization,and  passing in different appId values,then you can reporting data to different projects:
```javascript
// configuration parameters for child instance
var param = {
  appId: "debug-appid",
  serverUrl: "ANOTHER_SERVER_URL",
  persistenceEnabled: true, // enable the local cache of the child instance
  send_method: "image",
  showLog: true
};

// init child instance
ta.initInstance("anotherInstance", param);

//upload data to the main instance
ta.track("Event");

//upload data to the child instance
ta.anotherInstance.track("Event");
```

The ID systems and the pulbic properties of the Main-instance and the Child-instance are not interoperable,User ID can be set individually for each instance,The following case uses this feature to report the invitation success and invitation events for the inviter and invitee of the event of inviting friends:
```javascript
//The main instance is the new user being invited and the child instance is the inviter
ta.login("invitee");
ta.anotherInstance.login("inviter");
//New user triggers invited event
ta.track("be_invited");
//Inviter trigger invite new user event
ta.anotherInstance.track("invite_new_user");
```
