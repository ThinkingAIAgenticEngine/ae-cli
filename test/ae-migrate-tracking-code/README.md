# ae-migrate-tracking-code — regression suite

Data-driven regression suite for the `ae-migrate-tracking-code` skill. The skill itself is
agent instructions (Markdown), so this suite encodes its expected behavior as **fixtures +
golden artifacts + a test runner** rather than testing executable code directly.

Run it with:

```bash
npm run verify:skill-migration
```

## Levels

- **L1 — offline Phase 0–3.** For each golden platform, asserts that `scan.json`,
  `mapping.json`, and `draft.json` are schema-conformant, internally consistent with the
  fixture source, and that the draft passes `ae-cli tracking plan validate` and `draft`
  (xlsx generation) offline. No AE host needed.
- **L2 — Phase 4 code generation.** For each golden platform, asserts the migrated code
  carries the correct AE SDK import (from the bundled wiki), a `// @tracking <event>` marker
  per mapped event, and the right add/switch behavior (source calls kept vs removed). Syntax
  is checked with `node --check`.
- **Contract.** Asserts every registered provider adapter keeps the 7-section structure and
  is listed in `SKILL.md`.

## Layout

```
fixtures/<provider>/<platform>/          # the "before" source project (what Phase 0 scans)
golden/<provider>/<platform>/scan.json   # Phase 1 scan output
golden/<provider>/<platform>/mapping.json# Phase 2 mapping output
golden/<provider>/<platform>/draft.json  # Phase 3 draft output (must pass `validate` + `draft`)
golden/<provider>/<platform>/migrated/   # Phase 4 migrated code (what the skill should produce)
```

## Adding a platform

1. Drop a source project under `fixtures/<provider>/<platform>/`. JS fixtures carry a
   `package.json` whose `dependencies` names the source SDK; non-JS fixtures (Kotlin/Java)
   omit it — the source SDK is a Gradle/Maven dependency, asserted via source-call removal.
2. Add the three golden artifacts + `migrated/` output under `golden/<provider>/<platform>/`.
3. Add one row to `PLATFORM_META` in `migration-regression.test.mjs` (AE package name +
   module type `esm`/`cjs`/`null` for non-JS).

No test-code changes beyond the `PLATFORM_META` row are needed — everything else is derived
from the fixtures and golden artifacts. Provider-specific assertions (identity + user-property
conversions) live as dedicated `L2 <provider>` tests at the bottom of the runner.

## Coverage

Amplitude was the pilot provider; the other four have been replicated over their common SDK
variants. Modes: `switch` removes the source SDK, `add` keeps it for dual-write.

| Platform | Provider | Mode | Surface |
|---|---|---|---|
| `amplitude/browser-2.x` | Amplitude | switch | web (ESM) |
| `amplitude/node` | Amplitude | add | server (CJS) |
| `amplitude/realworld` | Amplitude | add | server — multi-file, constant event names (CJS) |
| `firebase/web-v9` | Firebase | switch | web modular (ESM) |
| `firebase/web-v9-guarded` | Firebase | add | web modular — availability guard, AE write independent (ESM) |
| `firebase/realworld` | Firebase | switch | web modular — multi-file, constant event names (ESM) |
| `firebase/web-v8` | Firebase | add | web namespaced (ESM) |
| `firebase/naming` | Firebase | switch | web modular — name conversion (ESM) |
| `firebase/android` | Firebase | switch | Android (Kotlin) |
| `sensors-data/web` | Sensors Data | switch | web JS (ESM) |
| `sensors-data/java` | Sensors Data | add | Java server |
| `mixpanel/browser` | Mixpanel | switch | web (ESM) |
| `mixpanel/naming` | Mixpanel | switch | web — name conversion (ESM) |
| `mixpanel/realworld` | Mixpanel | switch | web — multi-file, constant event names, runtime values (ESM) |
| `mixpanel/mixed` | Mixpanel | switch + staged | web — per-entry action: replace vs `add_after` dual-write (ESM) |
| `mixpanel/wrapper` | Mixpanel | switch | web — analytics wrapper layer, reverse call-graph resolution (ESM) |
| `mixpanel/superprops` | Mixpanel | switch | web — super properties → AE common event properties (ESM) |
| `mixpanel/node` | Mixpanel | add | server (CJS) |
| `ga4/gtag-web` | GA4 | switch | web gtag.js (ESM) |
| `ga4/mp-server` | GA4 | add | Measurement Protocol (CJS) |
| `firebase/react-native` | Firebase | add | React Native (ESM) |
| `sensors-data/android` | Sensors Data | switch | Android (Kotlin) |
| `mixpanel/ios` | Mixpanel | switch | iOS (Swift) |
| `ga4/datalayer` | GA4 | add | dataLayer push (ESM) |

### Documented but untested

The adapters' Recognition sections document more platforms than this suite has fixtures for. These
platforms have a valid `variant` token (see `ir.md` §scan.json) but no golden fixture, so they are
covered by the mapping/naming rules and the 7-section contract only, not by L1/L2 generation tests:

- `firebase/ios`, `firebase/flutter`, `firebase/unity`, `firebase/cpp`
- `amplitude/legacy-js`, `amplitude/python`, `amplitude/go`, `amplitude/java`, `amplitude/android`, `amplitude/ios`, `amplitude/react-native`, `amplitude/flutter`, `amplitude/unity`
- `mixpanel/python`, `mixpanel/go`, `mixpanel/java`, `mixpanel/ruby`, `mixpanel/php`, `mixpanel/android`, `mixpanel/react-native`, `mixpanel/flutter`, `mixpanel/unity`

Add a fixture per §Adding a platform to promote one of these to tested.
