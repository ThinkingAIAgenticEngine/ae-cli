# Troubleshooting & Diagnosis Workflow

> Source: condensed from the former `diagnose-studio-en` skill. The original package also described a local "Web Studio" workbench (JumpServer SSH, sub-agent orchestration); that engine only exists in on-machine Route B (cli + local agent) environments and is NOT available to this cloud agent — do not attempt to launch it here.

## Scope

Read-only diagnosis of reporting and engagement-reach issues, currently covering:

- **LogBus / data reporting issues**: reporting failures, data not arriving, format errors — diagnosed from customer-uploaded config and log files, or via the integration knowledge base.
- **Hermes engagement-reach issues**: engagement messages not reaching users.
- **User-ID fragmentation**: split user identities across devices/accounts — route deep dives to the system skill `te-user-id-debug`; this workflow does not re-implement it.

## Hard Rules

1. **Read-only**: never execute write/change operations against the customer's environment. Queries and log reads only.
2. **No speculation**: conclusions must cite observed evidence (log lines, query results, config entries). If evidence is insufficient, say what is missing and ask for it.
3. **Triage before deep-dive**: always start from the structured triage below; do not jump straight to a conclusion.

## Triage (conversational, in this cloud agent)

When the user reports "no data / stopped reporting / data looks wrong", collect before diagnosing:

1. **Object**: which project, which event(s), since when.
2. **Side and stage**: client SDK or server SDK; is the failure at collection, transport (LogBus / REST), or ingestion.
3. **Environment**: SAAS China / SAAS international / private deployment; receiver URL; SDK type and version.
4. **Evidence**: upload the relevant config and log files (LogBus config, SDK logs, error screenshots). If the customer cannot upload, give them the exact commands/paths to collect from the SDK knowledge base under `references/sdk/`.

Then:

- For integration/config/usage questions, consult `references/sdk/` (client-sdk, server-sdk, faq, integration-tools, te-data-rules) and answer per the integration-qna workflow's accuracy principles (document-based answers only, append official doc URL with the correct `lan` parameter).
- For "event has no data after going live", check in order: reporting URL reachability → appid correctness → flush/report triggers → time-window bounds → property type conflicts (values silently discarded) → whether the event was ever received (use data-verification workflow's probe queries if a TE analysis connection is available).
- For suspected user-ID fragmentation (one real user split into multiple), hand off to `te-user-id-debug`.

## On-machine engine (Route B only, informational)

In a local cli + agent setup, the original Diagnosis Studio can run a web workbench that collects inputs, holds JumpServer authorization, and orchestrates a local sub-agent for read-only SQL/log queries, writing conclusions to `studio/output.md`. If the user needs that depth, redirect them to the local route; do not emulate SSH access from this cloud agent.
