# Game Basic Module Tracking Plan


## #User ID System

| Product Type | Property Name | Property Display Name | Property Description | Assignment Description | Notes |
| --- | --- | --- | --- | --- | --- |
| Single account single role | #account_id | Account ID | System property | Set to the user's unique game account ID (aligned with the business primary key) | Suitable for strong account systems, single role, or scenarios without multi-server multi-role |
|  | #distinct_id | Anonymous Visitor ID | System property | Device or SDK anonymous ID; usually maintained by the SDK when using the client SDK |  |
| Single account multiple roles (recommended for games) | #account_id | Account ID | System property | Set to the role ID; account ID is reported separately as a user custom property | Preferred for mid-to-heavy mobile games and multi-server multi-role scenarios |
|  | #distinct_id | Anonymous Visitor ID | System property | Device-related ID; distinct from #account_id |  |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- |
| channel | Channel | text | User source channel (such as App Store, Google Play, TapTap, channel package name, etc.), aligned with the common property/user property channel |
| tmp_vip_level | Current VIP Level | number | Snapshot of the player's VIP level at the time of reporting, used for joint analysis with events; report 0 or do not report if there is no VIP system |


## #Event Data

| Event Name (required) | Event Display Name | Event Description | Event Tag | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install | Automatically reported by the SDK after the user first installs and opens the application (with auto-collection enabled) | Basic Event [C] |  |  |  |  |
| ta_app_start | App Launch | Automatically reported by the SDK when the user opens the application or switches back from the background | Basic Event [C] |  |  |  |  |
| ta_app_end | App Close | Automatically reported by the SDK when the user exits the application to the background or ends the process | Basic Event [C] | #duration | Usage Duration | number | Current session or foreground duration, unit: seconds, automatically collected by the SDK |
| ta_app_crash | App Crash | Automatically reported by the SDK when the application crashes | Basic Event [C] |  |  |  |  |
| new_device | Device Activation | Reported via "First Event" when a new device launches the application for the first time | Basic Event [C] |  |  |  |  |
| register | User Registration | Reported after the user completes the account registration process | Basic Event [C] | register_type | Registration Method | text | Such as guest / email / phone / third-party channel identifier |
| login | User Login | Reported after the user successfully logs into the account | Basic Event [C] |  |  |  |  |
| logout | User Logout | Reported when the user logs out of the account | Basic Event [C] |  |  |  |  |
| guide_complete | Complete Tutorial | Reported upon completing each step or node of the tutorial | Tutorial [C] | guide_id | Guide ID | text | Unique identifier for the tutorial task or tutorial line |
|  |  |  |  | guide_step | Guide Step | number | Sequence number of the step or node currently completed |
| level_up | Role Level Up | Reported when the role/account level is raised | Basic Event [C] | level | Level After Upgrade | number | The level after upgrade is complete |
|  |  |  |  | level_before | Level Before Upgrade | number | The level before the upgrade |
| vip_levelup | VIP Level Up | Reported when VIP level is raised | Basic Event [C] | vip_level | VIP Level After Upgrade | number | VIP level after upgrade |
|  |  |  |  | vip_level_before | VIP Level Before Upgrade | number | VIP level before upgrade |
| payment | Recharge Success | Reported after the server or client confirms successful payment (server-side recommended) | Recharge [S+C] | order_id | Order ID | text | Unique identifier for the recharge order |
|  |  |  |  | pay_amount | Payment Amount | number | Actual paid amount, unit aligned with business agreement (aligned with the smallest unit of the currency) |
|  |  |  |  | currency_type | Payment Currency | text | ISO 4217, such as CNY, USD, EUR |
|  |  |  |  | payment_name | Purchased Item Name | text | Item display name or SKU name |
|  |  |  |  | payment_num | Purchase Quantity | number | Number of items or quantity purchased |
|  |  |  |  | payment_type | Payment Method | text | Such as apple_pay, google_pay, Alipay, WeChat |
|  |  |  |  | is_first | Is First Recharge | bool | Whether this is the user's first successful payment |
| payment_fail | Recharge Failure | Reported when the recharge order fails or payment is closed | Recharge [C] | order_id | Order ID | text | Unique identifier for the recharge order |
|  |  |  |  | pay_amount | Payment Amount | number | Order amount |
|  |  |  |  | currency_type | Payment Currency | text | ISO 4217 |
|  |  |  |  | payment_name | Purchased Item Name | text | Item name |
|  |  |  |  | payment_num | Purchase Quantity | number | Purchase quantity |
|  |  |  |  | payment_type | Payment Method | text | Payment method |
|  |  |  |  | fail_reason | Failure Reason | text | Failure reason code or message |
| shop_buy | Shop Purchase | Reported after completing a purchase in the in-game shop and deducting currency/receiving items | Resource Economy [S+C] | shop_id | Shop ID | text | Shop or store page identifier |
|  |  |  |  | item_id | Item ID | text | ID of the purchased item (text recommended to be compatible with non-numeric IDs) |
|  |  |  |  | item_num | Item Quantity | number | Purchase quantity |
|  |  |  |  | cost_type | Consumed Currency Type | text | Such as diamonds, gold, points, etc. business enumeration |
|  |  |  |  | cost_amount | Consumed Currency Amount | number | Total amount of currency consumed |
| shop_open | Open Shop | Reported when the user enters the shop interface or successfully opens the shop page by clicking the shop entry | Resource Economy [C] | shop_id | Shop ID | text | Shop, store page, or tab identifier |
|  |  |  |  | shop_type | Shop Type | text | Such as permanent/event/gift pack, etc. business enumeration |
|  |  |  |  | entry_source | Entry Source | text | Such as main interface entry, event banner, popup, etc. |
| asset_get | Asset Acquired | Reported when the player obtains currency/items and other assets other than direct shop purchases (quests, mail, battle drops, etc.) | Resource Economy [S+C] | asset_type | Asset Type | text | currency: currency / item: item etc., aligned with business enumeration |
|  |  |  |  | asset_id | Asset ID | text | Currency or item configuration ID |
|  |  |  |  | asset_name | Asset Name | text | Display name, optional |
|  |  |  |  | asset_num | Quantity Acquired | number | Amount added this time, currency can be aligned with the smallest unit |
|  |  |  |  | source | Acquisition Source | text | Such as task/mail/battle/shop_compensate etc. |
| asset_consume | Asset Consumed | Reported when the player consumes currency/items and other assets (enhancement, synthesis, refresh, etc.) | Resource Economy [S+C] | asset_type | Asset Type | text | currency/item etc., consistent with asset_get |
|  |  |  |  | asset_id | Asset ID | text | Currency or item configuration ID |
|  |  |  |  | asset_name | Asset Name | text | Display name, optional |
|  |  |  |  | asset_num | Quantity Consumed | number | Amount consumed this time |
|  |  |  |  | purpose | Consumption Purpose | text | Such as enhance/craft/refresh/gacha etc. |
| current_online | Online User Count | Reported periodically by the server with the current online user count (#distinct_id uses a fixed service account to avoid conflicts with players) | Basic Event [S] | online_user | Online User Count | number | Number of online users in the current statistical cycle |
|  |  |  |  | server_id | Server ID | text | Server or region identifier; use "all" or fixed value for global |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description |
| --- | --- | --- | --- | --- |
| channel | Source Channel | text | user_setOnce | User's first attribution or first visible channel; aligned with event common property channel |
| register_time | User Registration Time | time | user_setOnce | Time when the account or role was first successfully created |
| first_login_time | First Login Time | time | user_setOnce | Time of the first successful game login |
| last_login_time | Last Login Time | time | user_set | Overwritten on each successful login |
| last_pay_time | Last Payment Time | time | user_set | Overwritten after each successful recharge |
| first_pay_time | First Payment Time | time | user_setOnce | Time of the first successful payment |
| total_pay_amount | Cumulative Payment Amount | number | user_set | Lifetime cumulative recharge amount; updated per business rules after each successful payment |
| total_login_day | Cumulative Active Days | number | user_set | Cumulative login days by natural day; updated on login/logout |
| current_level | Current Level | number | user_set | Overwritten when the current role or account level changes |
| current_vip_level | Current VIP Level | number | user_set | Overwritten when the current VIP level changes |
