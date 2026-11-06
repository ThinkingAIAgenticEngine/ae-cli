# Category Registry

> Category answers "what to track". When a category is hit → inject that template's business semantics; fuzzy → list 2–3 candidates and let the user confirm; missing → use the general spec + standard-base foundation, and hint "this category can be deposited as a new template".
>
> **Category Template Loading Rules (performance-critical, must follow)**:
> 1. **Prefer local cache**: see the "Local Cache" column below. For categories with a filename, read `references/categories/<filename>.md` directly with the Read tool. **Do not use Feishu lark-cli.**
> 2. **Only "Feishu-fallback" categories may need Feishu**, and only when remote access is authorized. Discover the installed CLI contract with targeted `--help` if it has not been verified; resolve workbook metadata, then fetch the needed ranges once. Do not guess flags/token kinds, repeat identical reads, or fetch cell-by-cell. In local-only work, disclose the missing cache and use confirmed local material instead.
> 3. After a Feishu-fallback read, deposit the result as a local-cache markdown following the existing format in `references/categories/`, so future reads can skip Feishu.

## Game Categories (18)

| Category ID | Category | Local Cache | Template Token | Version | Status | Typical Business Dimensions (examples) |
|-|-|-|-|-|-|-|
| mmo_mobile | MMO Mobile | `mmo_mobile_tracking_plan_template.md` | shtcnL7MKQP7hSPql0raqJGfLOi | v1 | Template available | Class/Guild/Dungeon/Equipment |
| mmo_web | MMO Web | `mmo_web.md` | shtcn40qts4wwyao8jROAM95jDe | v2 | Template available | Class/Guild/Dungeon/Equipment |
| rpg | RPG | `rpg.md` | shtcnfJGGi2aDghD8jQjZ72zFKf | v1 | Template available | Character/Storyline/Equipment/Gacha |
| slg | SLG | `slg_tracking_plan_template.md` | shtcnEvxf6dlhPFo20Njttdq8If | v1 | Template available | City Building/Alliance/Season/Battle/Resource Flow/Hero & Troop |
| slots | Slots | `slots_tracking_plan_template.md` | shtcnKiOf8cpxvmnoTkRKvkcfac | v1 | Template available | Spins/Jackpot/Multiplier |
| fishing | Fishing | `fishing.md` | AISTsSZ0rhOYt2tMcxAcMrd3nec | v2 | Upgraded cache: 235 events, 638 property rows | Cannon/Fish Type/Multiplier/Room/Quest/Guild/Monetization |
| idle | Idle | `idle_game_tracking_plan_template.md` | shtcnehZWPBJBkRU9sWjwCJzzDc | v1 | Template available | Offline Rewards/AFK/Speed-up |
| card | Card | `card_game_tracking_plan_template.md` | shtcnbJ1tXy2xhaUQ7NeoVv6Jec | v1 | Template available | Deck/Gacha/Battle |
| qipai_ddz | Chess & Cards (DDZ) | `chess_cards_tracking_plan_template.md` | shtcnZCNixHGbGppcaj7w3aEO7b | v1 | Template available | Round/Room/Base Score |
| qipai_mj | Chess & Cards (Mahjong) | `qipai_mj.md` | shtcnoE3yd6Ko5nmQzpnwlOkdfc | v2 | Template available | Round/Hand Type/Room |
| social_chat | Social Chat | `acquaintance_social_tracking_plan_template.md` / `stranger_social_tracking_plan_template.md` | shtcnRq5M63TM2yw1RwzZcYLXEh / shtcn6d3s0I6VbkemeWAzF5Uvtv | v1/v2 | Template available | Matching/Session/Gift |
| tower_defense | Tower Defense | `tower_defense.md` | shtcnejjuD4q3QrYhRBYpwEAuLh | v1 | Template available | Stage/Tower Slot/Wave |
| wechat_minigame | WeChat Mini Game | `wechat_minigame.md` | shtcnpnBvLaJ3B5iKQXq5tCHblf | v1 | Template available | Share Viral/Ad Monetization |
| casual_nurture | Casual Nurture | `casual_game_tracking_plan_template.md` | shtcn4RhM0jQtDoqXuWXun5X9ae / shtcnc9JSJFQsaLmL5r2idfovFh | v1/v2 | Template available | Collection/Nurture Lines/Orders |
| casual_music | Casual Music | `casual_music.md` | shtcnHHPLwMAevc9F4tLE38ibvb | v1 | Template available | Track/Judgment/Combo |
| blockchain | Blockchain Game | `blockchain_game_tracking_plan_template.md` | shtcnxeFlTQGbozXYFvVLLyDu6f | v1 | Template available | Wallet/On-chain Txn/NFT |
| idle_card | Idle Card | `idle_card.md`; compose `idle_game_tracking_plan_template.md` + `card_game_tracking_plan_template.md` | shtcncGxJY0SZQSOl99TgDuEyqh | v1 | Incomplete cache: no event list; use Idle + Card with confirmation | Idle rewards + Card collection are candidates, not confirmed requirements |
| merge | Merge | `merge.md` | GHkEsxdxQhJRCYtIVQtcbcl3nkh | - | Template available | Merge chain/Order/Grid |

## Non-Game Categories (6)

| Category ID | Category | Local Cache | Template Token | Version | Status | Typical Business Dimensions (examples) |
|-|-|-|-|-|-|-|
| reading | Reading | `reading_tracking_plan_template.md` | shtcnbLlokkcbiolqnmUSy0euZ1 | v1 | Template available | Book/Chapter/Paid Unlock |
| video_edit | Video Editor | `video_editor_tracking_plan_template.md` | shtcnbF6XE1PfXOFJmUD7V1pf9d | v1 | Template available | Project/Material/Export |
| ecommerce | E-commerce | `ecommerce_tracking_plan_template.md` | PVsQsvCavhsv9GtlBoTcWsfcn6d | v1 | Template available | Product/Cart/Order/Payment |
| short_drama | Short Drama | `short_drama_tracking_plan_template.md` | EnhosYliXhUhqftnoH5cXpP0nqd | v1 | Template available | Series/Unlock/Paid Node |
| music | Music | `music.md` | WF9DsTwSxhvXD7tnga3ceSlanOi | - | Template available | Song/Playlist/VIP |
| smart_cockpit | Smart Cockpit | Feishu-fallback | H4lOd4dFzoVMYXxU5QkcamL9n7d | - | Template available | Vehicle Control/Voice/Navigation |

## Supplemented Category (1)

| Category ID | Category | Status |
|-|-|-|
| interactive_video | Interactive Film Game | ✅ Supplemented (2026-09-19; template at `references/categories/interactive_video.md`: storyline chain / choice impression & click / QTE / multiple endings / mail reward object group / attribution / confirmation question set / pitfall checklist) |

## Casual Match-3 (nearest-neighbor mapping note)

"Match-3 / Candy Crush" has no exact match among the 24 categories. Nearest neighbors: `casual_nurture` (Casual Nurture), `merge` (Merge), `wechat_minigame` (if it's a WeChat Mini Game form) → treat as "fuzzy" and list candidates for user confirmation.

## Standard-Base Foundation

**Local cache (preferred, cached from cloud on 2026-09-20)**: 12 markdown files under `references/standard-base/`, each one-to-one with a cloud sheet:

| Cache File | Corresponding Sheet | Content Position |
|-|-|-|
| `integration_must_know.md` | 接入必知 (Integration Must-Know) | User definition / data spec / integration tooling overview |
| `tracking_notes.md` | 埋点注意事项 (Tracking Notes) | Alignment source for the "Notes" section in output (A7) |
| `user_id_system.md` | #用户ID体系 (User ID System) | User identification rules |
| `gameplay_event_data.md` | #玩法事件数据 (Gameplay Event Data) | Standard gameplay events + property universe (364 lines; primary design baseline when a category template is missing) |
| `basic_event_data.md` | #基础事件数据 (Basic Event Data) | Full set of basic events: registration/login/payment, etc. |
| `common_event_properties.md` | #公共事件属性 (Common Event Properties) | Standard common properties (channel/account/tmp_*, etc.) |
| `user_data.md` | #用户数据 (User Data) | User properties (user_set, etc.) |
| `data_type_design_principles.md` | 数据类型设计原则 (Data Type Design Principles) | Principles for property type selection |
| `common_event_properties_setup.md` | 公共事件属性设置方式 (Common Event Property Setup) | SDK dynamic common property setup |
| `multi_platform_integration_notes.md` | 多端接入注意点 (Multi-Platform Integration Notes) | Multi-platform data unification considerations |
| `multi_user_id_system_recommendations.md` | 多用户ID体系的埋点建议 (Multi User ID System Tracking Advice) | ID system plan |
| `id_system_faq.md` | ID体系常见疑问 (ID System FAQ) | ID system Q&A |

Loading order: **read local cache first**; only use `lark-cli` to fall back to the cloud (Feishu sheets `M71zsVFKihDEKXtZJjZcOkAvn5b`) when the user explicitly asks for "the latest cloud version" or the cached notes clearly conflict with current business reality.

Purpose: design baseline when a category template is missing; alignment baseline for the "Notes / Timezone" section in output (A7).

> Each category's Feishu sheet `obj_token` has been filled in the "Template Token" column above (as of 2026-09-20). To add a new category: append a row (Category ID + Local Cache + Template Token + Status). For a template-less category, mark "To be supplemented", design generically against the standard-base foundation, and later deposit a formal template.
