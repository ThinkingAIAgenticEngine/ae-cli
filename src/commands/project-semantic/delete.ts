import {
  compactInput,
  createProjectSemanticCommand,
  optionalString,
} from "./shared.js";

export const projectSemanticDelete = createProjectSemanticCommand({
  resource: "",
  command: "delete",
  capabilityId: "business_semantics.entry.delete",
  description:
    "Physically delete one disabled project semantic and its private revisions. Future scans may recommend it again.",
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
      desc: "Exact semantic ID to delete.",
    },
    {
      name: "expected-version",
      type: "number",
      required: true,
      desc: "Latest semantic revision.",
      min: 1,
    },
    {
      name: "reason",
      type: "string",
      required: true,
      desc: "Business reason for physical deletion.",
    },
    {
      name: "request-id",
      type: "string",
      desc: "Optional request ID; generated when omitted.",
      maxLength: 128,
    },
  ],
  risk: "high-risk-write",
  buildInput: (ctx) =>
    compactInput({
      project_id: ctx.num("project-id"),
      semantic_id: ctx.str("semantic-id"),
      expected_version: ctx.num("expected-version"),
      reason: ctx.str("reason"),
      request_id: optionalString(ctx, "request-id"),
    }),
});
