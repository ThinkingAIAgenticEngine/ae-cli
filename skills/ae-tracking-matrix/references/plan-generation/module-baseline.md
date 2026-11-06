# Game Base Module Baseline

> Source asset: `../categories/game_basic_module_tracking_plan.md`
> Purpose: when the user only says "game tracking plan" without giving a clear category yet, first use this layer to build the base, then add modules according to the specific category.

## Applicable Scenarios

- The user only says "make a game tracking plan"
- The category is still under early discussion and cannot yet be precisely classified as card, SLG, MMO, Slots, etc.
- A first version of "base modules that every game should have" is needed

## Core Events Covered by This Baseline

- Lifecycle: `new_device`, `register`, `login`, `logout`
- Progression: `guide_complete`, `level_up`, `vip_levelup`
- Payment: `payment`, `payment_fail`
- Commerce and resources: `shop_open`, `shop_buy`, `asset_get`, `asset_consume`
- Operations monitoring: `current_online`

## Common Properties Emphasized by This Baseline

- `channel`
- `tmp_vip_level`

## User Properties Emphasized by This Baseline

- `register_time`
- `first_login_time`
- `last_login_time`
- `first_pay_time`
- `last_pay_time`
- `total_pay_amount`
- `total_login_day`
- `current_level`
- `current_vip_level`

## Usage

1. First use this baseline to lay out the base lifecycle, progression, payment, shop, resource, and online-monitoring modules.
2. Then combine with `template-catalog.md` to pick the closest industry template and supplement strong-category modules.
3. Finally return to `../naming-dict.md` to normalize naming and types.

## Parts Not to Copy Directly

- If a specific field name conflicts with `../naming-dict.md`, it must be changed to the standard name in the dictionary.
- If the user's revenue model is not IAP or does not include a shop, do not mechanically keep `shop_open` or `shop_buy`.
- If the product is not a strong-account game, re-evaluate the `#account_id` scheme instead of applying it directly.
