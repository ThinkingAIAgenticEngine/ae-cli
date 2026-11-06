# Category Template · interactive_video Interactive Film Game

> Source: Bocai "Interactive Film Game" field retrospective (tracking.md) + "Lies" AE/TE tracking plan optimized version (benchmark 63.6% sample).
> Answers "what to track": business model → core events → join keys → object groups → metric mapping → attribution → confirmation questions → pitfall checklist.

## 1. Category Identification

**Keywords**: interactive film game, interactive drama, interactive movie, live-action interactive, storyline choice, branching storyline, multi-ending, FMV, visual novel, short drama interactive.

**Differentiation from similar categories**:

- vs short drama (short_drama): Short drama is "watch", interactive film game is "choose" — has choice options, QTE, multi-endings, affinity
- vs RPG: RPG has battle/equipment loops; interactive film game's core loop is "storyline node → choice → state change → ending"

## 2. Core Business Model

```
Storyline session (strung together by story_session_id)
  Attempt start → Content load (success/fail) → Playback control (pause/skip/speed)
    → Option exposure → Option selection → [QTE display → QTE result]
    → Storyline failure (death) → Death settlement → Retry/return
    → Chapter complete → Ending reached → Full game clear
Side lines: Character affinity cultivation / Gifting / Collection unlock / Achievement / Mail / Shop / Leaderboard / Personality test (MBTI)
Payment: Unlock chapter/ending/item → Initiate payment (client) → Payment result (server)
```

**Hierarchy must be confirmed first**: chapter > node > interaction point (Choose / QTE are two different types of interactions, cannot share the same field).

## 3. Core Event List (Storyline module is the soul of the category)

| Module | Event Name | Display Name | Owner | Necessity |
|-|-|-|-|-|
| Storyline | story_session_start | Storyline Attempt Start | Client | Must |
| Storyline | story_content_load_result | Storyline Content Load Result | Client | Must |
| Storyline | story_playback_control | Storyline Playback Control | Client | Recommended |
| Storyline | story_option_exposed | Storyline Option Exposure | Client | **Must** (no exposure means no choice funnel) |
| Storyline | story_option_selected | Storyline Option Selection | Client | Must |
| Storyline | story_qte_result | Storyline QTE Result | Client | Must if QTE exists |
| Storyline | story_death | Storyline Failure (Death) | Client | Must |
| Storyline | story_death_settle_view | Death Settlement Page Display | Client | ⚠️ Still missing in optimized version, to be added |
| Storyline | story_hint_result | Storyline Hint Usage Result | Server | Recommended |
| Storyline | story_ending_reached | Storyline Ending Reached | Server | Must |
| Storyline | story_session_end | Storyline Attempt End | Client | Must (denominator for churn analysis) |
| Storyline | chapter_complete | Chapter Complete | Server | Must |
| Storyline | game_complete | Full Game Clear | Server | Recommended |
| Cultivation | relationship_changed | Affinity Change | Server | Recommended |
| Cultivation | character_unlocked / character_gift_result | Character Unlocked / Gift Result | Server | Recommended |
| Payment | purchase_initiated / purchase_result | Initiate Payment / Payment Result | Client/Server | Must |
| Mail | mail_list_viewed / mail_reward_claimed | Mail List Viewed / Reward Claim Result | Client/Server | Recommended |
| Attribution | campaign_touch / attribution_result | Ad Attribution Touchpoint / Install Attribution Result | MMP/Server import | Must for paid acquisition projects |
| Share | share_entry_exposed / share_result | Share Entry Exposed / Share Result | Client | Recommended |

Other common modules (lifecycle/login account/role/network/shop/economy/leaderboard/achievement/settings/activity/content) are generated from the standard framework base.

## 4. Join Keys (Lifelines of analysis loops)

| Join Key | Purpose | Rules |
|-|-|-|
| story_session_id | String together the full chain of a storyline attempt (start→select→ending/failure/exit) | Generate new ID each time entering storyline; multiple entries into the same node can be distinguished |
| chapter_id + node_id | Node-level funnel and churn localization | node_id must be a real ID. **Do not stuff Choose/QTE interaction types into scene_id to impersonate a node** |
| option_id | Choice preference analysis | Exposure and selection events must share the same option_id, forming a funnel |
| request_id | Request/result event pairing (gift, redeem, claim) | One authoritative reporting point per business action, not reported by both ends |
| install_id | Install attribution ↔ account payment chain | Client UUID, does not replace #distinct_id |

## 5. Object Group Modeling Rules (High-density pitfall area for this category)

1. **Mail Rewards**: Mail × reward uses flat object group `reward_items` (each mail with multiple rewards expanded one by one); **do not** force meaningless fields into reward_info for all events — same-named object groups with different structures should **be split into different parent properties** rather than padded with fields
2. **Batch Claim**: First confirm "one mail with multiple rewards?" "batch claim as one event or multiple events?" before modeling; batch claim needs to retain per-mail reward association (still missing in optimized version, to be added)
3. **Initial Items**: `initial_node_id + initial_props` object group
4. **MBTI / Personality Test**: `mbti_dimension_info` object group (4 dimensions), do not split into 4 flattened fields
5. **Item Type vs Leaderboard Type**: `prop_type` and `rank_type` are different dimensions, must be separated, cannot reuse the same field
6. **Same name different structure**: `reward_info` has different meanings in shop/mail/achievement → split names (e.g., mail_reward_items / shop_reward_items), registry enforces blocking

## 6. Metric → Event Mapping (Category Acceptance Baseline)

| Analysis Requirement | Numerator Event | Denominator Event | Key Fields |
|-|-|-|-|
| Storyline node churn | story_session_end (distributed by node) | story_session_start | story_session_id, node_id |
| Choice preference | story_option_selected | story_option_exposed | option_id, node_id |
| Storyline load failure rate | story_content_load_result(fail) | story_session_start | fail_reason |
| QTE pass rate | story_qte_result(success) | story_qte_result(all) | qte_id, result |
| Ending distribution | story_ending_reached | story_session_start | ending_id |
| Payment conversion | purchase_result(success) | Active/unlock entry exposure | item_id, amount |
| Campaign install/payment | attribution_result + purchase_result | campaign_touch | media_source, campaign_id |

**Reverse validation requirement**: Must output full mapping table before generating plan, label each as "support/indirect/gap"; failing items cannot enter generation.

## 7. Paid Acquisition Attribution Design (D1 alignment)

Field family must be split, do not use only channel:

```
platform / install_store / media_source / campaign_id / ad_group_id / creative_id / is_organic
```

**Must proactively inform customer**: Ad clicks occur before install, game SDK cannot accurately collect, requires ad platform or attribution platform (MMP) data imported via server (campaign_touch / attribution_result two events bear this).

## 8. Differentiated Confirmation Question Set (used in step 4 of interactive confirmation)

High-impact questions, automatically selected by draft ambiguity, not all asked:

1. What is the hierarchy between chapter and node? Does selecting a branch at a node jump or progress linearly?
2. Are Choose and QTE different interactions? Does QTE have time limit/success-failure branches?
3. When do storyline start, actual playback, load failure, and exit occur?
4. Post-death flow: settlement page → retry or return to chapter? Does death consume items?
5. Mail: single claim or batch claim? Does a single mail have multiple rewards? Batch claim as one event or multiple events?
6. Gifting: Are different gifts like eggs/flowers the same type of item? Does gifting go through request-result or single event?
7. Leaderboard: Is leaderboard type and gift item type the same dimension?
8. Redemption code: Are click and result separated? What are the failure reason enumerations?
9. Is there paid acquisition? Which MMP (AppsFlyer/Adjust/other)?
10. Are multi-endings chapter-level endings or global endings? Is ending reaching judged by client or server?

## 9. Common Pitfall Checklist (scanned item by item in review mode)

From Bocai field practice; review with the [15 business-semantic checks](../business-semantic-checks.md). These are manual/model-assisted checks, not implemented automatic scoring:

- `story_result` type event names conflict with trigger timing (result event reported at start)
- `scene_id` actually passes Choose/QTE — not an ID, but an interaction type
- Spelling errors but conforming to snake_case: `palyback_speed`, `cliamed` — syntax check cannot detect
- Examples inconsistent with definitions: `requested_mail_count` vs `requested_mail_cnt`; `failed_mail_ids` appears in examples but not defined in property table
- Same-name property polysemy: `rank_period` (leaderboard/rank period), `character_get_total` (received count/owned count), `free_claim_type`, `is_jump_recharge` (actually whether to display recharge entry)
- Old and new events coexist: character_egg_gift_send / gift_send_succ / prop_gift_request — three generations of events for the same business coexist → old events must be deprecated
- `history_uid` is a list, not a numeric user_add counter. Confirm list/dedup semantics; plan imports support user_append, while SDK user_uniq_append availability is a separate integration decision and is not assumed a valid plan enum.
- Custom `uid` duplicately reported with `#account_id`; app_version/os_version/device_model and other duplicate preset properties
- `platform=both` without dual-end authoritative source and deduplication constraint → one business action produces two data entries
- Heuristic rules "3 events → common property" and "paired event object groups must be consistent" do not apply to this category, prohibited from mechanical execution

## 10. Known Gaps (Carrying over 4 items to be fixed from optimized version test package)

1. ~~Death settlement event~~ → This template has added `story_death_settle_view` (pending merge into optimized version skill)
2. Mail claim object group lacks per-mail reward association → This template §5.2 provides modeling rules
3. Gift/redemption semantics not fully aligned with confirmed semantics → §8.6/8 confirmation questions placed upfront
4. Redemption field modeling → `promo_code_redeem_result` single event carries result + failure reason, click does not form a separate event
