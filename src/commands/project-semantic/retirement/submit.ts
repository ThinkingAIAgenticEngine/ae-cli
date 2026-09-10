import {
  compactInput,
  createProjectSemanticCommand,
  optionalString,
} from "../shared.js";

export const projectSemanticRetirementSubmit = createProjectSemanticCommand({
  resource: "retirement",
  command: "submit",
  capabilityId: "business_semantics.retirement.submit",
  description:
    "Submit a retirement candidate for one published project semantic. Approval and release publication are required before it stops being consumed.",
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
      name: "semantic-id",
      type: "string",
      required: true,
      desc: "Exact published semantic ID.",
    },
    {
      name: "expected-version",
      type: "number",
      required: true,
      desc: "Latest optimistic-lock version of the semantic.",
      min: 1,
    },
    {
      name: "reason",
      type: "string",
      required: true,
      desc: "Business reason for retirement.",
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
      semantic_id: ctx.str("semantic-id"),
      expected_version: ctx.num("expected-version"),
      reason: ctx.str("reason"),
      request_id: optionalString(ctx, "request-id"),
    }),
});
