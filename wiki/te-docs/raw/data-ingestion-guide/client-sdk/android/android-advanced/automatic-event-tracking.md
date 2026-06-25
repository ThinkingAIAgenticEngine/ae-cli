---
code: android_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: D7ykw75weigcIfk3ZoichHbKnuv
parentWikiToken: LqfmwtW1xi0jzwkrKpscKEzFnme
updateTime: 1774249039000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=android_sdk_autotrack
---

Android SDK Automatic Event Tracking events including installation,open,close and etc.
## **1. Introduction **
TE  provides Apis for automatic data tracking. You can select the data to be tracked based on your needs.
Currently, the following types of events can be tracked automatically:
1. Install:  behavior of APP installation
2. Open APP: including activiting APP and resuming APP from the background
3. Close APP: including disabling the APP and calling in the background while tracking the duration of the enabling process
4. View Page:The user views the screen in the APP (`Activity/Fragment`)
5. Click:The user clicks on the UI element  in the APP
6. Crash:Record crash information when the APP crashes
See below for more details on how to start tracking these events.
## **2. Enable Auto-Tracking**
You can call `enableAutoTrack` to enable the auto-tracking function:
```java
//APP install event TDAnalytics.TDAutoTrackEventType.APP_INSTALL
//APP enable event TDAnalytics.TDAutoTrackEventType.APP_START
//APP disable event TDAnalytics.TDAutoTrackEventType.APP_END
//APP view screen event TDAnalytics.TDAutoTrackEventType.APP_VIEW_SCREEN
//APP click view event TDAnalytics.TDAutoTrackEventType.APP_CLICK
//APP crash event TDAnalytics.TDAutoTrackEventType.APP_CRASH
//enable autotrack event
TDAnalytics.enableAutoTrack(TDAnalytics.TDAutoTrackEventType.APP_START | TDAnalytics.TDAutoTrackEventType.APP_END
        | TDAnalytics.TDAutoTrackEventType.APP_INSTALL | TDAnalytics.TDAutoTrackEventType.APP_VIEW_SCREEN | TDAnalytics.TDAutoTrackEventType.APP_CLICK
        | TDAnalytics.TDAutoTrackEventType.APP_CRASH);
```

::: tip
 If you need to track  Clicks event or Fragment Views, please integrate  [<text underline="true">auto-tracking plugin</text>](https://thinkingdata.feishu.cn/docx/Ju0Sd9wpNoraLtxVJv7cbiHqn0e).
 :::
## Instructions
### 3.1 Installation Events
APP install event would record the installation of the APP and be reported when the APP is being activated. The event is triggered when the APP is activated for the first time after installation. APP upgrade would not trigger an  installation event.  If the user reinstalls the app after uninstalling it, the installing event will be triggered again.
- Event name: ta_app_install
### 3.2 Active** Events**
APP started event would be triggered when the user enables the APP or resumes the APP from the background. A detailed description of the start event is as follows:
- Event name: ta_app_start
- Preset property: `#resume_from_background`, Boolean  type, indicating whether the APP is enabled by the user or resumed from the background. If the value is true, it means the APP is resumed from the background; if the value is false, it means the APP is enabled by the user directly. 
- It should be noted that SDK no longer allows the start events triggered by enabling the APP silently . To change the settings, you can add the resource file `ta_public_config.xml` under res/values
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
   <bool name="TAEnableBackgroundStartEvent">true</bool>
</resources>
```


### 3.3 Inactive Events
APP end event would be triggered when the user disables the APP or moves the APP to the background. Detailed description of the end event is as follows:
- Event name: ta_app_end
- Preset property:`#duration`, numeric type, indicating the duration of each APP (unit: second).
### 3.4 View Page Events
APP view screen event would be triggered when the user views the screen (`Activity`). Detailed event introduction is as follows: 
- Event name: ta_app_view
- Preset property: 
  `#screen_name`, string  type, package name, and category name of `Activity`
  `#title`, string type,  title of `Activity`, value: the value of `title` property of `Activity`
Other properties could be added to view screen events to expand their analysis value. Methods for defining the properties of view screen events are as follows
#### 3.4.1 ** View Page Events of Auto-Tracking Fragment**
As for the Fragment of `android.support.v4.app.Fragment`, the following method could be used to track view screen events automatically: 
After SDK is initialized, call the following method to enable the auto-tracking function of Fragment
```java
TDAnalytics.trackFragmentAppViewScreen();
```

As for the Fragment of `android.app.Fragment`, the following method could be used to track view screen events automatically:
```java
TDAnalytics.trackViewScreen(targetFragment);
```

- `targetFragment` can be replaced by the Fragment that requires uploading of the view screen event
#### 3.4.2 **Define The Properties of View Page Events**
As for the view page events of `Activity`, properties could be added by implementing  the interface `ScreenAutoTracker`. URL information and other self-defined properties could be added for view page events through the following two methods:
```java
public class MainActivity extends AppCompatActivity implements ScreenAutoTracker {
    private Context mContext;

    @Override
    public String getScreenUrl() {
        return "thinkingdata://page/main";
    }

    @Override
    public JSONObject getTrackProperties() throws JSONException {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("param1", "ABCD");
        jsonObject.put("param2", "thinkingdata");
        return jsonObject;
    }
}
```

The returned value of `getScreenUrl`would be used as the URL Schema of the `Activity`. When the view event of the page is triggered, preset property `#url` will be added. Meanwhile, SDK will fetch the URL Schema of the page before redirection. If it succeeds, it will be added to the preset property `#referrer` as the forward address.
The returned value of `getTrackProperties` is the self-defined property of the view event of the screen, and would join the view event of the screen automatically 
As for the view screen event of `Fragment`, we provide two ways to add properties 
-  Add attributes by `@ThinkingDataFragmentTitle`
```java
@ThinkingDataFragmentTitle(title = "myFragment")
public class ListViewFragment extends BaseFragment {
  // your fragment implementations
}
```

- Implements `ScreenAutoTracker` 
```java
  @Override
  public JSONObject getTrackProperties() {
      try {
          JSONObject properties = new JSONObject();
          properties.put("#title", "RecyclerViewFragment");
          return properties;
      } catch (JSONException e) {
          // ignore
      }
      return null;
  }
```


### 3.5 C**licked Events**
App view click event would be triggered when the user clicks the element
- Event name: ta_app_click
- Preset property:
  `#screen_name`, character string type, `package.class` of the `Activity` to which the view belongs
  `#title`, character string type, the title of the `Activity` to which the view belongs, value: the value of `title` property of `Activity`
  `#element_content`, character string type, the content of the view 
  `#element_type`, character string type, type of the view 
  `#element_id`，character string type, the ID of the view, `android:id` should be used by default
  `#element_position`，character string type, uploaded when the view is in its `position`
  `#element_selector`，character string type, the splicing of the `viewPath` of the view
#### 3.5.1 **Define ViewID**
The viewID should be `android:id` by default. If such property is unavailable, or the user wants to define the view ID, the following method could be used to cover `#element_id` property
```java
TDAnalytics.setViewID(view,viewID);
```

As for `Dialog`, the following method could be applied: 
```java
//android.app.Dialog
TDAnalytics.setViewID(view,viewID);
```

or
```java
//android.support.v7.app.AlertDialog
TDAnalytics.setViewID(view,viewID);
```

Parameter `view` is the view that needs a view ID, while parameter `viewID` is the preset view ID. When the clicking event of the view is being uploaded, the value of `#element_id` will be the value uploaded.
#### 3.5.2 **Define The Properties of Clicked Events**
You can apply the following method to add self-defined properties for Clicking a certain view.
```java
TDAnalytics.setViewProperties(view,properties);
```

Parameter view is the view that needs self-defined properties, while parameter `properties` (type:`JSONObject`) are the present self-defined properties, which will be added when the click event of the view is uploaded.
Besides, as for `ExpandableListView`, `ListView` and `GridView`, you can also add self-defined properties when clicking a certain item by realizing interface with an Adapter.
- `ExpandableListView` should implements `ThinkingExpandableListViewItemTrackProperties` interface
```java
public interface ThinkingExpandableListViewItemTrackProperties {
    /**
     * Add properties when clicking items at groupPosition and childPosition
     * @param groupPosition
     * @param childPosition
     * @return
     * @throws JSONException
     */
    JSONObject getThinkingChildItemTrackProperties(int groupPosition, int childPosition) throws JSONException;

    /**
     * Add properties when clicking items at groupPosition
     * @param groupPosition
     * @return
     * @throws JSONException
     */
    JSONObject getThinkingGroupItemTrackProperties(int groupPosition) throws JSONException;
}
```


- `ListView` and `GridView` should implement `ThinkingAdapterViewItemTrackProperties` interface
```java
public interface ThinkingAdapterViewItemTrackProperties {
    /**
     * Add properties when clicking items in the position 
     * @param position
     * @return
     * @throws JSONException
     */
    JSONObject getThinkingItemTrackProperties(int position) throws JSONException;
}
```


#### 3.5.3 **Add **`**Activity**`** information for Clicked Event of **`**AlertDialog**`
As for the clicked event of `AlertDialog (android.app.AlertDialog and android.support.v7.app.AlertDialog`), the following methods could be applied to bind with the screen (`Activity`) concerned. In this case, the `#screen_name`  and  `#title` property of the screen would be added to the click event.
- Please apply the following method to call `dialog.show()`and display dialog:
```java
dialog.setOwnerActivity(targetActivity);
```

- Please apply the following method to call `builder.show()` and display dialog:
```java
builder.show().setOwnerActivity(activity);
```

#### 3.5.4 Add** Clicked Events by Adding Annotation **`**@ThinkingDataTrackViewOnClick**`
If you use the calling method of adding a clicked event for viewing through `android:onclick`, you can add annotation `@ThinkingDataTrackViewOnClick`. When the calling method is being implemented, SDK will upload the view click event.
```java
@ThinkingDataTrackViewOnClick
public void buttonOnClick(View v){}
```

If the `buttonOnClick` method is being called, the clicked event will be uploaded
### 3.6** Crash Events**
When an unexpected crash occurs in the APP, an APP crash event would be reported
- Event name: ta_app_crash
- Preset property:`#app_crashed_reason`, character string type, record the stack trace upon crash
## **4.Ignore Auto-Tracking Event**
You can ignore the auto-tracking event of activity or view by the following means
### 4.1 View Page Events
As for certain screens (`Activity`), if you do not want to transmit auto-tracking events (including view screen event and view click event), you can ignore them by the following means:
```java
//ignore a single screen
TDAnalytics.ignoreAutoTrackActivity(MainActivity.class);
//ignore multiple screens
List<Class<?>> classList = new ArrayList<>();
classList.add(MainActivity.class);
TDAnalytics.ignoreAutoTrackActivities(classList);
```

You can also add annotation `@ThinkingDataIgnoreTrackAppViewScreen` before `Activity` or `Fragment` to ignore the view screen event of a certain `Activity` or `Fragment`
```java
//ignore the view screen event of TestActivity
@ThinkingDataIgnoreTrackAppViewScreen
public class TestActivity extends AppCompatActivity {
    ...
}
```

`@ThinkingDataIgnoreTrackAppViewScreenAndAppClick` before `Activity` to ignore the view screen event of a certain `Activity` as well as the view click event under the screen
```java
//ignore the view screen event ofTestActivity as well as the view click event under the screen
@ThinkingDataIgnoreTrackAppViewScreenAndAppClick
public class TestActivity extends AppCompatActivity {
    ...
}
```

### 4.2 Clicked Events
1. You can apply the following method to ignore the click event of a certain view type
```java
TDAnalytics.ignoreViewType(ignoredClass);
```

- `ignoredClass` is the type of view that needs to be ignored. For example, `Dialog` and `Checkbox`, etc.
2. You can apply the following method to ignore the click event of a certain element (view)
```java
TDAnalytics.ignoreView(targetView);
```

- `targetView` is the View to be ignored
## **Tracking Events By Annotation**
If you need to monitor the call time of a certain method, or an event needs to be uploaded once a method is called, you can use annotation `@ThinkingDataTrackEvent` to set the event to be uploaded rapidly. It should be noted that variables could not be uploaded for properties. Therefore, only simple events could be uploaded.
```java
//use annotation
@ThinkingDataTrackEvent(eventName = "event_name", properties = "{\"paramString\":\"value\",\"paramNumber\":123,\"paramBoolean\":true}")
public void fun(){}
```

In this case, if method `fun` is called, an even named `event_name` and such properties as `"paramString":"value"`, `"paramNumber":123` and `"paramBoolean":true` will be uploaded
## **6.Preset Properties of Auto-Tracking Events**
The following preset properties are the properties set specially for each auto-tracking event
- Preset properties of APP start event (ta_app_start)

<lark-table rows="4" cols="4" column-widths="143,133,140,328">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      ** Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #resume_from_background
    </lark-td>
    <lark-td>
      Resume from the background or not
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
      Indicating whether the APP is enabled by the user or resumed from the background. If the value is true, it means the APP is resumed from the background; if the value is false, it means the APP is enabled by the user directly.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #start_reason
    </lark-td>
    <lark-td>
      APP enable source
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The content is JSON character string; when the APP is enabled by url or intent method, the `url `content and the` data` in intent would be recorded automatically. For the sample, please refer to:
      `{url:"thinkingdata://","data":{}}`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #background_duration
    </lark-td>
    <lark-td>
      Background duration
    </lark-td>
    <lark-td>
      Numeric value
    </lark-td>
    <lark-td>
      Record the background duration of the APP in the time interval between two start events (Unit: second)
    </lark-td>
  </lark-tr>
</lark-table>

- Preset properties of APP end event (ta_app_end)
<sheet token="Xny0sLWUchPLLQtxkdBcolDwnah_JyO46Y"/>

- Preset properties of APP view screen event (ta_app_view)
<sheet token="Xny0sLWUchPLLQtxkdBcolDwnah_UeETsg"/>

- Preset properties of APP view click event
<sheet token="Xny0sLWUchPLLQtxkdBcolDwnah_lC5ttn"/>

- Preset properties of APP crash event (ta_app_crash)
<sheet token="Xny0sLWUchPLLQtxkdBcolDwnah_QsujSs"/>

## **7. Optional Plugin **
::: tip
 This plugin should only be integrated when you need to enable the view click event and Fragment view screen. 
 :::
::: tip 
Starting from version 2.1.0, it is compatible with Gradle8.0.
 :::

<lark-table rows="4" cols="2" column-widths="230,590">

  <lark-tr>
    <lark-td>
      Android Analytics SDK version
    </lark-td>
    <lark-td>
      plugin version
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      [oldest - 3.0.0)
    </lark-td>
    <lark-td>
      1.2.0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      [3.0.0 - 3.1.0]
    </lark-td>
    <lark-td>
      2.1.0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      (3.1.0 - latest]
    </lark-td>
    <lark-td>
      2.2.0
    </lark-td>
  </lark-tr>
</lark-table>

```groovy {wrap}
buildscript {
    repositories {
        google()
        jcenter()
    }
    dependencies {
        classpath 'cn.thinkingdata.android:android-gradle-plugin2:2.2.0'
    }
}
```

Relevant parameters of the plugin could be configured in the build.gradle file of the project
```nginx {wrap}
apply plugin: 'cn.thinkingdata.android'
android {

}
ThinkingAnalytics {
    debug = true
    exclude = []
    sdk{
        disableAndroidID = false
    }
}
```

If you want to open the compile log, you can set debug as true, whose default value is false.
If you do not want to  scan the class under a certain route, you can set 
`exclude = ['cn.thinkingdata.android','android.support']`
Code isolation of sensitive properties (e.g., Android ID) can be configured by setting `disableAndroidID`` = ``true`
