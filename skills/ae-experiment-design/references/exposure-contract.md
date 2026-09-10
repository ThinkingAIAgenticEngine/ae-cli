# Experiment Exposure Contract

Read this reference whenever exposure affects assignment, metrics, SDK code, or rollout readiness.

## Exposure definition

Exposure means the assigned behavior was actually rendered or became effective for the analysis unit. It is not:

- SDK initialization;
- configuration fetch;
- Feature preload;
- getter execution when the result may be discarded;
- assignment calculation without treatment activation.

## Automatic versus manual exposure

The verified Android, iOS, and JavaScript experiment pages state that a typed getter automatically uploads exposure when `automaticExposureTracking` is enabled.

Use automatic exposure only when the getter is called at the same decision point where the value is applied.

Use manual exposure when:

- values are prefetched;
- a getter is called before eligibility is final;
- the result may not render;
- the server assigns but the client activates;
- one value is read multiple times before a single activation;
- the product needs a later, explicit effective point.

Do not combine automatic getter exposure and manual exposure for the same activation.

## Exposure owner

Choose exactly one:

- client rendering owner;
- server behavior owner;
- another verified activation service.

Document why that component knows the treatment became effective.

## Deduplication contract

Define an application-level deduplication key from stable facts such as:

- project and environment;
- experiment or Feature;
- assignment identity;
- assignment or group;
- activation scope such as session, page instance, or decision instance.

Do not invent AE event property names. Let the verified SDK emit its supported schema, or resolve the exposure event contract through `ae-cli`.

Retry must be idempotent at the chosen activation scope.

## Identity and join

The identity used for assignment, exposure, and outcome must either be the same or have a verified merge path.

Block launch when:

- anonymous and logged-in identities can cross groups;
- server and client use different assignment subjects;
- exposure uses device identity while outcomes use an unlinked account identity;
- account switching can inherit a cached assignment;
- the analysis unit cannot be reconstructed from platform evidence.

## Outcome contract

For the confirmed primary event metric, define:

- event or measure;
- identity;
- timestamp;
- attribution window;
- denominator or eligible population;
- relation to exposure;
- duplicate and late-event treatment.

Do not report an exposure merely to force a user into the denominator. Fix the metric or eligibility contract instead.

## Acceptance tests

- Getter without rendering does not produce exposure in manual mode.
- Rendering produces one exposure.
- Re-render behavior matches the pre-registered exposure scope.
- Retry does not create duplicate logical exposure.
- Control and treatment exposure are both observable.
- Assignment proportions match configured allocation.
- Exposure and outcome join for anonymous, login, logout, and account-switch paths.
- Offline and delayed-upload behavior is understood before launch.
