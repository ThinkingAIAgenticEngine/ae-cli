# Tracking Plan Optimization and Acceptance Checklist

Check item by item before delivery, with the [15 business-semantic checks](business-semantic-checks.md). This is manual/model-assisted review, not implemented automatic business scoring. Issues must be fixed with confirmation or explicitly recorded as TBC/change log; unresolved blockers are not accepted merely because lint passed.

## 1. Product and Requirements

- The product type, core loop, key business objects, and revenue model are clarified.
- States such as start, process, success, failure, exit, cancel, timeout, and retry are covered.
- Every analysis requirement has a clear metric definition, event, property, and join key.
- Ratio metrics have both a valid numerator and denominator event.
- The dedup subject is clear: user, device, session, order, story attempt, or other entity.
- Group-by dimensions such as platform, channel, version, and region have reliable data sources.
- Data that cannot be obtained is not written as directly analyzable; for example, do not promise Campaign click volume when no ad platform is integrated.
- The definitions of gifting/redemption/mail claim are confirmed (single/batch, request-result/single event, failure enum), or explicitly written into the items to confirm.

## 2. Events

- Event names are lowercase snake_case, start with a letter, and are at most 50 characters.
- An event expresses a clear business fact, and does not use vague `click`, `info`, or `send` without specifying the object or result.
- Impression, request, and result events all have an actual analysis purpose, and are not mechanically generated in pairs.
- Low-frequency operations such as redemption/claim use a result single event + `fail_reason`, and the click is not a separate event when there is no independent analysis need.
- For death/failure chains, if the "settlement page → retry/return" funnel needs analysis, the settlement page display events are added; do not mechanically generate them when there is no such analysis need.
- One business operation is not double-counted by the client and server.
- Batch operations clearly state "one operation one event" or "one event per entity", and are consistent with the analysis definition.
- Key chains have a stable instance ID with clear generation and reset rules.
- Success/failure events or result enums can cover partial success, cancel, timeout, and interruption.
- Trigger timing can be implemented by R&D; avoid vague descriptions such as "report on entry" or "report when it changes".

## 3. Property Registry

- Within the same Sheet, the same English property name corresponds to the same user-language display name, type, definition, unit, and enum.
- Same-named fields across Sheets have no meaning conflicts.
- There are no synonym fields with different names; if aliases are kept, there is a compatibility note in the change log.
- ID uses `_id`; boolean prefers `is_`/`has_`; count uniformly chooses one of `_num`, `_count`, or `_amount` that fits the semantics, without mixing.
- Rank uses `_rank` or `_position` and is unified; duration has a clear unit and is preferably written into the description.
- Amount has a clear currency and smallest currency unit; rate uses a numeric value rather than `1x` text.
- The responsibilities of `result/status/type/reason/scene/source` are not mixed.
- Example values conform to the type, enum, and null rules.

## 4. Composite Types

- Lists only carry same-type scalars.
- Objects are used for a single fixed-structure entity; object groups are used for entity collections with a variable count.
- Each object group item contains at least the necessary fields to express the entity.
- When the same parent object group is reused across events, the sub-property structure is completely identical.
- Object groups expand by real business granularity; for example, in "mail × reward", repeat `mail_id` when the same mail has multiple rewards.
- Batch operations such as batch claims preserve per-entity association, and the rewards of each mail can be located within the object group.
- Same-named object groups with different structures have been split (e.g., `mail_reward_items` / `shop_reward_items`), with no forced field-filling to achieve reuse.
- Failure reasons are placed at the correct level; a whole-batch failure goes at the event top level, and only per-item failures go inside the detail object.
- No commas, colons, or semicolons are used to concatenate data that should be structured.

## 5. AE/TE Alignment

- System fields such as `#account_id`, `#distinct_id`, `#time`, and `#uuid` are not custom-reported.
- Device, system, and APP version fields are deduplicated against SDK preset properties.
- Auto-collected events are added only when the user allows and technical integration supports it.
- User property operation types match the semantics of first value, current value, accumulated value, and list.
- Attribution fields do not pollute all events as common event properties.
- The data types of events and user properties conform to the AE/TE supported range.
- The reporting responsibility, timing, and dedup strategy of server and client are clear.

## 6. Workbook and Differences

- The original file is not overwritten.
- When the user selects Excel, final delivery has the complete 11 sheets from the repaired v2.0.1 Chinese template, official nine-column event schema and required header suffixes; seven instruction sheets are unchanged. Direct-sync deliveries instead retain canonical JSON plus structured payload/dry-run evidence and contain no workbook. Nonstandard source inputs are preserved separately.
- Merged cells, column widths, line breaks, borders, and frozen regions are readable.
- New/modified cells are identified in a separate diff artifact/conversation; optional light-orange review marking must not change the strict-delivery template styles.
- Unmodified content is not mistakenly marked.
- Deleted, merged, and deprecated items all go into the change log.
- Items to confirm are separated from the formal plan.
- After searching the whole table for old names, typos, and spelling errors, none remain.

## 7. Analysis Acceptance

- DAU, retention, payment, and feature participation can all give a concrete calculation path.
- Every core funnel can determine order, time window, denominator, and dedup subject.
- At least three core chains are spot-checked, and legal sample reported data is provided.
- Changed events and properties are re-mapped to analysis requirements, without carrying over stale mappings.
- All "analyzable" conclusions have data source support.
- E1: `ad_fail` and full IAA closure are explicit; unavailable revenue is marked requires ad-platform callback / TBC, not invented.
- E2: `first_media_source` / `first_campaign` use user_setOnce; media_source/campaign event snapshots and current_* updates are distinct and not globally common by default.
- Actual distinct event counts reconcile canonical JSON, Excel event blocks, review report and online view; styled rows/property rows are not event counts.
- Conversation is shown first and is reviewable in-session. After review, the user chooses direct structured sync or a local Excel; neither branch generates an unrequested workbook. Any Excel comes from the same JSON, and any structured payload preserves the same events, properties, types and collection sides. Replies and authored business descriptions follow user language; fixed Chinese template labels are not advertised as an all-English workbook.
- First-run strict lint and repaired-final results are reported separately. Confirm before save-as repairs; originals remain unchanged.
- All 15 semantic review items have evidence/disposition; pending review is not upload-ready. Only [Validated Upload](workflows/validated-upload.md) handles the later single scoped confirmation, with no implicit deletion/overwrite or invented UI button.
