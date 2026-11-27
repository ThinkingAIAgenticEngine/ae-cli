# Experiment SDK Troubleshooting

Read this reference for retrieval, default, assignment, exposure, cache, or debug problems. Resolve the exact project and Feature through `ae-cli` when the diagnosis depends on platform state.

## Collect first

Ask only for missing facts:

- platform and SDK versions;
- app ID and environment, without requesting secrets;
- Feature key and expected type;
- assignment identity before and after login;
- automatic or manual exposure mode;
- fetch callback or full error;
- whether the value was fetched, applied, and exposed;
- whether the issue affects all users, one test user, or one group.

## Symptom routing

### Always receives the default

Check in order:

1. analytics initialized before experiment SDK;
2. experiment, analytics, and Remote Config versions meet `sdk-index.md`;
3. app ID and server environment match the target experiment;
4. startup or explicit fetch succeeded;
5. Feature key and getter type match the platform Feature;
6. assignment identity is established before evaluation;
7. targeting and experiment traffic include the test identity;
8. custom bucket and custom fetch parameters match the verified contract;
9. cached or local default is not masking a remote miss.

Do not treat a successful SDK initialization as proof that a Feature value was fetched.

### Value changes unexpectedly

Check:

- identity transition after login;
- account or role switching;
- mid-session fetch;
- cache isolation by identity and environment;
- platform configuration changes;
- client and server evaluating independently;
- stale value replacement policy.

Freeze the value at the intended decision boundary when mid-session changes are not part of the product design.

### No exposure

Check:

- `automaticExposureTracking` is enabled when automatic mode is intended;
- the typed getter was actually called;
- the assigned behavior was applied;
- manual mode calls the platform’s verified exposure operation at activation;
- analytics upload and identity are healthy through `ae-data-integration-helper`;
- the exposure/report window has completed.

### Duplicate exposure

Check:

- automatic and manual modes are not both active;
- render loops or repeated getters;
- retries without an application deduplication scope;
- client and server both reporting;
- route changes or component remounts;
- account switching.

### Wrong group or cross-platform mismatch

Check:

- custom bucket ID values on every platform;
- pre-login and post-login identifiers;
- string normalization and missing values;
- project and environment;
- client/server cache keys;
- experiment traffic and targeting;
- whether one side falls back to control while the other evaluates treatment.

## Fetch and callback checks

Verified client pages provide:

- startup fetch success/failure callbacks;
- explicit `fetch`;
- custom fetch parameters;
- experiment logging.

Capture the exact callback code and message. Do not retry an unchanged invalid request. Separate transport failure, configuration absence, targeting exclusion, type mismatch, and control assignment.

## Defaults and Remote Config

Verified Remote Config pages define:

1. remote value;
2. local default;
3. empty when neither exists.

For experiment behavior, also keep an application-owned typed control default. Confirm which layer produced the observed value.

## Debug and test mode

The verified Remote Config pages state that client debug mode pulls test strategies every five seconds and requires a selected or added test device. This is a test-mode Remote Config behavior, not a production experiment polling guarantee.

Platform notes:

- Android Remote Config uses debug mode in `TDSettings`.
- iOS Remote Config uses `TDSDKModeDebug` and can enable logs.
- JavaScript Remote Config uses `mode: "debug"` and `enableLog`.
- Experiment SDK pages expose experiment logging separately.

Disable or production-harden debug behavior before release.

## Generic SDK problems

Route these to `ae-data-integration-helper` when available:

- analytics event upload failure;
- user identity API usage;
- `track` or user-property syntax;
- data delay and ingestion validation;
- LogBus, REST, or collection logs.

Keep the experiment diagnosis focused on assignment, Feature retrieval, defaults, activation, and exposure.

## Diagnostic output

Return:

- observed evidence;
- likely stage of failure;
- competing explanation;
- exact next `ae-cli` or product check;
- remediation if confirmed;
- unresolved documentation or capability gap.
