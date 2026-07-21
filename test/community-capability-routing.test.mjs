import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const HOST = 'http://localhost';

const result = spawnSync('npx', ['tsx', '--eval', `
  import './src/commands/te-community/index.ts';
  import { findGatewayDomain } from './src/core/capability-routing.ts';
  import { buildCapabilityGatewayUrl } from './src/core/capability-api.ts';
  const domain = findGatewayDomain('community');
  const url = buildCapabilityGatewayUrl(
    'http://localhost',
    domain ?? '',
    'capabilities/community.chat.overview/dry-run',
  );
  process.stdout.write(JSON.stringify({ domain, url }));
`], {
    cwd: process.cwd(),
    encoding: 'utf-8',
});
assert.equal(result.status, 0, result.stderr || result.stdout);
const route = JSON.parse(result.stdout);

assert.equal(route.domain, 'community');
assert.equal(
  route.url,
  `${HOST}/api/cli/community/v1/capabilities/community.chat.overview/dry-run`,
);

process.stdout.write('OK: community capabilities route through /api/cli/community/v1.\n');

const skill = readFileSync('skills/ae-community/SKILL.md', 'utf-8');
const workflow = readFileSync(
  'skills/ae-community/references/community-chat-analysis.md',
  'utf-8',
);

assert.match(skill, /community-chat-analysis\.md/);
assert.match(skill, /Skill revision: 2\.4\.1\./);
assert.match(workflow, /## Customer-service DMs/);
assert.match(workflow, /## Customer after-sales groups/);
assert.match(workflow, /## In-game chat/);
assert.match(workflow, /community\.chat\.service_metrics/);
assert.match(workflow, /generic_chat/);
assert.match(workflow, /participantCandidates/);
assert.match(workflow, /participantCandidatesTruncated/);
assert.match(workflow, /`breakdown_limit` to the largest value allowed/);
assert.match(workflow, /`availability:\"unavailable\"` plus `participantCandidates`/);
assert.match(workflow, /identity_source:\"llm_inferred\"/);
assert.match(workflow, /identity_source:\"user_declared\"/);
assert.match(workflow, /staff_user_ids/);
assert.match(workflow, /customer_user_ids/);
assert.match(workflow, /excluded_user_ids/);
assert.match(workflow, /Treat every LLM-inferred result as low confidence/);
assert.match(workflow, /If the user does not provide the complete staff roster/);
assert.match(workflow, /never infer or report a department/);
assert.match(workflow, /customer follow-ups inside the same turn do not restart that clock/);
assert.match(workflow, /every participant not in `staff_user_ids` or\s+  `excluded_user_ids` as a customer/);
assert.doesNotMatch(workflow, /identity coverage is at least 0\.90/i);
assert.doesNotMatch(workflow, /apollo_chat_users/);

// A1: a single-agent question still needs the complete roster and per-agent output.
assert.match(workflow, /Single-agent questions still require the full staff roster/);
assert.match(workflow, /Always pass the complete staff\s+roster/);
assert.match(workflow, /read the target agent from its\s+`staffMetrics\[\]` entry -- never from the aggregate `response` block/);
assert.match(workflow, /When an explicit customer list is\s+supplied, users outside all supplied identity lists remain unclassified and are filtered/);
assert.match(workflow, /`focus_staff_user_id`/);
assert.match(workflow, /drill-down selector, not a replacement for\s+the roster/);
assert.doesNotMatch(workflow, /require the user to declare at least one staff account/i);
assert.doesNotMatch(workflow, /Require at least one inferred staff ID/i);
assert.match(workflow, /A roster that remains partial is not sufficient\s+for service KPIs/);
assert.match(workflow, /every plausible staff candidate into the complete inferred staff roster/);
assert.match(workflow, /do not calculate service KPIs from a partial inferred roster/);

// A2: aggregate and per-agent service metrics must not be confused.
assert.match(workflow, /top-level `response` and `volume` blocks are\s+  \*\*roster-wide aggregates\*\*/);
assert.match(workflow, /`staffMetrics\[\]` is\s+  \*\*per-agent\*\*/);
assert.match(workflow, /Answer single-agent questions from the matching `staffMetrics\[\]` entry, not the\s+  aggregate block/);
assert.match(workflow, /`staffMetrics\[\]` exposes per-agent workload and responded-turn timing/);
assert.match(workflow, /does not expose\s+  a per-agent request-turn denominator, unanswered turns, `responseRate`, or `slaMetRate`/);
assert.match(workflow, /Never\s+  attribute roster-wide response\/SLA rates or an unanswered turn to one employee/);

// A3: candidate volume alone is not enough to classify automated accounts as staff.
assert.match(workflow, /Detect likely automated \/ broadcast accounts from `participantCandidates`/);
assert.match(workflow, /`roomCount` approaching `messageCount`/);
assert.match(workflow, /`messagesPerRoom` approaching 1/);
assert.match(workflow, /coverage of hundreds\s+or thousands of rooms/);
assert.match(workflow, /A high\s+`messageCount` or a low `messagesPerRoom` alone is not evidence of automation or staff activity/);
assert.match(workflow, /confirms automation, place it in `excluded_user_ids`/);

// A4: structural IDs may prioritize candidates but do not replace behavior evidence.
assert.match(workflow, /User-ID format is a structural signal \(distinct from a display name\)/);
assert.match(workflow, /`wmnLKgCwAA…`, `wonLKgCwAA…`, `wrnLKgCwAA…`/);
assert.match(workflow, /handles \(pinyin logins, `TD#####`\) are staff/);
assert.match(workflow, /confirm\s+staff by conversational behavior in evidence before adding anyone to\s+`staff_user_ids`/);
assert.match(workflow, /Never classify a role solely from a\s+   display name/);

// A5: unequal calendar-month windows require per-day volume normalization.
assert.match(workflow, /For "this month vs last month", use month-to-date/);
assert.match(workflow, /full previous calendar month/);
assert.match(workflow, /normalize volume metrics such as turns and\s+   messages to per-day values/);
assert.match(workflow, /Do not compare raw volume totals\s+   without this normalization/);
assert.match(workflow, /state both window lengths in the report/);
assert.match(workflow, /record the query as-of time and compare `pendingTurns`/);
assert.match(workflow, /entire response window has elapsed/);
assert.match(workflow, /If that union\s+exceeds the maximum date range in the inspected schema, run discovery separately/);
assert.match(workflow, /Never send an over-limit union range/);

// A6: default comparison dates are computed at run time, never frozen in the skill.
assert.match(workflow, /The concrete dates\s+   depend on today; compute them from the current date in Asia\/Shanghai/);
assert.doesNotMatch(workflow, /2026-07-15/);
assert.doesNotMatch(workflow, /2026-07-08/);
assert.doesNotMatch(workflow, /2026-07-01/);
assert.doesNotMatch(skill, /2026-07-08/);

// A7: pagination is preferred, with segmented discovery and explicit residual uncertainty.
assert.match(workflow, /Follow the inspected live schema for candidate pagination/);
assert.match(workflow, /`page_num` and\s+`page_size`, fetch pages until `participantCandidatesPage\.hasMore` is false/);
assert.match(workflow, /merging every page and\s+deduplicating by participant ID/);
assert.match(workflow, /Offset pagination is best-effort while late chat data is arriving/);
assert.match(workflow, /run discovery\s+separately per `room_type`, or per server\/channel filter/);
assert.match(workflow, /additional low-activity staff may remain uncovered/);
assert.doesNotMatch(workflow, /When `participantCandidatesTruncated` is true, explicitly\s+treat the roster as partial and do not claim exhaustive identity coverage/);

// Focused staff drill-down keeps ownership bounded to first responses and never blames no-response.
assert.match(workflow, /use\s+  `focusedStaffTurns` for bounded evidence drill-down/);
assert.match(workflow, /only when that employee owns the first staff response/);
assert.match(workflow, /Never attribute an unanswered turn to an individual employee/);
assert.match(workflow, /trigger\/response message IDs to fetch only the evidence needed/);
assert.match(workflow, /When\s+  `focusedStaffTurnsTruncated` is true, disclose/);
assert.match(workflow, /do not present the bounded list as the employee's complete turn history/);
assert.match(workflow, /Pending turns are\s+  excluded from the response-rate denominator/);
assert.match(workflow, /SLA uses its own observation threshold/);
assert.match(workflow, /still pending under a longer response window/);
assert.doesNotMatch(workflow, /Pending turns are\s+  excluded from response-rate and SLA denominators/);
assert.match(workflow, /`intent_instances` does not support\s+   `room_types`/);
assert.match(workflow, /`search_intents` with `chat_type:"group"`/);
assert.match(workflow, /`list_servers` covers\s+   all room types and omits messages with an empty server ID/);
assert.match(workflow, /Do not claim a server-by-room-type intent comparison/);

process.stdout.write(
  'OK: ae-community enforces call-scoped identity discovery and guarded service metrics.\n',
);
