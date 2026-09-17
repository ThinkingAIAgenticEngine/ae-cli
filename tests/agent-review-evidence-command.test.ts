import commands from "../src/commands/te-analysis/meta/agent-review/index.js";
import allCommands from "../src/commands/te-analysis/meta/index.js";
import { clearCliToken, setCliTokenManual } from "../src/core/cli-token.js";
import { unwrapOutputData } from "../src/framework/output.js";
import type { Command, RuntimeContext } from "../src/framework/types.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const host = "https://agent-review-evidence.example.com";
const values = {
  "project-id": 1,
  "target-type": "report",
  "target-key": "9007199254740993",
};
const input = {
  project_id: 1,
  review_type: "ASSET_GOVERNANCE",
  target_ref: { type: "report", key: values["target-key"] },
  action_type: "CERTIFY",
  proposal_payload: { authentication_status: 1 },
};

function evidenceCommand(): Command {
  const command = commands.find(
    (candidate) => candidate.command === "evidence"
  );
  assert.ok(command, "Missing read-only agent-review evidence command");
  return command;
}

function ctx(overrides: Record<string, unknown> = {}): RuntimeContext {
  const flags: Record<string, unknown> = { ...values, ...overrides };
  return {
    str: (key: string) => (flags[key] === undefined ? "" : String(flags[key])),
    num: (key: string) => Number(flags[key]),
    host: () => host,
  } as RuntimeContext;
}

test("registers read-only evidence with typed target flags and fixed governance defaults", () => {
  const command = evidenceCommand();
  assert.ok(allCommands.includes(command));
  assert.equal(command.capabilityId, "metadata.agent_review.evidence");
  assert.equal(command.risk, "read");
  assert.deepEqual(
    command.flags.map(({ name, type, required }) => ({ name, type, required })),
    [
      { name: "project-id", type: "number", required: true },
      { name: "target-type", type: "string", required: true },
      { name: "target-key", type: "string", required: true },
    ]
  );
});

test("evidence previews never execute and execution preserves lossless targets and server facts", async () => {
  const command = evidenceCommand();
  const original = globalThis.fetch;
  const calls: Array<{ url: string; input: unknown }> = [];
  const snapshot = {
    analysis: {
      sql: {
        parse_status: "DYNAMIC",
        raw: "SELECT ${projection}",
        select_columns: [],
      },
      normalized_definition: { params: [] },
      timezone: null,
      raw: { events: { $ref: "literal" } },
    },
  };
  const result = {
    schema_version: "1.0",
    review_type: "ASSET_GOVERNANCE",
    target_ref: input.target_ref,
    evidence_snapshot: snapshot,
    evidence_hash: "server-hash",
    target_revision: "server-revision",
  };
  setCliTokenManual("test-evidence-token", host);
  globalThis.fetch = async (request, init) => {
    assert.equal(
      new Headers(init?.headers).get("cli-token"),
      "test-evidence-token"
    );
    assert.equal(init?.method, "POST");
    calls.push({
      url: String(request),
      input: JSON.parse(String(init?.body)).input,
    });
    return new Response(JSON.stringify({ ok: true, data: result }));
  };
  try {
    await command.validateInput!(ctx());
    await command.dryRun!(ctx());
    assert.deepEqual(
      calls.map(({ url }) => url),
      ["validate", "dry-run"].map(
        (mode) =>
          `${host}/api/cli/analysis/v1/capabilities/metadata.agent_review.evidence/${mode}`
      )
    );
    for (const call of calls) assert.deepEqual(call.input, input);
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(unwrapOutputData(await command.execute(ctx())))
      ),
      result
    );
    assert.equal(
      calls.at(-1)?.url,
      `${host}/api/cli/analysis/v1/capabilities/metadata.agent_review.evidence/execute`
    );
    assert.deepEqual(calls.at(-1)?.input, input);
    await command.execute(
      ctx({ "target-type": "event_prop", "target-key": "#paid_amount" })
    );
    assert.deepEqual(calls.at(-1)?.input, {
      ...input,
      target_ref: { type: "event_prop", key: "#paid_amount" },
    });
    assert.equal(
      calls.length,
      4,
      "No create, approval, notification or extra calls"
    );
  } finally {
    globalThis.fetch = original;
    clearCliToken(host);
  }
});

test("evidence rejects missing targets and invalid projects before any transport", async () => {
  const command = evidenceCommand();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("Unexpected network request");
  };
  try {
    for (const flags of [
      { "project-id": 0 },
      { "project-id": 1.5 },
      { "project-id": 2147483648 },
      { "target-type": "" },
      { "target-type": " " },
      { "target-key": "" },
      { "target-key": " " },
    ]) {
      await assert.rejects(command.validateInput!(ctx(flags)));
      await assert.rejects(command.dryRun!(ctx(flags)));
      await assert.rejects(command.execute(ctx(flags)));
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("Skill reads current evidence before drafting and distinguishes source paths, dynamic SQL and nulls", () => {
  const reference = readFileSync(
    new URL(
      "../skills/ae-analysis/references/agent_review_submit_to_page.md",
      import.meta.url
    ),
    "utf8"
  );
  const evidence = readFileSync(
    new URL(
      "../skills/ae-analysis/references/agent_review_evidence.md",
      import.meta.url
    ),
    "utf8"
  );
  const skill = readFileSync(
    new URL("../skills/ae-analysis/SKILL.md", import.meta.url),
    "utf8"
  );
  assert.match(skill, /agent-review evidence/);
  const steps = [
    "Resolve the project",
    "Generate the review draft from",
    "Fetch `analysis-meta agent-review evidence` only",
    "Draft AI explanations",
    "With current submission authorization",
    "Read detail",
  ];
  let previous = -1;
  for (const step of steps) {
    const position = reference.indexOf(step);
    assert.ok(position > previous, `Missing or out-of-order step: ${step}`);
    previous = position;
  }
  for (const field of [
    "raw",
    "normalized_definition",
    "measures",
    "dimensions",
    "filters",
    "time_range",
    "timezone",
    "sql",
    "limitations",
  ]) {
    assert.ok(
      evidence.includes("`" + field + "`"),
      `Missing stable field: ${field}`
    );
  }
  assert.match(
    evidence,
    /`source_path` is provenance, not an automatic replacement for AI `evidence_refs`/
  );
  assert.match(
    evidence,
    /only paths that actually exist in the response and support the stated fact/
  );
  assert.match(evidence, /`DYNAMIC`/);
  assert.match(evidence, /evidence_snapshot\.analysis\.sql\.raw/);
  assert.match(
    evidence,
    /evidence_snapshot\.analysis\.normalized_definition\.params/
  );
  assert.match(evidence, /original-text interpretation/);
  assert.match(evidence, /Do not invent `select_columns`/);
  assert.match(
    evidence,
    /null is unknown, not zero, false, no filter, or an execution default/
  );
  assert.match(
    evidence,
    /does not create a batch, write review records, notify, or certify/
  );
  assert.match(evidence, /Common create stores the submitted snapshot/);
  assert.match(evidence, /does not refresh it or restore omitted fields/);
  assert.doesNotMatch(evidence, /Create refreshes the snapshot|create collects again/);
  const preflight = readFileSync(
    new URL("../skills/ae-analysis/references/agent_review_preflight.md", import.meta.url),
    "utf8"
  );
  assert.match(skill, /references\/agent_review_preflight\.md/);
  assert.match(reference, /agent_review_preflight\.md/);
  assert.match(preflight, /fresh-context reviewer subagent that did not author/);
  assert.match(preflight, /`LOCAL_ONLY` prohibits creating batches/);
  assert.match(preflight, /Check `signals` explicitly: missing, null and zero are different/);
  assert.match(preflight, /sampling cannot establish a whole-batch PASS/);
  assert.match(preflight, /Any change to the draft or source invalidates its previous PASS/);
  assert.match(preflight, /three correction attempts per logical material packet/);
  assert.match(preflight, /Initial drafting\/review is attempt 0/);
  assert.match(preflight, /do not start attempt 4/);
  assert.match(preflight, /`SUBMIT_WITH_WARNINGS`/);
  assert.match(preflight, /A failed quality review must not block an already authorized material-submission workflow/);
  assert.match(preflight, /`LOCAL_ARTIFACT_ONLY`/);
  assert.match(preflight, /never relabel it PASS/);
  assert.match(preflight, /not missing submission authorization, invalid required fields, broken evidence references/);
  assert.doesNotMatch(preflight, /do not start attempt 4 or submit|BLOCKED_REVIEWER_UNAVAILABLE/);
  assert.match(preflight, /resuming the same task must not reset this counter/);
});

test("Skill separates sampled hashes from definition revisions and stores AI explanations once", () => {
  const evidence = readFileSync(
    new URL(
      "../skills/ae-analysis/references/agent_review_evidence.md",
      import.meta.url
    ),
    "utf8"
  );
  const reference = readFileSync(
    new URL(
      "../skills/ae-analysis/references/agent_review_submit_to_page.md",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(evidence, /`evidence_hash` includes collection time/);
  assert.match(evidence, /`target_revision` identifies the saved definition/);
  assert.match(
    evidence,
    /Do not use the full snapshot hash to detect cross-scan business changes/
  );
  assert.match(
    reference,
    /Keep `presentation_snapshot\.analysisByItem` as the compatibility placeholder `\{\}`/
  );
  assert.match(
    reference,
    /Detailed factual explanations belong only in `item\.ai_summary\.analysis_explanation`/
  );
  assert.match(reference, /All seven review capabilities/);
});

test("Skill defines item reasons separately from batch summary and detailed analysis", () => {
  for (const file of [
    "SKILL.md",
    "references/agent_review_submit_to_page.md",
  ]) {
    const content = readFileSync(
      new URL(`../skills/ae-analysis/${file}`, import.meta.url),
      "utf8"
    );
    assert.ok(
      content.includes(
        "`item.ai_summary.summary` is the concise item recommendation reason"
      ),
      file
    );
    assert.ok(content.includes("evidence basis and main risks"), file);
    assert.ok(content.includes("displayed in the main list"), file);
    assert.ok(
      content.includes("`batch.ai_summary.summary` is the batch overview"),
      file
    );
    assert.ok(content.includes("cannot replace item reasons"), file);
    assert.ok(
      content.includes(
        "Detailed factual explanations belong only in `item.ai_summary.analysis_explanation`"
      ),
      file
    );
    assert.ok(
      content.includes(
        "Do not duplicate reasons or detailed analysis into presentation fields"
      ),
      file
    );
    assert.ok(
      content.includes("Do not invent a reason from unknown values"),
      file
    );
  }
});

test("Skill requires reviewer-readable copy and bounded hierarchical candidate pools", () => {
  const skill = readFileSync(
    new URL("../skills/ae-analysis/SKILL.md", import.meta.url),
    "utf8"
  );
  const submit = readFileSync(
    new URL(
      "../skills/ae-analysis/references/agent_review_submit_to_page.md",
      import.meta.url
    ),
    "utf8"
  );
  const exportRef = readFileSync(
    new URL(
      "../skills/ae-analysis/references/governance_recommendation_export.md",
      import.meta.url
    ),
    "utf8"
  );
  for (const content of [skill, submit]) {
    assert.match(
      content,
      /page-visible review text|页面可见|business reviewer|human asset reviewers/i
    );
    assert.match(content, /plain (business )?Chinese|普通中文|plain Chinese/i);
    for (const token of [
      "SAVED_REPORT_ONLY",
      "DYNAMIC",
      "source_path",
      "evidence_snapshot",
    ]) {
      assert.ok(
        content.includes(token),
        `Missing forbidden visible token guidance: ${token}`
      );
    }
    assert.match(content, /T1.*按天|按天.*T1/);
    assert.match(content, /raw JSON/);
    assert.match(content, /raw SQL/);
  }
  {
    const content = [skill, submit, exportRef].join("\n");
    assert.match(
      content,
      /first hot dashboard|first `work_unit`|首个高热看板|first work unit/i
    );
    assert.match(
      content,
      /20 high-heat dashboard|前 20|前20|top 20|--limit 20\b/i
    );
    assert.match(
      content,
      /representative themes|代表主题|four representative themes|4 个业务主题/i
    );
    assert.match(
      content,
      /one topic per.*dashboard|一.*topic.*看板|topic_count == selected_dashboard_count|20 topics/i
    );
    assert.match(
      content,
      /business domains?.*not dashboards|业务域.*不是.*看板|业务主题域.*semantic cluster/i
    );
    assert.match(
      content,
      /业务域 -> 看板 -> 报表 -> 元数据|业务域.*看板.*报表.*元数据/i
    );
    assert.match(content, /smoke|diagnostic|小样本|诊断/i);
    assert.match(content, /initial candidate pool, not a required submission count/);
    assert.match(content, /from 20 to 50 to 100, then stop/);
  }
  for (const content of [skill, submit]) {
    assert.match(content, /relations/);
    assert.match(content, /看板 -> 报表 -> 元数据/);
    assert.match(content, /dashboard.*report.*metadata|dashboard items.*report items/i);
    assert.match(content, /type:"contains"|type`?:`?"contains"|contains/);
    assert.match(content, /type:"uses"|type`?:`?"uses"|uses/);
  }
  assert.ok(!submit.includes('"relations":[]'));
});
