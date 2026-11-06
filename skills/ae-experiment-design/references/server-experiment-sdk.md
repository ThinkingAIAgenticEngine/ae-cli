# Server Experiment Architecture

Read this reference when assignment, Feature evaluation, or behavior execution belongs on a backend service.

## Evidence boundary

The verified client documentation does not establish an exact AE server experiment SDK, package, endpoint, or method. Do not invent one.

Before exact implementation:

1. Resolve the real project, experiment, Feature, and assignment unit with `ae-cli`.
2. Search and inspect the Capability Gateway for server experiment evaluation or SDK generation.
3. Read verified server documentation if returned by the platform or provided by the user.
4. Use architecture-level pseudocode until the API contract is verified.

## Recommended server contract

```text
evaluateExperiment(
  project,
  featureKey,
  stableAssignmentId,
  context
) -> {
  value,
  valueType,
  assignmentOrGroupId,
  configVersion,
  source,
  evaluatedAt
}
```

The field names above describe an application contract, not a verified AE API schema.

## Server responsibilities

- derive a stable assignment ID before evaluation;
- evaluate once per request, session, or product-defined decision boundary;
- apply a typed control default on timeout or unavailable configuration;
- preserve assignment consistency across replicas and regions;
- prevent cache keys from mixing projects, environments, Features, or identities;
- expose enough internal metadata to diagnose assignment without leaking it to end users;
- emit or authorize exposure only when treatment becomes effective;
- report outcomes with a joinable identity.

## Cache policy

Define separately:

- configuration cache;
- per-identity assignment cache;
- response or page cache.

Do not cache a personalized treatment under a shared response key. Include environment, project, Feature key, and assignment identity in any evaluation cache key unless the verified SDK guarantees safe internal caching.

## Failure policy

- timeout or transport failure: use typed control default;
- invalid value type: reject the value and use control;
- unknown Feature: fail closed to control and alert;
- stale configuration: use only within the approved stale window;
- identity missing: either use a documented anonymous assignment or control; never generate a new unstable ID per request.

## Exposure ownership

If the server fully executes the behavior, server exposure may be appropriate. If the server only sends a variant and the client decides whether it is rendered, client exposure is usually the truthful point.

Choose one owner and read `exposure-contract.md`.

## Verification checklist

- Same identity returns a stable value across replicas.
- Control fallback is safe and typed.
- Cache isolation prevents cross-user treatment leakage.
- Exposure reflects effective behavior, not evaluation alone.
- Client and server do not both report the same exposure.
- Outcome identity joins to assignment and exposure.
