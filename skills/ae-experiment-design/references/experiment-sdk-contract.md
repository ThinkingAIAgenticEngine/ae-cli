# Experiment SDK Contract

Read this reference when defining Feature retrieval, assignment, defaults, caching, or cross-platform behavior.

## Required sequence

1. Initialize the analytics SDK.
2. Initialize the Remote Config dependency.
3. Initialize the experiment SDK with the same verified app and server environment.
4. Establish the stable assignment identity before the first Feature evaluation.
5. Fetch or read the Feature using the expected value type.
6. Apply the assigned behavior.
7. Record exposure only when the behavior becomes visible or effective.
8. Report outcome events with an identity that can join to exposure.

The verified Android and iOS experiment documents explicitly require analytics initialization before experiment initialization. Apply the same ordering to JavaScript unless a newer verified main document states otherwise.

## Feature contract

Define the following before implementation:

| Field | Requirement |
|---|---|
| Feature key | Stable, environment-correct, and resolved from the real platform asset |
| Value type | String, number, Boolean, or JSON; match the platform Feature |
| Default | Typed, safe for control behavior, and owned by the application |
| Assignment unit | Stable device, account, role, or another verified identifier |
| Evaluation owner | Client, server, or one side of a hybrid architecture |
| Exposure owner | Exactly one component |
| Outcome join | Same stable identity or a verified merge path |

Do not use an empty or null fallback when a safe control behavior is required. A default is product behavior, not only an SDK parameter.

## Assignment identity

Resolve:

- pre-login identity;
- post-login identity;
- account switching;
- multiple roles under one account;
- device-to-account merge or alias behavior;
- server/client identity consistency.

If a custom bucket ID is used, set it before fetching or reading the Feature. The verified client SDKs expose a custom bucket map, but the exact key and value semantics must match the experiment configuration. Do not assume that the literal example `bucket_id -> account_id` is the only supported schema.

Do not use custom request parameters as a hidden substitute for assignment identity unless the platform contract explicitly defines that behavior.

## Fetch and cache

Define:

- initial fetch timing;
- request timeout;
- retry and backoff;
- last-known-good cache;
- cache freshness;
- whether a stale value may be used;
- whether a mid-session update can change behavior;
- control fallback when no value is available.

Avoid UI flicker and treatment changes after the user has already seen control. For a session-scoped experience, freeze the evaluated value for the session unless the product requirement explicitly allows live changes.

Remote Config documentation establishes the general fallback order for configuration keys:

1. remote value;
2. local default;
3. empty when neither exists.

For an experiment Feature, prefer an explicit typed application default even when the platform SDK offers an overload or local default store.

## Exposure

Configuration retrieval is not exposure. A getter that automatically reports exposure is valid only if calling the getter coincides with applying the assigned behavior. If the application reads early, preloads, branches later, or may discard the result, disable automatic exposure and use manual exposure at the true activation point.

Read `exposure-contract.md` before finalizing exposure behavior.

## Custom fetch parameters

Use custom fetch parameters only for fields supported by the client configuration channel. Document:

- field name and type;
- source of truth;
- whether it affects targeting, diagnostics, or payload enrichment;
- privacy classification;
- behavior when absent.

Never place secrets or unstable session values in custom fetch parameters.

## Acceptance checks

- Analytics, Remote Config, and experiment SDK versions are compatible.
- Initialization uses the intended app and environment.
- The control default is returned when configuration is unavailable.
- A test identity receives a stable group across sessions.
- Client and server agree for the same assignment identity.
- Exposure occurs once at treatment activation, not at preload.
- Outcome events join to exposure.
- Account switching does not leak the previous account’s assignment.
- Debug logging and test mode are disabled or production-safe before release.
