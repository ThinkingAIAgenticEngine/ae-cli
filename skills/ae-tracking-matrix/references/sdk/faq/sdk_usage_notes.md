# SDK Usage Notes

# I. Client SDK

1. **Upload Mode**

- Use `Normal` mode in production environment;
- `Debug` and `Debug_Only` modes are only for testing phase debugging, do not use in production environment and formal phase;

2. **Cache Upload Strategy**

- Android, iOS native SDK and game engine SDK and cross-platform SDK that call Android, iOS SDK at the underlying layer, default adopt data cache and batch upload strategy, upload timing defaults to 30 records/30 seconds, i.e. device local cache reaches 30 records or every 30 seconds triggers data upload. Can adjust upload frequency in TE Web "Project Management" page, but if upload too frequently (e.g. 1 record/1 second) will cause client system CPU, memory, network etc. overhead increase, causing device overheating, lagging etc. issues.
- JS, Mini Game/Mini Program SDK default don't enable local cache, data will directly upload, also can enable local cache and batch upload function in SDK settings;
- For native SDK, in Normal mode, calling `track()` method won't immediately trigger data upload, will upload according to cache upload strategy; if want data immediately uploaded, can call `flush()` method to trigger.

3. **Upload Failure Handling**

- For enabled local cache situation, failed upload data will be saved locally and re-uploaded when next upload condition triggers;
- If local cache not enabled, can customize handling for upload failure via callback, avoid data loss;

4. **Property Type**

- For TE preset properties (e.g. `#account_id`, `#time`, `#ip` etc.), property type is TE system fixed setting, preset property list see Preset Properties and System Fields.
- For custom properties (properties other than TE preset properties), property type is TE system auto-recognized based on property value, first record carrying that property's property value determines property type;
- If uploaded data property value doesn't match TE system property type, system will attempt forced conversion, if conversion succeeds property will be stored, if conversion fails **that property will be discarded**;
- Recommended to pay attention to exception storage in upload management, timely identify abnormal data and fix; if have high requirement for data quality, can also upload tracking plan, and refer to project data processing rules setting data processing rules, ensure property type matches expectation;
- Metadata management tool supports modifying property type, note, **after type modification property value will be cleared to NULL**.

5. **Time Calibration**

- Recommended to enable time calibration function, avoid data time deviation due to device system time inaccurate, affecting subsequent analysis;
- Client upload, TE receives data within 10 days before to 3 days after time range, data exceeding time range **will be discarded**;
- Only need to do time calibration once after SDK initialization, don't need multiple calibrations;
- Time calibration method recommended prioritizing use of server timestamp calibration, if failed then use NTP calibration as backup, don't use both methods simultaneously.

6. **Auto-tracking Events**

- After SDK initialization recommended to enable auto-tracking immediately after completing time calibration, to timely generate `ta_app_install` `ta_app_start` etc. auto-tracking events, avoid auto-tracking event generation lag;

7. **Sensitive Information Collection**

- Due to legal requirements, usually need to show privacy policy to user and obtain permission before initializing TE SDK to enable data collection,please follow each country's laws and each app store's requirements to disclose and collect sensitive information;
- Android SDK will collect `Android ID` etc. information, can set to block in configuration file.

8. **Key Data Upload**

- Payment, order generation etc. key data recommended to upload from server-side, avoid client upload delay or loss;
- Important data uploaded from client can call `flush()` to immediately trigger upload.

9. **Application Going Overseas**

- If application is deployed overseas, recommended TE cluster deploy nearby, avoid crossing firewalls etc. reasons affecting data upload;
- If application is globally deployed, or data needs to upload from overseas to TE cluster deployed domestically, recommended to deploy one or multiple relay points near application main deployment regions, avoid data loss and delay;
- For SAAS customers, TE SAAS has already deployed relay points in multiple locations globally, please use TE SAAS overseas upload address `https://global-receiver-ta.thinkingdata.cn`.

# II. Server SDK

1. **Upload Mode**

- Server SDK recommended to use LoggerConsumer combined with Logbus upload, avoid data loss;
- If using BatchConsumer need to handle upload failure returned exception,some SDKs do not return exceptions, refer specifically to[SDK code](https://github.com/ThinkingDataAnalytics);
- Formal environment cannot use DebugConsumer;

2. **Cache Upload Strategy**

- Due to performance reasons, LoggerConsumer batch writes data to file, BatchConsumer batch uploads data;
- BatchConsumer calling `track()` won't immediately trigger upload, for key data needing immediate upload can call `flush()`;

3. **Upload Failure Handling**

- For upload failure caused by network fluctuation, BatchConsumer will retry upload 3 times, after 3 failures will discard data and return error message, need to handle error yourself,see each SDK source code for details;
- Using BatchConsumer if network long time interruption, when cached data count exceeds cache buffer limit (batch\*max_cache_size), will start discarding earliest data, **causing cached data loss**;

4. **Close SDK**

- When program exits need to close SDK, otherwise will **cause cached data loss**;
- Server abnormal restart causing SDK abnormal exit, will **cause cached data loss**;
- Different SDK close methods differ, e.g. `close()`, `ta_free()`,see SDK interface documentation for details;

5. **Common Properties and Dynamic Common Properties**

- Common properties function suitable for client SDK collecting user-level information, server SDK not recommended to use common properties function;

6. **IP, Country, Region Information**

- TE data in country region information parsed based on data ip information, client upload TE will auto obtain and store IP information, server upload needs to add "#ip" in data for TE to process;

7. **Multi-threading and Multi-process**

- Server SDK basically all support multi-threading, `track()` method will do lock processing, can confirm via SDK source code;
- For multi-process situation, if using LoggerConsumer, each process data needs to write to independent file or independent folder, if writing to same file will **cause data disorder**;

8. **Timezone Information**

- Client SDK uploaded data will auto have device system timezone information, server SDK data needs to manually add "#zone_offset" property to upload timezone information.

# III. Multi-platform Upload

For common issues and solutions in multi-platform upload scenarios see Multi-platform Upload Best Practices.

1. **User ID Consistency**

- When uploading from multiple platforms, need to ensure same user data `#distinct_id` and `#account_id` consistent, otherwise may **cause user fragmentation**;
- If using single account multi-device analysis system, need to ensure data `#account_id` same and data contains `#distinct_id`, avoid user being fragmented into multiple TE users;

2. **Multi-platform Time Alignment**

- Client SDK will upload timezone offset "#zone_offset", default takes device system timezone,some SDKs support parameter specification;
- Server SDK won't auto upload timezone offset "#zone_offset", needs to manually add upload in properties.

3. **Avoid Duplicate Upload**

- Avoid multi-platform uploading same event, causing data duplication

4. **Key Data Upload**

- Payment, order generation etc. key data recommended to upload from server-side, avoid client delay or loss.
