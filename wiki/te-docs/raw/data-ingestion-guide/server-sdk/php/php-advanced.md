---
code: php_sdk_advanced
name: "PHP-Advanced"
wikiToken: G4igw6q4gieQcgkEQxRcPW5XnVb
parentWikiToken: G0BrwOPbXiAtIikbcv3cMEyonTf
updateTime: 1774249306000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=php_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```php
$properties = array();
$properties["product_name"] = "book";
try {
    $te->track("distinctId", "accountId", "productBuy", $properties);
} catch (Exception $e) {
    echo $e;
}
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```php
$properties = array();
$properties["price"] = 100;
$properties["status"] = 3;
$firstCheckId = "first_flag_id";
try {
    $te->track_first("distinctId", "accountId", "device_activation", $firstCheckId, $properties);
} catch (Exception $e) {
    echo $e;
}
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```php
$properties = array();
$properties["price"] = 100;
$properties["status"] = 3;
$eventId = "eventId";
try {
    $te->track_update("distinctId", "accountId", "eventName", $eventId, $properties);
} catch (Exception $e) {
    echo $e;
}

$properties1 = array();
$properties1["status"] = 5;
try {
    $te->track_update("distinctId", "accountId", "eventName", $eventId, $properties1);
} catch (Exception $e) {
    echo $e;
}
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```php
$properties = array();
$properties["price"] = 100;
$properties["status"] = 3;
$eventId = "eventId";
try {
    $te->track_overwrite("distinctId", "accountId", "eventName", $eventId, $properties);
} catch (Exception $e) {
    echo $e;
}

$properties1 = array();
$properties1["status"] = 5;
try {
    $te->track_overwrite("distinctId", "accountId", "eventName", $eventId, $properties1);
} catch (Exception $e) {
    echo $e;
}
```

## **User Properties**
User property setting APIs supported by the TE  include: `user_set`, `user_setOnce`, `user_add`, `user_append`, `user_uniq_append`, `user_unset`, `user_del`.
### 2.1 user_set
You can call `user_set` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```php
$properties = array();

$properties["user_name"] = "ABC";
try{
    $te->user_set('distinct_id', 'account_id', $properties);
}catch (Exception $e){
    echo $e;
}

$properties["user_name"] = "XYZ";
try{
    $te->user_set('distinct_id', 'account_id', $properties);
}catch (Exception $e){
    echo $e;
}
```

### 2.2 user_setOnce
If the user property you want to upload only needs to be set once, you can call `user_setOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```php
$properties = array();

$properties["user_name"] = "ABC";
try{
    $te->user_setOnce('distinct_id', 'account_id', $properties);
} catch (Exception $e){
    echo $e;
}

$properties["user_name"] = "XYZ";
$properties["user_age"] = 18;
try{
    $te->user_setOnce('distinct_id', 'account_id', $properties);
} catch (Exception $e){
    echo $e;
}
```

### 2.3 user_add
When you want to upload numeric property for cumulative operation, you can call `user_add`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```php
try{
    $properties = array();
    $properties['level'] = 2;
    $te->user_add('distinct_id', 'account_id', $properties);
} catch (Exception $e){
    //handle except
    echo $e;
}
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 user_append
You can call `user_append` to add user properties of array type.
```php
try{
    $properties = array();
    $properties['arr'] = ['str3','str4'];
    $te->user_append('distinct_id', 'account_id', $properties);
} catch (Exception $e){
    //handle except
    echo $e;
}
```

### 2.5 user_uniq_append
You can delete duplicated user property by calling `user_uniq_append` API. If you call `user_append` API, duplicated user property might not be deleted.
```php
try{
    $properties = array();
    $properties['arr'] = ['str3','str4'];
    $te->user_uniq_append('distinct_id', 'account_id', $properties);
}catch (Exception $e){
    //handle except
    echo $e;
}
```

### 2.6 user_unset
When you need to clear the user properties of users, you can call `user_unset` to clear specific properties.  `user_unset` would not create properties that have not been created in the cluster.
```php
$properties1 = array(
    'age', "update_time"
);
try {
    $te->user_unset(null, 'account_id', $properties1);
} catch (Exception $e) {
    //handle except
    echo $e;
}
```

### 2.7 user_del
You can call `user_del` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```php
try{
    $te->user_del('distinct_id', 'account_id');
}catch (Exception $e){
    echo $e;
}
```


## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool.
```php
require "TaPhpSdk.php";
$te = new TDAnalytics(new TDBatchConsumer("SERVER_URL","APP_ID"));
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="E18LbtFm4ogabLxmuyLcgicfnbh" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
