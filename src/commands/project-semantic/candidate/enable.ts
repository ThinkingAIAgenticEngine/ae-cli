import {
  arrayValue,
  compactInput,
  createProjectSemanticCommand,
  optionalJson,
  optionalString,
} from "../shared.js";
import type { RuntimeContext } from "../../../framework/types.js";

export const projectSemanticCandidateEnable = createProjectSemanticCommand({
  resource: "candidate",
  command: "enable",
  capabilityId: "business_semantics.candidate.enable",
  description:
    "Enable recommended project semantic candidates. Enabled semantics are immediately used by CLI and Agent.",
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
      name: "candidate-ids",
      type: "json",
      required: true,
      desc: "JSON array of candidate IDs to enable.",
    },
    { name: "note", type: "string", desc: "Optional enable note." },
    {
      name: "request-id",
      type: "string",
      desc: "Optional idempotency key; generated when omitted.",
      maxLength: 128,
    },
  ],
  risk: "high-risk-write",
  validate: (ctx) => candidateIds(ctx),
  buildInput: (ctx) =>
    compactInput({
      project_id: ctx.num("project-id"),
      candidate_ids: candidateIds(ctx),
      publish_note: optionalString(ctx, "note"),
      request_id: optionalString(ctx, "request-id"),
    }),
});

function candidateIds(ctx: RuntimeContext): unknown[] {
  const values = arrayValue(
    optionalJson(ctx, "candidate-ids"),
    "--candidate-ids",
  );
  if (
    values.length < 1 ||
    values.some((value) => typeof value !== "string" || value.trim() === "")
  ) {
    throw new Error("--candidate-ids must be a non-empty JSON string array.");
  }
  return values;
}
