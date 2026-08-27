import {
  compactInput,
  createProjectSemanticCommand,
  optionalString,
} from "./shared.js";

export const projectSemanticEnable = createProjectSemanticCommand({
  resource: "",
  command: "enable",
  capabilityId: "business_semantics.entry.enable",
  description:
    "Enable one disabled project semantic. Enabled semantics are immediately used by CLI and Agent.",
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
      desc: "Exact disabled semantic ID to enable.",
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
      desc: "Business reason for enabling.",
    },
    {
      name: "request-id",
      type: "string",
      desc: "Optional idempotency key; generated when omitted.",
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
