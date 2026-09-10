import {
  compactInput,
  createProjectSemanticCommand,
  optionalJson,
  optionalString,
} from "../shared.js";

export const projectSemanticCandidateEdit = createProjectSemanticCommand({
  resource: "candidate",
  command: "edit",
  capabilityId: "business_semantics.candidate.edit",
  description: "Edit one recommendation before enabling it.",
  flags: [
    {
      name: "project-id",
      type: "number",
      required: true,
      desc: "Numeric project ID.",
      alias: "p",
      min: 1,
    },
    {
      name: "candidate-id",
      type: "string",
      required: true,
      desc: "Exact candidate ID.",
    },
    {
      name: "expected-version",
      type: "number",
      required: true,
      desc: "Latest optimistic-lock version.",
      min: 1,
    },
    {
      name: "semantic-type",
      type: "string",
      desc: "business_concept, business_rule, asset_semantics, or calculation_convention.",
    },
    { name: "title", type: "string", desc: "Edited title." },
    { name: "summary", type: "string", desc: "Edited summary." },
    { name: "content", type: "string", desc: "Edited content." },
    { name: "keywords", type: "json", desc: "Edited keyword array." },
    {
      name: "resource-refs",
      type: "json",
      desc: "Edited structured asset binding array.",
    },
    {
      name: "request-id",
      type: "string",
      desc: "Optional idempotency key; generated when omitted.",
      maxLength: 128,
    },
  ],
  risk: "write",
  buildInput: (ctx) =>
    compactInput({
      project_id: ctx.num("project-id"),
      candidate_id: ctx.str("candidate-id"),
      expected_version: ctx.num("expected-version"),
      semantic_type: optionalString(ctx, "semantic-type"),
      title: optionalString(ctx, "title"),
      summary: optionalString(ctx, "summary"),
      content: optionalString(ctx, "content"),
      keywords: optionalJson(ctx, "keywords"),
      resource_refs: optionalJson(ctx, "resource-refs"),
      request_id: optionalString(ctx, "request-id"),
    }),
});
