# Standard Base - Multi-Platform Integration Notes

> Source: Feishu sheets `M71zsVFKihDEKXtZJjZcOkAvn5b` / sheet "Multi-Platform Integration Notes", cached on 2026-09-20. The cloud copy is the authoritative version; the cloud takes precedence on conflict.

| The TA system supports multi-platform data integration, such as client-side, server-side, and third-party data, and allows multi-platform data to be integrated into the same project, solving the data silo problem. However, there are the following points to note; please pay attention before integration. |
|---|
| 1. ID matching: |
| Client-side data must have the guest ID uploaded. When uploading from the server-side, it is recommended to also carry the guest ID to ensure the data from both sides can be matched (when reporting, carry the ID; the system will map them during ETL). |
| Because we cannot be certain whether the first record where [`#account_id` and `#distinct_id`] appear [together] comes from the client-side or the server-side, the safest way is: when both IDs can be obtained, have both sides carry both IDs when reporting. |
| 2. Timezone reporting: |
| 2.1 Recommended plan: report using local time + timezone |
| 2.2 Client-side SDK: By default, uses local machine time + timezone as the event occurrence time; you can also specify an offset to a certain timezone before reporting; see the SDK docs for configuration. |
| 2.3 Server-side SDK: You need to set the timezone field yourself. |
| (If the server cannot obtain the client's local time, report using the server's timezone.) |
| 3. Notes on server-side reporting |
| 3.1 When reporting data from the server, the `#time` field should be set to the event occurrence time, and `#ip` should take the client's IP. |
| // Set the user's IP address. The TA system will parse the user's geographic location based on the IP address; if not set, it will not be reported by default. |
| properties.put("#ip", "192.168.1.1"); |
| 3.2 In production, we recommend reporting via server-side SDK + logbus (LoggerConsumer method); if using the batch reporting method, data may be lost during long network outages. |
| 4. Server-side property issues |
| 4.1 Issue of server-side being unable to obtain preset properties: |
| a. If server-side-reported events do not need these preset properties for analysis, the server-side can choose not to report them. |
| b. If server-side-reported events need some common properties (preset properties) for analysis, you need to communicate with the client-side to obtain these properties and then report them. |
| 4.2 ThinkingData does not automatically fill in common event properties across both sides, so both front-end and back-end need to pay attention to carrying the necessary common event properties. |
| 5. Client-side time calibration |
| By default, the SDK uses the local machine time as the event occurrence time. If the user manually modifies the device time, it will affect your business analysis. Starting from v2.5.0, you can use the current timestamp obtained from the server to calibrate the SDK's time. After that, all calls that do not specify a time, including event data and user property setting operations, will use the calibrated time as the occurrence time. |
| https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_advanced/android_sdk_advanced.html#_6-3-%E6%A0%A1%E5%87%86%E6%97%B6%E9%97%B4 |
