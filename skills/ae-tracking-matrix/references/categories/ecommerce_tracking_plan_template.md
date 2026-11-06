# E-commerce Tracking Plan


## Integration Essentials

|  |  | Data Collection Requirements Document |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | Sheets prefixed with # are the tracking design parts; other sheets describe design principles or key considerations in the tracking process, which can be browsed as needed based on actual business requirements |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Integration notice: It is recommended to read the following documents before integration |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Integration Essentials |  | User Definition |  |  | User identification rules: how to define a user in the TA system |  |  |  |  |  |  |  |  |
|  |  |  |  | Data Specification |  |  | Data rules: TA system data format specification |  |  |  |  |  |  |  |  |
|  |  |  |  | Preset Fields and System Fields |  |  | Preset fields and system fields |  |  |  |  |  |  |  |  |
|  |  | Integration Tools |  | TA provides a full-end data integration solution, with main integration methods including: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Client SDK |  |  | Can collect device information and user behavior data that does not communicate with the server |  |  |  |  |  |  |  |  |
|  |  |  |  | Server SDK |  |  | Collected content is more precise, suitable for collecting core business data |  |  |  |  |  |  |  |  |
|  |  |  |  | Data Import Tool |  |  | Usually used for historical data import; Server SDK combined with LogBus is also a common server-side data collection solution |  |  |  |  |  |  |  |  |
|  |  |  |  | For general applications and Web development, we provide: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Native SDK |  |  | Android SDK |  | iOS SDK |  |  |  |  |  |  |
|  |  |  |  | Third-party Frameworks |  |  | Flutter | RN Android | RN iOS | Weex Android | Weex iOS |  |  |  |  |
|  |  |  |  | H5 Development |  |  | JavaScript SDK |  | H5 and native SDK integration solution |  |  |  |  |  |  |
|  |  |  |  | Mainstream mini-program and quick-app platforms |  |  | Mini Program SDK |  |  |  |  |  |  |  |  |
|  |  |  |  | For mini-game development, we provide: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Support for mainstream game engines |  |  | LayaBox | Egret Engine | Cocos Creator |  |  |  |  |  |  |
|  |  |  |  | Support for mainstream mini-game and quick-game platforms |  |  | Mini Game SDK |  |  |  |  |  |  |  |  |
|  |  |  |  | For mobile game development, we provide: |  |  | Unity SDK |  | Unreal 4 SDK |  |  |  |  |  |  |
|  |  |  |  | For server-side collection solutions, we recommend: |  |  | Server SDK + | Logbus solution |  |  |  |  |  |  |  |
|  |  |  |  | This solution performs well in terms of data import stability, real-time performance, and efficiency. |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | If you have some heterogeneous historical data to import, or need to backfill some data into the TA system, consider using |  |  |  |  |  |  | DataX |  |  |  |  |
|  |  |  |  | Unlike the Logbus solution, DataX is not a resident service and cannot monitor the generation of new data and import it in time, so real-time data cannot be guaranteed. The advantage of DataX is that it supports heterogeneous data import from multiple data sources with simple operation. |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | If you use Filebeat and Logstash to collect logs and want to import log data into the TA system, you can use: |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  | Filebeat + Logstash solution |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Integration Essential Information |  | 1. Project APP ID: The project APP ID will be generated when creating a project in the TA backend, and can also be viewed on the project management page 2. Determine the data receiver address    If using cloud service, the receiver address is: https://receiver.ta.thinkingdata.cn    For private deployment, you need to bind a domain name in the private cluster (or access point) and configure the SSL certificate 3. Verify the receiver address: Access https://YOUR_RECEIVER_URL/health-check in the browser. The page returns ok, indicating correctness 4. Data collection plan, which should include:    Data integration method: Client SDK, Server SDK, data import tool, or a combination of several solutions    Content and trigger timing of data to be integrated |  |  |  |  |  |  |  |  |  |  |  |
|  |  | For the above integration methods, you can select according to the actual business situation. If you have any questions, you can contact ThinkingData service personnel to assist in selection |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Key points of concern: The following matters will directly affect the usability of tracking, please pay attention |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  | Regarding data type design principles: The type of a property (i.e., field) in the ThinkingData analytics system is determined by the type when the property is first ingested, so it is recommended to focus on confirming the type of related properties during tracking to avoid subsequent modification and migration |  |  |  |  |  |  | Data Type Design Principles |  |  |  |  |  |  |
|  |  | If you wish to integrate data from both server and client, please refer to the document on the right |  |  |  |  |  |  | Multi-end Integration Considerations |  |  |  |  |  |  |
|  |  | If there are multiple user ID systems to focus on in the project, such as role ID, account ID, device ID, etc., it is recommended to prioritize sorting out user ID strategies before tracking |  |  |  |  |  |  | Tracking Suggestions for Multi-User ID Systems |  |  |  |  |  |  |
|  |  | Common event properties are properties that all (or most) events have. If using the client SDK to upload data, note that after the user logs out, you need to manually clear the currently set common event properties |  |  |  |  |  |  | Common Event Property Setup Method |  |  |  |  |  |  |


## #User ID System

| Property Name | Property Display Name | Property Description | Assignment Description |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #account_id | Account ID | System property | Set to account ID |  |  |  |  |  |  |
| #distinct_id | Visitor ID | System property | Device-related ID or in-business visitor ID. If using client SDK, no need to pay attention |  |  |  |  |  |  |


## #Event Data

| Event Name (required) | Event Display Name | Event Description | Event Tag | Property Name (required) | Property Display Name | Property Type (required) | Property Description |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install | Automatically reported after enabling client auto-collection | Basic Data |  |  |  | Auto-collection event, see official documentation. If you need to set common event properties or set custom visitor ID, please ensure that setSuperProperties() or identify() is called before enabling auto-collection  https://docs.thinkingdata.cn/ta-manual/v3.6/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_autotrack.html#%E4%B8%80%E3%80%81%E8%87%AA%E5%8A%A8%E9%87%87%E9%9B%86%E4%BB%8B%E7%BB%8D |  |
| ta_app_start | App Start | Automatically reported after enabling client auto-collection | Basic Data |  |  |  |  |  |
| ta_app_crash | App Crash | Automatically reported after enabling client auto-collection | Basic Data |  |  |  |  |  |
| ta_app_end | App Close | Automatically reported after enabling client auto-collection | Basic Data | #duration | Online Duration | number |  |  |
| ta_mp_launch | Mini Program Initialization | Automatically reported after enabling client auto-collection | Basic Data |  |  |  | Auto-collection event, see official documentation. If you need to set common event properties or set custom visitor ID, please ensure that setSuperProperties() or identify() is called before enabling auto-collection https://docs.thinkingdata.cn/ta-manual/v3.7/installation/installation_menu/client_sdk/mp_sdk_installation.html#_5-2-%E8%87%AA%E5%8A%A8%E9%87%87%E9%9B%86%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3 |  |
| ta_mp_show | Mini Program Launch | Automatically reported after enabling client auto-collection | Basic Data |  |  |  |  |  |
| ta_mp_hide | Mini Program Hide | Automatically reported after enabling client auto-collection | Basic Data |  |  |  |  |  |
| ta_mp_view | Mini Program Page View | Automatically reported after enabling client auto-collection | Basic Data |  |  |  |  |  |
| ta_mp_share | Mini Program Page Forward Share | Automatically reported after enabling client auto-collection | Basic Data |  |  |  |  |  |
| privacy_agreement | View Privacy Agreement | Reported when user views privacy agreement | Registration & Login |  |  |  |  |  |
| register_page | Register/Login Page Visit | Reported when entering the register/login page | Registration & Login | page_source | Page Source | text | Points Store, Homepage, Click Add to Cart, Payment Page |  |
| get_code | Get Verification Code | Reported after clicking get verification code | Registration & Login | get_reason | Get Reason | text | Register, Login |  |
| register | Register | Reported when there is a registration result | Registration & Login | register_method | Registration Method | text | WeChat one-click registration |  |
|  |  |  |  | register_source | Registration Source | text | Points Store, Homepage |  |
|  |  |  |  | is_success | Is Success | bool |  |  |
|  |  |  |  | fail_reason | Failure Reason | text | Account already exists, network issue |  |
| login | Login | Reported when there is a login result | Registration & Login | is_first_login | Is First Login | bool |  |  |
|  |  |  |  | login_method | Login Method | text | WeChat one-click login |  |
|  |  |  |  | is_success | Is Success | bool |  |  |
|  |  |  |  | fail_reason | Failure Reason | text | Network issue |  |
| click_banner | Banner Click | Reported when clicking an ad banner | Homepage | page | Page | text |  |  |
|  |  |  |  | banner_id | banner_id | text |  |  |
|  |  |  |  | banner_name | Banner Name | text |  |  |
|  |  |  |  | banner_num | Banner Order | number | 1, 2, 3 |  |
|  |  |  |  | banner_type | Banner Type | text | Carousel, homepage xx position |  |
|  |  |  |  | url | Jump Link | text |  |  |
| commodity_detail | View Product Detail Page | Reported when viewing product detail page | Purchase Flow | entrance | Entrance | text |  |  |
|  |  |  |  | commodity_id | Product ID | text |  |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
|  |  |  |  | commodity_type | Product Category | text |  |  |
|  |  |  |  | original_price | Original Price | number |  |  |
|  |  |  |  | present_price | Current Price | number |  |  |
| add_cart | Add to Cart | Reported when clicking the add to cart button | Purchase Flow | entrance | Entrance | text |  |  |
|  |  |  |  | commodity_id | Product ID | text |  |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
|  |  |  |  | commodity_type | Product Category | text |  |  |
|  |  |  |  | original_price | Original Price | number |  |  |
|  |  |  |  | present_price | Current Price | number |  |  |
|  |  |  |  | size | Size | text | m, l, xl |  |
|  |  |  |  | color | Color | text | Red, Yellow, Blue, Green, Black, White, Gray |  |
|  |  |  |  | commodity_amount | Product Quantity | number | 1, 10 |  |
| buy_now | Buy Now | Reported when clicking the buy now button | Purchase Flow | entrance | Entrance | text | Product detail page, recommendation page |  |
|  |  |  |  | commodity_id | Product ID | text |  |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
|  |  |  |  | commodity_type | Product Category | text |  |  |
|  |  |  |  | original_price | Original Price | number |  |  |
|  |  |  |  | present_price | Current Price | number |  |  |
|  |  |  |  | color | Color | text | Red, Yellow, Blue, Green, Black, White, Gray |  |
|  |  |  |  | size | Size | text | m, l, xl |  |
|  |  |  |  | commodity_amount | Product Quantity | number | 1, 10 |  |
| select_address | Select Address | Reported after confirming the selected address | Purchase Flow | receiver_name | Receiver Name | text | User A, User B, User C, User D |  |
|  |  |  |  | receiver_phone | Receiver Phone | text |  |  |
|  |  |  |  | receiver_province | Receiver Province | text |  |  |
|  |  |  |  | receiver_city | Receiver City | text | Shanghai, Beijing |  |
|  |  |  |  | receiver_area | Receiver Area | text | Area A, Area B, Area C |  |
|  |  |  |  | receiver_address | Receiver Address | text | Address A, Address B, Address C |  |
| submit_order | Submit Order | Reported when successfully submitting an order, recommended to collect on the server side | Purchase Flow | entrance | Entrance | text | Cart checkout, buy now, order again |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | order_amount | Total Order Amount | number | Total order amount including shipping |  |
|  |  |  |  | order_actual_amount | Actual Paid Amount | number | Actual paid amount |  |
|  |  |  |  | transportation_costs | Shipping Cost | number | 0, 10 |  |
|  |  |  |  | is_use_discount | Is Coupon Used | bool |  |  |
|  |  |  |  | coupon | Coupon | object | {"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"} | If an order can use multiple coupons, use the object group format |
|  |  |  |  | receiver_name | Receiver Name | text | User A, User B, User C, User D |  |
|  |  |  |  | receiver_province | Receiver Province | text |  |  |
|  |  |  |  | receiver_phone | Receiver Phone | text |  |  |
|  |  |  |  | receiver_city | Receiver City | text | Shanghai, Beijing |  |
|  |  |  |  | receiver_area | Receiver Area | text | Area A, Area B, Area C |  |
|  |  |  |  | receiver_address | Receiver Address | text | Address A, Address B, Address C |  |
|  |  |  |  | commodity_list | Order Product List | object group | [{"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"White"}, {"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"Black"}, ] |  |
| pay_order | Pay Order | Reported when the order is successfully paid, recommended to collect on the server side | Purchase Flow | entrance | Entrance | text | Cart checkout, buy now, order again |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | order_amount | Total Order Amount | number | Total order amount including shipping |  |
|  |  |  |  | order_actual_amount | Actual Paid Amount | number | Actual paid amount |  |
|  |  |  |  | transportation_costs | Shipping Cost | number | 0, 10 |  |
|  |  |  |  | is_use_discount | Is Coupon Used | bool |  |  |
|  |  |  |  | coupon | Coupon | object | {"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"} | If an order can use multiple coupons, use the object group format |
|  |  |  |  | receiver_name | Receiver Name | text | User A, User B, User C, User D |  |
|  |  |  |  | receiver_province | Receiver Province | text |  |  |
|  |  |  |  | receiver_phone | Receiver Phone | text |  |  |
|  |  |  |  | receiver_city | Receiver City | text | Shanghai, Beijing |  |
|  |  |  |  | receiver_area | Receiver Area | text | Area A, Area B, Area C |  |
|  |  |  |  | receiver_address | Receiver Address | text | Address A, Address B, Address C |  |
|  |  |  |  | commodity_list | Order Product List | object group | [{"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"White"}, {"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"Black"}, ] |  |
|  |  |  |  | payment_method | Payment Method | text | Credit card, WeChat, Alipay |  |
| cancel_order | Cancel Order | Reported when an order is canceled, recommended to collect on the server side | Purchase Flow | cancel_reason | Cancel Reason | text | Wrong model selected, don't want to buy, slow shipping |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | order_amount | Total Order Amount | number | Total order amount including shipping |  |
|  |  |  |  | order_actual_amount | Actual Paid Amount | number | Actual paid amount |  |
|  |  |  |  | transportation_costs | Shipping Cost | number | 0, 10 |  |
|  |  |  |  | is_use_discount | Is Coupon Used | bool |  |  |
|  |  |  |  | coupon | Coupon | object | {"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"} | If an order can use multiple coupons, use the object group format |
|  |  |  |  | receiver_name | Receiver Name | text | User A, User B, User C, User D |  |
|  |  |  |  | receiver_province | Receiver Province | text |  |  |
|  |  |  |  | receiver_phone | Receiver Phone | text |  |  |
|  |  |  |  | receiver_city | Receiver City | text | Shanghai, Beijing |  |
|  |  |  |  | receiver_area | Receiver Area | text | Area A, Area B, Area C |  |
|  |  |  |  | receiver_address | Receiver Address | text | Address A, Address B, Address C |  |
|  |  |  |  | commodity_list | Order Product List | object group | [{"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"White"}, {"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"Black"}, ] |  |
| send_commodity | Ship Order | Reported when the order is shipped (server-side reporting) | Purchase Flow | order_id | Order ID | text |  |  |
|  |  |  |  | order_amount | Total Order Amount | number | Total order amount including shipping |  |
|  |  |  |  | order_actual_amount | Actual Paid Amount | number | Actual paid amount |  |
|  |  |  |  | receiver_name | Receiver Name | text | User A, User B, User C, User D |  |
|  |  |  |  | receiver_province | Receiver Province | text |  |  |
|  |  |  |  | receiver_phone | Receiver Phone | text |  |  |
|  |  |  |  | receiver_city | Receiver City | text | Shanghai, Beijing |  |
|  |  |  |  | receiver_area | Receiver Area | text | Area A, Area B, Area C |  |
|  |  |  |  | receiver_address | Receiver Address | text | Address A, Address B, Address C |  |
|  |  |  |  | commodity_list | Order Product List | object group | [{"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"White"}, {"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"Black"}, ] |  |
|  |  |  |  | transportation_costs | Shipping Cost | number | 0, 10 |  |
|  |  |  |  | transportation_company | Shipping Company | text | YunDa, SF Express, YTO |  |
|  |  |  |  | transportation_id | Tracking Number | text |  |  |
| apply_return | Apply for After-Sales | Reported when applying for a return | Purchase Flow | return_type | After-Sales Type | text | Refund only, refund and return |  |
|  |  |  |  | apply_reason | Return Reason | text | Quality issue, don't like, slow shipping |  |
|  |  |  |  | application_id | Application Number | text | Number A, Number B, Number C |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | commodity_id | Product ID | text |  |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
|  |  |  |  | commodity_type | Product Category | text |  |  |
|  |  |  |  | original_price | Original Price | number |  |  |
|  |  |  |  | present_price | Current Price | number |  |  |
|  |  |  |  | size | Size | text | m, l, xl |  |
|  |  |  |  | commodity_amount | Product Quantity | number | 1, 10 |  |
|  |  |  |  | color | Color | text | Red, Yellow, Blue, Green, Black, White, Gray |  |
| return_result | After-Sales Application Result | Reported when the after-sales result is returned | Purchase Flow | return_type | After-Sales Type | text | Refund only, refund and return |  |
|  |  |  |  | apply_reason | Return Reason | text | Quality issue, don't like, slow shipping |  |
|  |  |  |  | application_id | Application Number | text | Number A, Number B, Number C |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | commodity_id | Product ID | text |  |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
|  |  |  |  | commodity_type | Product Category | text |  |  |
|  |  |  |  | original_price | Original Price | number |  |  |
|  |  |  |  | present_price | Current Price | number |  |  |
|  |  |  |  | size | Size | text | m, l, xl |  |
|  |  |  |  | commodity_amount | Product Quantity | number | 1, 10 |  |
|  |  |  |  | color | Color | text | Red, Yellow, Blue, Green, Black, White, Gray |  |
|  |  |  |  | return_result | After-Sales Result | text | Approved, Rejected |  |
| return_number | Fill After-Sales Tracking Number | Reported when filling in the shipping tracking number | Purchase Flow | return_type | After-Sales Type | text | Refund only, refund and return |  |
|  |  |  |  | apply_reason | Return Reason | text | Quality issue, don't like, slow shipping |  |
|  |  |  |  | application_id | Application Number | text | Number A, Number B, Number C |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | commodity_id | Product ID | text |  |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
|  |  |  |  | commodity_type | Product Category | text |  |  |
|  |  |  |  | original_price | Original Price | number |  |  |
|  |  |  |  | present_price | Current Price | number |  |  |
|  |  |  |  | size | Size | text | m, l, xl |  |
|  |  |  |  | commodity_amount | Product Quantity | number | 1, 10 |  |
|  |  |  |  | color | Color | text | Red, Yellow, Blue, Green, Black, White, Gray |  |
|  |  |  |  | transportation_company | Shipping Company | text | YunDa, SF Express, YTO |  |
|  |  |  |  | transportation_id | Tracking Number | text |  |  |
| finish_return | After-Sales Completed | Reported when after-sales is completed | Purchase Flow | return_type | After-Sales Type | text | Refund only, refund and return |  |
|  |  |  |  | apply_reason | Return Reason | text | Quality issue, don't like, slow shipping |  |
|  |  |  |  | application_id | Application Number | text | Number A, Number B, Number C |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | commodity_id | Product ID | text |  |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
|  |  |  |  | commodity_type | Product Category | text |  |  |
|  |  |  |  | original_price | Original Price | number |  |  |
|  |  |  |  | present_price | Current Price | number |  |  |
|  |  |  |  | size | Size | text | m, l, xl |  |
|  |  |  |  | commodity_amount | Product Quantity | number | 1, 10 |  |
|  |  |  |  | color | Color | text | Red, Yellow, Blue, Green, Black, White, Gray |  |
| personal_center | View Personal Center | Reported when entering the personal center page | Personal Center | entrance | Entrance | text | Homepage, Product Page |  |
| search_shop | Store Lookup | Reported when viewing the store lookup page | Personal Center |  |  |  |  |  |
| contact | Contact Customer Service | Reported when clicking contact customer service | Personal Center |  |  |  |  |  |
| click_order | View My Orders | Reported when clicking All Orders, To Pay, To Ship, To Receive, or Refund/After-Sales button on the personal center page | Personal Center | order_type | Order Type | text | All, To Pay, To Ship, To Receive, Refund/After-Sales |  |
| order_detail | View Order Detail | Reported when clicking to view order detail | Personal Center | order_statement | Order Status | text | To Pay, To Ship, To Receive, Refund/After-Sales |  |
|  |  |  |  | order_id | Order ID | text |  |  |
|  |  |  |  | order_amount | Total Order Amount | number | Total order amount including shipping |  |
|  |  |  |  | order_actual_amount | Actual Paid Amount | number | Actual paid amount |  |
|  |  |  |  | receiver_name | Receiver Name | text | User A, User B, User C, User D |  |
|  |  |  |  | receiver_province | Receiver Province | text |  |  |
|  |  |  |  | receiver_phone | Receiver Phone | text |  |  |
|  |  |  |  | receiver_city | Receiver City | text | Shanghai, Beijing |  |
|  |  |  |  | receiver_area | Receiver Area | text | Area A, Area B, Area C |  |
|  |  |  |  | receiver_address | Receiver Address | text | Address A, Address B, Address C |  |
|  |  |  |  | transportation_costs | Shipping Cost | number | 0, 10 |  |
|  |  |  |  | is_use_discount | Is Coupon Used | bool |  |  |
|  |  |  |  | coupon | Coupon | object | {"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"} | If an order can use multiple coupons, use the object group format |
|  |  |  |  | commodity_list | Order Product List | object group | [{"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"White"}, {"commodity_id":"xxx", "commodity_name":"xxx homewear", "commodity_type":"Homewear", "original_price":100, "commodity_jiao":500, "commodity_yuan":29.9, "size":"L", "commodity_amount":1, "color":"Black"}, ] |  |
| coupon_list | View Coupon List | Reported when viewing the coupon list | Personal Center | entrance | Entrance | text | Homepage, Product Page |  |
|  |  |  |  | available_coupon | Available Coupons | object group | [{"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"}, {"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"} ] |  |
|  |  |  |  | history_coupon | Historical Coupons | object group | [{"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"}, {"coupon_id":"xxx", "coupon_name":"July New Member Coupon", "coupon_discount":"85%", "coupon_type":"New Member Activity", "coupon_restiction":"Over 699", "use_method":"Online"} ] |  |
| coupon_detail | View Coupon Detail | Reported when viewing coupon detail | Personal Center | coupon_id | Coupon ID | text | 124534764 |  |
|  |  |  |  | coupon_name | Coupon Name | text | July New Member Coupon |  |
|  |  |  |  | coupon_discount | Coupon Discount | text | 5 yuan, 85% |  |
|  |  |  |  | coupon_type | Coupon Type | text | xx activity, birthday activity, new member activity |  |
|  |  |  |  | coupon_restiction | Usage Threshold | text | Over 699 |  |
|  |  |  |  | use_method | Usage Method | text | Offline, Online, Universal |  |
| receive_coupon | Receive Coupon | Reported when receiving a coupon | Personal Center | coupon_id | Coupon ID | text | 124534764 |  |
|  |  |  |  | coupon_name | Coupon Name | text | July New Member Coupon |  |
|  |  |  |  | coupon_discount | Coupon Discount | text | 5 yuan, 85% |  |
|  |  |  |  | coupon_type | Coupon Type | text | xx activity, birthday activity, new member activity |  |
|  |  |  |  | coupon_restiction | Usage Threshold | text | Over 699 |  |
|  |  |  |  | use_method | Usage Method | text | Offline, Online, Universal |  |
| search_bar | Click Search Bar | Triggered when clicking the search bar | Search |  |  |  |  |  |
| search_button | Click Search Button | Triggered when clicking the search button | Search | page | Page | text |  |  |
|  |  |  |  | key_word | Keyword | text |  |  |
|  |  |  |  | key_word_type | Keyword Type | text |  |  |
| search_result | Search Return Result | Triggered when receiving the result returned by the search request | Search | key_word | Keyword | text |  |  |
|  |  |  |  | key_word_type | Keyword Type | text | Hot word, history word, recommended word |  |
|  |  |  |  | result_number | Number of Search Results | number | 1, 200 |  |
| search_result_click | Click Search Result | Triggered when clicking a search result | Search | key_word | Keyword | text |  |  |
|  |  |  |  | key_word_type | Keyword Type | text | Hot word, history word, recommended word |  |
|  |  |  |  | position_number | Position Number | number | 1, 5 |  |
|  |  |  |  | commodity_id | Product ID | text | Product 1, Product 2, Product 3, Product 4, Product 5, Product 6 |  |
|  |  |  |  | commodity_name | Product Name | text |  |  |
| sale_page | Campaign Page Visit | Triggered when entering a campaign page | Campaign | sale_id | Campaign ID | text |  |  |
|  |  |  |  | sale_type | Campaign Type | text |  |  |
| sale_click | Campaign Page Click | Triggered when clicking a product on the campaign page | Campaign | sale_id | Campaign ID | text |  |  |
|  |  |  |  | sale_type | Campaign Type | text |  |  |
|  |  |  |  | click_position | Click Position | text |  |  |
|  |  |  |  | commodity_id | Product ID | text | Product 1, Product 2, Product 3, Product 4, Product 5, Product 6 |  |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #device_id | Device ID | text | Device-related ID (the ThinkingData SDK has its own logic for collecting device-related IDs, so if you want to record a project-specified device ID, it is recommended to record it as a custom property) | Preset property. Events collected using the client SDK can be ignored. The server side needs to obtain preset properties from the client and then report them. https://docs.thinkingdata.cn/ta-manual/v3.6/installation/pre_installation/preset_properties.html |  |  |  |
| #os | Operating System | text | ios, android |  |  |  |  |
| #os_version | Operating System Version | text | e.g., Android OS 9 |  |  |  |  |
| #system_language | System Language | text |  |  |  |  |  |
| #device_model | Phone Model | text | Model of the user's device, such as iPhone 8, etc. |  |  |  |  |
| #network_type | Network Status | text | Network status when uploading events, such as WIFI, 3G, 4G, etc. |  |  |  |  |
| client_version | Client Version | text | Client version number |  |  |  |  |
| channel | Channel | text | e.g., Juliang, Tencent Ads, etc. |  |  |  |  |
| vip_level | Member Level | text | lv1, lv2 |  |  |  |  |
| vip_points | Growth Points | number | 5000 |  |  |  |  |
| credit | Current Valid Points | number | 200 |  |  |  |  |
| credit_timelimit | Points About to Expire | number | 100 |  |  |  |  |
| Upload Instructions (please delete before uploading the file) |  |  |  |  |  |  |  |
| To ensure the tracking plan is successfully uploaded, please fill in according to the following value rules, and do not miss fields marked as "required" |  |  |  |  |  |  |  |
| Common event properties are properties applied to every event, no need to fill in [#Event Data]. Common event properties need to be set manually, see table [Common Event Property Setup Method] |  |  |  |  |  |  |  |
| Property Name: Starts with a letter, can contain numbers, letters, and underscores "_". Maximum 50 characters. Only preset properties support starting with #. |  |  | (See user manual preset properties and system fields for details) |  |  |  |  |
| Property Display Name: Maximum length 60 characters |  |  |  |  |  |  |  |
| Property Type: Values are number, text, time, bool, list, object, object group |  |  |  |  |  |  |  |
| Property Description: No more than 200 characters |  |  |  |  |  |  |  |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description | Property Tag |  |
| --- | --- | --- | --- | --- | --- | --- |
| gender | Gender | text | user_setOnce | Recorded when the user fills it in | Basic Properties |  |
| birthday | Birthday | time | user_setOnce | Recorded when the user fills it in |  |  |
| country | Country | text | user_set | Overwrite on update |  |  |
| province | Province | text | user_set | Overwrite on update |  |  |
| city | City | text | user_set | Overwrite on update |  |  |
| email | Email | text | user_set | Overwrite on update |  |  |
| phone_number | Phone | text | user_set | Overwrite on update |  |  |
| open_id | Mini Program openid | text | user_set | Overwrite on update |  |  |
| union_id | union_id | text | user_setOnce | Recorded on first launch of the mini program |  |  |
| channel | Registration Channel | text | user_setOnce | Recorded on first visit |  |  |
| member_id | Member ID | text | user_setOnce | Recorded when registering as a member | Member Properties |  |
| vip_name | Member Name | text | user_set | Overwrite on update |  |  |
| vip_level | Growth Level | text | user_set | Overwrite on update |  |  |
| vip_points | Growth Points | number | user_set | Overwrite on update |  |  |
| credit | Current Valid Points | number | user_set | Overwrite on update |  |  |
| credit_timelimit | Points About to Expire | number | user_set | Overwrite on update |  |  |
| register_time | Registration Time | time | user_setOnce | Recorded at registration | Time Properties |  |
| first_order_time | First Order Time | time | user_setOnce | Recorded at first order |  |  |
| last_order_time | Last Order Time | time | user_set | Overwrite on update |  |  |
| cumulative_payment | Cumulative Consumption Amount | number | user_set | Overwrite on update | Consumption Properties |  |
| cumulative_order | Cumulative Purchase Count | number | user_set | Overwrite on update |  |  |
| Upload Instructions (please delete before uploading the file) |  |  |  |  |  |  |
| To ensure the tracking plan is successfully uploaded, please fill in according to the following value rules, and do not miss fields marked as "required" |  |  |  |  |  |  |
| Property Name: Starts with a letter, can contain numbers, letters, and underscores "_". Maximum length 50 characters |  |  |  |  |  |  |
| Property Display Name: Maximum length 60 characters |  |  |  |  |  |  |
| Property Type: Values are number, text, time, bool, list, object, object group |  |  |  |  |  |  |
| Update Method: Values are user_set, user_setOnce, user_add, user_append |  |  | See user manual data rules for details |  |  |  |
| Property Description: No more than 200 characters |  |  |  |  |  |  |
| Property Tag: Used to classify and manage properties. Multiple tags should be separated by "," |  |  |  |  |  |  |


## Data Type Design Principles

|  | The TA system currently supports the following data types. The field type within the system is determined by the type at first import, so it is recommended to focus on confirming the related field types during tracking |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  | TA Data Type | Value Example | Value Description | JSON Data Type | Recommended Scenarios |
|  | number | 123, 1.23 | Data range is -9E15 to 9E15, with up to 3 decimal places | Number | 1. Properties with numerical computation scenarios (sum, median, mean, etc.), such as recharge amount, diamond consumption, level completion time (seconds), level, etc. 2. ID-related properties where the ID order is positively correlated with numerical magnitude, such as level ID, server ID, etc. If such IDs are not purely numerical, treat them as text 3. Continuing, for user-related IDs such as role IDs, although they may consist of all digits, they have no numerical meaning themselves and may be very long, so it is recommended to treat them as text |
|  | text | "ABC", "Shanghai" | The default character limit is 2KB | String | For properties that do not fit other types, text type can be considered, including some complex types currently not supported by TA, such as map types |
|  | time | "2019-01-01 00:00:00", "2019-01-01 00:00:00.000" | "yyyy-MM-dd HH:mm:ss.SSS" or "yyyy-MM-dd HH:mm:ss". To represent a date, you can use "yyyy-MM-dd 00:00:00" | String | Such as registration time, first recharge time, monthly card expiration time, etc. |
|  | bool | true, false | - | Boolean | Such as whether first-time level completion, whether paying user, etc. |
|  | list | ["a", "1", "true"] | Elements in the list are all converted to text type | Array(String) | Such as combat card IDs ["Guan Yu", "Zhang Fei", "Zhao Yun"], user tags ["high-paying user", "potential churn user"] |
|  | object | {"item_name":"Hero Fragment","item_num":5} | Must comply with the value rules of sub-properties. For example, if the sub-property is text, its value must comply with the default character limit of 2KB | Object | / |
|  | object group | [ {"item_name":"Hero Fragment","item_num":5}, {"item_name":"Skin Fragment","item_num":2}, {"item_name":"Glory Points","item_num":10} ] | Must comply with the value rules of sub-properties. For example, if the sub-property is text, its value must comply with the default character limit of 2KB | Array(Object) | For example, in a battle with multiple characters, the object type property can contain multiple sub-properties of different types, used to describe the name, star rating, combat power, etc. of a hero; the object group type can express multiple object types as an array in a single field to describe the entire combat lineup. |


## Common Event Property Setup Method

|  | Common event properties are properties that all (or most) events have |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | When using the Server SDK or data import tool to report data, simply manually set the user's common event properties;  When using the Client SDK to report data: For common properties that change, such as level, current maximum level, etc., it is recommended to use the "dynamic common properties" method to ensure the correctness of the property value at the time of reporting.  Common event properties will be saved in the cache, no need to call every time the App starts. If setSuperProperties: is called to set a previously set common event property, it will overwrite the previous property. If a common event property has the same Key as a property uploaded via track:properties:, the event's property will overwrite the common event property.  Note that after the user logs out, in addition to calling the logout method, you may also need to clear the currently set common event properties that depend on the account. To delete a common event property, you can call the unsetSuperProperty method. If you want to clear all common event properties, you can call clearSuperProperties.  Android SDK setup method: https://doc.thinkingdata.cn/tdamanual/installation/android_sdk_installation.html#b%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  iOS SDK setup method: https://doc.thinkingdata.cn/tdamanual/installation/ios_sdk_installation.html#b-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  JS SDK setup method: https://doc.thinkingdata.cn/tdamanual/installation/javascript_sdk_installation.html#c-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  Unity SDK setup method: https://doc.thinkingdata.cn/tdamanual/installation/unity_sdk_installation.html#33-%E8%AE%BE%E7%BD%AE%E5%8A%A8%E6%80%81%E5%85%AC%E5%85%B1%E5%B1%9E%E6%80%A7  Flutter SDK setup method: https://doc.thinkingdata.cn/tdamanual/installation/flutter_sdk_installation.html#32-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7  Mini Program/Mini Game SDK setup method: https://doc.thinkingdata.cn/tdamanual/installation/mp_sdk_installation.html#332-%E8%AE%BE%E7%BD%AE%E5%8A%A8%E6%80%81%E5%85%AC%E5%85%B1%E5%B1%9E%E6%80%A7 |  |  |  |  |  |  |  |  |  |  |  |  |  |


## Multi-End Integration Considerations

|  | The TA system supports multi-end data integration, such as client-side, server-side, and third-party data, and can integrate multi-end data into the same project to solve the data silo problem. However, there are the following considerations in the process, please pay attention before integration |
| --- | --- |
|  | 1. User ID matching issue:        In the process of multi-end data integration (using server + client as an example below), we need to ensure that the user's data at multiple ends can be accurately associated. This involves the issue of user ID association matching. Generally speaking, client-side data habitually uses device ID, and server-side uses account ID to mark users. When data from both ends is imported into the system according to the above logic, due to the different naming rules of the two IDs, two new users will be generated upon receiving the above data, causing the behavior of the same user at multiple ends to be unable to be associated. Based on the TA system's user identification rules, it is recommended to design the user ID during tracking in the following ways. a. Only record user behavior after login, because after the user logs in, an account ID is generated. At this time, whether it is client-side data or server-side data, set #account_id to the account ID to complete the association of the user's multi-end behavior b. Users will also generate behavior without logging in, and from a business perspective, we hope to pay attention to it. TA supports the association of visitor behavior and login behavior, but due to multi-end tracking, the order in which multi-end tracking data arrives cannot be theoretically guaranteed, so special design is needed to set #account_id as the business ID after login, such as account ID / role ID, etc., and #distinct_id as the device-based ID, such as device ID, custom visitor ID, etc. Whether it is client-side data or server-side data, #distinct_id needs to be guaranteed to have a value in any scenario. When the service generates data, it has already communicated with the client, so the user's device ID (the #distinct_id in client-side data) can be passed back to the server, so that the server can assign a value when triggering tracking data |
|  | 2. Time order issue:        Since the time at each end may not be unified during multi-end tracking, such as the client-side tracking taking local time while the server-side takes server-side time, there may be a time difference between the two ends. This may cause data that actually has a sequential relationship to end up with disordered sequential relationships when finally landing as data, because they are generated separately on the client and server sides. For example, initiating recharge (client) is later than recharge completion (server) For the above situation, in addition to recommending that consecutive events be tracked on one end as much as possible, it is also recommended to solve it in the following ways a. No multi-time-zone issue: Then it is recommended that the client-side request the current server time from the server during initialization, and use this time as the standard time for client-side data collection, avoiding the time difference between the client and server. In addition, if the server involves multiple servers, there will be clock synchronization issues between the servers themselves. Time synchronization can be achieved through some clock synchronization components b. There is a client-side cross-time-zone issue: In such a scenario, the client and server may have different time zones, resulting in inconsistent times when collecting data from both ends. In such a case, if multi-time-zone analysis is sensitive, it is recommended that server-side data follow the client-side time zone, that is, the server-side tries to obtain the client-side time zone and set the #time field to the current timestamp in that time zone |
|  | 3. Event and common event property design: Without special requirements, it is not recommended to collect events with the same meaning at multiple ends simultaneously to avoid data redundancy. For common event properties, such as level, channel, server, etc., it is recommended to include them in multi-end data. If only one end sets these common event properties, the TA system will not automatically complete them, which will lead to the problem of property misalignment in subsequent analysis |
