---
code: javascript_sdk_autotrack
name: "Automatic Event Tracking"
wikiToken: Ekk2wzXp2iT1tqkpea6c2KB4nef
parentWikiToken: BwkywAk0aiKI9Skyhk8cKnlKnde
updateTime: 1776241528000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=javascript_sdk_autotrack
---

## 1.Monitor HTML element Clicked Events
If you want to track click events on elements of the page, you can use trackLink to monitor HTML elements in batches:
```javascript
ta.trackLink(
  {
    tag: ["a", "button"], //HTML tag
    class: ["class1", "class2"], //Custom Class name
    id: ["id1", "id2"] //custom ID name
  }, 
  "click", //he name of the trace event
  {
    production: "production",
    name: "name"
  } //event properties
);
```

- The first parameter is  the element you need to monitor. The type is a JSON object, which supports tracking the page element to be monitored according to the HTML `tag` , `class`, and `i``d`.For elements that meet the rules, the click event of the element will be monitored through the event listener. When the listening element is clicked, an event will be reported. The event name and event properties take the value of the next two parameters
- The second parameter is the name of the event, which is of string type. 
- The third parameter is the property of the event, and the type is a JSON object. If there is no property to be reported, an empty JSON can be passed in
- The event property name is the ID of the element. If the event property name is not set in parameter.We will use the property value of the monitored element as the element identifier. The value priority is as follows:
  1.Custom attribute 'td-name' of the value element
  2.The innerHTML of the element
  3.The value of the element
  4.If none of them are fetched, pass 'ID not obtained'.
<quote-container>
When `trackLink `is called, it will set an event listener for elements that meet the rules. After the API is called, the identity of the element changes, or a new element that meets the rules is generated, and the event reported by the listener will not change accordingly. If you need to monitor newly generated elements, you can call `trackLink` after the elements are generated.
</quote-container>

## 2.Page show and hide event
By default, the SDK does not collect these events, which can be configured through the config initialized by the SDK.
```scala
var config = {
    appId: 'xxx',
    serverUrl: 'xxx',
    autoTrack: {
     //enable ta_page_show event
     pageShow: true,
     //enable ta_page_hide event
     pageHide: true,
    }
};
```

`ta_page_hide` event will put the duration of the page from displaying to closing into the property`#duration`
## 3.Browse Events
TE provides an API for auto-tracking view page event.You only need to use the following code, and SDK will automatically upload the event of the user browsing the page, and the event name is ta_pageview：
```javascript
ta.quick("autoTrack");
```

Support custom properties：
```javascript
ta.quick('autoTrack', {
    name: 'test_name',
    time: new Date(),
    pro: [1, 2, 3, 4],
})
```

<quote-container>
When this API is called, a view page event will be reported immediately
</quote-container>

Starting from version 2.4.0, automatic browsing events for single-page applications (SPAs) are supported. The specific enabling methods are as follows:
```javascript
var config = {
    appId: 'xxx',
    serverUrl: 'xxx',
    autoTrack: {
         //enable ta_page_show event
         pageShow: true,
         //enable ta_page_hide event
         pageHide: true,
         //enable ta_pageview event
         pageView: true,
         properties: {
             staticKey: 'staticValue'
         }, 
         callback: (eventType) => {
              if (eventType === 'pageShow') {
                  return { appShowKey: 'appShowValue' };
              } else if (eventType === 'pageHide') {
                  return { appHideKey: 'appHideValue' };
              }else if (eventType === 'pageView') {
                  return { appHideKey: 'pageViewValue' };
              }else {
                  return {};
              }
         }
    }
};
```

## 3.Element click event
Starting with version 2.5.0, element click events can be automatically collected by configuring the pageClick parameter, with the event name being ta_page_click.
```javascript
var config = {
    appId: 'xxx',
    serverUrl: 'xxx',
    autoTrack: {
         pageShow: true,
         pageHide: true,
         pageView: true,
         pageClick:true
    }
};
```

- Setting pageClick: true will, by default, collect click events of all elements with onclick or td-track-id set. Example code is as follows:
```json
<button onclick="testFun()" td-track-id="buttonId">test button</button>
```

<callout emoji="trophy" background-color="light-orange" border-color="light-orange">
Note: Vue project elements do not have an onclick attribute; you need to use td-track-id to filter and collect data.
</callout>

After setting td-track-id, #element_id will be automatically included when reporting click events.
- If you want to ignore the click event of this element, you can do so using `td-track-ignore` or `td-track-ignore="true"`. Example code is shown below:
```json
<button onclick="testFun()" td-track-ignore >test button</button>
```

<callout emoji="soccer" background-color="light-orange" border-color="light-orange">
Note: React projects need to use `td-track-ignore="true"` to ignore this.
</callout>
