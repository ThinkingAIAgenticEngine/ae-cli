# Diagnosis Knowledge Base

Each validation anomaly → possible cause → fix plan. Sourced from the Feishu document "Validation Result Interpretation" and actual validation experience.

---

## Large-scale missing account_id

**Prerequisite**: confirm the identity design and which events require a logged-in account. No-account/guest-only products may legitimately have 100% empty `#account_id` when `#distinct_id` is valid (E1); this alone is not High. Unknown identity requirements are TBC. Both IDs absent is a separate identification defect.

**Conditional anomaly**: high account-ID null rates on events confirmed to require an account; report the eligible population, not every event indiscriminately.

**Possible causes**:
- Server-side reported events do not carry account_id
- The client did not call `login()` / `identify()` after login
- The account_id field name is mapped incorrectly
- **Online / device_active snapshot events not containing account_id is normal design** — these events aggregate by heartbeat/device dimension and are not associated with a user account

**Suggested fixes**:
- First confirm the event type: snapshot events (online, device_active) may be empty
- Require account_id only where the confirmed product identity and event contract require it; event names alone do not prove an account exists.
- The server passes through the client's account_id after login
- Check whether the SDK called `login(account_id)` after a successful login
- Confirm the account_id field name is spelled correctly in the event properties

---

## distinct_id missing (server-side)

**Anomaly**: `#distinct_id` is empty in server-side reported events (Server_SDK / Import_Tools).

**Possible causes**:
- The server did not pass through the client-generated distinct_id when reporting
- Server-generated events do not carry a device identifier

**Suggested fixes**:
- The client reports the SDK-generated distinct_id to the server
- The server includes distinct_id when reporting events, ensuring events from the same device before and after login can be associated with the same user
- The only case where distinct_id is not passed: aggregate events produced by purely server-side offline computation

---

## Large-scale missing zone_offset

**Anomaly**: The `#zone_offset` null rate is high for non-client data sources (Restful_API, Server_SDK).

**Possible causes**:
- Server-side reporting does not carry the timezone offset
- The import tool did not map the timezone field

**Suggested fixes** (choose one):
1. **Conventional approach**: The server assigns the server's local time to `#time`, and the server's timezone to `#zone_offset`
2. **When local time analysis is needed**: Pass through the client's `#event_time` and `#zone_offset` (preserving the user's original timezone)

---

## IP entirely null

**Anomaly**: The `#ip` field is NULL for all events, and all geo information is empty.

**Possible causes**:
- Restful_API / Server_SDK did not pass IP
- Third-party data (ad attribution) does not carry IP (expected)
- Deliberately not passed for privacy compliance reasons

**Suggested fixes**:
- If geo analysis is needed: the server records the client IP and assigns it to `#ip`
- If geo analysis is not needed: an empty IP is acceptable; just note it in the report
- Note: about 10% of IPs in the third-party IP database cannot be fully resolved, which is within the normal range

---

## Event latency anomaly

**Anomaly**: Median latency > 1 hour, or maximum > 24 hours, or the minimum is negative with a large absolute value.

**Possible causes**:
- **Negative latency**: the client clock is ahead of the server clock; the user modified the local time and time calibration is not enabled → enable time calibration in the SDK
- **Large positive latency**: data pipeline backlog, overly long batch interval, ETL latency
- **Large positive/negative fluctuation**: mixed multi-timezone data, inaccurate zone_offset correction

**Suggested fixes**:
- Enable `enable_time_calibration` (time calibration) on the SDK side
- Check whether the data pipeline has a backlog (check ingestion latency in the reporting statistics)
- Ensure `#zone_offset` is assigned correctly in all events

---

## ta_app_start/end not paired

**Anomaly**: The gap percentage between start_cnt and end_cnt > 20%.

**Possible causes**:
- The user force-killed the process, causing the end event to be lost
- The SDK version is too old, and end event collection is unstable
- Some platforms (such as mini-games) do not support the end event

**Suggested fixes**:
- Upgrade the SDK to the latest version
- If the gap < 30% and on mobile, it is within a reasonable range (process kills are unavoidable)
- Contact ThinkingData SDK technical support for further investigation

---

## ta_app_install anomaly

**Anomaly**: ta_app_install and ta_app_start did not trigger in sequence within 5 seconds.

**Possible causes**:
- SDK initialization timing is too late (e.g., only initialized after the user agrees to the privacy policy)
- Network anomaly on first launch causes delayed reporting of the install event
- The SDK's auto-collection behavior was customized

**Suggested fixes**:
- Ensure the SDK initializes as early as possible in Application.onCreate()
- When the problem percentage > 1%, contact ThinkingData SDK technical support
- Check whether special logic delayed SDK initialization

---

## Abnormal uid (one aid/did mapping to many)

**Anomaly**: The same `#account_id` or `#distinct_id` maps to multiple `#user_id` values.

**Possible causes**:
- After a user_del operation, the ID mapping in MySQL is deleted, and the user record in Kudu is deleted
- The stale ID mapping in the ETL cache is not invalidated, and the cached mapping generates a deleted `#user_id`
- After the cache expires, the same user is ingested again, the mapping is not found in MySQL, and a new `#user_id` is generated

**Suggested fixes**:
- This issue usually requires TE technical support intervention
- Check whether a user_del operation is concurrent with normal data ingestion
- Avoid user_del + re-ingestion of the same user within the ETL cache TTL

---

## Events have no SDK data at all

**Anomaly**: All events come from Restful_API, and SDK preset events such as ta_app_start/end are 0 within the date range.

**Diagnosis**: The project is purely server-side integrated; the client SDK is not installed or data is not flowing in.

**Suggestions**:
- Confirm whether client SDK data is needed
- If yes → install the SDK and confirm the app_id is configured correctly
- If no → note it in the report, and the following checks can be skipped: S5, S6

---

## ID identification fragmentation

**Anomaly**: `#distinct_id` and `#account_id` appear independently (a did first reports several events alone, then the same aid also reports alone), causing the same user to be assigned multiple `#user_id` values.

**Scenario 1**: The client first reports events carrying only did → user_1; then the server reports the first event carrying account_id (without did) → user_2.

**Scenario 2**: The server first reports an event carrying only account_id → user_3; then the client reports an event carrying only did → user_4; after the same device logs in with account_id it should be user_3 but may actually differ.

**Fix directions**:
1. The client reports distinct_id to the server, and the server includes distinct_id when reporting
2. The first event carrying account_id is reported from the client (not the server)
3. Ensure key events such as login/register carry both did and account_id

**Deep investigation**: 🚩 Guide the user to call the `te-user-id-debug` skill for event-sequence-level fragmentation analysis.

---

## Large-scale missing event properties

**Anomaly**: Multiple custom properties of an event have a null rate > 70%, especially key business properties (such as `card_type`, `diamond_num`, `duration`, etc.) are largely empty.

**Possible causes**:
- The property value was not filled when the event was reported (code omission)
- The property name is misspelled (the reported name differs from the name registered in TE)
- The property only has a value under specific conditions (e.g., `card_type` is only filled for card-related actions)
- Server-side events do not carry client-side properties (such as `device_id`, `client_type`) — this is normal design

**Judgment method**:
1. First check the event's data source (S1/S12): a purely server-side event missing `device_id`/`client_type`/`device_model` is normal
2. The same property is null across multiple events → likely an overall integration problem
3. Only a specific event's property is null → likely an omission in that event's reporting logic

**Suggested fixes**:
- Confirm whether the property is a required property for that event
- Check whether the reporting code correctly fills the property value
- If the property only has a value under specific conditions, confirm whether the null rate matches business expectations
- A server-side event not carrying client-side properties is acceptable; just note it in the report

---

## Uneven cross-event property coverage

**Anomaly**: The same property (such as `ip`, `device_id`) is 100% present in some events but 100% null in others.

**Possible causes**:
- Different events have **different reporting sources** (client SDK has `device_id`, server SDK does not)
- Different events have **different reporting timing** (properties only available after login cannot be carried by pre-login events)
- Different events have **different business meaning** (transaction events have amount properties, social events do not)

**Suggested fixes**:
1. First confirm each event's `#data_source` to distinguish client-side and server-side reporting
2. Server-side events should pass through client-side properties (`device_id`, `ip`, etc.) as much as possible
3. Business-differentiated properties (such as `diamond_num` only for transaction events) are normal
4. In the report, show property coverage grouped by data source to make anomaly patterns easier to identify

---

## data_source entirely null

**Anomaly**: The `#data_source` field is null for all events, unable to distinguish client/server data.

**Possible causes**:
- The `#data_source` field was not set when reporting
- An old SDK version or a custom reporting method is used

**Suggested fixes**:
- Correctly set the `#data_source` field when reporting events (such as `Native_SDK`, `Server_SDK`, `Restful_API`, `Import_Tools`, etc.)
- This not only facilitates data quality monitoring, but is also the basis for subsequent per-data-source troubleshooting

---

## Event property null rate threshold reference

| Property type | Property examples | Reasonable null rate | Description |
|---------|---------|-----------|------|
| Device property | `device_id`, `device_model`, `device_carrier` | Client 0%, server 100% | Purely server-side events having no client properties is normal |
| Geo location | `ip`, `geo_country`, `reg_country` | < 10% | Should not be null if the server passed through IP |
| User identifier | `uid`, `login_session_id` | Pre-login events 100%, post-login 0% | Distinguish pre-login vs post-login |
| Business property | `diamond_num`, `card_type`, `duration` | Depends on the business scenario | Confirm one by one: whether it only has a value in specific scenarios |
| Time property | `event_time`, `dt` | 0% | All events should carry it |
| Source property | `traffic_source`, `install_source`, `campaign_source` | Depends on the attribution plan | The server may be unable to obtain attribution parameters |
