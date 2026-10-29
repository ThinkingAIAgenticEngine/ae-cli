# Scenario content transport encoding

## Contract

The curated `analysis scenario collect` and `analysis scenario append` commands
continue to accept original text. Their transport builders encode only
`collect.answer` or `append.text` as standard padded Base64 of UTF-8 bytes and
add `content_encoding: "base64"`. Append encodes both feedback and revisions.
Execute, validate and dry-run use the same transport builder. No new CLI flag
or command is introduced. Question, user_message and query_path are unchanged.
Base64 is reversible encoding and does not provide confidentiality.

Common capability version 1.1 accepts the optional encoding marker. Without
it, the existing plain-text contract remains in force, including strings that
happen to look like Base64. With it, Common requires canonical standard Base64
and valid UTF-8, decodes a copy, and applies the existing original-text checks.
Unknown encodings, invalid bytes and decoded blank/oversize text are rejected
without fallback. The CLI rejects invalid Unicode rather than replacing it.

The decoded answer/revision limit remains 16,384 UTF-16 code units, and feedback
remains 4,096. The maximum encoded wire lengths are 65,536 and 16,384 respectively.
Gateway schemas allow encoded expansion and retain the legacy plain-text bound;
the service enforces the feedback-specific bound and all decoded limits.

The original request is not mutated. For encoded requests, gateway invocation
and usage logs retain the encoded answer/text; validate and dry-run return that
same wire representation. Scenario events retain the exact decoded content and
do not include the transport marker. Project opt-in, permissions, scenario IDs,
deduplication and best-effort delivery semantics are unchanged.

## Compatibility and rollout

| Caller and service | Expected behavior | Local coverage |
| --- | --- | --- |
| Legacy unmarked request to new Common | Original text accepted unchanged | Actual CapabilityExecutor schema validation and execution for collect, feedback and revisions |
| New CLI request to new Common | Encoded content accepted and collected as original text | CLI HTTP transport assertions plus Common Gateway tests, including Unicode maximum lengths |
| New CLI to older Common | Encoding marker rejected; no automatic retry or plain-text fallback | Simulated older-service HTTP 400 rejection for both curated commands; subsequent business query still succeeds |
| New CLI to service without project opt-in support | Sample skipped before upload | Existing project-policy regression tests |

Deploy Common before upgrading the CLI. Roll back the CLI before removing
Common encoding support. Service rejection is a collection failure, not a
failed business analysis; Agents continue answering under the existing Skill
rules. Do not claim successful collection after rejection or successful
ingestion from best-effort acceptance.

## Verification on 2026-10-26

- Common, Java 17: 16-module Maven reactor compilation and Checkstyle passed;
  all 22 AnalysisScenarioCapabilityServiceTest tests passed. Command:
  `./mvnw -pl ta-cli -am test -Dtest=AnalysisScenarioCapabilityServiceTest -Dsurefire.failIfNoSpecifiedTests=false`.
  Log: `/tmp/scenario-base64-common-tests.log`.
- CLI: build and npm test passed, including all 9 scenario tests. Analysis Skill
  index, Agent contract, tool registration, Skill reference tests and all 5
  release checks passed. Logs: `/tmp/scenario-base64-cli-build.log`,
  `/tmp/scenario-base64-cli-smoke.log`, `/tmp/scenario-base64-cli-contracts.log`.
- `tsc --noEmit` reports only the existing TS2571 at
  `src/commands/te-experiment/external-experiment/save-submit.ts:70:59`.
  The same diagnostic was reproduced from an independent `git archive HEAD`
  checkout using the same dependencies. Logs:
  `/tmp/scenario-base64-cli-tsc.log` and
  `/tmp/scenario-base64-cli-baseline-tsc.log`.
- Coverage includes malformed/noncanonical Base64, invalid UTF-8, limits,
  Unicode preservation, request immutability, invocation logs, side-effect-free
  validation, opt-in gating and legacy requests. These are local regression
  checks, not deployed mixed-version integration or downstream ingestion proof.

Work was performed in both repositories on `feat/semantic-optimization-1029`.
No deployment, project-configuration write or production sample upload was
performed.
