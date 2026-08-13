# Hybrid Experiment Architecture

Read this reference when the server assigns or prepares a variant but the client renders or activates the treatment.

## Ownership model

Assign one owner for each responsibility:

| Responsibility | Typical owner |
|---|---|
| Stable identity resolution | Server or shared identity service |
| Assignment or Feature evaluation | Server |
| Typed default | Both sides, with one canonical value |
| Rendering or activation | Client |
| Exposure | Client when it knows rendering succeeded |
| Outcome events | Side that owns the business action |

These are design defaults, not fixed product requirements.

## Server-to-client envelope

Define an application envelope such as:

```text
{
  featureKey,
  value,
  valueType,
  assignmentOrGroupId,
  configVersion,
  evaluatedAt,
  exposureToken?
}
```

This is architecture-level pseudocode. Verify any AE-specific schema through `ae-cli`.

## Consistency rules

- Server and client must use the same project, environment, Feature key, and stable identity.
- The client must validate the value type before applying it.
- A missing, invalid, or expired envelope falls back to the typed control behavior.
- Do not re-evaluate independently on the client after a server assignment unless the product explicitly supports that mode.
- Do not allow account switching to reuse another account’s cached envelope.
- Include a configuration version or equivalent diagnostic marker when the verified platform provides one.

## Exposure handoff

The server should not report exposure merely because it returned a treatment envelope when the client may never render it. Prefer:

1. server evaluates;
2. client receives and validates;
3. client applies behavior;
4. client reports exposure once.

If exposure must be server-side, define a client acknowledgment or another verified activation signal and make retry idempotent.

## Failure scenarios

- server evaluation succeeds, client render fails: no exposure;
- server times out: client uses control;
- client starts offline with cached assignment: use only within the documented stale window;
- server and client identity disagree: block rollout;
- both sides report exposure: disable one path before launch;
- value arrives after control rendered: freeze control for the session or use an explicitly approved transition.

## Acceptance checks

- Server and client return or apply the same value type.
- Treatment is not visible before identity is stable.
- Exposure is reported by one owner.
- Refresh and retry do not duplicate exposure.
- Cached assignment is isolated by identity and environment.
- Outcome events remain joinable across client and server.
